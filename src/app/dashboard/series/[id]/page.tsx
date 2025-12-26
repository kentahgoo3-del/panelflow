"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useParams, useRouter } from "next/navigation";
import Toast from "@/components/Toast";
import UpgradeSheet from "@/components/UpgradeSheet";
import { getCurrentPlan } from "@/lib/plan";
import { copyText } from "@/lib/copy";

type Chapter = {
  id: string;
  series_id: string;
  title: string | null;
  chapter_number: number;
  is_published: boolean;
  created_at: string;
};

type PageRow = {
  id: string;
  chapter_id: string;
  image_url: string;
  page_number: number;
};

export default function ManageSeriesPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const seriesId = params.id;

  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [plan, setPlan] = useState<"free" | "pro">("free");

  const [seriesTitle, setSeriesTitle] = useState<string>("");

  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null);
  const [chapterPages, setChapterPages] = useState<PageRow[]>([]);

  // create chapter form
  const [chapterNumber, setChapterNumber] = useState<number>(1);
  const [chapterTitle, setChapterTitle] = useState<string>("");
  const [creatingChapter, setCreatingChapter] = useState(false);

  // upload pages
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

  const [toast, setToast] = useState<string | null>(null);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState("");

  const canCreateChapter = useMemo(
    () => !creatingChapter && Number.isFinite(chapterNumber) && chapterNumber > 0,
    [creatingChapter, chapterNumber]
  );

  const canUpload = useMemo(
    () => !!selectedChapterId && files.length > 0 && !uploading,
    [selectedChapterId, files.length, uploading]
  );

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        router.push("/login");
        return;
      }
      setUserId(data.user.id);

      const p = await getCurrentPlan();
      setPlan(p);

      await loadSeriesTitle();
      await loadChapters();
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, seriesId]);

  async function upgrade() {
    const { data } = await supabase.auth.getUser();
    const user = data.user;
    if (!user) return setToast("Please log in first");

    const res = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id, email: user.email }),
    });

    const json = await res.json();
    if (!res.ok) return setToast(json.error || "Checkout failed");
    window.location.href = json.url;
  }

  async function loadSeriesTitle() {
    const { data, error } = await supabase
      .from("series")
      .select("title")
      .eq("id", seriesId)
      .single();

    if (error) {
      console.error(error);
      return;
    }
    setSeriesTitle(data?.title ?? "Series");
  }

  async function loadChapters() {
    const { data, error } = await supabase
      .from("chapters")
      .select("*")
      .eq("series_id", seriesId)
      .order("chapter_number", { ascending: true });

    if (error) {
      console.error(error);
      setToast(error.message);
      return;
    }
    setChapters((data as Chapter[]) ?? []);

    if (!selectedChapterId && data && data.length > 0) {
      setSelectedChapterId(data[0].id);
      await loadPages(data[0].id);
    }
  }

  async function loadPages(chapterId: string) {
    const { data, error } = await supabase
      .from("pages")
      .select("*")
      .eq("chapter_id", chapterId)
      .order("page_number", { ascending: true });

    if (error) {
      console.error(error);
      setToast(error.message);
      return;
    }
    setChapterPages((data as PageRow[]) ?? []);
  }

  async function createChapter() {
    // Free plan limit
    if (plan === "free" && chapters.length >= 5) {
      setUpgradeReason("Free plan allows up to 5 chapters. Upgrade to add more.");
      setUpgradeOpen(true);
      return;
    }

    setCreatingChapter(true);
    try {
      const { data, error } = await supabase
        .from("chapters")
        .insert([
          {
            series_id: seriesId,
            chapter_number: chapterNumber,
            title: chapterTitle.trim() || null,
            is_published: false,
          },
        ])
        .select("*")
        .single();

      if (error) throw error;

      await loadChapters();

      setSelectedChapterId(data.id);
      setChapterPages([]);
      setFiles([]);
      setToast("Chapter created ✅");
    } catch (e: any) {
      console.error(e);
      setToast(e?.message ?? "Failed to create chapter");
    } finally {
      setCreatingChapter(false);
    }
  }

  async function toggleChapterPublish(chapterId: string, current: boolean) {
    const { error } = await supabase
      .from("chapters")
      .update({ is_published: !current })
      .eq("id", chapterId);

    if (error) return setToast(error.message);
    await loadChapters();
    setToast(!current ? "Chapter published ✅" : "Chapter unpublished");
  }

  function sortFilesNaturally(fileList: File[]) {
    const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });
    return [...fileList].sort((a, b) => collator.compare(a.name, b.name));
  }

  async function uploadPages() {
    if (!userId || !selectedChapterId) return;

    setUploading(true);
    try {
      const sorted = sortFilesNaturally(files);
      const uploadedRows: { image_url: string; page_number: number }[] = [];

      for (let i = 0; i < sorted.length; i++) {
        const file = sorted[i];
        const ext = file.name.split(".").pop() || "jpg";
        const path = `${userId}/${seriesId}/${selectedChapterId}/${crypto.randomUUID()}.${ext}`;

        const { error: upErr } = await supabase.storage
          .from("pages")
          .upload(path, file, { upsert: false });

        if (upErr) throw upErr;

        const { data } = supabase.storage.from("pages").getPublicUrl(path);
        uploadedRows.push({ image_url: data.publicUrl, page_number: i + 1 });
      }

      const { error: insertErr } = await supabase
        .from("pages")
        .insert(uploadedRows.map((r) => ({ ...r, chapter_id: selectedChapterId })));

      if (insertErr) throw insertErr;

      setFiles([]);
      await loadPages(selectedChapterId);
      setToast("Pages uploaded ✅");
    } catch (e: any) {
      console.error(e);
      setToast(e?.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  if (loading) return <div className="p-6">Loading…</div>;

  return (
    <div className="min-h-screen p-6">
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="space-y-2">
          <button onClick={() => router.push("/dashboard")} className="text-sm opacity-70 underline">
            ← Back
          </button>
          <h1 className="text-2xl font-semibold">{seriesTitle}</h1>
          <p className="text-sm opacity-70">Manage chapters and pages</p>
        </header>

        <section className="rounded-2xl border p-5 space-y-4">
          <h2 className="text-lg font-semibold">Create chapter</h2>

          <div className="grid gap-3 md:grid-cols-3">
            <input
              className="rounded-xl border p-3"
              type="number"
              min={1}
              value={chapterNumber}
              onChange={(e) => setChapterNumber(parseInt(e.target.value || "1", 10))}
              placeholder="Chapter #"
            />
            <input
              className="md:col-span-2 rounded-xl border p-3"
              value={chapterTitle}
              onChange={(e) => setChapterTitle(e.target.value)}
              placeholder="Title (optional)"
            />
          </div>

          <button
            onClick={createChapter}
            disabled={!canCreateChapter}
            className="rounded-xl border px-4 py-3 disabled:opacity-40"
          >
            {creatingChapter ? "Creating…" : "Create chapter"}
          </button>
        </section>

        <section className="rounded-2xl border p-5 space-y-4">
          <h2 className="text-lg font-semibold">Chapters</h2>

          {chapters.length === 0 ? (
            <p className="opacity-70">No chapters yet. Create one above.</p>
          ) : (
            <div className="grid gap-2">
              {chapters.map((c) => (
                <div key={c.id} className="rounded-2xl border p-3 flex items-center justify-between gap-3">
                  <button
                    onClick={async () => {
                      setSelectedChapterId(c.id);
                      await loadPages(c.id);
                    }}
                    className={`text-left flex-1 ${selectedChapterId === c.id ? "opacity-100" : "opacity-80"}`}
                  >
                    <div className="font-semibold">
                      Chapter {c.chapter_number}{c.title ? ` — ${c.title}` : ""}
                    </div>
                    <div className="text-xs opacity-60">{c.is_published ? "Published" : "Private"}</div>
                  </button>

                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={async () => {
                        const link = `${window.location.origin}/r/${c.id}`;
                        await copyText(link);
                        setToast("Chapter link copied ✅");
                      }}
                      className="rounded-xl border px-3 py-2 text-sm"
                    >
                      Copy link
                    </button>

                    <button
                      onClick={() => toggleChapterPublish(c.id, c.is_published)}
                      className="rounded-xl border px-3 py-2 text-sm"
                    >
                      {c.is_published ? "Unpublish" : "Publish"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border p-5 space-y-4">
          <h2 className="text-lg font-semibold">Upload pages</h2>

          {!selectedChapterId ? (
            <p className="opacity-70">Select a chapter first.</p>
          ) : (
            <>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => setFiles(e.target.files ? Array.from(e.target.files) : [])}
              />

              <p className="text-sm opacity-70">
                Tip: name your files like <strong>01.jpg, 02.jpg…</strong> for perfect ordering.
              </p>

              <button
                onClick={uploadPages}
                disabled={!canUpload}
                className="rounded-xl border px-4 py-3 disabled:opacity-40"
              >
                {uploading ? "Uploading…" : `Upload ${files.length} page(s)`}
              </button>

              <div className="pt-2">
                <h3 className="font-semibold mb-2">Preview</h3>

                {chapterPages.length === 0 ? (
                  <p className="opacity-70">No pages uploaded yet.</p>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {chapterPages.map((p) => (
                      <div key={p.id} className="rounded-xl border overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={p.image_url} alt="" className="w-full h-28 object-cover" />
                        <div className="text-xs opacity-70 p-2">Page {p.page_number}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
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
