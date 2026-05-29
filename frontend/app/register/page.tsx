"use client";

import { useEffect, useMemo, useState, FormEvent } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api";
import type { Organization } from "@/lib/types";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TODAY_ISO = new Date().toISOString().slice(0, 10);
const CURRENT_YEAR = new Date().getFullYear();
const birthMonthOptions = [
  { value: "01", label: "January" },
  { value: "02", label: "February" },
  { value: "03", label: "March" },
  { value: "04", label: "April" },
  { value: "05", label: "May" },
  { value: "06", label: "June" },
  { value: "07", label: "July" },
  { value: "08", label: "August" },
  { value: "09", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];
const birthYearOptions = Array.from({ length: 121 }, (_, i) =>
  String(CURRENT_YEAR - i),
);

function daysInMonth(year: string, month: string) {
  if (!year || !month) return 31;
  return new Date(Number(year), Number(month), 0).getDate();
}

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

const inputClass =
  "mt-1 h-10 w-full border border-[#c8c2b6] bg-white px-3 text-sm text-[#18181b] outline-none focus:border-[#7c3aed]";
const labelClass = "text-sm font-medium text-[#3f3f46]";
const errorClass = "mt-1 block text-xs font-medium text-[#b91c1c]";
const hintClass = "mt-1 block text-xs text-[#71717a]";

export default function RegisterPage() {
  const { register } = useAuth();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [birthYear, setBirthYear] = useState("");
  const [birthMonth, setBirthMonth] = useState("");
  const [birthDay, setBirthDay] = useState("");
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

  const birthDate = useMemo(
    () =>
      birthYear && birthMonth && birthDay
        ? `${birthYear}-${birthMonth}-${birthDay}`
        : "",
    [birthYear, birthMonth, birthDay],
  );
  const birthDateStarted = Boolean(birthYear || birthMonth || birthDay);
  const birthDateComplete = Boolean(birthYear && birthMonth && birthDay);
  const birthMaxDay = daysInMonth(birthYear, birthMonth);
  const age = useMemo(() => ageFromBirthDate(birthDate), [birthDate]);

  const matchingOrgs = useMemo(
    () => (age === null ? [] : orgs.filter((o) => orgMatchesAge(o, age))),
    [orgs, age]
  );

  const effectiveOrgId = touched.organization
    ? organizationId
    : matchingOrgs[0]?.id ?? "";

  const errors = useMemo(() => {
    const e: Record<string, string> = {};
    if (touched.username && username.trim().length < 3) {
      e.username = "Minimum 3 characters";
    }
    if (touched.email && !EMAIL_RE.test(email)) {
      e.email = "Invalid email address";
    }
    if (touched.password && password.length < 8) {
      e.password = "Minimum 8 characters";
    }
    if (touched.birthDate && birthDateStarted) {
      if (!birthDateComplete) {
        e.birthDate = "Choose day, month, and year";
      } else if (birthDate > TODAY_ISO) {
        e.birthDate = "The date cannot be in the future";
      } else if (age !== null && age > 120) {
        e.birthDate = "Invalid birth date";
      }
    }
    return e;
  }, [
    touched,
    username,
    email,
    password,
    birthDateStarted,
    birthDateComplete,
    birthDate,
    age,
  ]);

  const formValid =
    username.trim().length >= 3 &&
    EMAIL_RE.test(email) &&
    password.length >= 8 &&
    (!birthDateStarted ||
      (birthDateComplete && birthDate <= TODAY_ISO && (age ?? 0) <= 120));

  useEffect(() => {
    if (birthDay && Number(birthDay) > birthMaxDay) {
      setBirthDay(String(birthMaxDay).padStart(2, "0"));
    }
  }, [birthDay, birthMaxDay]);

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
              ? `Registration succeeded, but: ${err.message}`
              : "Registration succeeded, but joining the organization failed."
          );
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
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
    <div className="bg-[#f7f5ef] py-12">
      <div className="mx-auto w-full max-w-md border border-[#d8d3c7] bg-white px-8 py-10">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#7c3aed]">
          365 DaysOfArt
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-[#18181b]">Register</h1>
        <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4">
          <label className={labelClass}>
            Username
            <input
              required
              minLength={3}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              {...field("username")}
              className={inputClass}
            />
            {errors.username && <span className={errorClass}>{errors.username}</span>}
          </label>

          <label className={labelClass}>
            Email
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              {...field("email")}
              className={inputClass}
            />
            {errors.email && <span className={errorClass}>{errors.email}</span>}
          </label>

          <label className={labelClass}>
            Password (min. 8 characters)
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              {...field("password")}
              className={inputClass}
            />
            {errors.password && <span className={errorClass}>{errors.password}</span>}
          </label>

          <label className={labelClass}>
            Display name (optional)
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className={inputClass}
            />
          </label>

          <label className={labelClass}>
            Birth date
            <div className="mt-1 grid grid-cols-[1fr_1.35fr_1fr] gap-2">
              <select
                value={birthDay}
                onBlur={() => setTouched((t) => ({ ...t, birthDate: true }))}
                onChange={(e) => setBirthDay(e.target.value)}
                className="h-10 w-full border border-[#c8c2b6] bg-white px-3 text-sm text-[#18181b] outline-none focus:border-[#7c3aed]"
              >
                <option value="">Day</option>
                {Array.from({ length: birthMaxDay }, (_, i) => {
                  const day = String(i + 1).padStart(2, "0");
                  return (
                    <option key={day} value={day}>
                      {day}
                    </option>
                  );
                })}
              </select>
              <select
                value={birthMonth}
                onBlur={() => setTouched((t) => ({ ...t, birthDate: true }))}
                onChange={(e) => setBirthMonth(e.target.value)}
                className="h-10 w-full border border-[#c8c2b6] bg-white px-3 text-sm text-[#18181b] outline-none focus:border-[#7c3aed]"
              >
                <option value="">Month</option>
                {birthMonthOptions.map((month) => (
                  <option key={month.value} value={month.value}>
                    {month.label}
                  </option>
                ))}
              </select>
              <select
                value={birthYear}
                onBlur={() => setTouched((t) => ({ ...t, birthDate: true }))}
                onChange={(e) => setBirthYear(e.target.value)}
                className="h-10 w-full border border-[#c8c2b6] bg-white px-3 text-sm text-[#18181b] outline-none focus:border-[#7c3aed]"
              >
                <option value="">Year</option>
                {birthYearOptions.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
            {age !== null && !errors.birthDate && (
              <span className={hintClass}>Age: {age}</span>
            )}
            {errors.birthDate && (
              <span className={errorClass}>{errors.birthDate}</span>
            )}
          </label>

          <label className={labelClass}>
            <span className="flex items-center justify-between">
              Age group
              {age !== null && matchingOrgs.length > 0 && !touched.organization && (
                <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#7c3aed]">
                  Auto suggestion
                </span>
              )}
            </span>
            <select
              value={effectiveOrgId}
              onChange={(e) => {
                setOrganizationId(e.target.value);
                setTouched((t) => ({ ...t, organization: true }));
              }}
              className={inputClass}
            >
              <option value="">— later —</option>
              {orgs.map((o) => {
                const compatible = age === null || orgMatchesAge(o, age);
                return (
                  <option key={o.id} value={o.id} disabled={!compatible}>
                    {o.name}
                    {o.min_age !== null || o.max_age !== null
                      ? ` (${o.min_age ?? "?"}–${o.max_age ?? "?"})`
                      : ""}
                    {!compatible ? " — not eligible" : ""}
                  </option>
                );
              })}
            </select>
            {age !== null && matchingOrgs.length === 0 && orgs.length > 0 && (
              <span className={hintClass}>
                There is no organization for this age yet. You can join one later.
              </span>
            )}
          </label>

          {error && (
            <p className="border border-[#fca5a5] bg-[#fef2f2] px-3 py-2 text-sm text-[#b91c1c]">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting || !formValid}
            className="mt-2 h-10 bg-[#7c3aed] px-4 text-sm font-semibold text-white hover:bg-[#6d28d9] disabled:opacity-60"
          >
            {submitting ? "Creating…" : "Create account"}
          </button>
        </form>
        <p className="mt-6 text-sm text-[#52525b]">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-[#7c3aed] hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
