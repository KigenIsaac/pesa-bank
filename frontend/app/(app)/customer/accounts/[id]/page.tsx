"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { readAuth, type AuthSession } from "@/lib/auth";
import { fullDate, timeAgo } from "@/lib/format";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

type AccountDetail = {
  id: string;
  accountNumber: string;
  type: "SAVINGS" | "CURRENT" | "FIXED_DEPOSIT";
  balance: number;
  currency: string;
  status: "ACTIVE" | "FROZEN" | "CLOSED";
  openedAt: string;
};

type Tx = {
  id: string;
  type: "DEPOSIT" | "WITHDRAWAL" | "TRANSFER";
  amount: number;
  balanceAfter: number;
  description: string;
  createdAt: string;
  direction: "IN" | "OUT";
};

export default function CustomerAccountDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [session, setSession] = useState<AuthSession | null>(null);
  const [account, setAccount] = useState<AccountDetail | null>(null);
  const [txs, setTxs] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(
    async (current: AuthSession) => {
      setLoading(true);
      setError("");

      try {
        const [accRes, txRes] = await Promise.all([
          fetch(`${API_URL}/api/customer/accounts/${params.id}`, {
            headers: { Authorization: `Bearer ${current.token}` },
          }),
          fetch(`${API_URL}/api/customer/accounts/${params.id}/transactions?limit=20`, {
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
        onClick={() => router.push("/customer/accounts")}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition hover:text-slate-800"
      >
        ← Back to accounts
      </button>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-mono text-2xl font-bold tracking-tight text-slate-900">
            {account.accountNumber}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {account.type.replace("_", " ").toLowerCase()} · opened{" "}
            {fullDate(account.openedAt)}
          </p>
        </div>
        <StatusBadge status={account.status} />
      </div>

      {/* Balance */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
          Available balance
        </p>
        <p className="mt-2 text-4xl font-bold tracking-tight text-slate-900">
          {account.currency} {account.balance.toLocaleString()}
        </p>
      </div>

      {/* Actions */}
      <div className="grid gap-3 sm:grid-cols-3">
        <ActionLink
          href={`/customer/transfer?from=${account.accountNumber}`}
          label="Send money"
        />
        <ActionLink href="/customer/payments" label="Pay a bill" />
        <ActionLink href="/customer/statements" label="Download statement" />
      </div>

      {/* Transactions */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-900">Transactions</h2>
        </div>

        {txs.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-slate-500">
            No transactions on this account yet.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {txs.map((t) => (
              <li key={t.id} className="flex items-center gap-4 px-5 py-3.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-800">
                    {t.description}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {t.type.replace("_", " ").toLowerCase()} · {timeAgo(t.createdAt)}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p
                    className={`text-sm font-semibold ${
                      t.direction === "IN" ? "text-emerald-700" : "text-slate-900"
                    }`}
                  >
                    {t.direction === "IN" ? "+" : "−"}
                    {t.amount.toLocaleString()}
                  </p>
                  <p className="text-xs text-slate-400">
                    Bal {t.balanceAfter.toLocaleString()}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function ActionLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-center text-sm font-semibold text-slate-700 shadow-sm transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800"
    >
      {label}
    </a>
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