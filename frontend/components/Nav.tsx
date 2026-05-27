"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";

export function Nav() {
  const { user, logout } = useAuth();

  return (
    <nav className="flex items-center justify-between border-b border-zinc-200 px-6 py-3 dark:border-zinc-800">
      <Link href="/" className="text-lg font-semibold">
        365 DaysOfArt
      </Link>
      <div className="flex items-center gap-4 text-sm">
        {user ? (
          <>
            <Link href="/profile" className="hover:underline">
              Профил
            </Link>
            <Link href="/organizations" className="hover:underline">
              Организации
            </Link>
            <span className="text-zinc-500">{user.display_name || user.username}</span>
            {user.role === "admin" && (
              <span className="rounded bg-amber-200 px-2 py-0.5 text-xs font-medium text-amber-900 dark:bg-amber-700 dark:text-amber-100">
                admin
              </span>
            )}
            <button
              onClick={() => logout()}
              className="rounded border border-zinc-300 px-3 py-1 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
            >
              Изход
            </button>
          </>
        ) : (
          <>
            <Link href="/login" className="hover:underline">
              Вход
            </Link>
            <Link
              href="/register"
              className="rounded bg-black px-3 py-1 text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
            >
              Регистрация
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
