"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useParams, useRouter } from "next/navigation";
import PrivateContent from "@/components/PrivateContent";
import { getTheme, setTheme as persistTheme } from "@/lib/theme";
import { getCurrentPlan } from "@/lib/plan";

type ChapterRow = {
  id: string;
  series_id: string;
  title: string | null;
  chapter_number: number;
  is_published: boolean;
};

type PageRow = {
  id: string;
  chapter_id: string;
  image_url: string;
  page_number: number;
};

export default function ReaderPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const chapterId = params.id;

  const [loading, setLoading] = useState(true);
  const [chapter, setChapter] = useState<ChapterRow | null>(null);
  const [pages, setPages] = useState<PageRow[]>([]);
  const [uiVisible, setUiVisible] = useState(false);
  const [chaptersOpen, setChaptersOpen] = useState(false);
  const [chapters, setChapters] = useState<ChapterRow[]>([]);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [plan, setPlan] = useState<"free" | "pro">("free");

  useEffect(() => {
    setTheme(getTheme());
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("pf-dark", theme === "dark");
    persistTheme(theme);
  }, [theme]);

  useEffect(() => {
    (async () => {
      const p = await getCurrentPlan();
      setPlan(p);

      const { data: cData } = await supabase
        .from("chapters")
        .select("id,series_id,title,chapter_number,is_published")
        .eq("id", chapterId)
        .eq("is_published", true)
        .single();

      if (!cData) {
        setLoading(false);
        return;
      }

      setChapter(cData as ChapterRow);

      const { data: chData } = await supabase
        .from("chapters")
        .select("id,series_id,title,chapter_number,is_published")
        .eq("series_id", cData.series_id)
        .eq("is_published", true)
        .order("chapter_number", { ascending: true });

      setChapters((chData as ChapterRow[]) ?? []);

      const { data: pData } = await supabase
        .from("pages")
        .select("id,chapter_id,image_url,page_number")
        .eq("chapter_id", chapterId)
        .order("page_number", { ascending: true });

      setPages((pData as PageRow[]) ?? []);
      setLoading(false);
    })();
  }, [chapterId]);

  // auto-hide UI after 2s when shown
  useEffect(() => {
    if (!uiVisible) return;
    const t = setTimeout(() => setUiVisible(false), 2000);
    return () => clearTimeout(t);
  }, [uiVisible]);

  // tiny preload for smoother reading
  useEffect(() => {
    if (pages.length === 0) return;
    pages.slice(0, 3).forEach((p) => {
      const img = new Image();
      img.src = p.image_url;
    });
  }, [pages]);

  const title = useMemo(() => {
    if (!chapter) return "PanelFlow Reader";
    const base = `Chapter ${chapter.chapter_number}`;
    return chapter.title ? `${base} — ${chapter.title}` : base;
  }, [chapter]);

  if (loading) return <div className="p-6">Loading…</div>;
  if (!chapter) return <PrivateContent type="chapter" />;

  return (
    <div className="min-h-screen pf-bg">
      {/* Tap overlay to toggle controls */}
      <button
        onClick={() => setUiVisible((v) => !v)}
        className="fixed inset-0 z-10"
        aria-label="Toggle controls"
      />

      {/* Controls */}
      {uiVisible && (
        <div className="fixed top-0 left-0 right-0 z-20 p-3">
          <div className="mx-auto max-w-2xl rounded-2xl border pf-card backdrop-blur px-4 py-3 flex items-center justify-between gap-2">
            <button onClick={() => router.back()} className="rounded-xl border px-3 py-2 text-sm">
              Back
            </button>

            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="rounded-xl border px-3 py-2 text-sm"
            >
              {theme === "dark" ? "Light" : "Dark"}
            </button>

            <div className="text-sm font-semibold truncate flex-1 text-center">{title}</div>

            <button
              onClick={() => setChaptersOpen(true)}
              className="rounded-xl border px-3 py-2 text-sm"
            >
              Chapters
            </button>
          </div>
        </div>
      )}

      {/* Reader content */}
      <div className="relative z-0 mx-auto max-w-2xl px-0 pt-2 pb-10">
        {pages.length === 0 ? (
          <div className="p-6 opacity-70">No pages in this chapter yet.</div>
        ) : (
          <div className="flex flex-col">
            {pages.map((p) => (
              <div key={p.id} className="w-full">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.image_url} alt="" loading="lazy" className="w-full h-auto block" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Chapter switcher bottom sheet */}
      {chaptersOpen && (
        <div className="fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/40" onClick={() => setChaptersOpen(false)} />
          <div className="absolute bottom-0 left-0 right-0 mx-auto max-w-2xl">
            <div className="pf-card rounded-t-3xl border p-4 max-h-[70vh] overflow-auto">
              <div className="flex items-center justify-between mb-3">
                <div className="font-semibold">Chapters</div>
                <button onClick={() => setChaptersOpen(false)} className="rounded-xl border px-3 py-2 text-sm">
                  Close
                </button>
              </div>

              <div className="grid gap-2">
                {chapters.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      setChaptersOpen(false);
                      router.push(`/r/${c.id}`);
                    }}
                    className={`rounded-2xl border p-4 text-left ${c.id === chapterId ? "opacity-100" : "opacity-80"}`}
                  >
                    <div className="font-semibold">Chapter {c.chapter_number}</div>
                    {c.title && <div className="text-sm opacity-70">{c.title}</div>}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Watermark */}
      {plan === "free" && (
        <button
          onClick={() => router.push("/pricing")}
          className="fixed bottom-2 right-3 z-30 text-[10px] opacity-60 underline"
        >
          Powered by PanelFlow • Upgrade
        </button>
      )}
    </div>
  );
}
