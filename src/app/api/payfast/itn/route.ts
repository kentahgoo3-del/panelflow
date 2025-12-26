import crypto from "crypto";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function buildQueryString(data: Record<string, string>) {
  const keys = Object.keys(data).sort();
  return keys
    .map((k) => `${k}=${encodeURIComponent((data[k] ?? "").trim())}`)
    .join("&");
}

function signPayFast(data: Record<string, string>, passphrase?: string) {
  const copy = { ...data };
  delete copy.signature;

  const qs = buildQueryString(copy);
  const toHash = passphrase ? `${qs}&passphrase=${encodeURIComponent(passphrase.trim())}` : qs;
  return crypto.createHash("md5").update(toHash).digest("hex");
}

export async function POST(req: Request) {
  const form = await req.formData();
  const data: Record<string, string> = {};
  form.forEach((v, k) => (data[k] = String(v)));

  const passphrase = process.env.PAYFAST_PASSPHRASE || "";

  // 1) Signature check
  const expectedSig = signPayFast(data, passphrase);
  if (!data.signature || data.signature !== expectedSig) {
    return NextResponse.json({ ok: false, error: "Bad signature" }, { status: 400 });
  }

  // 2) Basic status check (PayFast uses payment_status)
  // Common success value: "COMPLETE"
  if ((data.payment_status || "").toUpperCase() !== "COMPLETE") {
    return NextResponse.json({ ok: true, ignored: "Not complete" });
  }

  // 3) Amount check (you MUST ensure amount matches what you expect) :contentReference[oaicite:3]{index=3}
  const expectedAmount = "99.00";
  if ((data.amount_gross || data.amount || "").trim() !== expectedAmount) {
    return NextResponse.json({ ok: false, error: "Amount mismatch" }, { status: 400 });
  }

  // 4) Map payment to user (we encoded userId in m_payment_id)
  const mPaymentId = data.m_payment_id || "";
  const parts = mPaymentId.split("_");
  // format: pf_{userId}_{timestamp}
  const userId = parts.length >= 3 ? parts[1] : null;
  if (!userId) return NextResponse.json({ ok: false, error: "Bad m_payment_id" }, { status: 400 });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Upgrade: set plan + pro_until = now + 30 days
  const proUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  const { error } = await supabase
    .from("users")
    .update({ plan: "pro", pro_until: proUntil })
    .eq("id", userId);

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  // IMPORTANT: Return 200 OK so PayFast accepts it. :contentReference[oaicite:4]{index=4}
  return NextResponse.json({ ok: true });
}
