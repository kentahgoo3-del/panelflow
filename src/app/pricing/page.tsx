"use client";

import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function PricingPage() {
  const router = useRouter();

  async function upgrade() {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      console.error(sessionError);
      return alert("Could not get session. Please refresh and try again.");
    }

    const token = sessionData.session?.access_token;
    if (!token) return alert("Please log in first.");

    const res = await fetch("/api/payfast/start", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });

    const text = await res.text();

    if (!res.ok) {
      console.error("PayFast start failed:", res.status, text);
      return alert(`PayFast start failed (${res.status}):\n${text}`);
    }

    let json: any;
    try {
      json = JSON.parse(text);
    } catch {
      console.error("Non-JSON response:", text);
      return alert("Server returned unexpected response. Check console.");
    }

    const processUrl: string | undefined = json.processUrl;
    const fields: Record<string, string> | undefined = json.fields;

    if (!processUrl || !fields) {
      console.error("Missing processUrl/fields:", json);
      return alert("Payment setup failed (missing fields).");
    }

    // Build and submit a POST form to PayFast (avoids CloudFront 403 from long GET URLs)
    const form = document.createElement("form");
    form.method = "POST";
    form.action = processUrl;

    Object.entries(fields).forEach(([key, value]) => {
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = key;
      input.value = value ?? "";
      form.appendChild(input);
    });

    document.body.appendChild(form);
    form.submit();
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
              Note: PayFast confirms your upgrade via ITN after payment.
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
