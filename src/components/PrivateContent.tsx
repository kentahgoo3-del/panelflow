"use client";

import { useRouter } from "next/navigation";

export default function PrivateContent({ type }: { type: "series" | "chapter" }) {
  const router = useRouter();
  return (
    <div className="min-h-screen p-6">
      <div className="mx-auto max-w-xl space-y-4">
        <h1 className="text-2xl font-semibold">This {type} isn’t public yet</h1>
        <p className="opacity-80">
          The creator hasn’t published it, or the link is incorrect.
        </p>
        <button
          onClick={() => router.push("/")}
          className="rounded-2xl border px-4 py-4"
        >
          Go to PanelFlow
        </button>
      </div>
    </div>
  );
}
