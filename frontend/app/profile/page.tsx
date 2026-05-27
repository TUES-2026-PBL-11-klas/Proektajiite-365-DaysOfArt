"use client";

import { useEffect, useState, FormEvent } from "react";
import { AuthGuard } from "@/components/AuthGuard";
import { ChangePasswordSection } from "@/components/ChangePasswordSection";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api";
import type { HistoryEntry, User } from "@/lib/types";

function ProfileContent() {
  const { user, refresh } = useAuth();
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState(user?.display_name ?? "");
  const [bio, setBio] = useState(user?.bio ?? "");
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url ?? "");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiFetch<{ history: HistoryEntry[] }>("/api/profile/history")
      .then((data) => setHistory(data.history))
      .catch(() => setHistory([]));
  }, []);

  function startEditing() {
    setDisplayName(user?.display_name ?? "");
    setBio(user?.bio ?? "");
    setAvatarUrl(user?.avatar_url ?? "");
    setEditing(true);
  }

  async function onSave(e: FormEvent) {
    e.preventDefault();
    setSaveError(null);
    setSaving(true);
    try {
      await apiFetch<User>("/api/profile", {
        method: "PUT",
        body: {
          display_name: displayName,
          bio,
          avatar_url: avatarUrl,
        },
      });
      await refresh();
      setEditing(false);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Грешка при запис");
    } finally {
      setSaving(false);
    }
  }

  if (!user) return null;

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <section className="mb-10 flex items-start gap-6">
        {user.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.avatar_url}
            alt={user.display_name || user.username}
            className="h-24 w-24 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-zinc-200 text-2xl dark:bg-zinc-800">
            {(user.display_name || user.username).charAt(0).toUpperCase()}
          </div>
        )}
        <div className="flex-1">
          <h1 className="text-2xl font-semibold">
            {user.display_name || user.username}
          </h1>
          <p className="text-sm text-zinc-500">@{user.username}</p>
          {user.bio && <p className="mt-2 text-zinc-700 dark:text-zinc-300">{user.bio}</p>}
          <button
            onClick={() => (editing ? setEditing(false) : startEditing())}
            className="mt-3 text-sm underline"
          >
            {editing ? "Затвори" : "Редактирай профил"}
          </button>
        </div>
      </section>

      {editing && (
        <form
          onSubmit={onSave}
          className="mb-10 flex flex-col gap-4 rounded border border-zinc-200 p-4 dark:border-zinc-800"
        >
          <label className="flex flex-col gap-1 text-sm">
            Име за показване
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Био
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Avatar URL
            <input
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
            />
          </label>
          {saveError && <p className="text-sm text-red-600">{saveError}</p>}
          <button
            type="submit"
            disabled={saving}
            className="self-start rounded bg-black px-4 py-2 text-white disabled:opacity-60 dark:bg-white dark:text-black"
          >
            {saving ? "Запис…" : "Запази"}
          </button>
        </form>
      )}

      <ChangePasswordSection />

      <section>
        <h2 className="mb-4 text-xl font-semibold">Моите рисунки по дати</h2>
        {history.length === 0 ? (
          <p className="text-sm text-zinc-500">
            Все още нямаш качени рисунки. Започни от темата на деня!
          </p>
        ) : (
          <div className="flex flex-col gap-8">
            {history.map((day) => (
              <div key={day.date}>
                <h3 className="mb-2 text-sm font-medium text-zinc-500">{day.date}</h3>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {day.submissions.map((s) => (
                    <figure
                      key={s.submission_id}
                      className="overflow-hidden rounded border border-zinc-200 dark:border-zinc-800"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={s.image_url}
                        alt={s.topic_title}
                        className="aspect-square w-full object-cover"
                      />
                      <figcaption className="px-2 py-1 text-xs text-zinc-600 dark:text-zinc-400">
                        {s.topic_title}
                      </figcaption>
                    </figure>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <AuthGuard>
      <ProfileContent />
    </AuthGuard>
  );
}
