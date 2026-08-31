"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { readAuth, type AuthSession } from "@/lib/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

type EodSummary = {
  openingBalance: number;
  deposits: number;
  withdrawals: number;
  transfersOut: number;
  expectedCash: number;
  depositsCount: number;
  withdrawalsCount: number;
  transactionsCount: number;
};

export default function TellerEodPage() {
  const router = useRouter();
  const [session, setSession] = useState<AuthSession | null>(null);
  const [summary, setSummary] = useState<EodSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [countedCash, setCountedCash] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [done, setDone] = useState(false);

  const load = useCallback(async (current: AuthSession) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/api/teller/eod/summary`, {
        headers: { Authorization: `Bearer ${current.token}` },
      });
      if (!res.ok) throw new Error("Couldn't load end-of-day summary.");
      const data = await res.json();
      setSummary(data);
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
    if (!session || !summary) return;

    const value = Number(countedCash.replace(/[^\d.]/g, ""));
    if (!Number.isFinite(value) || value < 0) {
      setSubmitError("Enter a valid cash count.");
      return;
    }

    setSubmitting(true);
    setSubmitError("");

    try {
      const res = await fetch(`${API_URL}/api/teller/eod/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.token}`,
        },
        body: JSON.stringify({
          countedCash: value,
          note: note.trim() || null,
        }),
      });

      if (!res.ok) throw new Error("Couldn't submit end-of-day report.");
      setDone(true);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!session) return null;

  const inputClass =
    "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10";

  if (done) {
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
          <h1 className="mt-5 text-xl font-bold text-slate-900">End-of-day submitted</h1>
          <p className="mt-1 text-sm text-slate-500">
            Your till has been closed and the report sent for reconciliation.
          </p>

          <button
            type="button"
            onClick={() => router.push("/teller/dashboard")}
            className="mt-6 w-full rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500"
          >
            Back to dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">End of day</h1>
        <p className="mt-1 text-sm text-slate-500">
          Count your cash and submit your reconciliation report.
        </p>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="h-56 animate-pulse rounded-2xl bg-slate-100" />
      ) : !summary ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="text-sm text-slate-600">
            You don&apos;t have an open till today.
          </p>
        </div>
      ) : (
        <>
          {/* Summary */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">Today&apos;s summary</h2>

            <dl className="mt-4 grid gap-x-6 gap-y-3 sm:grid-cols-2">
              <Row label="Opening balance" value={`KES ${summary.openingBalance.toLocaleString()}`} />
              <Row label="Transactions" value={String(summary.transactionsCount)} />
              <Row
                label={`Deposits (${summary.depositsCount})`}
                value={`+ KES ${summary.deposits.toLocaleString()}`}
                positive
              />
              <Row
                label={`Withdrawals (${summary.withdrawalsCount})`}
                value={`− KES ${summary.withdrawals.toLocaleString()}`}
              />
              <Row
                label="Transfers out"
                value={`− KES ${summary.transfersOut.toLocaleString()}`}
              />
            </dl>

            <div className="mt-5 rounded-xl bg-slate-50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Expected cash in till
              </p>
              <p className="mt-1 text-2xl font-bold text-slate-900">
                KES {summary.expectedCash.toLocaleString()}
              </p>
            </div>
          </div>

          {/* Cash count form */}
          <form
            onSubmit={submit}
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <h2 className="text-sm font-semibold text-slate-900">Cash count</h2>
            <p className="mt-1 text-xs text-slate-500">
              Count the cash you actually have in the drawer and enter the total below.
            </p>

            <div className="mt-5 space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Counted cash (KES)
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={countedCash}
                  onChange={(e) => setCountedCash(e.target.value)}
                  placeholder="e.g. 78500"
                  className={`${inputClass} text-lg font-semibold`}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Note (optional)
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  placeholder="Explain any discrepancy"
                  className={inputClass}
                />
              </div>
            </div>

            {submitError ? (
              <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm text-red-700">
                {submitError}
              </div>
            ) : null}

            <div className="mt-6 flex justify-end">
              <button
                type="submit"
                disabled={submitting}
                className="rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-500 disabled:opacity-70"
              >
                {submitting ? "Submitting…" : "Submit end-of-day"}
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  );
}

function Row({
  label,
  value,
  positive,
}: {
  label: string;
  value: string;
  positive?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-2 last:border-b-0">
      <dt className="text-sm text-slate-500">{label}</dt>
      <dd
        className={`text-sm font-semibold ${
          positive ? "text-emerald-700" : "text-slate-900"
        }`}
      >
        {value}
      </dd>
    </div>
  );
}