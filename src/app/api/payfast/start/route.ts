import { NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

function buildQueryString(data: Record<string, string>) {
  const keys = Object.keys(data)
    .filter((k) => data[k] !== undefined && data[k] !== null && String(data[k]).trim() !== "")
    .sort();

  return keys
    .map((k) => `${k}=${encodeURIComponent(String(data[k]).trim())}`)
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
    // 1) Auth header
    const authHeader = req.headers.get("authorization");
    if (!authHeader) return NextResponse.json({ error: "Missing auth" }, { status: 401 });

    // 2) Env vars
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    const merchant_id = process.env.PAYFAST_MERCHANT_ID;
    const passphrase = process.env.PAYFAST_PASSPHRASE || "";

    // Hardcode the live process endpoint (no env surprises)
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
    if (!merchant_id) {
      return NextResponse.json({ error: "Missing PAYFAST_MERCHANT_ID in env vars" }, { status: 500 });
    }

    // 3) Verify user (needed so we can attach userId to the transaction)
    const supabase = createClient(supabaseUrl, serviceRole);

    const token = authHeader.replace("Bearer ", "").trim();
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user) return NextResponse.json({ error: "Invalid auth" }, { status: 401 });

    const userId = userData.user.id;

    // 4) WAF-safe payment fields
    const amount = "99.00";
    const item_name = "PanelFlow Pro"; // keep simple

    // IMPORTANT: Use a short numeric payment id (avoid underscores/long strings)
    const m_payment_id = String(Date.now()); // numeric string

    // Use custom_str1 to store your userId for ITN matching (safe, optional)
    const fields: Record<string, string> = {
      merchant_id,
      return_url: `${appUrl}/billing/success`,
      cancel_url: `${appUrl}/pricing`,
      notify_url: `${appUrl}/api/payfast/itn`,
      m_payment_id,
      amount,
      item_name,
      custom_str1: userId,
    };

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
