"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import LikeButton from "@/app/components/LikeButton";
import CommentSection from "@/app/components/CommentSection";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5001";

type Submission = {
  id: string;
  user_id: string;
  organization_id: string;
  topic_id: string;
  image_data: string;
  image_url: string;
  date: string;
  caption: string | null;
  submitted_at: string | null;
  created_at: string | null;
};

export default function SubmissionPage() {
  const { id } = useParams<{ id: string }>();

  const [submission, setSubmission] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // User UUID for likes and comments — persisted in localStorage for convenience.
  const [userId, setUserId] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("365art_user_id") ?? "";
    }
    return "";
  });
  const [userIdInput, setUserIdInput] = useState(userId);
  const inputRef = useRef<HTMLInputElement>(null);

  function saveUserId() {
    const trimmed = userIdInput.trim();
    setUserId(trimmed);
    if (typeof window !== "undefined") {
      localStorage.setItem("365art_user_id", trimmed);
    }
  }

  useEffect(() => {
    if (!id) return;
    setLoading(true);

    fetch(`${API_BASE_URL}/api/submissions/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error("Submission not found");
        return r.json();
      })
      .then((data: { submission: Submission }) => {
        setSubmission(data.submission);
        setLoading(false);
      })
      .catch((err: Error) => {
        setError(err.message);
        setLoading(false);
      });
  }, [id]);

  /* ── Loading ── */
  if (loading) {
    return (
      <main className="min-h-screen bg-[#f7f5ef]">
        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="h-8 w-32 animate-pulse rounded bg-[#e8e4da]" />
          <div className="mt-6 aspect-square w-full max-w-lg animate-pulse bg-[#e8e4da]" />
        </div>
      </main>
    );
  }

  /* ── Error ── */
  if (error || !submission) {
    return (
      <main className="min-h-screen bg-[#f7f5ef]">
        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
          <Link href="/" className="text-sm font-medium text-[#7c3aed] hover:underline">
            ← Назад
          </Link>
          <p className="mt-8 text-base font-medium text-[#3f3f46]">
            {error || "Рисунката не е намерена."}
          </p>
        </div>
      </main>
    );
  }

  const imageSrc = submission.image_data || submission.image_url;

  return (
    <main className="min-h-screen bg-[#f7f5ef] text-[#171717]">
      <section className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 px-4 py-4 sm:px-6 lg:px-8">

        {/* ── Header ── */}
        <header className="flex items-center justify-between border-b border-[#d8d3c7] pb-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#7c3aed]">
              365 DaysOfArt
            </p>
            <h1 className="mt-1 text-2xl font-semibold text-[#18181b]">Рисунка</h1>
          </div>
          <div className="flex gap-2">
            <Link
              href="/leaderboard"
              className="inline-flex h-9 items-center border border-[#c8c2b6] bg-white px-3 text-sm font-medium text-[#18181b] hover:border-[#7c3aed] hover:text-[#7c3aed]"
            >
              Класация
            </Link>
            <Link
              href="/"
              className="inline-flex h-9 items-center border border-[#c8c2b6] bg-white px-3 text-sm font-medium text-[#18181b] hover:border-[#18181b]"
            >
              ← Назад
            </Link>
          </div>
        </header>

        {/* ── User ID banner (needed for likes/comments) ── */}
        {!userId && (
          <div className="flex items-end gap-2 border border-[#d8d3c7] bg-white px-4 py-3">
            <label className="flex-1 text-sm font-medium text-[#3f3f46]">
              Твоят User UUID (за харесване и коментари)
              <input
                ref={inputRef}
                className="mt-1 h-10 w-full border border-[#c8c2b6] bg-white px-3 text-sm outline-none focus:border-[#7c3aed]"
                placeholder="Постави своя UUID"
                value={userIdInput}
                onChange={(e) => setUserIdInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && saveUserId()}
              />
            </label>
            <button
              onClick={saveUserId}
              className="h-10 bg-[#7c3aed] px-4 text-sm font-semibold text-white hover:bg-[#6d28d9]"
            >
              Потвърди
            </button>
          </div>
        )}

        {userId && (
          <div className="flex items-center justify-between border border-[#d8d3c7] bg-white px-4 py-2">
            <p className="text-xs text-[#71717a]">
              Вписан като <span className="font-mono font-medium text-[#7c3aed]">{userId.slice(0, 8)}…</span>
            </p>
            <button
              onClick={() => { setUserId(""); setUserIdInput(""); localStorage.removeItem("365art_user_id"); }}
              className="text-xs text-[#71717a] hover:text-[#18181b]"
            >
              Смени
            </button>
          </div>
        )}

        {/* ── Main grid ── */}
        <div className="grid gap-6 lg:grid-cols-[1fr_300px]">

          {/* Image */}
          <div className="border border-[#d8d3c7] bg-white shadow-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageSrc}
              alt="Рисунка"
              className="w-full object-contain"
            />
          </div>

          {/* Sidebar */}
          <aside className="flex flex-col gap-6">
            {/* Metadata */}
            <div className="flex flex-col gap-4 border border-[#d8d3c7] bg-white p-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#71717a]">
                  Дата
                </p>
                <p className="mt-1 text-sm font-medium text-[#18181b]">{submission.date}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#71717a]">
                  Художник
                </p>
                <p className="mt-1 break-all font-mono text-xs text-[#52525b]">
                  {submission.user_id}
                </p>
              </div>
              {submission.caption && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#71717a]">
                    Надпис
                  </p>
                  <p className="mt-1 text-sm leading-6 text-[#52525b]">{submission.caption}</p>
                </div>
              )}
            </div>

            {/* Like button */}
            <div className="border border-[#d8d3c7] bg-white p-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#71717a]">
                Харесване
              </p>
              <LikeButton
                submissionId={submission.id}
                userId={userId}
              />
              {!userId && (
                <p className="mt-2 text-xs text-[#a1a1aa]">
                  Въведи UUID за да харесаш рисунката
                </p>
              )}
            </div>
          </aside>
        </div>

        {/* ── Comments ── */}
        <section className="border border-[#d8d3c7] bg-white p-5">
          <CommentSection
            submissionId={submission.id}
            userId={userId}
          />
        </section>

      </section>
    </main>
  );
}
