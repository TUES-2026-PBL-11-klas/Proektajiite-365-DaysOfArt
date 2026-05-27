"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Грешка при вход");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="bg-[#f7f5ef] py-16">
      <div className="mx-auto w-full max-w-md border border-[#d8d3c7] bg-white px-8 py-10">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#7c3aed]">
          365 DaysOfArt
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-[#18181b]">Вход</h1>
        <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4">
          <label className="text-sm font-medium text-[#3f3f46]">
            Имейл
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 h-10 w-full border border-[#c8c2b6] bg-white px-3 text-sm text-[#18181b] outline-none focus:border-[#7c3aed]"
            />
          </label>
          <label className="text-sm font-medium text-[#3f3f46]">
            Парола
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 h-10 w-full border border-[#c8c2b6] bg-white px-3 text-sm text-[#18181b] outline-none focus:border-[#7c3aed]"
            />
          </label>
          {error && (
            <p className="border border-[#fca5a5] bg-[#fef2f2] px-3 py-2 text-sm text-[#b91c1c]">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="mt-2 h-10 bg-[#7c3aed] px-4 text-sm font-semibold text-white hover:bg-[#6d28d9] disabled:opacity-60"
          >
            {submitting ? "Влизане…" : "Влез"}
          </button>
        </form>
        <p className="mt-6 text-sm text-[#52525b]">
          Нямаш акаунт?{" "}
          <Link href="/register" className="font-medium text-[#7c3aed] hover:underline">
            Регистрирай се
          </Link>
        </p>
      </div>
    </div>
  );
}
