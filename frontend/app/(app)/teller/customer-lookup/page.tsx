"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { readAuth, type AuthSession } from "@/lib/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

type CustomerResult = {
  customerId: string;
  fullName: string;
  email: string;
  phone: string;
  idNumber: string;
  kycStatus: "APPROVED" | "PENDING" | "REJECTED" | "NOT_STARTED";
  accounts: {
    id: string;
    accountNumber: string;
    type: string;
    balance: number;
    currency: string;
    status: string;
  }[];
};

export default function TellerCustomerLookupPage() {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CustomerResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    const current = readAuth();
    if (!current) return;
    setSession(current);
  }, []);

  async function search(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!session || !query.trim()) return;

    setLoading(true);
    setError("");
    setResults([]);
    setSearched(true);

    try {
      const res = await fetch(
        `${API_URL}/api/teller/customers/search?q=${encodeURIComponent(query.trim())}`,
        { headers: { Authorization: `Bearer ${session.token}` } }
      );
      if (!res.ok) throw new Error("Search failed. Please try again.");
      const data = await res.json();
      setResults(Array.isArray(data) ? data : data.items ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  if (!session) return null;

  const inputClass =
    "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Customer lookup</h1>
        <p className="mt-1 text-sm text-slate-500">
          Search by ID number, phone, email, or account number.
        </p>
      </div>

      <form
        onSubmit={search}
        className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.6}
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              aria-hidden
            >
              <circle cx="11" cy="11" r="6.5" />
              <path d="m16 16 4.5 4.5" />
            </svg>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. 12345678 or 0712 345 678"
              className={`${inputClass} pl-10`}
            />
          </div>
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="shrink-0 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-60"
          >
            {loading ? "Searching…" : "Search"}
          </button>
        </div>
      </form>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="h-40 animate-pulse rounded-2xl bg-slate-100" />
      ) : searched && results.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <p className="text-sm font-semibold text-slate-800">No customer found</p>
          <p className="mt-1 text-sm text-slate-500">
            Try a different ID number, phone, or account number.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {results.map((c) => (
            <div
              key={c.customerId}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-base font-semibold text-slate-900">{c.fullName}</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {c.phone} · {c.email}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">ID {c.idNumber}</p>
                </div>
                <KycBadge status={c.kycStatus} />
              </div>

              {c.accounts.length > 0 ? (
                <div className="mt-5 border-t border-slate-100 pt-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Accounts
                  </p>
                  <ul className="mt-2 space-y-2">
                    {c.accounts.map((a) => (
                      <li
                        key={a.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 px-4 py-3"
                      >
                        <div>
                          <p className="font-mono text-sm font-semibold text-slate-900">
                            {a.accountNumber}
                          </p>
                          <p className="text-xs text-slate-500">
                            {a.type.replace("_", " ")} · {a.status}
                          </p>
                        </div>
                        <p className="text-sm font-semibold text-slate-900">
                          {a.currency} {a.balance.toLocaleString()}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="mt-4 text-xs text-slate-500">No accounts on file.</p>
              )}

              <div className="mt-4 flex flex-wrap gap-4 border-t border-slate-100 pt-4">
                <Link
                  href={`/teller/deposit?account=${c.accounts[0]?.accountNumber ?? ""}`}
                  className="text-xs font-semibold text-emerald-700 hover:underline"
                >
                  Deposit →
                </Link>
                <Link
                  href={`/teller/withdrawal?account=${c.accounts[0]?.accountNumber ?? ""}`}
                  className="text-xs font-semibold text-emerald-700 hover:underline"
                >
                  Withdraw →
                </Link>
                <Link
                  href={`/teller/transfer?from=${c.accounts[0]?.accountNumber ?? ""}`}
                  className="text-xs font-semibold text-emerald-700 hover:underline"
                >
                  Transfer →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function KycBadge({ status }: { status: CustomerResult["kycStatus"] }) {
  const styles: Record<CustomerResult["kycStatus"], string> = {
    APPROVED: "bg-emerald-50 text-emerald-700",
    PENDING: "bg-amber-50 text-amber-700",
    REJECTED: "bg-red-50 text-red-700",
    NOT_STARTED: "bg-slate-100 text-slate-600",
  };
  const labels: Record<CustomerResult["kycStatus"], string> = {
    APPROVED: "KYC verified",
    PENDING: "KYC pending",
    REJECTED: "KYC rejected",
    NOT_STARTED: "KYC not started",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${styles[status]}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {labels[status]}
    </span>
  );
}