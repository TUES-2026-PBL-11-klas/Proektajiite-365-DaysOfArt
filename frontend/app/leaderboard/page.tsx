"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5001";

const MEDAL = ["🥇", "🥈", "🥉"];

type LeaderboardEntry = {
  id: string;
  user_id: string;
  image_url: string;
  image_data: string;
  date: string;
  like_count: number;
};

export default function LeaderboardPage() {
  const [organizationId, setOrganizationId] = useState("");
  const [debouncedOrgId, setDebouncedOrgId] = useState("");
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedOrgId(organizationId), 500);
    return () => clearTimeout(timer);
  }, [organizationId]);

  useEffect(() => {
    if (!debouncedOrgId) {
      setEntries([]);
      return;
    }

    setLoading(true);
    setError(null);

    fetch(
      `${API_BASE_URL}/api/leaderboard?organization_id=${encodeURIComponent(debouncedOrgId)}&limit=10`
    )
      .then((r) => {
        if (!r.ok) return r.json().then((d) => Promise.reject(new Error(d.error ?? "Failed to load")));
        return r.json();
      })
      .then((data: { leaderboard: LeaderboardEntry[] }) => {
        setEntries(data.leaderboard);
        setLoading(false);
      })
      .catch((err: Error) => {
        setError(err.message);
        setLoading(false);
      });
  }, [debouncedOrgId]);

  return (
    <main className="min-h-screen bg-[#f7f5ef] text-[#171717]">
      <section className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">

        {/* ── Header ── */}
        <header className="flex flex-col gap-3 border-b border-[#d8d3c7] pb-5">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#7c3aed]">
              365 DaysOfArt
            </p>
            <h1 className="mt-1 text-3xl font-semibold text-[#18181b]">
              Класация
            </h1>
            <p className="mt-1 text-sm text-[#52525b]">
              Топ рисунки за днес, наредени по харесвания
            </p>
          </div>

          <div className="mt-2 max-w-sm">
            <label className="text-sm font-medium text-[#3f3f46]">
              Организация
              <input
                className="mt-1 h-10 w-full border border-[#c8c2b6] bg-white px-3 text-sm outline-none focus:border-[#7c3aed]"
                placeholder="UUID на организацията"
                value={organizationId}
                onChange={(e) => setOrganizationId(e.target.value)}
              />
            </label>
          </div>
        </header>

        {/* ── States ── */}
        {!debouncedOrgId && (
          <p className="text-sm text-[#71717a]">
            Въведи UUID на организация, за да видиш класацията за днес.
          </p>
        )}

        {loading && (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-24 animate-pulse border border-[#d8d3c7] bg-[#e8e4da]" />
            ))}
          </div>
        )}

        {error && (
          <p className="border border-[#fca5a5] bg-[#fef2f2] px-3 py-2 text-sm text-[#b91c1c]">
            {error}
          </p>
        )}

        {!loading && debouncedOrgId && entries.length === 0 && !error && (
          <p className="text-sm text-[#71717a]">
            Все още няма рисунки с харесвания за днес.
          </p>
        )}

        {/* ── Leaderboard list ── */}
        {entries.length > 0 && (
          <ol className="flex flex-col gap-3">
            {entries.map((entry, index) => (
              <li key={entry.id}>
                <Link
                  href={`/submissions/${entry.id}`}
                  className="group flex items-center gap-4 border border-[#d8d3c7] bg-white p-4 transition-shadow hover:shadow-md"
                >
                  {/* Rank */}
                  <span className="w-8 shrink-0 text-center text-2xl font-bold">
                    {index < 3 ? MEDAL[index] : (
                      <span className="text-lg text-[#d4d4d8]">{index + 1}</span>
                    )}
                  </span>

                  {/* Thumbnail */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={entry.image_data || entry.image_url}
                    alt={`Рисунка от ${entry.user_id.slice(0, 8)}`}
                    className="h-20 w-20 shrink-0 border border-[#d8d3c7] object-cover"
                  />

                  {/* Meta */}
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <p className="truncate text-sm font-medium text-[#18181b]">
                      Художник{" "}
                      <span className="text-[#7c3aed]">
                        {entry.user_id.slice(0, 8)}…
                      </span>
                    </p>
                    <p className="text-xs text-[#71717a]">{entry.date}</p>
                    <p className="text-xs text-[#7c3aed] opacity-0 group-hover:opacity-100 transition-opacity">
                      Виж рисунката →
                    </p>
                  </div>

                  {/* Like count */}
                  <div className="shrink-0 flex items-center gap-1.5 font-semibold text-[#7c3aed]">
                    <span className="text-lg">♥</span>
                    <span>{entry.like_count}</span>
                  </div>
                </Link>
              </li>
            ))}
          </ol>
        )}

        {/* ── Footer nav ── */}
        <div className="mt-auto border-t border-[#d8d3c7] pt-4">
          <Link
            href="/"
            className="text-sm font-medium text-[#7c3aed] hover:underline"
          >
            ← Назад към Drawing Board
          </Link>
        </div>
      </section>
    </main>
  );
}
