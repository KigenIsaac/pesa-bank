"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { readAuth, type AuthSession } from "@/lib/auth";
import { fullDate } from "@/lib/format";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

type TxRow = {
  id: string;
  reference: string;
  customerName: string;
  accountNumber: string;
  type: "DEPOSIT" | "WITHDRAWAL" | "TRANSFER";
  amount: number;
  currency: string;
  note?: string;
  createdAt: string;
};

export default function TellerTransactionsPage() {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [items, setItems] = useState<TxRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<TxRow["type"] | "ALL">("ALL");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [receipt, setReceipt] = useState<TxRow | null>(null);

  const load = useCallback(async (current: AuthSession) => {
    setLoading(true);
    setError("");

    try {
      const url = new URL(`${API_URL}/api/teller/transactions`);
      url.searchParams.set("date", date);
      if (filter !== "ALL") url.searchParams.set("type", filter);

      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${current.token}` },
      });
      if (!res.ok) throw new Error("Couldn't load your transactions.");
      const data = await res.json();
      setItems(Array.isArray(data) ? data : data.items ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }, [date, filter]);

  useEffect(() => {
    const current = readAuth();
    if (!current) return;
    setSession(current);
    load(current);
  }, [load]);

  const totals = useMemo(() => {
    let deposits = 0;
    let withdrawals = 0;
    let transfers = 0;
    for (const t of items) {
      if (t.type === "DEPOSIT") deposits += t.amount;
      else if (t.type === "WITHDRAWAL") withdrawals += t.amount;
      else transfers += t.amount;
    }
    return { deposits, withdrawals, transfers };
  }, [items]);

  if (!session) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Transactions</h1>
        <p className="mt-1 text-sm text-slate-500">
          Your transactions for the selected date.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
        />

        <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1">
          {(["ALL", "DEPOSIT", "WITHDRAWAL", "TRANSFER"] as const).map((key) => {
            const active = filter === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  active ? "bg-emerald-50 text-emerald-800" : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                {key === "ALL" ? "All" : key.charAt(0) + key.slice(1).toLowerCase()}
              </button>
            );
          })}
        </div>
      </div>

      {/* Totals */}
      <div className="grid gap-4 sm:grid-cols-3">
        <TotalCard label="Deposits" value={totals.deposits} />
        <TotalCard label="Withdrawals" value={totals.withdrawals} />
        <TotalCard label="Transfers" value={totals.transfers} />
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <ul className="divide-y divide-slate-100">
            {[0, 1, 2, 3].map((i) => (
              <li key={i} className="animate-pulse px-5 py-4">
                <div className="h-3.5 w-1/3 rounded bg-slate-100" />
                <div className="mt-2 h-3 w-1/2 rounded bg-slate-100" />
              </li>
            ))}
          </ul>
        ) : items.length === 0 ? (
          <p className="px-6 py-16 text-center text-sm text-slate-500">
            No transactions for this date.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {items.map((t) => {
              const negative = t.type === "WITHDRAWAL" || t.type === "TRANSFER";
              return (
                <li key={t.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {t.customerName}
                    </p>
                    <p className="mt-0.5 font-mono text-xs text-slate-500">
                      {t.reference} · {t.accountNumber}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {fullDate(t.createdAt)}
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
                  <button
                    type="button"
                    onClick={() => setReceipt(t)}
                    className="shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Receipt
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {receipt ? <ReceiptModal tx={receipt} onClose={() => setReceipt(null)} /> : null}
    </div>
  );
}

function TotalCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-2 text-xl font-bold text-slate-900">KES {value.toLocaleString()}</p>
    </div>
  );
}

function ReceiptModal({ tx, onClose }: { tx: TxRow; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-4 sm:items-center">
      <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="border-b border-slate-100 px-5 py-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">Transaction receipt</h3>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
              aria-label="Close"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.8}
                className="h-4 w-4"
                aria-hidden
              >
                <path d="M6 6l12 12M18 6 6 18" />
              </svg>
            </button>
          </div>
        </div>

        <div className="px-5 py-5">
          <div className="text-center">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Pesa Bank
            </p>
            <p className="mt-1 text-lg font-bold text-slate-900">
              {tx.currency} {tx.amount.toLocaleString()}
            </p>
            <p className="mt-1 text-xs text-slate-500">{fullDate(tx.createdAt)}</p>
          </div>

          <dl className="mt-5 space-y-3 border-t border-slate-100 pt-5 text-sm">
            <Row label="Reference" value={tx.reference} mono />
            <Row label="Type" value={tx.type} />
            <Row label="Customer" value={tx.customerName} />
            <Row label="Account" value={tx.accountNumber} mono />
            {tx.note ? <Row label="Note" value={tx.note} /> : null}
          </dl>
        </div>

        <div className="border-t border-slate-100 bg-slate-50 px-5 py-4">
          <button
            type="button"
            onClick={() => window.print()}
            className="w-full rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500"
          >
            Print receipt
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-slate-500">{label}</dt>
      <dd className={`text-right text-slate-900 ${mono ? "font-mono" : ""}`}>{value}</dd>
    </div>
  );
}