"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { readAuth, type AuthSession } from "@/lib/auth";
import { timeAgo } from "@/lib/format";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

type Account = {
  id: string;
  accountNumber: string;
  type: "SAVINGS" | "CURRENT" | "FIXED_DEPOSIT";
  balance: number;
  currency: string;
  status: "ACTIVE" | "FROZEN" | "CLOSED";
};

type Tx = {
  id: string;
  type: "DEPOSIT" | "WITHDRAWAL" | "TRANSFER";
  amount: number;
  description: string;
  createdAt: string;
  direction: "IN" | "OUT";
};

type Summary = {
  totalBalance: number;
  currency: string;
  accountsCount: number;
};

export default function CustomerDashboardPage() {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [txs, setTxs] = useState<Tx[]>([]);
  const [kycStatus, setKycStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const current = readAuth();
    if (!current) return;
    setSession(current);

    let cancelled = false;
    setLoading(true);

    Promise.all([
      fetch(`${API_URL}/api/customer/summary`, {
        headers: { Authorization: `Bearer ${current.token}` },
      }).then((r) => (r.ok ? r.json() : null)),
      fetch(`${API_URL}/api/customer/accounts`, {
        headers: { Authorization: `Bearer ${current.token}` },
      }).then((r) => (r.ok ? r.json() : [])),
      fetch(`${API_URL}/api/customer/transactions?limit=6`, {
        headers: { Authorization: `Bearer ${current.token}` },
      }).then((r) => (r.ok ? r.json() : [])),
      fetch(`${API_URL}/api/me`, {
        headers: { Authorization: `Bearer ${current.token}` },
      }).then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([s, a, t, me]) => {
        if (cancelled) return;
        if (s) setSummary(s);
        setAccounts(Array.isArray(a) ? a : a.items ?? []);
        setTxs(Array.isArray(t) ? t : t.items ?? []);
        if (me?.kyc?.status) setKycStatus(me.kyc.status);
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

  const showKycBanner = kycStatus && kycStatus !== "APPROVED";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Welcome back
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Here&apos;s a snapshot of your accounts.
        </p>
      </div>

      {/* KYC banner */}
      {showKycBanner ? (
        <Link
          href="/kyc/status"
          className={`block rounded-2xl border p-4 transition ${
            kycStatus === "REJECTED"
              ? "border-red-200 bg-red-50 hover:bg-red-100"
              : "border-amber-200 bg-amber-50 hover:bg-amber-100"
          }`}
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <p
                className={`text-sm font-semibold ${
                  kycStatus === "REJECTED" ? "text-red-900" : "text-amber-900"
                }`}
              >
                {kycStatus === "REJECTED"
                  ? "Your KYC was rejected"
                  : kycStatus === "PENDING"
                  ? "KYC verification in progress"
                  : "Complete your KYC"}
              </p>
              <p
                className={`mt-0.5 text-xs ${
                  kycStatus === "REJECTED" ? "text-red-800" : "text-amber-800"
                }`}
              >
                {kycStatus === "REJECTED"
                  ? "Contact support to resolve this."
                  : kycStatus === "PENDING"
                  ? "We'll notify you once reviewed."
                  : "Verify your identity to unlock all features."}
              </p>
            </div>
            <span className="text-lg">›</span>
          </div>
        </Link>
      ) : null}

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {/* Balance hero */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
          Total balance
        </p>
        {loading ? (
          <div className="mt-3 h-10 w-48 animate-pulse rounded bg-slate-100" />
        ) : (
          <p className="mt-2 text-4xl font-bold tracking-tight text-slate-900">
            {summary?.currency ?? "KES"}{" "}
            {(summary?.totalBalance ?? 0).toLocaleString()}
          </p>
        )}
        <p className="mt-1 text-xs text-slate-500">
          Across {summary?.accountsCount ?? accounts.length} account
          {(summary?.accountsCount ?? accounts.length) === 1 ? "" : "s"}
        </p>
      </div>

      {/* Quick actions */}
      <div className="grid gap-3 sm:grid-cols-3">
        <ActionCard
          href="/customer/transfer"
          title="Send money"
          subtitle="To any account"
          icon="send"
        />
        <ActionCard
          href="/customer/payments"
          title="Pay a bill"
          subtitle="Utilities, airtime"
          icon="receipt"
        />
        <ActionCard
          href="/customer/statements"
          title="Statements"
          subtitle="Download PDF"
          icon="file"
        />
      </div>

      {/* Accounts */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-900">Your accounts</h2>
          <Link
            href="/customer/accounts"
            className="text-xs font-semibold text-emerald-700 hover:underline"
          >
            View all
          </Link>
        </div>

        {loading ? (
          <ul className="divide-y divide-slate-100">
            {[0, 1].map((i) => (
              <li key={i} className="animate-pulse px-5 py-4">
                <div className="h-3.5 w-1/3 rounded bg-slate-100" />
                <div className="mt-2 h-3 w-1/4 rounded bg-slate-100" />
              </li>
            ))}
          </ul>
        ) : accounts.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <p className="text-sm font-semibold text-slate-800">You don&apos;t have any accounts yet.</p>
            <p className="mt-1 text-sm text-slate-500">
              If your KYC is approved, you can open your first account now.
            </p>
            <Link
              href="/customer/accounts/open"
              className="mt-4 inline-block rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500"
            >
              Open an account
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {accounts.slice(0, 3).map((a) => (
              <li key={a.id}>
                <Link
                  href={`/customer/accounts/${a.id}`}
                  className="flex items-center gap-4 px-5 py-4 transition hover:bg-slate-50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-sm font-semibold text-slate-900">
                      {a.accountNumber}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {a.type.replace("_", " ").toLowerCase()}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-slate-900">
                    {a.currency} {a.balance.toLocaleString()}
                  </p>
                  <span className="text-slate-300">›</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Recent transactions */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-900">Recent activity</h2>
          <Link
            href="/customer/statements"
            className="text-xs font-semibold text-emerald-700 hover:underline"
          >
            View statements
          </Link>
        </div>

        {loading ? (
          <ul className="divide-y divide-slate-100">
            {[0, 1, 2].map((i) => (
              <li key={i} className="animate-pulse px-5 py-4">
                <div className="h-3.5 w-2/3 rounded bg-slate-100" />
                <div className="mt-2 h-3 w-1/3 rounded bg-slate-100" />
              </li>
            ))}
          </ul>
        ) : txs.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-slate-500">
            No transactions yet.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {txs.map((t) => (
              <li key={t.id} className="flex items-center gap-4 px-5 py-3.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-800">
                    {t.description}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">{timeAgo(t.createdAt)}</p>
                </div>
                <p
                  className={`shrink-0 text-sm font-semibold ${
                    t.direction === "IN" ? "text-emerald-700" : "text-slate-900"
                  }`}
                >
                  {t.direction === "IN" ? "+" : "−"}
                  {t.amount.toLocaleString()}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
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
  icon: "send" | "receipt" | "file";
}) {
  const paths: Record<string, React.ReactNode> = {
    send: (
      <>
        <path d="M21.5 3.5 2.5 10.5l7 2.5 2.5 7 9.5-16.5Z" />
        <path d="m9.5 13 4-4" />
      </>
    ),
    receipt: (
      <>
        <path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z" />
        <path d="M9.5 8.5h5M9.5 12.5h5" />
      </>
    ),
    file: (
      <>
        <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z" />
        <path d="M14 3v5h5" />
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