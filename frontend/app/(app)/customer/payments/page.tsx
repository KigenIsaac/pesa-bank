"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { readAuth, type AuthSession } from "@/lib/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

type Account = {
  id: string;
  accountNumber: string;
  balance: number;
  currency: string;
};

type Payee = {
  id: string;
  name: string;
  category: string;
  accountNumber: string;
};

const CATEGORIES = [
  { value: "UTILITIES", label: "Utilities" },
  { value: "AIRTIME", label: "Airtime & data" },
  { value: "TV", label: "TV subscription" },
  { value: "INTERNET", label: "Internet" },
  { value: "WATER", label: "Water" },
  { value: "LOAN", label: "Loan repayment" },
  { value: "OTHER", label: "Other" },
];

export default function CustomerPaymentsPage() {
  const router = useRouter();
  const [session, setSession] = useState<AuthSession | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [payees, setPayees] = useState<Payee[]>([]);
  const [loading, setLoading] = useState(true);

  const [fromId, setFromId] = useState("");
  const [category, setCategory] = useState("UTILITIES");
  const [payeeId, setPayeeId] = useState("");
  const [accountRef, setAccountRef] = useState("");
  const [amount, setAmount] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<{ reference: string; amount: number } | null>(null);

  useEffect(() => {
    const current = readAuth();
    if (!current) return;
    setSession(current);

    Promise.all([
      fetch(`${API_URL}/api/customer/accounts`, {
        headers: { Authorization: `Bearer ${current.token}` },
      }).then((r) => (r.ok ? r.json() : [])),
      fetch(`${API_URL}/api/customer/payees`, {
        headers: { Authorization: `Bearer ${current.token}` },
      }).then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([a, p]) => {
        const list: Account[] = Array.isArray(a) ? a : a.items ?? [];
        setAccounts(list);
        setFromId(list[0]?.id ?? "");
        setPayees(Array.isArray(p) ? p : p.items ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const fromAccount = useMemo(
    () => accounts.find((a) => a.id === fromId) ?? null,
    [accounts, fromId]
  );

  const availablePayees = useMemo(
    () => payees.filter((p) => p.category === category),
    [payees, category]
  );

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!session || !fromAccount) return;

    const numeric = Number(amount.replace(/[^\d.]/g, ""));
    if (!payeeId) {
      setError("Choose a payee.");
      return;
    }
    if (!Number.isFinite(numeric) || numeric <= 0) {
      setError("Enter a valid amount.");
      return;
    }
    if (numeric > fromAccount.balance) {
      setError("Insufficient funds.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const res = await fetch(`${API_URL}/api/customer/payments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.token}`,
        },
        body: JSON.stringify({
          fromAccountId: fromAccount.id,
          payeeId,
          accountRef: accountRef.trim() || null,
          amount: numeric,
        }),
      });

      if (res.status === 400) throw new Error("Insufficient funds or invalid amount.");
      if (!res.ok) throw new Error("Couldn't process this payment.");

      const data = await res.json();
      setSuccess({ reference: data.reference ?? "—", amount: numeric });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  function reset() {
    setPayeeId("");
    setAccountRef("");
    setAmount("");
    setError("");
    setSuccess(null);
  }

  if (!session) return null;

  const inputClass =
    "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10";

  if (success) {
    return (
      <div className="mx-auto max-w-md">
        <div className="rounded-2xl border border-emerald-200 bg-white p-8 text-center shadow-sm">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-7 w-7"
              aria-hidden
            >
              <path d="m5 12.5 4.5 4.5L19 7" />
            </svg>
          </span>
          <h1 className="mt-5 text-xl font-bold text-slate-900">Payment sent</h1>
          <p className="mt-1 text-sm text-slate-500">
            KES {success.amount.toLocaleString()} has been paid.
          </p>

          <div className="mt-6 rounded-xl bg-slate-50 p-4 text-left">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Reference
            </p>
            <p className="mt-1 font-mono text-sm font-semibold text-slate-900">
              {success.reference}
            </p>
          </div>

          <div className="mt-6 flex flex-col gap-3">
            <button
              type="button"
              onClick={reset}
              className="w-full rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500"
            >
              Make another payment
            </button>
            <button
              type="button"
              onClick={() => router.push("/customer/dashboard")}
              className="w-full rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Back to dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Payments</h1>
        <p className="mt-1 text-sm text-slate-500">
          Pay bills, buy airtime, and settle utilities from your account.
        </p>
      </div>

      {loading ? (
        <div className="h-64 animate-pulse rounded-2xl bg-slate-100" />
      ) : accounts.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <p className="text-sm font-semibold text-slate-800">No accounts available</p>
          <p className="mt-1 text-sm text-slate-500">
            You need an active account to make payments.
          </p>
        </div>
      ) : (
        <form
          onSubmit={submit}
          className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Pay from</label>
            <select
              value={fromId}
              onChange={(e) => setFromId(e.target.value)}
              className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.accountNumber} · {a.currency} {a.balance.toLocaleString()}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Category</label>
            <select
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setPayeeId("");
              }}
              className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Payee</label>
            {availablePayees.length === 0 ? (
              <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                No payees saved for this category yet.
              </p>
            ) : (
              <select
                value={payeeId}
                onChange={(e) => setPayeeId(e.target.value)}
                className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
              >
                <option value="">Select payee</option>
                {availablePayees.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Account / reference (optional)
            </label>
            <input
              type="text"
              value={accountRef}
              onChange={(e) => setAccountRef(e.target.value)}
              placeholder="e.g. meter number, phone number"
              className={inputClass}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Amount (KES)
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className={`${inputClass} text-lg font-semibold`}
            />
            {fromAccount ? (
              <p className="mt-1.5 text-xs text-slate-400">
                Available: {fromAccount.currency} {fromAccount.balance.toLocaleString()}
              </p>
            ) : null}
          </div>

          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-500 disabled:opacity-70"
            >
              {submitting ? "Paying…" : "Pay now"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}