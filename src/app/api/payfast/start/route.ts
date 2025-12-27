import { NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

/**
 * PayFast signature rules:
 * - Sort keys alphabetically
 * - URL-encode values
 * - Exclude "signature" itself
 * - Include merchant_id, merchant_key and all other posted fields
 * - Append passphrase if set: &passphrase=...
 * - MD5 hash of the full string
 */
function buildSignatureString(data: Record<string, string>) {
  const keys = Object.keys(data)
    .filter((k) => k !== "signature")
    .filter((k) => data[k] !== undefined && data[k] !== null && String(data[k]).trim() !== "")
    .sort();

  return keys
    .map((k) => `${k}=${encodeURIComponent(String(data[k]).trim())}`)
    .join("&");
}

function signPayFast(data: Record<string, string>, passphrase?: string) {
  const base = buildSignatureString(data);
  const p = (passphrase ?? "").toString().trim();

  const toHash = p ? `${base}&passphrase=${encodeURIComponent(p)}` : base;
  return crypto.createHash("md5").update(toHash).digest("hex");
}

export async function POST(req: Request) {
  try {
    // Auth header
    const authHeader = req.headers.get("authorization");
    if (!authHeader) return NextResponse.json({ error: "Missing auth" }, { status: 401 });

    // Env vars
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    const merchant_id = process.env.PAYFAST_MERCHANT_ID;
    const merchant_key = process.env.PAYFAST_MERCHANT_KEY;
    const passphrase = process.env.PAYFAST_PASSPHRASE || "";

    const processUrl = "https://www.payfast.co.za/eng/process";

    if (!supabaseUrl || !serviceRole) {
      return NextResponse.json(
        { error: "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env vars" },
        { status: 500 }
      );
    }
    if (!appUrl) {
      return NextResponse.json({ error: "Missing NEXT_PUBLIC_APP_URL in env vars" }, { status: 500 });
    }
    if (!merchant_id || !merchant_key) {
      return NextResponse.json(
        { error: "Missing PAYFAST_MERCHANT_ID or PAYFAST_MERCHANT_KEY in env vars" },
        { status: 500 }
      );
    }

    // Verify user
    const supabase = createClient(supabaseUrl, serviceRole);
    const token = authHeader.replace("Bearer ", "").trim();

    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user) return NextResponse.json({ error: "Invalid auth" }, { status: 401 });

    const userId = userData.user.id;

    // Payment fields (keep simple)
    const amount = "99.00";
    const item_name = "PanelFlow Pro";
    const m_payment_id = String(Date.now());

    // Fields we POST to PayFast
    const fields: Record<string, string> = {
      merchant_id,
      merchant_key,

      return_url: `${appUrl}/billing/success`,
      cancel_url: `${appUrl}/pricing`,
      notify_url: `${appUrl}/api/payfast/itn`,

      m_payment_id,
      amount,
      item_name,

      custom_str1: userId,
    };

    // Signature MUST be computed from the exact posted fields above
    fields.signature = signPayFast(fields, passphrase);

    return NextResponse.json({ processUrl, fields });
  } catch (e: any) {
    console.error("PayFast start error:", e);
    return NextResponse.json(
      { error: e?.message || "Unexpected server error starting PayFast payment" },
      { status: 500 }
    );
  }
}
