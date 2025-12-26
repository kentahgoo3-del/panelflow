"use client";

import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function PricingPage() {
  const router = useRouter();

  async function upgrade() {
    const { data } = await supabase.auth.getUser();
    const user = data.user;
    if (!user) return alert("Please log in first.");

    const res = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id, email: user.email }),
    });

    const json = await res.json();
    if (!res.ok) return alert(json.error || "Checkout failed");

    window.location.href = json.url;
  }

  return (
    <div className="min-h-screen p-6">
      <div className="mx-auto max-w-xl space-y-6">
        <h1 className="text-2xl font-semibold">PanelFlow Pricing</h1>

        <div className="grid gap-3">
          <div className="rounded-2xl border p-5">
            <div className="font-semibold">Free</div>
            <ul className="mt-2 text-sm opacity-80 space-y-1">
              <li>• 1 series</li>
              <li>• 5 chapters per series</li>
              <li>• Watermark</li>
            </ul>
          </div>

          <div className="rounded-2xl border p-5">
            <div className="font-semibold">Pro</div>
            <ul className="mt-2 text-sm opacity-80 space-y-1">
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
          </div>
        </div>

        <button onClick={() => router.back()} className="rounded-xl border px-4 py-3">
          Back
        </button>
      </div>
    </div>
  );
}
