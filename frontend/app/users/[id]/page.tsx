"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { API_BASE, Submission, SubmissionPage, submissionSrc } from "@/lib/api";
import type { User } from "@/lib/types";

const monthOptions = [
  { value: "01", label: "Jan" },
  { value: "02", label: "Feb" },
  { value: "03", label: "Mar" },
  { value: "04", label: "Apr" },
  { value: "05", label: "May" },
  { value: "06", label: "Jun" },
  { value: "07", label: "Jul" },
  { value: "08", label: "Aug" },
  { value: "09", label: "Sep" },
  { value: "10", label: "Oct" },
  { value: "11", label: "Nov" },
  { value: "12", label: "Dec" },
];

function daysInMonth(year: string, month: string) {
  if (!year || !month) return 31;
  return new Date(Number(year), Number(month), 0).getDate();
}

// ─────────────────────────────────────────────────────────────────────────────
// Recommended Artists — self-contained component.
// Person 1 can import this into the profile page when auth is ready.
// ─────────────────────────────────────────────────────────────────────────────
export function RecommendedArtists({ userId }: { userId: string }) {
  const [artists, setArtists] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    const controller = new AbortController();

    fetch(`${API_BASE}/api/users/${userId}/recommended-artists?limit=10`, {
      signal: controller.signal,
    })
      .then((res) => (res.ok ? res.json() : { recommended_artist_ids: [] }))
      .then((data: { recommended_artist_ids: string[] }) => {
        setArtists(data.recommended_artist_ids ?? []);
        setLoading(false);
      })
      .catch((err: Error) => {
        if (err.name === "AbortError") return;
        setLoading(false);
      });

    return () => controller.abort();
  }, [userId]);

  return (
    <section>
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#71717a]">
        Recommended Artists
      </p>
      <h2 className="mt-1 text-xl font-semibold text-[#18181b]">
        Artists you might like
      </h2>

      {loading && (
        <div className="mt-3 flex gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-10 w-28 animate-pulse border border-[#d8d3c7] bg-[#e8e4da]"
            />
          ))}
        </div>
      )}

      {!loading && artists.length === 0 && (
        <p className="mt-3 text-sm text-[#71717a]">
          Interact with drawings to unlock personalised recommendations.
        </p>
      )}

      {!loading && artists.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2">
          {artists.map((artistId) => (
            <li key={artistId}>
              <Link
                href={`/users/${artistId}`}
                className="flex h-10 items-center border border-[#c8c2b6] bg-white px-4 text-sm font-medium text-[#18181b] transition-colors hover:border-[#7c3aed] hover:text-[#7c3aed]"
              >
                {artistId.slice(0, 8)}&hellip;
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Drawing History — date-picker filtered grid of a user's past submissions.
// ─────────────────────────────────────────────────────────────────────────────
function DrawingHistory({ userId }: { userId: string }) {
  const [filterYear, setFilterYear] = useState("");
  const [filterMonth, setFilterMonth] = useState("");
  const [filterDay, setFilterDay] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<SubmissionPage | null>(null);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const thisYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 10 }, (_, i) => String(thisYear - i));
  const selectedDate =
    filterYear && filterMonth && filterDay
      ? `${filterYear}-${filterMonth}-${filterDay}`
      : "";
  const maxDay = daysInMonth(filterYear, filterMonth);

  useEffect(() => {
    setPage(1);
  }, [filterYear, filterMonth, filterDay]);

  useEffect(() => {
    if (filterDay && Number(filterDay) > maxDay) {
      setFilterDay(String(maxDay).padStart(2, "0"));
    }
  }, [filterDay, maxDay]);

  useEffect(() => {
    if (!userId) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);

    const params = new URLSearchParams({ page: String(page), per_page: "20" });
    if (selectedDate) params.set("date", selectedDate);

    fetch(`${API_BASE}/api/users/${userId}/submissions?${params}`, {
      signal: controller.signal,
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((json: SubmissionPage | null) => {
        setData(json);
        setLoading(false);
      })
      .catch((err: Error) => {
        if (err.name === "AbortError") return;
        setLoading(false);
      });

    return () => controller.abort();
  }, [userId, selectedDate, page]);

  const submissions: Submission[] = data?.submissions ?? [];
  const totalPages = data?.pages ?? 1;
  const totalItems = data?.total ?? 0;
  const perPage = data?.per_page ?? 20;

  return (
    <section>
      {/* Section header with date picker */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#71717a]">
            Drawing History
          </p>
          <h2 className="mt-1 text-xl font-semibold text-[#18181b]">
            {selectedDate ? `Drawings on ${selectedDate}` : "All drawings"}
          </h2>
        </div>

        <div className="flex flex-wrap items-end gap-2">
          <label className="text-sm font-medium text-[#3f3f46]">
            <span className="mb-1 block">Filter by date</span>
            <div className="grid grid-cols-[110px_100px_80px] gap-2">
              <select
                value={filterYear}
                onChange={(e) => setFilterYear(e.target.value)}
                className="h-10 border border-[#c8c2b6] bg-white px-3 text-sm outline-none focus:border-[#7c3aed]"
              >
                <option value="">Year</option>
                {yearOptions.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
              <select
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
                className="h-10 border border-[#c8c2b6] bg-white px-3 text-sm outline-none focus:border-[#7c3aed]"
              >
                <option value="">Month</option>
                {monthOptions.map((month) => (
                  <option key={month.value} value={month.value}>
                    {month.label}
                  </option>
                ))}
              </select>
              <select
                value={filterDay}
                onChange={(e) => setFilterDay(e.target.value)}
                className="h-10 border border-[#c8c2b6] bg-white px-3 text-sm outline-none focus:border-[#7c3aed]"
              >
                <option value="">Day</option>
                {Array.from({ length: maxDay }, (_, i) => {
                  const day = String(i + 1).padStart(2, "0");
                  return (
                    <option key={day} value={day}>
                      {day}
                    </option>
                  );
                })}
              </select>
            </div>
          </label>
          {(filterYear || filterMonth || filterDay) && (
            <button
              onClick={() => {
                setFilterYear("");
                setFilterMonth("");
                setFilterDay("");
              }}
              className="h-10 border border-[#c8c2b6] bg-white px-3 text-sm text-[#71717a] hover:border-[#18181b] hover:text-[#18181b]"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Skeleton */}
      {loading && submissions.length === 0 && (
        <ul className="mt-4 grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <li
              key={i}
              className="aspect-square animate-pulse border border-[#d8d3c7] bg-[#e8e4da]"
            />
          ))}
        </ul>
      )}

      {/* Empty state */}
      {!loading && submissions.length === 0 && (
        <p className="mt-6 text-sm text-[#71717a]">
          {selectedDate
            ? `No drawings found on ${selectedDate}.`
            : "This artist has not submitted any drawings yet."}
        </p>
      )}

      {/* Grid */}
      {submissions.length > 0 && (
        <>
          <ul className="mt-4 grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {submissions.map((sub) => (
              <li key={sub.id}>
                <Link
                  href={`/submissions/${sub.id}`}
                  className="group block border border-[#d8d3c7] bg-white transition-shadow hover:shadow-md"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={submissionSrc(sub)}
                    alt={`Drawing from ${sub.date}`}
                    className="aspect-square w-full object-cover"
                    loading="lazy"
                  />
                  <div className="border-t border-[#d8d3c7] px-3 py-2">
                    <p className="text-xs font-medium text-[#3f3f46]">{sub.date}</p>
                    {sub.caption && (
                      <p className="mt-0.5 truncate text-xs text-[#71717a]">
                        {sub.caption}
                      </p>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between border-t border-[#d8d3c7] pt-4">
              <p className="text-sm text-[#71717a]">
                {(page - 1) * perPage + 1}–
                {Math.min(page * perPage, totalItems)} of {totalItems}
              </p>
              <div className="flex gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="h-9 border border-[#c8c2b6] bg-white px-4 text-sm font-medium text-[#18181b] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="h-9 border border-[#c8c2b6] bg-white px-4 text-sm font-medium text-[#18181b] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────
export default function UserPage() {
  const { id } = useParams<{ id: string }>();
  const [artist, setArtist] = useState<User | null>(null);
  const [artistLoading, setArtistLoading] = useState(true);
  const [artistError, setArtistError] = useState("");

  useEffect(() => {
    if (!id) return;
    const controller = new AbortController();
    setArtistLoading(true);
    setArtistError("");

    fetch(`${API_BASE}/api/users/${id}`, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error("Artist profile could not be loaded.");
        return res.json();
      })
      .then((data: { user: User }) => {
        setArtist(data.user);
        setArtistLoading(false);
      })
      .catch((err: Error) => {
        if (err.name === "AbortError") return;
        setArtistError(err.message);
        setArtistLoading(false);
      });

    return () => controller.abort();
  }, [id]);

  const artistName =
    artist?.display_name || artist?.username || `Artist ${id.slice(0, 8)}`;

  return (
    <main className="min-h-screen bg-[#f7f5ef] text-[#171717]">
      <section className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-8 px-4 py-4 sm:px-6 lg:px-8">

        {/* ── Header ── */}
        <header className="flex flex-col gap-3 border-b border-[#d8d3c7] pb-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#7c3aed]">
              365 DaysOfArt
            </p>
            <h1 className="mt-1 text-3xl font-semibold text-[#18181b]">
              {artistLoading ? "Artist Profile" : artistName}
            </h1>
            {artist?.username && (
              <p className="mt-1 text-sm text-[#71717a]">@{artist.username}</p>
            )}
            {artist?.bio && (
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#3f3f46]">
                {artist.bio}
              </p>
            )}
            {!artistLoading && artistError && (
              <p className="mt-2 text-sm text-[#b91c1c]">{artistError}</p>
            )}
          </div>
          <Link
            href="/feed"
            className="inline-flex h-10 items-center border border-[#c8c2b6] bg-white px-4 text-sm font-medium text-[#18181b] hover:border-[#18181b]"
          >
            ← Feed
          </Link>
        </header>

        {/* ── Recommended Artists ── */}
        <RecommendedArtists userId={id} />

        {/* ── Divider ── */}
        <hr className="border-[#d8d3c7]" />

        {/* ── Drawing History ── */}
        <DrawingHistory userId={id} />

      </section>
    </main>
  );
}
