"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { readAuth, type AuthSession } from "@/lib/auth";
import { fullDate } from "@/lib/format";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

type TxDetail = {
  id: string;
  reference: string;
  accountId: string;
  accountNumber: string;
  holderId: string;
  holderName: string;
  type: "DEPOSIT" | "WITHDRAWAL" | "TRANSFER";
  amount: number;
  currency: string;
  balanceAfter: number;
  status: "COMPLETED" | "PENDING" | "REVERSED" | "FAILED";
  description: string;
  channel: string;
  createdAt: string;
  performedBy?: string;
  reversalReason?: string;
};

export default function AdminTransactionDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [session, setSession] = useState<AuthSession | null>(null);
  const [tx, setTx] = useState<TxDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [reversalReason, setReversalReason] = useState("");

  const load = useCallback(
    async (current: AuthSession) => {
      setLoading(true);
      setError("");

      try {
        const res = await fetch(`${API_URL}/api/admin/transactions/${params.id}`, {
          headers: { Authorization: `Bearer ${current.token}` },
        });
        if (!res.ok) throw new Error("Couldn't load this transaction.");
        const data = await res.json();
        setTx(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      } finally {
        setLoading(false);
      }
    },
    [params.id]
  );

  useEffect(() => {
    const current = readAuth();
    if (!current) return;
    setSession(current);
    load(current);
  }, [load]);

  async function reverse() {
    if (!session || !tx) return;
    if (!reversalReason.trim()) {
      setActionError("Provide a reason for the reversal.");
      return;
    }

    setActionLoading(true);
    setActionError("");
    setActionMessage("");

    try {
      const res = await fetch(`${API_URL}/api/admin/transactions/${tx.id}/reverse`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.token}`,
        },
        body: JSON.stringify({ reason: reversalReason.trim() }),
      });
      if (!res.ok) throw new Error("Couldn't reverse this transaction.");
      const updated: TxDetail = await res.json();
      setTx(updated);
      setReversalReason("");
      setActionMessage("Transaction reversed.");
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setActionLoading(false);
    }
  }

  if (!session) return null;

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-1/3 animate-pulse rounded bg-slate-100" />
        <div className="h-64 animate-pulse rounded-2xl bg-slate-100" />
      </div>
    );
  }

  if (error || !tx) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        {error || "Transaction not found."}
      </div>
    );
  }

  const canReverse = tx.status === "COMPLETED";

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={() => router.push("/admin/transactions")}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition hover:text-slate-800"
      >
        ← Back to transactions
      </button>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-mono text-2xl font-bold tracking-tight text-slate-900">
            {tx.reference}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {tx.type.toLowerCase()} on {tx.accountNumber}
          </p>
        </div>
        <StatusBadge status={tx.status} />
      </div>

      {actionError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {actionError}
        </div>
      ) : null}
      {actionMessage ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          {actionMessage}
        </div>
      ) : null}

      {/* Amount */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Amount</p>
        <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
          {tx.currency} {tx.amount.toLocaleString()}
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Balance after: {tx.currency} {tx.balanceAfter.toLocaleString()}
        </p>
      </div>

      {/* Details */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">Details</h2>
        <dl className="mt-4 grid gap-x-6 gap-y-3 sm:grid-cols-2">
          <Row label="Reference" value={tx.reference} />
          <Row label="Type" value={tx.type} />
          <Row label="Channel" value={tx.channel} />
          <Row label="Performed by" value={tx.performedBy} />
          <Row label="Date" value={fullDate(tx.createdAt)} />
          <Row label="Description" value={tx.description} />
          {tx.reversalReason ? <Row label="Reversal reason" value={tx.reversalReason} /> : null}
        </dl>

        <div className="mt-5 flex flex-wrap gap-4">
          <Link
            href={`/admin/accounts/${tx.accountId}`}
            className="text-sm font-medium text-emerald-700 hover:underline"
          >
            View account →
          </Link>
          <Link
            href={`/admin/users/${tx.holderId}`}
            className="text-sm font-medium text-emerald-700 hover:underline"
          >
            View holder →
          </Link>
        </div>
      </div>

      {/* Reversal */}
      {canReverse ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Reverse transaction</h2>
          <p className="mt-1 text-xs text-slate-500">
            Reversals are logged and require a reason for audit purposes.
          </p>
          <textarea
            value={reversalReason}
            onChange={(e) => setReversalReason(e.target.value)}
            rows={3}
            placeholder="Explain why this transaction is being reversed."
            className="mt-4 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-red-500 focus:ring-4 focus:ring-red-500/10"
          />
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={reverse}
              disabled={actionLoading}
              className="rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-red-600/20 transition hover:bg-red-500 disabled:opacity-70"
            >
              {actionLoading ? "Reversing…" : "Confirm reversal"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Row({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="mt-0.5 text-sm text-slate-800">{value || "—"}</dd>
    </div>
  );
}

function StatusBadge({ status }: { status: TxDetail["status"] }) {
  const styles = {
    COMPLETED: "bg-emerald-50 text-emerald-700",
    PENDING: "bg-amber-50 text-amber-700",
    REVERSED: "bg-slate-100 text-slate-600",
    FAILED: "bg-red-50 text-red-700",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${styles[status]}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}