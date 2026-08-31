"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { readAuth, type AuthSession } from "@/lib/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

type AccountLookup = {
  accountId: string;
  accountNumber: string;
  holderName: string;
  currency: string;
  balance: number;
};

export default function TellerTransferPage() {
  const router = useRouter();
  const [session, setSession] = useState<AuthSession | null>(null);

  const [fromNumber, setFromNumber] = useState("");
  const [fromAccount, setFromAccount] = useState<AccountLookup | null>(null);
  const [lookingUp, setLookingUp] = useState(false);
  const [lookupError, setLookupError] = useState("");

  const [toNumber, setToNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [success, setSuccess] = useState<{ reference: string } | null>(null);

  useEffect(() => {
    const current = readAuth();
    if (!current) return;
    setSession(current);
  }, []);

  async function lookup(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!session || !fromNumber.trim()) return;

    setLookingUp(true);
    setLookupError("");
    setFromAccount(null);

    try {
      const res = await fetch(
        `${API_URL}/api/teller/accounts/lookup?number=${encodeURIComponent(fromNumber.trim())}`,
        { headers: { Authorization: `Bearer ${session.token}` } }
      );
      if (res.status === 404) throw new Error("No account found with that number.");
      if (!res.ok) throw new Error("Couldn't look up that account.");
      const data: AccountLookup = await res.json();
      setFromAccount(data);
    } catch (err) {
      setLookupError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLookingUp(false);
    }
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!session || !fromAccount) return;

    const numeric = Number(amount.replace(/[^\d.]/g, ""));
    if (!toNumber.trim()) {
      setFormError("Enter the destination account.");
      return;
    }
    if (toNumber.trim() === fromAccount.accountNumber) {
      setFormError("Source and destination accounts cannot be the same.");
      return;
    }
    if (!Number.isFinite(numeric) || numeric <= 0) {
      setFormError("Enter a valid transfer amount.");
      return;
    }
    if (numeric > fromAccount.balance) {
      setFormError("Insufficient funds in the source account.");
      return;
    }

    setSubmitting(true);
    setFormError("");

    try {
      const res = await fetch(`${API_URL}/api/teller/transfer`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.token}`,
        },
        body: JSON.stringify({
          fromAccountId: fromAccount.accountId,
          toAccountNumber: toNumber.trim(),
          amount: numeric,
          note: note.trim() || null,
        }),
      });

      if (res.status === 404) throw new Error("Destination account not found.");
      if (res.status === 400) throw new Error("Insufficient funds or invalid amount.");
      if (!res.ok) throw new Error("Couldn't process this transfer.");

      const data = await res.json();
      setSuccess({ reference: data.reference ?? "—" });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  function reset() {
    setFromNumber("");
    setFromAccount(null);
    setToNumber("");
    setAmount("");
    setNote("");
    setFormError("");
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

          <h1 className="mt-5 text-xl font-bold text-slate-900">Transfer successful</h1>
          <p className="mt-1 text-sm text-slate-500">
            The funds have been moved between the accounts.
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
              New transfer
            </button>
            <button
              type="button"
              onClick={() => router.push("/teller/dashboard")}
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
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Customer transfer</h1>
        <p className="mt-1 text-sm text-slate-500">
          Move funds between Pesa Bank accounts on behalf of a customer.
        </p>
      </div>

      {!fromAccount ? (
        <form
          onSubmit={lookup}
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <h2 className="text-sm font-semibold text-slate-900">Source account</h2>
          <p className="mt-1 text-xs text-slate-500">
            Enter the account the funds will come from.
          </p>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <input
              type="text"
              value={fromNumber}
              onChange={(e) => setFromNumber(e.target.value)}
              placeholder="e.g. 0123456789"
              className={`${inputClass} font-mono`}
            />
            <button
              type="submit"
              disabled={lookingUp || !fromNumber.trim()}
              className="shrink-0 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-60"
            >
              {lookingUp ? "Searching…" : "Search"}
            </button>
          </div>

          {lookupError ? (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm text-red-700">
              {lookupError}
            </div>
          ) : null}
        </form>
      ) : (
        <>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  From account
                </p>
                <p className="mt-1 font-mono text-sm font-semibold text-slate-900">
                  {fromAccount.accountNumber}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">{fromAccount.holderName}</p>
              </div>
              <button
                type="button"
                onClick={() => setFromAccount(null)}
                className="text-xs font-medium text-slate-500 hover:text-slate-800"
              >
                Change account
              </button>
            </div>
            <div className="mt-4 border-t border-slate-100 pt-4">
              <p className="text-xs text-slate-400">Available balance</p>
              <p className="mt-1 text-lg font-bold text-slate-900">
                {fromAccount.currency} {fromAccount.balance.toLocaleString()}
              </p>
            </div>
          </div>

          <form
            onSubmit={submit}
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <h2 className="text-sm font-semibold text-slate-900">Transfer details</h2>

            <div className="mt-5 space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Destination account number
                </label>
                <input
                  type="text"
                  value={toNumber}
                  onChange={(e) => setToNumber(e.target.value)}
                  placeholder="e.g. 0987654321"
                  className={`${inputClass} font-mono`}
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
                  placeholder="e.g. 10000"
                  className={`${inputClass} text-lg font-semibold`}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Note (optional)
                </label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Reference or remark"
                  className={inputClass}
                  maxLength={140}
                />
              </div>
            </div>

            {formError ? (
              <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm text-red-700">
                {formError}
              </div>
            ) : null}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={reset}
                className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-500 disabled:opacity-70"
              >
                {submitting ? "Processing…" : "Confirm transfer"}
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  );
}