"use client";

import { useEffect, useState } from "react";
import { readAuth, type AuthSession } from "@/lib/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

const REPORTS = [
  {
    id: "daily-transactions",
    title: "Daily transactions",
    description: "All deposits, withdrawals, and transfers for a given day.",
    icon: "receipt",
  },
  {
    id: "customer-balances",
    title: "Customer balances",
    description: "Account balances across all customers.",
    icon: "wallet",
  },
  {
    id: "aml-transactions",
    title: "AML flagged transactions",
    description: "Transactions flagged by the AML monitoring rules.",
    icon: "shield",
  },
  {
    id: "teller-activity",
    title: "Teller activity",
    description: "Cash operations performed by each teller.",
    icon: "cash",
  },
  {
    id: "kyc-summary",
    title: "KYC summary",
    description: "New, pending, approved, and rejected KYC submissions.",
    icon: "clipboard",
  },
  {
    id: "branch-summary",
    title: "Branch summary",
    description: "Activity and balances grouped by branch.",
    icon: "grid",
  },
];

export default function AdminReportsPage() {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [downloading, setDownloading] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    setSession(readAuth());
    const today = new Date();
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    setFromDate(weekAgo.toISOString().slice(0, 10));
    setToDate(today.toISOString().slice(0, 10));
  }, []);

  async function download(reportId: string, format: "csv" | "pdf") {
    if (!session) return;
    setDownloading(`${reportId}-${format}`);
    setError("");

    try {
      const url = new URL(`${API_URL}/api/admin/reports/${reportId}`);
      url.searchParams.set("format", format);
      if (fromDate) url.searchParams.set("from", fromDate);
      if (toDate) url.searchParams.set("to", toDate);

      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${session.token}` },
      });

      if (!res.ok) throw new Error("Couldn't generate this report.");

      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = `${reportId}-${fromDate}-to-${toDate}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(objectUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setDownloading(null);
    }
  }

  if (!session) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Reports</h1>
        <p className="mt-1 text-sm text-slate-500">
          Generate and download operational and compliance reports.
        </p>
      </div>

      {/* Date range */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">Date range</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">From</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">To</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
            />
          </div>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {/* Reports grid */}
      <div className="grid gap-4 sm:grid-cols-2">
        {REPORTS.map((r) => (
          <div
            key={r.id}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <h3 className="text-sm font-semibold text-slate-900">{r.title}</h3>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">{r.description}</p>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => download(r.id, "csv")}
                disabled={downloading === `${r.id}-csv`}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
              >
                {downloading === `${r.id}-csv` ? "Preparing…" : "Download CSV"}
              </button>
              <button
                type="button"
                onClick={() => download(r.id, "pdf")}
                disabled={downloading === `${r.id}-pdf`}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
              >
                {downloading === `${r.id}-pdf` ? "Preparing…" : "Download PDF"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}