"use client";

import { useEffect, useState, FormEvent } from "react";
import { AuthGuard } from "@/components/AuthGuard";
import { ChangePasswordSection } from "@/components/ChangePasswordSection";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api";
import type { HistoryEntry, User } from "@/lib/types";

const inputClass =
  "mt-1 h-10 w-full border border-[#c8c2b6] bg-white px-3 text-sm text-[#18181b] outline-none focus:border-[#7c3aed]";
const labelClass = "text-sm font-medium text-[#3f3f46]";

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
      setSaveError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  if (!user) return null;

  return (
    <div className="bg-[#f7f5ef] py-10">
      <div className="mx-auto max-w-3xl px-6">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#7c3aed]">
          365 DaysOfArt
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-[#18181b]">Profile</h1>

        <section className="mt-6 mb-10 flex items-start gap-6 border border-[#d8d3c7] bg-white p-5">
          {user.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.avatar_url}
              alt={user.display_name || user.username}
              className="h-24 w-24 object-cover"
            />
          ) : (
            <div className="flex h-24 w-24 items-center justify-center bg-[#ede9fe] text-3xl font-semibold text-[#7c3aed]">
              {(user.display_name || user.username).charAt(0).toUpperCase()}
            </div>
          )}
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold text-[#18181b]">
                {user.display_name || user.username}
              </h2>
              {user.role === "admin" && (
                <span className="bg-[#7c3aed] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white">
                  admin
                </span>
              )}
            </div>
            <p className="text-sm text-[#71717a]">@{user.username}</p>
            {user.bio && (
              <p className="mt-2 text-sm leading-6 text-[#3f3f46]">{user.bio}</p>
            )}
            <button
              onClick={() => (editing ? setEditing(false) : startEditing())}
              className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-[#7c3aed] hover:text-[#6d28d9]"
            >
              {editing ? "Close" : "Edit profile"}
            </button>
          </div>
        </section>

        {editing && (
          <form
            onSubmit={onSave}
            className="mb-10 flex flex-col gap-4 border border-[#d8d3c7] bg-white p-5"
          >
            <label className={labelClass}>
              Display name
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Bio
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
                className="mt-1 w-full border border-[#c8c2b6] bg-white px-3 py-2 text-sm text-[#18181b] outline-none focus:border-[#7c3aed]"
              />
            </label>
            <label className={labelClass}>
              Avatar URL
              <input
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                className={inputClass}
              />
            </label>
            {saveError && (
              <p className="border border-[#fca5a5] bg-[#fef2f2] px-3 py-2 text-sm text-[#b91c1c]">
                {saveError}
              </p>
            )}
            <button
              type="submit"
              disabled={saving}
              className="self-start h-10 bg-[#7c3aed] px-4 text-sm font-semibold text-white hover:bg-[#6d28d9] disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </form>
        )}

        <ChangePasswordSection />

        <section>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#71717a]">
            My drawings
          </p>
          <h2 className="mt-1 mb-4 text-xl font-semibold text-[#18181b]">
            History by date
          </h2>
          {history.length === 0 ? (
            <p className="border border-dashed border-[#d8d3c7] bg-white px-5 py-8 text-center text-sm text-[#71717a]">
              You have not uploaded any drawings yet. Start with today&apos;s prompt.
            </p>
          ) : (
            <div className="flex flex-col gap-8">
              {history.map((day) => (
                <div key={day.date}>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#71717a]">
                    {day.date}
                  </h3>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {day.submissions.map((s) => (
                      <figure
                        key={s.submission_id}
                        className="overflow-hidden border border-[#d8d3c7] bg-white"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={s.image_url}
                          alt={s.topic_title}
                          className="aspect-square w-full object-cover"
                        />
                        <figcaption className="px-2 py-1 text-xs text-[#52525b]">
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
