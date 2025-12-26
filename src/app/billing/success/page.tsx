"use client";

import { useRouter } from "next/navigation";

export default function BillingSuccess() {
  const router = useRouter();
  return (
    <div className="min-h-screen p-6">
      <div className="mx-auto max-w-xl space-y-4">
        <h1 className="text-2xl font-semibold">You’re Pro ✅</h1>
        <p className="opacity-80">
          Your PanelFlow Pro access is now active. If it doesn’t reflect immediately, refresh once.
        </p>
        <button onClick={() => router.push("/dashboard")} className="rounded-2xl border px-4 py-4">
          Go to Dashboard
        </button>
      </div>
    </div>
  );
}
