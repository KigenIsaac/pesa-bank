"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { readAuth, type AuthSession } from "@/lib/auth";
import { timeAgo } from "@/lib/format";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

type AccountRow = {
  id: string;
  accountNumber: string;
  holderName: string;
  type: "SAVINGS" | "CURRENT" | "FIXED_DEPOSIT";
  balance: number;
  currency: string;
  status: "ACTIVE" | "FROZEN" | "CLOSED";
  openedAt: string;
};

const STATUS_STYLES: Record<AccountRow["status"], string> = {
  ACTIVE: "bg-emerald-50 text-emerald-700",
  FROZEN: "bg-amber-50 text-amber-700",
  CLOSED: "bg-slate-100 text-slate-600",
};

export default function AdminAccountsPage() {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState<AccountRow["status"] | "ALL">("ALL");
  const [query, setQuery] = useState("");

  const load = useCallback(async (current: AuthSession) => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${API_URL}/api/admin/accounts`, {
        headers: { Authorization: `Bearer ${current.token}` },
      });
      if (!res.ok) throw new Error("Couldn't load accounts.");
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

  const filtered = useMemo(() => {
    return accounts.filter((a) => {
      if (statusFilter !== "ALL" && a.status !== statusFilter) return false;
      if (!query.trim()) return true;
      const q = query.toLowerCase();
      return (
        a.accountNumber.toLowerCase().includes(q) ||
        a.holderName.toLowerCase().includes(q)
      );
    });
  }, [accounts, statusFilter, query]);

  if (!session) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Accounts</h1>
        <p className="mt-1 text-sm text-slate-500">
          Monitor and manage all bank accounts.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1">
          {(["ALL", "ACTIVE", "FROZEN", "CLOSED"] as const).map((key) => {
            const active = statusFilter === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setStatusFilter(key)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  active ? "bg-emerald-50 text-emerald-800" : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                {key === "ALL" ? "All" : key.charAt(0) + key.slice(1).toLowerCase()}
              </button>
            );
          })}
        </div>

        <div className="relative ml-auto w-full sm:w-72">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search account or holder"
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
          />
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <ul className="divide-y divide-slate-100">
            {[0, 1, 2, 3].map((i) => (
              <li key={i} className="animate-pulse px-5 py-4">
                <div className="h-3.5 w-1/4 rounded bg-slate-100" />
                <div className="mt-2 h-3 w-1/2 rounded bg-slate-100" />
              </li>
            ))}
          </ul>
        ) : filtered.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <p className="text-sm font-semibold text-slate-800">No accounts found</p>
            <p className="mt-1 text-sm text-slate-500">Try adjusting your filters.</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {filtered.map((a) => (
              <li key={a.id}>
                <Link
                  href={`/admin/accounts/${a.id}`}
                  className="flex flex-wrap items-center gap-4 px-5 py-4 transition hover:bg-slate-50"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-mono text-sm font-semibold text-slate-900">
                        {a.accountNumber}
                      </p>
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${STATUS_STYLES[a.status]}`}
                      >
                        {a.status}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {a.holderName} · {a.type.replace("_", " ")} · opened {timeAgo(a.openedAt)}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold text-slate-900">
                      {a.currency} {a.balance.toLocaleString()}
                    </p>
                  </div>
                  <span className="shrink-0 text-slate-300">›</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}