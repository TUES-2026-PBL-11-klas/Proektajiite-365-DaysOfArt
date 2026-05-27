"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { API_BASE, Submission, submissionSrc } from "@/lib/api";

function MetaRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#71717a]">
        {label}
      </p>
      <div className="mt-1">{children}</div>
    </div>
  );
}

export default function SubmissionPage() {
  const { id } = useParams<{ id: string }>();

  const [submission, setSubmission] = useState<Submission | null>(null);
  const [similar, setSimilar] = useState<Submission[]>([]);
  const [mainLoading, setMainLoading] = useState(true);
  const [similarLoading, setSimilarLoading] = useState(true);
  const [error, setError] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!id) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setMainLoading(true);
    setSimilarLoading(true);
    setError("");

    // Load the submission.
    fetch(`${API_BASE}/api/submissions/${id}`, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error("Submission not found.");
        return res.json();
      })
      .then((data: { submission: Submission }) => {
        setSubmission(data.submission);
        setMainLoading(false);
      })
      .catch((err: Error) => {
        if (err.name === "AbortError") return;
        setError(err.message);
        setMainLoading(false);
      });

    // Load similar drawings independently — failure is non-fatal.
    fetch(`${API_BASE}/api/submissions/${id}/similar?limit=8`, {
      signal: controller.signal,
    })
      .then((res) => (res.ok ? res.json() : { similar_drawings: [] }))
      .then((data: { similar_drawings: Submission[] }) => {
        setSimilar(data.similar_drawings ?? []);
        setSimilarLoading(false);
      })
      .catch((err: Error) => {
        if (err.name === "AbortError") return;
        setSimilarLoading(false);
      });

    return () => controller.abort();
  }, [id]);

  /* ── Loading ── */
  if (mainLoading) {
    return (
      <main className="min-h-screen bg-[#f7f5ef]">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="h-8 w-32 animate-pulse rounded bg-[#e8e4da]" />
          <div className="mt-8 aspect-square w-full max-w-lg animate-pulse bg-[#e8e4da]" />
        </div>
      </main>
    );
  }

  /* ── Error ── */
  if (error || !submission) {
    return (
      <main className="min-h-screen bg-[#f7f5ef]">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <Link
            href="/feed"
            className="text-sm font-medium text-[#7c3aed] hover:underline"
          >
            ← Back to Feed
          </Link>
          <p className="mt-8 text-base font-medium text-[#3f3f46]">
            {error || "This drawing could not be found."}
          </p>
        </div>
      </main>
    );
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
            <h1 className="mt-1 text-3xl font-semibold text-[#18181b]">Drawing</h1>
          </div>
          <Link
            href="/feed"
            className="inline-flex h-10 items-center border border-[#c8c2b6] bg-white px-4 text-sm font-medium text-[#18181b] hover:border-[#18181b]"
          >
            ← Back to Feed
          </Link>
        </header>

        {/* ── Main content ── */}
        <div className="grid flex-1 gap-8 lg:grid-cols-[1fr_280px]">

          {/* Image */}
          <div className="border border-[#d8d3c7] bg-white shadow-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={submissionSrc(submission)}
              alt="Drawing"
              className="w-full object-contain"
            />
          </div>

          {/* Metadata sidebar */}
          <aside className="flex flex-col gap-6">
            <MetaRow label="Date">
              <p className="text-base font-medium text-[#18181b]">{submission.date}</p>
            </MetaRow>

            <MetaRow label="Artist">
              <Link
                href={`/users/${submission.user_id}`}
                className="break-all text-sm font-medium text-[#7c3aed] hover:underline"
              >
                {submission.user_id}
              </Link>
            </MetaRow>

            {submission.caption && (
              <MetaRow label="Caption">
                <p className="text-sm leading-6 text-[#52525b]">{submission.caption}</p>
              </MetaRow>
            )}

            <MetaRow label="Organisation">
              <p className="break-all text-sm text-[#52525b]">
                {submission.organization_id}
              </p>
            </MetaRow>

            <MetaRow label="Prompt">
              <p className="break-all text-sm text-[#52525b]">{submission.topic_id}</p>
            </MetaRow>

            <div className="mt-auto border-t border-[#d8d3c7] pt-4">
              <Link
                href={`/users/${submission.user_id}`}
                className="inline-flex h-10 w-full items-center justify-center border border-[#7c3aed] px-4 text-sm font-semibold text-[#7c3aed] hover:bg-[#7c3aed] hover:text-white transition-colors"
              >
                View artist&apos;s drawings
              </Link>
            </div>
          </aside>
        </div>

        {/* ── Similar Drawings ── */}
        <section className="border-t border-[#d8d3c7] pt-8">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#71717a]">
            Similar Drawings
          </p>
          <h2 className="mt-1 text-xl font-semibold text-[#18181b]">
            You might also like
          </h2>

          {similarLoading && (
            <ul className="mt-4 grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <li
                  key={i}
                  className="aspect-square animate-pulse border border-[#d8d3c7] bg-[#e8e4da]"
                />
              ))}
            </ul>
          )}

          {!similarLoading && similar.length === 0 && (
            <p className="mt-4 text-sm text-[#71717a]">
              No similar drawings found yet — check back after more people have
              interacted with the platform.
            </p>
          )}

          {!similarLoading && similar.length > 0 && (
            <ul className="mt-4 grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {similar.map((sub) => (
                <li key={sub.id}>
                  <Link
                    href={`/submissions/${sub.id}`}
                    className="group block border border-[#d8d3c7] bg-white transition-shadow hover:shadow-md"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={submissionSrc(sub)}
                      alt="Similar drawing"
                      className="aspect-square w-full object-cover"
                      loading="lazy"
                    />
                    <div className="border-t border-[#d8d3c7] px-3 py-2">
                      <p className="truncate text-xs font-medium text-[#3f3f46]">
                        {sub.date}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </section>
    </main>
  );
}
