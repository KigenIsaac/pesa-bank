"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { readAuth, type AuthSession } from "@/lib/auth";
import { timeAgo } from "@/lib/format";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

type TellerStats = {
  tillBalance: number;
  depositsToday: number;
  withdrawalsToday: number;
  transactionsToday: number;
  pendingReversals: number;
};

type RecentTx = {
  id: string;
  reference: string;
  customerName: string;
  type: "DEPOSIT" | "WITHDRAWAL" | "TRANSFER";
  amount: number;
  currency: string;
  createdAt: string;
};

export default function TellerDashboardPage() {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [stats, setStats] = useState<TellerStats | null>(null);
  const [txs, setTxs] = useState<RecentTx[]>([]);
  const [tillOpen, setTillOpen] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const current = readAuth();
    if (!current) return;
    setSession(current);

    let cancelled = false;
    setLoading(true);

    Promise.all([
      fetch(`${API_URL}/api/teller/dashboard/stats`, {
        headers: { Authorization: `Bearer ${current.token}` },
      }).then((r) => (r.ok ? r.json() : null)),
      fetch(`${API_URL}/api/teller/transactions?limit=8`, {
        headers: { Authorization: `Bearer ${current.token}` },
      }).then((r) => (r.ok ? r.json() : [])),
      fetch(`${API_URL}/api/teller/till`, {
        headers: { Authorization: `Bearer ${current.token}` },
      }).then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([s, t, till]) => {
        if (cancelled) return;
        if (s) setStats(s);
        setTxs(Array.isArray(t) ? t : t.items ?? []);
        if (till) setTillOpen(Boolean(till.isOpen));
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't load your dashboard.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (!session) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Teller dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">
            Your cash position and today&apos;s activity.
          </p>
        </div>

        {tillOpen === false ? (
          <Link
            href="/teller/till"
            className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-500"
          >
            Open till
          </Link>
        ) : tillOpen === true ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Till open
          </span>
        ) : null}
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {/* Till balance hero */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
          Cash in till
        </p>
        {loading ? (
          <div className="mt-3 h-9 w-40 animate-pulse rounded bg-slate-100" />
        ) : (
          <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
            KES {(stats?.tillBalance ?? 0).toLocaleString()}
          </p>
        )}
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Deposits today"
          value={stats ? `KES ${stats.depositsToday.toLocaleString()}` : null}
          loading={loading}
        />
        <StatCard
          label="Withdrawals today"
          value={stats ? `KES ${stats.withdrawalsToday.toLocaleString()}` : null}
          loading={loading}
        />
        <StatCard
          label="Transactions today"
          value={stats ? String(stats.transactionsToday) : null}
          loading={loading}
        />
      </div>

      {/* Quick actions */}
      <div className="grid gap-3 sm:grid-cols-3">
        <ActionCard
          href="/teller/deposit"
          title="Deposit"
          subtitle="Cash in"
          icon="down"
        />
        <ActionCard
          href="/teller/withdrawal"
          title="Withdrawal"
          subtitle="Cash out"
          icon="up"
        />
        <ActionCard
          href="/teller/customer-lookup"
          title="Customer lookup"
          subtitle="Search by ID or phone"
          icon="search"
        />
      </div>

      {/* Pending reversals alert */}
      {stats && stats.pendingReversals > 0 ? (
        <Link
          href="/teller/reversals"
          className="block rounded-2xl border border-amber-200 bg-amber-50 p-4 transition hover:bg-amber-100"
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-amber-900">
                {stats.pendingReversals} reversal request
                {stats.pendingReversals === 1 ? "" : "s"} pending
              </p>
              <p className="mt-0.5 text-xs text-amber-800">
                Waiting for admin approval.
              </p>
            </div>
            <span className="text-amber-700">›</span>
          </div>
        </Link>
      ) : null}

      {/* Recent transactions */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-900">Recent transactions</h2>
          <Link
            href="/teller/transactions"
            className="text-xs font-semibold text-emerald-700 hover:underline"
          >
            View all
          </Link>
        </div>

        {loading ? (
          <ul className="divide-y divide-slate-100">
            {[0, 1, 2].map((i) => (
              <li key={i} className="animate-pulse px-5 py-4">
                <div className="h-3.5 w-1/3 rounded bg-slate-100" />
                <div className="mt-2 h-3 w-1/2 rounded bg-slate-100" />
              </li>
            ))}
          </ul>
        ) : txs.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-slate-500">
            You haven&apos;t processed any transactions today.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {txs.map((t) => {
              const negative = t.type === "WITHDRAWAL" || t.type === "TRANSFER";
              return (
                <li key={t.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-800">
                      {t.customerName}
                    </p>
                    <p className="mt-0.5 font-mono text-xs text-slate-500">
                      {t.reference} · {timeAgo(t.createdAt)}
                    </p>
                  </div>
                  <p
                    className={`shrink-0 text-sm font-semibold ${
                      negative ? "text-slate-900" : "text-emerald-700"
                    }`}
                  >
                    {negative ? "−" : "+"}
                    {t.currency} {t.amount.toLocaleString()}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  loading,
}: {
  label: string;
  value: string | null;
  loading: boolean;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
      {loading || value === null ? (
        <div className="mt-3 h-7 w-28 animate-pulse rounded bg-slate-100" />
      ) : (
        <p className="mt-2 text-xl font-bold text-slate-900">{value}</p>
      )}
    </div>
  );
}

function ActionCard({
  href,
  title,
  subtitle,
  icon,
}: {
  href: string;
  title: string;
  subtitle: string;
  icon: "down" | "up" | "search";
}) {
  const paths: Record<string, React.ReactNode> = {
    down: (
      <>
        <path d="M12 4v14" />
        <path d="m6.5 12.5 5.5 5.5 5.5-5.5" />
      </>
    ),
    up: (
      <>
        <path d="M12 20V6" />
        <path d="m6.5 11.5 5.5-5.5 5.5 5.5" />
      </>
    ),
    search: (
      <>
        <circle cx="11" cy="11" r="6.5" />
        <path d="m16 16 4.5 4.5" />
      </>
    ),
  };

  return (
    <Link
      href={href}
      className="group flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-emerald-300 hover:shadow-md"
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.6}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-5 w-5"
          aria-hidden
        >
          {paths[icon]}
        </svg>
      </span>
      <div>
        <p className="text-sm font-semibold text-slate-900">{title}</p>
        <p className="text-xs text-slate-500">{subtitle}</p>
      </div>
    </Link>
  );
}