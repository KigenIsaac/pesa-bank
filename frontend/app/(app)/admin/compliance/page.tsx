"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { readAuth, type AuthSession } from "@/lib/auth";
import { timeAgo } from "@/lib/format";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

type Alert = {
  id: string;
  type: "AML" | "PEP" | "SANCTIONS" | "STRUCTURING";
  severity: "LOW" | "MEDIUM" | "HIGH";
  title: string;
  detail: string;
  relatedTransactionId?: string;
  relatedUserId?: string;
  createdAt: string;
  status: "OPEN" | "INVESTIGATING" | "RESOLVED" | "DISMISSED";
};

const SEVERITY_STYLES = {
  LOW: "bg-slate-100 text-slate-700",
  MEDIUM: "bg-amber-50 text-amber-700",
  HIGH: "bg-red-50 text-red-700",
};

const STATUS_STYLES = {
  OPEN: "bg-amber-50 text-amber-700",
  INVESTIGATING: "bg-blue-50 text-blue-700",
  RESOLVED: "bg-emerald-50 text-emerald-700",
  DISMISSED: "bg-slate-100 text-slate-600",
};

export default function AdminCompliancePage() {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<Alert["status"] | "ALL">("OPEN");

  const load = useCallback(async (current: AuthSession) => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${API_URL}/api/admin/compliance/alerts`, {
        headers: { Authorization: `Bearer ${current.token}` },
      });
      if (!res.ok) throw new Error("Couldn't load compliance alerts.");
      const data = await res.json();
      setAlerts(Array.isArray(data) ? data : data.items ?? []);
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

  const visible =
    filter === "ALL" ? alerts : alerts.filter((a) => a.status === filter);

  if (!session) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Compliance</h1>
        <p className="mt-1 text-sm text-slate-500">
          AML, PEP, and sanctions alerts requiring review.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1">
          {(["OPEN", "INVESTIGATING", "RESOLVED", "DISMISSED", "ALL"] as const).map((key) => {
            const active = filter === key;
            const count =
              key === "ALL" ? alerts.length : alerts.filter((a) => a.status === key).length;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
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
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="space-y-3">
        {loading ? (
          <div className="h-32 animate-pulse rounded-2xl bg-slate-100" />
        ) : visible.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <p className="text-sm font-semibold text-slate-800">No alerts</p>
            <p className="mt-1 text-sm text-slate-500">
              {filter === "OPEN"
                ? "There are no open compliance alerts."
                : "Nothing matches your filter."}
            </p>
          </div>
        ) : (
          visible.map((a) => (
            <div
              key={a.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                      {a.type}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${SEVERITY_STYLES[a.severity]}`}
                    >
                      {a.severity}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${STATUS_STYLES[a.status]}`}
                    >
                      {a.status.replace("_", " ")}
                    </span>
                  </div>
                  <p className="mt-2 text-sm font-semibold text-slate-900">{a.title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-600">{a.detail}</p>
                  <p className="mt-1 text-xs text-slate-400">{timeAgo(a.createdAt)}</p>
                </div>

                <div className="flex flex-wrap gap-3">
                  {a.relatedTransactionId ? (
                    <Link
                      href={`/admin/transactions/${a.relatedTransactionId}`}
                      className="text-xs font-semibold text-emerald-700 hover:underline"
                    >
                      View transaction →
                    </Link>
                  ) : null}
                  {a.relatedUserId ? (
                    <Link
                      href={`/admin/users/${a.relatedUserId}`}
                      className="text-xs font-semibold text-emerald-700 hover:underline"
                    >
                      View user →
                    </Link>
                  ) : null}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}