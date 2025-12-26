import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen p-6">
      <div className="mx-auto max-w-3xl space-y-8">
        <header className="space-y-3">
          <h1 className="text-4xl font-semibold tracking-tight">Publish your manga. Let it be read properly.</h1>
          <p className="text-base opacity-80 max-w-2xl">
            PanelFlow gives creators a clean, mobile-first reader and simple publishing tools — no clutter, no social noise.
          </p>
          <div className="flex flex-wrap gap-2 pt-2">
            <Link href="/login" className="rounded-2xl border px-4 py-3 font-semibold">
              Start publishing
            </Link>
            <Link href="/pricing" className="rounded-2xl border px-4 py-3 opacity-80">
              View pricing
            </Link>
          </div>
        </header>

        <section className="grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border p-5">
            <div className="font-semibold">Mobile-first reading</div>
            <p className="text-sm opacity-80 mt-2">Vertical scroll, clean UI, fast loads.</p>
          </div>
          <div className="rounded-2xl border p-5">
            <div className="font-semibold">Upload in minutes</div>
            <p className="text-sm opacity-80 mt-2">Create a series, add a chapter, upload pages.</p>
          </div>
          <div className="rounded-2xl border p-5">
            <div className="font-semibold">Publish when ready</div>
            <p className="text-sm opacity-80 mt-2">Keep drafts private until you hit publish.</p>
          </div>
        </section>

        <section className="rounded-2xl border p-5 space-y-3">
          <div className="font-semibold">Live demo</div>
          <p className="text-sm opacity-80">
            After you create and publish a series, copy the public link and drop it here on your landing page.
          </p>
        </section>

        <footer className="flex flex-wrap gap-4 text-sm opacity-70 pt-4">
          <Link href="/terms" className="underline">Terms</Link>
          <Link href="/privacy" className="underline">Privacy</Link>
        </footer>
      </div>
    </div>
  );
}
