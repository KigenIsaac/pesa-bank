"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { readAuth, type AuthSession } from "@/lib/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

type Account = {
  id: string;
  accountNumber: string;
  type: string;
  balance: number;
  currency: string;
};

type Destination = "OWN" | "PESABANK" | "MOBILE" | "OTHER_BANK";

const DESTINATIONS: { value: Destination; label: string; hint: string }[] = [
  { value: "OWN", label: "My accounts", hint: "Transfer between your own accounts" },
  { value: "PESABANK", label: "Pesa Bank", hint: "To another Pesa Bank customer" },
  { value: "MOBILE", label: "Mobile money", hint: "Send to M-Pesa, Airtel Money, etc." },
  { value: "OTHER_BANK", label: "Other bank", hint: "To an account at another bank" },
];

export default function CustomerTransferPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefillFrom = searchParams.get("from") ?? "";

  const [session, setSession] = useState<AuthSession | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);

  const [fromId, setFromId] = useState("");
  const [destination, setDestination] = useState<Destination>("OWN");
  const [toAccount, setToAccount] = useState("");
  const [toName, setToName] = useState("");
  const [toBank, setToBank] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<{ reference: string; amount: number } | null>(null);

  useEffect(() => {
    const current = readAuth();
    if (!current) return;
    setSession(current);

    fetch(`${API_URL}/api/customer/accounts`, {
      headers: { Authorization: `Bearer ${current.token}` },
    })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        const list: Account[] = Array.isArray(data) ? data : data.items ?? [];
        setAccounts(list);
        const initial =
          list.find((a) => a.accountNumber === prefillFrom)?.id ?? list[0]?.id ?? "";
        setFromId(initial);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [prefillFrom]);

  const fromAccount = useMemo(
    () => accounts.find((a) => a.id === fromId) ?? null,
    [accounts, fromId]
  );

  const ownAccounts = useMemo(
    () => accounts.filter((a) => a.id !== fromId),
    [accounts, fromId]
  );

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!session || !fromAccount) return;

    const numeric = Number(amount.replace(/[^\d.]/g, ""));
    if (!Number.isFinite(numeric) || numeric <= 0) {
      setError("Enter a valid amount.");
      return;
    }
    if (numeric > fromAccount.balance) {
      setError("Insufficient funds.");
      return;
    }

    if (destination === "OWN") {
      if (!toAccount) {
        setError("Choose the destination account.");
        return;
      }
    } else if (destination === "PESABANK") {
      if (!toAccount.trim()) {
        setError("Enter the recipient's account number.");
        return;
      }
    } else if (destination === "MOBILE") {
      if (!mobileNumber.trim()) {
        setError("Enter the mobile number.");
        return;
      }
    } else {
      if (!toAccount.trim() || !toBank.trim()) {
        setError("Enter the recipient's account number and bank.");
        return;
      }
    }

    setSubmitting(true);
    setError("");

    try {
      const res = await fetch(`${API_URL}/api/customer/transfer`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.token}`,
        },
        body: JSON.stringify({
          fromAccountId: fromAccount.id,
          destination,
          toAccountNumber: destination === "MOBILE" ? mobileNumber.trim() : toAccount.trim(),
          toName: toName.trim() || null,
          toBank: destination === "OTHER_BANK" ? toBank.trim() : null,
          amount: numeric,
          note: note.trim() || null,
        }),
      });

      if (res.status === 400) throw new Error("Insufficient funds or invalid amount.");
      if (res.status === 404) throw new Error("Destination not found.");
      if (!res.ok) throw new Error("Couldn't process this transfer.");

      const data = await res.json();
      setSuccess({ reference: data.reference ?? "—", amount: numeric });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  function reset() {
    setToAccount("");
    setToName("");
    setToBank("");
    setMobileNumber("");
    setAmount("");
    setNote("");
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
          <h1 className="mt-5 text-xl font-bold text-slate-900">Transfer sent</h1>
          <p className="mt-1 text-sm text-slate-500">
            KES {success.amount.toLocaleString()} has been sent successfully.
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
              Send another
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
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Send money</h1>
        <p className="mt-1 text-sm text-slate-500">
          Transfer to your own accounts, another Pesa Bank customer, mobile money, or other banks.
        </p>
      </div>

      {loading ? (
        <div className="h-64 animate-pulse rounded-2xl bg-slate-100" />
      ) : accounts.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <p className="text-sm font-semibold text-slate-800">No accounts available</p>
          <p className="mt-1 text-sm text-slate-500">
            You need an active account before you can send money.
          </p>
        </div>
      ) : (
        <form
          onSubmit={submit}
          className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          {/* From */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">From</label>
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

          {/* Destination type */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Send to</label>
            <div className="grid gap-2 sm:grid-cols-2">
              {DESTINATIONS.map((d) => {
                const active = destination === d.value;
                return (
                  <label
                    key={d.value}
                    className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${
                      active
                        ? "border-emerald-500 bg-emerald-50 ring-2 ring-emerald-500/20"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="destination"
                      value={d.value}
                      checked={active}
                      onChange={() => setDestination(d.value)}
                      className="sr-only"
                    />
                    <span
                      className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${
                        active ? "border-emerald-600 bg-emerald-600" : "border-slate-300"
                      }`}
                    >
                      {active ? <span className="h-1.5 w-1.5 rounded-full bg-white" /> : null}
                    </span>
                    <span>
                      <span className="block text-sm font-medium text-slate-900">
                        {d.label}
                      </span>
                      <span className="mt-0.5 block text-xs text-slate-500">{d.hint}</span>
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Destination fields */}
          {destination === "OWN" ? (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                To account
              </label>
              <select
                value={toAccount}
                onChange={(e) => setToAccount(e.target.value)}
                className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
              >
                <option value="">Select account</option>
                {ownAccounts.map((a) => (
                  <option key={a.id} value={a.accountNumber}>
                    {a.accountNumber} · {a.currency} {a.balance.toLocaleString()}
                  </option>
                ))}
              </select>
            </div>
          ) : destination === "PESABANK" ? (
            <>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Recipient account number
                </label>
                <input
                  type="text"
                  value={toAccount}
                  onChange={(e) => setToAccount(e.target.value)}
                  placeholder="e.g. 0987654321"
                  className={`${inputClass} font-mono`}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Recipient name (optional)
                </label>
                <input
                  type="text"
                  value={toName}
                  onChange={(e) => setToName(e.target.value)}
                  placeholder="e.g. Grace Wanjiru"
                  className={inputClass}
                />
              </div>
            </>
          ) : destination === "MOBILE" ? (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Mobile number
              </label>
              <input
                type="tel"
                value={mobileNumber}
                onChange={(e) => setMobileNumber(e.target.value)}
                placeholder="0712 345 678"
                className={inputClass}
              />
            </div>
          ) : (
            <>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Recipient account number
                </label>
                <input
                  type="text"
                  value={toAccount}
                  onChange={(e) => setToAccount(e.target.value)}
                  placeholder="Account number"
                  className={`${inputClass} font-mono`}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Bank
                </label>
                <input
                  type="text"
                  value={toBank}
                  onChange={(e) => setToBank(e.target.value)}
                  placeholder="e.g. Equity, KCB, NCBA"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Recipient name (optional)
                </label>
                <input
                  type="text"
                  value={toName}
                  onChange={(e) => setToName(e.target.value)}
                  placeholder="Recipient's name"
                  className={inputClass}
                />
              </div>
            </>
          )}

          {/* Amount */}
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

          {/* Note */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Note (optional)
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="What's this for?"
              className={inputClass}
              maxLength={140}
            />
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
              {submitting ? "Sending…" : "Send money"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}