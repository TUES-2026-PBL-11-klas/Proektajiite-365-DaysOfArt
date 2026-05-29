"use client";

import { useState, FormEvent } from "react";
import { apiFetch } from "@/lib/api";

const inputClass =
  "mt-1 h-10 w-full border border-[#c8c2b6] bg-white px-3 text-sm text-[#18181b] outline-none focus:border-[#7c3aed]";
const labelClass = "text-sm font-medium text-[#3f3f46]";

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
      setError("The new password must be at least 8 characters.");
      return;
    }
    if (next !== confirm) {
      setError("The new password and confirmation do not match.");
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
      setError(err instanceof Error ? err.message : "Password change failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mb-10 border border-[#d8d3c7] bg-white p-5">
      <button
        onClick={() => {
          reset();
          setOpen((v) => !v);
        }}
        className="text-left text-xs font-semibold uppercase tracking-[0.14em] text-[#7c3aed] hover:text-[#6d28d9]"
      >
        {open ? "Hide password change" : "Change password"}
      </button>
      {open && (
        <form onSubmit={onSubmit} className="mt-5 flex flex-col gap-4">
          <label className={labelClass}>
            Current password
            <input
              type="password"
              required
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            New password (min. 8 characters)
            <input
              type="password"
              required
              minLength={8}
              value={next}
              onChange={(e) => setNext(e.target.value)}
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            Confirm new password
            <input
              type="password"
              required
              minLength={8}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className={inputClass}
            />
          </label>
          {error && (
            <p className="border border-[#fca5a5] bg-[#fef2f2] px-3 py-2 text-sm text-[#b91c1c]">
              {error}
            </p>
          )}
          {success && (
            <p className="border border-[#a7f3d0] bg-[#ecfdf5] px-3 py-2 text-sm text-[#047857]">
              Password changed successfully.
            </p>
          )}
          <button
            type="submit"
            disabled={saving}
            className="self-start h-10 bg-[#7c3aed] px-4 text-sm font-semibold text-white hover:bg-[#6d28d9] disabled:opacity-60"
          >
            {saving ? "Saving…" : "Change password"}
          </button>
        </form>
      )}
    </section>
  );
}
