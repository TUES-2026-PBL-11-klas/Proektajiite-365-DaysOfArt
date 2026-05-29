"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { apiFetch, API_BASE, Submission, SubmissionPage, submissionSrc } from "@/lib/api";
import type { Organization } from "@/lib/types";

type Tab = "daily" | "gallery";

const TAB_META: Record<Tab, { label: string; hint: string }> = {
  daily: {
    label: "Daily",
    hint: "Today's drawings — fresh submissions for today's prompt.",
  },
  gallery: {
    label: "Gallery",
    hint: "Every drawing ever uploaded, newest first. Log in to get a personalised ranking.",
  },
};

function buildEndpoint(
  tab: Tab,
  userId: string,
  organizationId: string,
  page: number,
): string {
  const params = new URLSearchParams({ page: String(page), per_page: "20" });
  if (organizationId) params.set("organization_id", organizationId);

  if (tab === "daily") {
    if (userId) {
      params.set("user_id", userId);
      return `/api/feed/personalized?${params}`;
    }
    return `/api/feed?${params}`;
  }

  if (userId) {
    params.set("user_id", userId);
    return `/api/feed/all/personalized?${params}`;
  }
  return `/api/feed/all?${params}`;
}

export default function FeedPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("daily");
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [organizationId, setOrganizationId] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<SubmissionPage | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const abortRef = useRef<AbortController | null>(null);
  const userId = user?.id ?? "";

  // Reset to page 1 when any filter changes.
  useEffect(() => {
    setPage(1);
  }, [tab, organizationId, userId]);

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
        setOrganizationId(nextOrgId);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError("");

    const endpoint = buildEndpoint(tab, userId, organizationId, page);

    fetch(`${API_BASE}${endpoint}`, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`Server responded with ${res.status}`);
        return res.json();
      })
      .then((json: SubmissionPage) => {
        setData(json);
        setLoading(false);
      })
      .catch((err: Error) => {
        if (err.name === "AbortError") return;
        setError(err.message);
        setLoading(false);
      });

    return () => controller.abort();
  }, [tab, organizationId, userId, page]);

  const submissions: Submission[] = data?.submissions ?? [];
  const totalPages = data?.pages ?? 1;
  const totalItems = data?.total ?? 0;
  const perPage = data?.per_page ?? 20;

  function selectOrganization(nextOrgId: string) {
    setOrganizationId(nextOrgId);
    if (typeof window !== "undefined") {
      if (nextOrgId) window.localStorage.setItem("365art_selected_org_id", nextOrgId);
      else window.localStorage.removeItem("365art_selected_org_id");
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f5ef] text-[#171717]">
      <section className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-5 px-4 py-4 sm:px-6 lg:px-8">

        {/* ── Header ── */}
        <header className="flex flex-col gap-3 border-b border-[#d8d3c7] pb-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#7c3aed]">
              365 DaysOfArt
            </p>
            <h1 className="mt-1 text-3xl font-semibold text-[#18181b]">Feed</h1>
          </div>

          <div className="grid gap-2 sm:grid-cols-1">
            <label className="text-sm font-medium text-[#3f3f46]">
              Organization
              <select
                className="mt-1 h-10 w-full border border-[#c8c2b6] bg-white px-3 text-sm outline-none focus:border-[#7c3aed]"
                value={organizationId}
                onChange={(e) => selectOrganization(e.target.value)}
              >
                <option value="">All organizations</option>
                {organizations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </header>

        {/* ── Tabs ── */}
        <div className="-mb-px flex border-b border-[#d8d3c7]">
          {(Object.entries(TAB_META) as [Tab, (typeof TAB_META)[Tab]][]).map(
            ([key, meta]) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`px-6 py-3 text-sm font-semibold uppercase tracking-[0.12em] border-b-2 transition-colors ${
                  tab === key
                    ? "border-[#7c3aed] text-[#7c3aed]"
                    : "border-transparent text-[#71717a] hover:text-[#18181b]"
                }`}
              >
                {meta.label}
              </button>
            ),
          )}
        </div>

        <p className="text-sm text-[#71717a]">{TAB_META[tab].hint}</p>

        {/* ── Error ── */}
        {error && (
          <p className="text-sm font-medium text-red-600">{error}</p>
        )}

        {/* ── Loading skeleton ── */}
        {loading && submissions.length === 0 && (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <li
                key={i}
                className="aspect-square animate-pulse border border-[#d8d3c7] bg-[#e8e4da]"
              />
            ))}
          </ul>
        )}

        {/* ── Empty state ── */}
        {!loading && !error && submissions.length === 0 && (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 py-20">
            <p className="text-base font-medium text-[#3f3f46]">
              No drawings here yet.
            </p>
            <p className="max-w-sm text-center text-sm text-[#71717a]">
              {tab === "daily"
                ? "Be the first to draw today's prompt!"
                : "The gallery fills up as days complete. Come back tomorrow."}
            </p>
            <Link
              href="/dashboard/draw"
              className="mt-4 h-10 border border-[#18181b] bg-white px-5 text-sm font-semibold text-[#18181b] flex items-center"
            >
              Open Drawing Board
            </Link>
          </div>
        )}

        {/* ── Grid ── */}
        {submissions.length > 0 && (
          <>
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {submissions.map((sub) => (
                <li key={sub.id}>
                  <Link
                    href={`/submissions/${sub.id}`}
                    className="group block border border-[#d8d3c7] bg-white transition-shadow hover:shadow-md"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={submissionSrc(sub)}
                      alt="Drawing submission"
                      className="aspect-square w-full object-cover"
                      loading="lazy"
                    />
                    <div className="border-t border-[#d8d3c7] px-3 py-2">
                      <p className="truncate text-xs font-medium text-[#3f3f46]">
                        {sub.date}
                      </p>
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

            {/* ── Pagination ── */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-[#d8d3c7] pt-4">
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
    </main>
  );
}
