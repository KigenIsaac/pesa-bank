"use client";

import { useEffect, useMemo, useState } from "react";
import { readAuth, type AuthSession } from "@/lib/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

type Account = {
  id: string;
  accountNumber: string;
  currency: string;
};

export default function CustomerStatementsPage() {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [accountId, setAccountId] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [format, setFormat] = useState<"pdf" | "csv">("pdf");
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const current = readAuth();
    if (!current) return;
    setSession(current);

    const today = new Date();
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    setFromDate(monthAgo.toISOString().slice(0, 10));
    setToDate(today.toISOString().slice(0, 10));

    fetch(`${API_URL}/api/customer/accounts`, {
      headers: { Authorization: `Bearer ${current.token}` },
    })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        const list: Account[] = Array.isArray(data) ? data : data.items ?? [];
        setAccounts(list);
        setAccountId(list[0]?.id ?? "");
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const selected = useMemo(
    () => accounts.find((a) => a.id === accountId),
    [accounts, accountId]
  );

  async function download(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!session || !selected) return;

    if (!fromDate || !toDate) {
      setError("Choose the statement period.");
      return;
    }

    setDownloading(true);
    setError("");

    try {
      const url = new URL(
        `${API_URL}/api/customer/accounts/${selected.id}/statement`
      );
      url.searchParams.set("from", fromDate);
      url.searchParams.set("to", toDate);
      url.searchParams.set("format", format);

      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${session.token}` },
      });

      if (!res.ok) throw new Error("Couldn't generate your statement.");

      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = `statement-${selected.accountNumber}-${fromDate}-to-${toDate}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(objectUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setDownloading(false);
    }
  }

  if (!session) return null;

  const inputClass =
    "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Statements</h1>
        <p className="mt-1 text-sm text-slate-500">
          Download a statement for any of your accounts.
        </p>
      </div>

      {loading ? (
        <div className="h-56 animate-pulse rounded-2xl bg-slate-100" />
      ) : accounts.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <p className="text-sm font-semibold text-slate-800">No accounts available</p>
          <p className="mt-1 text-sm text-slate-500">
            Statements will be available once you have an account.
          </p>
        </div>
      ) : (
        <form
          onSubmit={download}
          className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Account</label>
            <select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.accountNumber} ({a.currency})
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">From</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">To</label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Format</label>
            <div className="flex gap-2">
              {(["pdf", "csv"] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFormat(f)}
                  className={`flex-1 rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${
                    format === f
                      ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {f.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={downloading}
              className="rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-500 disabled:opacity-70"
            >
              {downloading ? "Preparing…" : "Download statement"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}