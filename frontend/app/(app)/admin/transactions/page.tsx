"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { readAuth, type AuthSession } from "@/lib/auth";
import { timeAgo } from "@/lib/format";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

type TxRow = {
  id: string;
  reference: string;
  accountNumber: string;
  holderName: string;
  type: "DEPOSIT" | "WITHDRAWAL" | "TRANSFER";
  amount: number;
  currency: string;
  status: "COMPLETED" | "PENDING" | "REVERSED" | "FAILED";
  createdAt: string;
};

const STATUS_STYLES: Record<TxRow["status"], string> = {
  COMPLETED: "bg-emerald-50 text-emerald-700",
  PENDING: "bg-amber-50 text-amber-700",
  REVERSED: "bg-slate-100 text-slate-600",
  FAILED: "bg-red-50 text-red-700",
};

export default function AdminTransactionsPage() {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [items, setItems] = useState<TxRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState<TxRow["status"] | "ALL">("ALL");
  const [query, setQuery] = useState("");

  const load = useCallback(async (current: AuthSession) => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${API_URL}/api/admin/transactions?limit=100`, {
        headers: { Authorization: `Bearer ${current.token}` },
      });
      if (!res.ok) throw new Error("Couldn't load transactions.");
      const data = await res.json();
      setItems(Array.isArray(data) ? data : data.items ?? []);
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
    return items.filter((t) => {
      if (statusFilter !== "ALL" && t.status !== statusFilter) return false;
      if (!query.trim()) return true;
      const q = query.toLowerCase();
      return (
        t.reference.toLowerCase().includes(q) ||
        t.accountNumber.toLowerCase().includes(q) ||
        t.holderName.toLowerCase().includes(q)
      );
    });
  }, [items, statusFilter, query]);

  if (!session) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Transactions</h1>
        <p className="mt-1 text-sm text-slate-500">
          Monitor all bank transactions across accounts.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1">
          {(["ALL", "COMPLETED", "PENDING", "REVERSED", "FAILED"] as const).map((key) => {
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
            placeholder="Search reference, account, or holder"
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
            {[0, 1, 2, 3, 4].map((i) => (
              <li key={i} className="animate-pulse px-5 py-4">
                <div className="h-3.5 w-1/3 rounded bg-slate-100" />
                <div className="mt-2 h-3 w-1/2 rounded bg-slate-100" />
              </li>
            ))}
          </ul>
        ) : filtered.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <p className="text-sm font-semibold text-slate-800">No transactions found</p>
            <p className="mt-1 text-sm text-slate-500">Try adjusting your filters.</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {filtered.map((t) => {
              const negative = t.type === "WITHDRAWAL" || t.type === "TRANSFER";
              return (
                <li key={t.id}>
                  <Link
                    href={`/admin/transactions/${t.id}`}
                    className="flex flex-wrap items-center gap-4 px-5 py-4 transition hover:bg-slate-50"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate font-mono text-xs font-semibold text-slate-700">
                          {t.reference}
                        </p>
                        <span
                          className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${STATUS_STYLES[t.status]}`}
                        >
                          {t.status}
                        </span>
                      </div>
                      <p className="mt-1 truncate text-xs text-slate-500">
                        {t.holderName} · {t.accountNumber} · {t.type.toLowerCase()} ·{" "}
                        {timeAgo(t.createdAt)}
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
                    <span className="shrink-0 text-slate-300">›</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}