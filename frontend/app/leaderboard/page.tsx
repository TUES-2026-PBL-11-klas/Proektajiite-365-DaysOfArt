"use client";

import { useEffect, useState } from "react";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:5000";

type LeaderboardEntry = {
  id: string;
  user_id: string;
  image_url: string;
  date: string;
  like_count: number;
};

export default function LeaderboardPage() {
  const [organizationId, setOrganizationId] = useState("");
  const [debouncedOrgId, setDebouncedOrgId] = useState("");
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Debounce the org id input so we don't fire on every keystroke
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedOrgId(organizationId), 500);
    return () => clearTimeout(timer);
  }, [organizationId]);

  useEffect(() => {
    async function fetchLeaderboard() {
      if (!debouncedOrgId) {
        setEntries([]);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/leaderboard?organization_id=${encodeURIComponent(
            debouncedOrgId
          )}`
        );
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error ?? "Failed to load leaderboard");
        }
        const data = await response.json();
        setEntries(data.leaderboard);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load leaderboard"
        );
      } finally {
        setLoading(false);
      }
    }

    fetchLeaderboard();
  }, [debouncedOrgId]);

  return (
    <main className="min-h-screen bg-[#f7f5ef] text-[#171717]">
      <section className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-3 border-b border-[#d8d3c7] pb-5">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#7c3aed]">
              365 DaysOfArt
            </p>
            <h1 className="mt-1 text-3xl font-semibold text-[#18181b]">
              Leaderboard
            </h1>
            <p className="mt-1 text-sm text-[#52525b]">
              Top drawings for today, ranked by likes
            </p>
          </div>
          <div className="mt-2 max-w-sm">
            <label className="text-sm font-medium text-[#3f3f46]">
              Organization
              <input
                className="mt-1 h-10 w-full border border-[#c8c2b6] bg-white px-3 text-sm outline-none focus:border-[#7c3aed]"
                placeholder="Organization UUID"
                value={organizationId}
                onChange={(e) => setOrganizationId(e.target.value)}
              />
            </label>
          </div>
        </header>

        {!debouncedOrgId && (
          <p className="text-sm text-[#71717a]">
            Enter an Organization UUID to see today&apos;s leaderboard.
          </p>
        )}

        {loading && (
          <p className="text-sm text-[#71717a]">Loading leaderboard…</p>
        )}

        {error && <p className="text-sm text-red-500">{error}</p>}

        {!loading && debouncedOrgId && entries.length === 0 && !error && (
          <p className="text-sm text-[#71717a]">
            No submissions with likes yet for today.
          </p>
        )}

        {entries.length > 0 && (
          <ol className="flex flex-col gap-4">
            {entries.map((entry, index) => (
              <li
                key={entry.id}
                className="flex items-center gap-4 border border-[#d8d3c7] bg-white p-4"
              >
                <span
                  className={`text-2xl font-bold w-8 shrink-0 ${
                    index === 0
                      ? "text-[#f59e0b]"
                      : index === 1
                      ? "text-[#71717a]"
                      : index === 2
                      ? "text-[#92400e]"
                      : "text-[#d4d4d8]"
                  }`}
                >
                  {index + 1}
                </span>

                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={entry.image_url}
                  alt={`Submission by ${entry.user_id.slice(0, 8)}`}
                  className="h-20 w-20 shrink-0 object-cover border border-[#d8d3c7]"
                />

                <div className="flex flex-1 flex-col gap-1 min-w-0">
                  <p className="text-sm font-medium text-[#18181b] truncate">
                    User{" "}
                    <span className="text-[#7c3aed]">
                      {entry.user_id.slice(0, 8)}…
                    </span>
                  </p>
                  <p className="text-xs text-[#71717a]">{entry.date}</p>
                </div>

                <div className="shrink-0 flex items-center gap-1 text-[#7c3aed] font-semibold">
                  <span className="text-lg">♥</span>
                  <span>{entry.like_count}</span>
                </div>
              </li>
            ))}
          </ol>
        )}

        <div className="mt-auto pt-4 border-t border-[#d8d3c7]">
          
            href="/"
            className="text-sm font-medium text-[#7c3aed] hover:underline"
          >
            ← Back to Drawing Board
          </a>
        </div>
      </section>
    </main>
  );
}