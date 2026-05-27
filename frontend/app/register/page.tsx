"use client";

import { useEffect, useMemo, useState, FormEvent } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api";
import type { Organization } from "@/lib/types";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TODAY_ISO = new Date().toISOString().slice(0, 10);

function ageFromBirthDate(birthDate: string): number | null {
  if (!birthDate) return null;
  const bd = new Date(birthDate);
  if (Number.isNaN(bd.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - bd.getFullYear();
  const m = today.getMonth() - bd.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < bd.getDate())) age--;
  return age;
}

function orgMatchesAge(org: Organization, age: number) {
  if (org.min_age !== null && age < org.min_age) return false;
  if (org.max_age !== null && age > org.max_age) return false;
  return true;
}

export default function RegisterPage() {
  const { register } = useAuth();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [organizationId, setOrganizationId] = useState("");
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  useEffect(() => {
    apiFetch<{ organizations: Organization[] }>("/api/organizations", {
      auth: false,
    })
      .then((data) => setOrgs(data.organizations))
      .catch(() => setOrgs([]));
  }, []);

  const age = useMemo(() => ageFromBirthDate(birthDate), [birthDate]);

  const matchingOrgs = useMemo(
    () => (age === null ? [] : orgs.filter((o) => orgMatchesAge(o, age))),
    [orgs, age]
  );

  // The auto-suggested org is derived from the birth date. Once the user
  // explicitly picks one, their choice takes precedence — no effects needed.
  const effectiveOrgId = touched.organization
    ? organizationId
    : matchingOrgs[0]?.id ?? "";

  const errors = useMemo(() => {
    const e: Record<string, string> = {};
    if (touched.username && username.trim().length < 3) {
      e.username = "Минимум 3 символа";
    }
    if (touched.email && !EMAIL_RE.test(email)) {
      e.email = "Невалиден имейл адрес";
    }
    if (touched.password && password.length < 8) {
      e.password = "Минимум 8 символа";
    }
    if (touched.birthDate && birthDate) {
      if (birthDate > TODAY_ISO) {
        e.birthDate = "Датата не може да е в бъдещето";
      } else if (age !== null && age > 120) {
        e.birthDate = "Невалидна дата на раждане";
      }
    }
    return e;
  }, [touched, username, email, password, birthDate, age]);

  const formValid =
    username.trim().length >= 3 &&
    EMAIL_RE.test(email) &&
    password.length >= 8 &&
    (!birthDate || (birthDate <= TODAY_ISO && (age ?? 0) <= 120));

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setTouched({ username: true, email: true, password: true, birthDate: true });
    setError(null);
    if (!formValid) return;

    setSubmitting(true);
    try {
      await register({
        username,
        email,
        password,
        display_name: displayName || undefined,
        birth_date: birthDate || undefined,
      });
      if (effectiveOrgId) {
        try {
          await apiFetch(`/api/organizations/${effectiveOrgId}/join`, {
            method: "POST",
          });
        } catch (err) {
          setError(
            err instanceof Error
              ? `Регистрацията успешна, но: ${err.message}`
              : "Регистрацията успешна, но присъединяването не успя."
          );
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Грешка при регистрация");
    } finally {
      setSubmitting(false);
    }
  }

  function field(name: string) {
    return {
      onBlur: () => setTouched((t) => ({ ...t, [name]: true })),
    };
  }

  return (
    <div className="mx-auto max-w-md px-6 py-12">
      <h1 className="mb-6 text-2xl font-semibold">Регистрация</h1>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          Потребителско име
          <input
            required
            minLength={3}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            {...field("username")}
            className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
          />
          {errors.username && (
            <span className="text-xs text-red-600">{errors.username}</span>
          )}
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Имейл
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            {...field("email")}
            className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
          />
          {errors.email && (
            <span className="text-xs text-red-600">{errors.email}</span>
          )}
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Парола (мин. 8 символа)
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            {...field("password")}
            className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
          />
          {errors.password && (
            <span className="text-xs text-red-600">{errors.password}</span>
          )}
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Име за показване (по избор)
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Дата на раждане
          <input
            type="date"
            max={TODAY_ISO}
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
            {...field("birthDate")}
            className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
          />
          {age !== null && !errors.birthDate && (
            <span className="text-xs text-zinc-500">Възраст: {age} г.</span>
          )}
          {errors.birthDate && (
            <span className="text-xs text-red-600">{errors.birthDate}</span>
          )}
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Възрастова група
          {age !== null && matchingOrgs.length > 0 && !touched.organization && (
            <span className="text-xs text-emerald-600">
              Предложена според възрастта ти
            </span>
          )}
          <select
            value={effectiveOrgId}
            onChange={(e) => {
              setOrganizationId(e.target.value);
              setTouched((t) => ({ ...t, organization: true }));
            }}
            className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
          >
            <option value="">— по-късно —</option>
            {orgs.map((o) => {
              const compatible = age === null || orgMatchesAge(o, age);
              return (
                <option key={o.id} value={o.id} disabled={!compatible}>
                  {o.name}
                  {o.min_age !== null || o.max_age !== null
                    ? ` (${o.min_age ?? "?"}–${o.max_age ?? "?"} г.)`
                    : ""}
                  {!compatible ? " — не отговаря" : ""}
                </option>
              );
            })}
          </select>
          {age !== null && matchingOrgs.length === 0 && orgs.length > 0 && (
            <span className="text-xs text-amber-600">
              Няма организация за тази възраст. Можеш да се присъединиш по-късно.
            </span>
          )}
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={submitting || !formValid}
          className="rounded bg-black px-4 py-2 text-white disabled:opacity-60 dark:bg-white dark:text-black"
        >
          {submitting ? "Създаване…" : "Създай акаунт"}
        </button>
      </form>
      <p className="mt-6 text-sm text-zinc-600 dark:text-zinc-400">
        Имаш акаунт?{" "}
        <Link href="/login" className="underline">
          Влез
        </Link>
      </p>
    </div>
  );
}
