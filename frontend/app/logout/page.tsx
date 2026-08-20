"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { clearAuth } from "@/lib/auth";

export default function LogoutPage() {
  const router = useRouter();

  useEffect(() => {
    clearAuth();
    const timer = setTimeout(() => {
      router.replace("/login");
    }, 500);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-50 px-4">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -top-48 left-1/2 h-96 w-[40rem] -translate-x-1/2 rounded-full bg-emerald-200/40 blur-3xl" />
      </div>

      <div className="relative flex flex-col items-center text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-600 text-lg font-black text-white shadow-lg shadow-emerald-600/25">
          PB
        </span>

        <svg
          viewBox="0 0 24 24"
          fill="none"
          className="mt-8 h-6 w-6 animate-spin text-emerald-600"
          aria-hidden
        >
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
          <path fill="currentColor" className="opacity-75" d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z" />
        </svg>

        <p className="mt-5 text-sm font-semibold text-slate-800">Signing you out…</p>
        <p className="mt-1 text-sm text-slate-500">
          Clearing your session and returning you to the login page.
        </p>
      </div>
    </main>
  );
}