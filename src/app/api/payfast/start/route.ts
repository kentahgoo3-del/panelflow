import { NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

function buildQueryString(data: Record<string, string>) {
  // PayFast signature requires fields in a deterministic order.
  // Sort keys alphabetically, URL-encode values, join with &
  const keys = Object.keys(data).sort();
  return keys
    .map((k) => `${k}=${encodeURIComponent(data[k].trim())}`)
    .join("&");
}

function signPayFast(data: Record<string, string>, passphrase?: string) {
  // Signature is MD5 of querystring (with passphrase appended if set)
  const qs = buildQueryString(data);
  const toHash = passphrase ? `${qs}&passphrase=${encodeURIComponent(passphrase.trim())}` : qs;
  return crypto.createHash("md5").update(toHash).digest("hex");
}

export async function POST(req: Request) {
  // IMPORTANT: You should identify the logged-in user server-side.
  // Simplest v1: send supabase access token in Authorization header from the client.
  const authHeader = req.headers.get("authorization");
  if (!authHeader) return NextResponse.json({ error: "Missing auth" }, { status: 401 });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Verify user from token
  const token = authHeader.replace("Bearer ", "").trim();
  const { data: userData, error: userErr } = await supabase.auth.getUser(token);
  if (userErr || !userData?.user) return NextResponse.json({ error: "Invalid auth" }, { status: 401 });

  const userId = userData.user.id;
  const email = userData.user.email ?? "";

  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;
  const merchant_id = process.env.PAYFAST_MERCHANT_ID!;
  const merchant_key = process.env.PAYFAST_MERCHANT_KEY!;
  const passphrase = process.env.PAYFAST_PASSPHRASE || "";
  const processUrl = process.env.PAYFAST_PROCESS_URL || "https://www.payfast.co.za/eng/process";

  // Your pricing (ZAR)
  const amount = "99.00"; // <- set your real price
  const item_name = "PanelFlow Pro (30 days)";

  // Unique payment reference (store this so ITN can match)
  const m_payment_id = `pf_${userId}_${Date.now()}`;

  // Save a pending upgrade record (minimal v1: store on users table as last_payment_ref)
  // If you don’t have this column, you can skip it, but matching is safer.
  await supabase.from("users").update({ /* optionally store reference */ }).eq("id", userId);

  const payload: Record<string, string> = {
    merchant_id,
    merchant_key,
    return_url: `${appUrl}/billing/success`,
    cancel_url: `${appUrl}/pricing`,
    notify_url: `${appUrl}/api/payfast/itn`,

    // buyer
    email_address: email,

    // payment
    m_payment_id,
    amount,
    item_name,
  };

  payload.signature = signPayFast(payload, passphrase);

  const redirectUrl = `${processUrl}?${buildQueryString(payload)}`;
  return NextResponse.json({ redirectUrl });
}
