"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { readAuth, type AuthSession } from "@/lib/auth";
import { timeAgo } from "@/lib/format";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

type KycStatus = "PENDING" | "APPROVED" | "REJECTED";

type KycSubmission = {
  id: string;
  customerName: string;
  email: string;
  idType: string;
  idNumber: string;
  kraPin: string;
  submittedAt: string;
  status: KycStatus;
};

const STATUS_STYLES: Record<KycStatus, string> = {
  PENDING: "bg-amber-50 text-amber-700",
  APPROVED: "bg-emerald-50 text-emerald-700",
  REJECTED: "bg-red-50 text-red-700",
};

export default function AdminKycPage() {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [items, setItems] = useState<KycSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState<KycStatus | "ALL">("PENDING");
  const [query, setQuery] = useState("");

  const load = useCallback(async (current: AuthSession) => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${API_URL}/api/admin/kyc`, {
        headers: { Authorization: `Bearer ${current.token}` },
      });
      if (!res.ok) throw new Error("Couldn't load KYC submissions.");
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

  const filtered = useMemo(() => {
    return items.filter((k) => {
      if (statusFilter !== "ALL" && k.status !== statusFilter) return false;
      if (!query.trim()) return true;
      const q = query.toLowerCase();
      return (
        k.customerName.toLowerCase().includes(q) ||
        k.email.toLowerCase().includes(q) ||
        k.idNumber.toLowerCase().includes(q) ||
        k.kraPin.toLowerCase().includes(q)
      );
    });
  }, [items, statusFilter, query]);

  const counts = useMemo(() => {
    return {
      ALL: items.length,
      PENDING: items.filter((k) => k.status === "PENDING").length,
      APPROVED: items.filter((k) => k.status === "APPROVED").length,
      REJECTED: items.filter((k) => k.status === "REJECTED").length,
    };
  }, [items]);

  if (!session) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">KYC review</h1>
        <p className="mt-1 text-sm text-slate-500">
          Review customer identity submissions and approve or reject them.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1">
          {(["PENDING", "APPROVED", "REJECTED", "ALL"] as const).map((key) => {
            const active = statusFilter === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setStatusFilter(key)}
                className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  active ? "bg-emerald-50 text-emerald-800" : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                {key === "ALL" ? "All" : key.charAt(0) + key.slice(1).toLowerCase()}
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                    active ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-600"
                  }`}
                >
                  {counts[key]}
                </span>
              </button>
            );
          })}
        </div>

        <div className="relative ml-auto w-full sm:w-72">
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
            placeholder="Search name, email, ID, KRA"
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
          />
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <ul className="divide-y divide-slate-100">
            {[0, 1, 2, 3].map((i) => (
              <li key={i} className="animate-pulse px-5 py-4">
                <div className="h-3.5 w-1/3 rounded bg-slate-100" />
                <div className="mt-2 h-3 w-1/4 rounded bg-slate-100" />
              </li>
            ))}
          </ul>
        ) : filtered.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <p className="text-sm font-semibold text-slate-800">No submissions</p>
            <p className="mt-1 text-sm text-slate-500">
              {statusFilter === "PENDING"
                ? "There are no KYC submissions waiting for review."
                : "Nothing matches your filter."}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {filtered.map((k) => (
              <li key={k.id}>
                <Link
                  href={`/admin/kyc/${k.id}`}
                  className="flex flex-wrap items-center gap-4 px-5 py-4 transition hover:bg-slate-50"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {k.customerName}
                      </p>
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${STATUS_STYLES[k.status]}`}
                      >
                        {k.status}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {k.email} · {k.idType} {k.idNumber} · KRA {k.kraPin}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-slate-400">
                    {timeAgo(k.submittedAt)}
                  </span>
                  <span className="shrink-0 text-slate-300">›</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}