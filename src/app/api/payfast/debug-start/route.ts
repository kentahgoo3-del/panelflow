import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/payfast/start`, {
      method: "POST",
      headers: {
        Authorization: req.headers.get("authorization") || "",
      },
    });

    const json = await res.json();
    return NextResponse.json(json);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "debug failed" }, { status: 500 });
  }
}
