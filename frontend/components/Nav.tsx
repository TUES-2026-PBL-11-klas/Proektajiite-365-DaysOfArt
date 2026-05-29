"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";

export function Nav() {
  const { user, logout } = useAuth();

  return (
    <nav className="flex items-center justify-between border-b border-[#d8d3c7] bg-[#f7f5ef] px-6 py-4">
      <Link href={user ? "/dashboard" : "/"} className="flex flex-col leading-tight">
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#7c3aed]">
          365 DaysOfArt
        </span>
        <span className="text-base font-semibold text-[#18181b]">
          {user ? "Dashboard" : "Drawing Board"}
        </span>
      </Link>

      <div className="flex items-center gap-5 text-sm text-[#3f3f46]">
        {user ? (
          <>
            <Link href="/dashboard" className="font-medium hover:text-[#7c3aed]">
              Dashboard
            </Link>
            <Link href="/profile" className="font-medium hover:text-[#7c3aed]">
              Profile
            </Link>
            <Link href="/organizations" className="font-medium hover:text-[#7c3aed]">
              Organizations
            </Link>
            <span className="text-[#71717a]">{user.display_name || user.username}</span>
            {user.role === "admin" && (
              <span className="bg-[#7c3aed] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white">
                admin
              </span>
            )}
            <button
              onClick={() => logout()}
              className="border border-[#c8c2b6] bg-white px-3 py-1 font-medium text-[#18181b] hover:border-[#7c3aed] hover:text-[#7c3aed]"
            >
              Logout
            </button>
          </>
        ) : (
          <>
            <Link href="/login" className="font-medium hover:text-[#7c3aed]">
              Login
            </Link>
            <Link
              href="/register"
              className="bg-[#7c3aed] px-4 py-2 font-semibold text-white hover:bg-[#6d28d9]"
            >
              Register
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
