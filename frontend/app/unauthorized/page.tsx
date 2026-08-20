"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { readAuth, roleToPath, type AuthSession } from "@/lib/auth";

export default function UnauthorizedPage() {
  const router = useRouter();
  const [session, setSession] = useState<AuthSession | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setSession(readAuth());
    setReady(true);
  }, []);

  const homeHref = session ? roleToPath(session.role) : "/login";

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-50 px-4 py-12">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -top-48 left-1/2 h-96 w-[40rem] -translate-x-1/2 rounded-full bg-emerald-200/40 blur-3xl" />
        <div className="absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-emerald-100/70 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="flex flex-col items-center text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-600 text-lg font-black text-white shadow-lg shadow-emerald-600/25">
            PB
          </span>

          <div className="mt-8 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.6}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-7 w-7"
              aria-hidden
            >
              <rect x="4.5" y="10" width="15" height="10.5" rx="2" />
              <path d="M8 10V7.5a4 4 0 0 1 8 0V10" />
              <path d="M12 14.5v2" />
            </svg>
          </div>

          <span className="mt-5 inline-flex items-center rounded-full bg-red-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-red-700">
            403 · Access denied
          </span>

          <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">
            You don&apos;t have access to this page
          </h1>
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-slate-500">
            Your account doesn&apos;t have permission to view this section. If you think
            this is a mistake, contact your administrator or our support team.
          </p>
        </div>

        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-900/5">
          <div className="flex flex-col gap-3">
            {ready && session ? (
              <Link
                href={homeHref}
                className="flex w-full items-center justify-center rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/25"
              >
                Go to my dashboard
              </Link>
            ) : (
              <Link
                href="/login"
                className="flex w-full items-center justify-center rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/25"
              >
                Sign in
              </Link>
            )}

            <Link
              href="/support"
              className="flex w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-slate-200"
            >
              Contact support
            </Link>

            {ready && session ? (
              <button
                type="button"
                onClick={() => router.back()}
                className="text-xs font-medium text-slate-500 transition hover:text-slate-800"
              >
                Go back to the previous page
              </button>
            ) : null}
          </div>
        </div>

        <p className="mt-6 text-center text-xs leading-relaxed text-slate-400">
          Pesa Bank · Access is logged for security and audit purposes.
        </p>
      </div>
    </main>
  );
}