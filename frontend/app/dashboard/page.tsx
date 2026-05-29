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
    if (!organizationId) {
      setError("Select an organization before publishing.");
      return;
    }
    if (!file) {
      setError("Choose an image before publishing.");
      fileRef.current?.click();
      return;
    }
    setStatus("uploading");
    setError("");

    try {
      // 1. Get today's prompt for the org.
      const promptRes = await fetch(
        `${API_BASE}/api/prompts/daily?organization_id=${encodeURIComponent(organizationId)}`
      );
      if (!promptRes.ok) throw new Error("There is no daily prompt for this organization.");
      const promptData = await promptRes.json();
      const promptId: string = promptData.daily_prompt?.prompt?.id;
      if (!promptId) throw new Error("The prompt ID could not be found.");

      // 2. Read file as base-64 data URL.
      const imageData: string = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      // 3. Submit drawing.
      await apiFetch("/api/submissions", {
        method: "POST",
        body: {
          user_id: userId,
          organization_id: organizationId,
          prompt_id: promptId,
          image_data: imageData,
        },
      });

      setStatus("done");
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
      setStatus("error");
    }
  }

  return (
    <div className="border border-[#d8d3c7] bg-white p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#71717a]">
          Upload drawing
        </p>
        <button
          onClick={onClose}
          className="text-sm text-[#71717a] hover:text-[#18181b]"
        >
          × Close
        </button>
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
        <img
          src={URL.createObjectURL(file)}
          alt="Preview"
          className="max-h-48 w-full object-contain border border-[#d8d3c7]"
        />
      )}

      {error && (
        <p className="border border-[#fca5a5] bg-[#fef2f2] px-3 py-2 text-sm text-[#b91c1c]">
          {error}
        </p>
      )}

      {status === "done" && (
        <p className="border border-[#6ee7b7] bg-[#ecfdf5] px-3 py-2 text-sm text-[#065f46]">
          Drawing published successfully!
        </p>
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
  const [orgId, setOrgId] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<SubmissionPage | null>(null);
  const [loading, setLoading] = useState(false);
  const [feedError, setFeedError] = useState("");

  const [prompt, setPrompt] = useState<DailyPrompt | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [showUpload, setShowUpload] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const userId = user?.id ?? "";

  // Load organizations once.
  useEffect(() => {
    apiFetch<{ organizations: Organization[] }>("/api/organizations", { auth: false })
      .then((data) => {
        const loadedOrganizations = data.organizations ?? [];
        setOrganizations(loadedOrganizations);
        const savedOrgId =
          typeof window !== "undefined"
            ? window.localStorage.getItem("365art_selected_org_id")
            : "";
        const nextOrgId =
          savedOrgId && loadedOrganizations.some((org) => org.id === savedOrgId)
            ? savedOrgId
            : loadedOrganizations[0]?.id ?? "";
        setOrgId(nextOrgId);
      })
      .catch(() => {});
  }, []);

  function selectOrganization(nextOrgId: string) {
    setOrgId(nextOrgId);
    setPage(1);
    if (typeof window !== "undefined") {
      if (nextOrgId) window.localStorage.setItem("365art_selected_org_id", nextOrgId);
      else window.localStorage.removeItem("365art_selected_org_id");
    }
  }

  // Load today's prompt (daily tab only).
  useEffect(() => {
    if (tab !== "daily") return;
    const params = orgId ? `?organization_id=${encodeURIComponent(orgId)}` : "";
    fetch(`${API_BASE}/api/prompts/daily${params}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setPrompt(d?.daily_prompt ?? null))
      .catch(() => setPrompt(null));
  }, [tab, orgId]);

  // Load feed.
  useEffect(() => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setFeedError("");

    fetch(buildFeedUrl(tab, userId, orgId, page), { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw new Error(`Server error ${r.status}`);
        return r.json();
      })
      .then((json: SubmissionPage) => {
        setData(json);
        setLoading(false);
      })
      .catch((err: Error) => {
        if (err.name === "AbortError") return;
        setFeedError(err.message);
        setLoading(false);
      });

    return () => controller.abort();
  }, [tab, userId, orgId, page]);

  const submissions: Submission[] = data?.submissions ?? [];
  const totalPages = data?.pages ?? 1;
  const totalItems = data?.total ?? 0;
  const perPage = data?.per_page ?? 20;

  function refreshFeed() {
    setPage(1);
    setData(null);
  }

  const selectedOrganization = organizations.find((org) => org.id === orgId) ?? null;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">

      {/* ── Page header ── */}
      <header className="flex flex-col gap-3 border-b border-[#d8d3c7] pb-5 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#7c3aed]">
            365 DaysOfArt
          </p>
          <h1 className="mt-1 text-3xl font-semibold text-[#18181b]">Dashboard</h1>
        </div>

        {/* Org filter */}
        {organizations.length > 0 && (
          <label className="flex flex-col text-sm font-medium text-[#3f3f46] sm:flex-row sm:items-center sm:gap-3">
            <span>Organization</span>
            <select
              value={orgId}
              onChange={(e) => selectOrganization(e.target.value)}
              className="h-10 border border-[#c8c2b6] bg-white px-3 text-sm outline-none focus:border-[#7c3aed]"
            >
              {organizations.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </label>
        )}
      </header>

      {/* ── Tabs + action buttons ── */}
      <div className="mt-0 flex items-center justify-between border-b border-[#d8d3c7]">
        <div className="-mb-px flex">
          {(["daily", "gallery"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-6 py-3 text-sm font-semibold uppercase tracking-[0.12em] border-b-2 transition-colors ${
                tab === t
                  ? "border-[#7c3aed] text-[#7c3aed]"
                  : "border-transparent text-[#71717a] hover:text-[#18181b]"
              }`}
            >
              {t === "daily" ? "Daily" : "Gallery"}
            </button>
          ))}
        </div>

        <div className="flex gap-2 pb-2">
          <button
            onClick={() =>
              router.push(
                orgId
                  ? `/dashboard/draw?organization_id=${encodeURIComponent(orgId)}`
                  : "/dashboard/draw"
              )
            }
            disabled={!orgId}
            className="h-9 bg-[#7c3aed] px-4 text-sm font-semibold text-white hover:bg-[#6d28d9]"
          >
            Draw
          </button>
          <button
            onClick={() => setShowUpload((v) => !v)}
            className="h-9 border border-[#18181b] bg-white px-4 text-sm font-semibold text-[#18181b] hover:border-[#7c3aed] hover:text-[#7c3aed]"
          >
            {showUpload ? "Hide" : "Upload image"}
          </button>
        </div>
      </div>

      {/* ── Upload panel ── */}
      {showUpload && (
        <div className="mt-4">
          <UploadPanel
            userId={userId}
            organizationId={orgId}
            organizationName={selectedOrganization?.name ?? "selected organization"}
            onSuccess={refreshFeed}
            onClose={() => setShowUpload(false)}
          />
        </div>
      )}

      {/* ── Daily prompt banner ── */}
      {tab === "daily" && prompt && (
        <div className="mt-5 border border-[#d8d3c7] bg-white px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#7c3aed]">
            Today&apos;s prompt
          </p>
          <p className="mt-1 text-lg font-semibold text-[#18181b]">
            {prompt.prompt.title}
          </p>
          {prompt.prompt.description && (
            <p className="mt-1 text-sm leading-6 text-[#52525b]">
              {prompt.prompt.description}
            </p>
          )}
          {prompt.prompt.category && (
            <span className="mt-2 inline-block border border-[#c8c2b6] bg-[#f7f5ef] px-2 py-0.5 text-xs font-medium text-[#3f3f46]">
              {prompt.prompt.category}
            </span>
          )}
        </div>
      )}

      {/* Gallery description */}
      {tab === "gallery" && (
        <p className="mt-5 text-sm text-[#71717a]">
          All uploaded drawings, ranked with recommendations for you.
        </p>
      )}

      {/* ── Error ── */}
      {feedError && (
        <p className="mt-4 text-sm font-medium text-red-600">{feedError}</p>
      )}

      {/* ── Skeleton ── */}
      {loading && submissions.length === 0 && (
        <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <li
              key={i}
              className="aspect-square animate-pulse border border-[#d8d3c7] bg-[#e8e4da]"
            />
          ))}
        </ul>
      )}

      {/* ── Empty state ── */}
      {!loading && !feedError && submissions.length === 0 && (
        <div className="mt-16 flex flex-col items-center gap-3 py-10 text-center">
          <p className="text-base font-medium text-[#3f3f46]">
            {tab === "daily"
              ? "No one has drawn today yet."
              : "The gallery is empty. Drawings appear as people upload them."}
          </p>
          <button
            onClick={() => router.push("/dashboard/draw")}
            className="mt-2 h-10 bg-[#7c3aed] px-6 text-sm font-semibold text-white hover:bg-[#6d28d9]"
          >
            Be first — Draw
          </button>
        </div>
      )}

      {/* ── Grid ── */}
      {submissions.length > 0 && (
        <>
          <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {submissions.map((sub) => (
              <li key={sub.id}>
                <article className="group border border-[#d8d3c7] bg-white transition-shadow hover:shadow-md">
                  <Link href={`/submissions/${sub.id}`} className="block">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={submissionSrc(sub)}
                      alt="Drawing"
                      className="aspect-square w-full object-cover"
                      loading="lazy"
                    />
                  </Link>
                  <div className="border-t border-[#d8d3c7] px-3 py-2">
                    <Link href={`/submissions/${sub.id}`} className="block">
                      <p className="truncate text-xs font-medium text-[#3f3f46]">
                        {sub.date}
                      </p>
                      {sub.caption && (
                        <p className="mt-0.5 truncate text-xs text-[#71717a]">
                          {sub.caption}
                        </p>
                      )}
                    </Link>
                    <Link
                      href={`/users/${sub.user_id}`}
                      className="mt-0.5 block truncate text-xs text-[#7c3aed] hover:underline"
                    >
                      {sub.artist?.display_name ||
                        sub.artist?.username ||
                        "Artist"}
                    </Link>
                  </div>
                </article>
              </li>
            ))}
          </ul>

          {/* ── Pagination ── */}
          {totalPages > 1 && (
            <div className="mt-8 flex items-center justify-between border-t border-[#d8d3c7] pt-4">
              <p className="text-sm text-[#71717a]">
                {(page - 1) * perPage + 1}–{Math.min(page * perPage, totalItems)}{" "}
                of {totalItems}
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
