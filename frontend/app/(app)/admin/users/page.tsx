"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { readAuth, roleLabel, type AuthSession, type Role } from "@/lib/auth";
import { timeAgo } from "@/lib/format";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

type UserRow = {
  id: string;
  fullName: string;
  email: string;
  role: Role;
  status: "ACTIVE" | "SUSPENDED" | "PENDING";
  createdAt: string;
  lastLoginAt?: string;
};

const STATUS_STYLES: Record<UserRow["status"], string> = {
  ACTIVE: "bg-emerald-50 text-emerald-700",
  SUSPENDED: "bg-red-50 text-red-700",
  PENDING: "bg-amber-50 text-amber-700",
};

export default function AdminUsersPage() {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [roleFilter, setRoleFilter] = useState<Role | "ALL">("ALL");
  const [query, setQuery] = useState("");

  const load = useCallback(async (current: AuthSession) => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${API_URL}/api/admin/users`, {
        headers: { Authorization: `Bearer ${current.token}` },
      });
      if (!res.ok) throw new Error("Couldn't load users.");
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : data.items ?? []);
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
    return users.filter((u) => {
      if (roleFilter !== "ALL" && u.role !== roleFilter) return false;
      if (!query.trim()) return true;
      const q = query.toLowerCase();
      return u.fullName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
    });
  }, [users, roleFilter, query]);

  if (!session) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Users</h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage customers, tellers, and administrators.
          </p>
        </div>
        <Link
          href="/admin/users/new"
          className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-500"
        >
          Add user
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1">
          {(["ALL", "CUSTOMER", "TELLER", "ADMIN"] as const).map((key) => {
            const active = roleFilter === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setRoleFilter(key)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  active ? "bg-emerald-50 text-emerald-800" : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                {key === "ALL" ? "All" : roleLabel(key)}
              </button>
            );
          })}
        </div>

        <div className="relative ml-auto w-full sm:w-72">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name or email"
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
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
            <p className="text-sm font-semibold text-slate-800">No users found</p>
            <p className="mt-1 text-sm text-slate-500">Try adjusting your filters.</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {filtered.map((u) => (
              <li key={u.id}>
                <Link
                  href={`/admin/users/${u.id}`}
                  className="flex flex-wrap items-center gap-4 px-5 py-4 transition hover:bg-slate-50"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">
                    {u.fullName
                      .split(" ")
                      .slice(0, 2)
                      .map((p) => p[0])
                      .join("")
                      .toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {u.fullName}
                      </p>
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${STATUS_STYLES[u.status]}`}
                      >
                        {u.status}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-slate-500">
                      {u.email} · {roleLabel(u.role)}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-slate-400">
                    {u.lastLoginAt ? `Last login ${timeAgo(u.lastLoginAt)}` : "Never logged in"}
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