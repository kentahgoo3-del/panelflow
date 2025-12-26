"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Status = "checking" | "active" | "not_active" | "not_logged_in" | "error";

export default function BillingSuccess() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("checking");
  const [message, setMessage] = useState<string>("Confirming your Pro access…");
  const [secondsLeft, setSecondsLeft] = useState<number>(30);

  const nowIso = useMemo(() => new Date().toISOString(), []);

  async function checkProOnce(): Promise<boolean> {
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData.session?.user;

    if (!user) {
      setStatus("not_logged_in");
      setMessage("You’re not logged in. Please log in again, then refresh this page.");
      return false;
    }

    // Read the app-level user profile row
    const { data, error } = await supabase
      .from("users")
      .select("plan, pro_until")
      .eq("id", user.id)
      .single();

    if (error) {
      console.error(error);
      setStatus("error");
      setMessage("We couldn’t verify your Pro status yet. Please refresh once.");
      return false;
    }

    const plan = (data?.plan ?? "free") as string;
    const proUntil = data?.pro_until as string | null;

    const isActive =
      plan === "pro" ||
      (proUntil !== null && proUntil > new Date().toISOString());

    if (isActive) {
      setStatus("active");
      setMessage("Your PanelFlow Pro access is now active ✅");
      return true;
    }

    setStatus("not_active");
    setMessage("Payment received. Waiting for PayFast confirmation (ITN)…");
    return false;
  }

  useEffect(() => {
    let interval: any = null;
    let timeout: any = null;

    (async () => {
      setStatus("checking");
      setMessage("Confirming your Pro access…");

      // Do an immediate check
      const ok = await checkProOnce();
      if (ok) return;

      // Poll every 2 seconds for up to 30 seconds
      interval = setInterval(async () => {
        setSecondsLeft((s) => Math.max(0, s - 2));
        await checkProOnce();
      }, 2000);

      timeout = setTimeout(() => {
        clearInterval(interval);
        setStatus((s) => (s === "active" ? "active" : "not_active"));
        setMessage(
          "If Pro hasn’t activated yet, please refresh once. If it still doesn’t activate, contact support with your email so we can confirm payment."
        );
      }, 30000);
    })();

    return () => {
      if (interval) clearInterval(interval);
      if (timeout) clearTimeout(timeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen p-6">
      <div className="mx-auto max-w-xl space-y-4 rounded-2xl border p-6">
        {status === "active" ? (
          <h1 className="text-2xl font-semibold">You’re Pro ✅</h1>
        ) : (
          <h1 className="text-2xl font-semibold">Payment received</h1>
        )}

        <p className="opacity-80">{message}</p>

        {(status === "checking" || status === "not_active") && (
          <div className="text-sm opacity-70">
            Checking for activation… <span className="font-semibold">{secondsLeft}s</span>
          </div>
        )}

        {status === "not_logged_in" && (
          <div className="rounded-xl border p-3 text-sm">
            <p className="font-semibold">Action needed</p>
            <p className="opacity-80">
              Please log in again, then return to this page. (Current check time: {nowIso})
            </p>
            <button
              onClick={() => router.push("/login")}
              className="mt-3 rounded-2xl border px-4 py-3"
            >
              Go to Login
            </button>
          </div>
        )}

        <div className="flex flex-wrap gap-3 pt-2">
          <button
            onClick={() => window.location.reload()}
            className="rounded-2xl border px-4 py-3"
          >
            Refresh
          </button>

          <button
            onClick={() => router.push("/dashboard")}
            className="rounded-2xl border px-4 py-3"
          >
            Go to Dashboard
          </button>

          <button
            onClick={() => router.push("/pricing")}
            className="rounded-2xl border px-4 py-3"
          >
            Back to Pricing
          </button>
        </div>

        <div className="pt-2 text-xs opacity-60">
          Note: Pro activates once PayFast confirms payment via ITN. This can take a few seconds.
        </div>
      </div>
    </div>
  );
}
