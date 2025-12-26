import { NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

function buildQueryString(data: Record<string, string>) {
  // PayFast signature requires deterministic order.
  // Sort keys alphabetically, URL-encode values, join with &
  const keys = Object.keys(data)
    .filter((k) => data[k] !== undefined && data[k] !== null) // safety
    .sort();

  return keys
    .map((k) => {
      const v = (data[k] ?? "").toString().trim(); // prevents undefined.trim()
      return `${k}=${encodeURIComponent(v)}`;
    })
    .join("&");
}

function signPayFast(data: Record<string, string>, passphrase?: string) {
  // Signature is MD5 of querystring (with passphrase appended if set)
  const copy: Record<string, string> = { ...data };

  // Do not include signature itself (if present)
  delete copy.signature;

  const qs = buildQueryString(copy);
  const p = (passphrase ?? "").toString().trim();

  const toHash = p ? `${qs}&passphrase=${encodeURIComponent(p)}` : qs;
  return crypto.createHash("md5").update(toHash).digest("hex");
}

export async function POST(req: Request) {
  try {
    // 1) Auth header
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Missing auth" }, { status: 401 });
    }

    // 2) Validate required env vars (return readable errors)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    const merchant_id = process.env.PAYFAST_MERCHANT_ID;
    const merchant_key = process.env.PAYFAST_MERCHANT_KEY;

    const passphrase = process.env.PAYFAST_PASSPHRASE || "";
    const processUrl =
      process.env.PAYFAST_PROCESS_URL || "https://www.payfast.co.za/eng/process";

    if (!supabaseUrl || !serviceRole) {
      return NextResponse.json(
        { error: "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env vars" },
        { status: 500 }
      );
    }

    if (!appUrl) {
      return NextResponse.json(
        { error: "Missing NEXT_PUBLIC_APP_URL in env vars" },
        { status: 500 }
      );
    }

    if (!merchant_id || !merchant_key) {
      return NextResponse.json(
        { error: "Missing PAYFAST_MERCHANT_ID or PAYFAST_MERCHANT_KEY in env vars" },
        { status: 500 }
      );
    }

    // 3) Supabase admin client (server-side)
    const supabase = createClient(supabaseUrl, serviceRole);

    // 4) Verify user from bearer token
    const token = authHeader.replace("Bearer ", "").trim();
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);

    if (userErr || !userData?.user) {
      return NextResponse.json({ error: "Invalid auth" }, { status: 401 });
    }

    const userId = userData.user.id;
    const email = (userData.user.email ?? "").trim();

    // 5) Pricing (ZAR) — set your real price
    const amount = "99.00";
    const item_name = "PanelFlow Pro (30 days)";

    // 6) Unique payment reference
    const m_payment_id = `pf_${userId}_${Date.now()}`;

    // Optional: store a pending reference (only if you add a column later)
    // await supabase.from("users").update({ last_payment_ref: m_payment_id }).eq("id", userId);

    // 7) Build PayFast payload
    const payload: Record<string, string> = {
      merchant_id,
      merchant_key,

      return_url: `${appUrl}/billing/success`,
      cancel_url: `${appUrl}/pricing`,
      notify_url: `${appUrl}/api/payfast/itn`,

      // Buyer (PayFast accepts this; safe even if empty)
      email_address: email,

      // Payment fields
      m_payment_id,
      amount,
      item_name,
    };

    // 8) Sign payload
    payload.signature = signPayFast(payload, passphrase);

    // 9) Redirect URL
    const redirectUrl = `${processUrl}?${buildQueryString(payload)}`;
    return NextResponse.json({ redirectUrl });
  } catch (e: any) {
    console.error("PayFast start error:", e);
    return NextResponse.json(
      { error: e?.message || "Unexpected server error starting PayFast payment" },
      { status: 500 }
    );
  }
}
