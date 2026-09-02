"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { readAuth, type AuthSession } from "@/lib/auth";
import { fullDate, timeAgo } from "@/lib/format";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

type AccountDetail = {
  id: string;
  accountNumber: string;
  holderId: string;
  holderName: string;
  holderEmail: string;
  type: "SAVINGS" | "CURRENT" | "FIXED_DEPOSIT";
  balance: number;
  currency: string;
  status: "ACTIVE" | "FROZEN" | "CLOSED";
  openedAt: string;
  lastTransactionAt?: string;
};

type Tx = {
  id: string;
  type: "DEPOSIT" | "WITHDRAWAL" | "TRANSFER";
  amount: number;
  balanceAfter: number;
  description: string;
  createdAt: string;
};

export default function AdminAccountDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [session, setSession] = useState<AuthSession | null>(null);
  const [account, setAccount] = useState<AccountDetail | null>(null);
  const [txs, setTxs] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState("");
  const [actionMessage, setActionMessage] = useState("");

  const load = useCallback(
    async (current: AuthSession) => {
      setLoading(true);
      setError("");

      try {
        const [accRes, txRes] = await Promise.all([
          fetch(`${API_URL}/api/admin/accounts/${params.id}`, {
            headers: { Authorization: `Bearer ${current.token}` },
          }),
          fetch(`${API_URL}/api/admin/accounts/${params.id}/transactions?limit=20`, {
            headers: { Authorization: `Bearer ${current.token}` },
          }),
        ]);

        if (!accRes.ok) throw new Error("Couldn't load this account.");
        const acc: AccountDetail = await accRes.json();
        setAccount(acc);

        if (txRes.ok) {
          const txData = await txRes.json();
          setTxs(Array.isArray(txData) ? txData : txData.items ?? []);
        }
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

  async function updateStatus(next: AccountDetail["status"]) {
    if (!session || !account) return;

    setActionLoading(true);
    setActionError("");
    setActionMessage("");

    try {
      const res = await fetch(`${API_URL}/api/admin/accounts/${account.id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.token}`,
        },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) throw new Error("Couldn't update account status.");
      setAccount({ ...account, status: next });
      setActionMessage(`Account marked as ${next.toLowerCase()}.`);
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

  if (error || !account) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        {error || "Account not found."}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={() => router.push("/admin/accounts")}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition hover:text-slate-800"
      >
        ← Back to accounts
      </button>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-mono text-2xl font-bold tracking-tight text-slate-900">
            {account.accountNumber}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {account.type.replace("_", " ")} · {account.holderName}
          </p>
        </div>
        <StatusBadge status={account.status} />
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

      {/* Balance */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
          Current balance
        </p>
        <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
          {account.currency} {account.balance.toLocaleString()}
        </p>
      </div>

      {/* Details */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">Account details</h2>
        <dl className="mt-4 grid gap-x-6 gap-y-3 sm:grid-cols-2">
          <Row label="Holder" value={account.holderName} />
          <Row label="Email" value={account.holderEmail} />
          <Row label="Type" value={account.type.replace("_", " ")} />
          <Row label="Currency" value={account.currency} />
          <Row label="Opened" value={fullDate(account.openedAt)} />
          <Row
            label="Last transaction"
            value={account.lastTransactionAt ? fullDate(account.lastTransactionAt) : "—"}
          />
        </dl>

        <div className="mt-5">
          <Link
            href={`/admin/users/${account.holderId}`}
            className="text-sm font-medium text-emerald-700 hover:underline"
          >
            View holder profile →
          </Link>
        </div>
      </div>

      {/* Actions */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">Account actions</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          {account.status === "ACTIVE" ? (
            <button
              type="button"
              onClick={() => updateStatus("FROZEN")}
              disabled={actionLoading}
              className="rounded-xl border border-amber-200 bg-white px-5 py-2.5 text-sm font-semibold text-amber-700 transition hover:bg-amber-50 disabled:opacity-60"
            >
              Freeze account
            </button>
          ) : null}

          {account.status === "FROZEN" ? (
            <button
              type="button"
              onClick={() => updateStatus("ACTIVE")}
              disabled={actionLoading}
              className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-60"
            >
              Unfreeze account
            </button>
          ) : null}

          {account.status !== "CLOSED" ? (
            <button
              type="button"
              onClick={() => updateStatus("CLOSED")}
              disabled={actionLoading}
              className="rounded-xl border border-red-200 bg-white px-5 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-60"
            >
              Close account
            </button>
          ) : null}
        </div>
      </div>

      {/* Recent transactions */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-900">Recent transactions</h2>
        </div>

        {txs.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-slate-500">
            No transactions on this account yet.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {txs.map((t) => {
              const negative = t.type === "WITHDRAWAL" || t.type === "TRANSFER";
              return (
                <li key={t.id} className="flex items-center gap-4 px-5 py-3.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-800">
                      {t.description}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {t.type.replace("_", " ")} · {timeAgo(t.createdAt)}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p
                      className={`text-sm font-semibold ${
                        negative ? "text-slate-900" : "text-emerald-700"
                      }`}
                    >
                      {negative ? "−" : "+"}
                      {t.amount.toLocaleString()}
                    </p>
                    <p className="text-xs text-slate-400">
                      Bal {t.balanceAfter.toLocaleString()}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
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

function StatusBadge({ status }: { status: AccountDetail["status"] }) {
  const styles = {
    ACTIVE: "bg-emerald-50 text-emerald-700",
    FROZEN: "bg-amber-50 text-amber-700",
    CLOSED: "bg-slate-100 text-slate-600",
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