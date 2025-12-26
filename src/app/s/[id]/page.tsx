"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useParams, useRouter } from "next/navigation";
import PrivateContent from "@/components/PrivateContent";

type SeriesRow = {
  id: string;
  title: string;
  description: string | null;
  cover_image: string | null;
  is_published: boolean;
};

type ChapterRow = {
  id: string;
  series_id: string;
  title: string | null;
  chapter_number: number;
  is_published: boolean;
};

export default function PublicSeriesPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const seriesId = params.id;

  const [loading, setLoading] = useState(true);
  const [series, setSeries] = useState<SeriesRow | null>(null);
  const [chapters, setChapters] = useState<ChapterRow[]>([]);

  useEffect(() => {
    (async () => {
      const { data: sData } = await supabase
        .from("series")
        .select("id,title,description,cover_image,is_published")
        .eq("id", seriesId)
        .single();

      if (!sData) {
        setLoading(false);
        return;
      }

      setSeries(sData as SeriesRow);

      const { data: cData } = await supabase
        .from("chapters")
        .select("id,series_id,title,chapter_number,is_published")
        .eq("series_id", seriesId)
        .eq("is_published", true)
        .order("chapter_number", { ascending: true });

      setChapters((cData as ChapterRow[]) ?? []);
      setLoading(false);
    })();
  }, [seriesId]);

  if (loading) return <div className="p-6">Loading…</div>;

  if (!series) return <PrivateContent type="series" />;

  return (
    <div className="min-h-screen p-6">
      <div className="mx-auto max-w-xl space-y-6">
        <header className="space-y-3">
          <h1 className="text-2xl font-semibold">{series.title}</h1>

          {series.cover_image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={series.cover_image} alt="" className="w-full rounded-2xl border object-cover" />
          )}

          {series.description && <p className="opacity-80">{series.description}</p>}
        </header>

        {chapters.length > 0 && (
          <button
            onClick={() => router.push(`/r/${chapters[0].id}`)}
            className="w-full rounded-2xl border px-4 py-4 text-left"
          >
            <div className="font-semibold">Start reading</div>
            <div className="text-sm opacity-70">Begin with Chapter {chapters[0].chapter_number}</div>
          </button>
        )}

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Chapters</h2>

          {chapters.length === 0 ? (
            <p className="opacity-70">No published chapters yet.</p>
          ) : (
            <div className="grid gap-2">
              {chapters.map((c) => (
                <button
                  key={c.id}
                  onClick={() => router.push(`/r/${c.id}`)}
                  className="w-full rounded-2xl border p-4 text-left"
                >
                  <div className="font-semibold">Chapter {c.chapter_number}</div>
                  {c.title && <div className="text-sm opacity-70">{c.title}</div>}
                </button>
              ))}
            </div>
          )}
        </section>

        <footer className="pt-4 text-xs opacity-60">Powered by PanelFlow</footer>
      </div>
    </div>
  );
}
