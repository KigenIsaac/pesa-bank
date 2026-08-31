"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { readAuth, type AuthSession } from "@/lib/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

type Account = {
  id: string;
  accountNumber: string;
  type: "SAVINGS" | "CURRENT" | "FIXED_DEPOSIT";
  balance: number;
  currency: string;
  status: "ACTIVE" | "FROZEN" | "CLOSED";
  openedAt: string;
};

const STATUS_STYLES: Record<Account["status"], string> = {
  ACTIVE: "bg-emerald-50 text-emerald-700",
  FROZEN: "bg-amber-50 text-amber-700",
  CLOSED: "bg-slate-100 text-slate-600",
};

export default function CustomerAccountsPage() {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async (current: AuthSession) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/api/customer/accounts`, {
        headers: { Authorization: `Bearer ${current.token}` },
      });
      if (!res.ok) throw new Error("Couldn't load your accounts.");
      const data = await res.json();
      setAccounts(Array.isArray(data) ? data : data.items ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const current = readAuth();
    if (!current) return;
    setSession(current);
    load(current);
  }, [load]);

  if (!session) return null;

  const total = accounts.reduce((sum, a) => sum + a.balance, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Accounts</h1>
        <p className="mt-1 text-sm text-slate-500">
          All your Pesa Bank accounts in one place.
        </p>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="h-40 animate-pulse rounded-2xl bg-slate-100" />
      ) : accounts.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <p className="text-sm font-semibold text-slate-800">No accounts yet</p>
          <p className="mt-1 text-sm text-slate-500">
            Visit a branch to open your first account.
          </p>
        </div>
      ) : (
        <>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Total across accounts
            </p>
            <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
              KES {total.toLocaleString()}
            </p>
          </div>

          <ul className="space-y-3">
            {accounts.map((a) => (
              <li key={a.id}>
                <Link
                  href={`/customer/accounts/${a.id}`}
                  className="block rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-emerald-300 hover:shadow-md"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-mono text-sm font-semibold text-slate-900">
                        {a.accountNumber}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {a.type.replace("_", " ").toLowerCase()}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${STATUS_STYLES[a.status]}`}
                    >
                      {a.status}
                    </span>
                  </div>

                  <div className="mt-4 border-t border-slate-100 pt-4">
                    <p className="text-xs text-slate-400">Balance</p>
                    <p className="mt-1 text-xl font-bold text-slate-900">
                      {a.currency} {a.balance.toLocaleString()}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}