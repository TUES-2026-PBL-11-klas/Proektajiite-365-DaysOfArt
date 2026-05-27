"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

const features = [
  {
    title: "Дневна тема",
    desc: "Всеки ден получаваш нова тема — рисувай директно в платформата или качи готова рисунка.",
  },
  {
    title: "Общност",
    desc: "Виж какво са нарисували всички останали за деня. Открий таланти от твоята организация.",
  },
  {
    title: "Препоръки",
    desc: "Персонализирана галерия с рисунки и художници, подходящи точно за теб.",
  },
];

export default function LandingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  // Redirect authenticated users directly to the dashboard.
  useEffect(() => {
    if (!loading && user) router.replace("/dashboard");
  }, [loading, user, router]);

  if (loading || user) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-[#f7f5ef]">
        <p className="text-sm text-[#71717a]">Зареждане…</p>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-65px)] bg-[#f7f5ef]">

      {/* ── Hero ── */}
      <section className="mx-auto flex max-w-7xl flex-col items-center px-4 pt-24 pb-20 text-center sm:px-6 lg:px-8">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#7c3aed]">
          365 DaysOfArt
        </p>
        <h1 className="mt-4 text-5xl font-semibold leading-tight text-[#18181b] sm:text-6xl">
          Рисувай всеки ден.
          <br />
          <span className="text-[#7c3aed]">Споделяй с общността.</span>
        </h1>
        <p className="mt-6 max-w-xl text-lg leading-7 text-[#52525b]">
          Платформа за ежедневно рисуване — получи тема, нарисувай нещо красиво
          и виж как другите интерпретират същата идея.
        </p>

        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <Link
            href="/register"
            className="h-12 bg-[#7c3aed] px-8 text-sm font-semibold text-white flex items-center hover:bg-[#6d28d9] transition-colors"
          >
            Регистрирай се безплатно
          </Link>
          <Link
            href="/login"
            className="h-12 border border-[#18181b] bg-white px-8 text-sm font-semibold text-[#18181b] flex items-center hover:border-[#7c3aed] hover:text-[#7c3aed] transition-colors"
          >
            Влез в акаунта си
          </Link>
        </div>
      </section>

      {/* ── Divider ── */}
      <div className="border-t border-[#d8d3c7]" />

      {/* ── Features ── */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#71717a]">
          Какво предлага платформата
        </p>
        <h2 className="mt-2 text-3xl font-semibold text-[#18181b]">
          Всичко, от което се нуждаеш
        </h2>

        <ul className="mt-10 grid gap-6 sm:grid-cols-3">
          {features.map((f) => (
            <li
              key={f.title}
              className="border border-[#d8d3c7] bg-white px-6 py-6"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#7c3aed]">
                {f.title}
              </p>
              <p className="mt-3 text-sm leading-6 text-[#52525b]">{f.desc}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* ── Bottom CTA ── */}
      <div className="border-t border-[#d8d3c7]">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-5 px-4 py-16 text-center sm:px-6 lg:px-8">
          <h2 className="text-2xl font-semibold text-[#18181b]">
            Готов да започнеш?
          </h2>
          <Link
            href="/register"
            className="h-12 bg-[#18181b] px-8 text-sm font-semibold text-white flex items-center hover:bg-[#27272a] transition-colors"
          >
            Създай акаунт
          </Link>
        </div>
      </div>
    </div>
  );
}
