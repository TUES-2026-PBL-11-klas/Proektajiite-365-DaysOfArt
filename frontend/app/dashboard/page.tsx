"use client";

import { useEffect, useRef, useState, ChangeEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthGuard } from "@/components/AuthGuard";
import { useAuth } from "@/lib/auth-context";
import { apiFetch, API_BASE, Submission, SubmissionPage, submissionSrc } from "@/lib/api";
import type { Organization } from "@/lib/types";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type Tab = "daily" | "gallery";
type SubView = "feed" | "leaderboard";

type LeaderboardEntry = {
  id: string;
  user_id: string;
  date: string;
  like_count: number;
  image_url: string;
  image_data: string;
  artist?: { id: string; username: string; display_name: string | null } | null;
  prompt?: { id: string; title: string } | null;
};

type DailyPrompt = {
  id: string;
  date: string;
  organization_id: string | null;
  prompt: { id: string; title: string; description: string; category: string | null };
};

// ─────────────────────────────────────────────────────────────────────────────
// Small helpers
// ─────────────────────────────────────────────────────────────────────────────

function buildFeedUrl(tab: Tab, userId: string, orgId: string, page: number): string {
  const p = new URLSearchParams({ page: String(page), per_page: "20" });
  if (orgId) p.set("organization_id", orgId);
  if (userId) p.set("user_id", userId);
  if (tab === "daily") {
    return userId
      ? `${API_BASE}/api/feed/personalized?${p}`
      : `${API_BASE}/api/feed?${p}`;
  }
  return userId
    ? `${API_BASE}/api/feed/all/personalized?${p}`
    : `${API_BASE}/api/feed/all?${p}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Feed card
// ─────────────────────────────────────────────────────────────────────────────

function FeedCard({ sub, showPrompt }: { sub: Submission; showPrompt: boolean }) {
  const artist = sub.artist?.display_name || sub.artist?.username || "Artist";
  return (
    <article className="group relative flex flex-col border border-[#d8d3c7] bg-white transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5">
      <Link href={`/submissions/${sub.id}`} className="block overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={submissionSrc(sub)}
          alt={`Drawing by ${artist}`}
          className="aspect-square w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          loading="lazy"
        />
        {/* hover overlay */}
        <div className="absolute inset-0 bg-[#18181b]/0 group-hover:bg-[#18181b]/10 transition-colors duration-200 pointer-events-none" />
      </Link>

      <div className="flex flex-col gap-1 border-t border-[#d8d3c7] px-3 py-2.5">
        <div className="flex items-center justify-between gap-2">
          <Link
            href={`/users/${sub.user_id}`}
            className="truncate text-xs font-semibold text-[#7c3aed] hover:underline"
          >
            {artist}
          </Link>
          <span className="shrink-0 text-xs text-[#a1a1aa]">{sub.date}</span>
        </div>
        {showPrompt && sub.prompt?.title && (
          <p className="truncate text-xs text-[#71717a]">{sub.prompt.title}</p>
        )}
        {sub.caption && (
          <p className="truncate text-xs italic text-[#a1a1aa]">{sub.caption}</p>
        )}
      </div>
    </article>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Leaderboard row
// ─────────────────────────────────────────────────────────────────────────────

const RANK_STYLES = [
  "border-l-4 border-l-[#f59e0b] bg-[#fffbeb]",   // gold
  "border-l-4 border-l-[#94a3b8] bg-[#f8fafc]",   // silver
  "border-l-4 border-l-[#b45309] bg-[#fefce8]",   // bronze
];
const MEDALS = ["🥇", "🥈", "🥉"];

function LeaderboardRow({ entry, rank }: { entry: LeaderboardEntry; rank: number }) {
  const artist = entry.artist?.display_name || entry.artist?.username || `Artist ${entry.user_id.slice(0, 8)}`;
  const rowStyle = rank < 3 ? RANK_STYLES[rank] : "bg-white";
  return (
    <li>
      <Link
        href={`/submissions/${entry.id}`}
        className={`group flex items-center gap-4 border border-[#d8d3c7] p-3 transition-shadow hover:shadow-md ${rowStyle}`}
      >
        {/* Rank */}
        <span className="w-9 shrink-0 text-center">
          {rank < 3
            ? <span className="text-2xl leading-none">{MEDALS[rank]}</span>
            : <span className="text-base font-bold text-[#a1a1aa]">{rank + 1}</span>}
        </span>

        {/* Thumbnail */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={entry.image_data || entry.image_url}
          alt={`Drawing by ${artist}`}
          className="h-16 w-16 shrink-0 border border-[#d8d3c7] object-cover"
        />

        {/* Meta */}
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <p className="truncate text-sm font-semibold text-[#18181b]">{artist}</p>
          {entry.prompt?.title && (
            <p className="truncate text-xs text-[#52525b]">{entry.prompt.title}</p>
          )}
          <p className="text-xs text-[#a1a1aa]">{entry.date}</p>
        </div>

        {/* Like count */}
        <div className="shrink-0 flex flex-col items-center gap-0.5 min-w-[3rem]">
          <span className="text-xl leading-none text-[#7c3aed]">♥</span>
          <span className="text-sm font-bold text-[#7c3aed]">{entry.like_count}</span>
        </div>
      </Link>
    </li>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Upload panel
// ─────────────────────────────────────────────────────────────────────────────

function UploadPanel({
  userId,
  organizationId,
  organizationName,
  onSuccess,
  onClose,
}: {
  userId: string;
  organizationId: string;
  organizationName: string;
  onSuccess: () => void;
  onClose: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "uploading" | "done" | "error">("idle");
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function submit() {
    if (!organizationId) { setError("Select an organization before publishing."); return; }
    if (!file) { setError("Choose an image before publishing."); fileRef.current?.click(); return; }
    setStatus("uploading");
    setError("");
    try {
      const promptRes = await fetch(
        `${API_BASE}/api/prompts/daily?organization_id=${encodeURIComponent(organizationId)}`
      );
      if (!promptRes.ok) throw new Error("There is no daily prompt for this organization.");
      const promptData = await promptRes.json();
      const promptId: string = promptData.daily_prompt?.prompt?.id;
      if (!promptId) throw new Error("The prompt ID could not be found.");

      const imageData: string = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      await apiFetch("/api/submissions", {
        method: "POST",
        body: { user_id: userId, organization_id: organizationId, prompt_id: promptId, image_data: imageData },
      });

      setStatus("done");
      setTimeout(() => { onSuccess(); onClose(); }, 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
      setStatus("error");
    }
  }

  return (
    <div className="border border-[#d8d3c7] bg-white p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#71717a]">Upload drawing</p>
        <button onClick={onClose} className="text-sm text-[#71717a] hover:text-[#18181b]">× Close</button>
      </div>
      {organizationId ? (
        <p className="border border-[#d8d3c7] bg-[#f7f5ef] px-3 py-2 text-sm text-[#3f3f46]">
          Organization: <span className="font-semibold">{organizationName}</span>
        </p>
      ) : (
        <p className="border border-[#fca5a5] bg-[#fef2f2] px-3 py-2 text-sm text-[#b91c1c]">
          Select an organization from the dashboard dropdown before uploading.
        </p>
      )}
      <label className="text-sm font-medium text-[#3f3f46]">
        Image (PNG, JPG, WEBP)
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="mt-1 block w-full text-sm text-[#52525b] file:mr-4 file:border file:border-[#c8c2b6] file:bg-white file:px-3 file:py-2 file:text-sm file:font-medium file:text-[#18181b] hover:file:border-[#7c3aed] hover:file:text-[#7c3aed]"
          onChange={(e: ChangeEvent<HTMLInputElement>) => {
            setFile(e.target.files?.[0] ?? null);
            setError("");
            if (status === "error") setStatus("idle");
          }}
        />
      </label>
      {file && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img src={URL.createObjectURL(file)} alt="Preview" className="max-h-48 w-full object-contain border border-[#d8d3c7]" />
      )}
      {error && <p className="border border-[#fca5a5] bg-[#fef2f2] px-3 py-2 text-sm text-[#b91c1c]">{error}</p>}
      {status === "done" && (
        <p className="border border-[#6ee7b7] bg-[#ecfdf5] px-3 py-2 text-sm text-[#065f46]">Drawing published successfully!</p>
      )}
      <button
        disabled={status === "uploading" || status === "done"}
        onClick={submit}
        className="h-10 bg-[#18181b] px-5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        {status === "uploading" ? "Uploading…" : "Publish"}
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main dashboard
// ─────────────────────────────────────────────────────────────────────────────

function Dashboard() {
  const router = useRouter();
  const { user } = useAuth();

  const [tab, setTab] = useState<Tab>("daily");
  const [subView, setSubView] = useState<SubView>("feed");
  const [orgId, setOrgId] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<SubmissionPage | null>(null);
  const [loading, setLoading] = useState(false);
  const [feedError, setFeedError] = useState("");

  const [prompt, setPrompt] = useState<DailyPrompt | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [showUpload, setShowUpload] = useState(false);

  const [leaderboardEntries, setLeaderboardEntries] = useState<LeaderboardEntry[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [leaderboardError, setLeaderboardError] = useState("");

  const abortRef = useRef<AbortController | null>(null);
  const userId = user?.id ?? "";

  // Load only the user's member organizations.
  useEffect(() => {
    apiFetch<{ organizations: Organization[] }>("/api/organizations/mine")
      .then((data) => {
        const loaded = data.organizations ?? [];
        setOrganizations(loaded);
        const saved = typeof window !== "undefined" ? window.localStorage.getItem("365art_selected_org_id") : "";
        const next = (saved && loaded.some((o) => o.id === saved) ? saved : loaded[0]?.id) ?? "";
        setOrgId(next);
      })
      .catch(() => {});
  }, []);

  function selectOrganization(nextId: string) {
    setOrgId(nextId);
    setPage(1);
    if (typeof window !== "undefined") {
      if (nextId) window.localStorage.setItem("365art_selected_org_id", nextId);
      else window.localStorage.removeItem("365art_selected_org_id");
    }
  }

  // Reset sub-view and upload panel when the main tab changes.
  useEffect(() => {
    setSubView("feed");
    setShowUpload(false);
  }, [tab]);

  // Fetch leaderboard whenever sub-view or org changes.
  useEffect(() => {
    if (subView !== "leaderboard" || !orgId) {
      setLeaderboardEntries([]);
      return;
    }
    setLeaderboardLoading(true);
    setLeaderboardError("");
    const endpoint =
      tab === "daily"
        ? `${API_BASE}/api/leaderboard?organization_id=${encodeURIComponent(orgId)}&limit=10`
        : `${API_BASE}/api/leaderboard/all?organization_id=${encodeURIComponent(orgId)}&limit=10`;
    fetch(endpoint)
      .then((r) =>
        r.ok ? r.json() : r.json().then((d: { error?: string }) => Promise.reject(new Error(d.error ?? "Failed")))
      )
      .then((d: { leaderboard: LeaderboardEntry[] }) => {
        setLeaderboardEntries(d.leaderboard);
        setLeaderboardLoading(false);
      })
      .catch((err: Error) => {
        setLeaderboardError(err.message);
        setLeaderboardLoading(false);
      });
  }, [subView, tab, orgId]);

  // Fetch daily prompt for the daily tab.
  useEffect(() => {
    if (tab !== "daily") return;
    const params = orgId ? `?organization_id=${encodeURIComponent(orgId)}` : "";
    fetch(`${API_BASE}/api/prompts/daily${params}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setPrompt(d?.daily_prompt ?? null))
      .catch(() => setPrompt(null));
  }, [tab, orgId]);

  // Fetch feed.
  useEffect(() => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setFeedError("");
    fetch(buildFeedUrl(tab, userId, orgId, page), { signal: controller.signal })
      .then((r) => { if (!r.ok) throw new Error(`Server error ${r.status}`); return r.json(); })
      .then((json: SubmissionPage) => { setData(json); setLoading(false); })
      .catch((err: Error) => { if (err.name === "AbortError") return; setFeedError(err.message); setLoading(false); });
    return () => controller.abort();
  }, [tab, userId, orgId, page]);

  const submissions: Submission[] = data?.submissions ?? [];
  const totalPages = data?.pages ?? 1;
  const totalItems = data?.total ?? 0;
  const perPage = data?.per_page ?? 20;
  const selectedOrg = organizations.find((o) => o.id === orgId) ?? null;

  function refreshFeed() { setPage(1); setData(null); }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">

      {/* ── Page header ── */}
      <header className="flex flex-col gap-3 border-b border-[#d8d3c7] pb-5 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#7c3aed]">365 DaysOfArt</p>
          <h1 className="mt-1 text-3xl font-semibold text-[#18181b]">Dashboard</h1>
        </div>
        {organizations.length > 0 && (
          <label className="flex flex-col text-sm font-medium text-[#3f3f46] sm:flex-row sm:items-center sm:gap-3">
            <span>Organization</span>
            <select
              value={orgId}
              onChange={(e) => selectOrganization(e.target.value)}
              className="h-10 border border-[#c8c2b6] bg-white px-3 text-sm outline-none focus:border-[#7c3aed]"
            >
              {organizations.map((o) => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
            </select>
          </label>
        )}
      </header>

      {/* ── Main tabs + action buttons ── */}
      <div className="flex items-center justify-between border-b border-[#d8d3c7]">
        <div className="-mb-px flex">
          {(["daily", "gallery"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-6 py-3 text-sm font-bold uppercase tracking-[0.14em] border-b-2 transition-colors ${
                tab === t
                  ? "border-[#7c3aed] text-[#7c3aed]"
                  : "border-transparent text-[#71717a] hover:text-[#18181b]"
              }`}
            >
              {t === "daily" ? "Daily" : "Gallery"}
            </button>
          ))}
        </div>
        {tab === "daily" && (
          <div className="flex gap-2 pb-2">
            <button
              onClick={() => router.push(orgId ? `/dashboard/draw?organization_id=${encodeURIComponent(orgId)}` : "/dashboard/draw")}
              disabled={!orgId}
              className="h-9 bg-[#7c3aed] px-4 text-sm font-semibold text-white hover:bg-[#6d28d9] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Draw
            </button>
            <button
              onClick={() => setShowUpload((v) => !v)}
              className="h-9 border border-[#c8c2b6] bg-white px-4 text-sm font-medium text-[#3f3f46] hover:border-[#7c3aed] hover:text-[#7c3aed]"
            >
              {showUpload ? "Hide upload" : "Upload image"}
            </button>
          </div>
        )}
      </div>

      {/* ── Feed / Leaderboard sub-nav (pill style) ── */}
      <div className="mt-3 flex items-center gap-1 rounded-none">
        {(["feed", "leaderboard"] as SubView[]).map((sv) => (
          <button
            key={sv}
            onClick={() => setSubView(sv)}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.1em] transition-colors ${
              subView === sv
                ? "bg-[#7c3aed] text-white"
                : "bg-[#f4f2ee] text-[#71717a] hover:bg-[#e8e4da] hover:text-[#18181b]"
            }`}
          >
            {sv === "feed"
              ? "Feed"
              : tab === "daily"
                ? "Today's Leaderboard"
                : "All-Time Leaderboard"}
          </button>
        ))}
      </div>

      {/* ── Upload panel ── */}
      {tab === "daily" && showUpload && (
        <div className="mt-4">
          <UploadPanel
            userId={userId}
            organizationId={orgId}
            organizationName={selectedOrg?.name ?? "selected organization"}
            onSuccess={refreshFeed}
            onClose={() => setShowUpload(false)}
          />
        </div>
      )}

      {/* ════════════════ FEED ════════════════ */}
      {subView === "feed" && (
        <>
          {/* Daily prompt banner */}
          {tab === "daily" && prompt && (
            <div className="mt-4 flex items-start justify-between gap-4 border border-[#d8d3c7] bg-white px-5 py-4">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#7c3aed]">Today&apos;s prompt</p>
                <p className="mt-1 text-lg font-semibold text-[#18181b]">{prompt.prompt.title}</p>
                {prompt.prompt.description && (
                  <p className="mt-1 text-sm leading-6 text-[#52525b]">{prompt.prompt.description}</p>
                )}
                {prompt.prompt.category && (
                  <span className="mt-2 inline-block border border-[#c8c2b6] bg-[#f7f5ef] px-2 py-0.5 text-xs font-medium text-[#3f3f46]">
                    {prompt.prompt.category}
                  </span>
                )}
              </div>
              {orgId && (
                <button
                  onClick={() => router.push(`/dashboard/draw?organization_id=${encodeURIComponent(orgId)}`)}
                  className="mt-1 shrink-0 h-9 bg-[#7c3aed] px-4 text-sm font-semibold text-white hover:bg-[#6d28d9]"
                >
                  Draw now
                </button>
              )}
            </div>
          )}

          {tab === "gallery" && (
            <p className="mt-4 text-sm text-[#71717a]">
              Every drawing ever uploaded — days roll over at midnight.
            </p>
          )}

          {feedError && (
            <p className="mt-4 text-sm font-medium text-red-600">{feedError}</p>
          )}

          {/* Skeleton */}
          {loading && submissions.length === 0 && (
            <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <li key={i} className="aspect-square animate-pulse border border-[#d8d3c7] bg-[#e8e4da]" />
              ))}
            </ul>
          )}

          {/* Empty state */}
          {!loading && !feedError && submissions.length === 0 && (
            <div className="mt-16 flex flex-col items-center gap-3 py-10 text-center">
              <p className="text-base font-medium text-[#3f3f46]">
                {tab === "daily" ? "No drawings yet today." : "The gallery fills up as days complete."}
              </p>
              {tab === "daily" && (
                <button
                  onClick={() => router.push(orgId ? `/dashboard/draw?organization_id=${encodeURIComponent(orgId)}` : "/dashboard/draw")}
                  disabled={!orgId}
                  className="mt-2 h-10 bg-[#7c3aed] px-6 text-sm font-semibold text-white hover:bg-[#6d28d9] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Be first — Draw
                </button>
              )}
            </div>
          )}

          {/* Grid */}
          {submissions.length > 0 && (
            <>
              <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {submissions.map((sub) => (
                  <li key={sub.id}>
                    <FeedCard sub={sub} showPrompt={tab === "gallery"} />
                  </li>
                ))}
              </ul>

              {totalPages > 1 && (
                <div className="mt-8 flex items-center justify-between border-t border-[#d8d3c7] pt-4">
                  <p className="text-sm text-[#71717a]">
                    {(page - 1) * perPage + 1}–{Math.min(page * perPage, totalItems)} of {totalItems}
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
        </>
      )}

      {/* ════════════════ LEADERBOARD ════════════════ */}
      {subView === "leaderboard" && (
        <div className="mt-4">
          <div className="mb-4 border-l-2 border-[#7c3aed] pl-3">
            <p className="text-sm font-semibold text-[#18181b]">
              {tab === "daily" ? "Today's top drawings" : "All-time top drawings"}
            </p>
            <p className="text-xs text-[#71717a]">
              {tab === "daily"
                ? "Ranked by likes received today."
                : "Ranked by total likes across all days."}
            </p>
          </div>

          {!orgId && (
            <p className="text-sm text-[#71717a]">Select an organization to see the leaderboard.</p>
          )}

          {leaderboardError && (
            <p className="border border-[#fca5a5] bg-[#fef2f2] px-3 py-2 text-sm text-[#b91c1c]">{leaderboardError}</p>
          )}

          {leaderboardLoading && (
            <div className="flex flex-col gap-2.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-[88px] animate-pulse border border-[#d8d3c7] bg-[#e8e4da]" />
              ))}
            </div>
          )}

          {!leaderboardLoading && orgId && leaderboardEntries.length === 0 && !leaderboardError && (
            <p className="text-sm text-[#71717a]">
              {tab === "daily" ? "No liked drawings today yet." : "No liked drawings in the gallery yet."}
            </p>
          )}

          {leaderboardEntries.length > 0 && (
            <ol className="flex flex-col gap-2.5">
              {leaderboardEntries.map((entry, i) => (
                <LeaderboardRow key={entry.id} entry={entry} rank={i} />
              ))}
            </ol>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Page export — wrapped in AuthGuard
// ─────────────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  return (
    <AuthGuard>
      <Dashboard />
    </AuthGuard>
  );
}
