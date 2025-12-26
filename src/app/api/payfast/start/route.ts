import { NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

function buildQueryString(data: Record<string, string>) {
  const keys = Object.keys(data)
    .filter((k) => data[k] !== undefined && data[k] !== null)
    .sort();

  return keys
    .map((k) => `${k}=${encodeURIComponent((data[k] ?? "").toString().trim())}`)
    .join("&");
}

function signPayFast(data: Record<string, string>, passphrase?: string) {
  const copy: Record<string, string> = { ...data };
  delete copy.signature;

  const qs = buildQueryString(copy);
  const p = (passphrase ?? "").toString().trim();

  const toHash = p ? `${qs}&passphrase=${encodeURIComponent(p)}` : qs;
  return crypto.createHash("md5").update(toHash).digest("hex");
}

export async function POST(req: Request) {
  try {
    // --- Auth ---
    const authHeader = req.headers.get("authorization");
    if (!authHeader) return NextResponse.json({ error: "Missing auth" }, { status: 401 });

    // --- Env checks ---
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    const merchant_id = process.env.PAYFAST_MERCHANT_ID;
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

    if (!merchant_id) {
      return NextResponse.json(
        { error: "Missing PAYFAST_MERCHANT_ID in env vars" },
        { status: 500 }
      );
    }

    // --- Supabase admin client (server) ---
    const supabase = createClient(supabaseUrl, serviceRole);

    // Verify user from token
    const token = authHeader.replace("Bearer ", "").trim();
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user) return NextResponse.json({ error: "Invalid auth" }, { status: 401 });

    const userId = userData.user.id;
    const email = (userData.user.email ?? "").trim();

    // --- Pricing (ZAR) ---
    const amount = "99.00"; // change later if needed
    const item_name = "PanelFlow Pro (30 days)";

    // Unique payment reference
    const m_payment_id = `pf_${userId}_${Date.now()}`;

    // ✅ IMPORTANT: These are the ONLY fields we send to PayFast
    // ❌ Do NOT send merchant_key (that triggers CloudFront/WAF blocks sometimes)
    const fields: Record<string, string> = {
      merchant_id,

      return_url: `${appUrl}/billing/success`,
      cancel_url: `${appUrl}/pricing`,
      notify_url: `${appUrl}/api/payfast/itn`,

      email_address: email,

      m_payment_id,
      amount,
      item_name,
    };

    fields.signature = signPayFast(fields, passphrase);

    return NextResponse.json({
      processUrl,
      fields,
    });
  } catch (e: any) {
    console.error("PayFast start error:", e);
    return NextResponse.json(
      { error: e?.message || "Unexpected server error starting PayFast payment" },
      { status: 500 }
    );
  }
}
