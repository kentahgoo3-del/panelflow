"use client";

export default function UpgradeSheet({
  open,
  onClose,
  reason,
  onUpgrade,
}: {
  open: boolean;
  onClose: () => void;
  reason: string;
  onUpgrade: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute bottom-0 left-0 right-0 mx-auto max-w-2xl">
        <div className="rounded-t-3xl border bg-white/90 backdrop-blur p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold">Upgrade to PanelFlow Pro</h3>
              <p className="text-sm opacity-70 mt-1">{reason}</p>
            </div>
            <button onClick={onClose} className="rounded-xl border px-3 py-2 text-sm">
              Close
            </button>
          </div>

          <div className="mt-4 space-y-2 text-sm">
            <div>✅ Unlimited series</div>
            <div>✅ Unlimited chapters</div>
            <div>✅ Remove watermark</div>
          </div>

          <button
            onClick={onUpgrade}
            className="mt-5 w-full rounded-2xl border px-4 py-4 font-semibold"
          >
            Upgrade to Pro
          </button>

          <p className="mt-3 text-xs opacity-60">
            Payments are handled by Stripe.
          </p>
        </div>
      </div>
    </div>
  );
}
