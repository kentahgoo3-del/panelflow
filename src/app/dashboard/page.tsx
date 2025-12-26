"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import type { Series } from "@/types";
import { copyText } from "@/lib/copy";
import Toast from "@/components/Toast";
import UpgradeSheet from "@/components/UpgradeSheet";
import { getCurrentPlan } from "@/lib/plan";

export default function DashboardPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [plan, setPlan] = useState<"free" | "pro">("free");

  const [series, setSeries] = useState<Series[]>([]);

  // form
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const [toast, setToast] = useState<string | null>(null);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState("");

  const canSubmit = useMemo(() => title.trim().length > 1 && !saving, [title, saving]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        router.push("/login");
        return;
      }
      setUserId(data.user.id);
      setEmail(data.user.email ?? null);

      const p = await getCurrentPlan();
      setPlan(p);

      await loadSeries();
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  async function loadSeries() {
    const { data, error } = await supabase
      .from("series")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      setToast(error.message);
      return;
    }
    setSeries((data as Series[]) ?? []);
  }

  async function uploadCover(uid: string, file: File) {
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${uid}/${crypto.randomUUID()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("covers")
      .upload(path, file, { upsert: false });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from("covers").getPublicUrl(path);
    return data.publicUrl;
  }

  async function upgrade() {
    const { data } = await supabase.auth.getUser();
    const user = data.user;
    if (!user) return setToast("Please log in first");

    setToast("Opening Stripe checkout…");

    const res = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id, email: user.email }),
    });

    const json = await res.json();
    if (!res.ok) return setToast(json.error || "Checkout failed");
    window.location.href = json.url;
  }

  async function openBillingPortal() {
    const { data } = await supabase.auth.getUser();
    const user = data.user;
    if (!user) return;

    const res = await fetch("/api/stripe/portal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id }),
    });

    const json = await res.json();
    if (!res.ok) return setToast(json.error || "Could not open billing portal");
    window.location.href = json.url;
  }

  async function createSeries() {
    if (!userId) return;

    // Free plan limit
    if (plan === "free" && series.length >= 1) {
      setUpgradeReason("Free plan allows 1 series. Upgrade to create more.");
      setUpgradeOpen(true);
      return;
    }

    setSaving(true);

    try {
      let coverUrl: string | null = null;
      if (coverFile) coverUrl = await uploadCover(userId, coverFile);

      const { error } = await supabase.from("series").insert([
        {
          user_id: userId,
          title: title.trim(),
          description: description.trim() || null,
          cover_image: coverUrl,
          is_published: false,
        },
      ]);

      if (error) throw error;

      setTitle("");
      setDescription("");
      setCoverFile(null);

      await loadSeries();
      setToast("Series created ✅");
    } catch (e: any) {
      console.error(e);
      setToast(e?.message ?? "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  async function toggleSeriesPublish(seriesId: string, current: boolean) {
    const { error } = await supabase
      .from("series")
      .update({ is_published: !current })
      .eq("id", seriesId);

    if (error) return setToast(error.message);
    await loadSeries();
    setToast(!current ? "Published ✅" : "Unpublished");
  }

  async function logout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  if (loading) return <div className="p-6">Loading…</div>;

  return (
    <div className="min-h-screen p-6">
      <div className="mx-auto max-w-2xl space-y-6">
        <header className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">PanelFlow</h1>
            <p className="opacity-70 text-sm">Logged in as: {email}</p>
            <div className="text-xs opacity-70 mt-1">
              Plan: <span className="font-semibold">{plan === "pro" ? "Pro ✅" : "Free"}</span>
            </div>
            {plan === "free" && (
              <button
                onClick={() => router.push("/pricing")}
                className="mt-2 rounded-xl border px-4 py-2 text-sm font-semibold"
              >
                Upgrade to Pro
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={openBillingPortal} className="rounded-xl border px-4 py-2">
              Manage billing
            </button>
            <button onClick={logout} className="rounded-xl border px-4 py-2">
              Log out
            </button>
          </div>
        </header>

        <section className="rounded-2xl border p-5 space-y-4">
          <h2 className="text-lg font-semibold">Create series</h2>

          <input
            className="w-full rounded-xl border p-3"
            placeholder="Series title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          <textarea
            className="w-full rounded-xl border p-3 min-h-[90px]"
            placeholder="Short description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          <div className="space-y-2">
            <label className="text-sm opacity-80">Cover image (optional)</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setCoverFile(e.target.files?.[0] ?? null)}
            />
          </div>

          <button
            onClick={createSeries}
            disabled={!canSubmit}
            className="w-full rounded-xl border px-4 py-3 disabled:opacity-40"
          >
            {saving ? "Saving…" : "Create series"}
          </button>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Your series</h2>

          {series.length === 0 ? (
            <div className="rounded-2xl border p-5 space-y-2">
              <div className="font-semibold">Get started</div>
              <ol className="text-sm opacity-80 list-decimal pl-5 space-y-1">
                <li>Create a series</li>
                <li>Create a chapter</li>
                <li>Upload pages</li>
                <li>Publish when you’re ready</li>
              </ol>
            </div>
          ) : (
            <div className="grid gap-3">
              {series.map((s) => (
                <div key={s.id} className="rounded-2xl border p-4 flex gap-4">
                  <div className="h-16 w-16 rounded-xl border overflow-hidden shrink-0">
                    {s.cover_image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={s.cover_image} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center opacity-40 text-sm">
                        No cover
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="font-semibold truncate">{s.title}</div>
                    {s.description && (
                      <div className="text-sm opacity-70" style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
                        {s.description}
                      </div>
                    )}
                    <div className="text-xs opacity-60 mt-1">Status: {s.is_published ? "Published" : "Private"}</div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        onClick={() => router.push(`/dashboard/series/${s.id}`)}
                        className="rounded-xl border px-3 py-2 text-sm"
                      >
                        Manage
                      </button>

                      <button
                        onClick={async () => {
                          const link = `${window.location.origin}/s/${s.id}`;
                          await copyText(link);
                          setToast("Series link copied ✅");
                        }}
                        className="rounded-xl border px-3 py-2 text-sm"
                      >
                        Copy public link
                      </button>

                      <button
                        onClick={() => toggleSeriesPublish(s.id, s.is_published)}
                        className="rounded-xl border px-3 py-2 text-sm"
                      >
                        {s.is_published ? "Unpublish" : "Publish"}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <Toast message={toast} onClose={() => setToast(null)} />
      <UpgradeSheet
        open={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
        reason={upgradeReason}
        onUpgrade={upgrade}
      />
    </div>
  );
}
