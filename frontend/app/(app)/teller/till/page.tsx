"use client";

import { useCallback, useEffect, useState } from "react";
import { readAuth, type AuthSession } from "@/lib/auth";
import { fullDate } from "@/lib/format";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

type TillState = {
  isOpen: boolean;
  openedAt?: string;
  openingBalance?: number;
  currency: string;
  currentBalance: number;
};

export default function TellerTillPage() {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [till, setTill] = useState<TillState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [openingBalance, setOpeningBalance] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState("");

  const load = useCallback(async (current: AuthSession) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/api/teller/till`, {
        headers: { Authorization: `Bearer ${current.token}` },
      });
      if (!res.ok) throw new Error("Couldn't load your till.");
      const data = await res.json();
      setTill(data);
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

  async function openTill(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!session) return;

    const value = Number(openingBalance.replace(/[^\d.]/g, ""));
    if (!Number.isFinite(value) || value < 0) {
      setActionError("Enter a valid opening balance.");
      return;
    }

    setActionLoading(true);
    setActionError("");

    try {
      const res = await fetch(`${API_URL}/api/teller/till/open`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.token}`,
        },
        body: JSON.stringify({ openingBalance: value }),
      });
      if (!res.ok) throw new Error("Couldn't open your till.");
      const updated = await res.json();
      setTill(updated);
      setOpeningBalance("");
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setActionLoading(false);
    }
  }

  async function closeTill() {
    if (!session) return;
    setActionLoading(true);
    setActionError("");

    try {
      const res = await fetch(`${API_URL}/api/teller/till/close`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.token}` },
      });
      if (!res.ok) throw new Error("Couldn't close your till.");
      const updated = await res.json();
      setTill(updated);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setActionLoading(false);
    }
  }

  if (!session) return null;

  const inputClass =
    "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Till</h1>
        <p className="mt-1 text-sm text-slate-500">
          Open your cash drawer at the start of your shift and close it at the end.
        </p>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : null}
      {actionError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {actionError}
        </div>
      ) : null}

      {loading ? (
        <div className="h-56 animate-pulse rounded-2xl bg-slate-100" />
      ) : !till?.isOpen ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Open till</h2>
          <p className="mt-1 text-xs text-slate-500">
            Count the cash you&apos;re starting your shift with and enter the total below.
          </p>

          <form onSubmit={openTill} className="mt-5 space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Opening balance (KES)
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={openingBalance}
                onChange={(e) => setOpeningBalance(e.target.value)}
                placeholder="e.g. 50000"
                className={inputClass}
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={actionLoading}
                className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-500 disabled:opacity-70"
              >
                {actionLoading ? "Opening…" : "Open till"}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <>
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">
                  Till open
                </p>
                <p className="mt-1 text-xs text-emerald-800">
                  Since {till.openedAt ? fullDate(till.openedAt) : "—"}
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white">
                <span className="h-1.5 w-1.5 rounded-full bg-white" />
                Active
              </span>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">
                  Opening balance
                </p>
                <p className="mt-1 text-xl font-bold text-slate-900">
                  KES {(till.openingBalance ?? 0).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">
                  Current cash
                </p>
                <p className="mt-1 text-xl font-bold text-slate-900">
                  KES {till.currentBalance.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">Close till</h2>
            <p className="mt-1 text-xs text-slate-500">
              Make sure you&apos;ve completed all transactions for the day before closing.
              The final cash count is recorded for reconciliation.
            </p>

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={closeTill}
                disabled={actionLoading}
                className="rounded-xl border border-red-200 bg-white px-5 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-70"
              >
                {actionLoading ? "Closing…" : "Close till"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}