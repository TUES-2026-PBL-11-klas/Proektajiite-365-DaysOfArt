"use client";

import { useState, FormEvent } from "react";
import { apiFetch } from "@/lib/api";

export function ChangePasswordSection() {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  function reset() {
    setCurrent("");
    setNext("");
    setConfirm("");
    setError(null);
    setSuccess(false);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    if (next.length < 8) {
      setError("Новата парола трябва да е поне 8 символа.");
      return;
    }
    if (next !== confirm) {
      setError("Новата парола и потвърждението не съвпадат.");
      return;
    }
    setSaving(true);
    try {
      await apiFetch("/api/auth/change-password", {
        method: "POST",
        body: { current_password: current, new_password: next },
      });
      setSuccess(true);
      setCurrent("");
      setNext("");
      setConfirm("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Грешка при смяна на паролата");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mb-10 rounded border border-zinc-200 p-4 dark:border-zinc-800">
      <button
        onClick={() => {
          reset();
          setOpen((v) => !v);
        }}
        className="text-left text-sm font-medium underline"
      >
        {open ? "Скрий смяна на парола" : "Смяна на парола"}
      </button>
      {open && (
        <form onSubmit={onSubmit} className="mt-4 flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm">
            Текуща парола
            <input
              type="password"
              required
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Нова парола (мин. 8 символа)
            <input
              type="password"
              required
              minLength={8}
              value={next}
              onChange={(e) => setNext(e.target.value)}
              className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Повтори новата парола
            <input
              type="password"
              required
              minLength={8}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
            />
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
          {success && (
            <p className="text-sm text-emerald-600">Паролата е сменена успешно.</p>
          )}
          <button
            type="submit"
            disabled={saving}
            className="self-start rounded bg-black px-4 py-2 text-white disabled:opacity-60 dark:bg-white dark:text-black"
          >
            {saving ? "Запис…" : "Смени паролата"}
          </button>
        </form>
      )}
    </section>
  );
}
