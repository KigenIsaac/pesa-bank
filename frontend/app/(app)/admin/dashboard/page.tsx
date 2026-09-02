"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { readAuth, type AuthSession } from "@/lib/auth";
import { timeAgo } from "@/lib/format";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

type DashboardStats = {
  totalCustomers: number;
  activeAccounts: number;
  pendingKyc: number;
  pendingReversals: number;
  todayDeposits: number;
  todayWithdrawals: number;
  totalBalance: number;
  activeTellers: number;
};

type ActivityItem = {
  id: string;
  type: "KYC" | "TRANSACTION" | "REVERSAL" | "USER";
  title: string;
  detail: string;
  createdAt: string;
  href?: string;
};

export default function AdminDashboardPage() {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const current = readAuth();
    if (!current) return;
    setSession(current);

    let cancelled = false;
    setLoading(true);

    Promise.all([
      fetch(`${API_URL}/api/admin/dashboard/stats`, {
        headers: { Authorization: `Bearer ${current.token}` },
      }).then((r) => (r.ok ? r.json() : null)),
      fetch(`${API_URL}/api/admin/dashboard/activity`, {
        headers: { Authorization: `Bearer ${current.token}` },
      }).then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([s, a]) => {
        if (cancelled) return;
        if (s) setStats(s);
        setActivity(Array.isArray(a) ? a : a.items ?? []);
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't load dashboard data.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (!session) return null;

  const cards = stats
    ? [
        { label: "Total customers", value: stats.totalCustomers, icon: "users", href: "/admin/users" },
        { label: "Active accounts", value: stats.activeAccounts, icon: "wallet", href: "/admin/accounts" },
        { label: "Pending KYC", value: stats.pendingKyc, icon: "shield", href: "/admin/kyc", highlight: stats.pendingKyc > 0 },
        { label: "Pending reversals", value: stats.pendingReversals, icon: "rotate", href: "/admin/reversals", highlight: stats.pendingReversals > 0 },
      ]
    : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Admin dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">
            Overview of bank operations and pending work.
          </p>
        </div>
        <Link
          href="/admin/reports"
          className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          View reports
        </Link>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {loading
          ? [0, 1, 2, 3].map((i) => <StatSkeleton key={i} />)
          : cards.map((c) => (
              <Link
                key={c.label}
                href={c.href}
                className={`rounded-2xl border bg-white p-5 shadow-sm transition hover:shadow-md ${
                  c.highlight ? "border-amber-300" : "border-slate-200"
                }`}
              >
                <div className="flex items-start justify-between">
                  <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    {c.label}
                  </span>
                  {c.highlight ? (
                    <span className="h-2 w-2 rounded-full bg-amber-500" />
                  ) : null}
                </div>
                <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
                  {c.value.toLocaleString()}
                </p>
              </Link>
            ))}
      </div>

      {/* Financial summary */}
      {stats ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Today's deposits
            </p>
            <p className="mt-2 text-2xl font-bold text-emerald-700">
              KES {stats.todayDeposits.toLocaleString()}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Today's withdrawals
            </p>
            <p className="mt-2 text-2xl font-bold text-slate-900">
              KES {stats.todayWithdrawals.toLocaleString()}
            </p>
          </div>
        </div>
      ) : null}

      {/* Recent activity */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-base font-semibold text-slate-900">Recent activity</h2>
        </div>
        {loading ? (
          <ul className="divide-y divide-slate-100">
            {[0, 1, 2, 3].map((i) => (
              <li key={i} className="animate-pulse px-5 py-4">
                <div className="h-3.5 w-1/3 rounded bg-slate-100" />
                <div className="mt-2 h-3 w-2/3 rounded bg-slate-100" />
              </li>
            ))}
          </ul>
        ) : activity.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-slate-500">
            No recent activity.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {activity.slice(0, 8).map((a) => {
              const content = (
                <>
                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-800">{a.title}</p>
                    <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">{a.detail}</p>
                  </div>
                  <span className="shrink-0 text-xs text-slate-400">{timeAgo(a.createdAt)}</span>
                </>
              );

              return (
                <li key={a.id}>
                  {a.href ? (
                    <Link
                      href={a.href}
                      className="flex items-start gap-3 px-5 py-4 transition hover:bg-slate-50"
                    >
                      {content}
                    </Link>
                  ) : (
                    <div className="flex items-start gap-3 px-5 py-4">{content}</div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function StatSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="h-3 w-1/2 rounded bg-slate-100" />
      <div className="mt-3 h-8 w-1/3 rounded bg-slate-100" />
    </div>
  );
}