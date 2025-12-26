"use client";

import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function PricingPage() {
  const router = useRouter();

  async function upgrade() {
    // 1) Ensure user is logged in and get an access token
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      console.error(sessionError);
      return alert("Could not get your session. Please refresh and try again.");
    }

    const token = sessionData.session?.access_token;
    if (!token) return alert("Please log in first.");

    // 2) Call PayFast start endpoint (server builds redirectUrl)
    const res = await fetch("/api/payfast/start", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    // 3) Handle non-JSON errors safely
    if (!res.ok) {
      const text = await res.text();
      console.error("PayFast start failed:", text);
      return alert("Could not start PayFast payment. Please try again.");
    }

    const json: { redirectUrl?: string } = await res.json();

    if (!json.redirectUrl) {
      console.error("PayFast response missing redirectUrl:", json);
      return alert("Payment redirect failed. Please try again.");
    }

    // 4) Redirect user to PayFast
    window.location.href = json.redirectUrl;
  }

  return (
    <div className="min-h-screen p-6">
      <div className="mx-auto max-w-xl space-y-6">
        <h1 className="text-2xl font-semibold">PanelFlow Pricing</h1>

        <div className="grid gap-3">
          <div className="rounded-2xl border p-5">
            <div className="font-semibold">Free</div>
            <ul className="mt-2 space-y-1 text-sm opacity-80">
              <li>• 1 series</li>
              <li>• 5 chapters per series</li>
              <li>• Watermark</li>
            </ul>
          </div>

          <div className="rounded-2xl border p-5">
            <div className="font-semibold">Pro</div>
            <ul className="mt-2 space-y-1 text-sm opacity-80">
              <li>• Unlimited series</li>
              <li>• Unlimited chapters</li>
              <li>• No watermark</li>
            </ul>

            <button
              onClick={upgrade}
              className="mt-4 w-full rounded-2xl border px-4 py-4 font-semibold"
            >
              Upgrade to Pro
            </button>

            <p className="mt-3 text-xs opacity-60">
              Note: After payment, PayFast confirms your upgrade via ITN. This can take a few seconds.
            </p>
          </div>
        </div>

        <button onClick={() => router.back()} className="rounded-xl border px-4 py-3">
          Back
        </button>
      </div>
    </div>
  );
}
