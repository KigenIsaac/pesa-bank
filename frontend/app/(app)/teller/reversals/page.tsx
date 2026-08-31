"use client";

import { useCallback, useEffect, useState } from "react";
import { readAuth, type AuthSession } from "@/lib/auth";
import { timeAgo } from "@/lib/format";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

type ReversalRequest = {
  id: string;
  transactionId: string;
  transactionReference: string;
  accountNumber: string;
  amount: number;
  currency: string;
  reason: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  requestedAt: string;
  decidedAt?: string;
  decidedBy?: string;
};

export default function TellerReversalsPage() {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [items, setItems] = useState<ReversalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // New request
  const [showNew, setShowNew] = useState(false);
  const [reference, setReference] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const load = useCallback(async (current: AuthSession) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/api/teller/reversals`, {
        headers: { Authorization: `Bearer ${current.token}` },
      });
      if (!res.ok) throw new Error("Couldn't load your reversal requests.");
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

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!session) return;

    if (!reference.trim()) {
      setFormError("Enter the transaction reference.");
      return;
    }
    if (!reason.trim() || reason.trim().length < 10) {
      setFormError("Explain why the transaction should be reversed (min 10 characters).");
      return;
    }

    setSubmitting(true);
    setFormError("");

    try {
      const res = await fetch(`${API_URL}/api/teller/reversals`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.token}`,
        },
        body: JSON.stringify({
          transactionReference: reference.trim(),
          reason: reason.trim(),
        }),
      });

      if (res.status === 404) throw new Error("Transaction not found.");
      if (!res.ok) throw new Error("Couldn't submit reversal request.");

      const created: ReversalRequest = await res.json();
      setItems((prev) => [created, ...prev]);
      setReference("");
      setReason("");
      setShowNew(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!session) return null;

  const pending = items.filter((r) => r.status === "PENDING");
  const decided = items.filter((r) => r.status !== "PENDING");

  const inputClass =
    "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Reversals</h1>
          <p className="mt-1 text-sm text-slate-500">
            Request a reversal for a wrong or duplicate transaction. Admin approval required.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowNew((v) => !v)}
          className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-500"
        >
          {showNew ? "Cancel" : "Request reversal"}
        </button>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {showNew ? (
        <form
          onSubmit={submit}
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <h2 className="text-sm font-semibold text-slate-900">New reversal request</h2>

          <div className="mt-5 space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Transaction reference
              </label>
              <input
                type="text"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="e.g. TXN-20260101-ABC123"
                className={`${inputClass} font-mono`}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Reason
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={4}
                placeholder="Explain what went wrong (wrong amount, duplicate entry, wrong account…)"
                className={inputClass}
              />
            </div>
          </div>

          {formError ? (
            <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm text-red-700">
              {formError}
            </div>
          ) : null}

          <div className="mt-6 flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-500 disabled:opacity-70"
            >
              {submitting ? "Submitting…" : "Submit request"}
            </button>
          </div>
        </form>
      ) : null}

      {/* Pending */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-slate-800">
          Pending ({pending.length})
        </h2>

        {loading ? (
          <div className="h-24 animate-pulse rounded-2xl bg-slate-100" />
        ) : pending.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
            <p className="text-sm text-slate-500">No pending requests.</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {pending.map((r) => (
              <li
                key={r.id}
                className="rounded-2xl border border-amber-200 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-xs font-semibold text-slate-700">
                      {r.transactionReference}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      {r.currency} {r.amount.toLocaleString()}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Account {r.accountNumber} · {timeAgo(r.requestedAt)}
                    </p>
                    <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
                      {r.reason}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                    Pending approval
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Decided */}
      {decided.length > 0 ? (
        <div>
          <h2 className="mb-3 text-sm font-semibold text-slate-800">Recent decisions</h2>
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <ul className="divide-y divide-slate-100">
              {decided.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-xs font-semibold text-slate-700">
                      {r.transactionReference}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {r.currency} {r.amount.toLocaleString()}
                      {r.decidedBy ? ` · decided by ${r.decidedBy}` : ""}
                      {r.decidedAt ? ` · ${timeAgo(r.decidedAt)}` : ""}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                      r.status === "APPROVED"
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-red-50 text-red-700"
                    }`}
                  >
                    {r.status}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
    </div>
  );
}