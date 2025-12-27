import { NextResponse } from "next/server";
import crypto from "crypto";

function buildSignatureString(data: Record<string, string>) {
  const keys = Object.keys(data)
    .filter((k) => k !== "signature")
    .filter((k) => data[k] !== undefined && data[k] !== null && String(data[k]).trim() !== "")
    .sort();

  return keys
    .map((k) => `${k}=${encodeURIComponent(String(data[k]).trim())}`)
    .join("&");
}

export async function GET() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";
  const merchant_id = process.env.PAYFAST_MERCHANT_ID || "";
  const merchant_key = process.env.PAYFAST_MERCHANT_KEY || "";
  const passphrase = (process.env.PAYFAST_PASSPHRASE || "").trim();

  // example payload similar to your live request
  const fields: Record<string, string> = {
    merchant_id,
    merchant_key,
    return_url: `${appUrl}/billing/success`,
    cancel_url: `${appUrl}/pricing`,
    notify_url: `${appUrl}/api/payfast/itn`,
    m_payment_id: "1234567890",
    amount: "99.00",
    item_name: "PanelFlow Pro",
    custom_str1: "TEST_USER_ID",
  };

  const base = buildSignatureString(fields);
  const toHash = passphrase ? `${base}&passphrase=${encodeURIComponent(passphrase)}` : base;

  const signature = crypto.createHash("md5").update(toHash).digest("hex");

  return NextResponse.json({
    baseString: base,
    toHash,
    signature,
    hasPassphrase: !!passphrase,
  });
}
