"use client";

import { useEffect } from "react";

export default function Toast({
  message,
  onClose,
  durationMs = 2200,
}: {
  message: string | null;
  onClose: () => void;
  durationMs?: number;
}) {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(onClose, durationMs);
    return () => clearTimeout(t);
  }, [message, onClose, durationMs]);

  if (!message) return null;

  return (
    <div className="fixed bottom-4 left-0 right-0 z-[100] flex justify-center px-4">
      <div className="rounded-2xl border bg-white/90 backdrop-blur px-4 py-3 text-sm shadow">
        {message}
      </div>
    </div>
  );
}
