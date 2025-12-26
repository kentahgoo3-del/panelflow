import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    hasMerchantId: !!process.env.PAYFAST_MERCHANT_ID,
    hasMerchantKey: !!process.env.PAYFAST_MERCHANT_KEY,
    appUrl: process.env.NEXT_PUBLIC_APP_URL ? "set" : "missing",
    processUrl: process.env.PAYFAST_PROCESS_URL || "missing",
  });
}
