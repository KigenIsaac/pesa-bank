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
  requestedBy: string;
  reason: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  requestedAt: string;
};

export default function AdminReversalsPage() {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [items, setItems] = useState<ReversalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(null);

  const load = useCallback(async (current: AuthSession) => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${API_URL}/api/admin/reversals`, {
        headers: { Authorization: `Bearer ${current.token}` },
      });
      if (!res.ok) throw new Error("Couldn't load reversal requests.");
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

  async function decide(id: string, decision: "APPROVE" | "REJECT") {
    if (!session) return;

    setProcessingId(id);
    setActionError("");

    const previous = items;
    setItems((prev) =>
      prev.map((r) =>
        r.id === id
          ? { ...r, status: decision === "APPROVE" ? "APPROVED" : "REJECTED" }
          : r
      )
    );

    try {
      const res = await fetch(`${API_URL}/api/admin/reversals/${id}/${decision.toLowerCase()}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.token}` },
      });
      if (!res.ok) throw new Error("Couldn't process this request.");
    } catch (err) {
      setItems(previous);
      setActionError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setProcessingId(null);
    }
  }

  if (!session) return null;

  const pending = items.filter((r) => r.status === "PENDING");
  const decided = items.filter((r) => r.status !== "PENDING");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Reversals</h1>
        <p className="mt-1 text-sm text-slate-500">
          Approve or reject reversal requests submitted by tellers.
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

      {/* Pending */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-slate-800">
          Pending ({pending.length})
        </h2>

        {loading ? (
          <div className="h-32 animate-pulse rounded-2xl bg-slate-100" />
        ) : pending.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <p className="text-sm font-semibold text-slate-800">No pending requests</p>
            <p className="mt-1 text-sm text-slate-500">
              All reversal requests have been reviewed.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {pending.map((r) => (
              <li
                key={r.id}
                className="rounded-2xl border border-amber-200 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-mono text-xs font-semibold text-slate-700">
                      {r.transactionReference}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      {r.currency} {r.amount.toLocaleString()}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Account {r.accountNumber} · requested by {r.requestedBy} ·{" "}
                      {timeAgo(r.requestedAt)}
                    </p>
                    <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
                      {r.reason}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => decide(r.id, "REJECT")}
                    disabled={processingId === r.id}
                    className="rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-60"
                  >
                    Reject
                  </button>
                  <button
                    type="button"
                    onClick={() => decide(r.id, "APPROVE")}
                    disabled={processingId === r.id}
                    className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-60"
                  >
                    {processingId === r.id ? "Processing…" : "Approve"}
                  </button>
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
                      {r.currency} {r.amount.toLocaleString()} · {r.requestedBy} ·{" "}
                      {timeAgo(r.requestedAt)}
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