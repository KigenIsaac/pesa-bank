"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { readAuth, roleLabel, type AuthSession } from "@/lib/auth";
import { fullDate } from "@/lib/format";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

type AuditEntry = {
  id: string;
  actorName: string;
  actorRole: string;
  action: string;
  target: string;
  ip: string;
  createdAt: string;
};

const ACTION_STYLES: Record<string, string> = {
  LOGIN: "bg-emerald-50 text-emerald-700",
  LOGOUT: "bg-slate-100 text-slate-600",
  KYC_APPROVED: "bg-emerald-50 text-emerald-700",
  KYC_REJECTED: "bg-red-50 text-red-700",
  TRANSACTION_REVERSED: "bg-amber-50 text-amber-700",
  USER_SUSPENDED: "bg-red-50 text-red-700",
  USER_ROLE_CHANGED: "bg-blue-50 text-blue-700",
  ACCOUNT_FROZEN: "bg-amber-50 text-amber-700",
  DEFAULT: "bg-slate-100 text-slate-600",
};

export default function AdminAuditPage() {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [items, setItems] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");

  const load = useCallback(async (current: AuthSession) => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${API_URL}/api/admin/audit?limit=200`, {
        headers: { Authorization: `Bearer ${current.token}` },
      });
      if (!res.ok) throw new Error("Couldn't load audit logs.");
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
    if (!query.trim()) return items;
    const q = query.toLowerCase();
    return items.filter(
      (e) =>
        e.actorName.toLowerCase().includes(q) ||
        e.action.toLowerCase().includes(q) ||
        e.target.toLowerCase().includes(q)
    );
  }, [items, query]);

  if (!session) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Audit log</h1>
        <p className="mt-1 text-sm text-slate-500">
          Every privileged action is recorded for compliance and security.
        </p>
      </div>

      <div className="relative w-full sm:w-80">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search actor, action, or target"
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
        />
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <ul className="divide-y divide-slate-100">
            {[0, 1, 2, 3, 4].map((i) => (
              <li key={i} className="animate-pulse px-5 py-4">
                <div className="h-3.5 w-1/3 rounded bg-slate-100" />
                <div className="mt-2 h-3 w-1/2 rounded bg-slate-100" />
              </li>
            ))}
          </ul>
        ) : filtered.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <p className="text-sm font-semibold text-slate-800">No audit entries</p>
            <p className="mt-1 text-sm text-slate-500">
              {query ? "Nothing matches your search." : "Nothing recorded yet."}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {filtered.map((e) => (
              <li key={e.id} className="flex flex-wrap items-start gap-4 px-5 py-4">
                <span
                  className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                    ACTION_STYLES[e.action] ?? ACTION_STYLES.DEFAULT
                  }`}
                >
                  {e.action.replace(/_/g, " ")}
                </span>

                <div className="min-w-0 flex-1">
                  <p className="text-sm text-slate-800">
                    <span className="font-semibold">{e.actorName}</span>{" "}
                    <span className="text-slate-500">
                      ({roleLabel(e.actorRole)})
                    </span>{" "}
                    → <span className="font-medium">{e.target}</span>
                  </p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    IP {e.ip} · {fullDate(e.createdAt)}
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