"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { readAuth, type AuthSession } from "@/lib/auth";
import { timeAgo } from "@/lib/format";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

type NotificationType = "TRANSACTION" | "SECURITY" | "KYC" | "SUPPORT" | "SYSTEM";

type AppNotification = {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
  href?: string;
};

const TYPE_STYLES: Record<NotificationType, { bg: string; fg: string; label: string }> = {
  TRANSACTION: { bg: "bg-emerald-50", fg: "text-emerald-700", label: "Transaction" },
  SECURITY: { bg: "bg-red-50", fg: "text-red-700", label: "Security" },
  KYC: { bg: "bg-amber-50", fg: "text-amber-700", label: "KYC" },
  SUPPORT: { bg: "bg-blue-50", fg: "text-blue-700", label: "Support" },
  SYSTEM: { bg: "bg-slate-100", fg: "text-slate-600", label: "System" },
};

export default function NotificationsPage() {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"ALL" | "UNREAD">("ALL");

  const load = useCallback(async (current: AuthSession) => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${API_URL}/api/notifications`, {
        headers: { Authorization: `Bearer ${current.token}` },
      });

      if (!res.ok) throw new Error("Couldn't load your notifications.");

      const data = await res.json();
      const list: AppNotification[] = Array.isArray(data) ? data : data.items ?? [];
      setItems(list);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Couldn't load your notifications."
      );
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

  const unreadCount = useMemo(() => items.filter((n) => !n.read).length, [items]);

  const visible = useMemo(
    () => (tab === "UNREAD" ? items.filter((n) => !n.read) : items),
    [items, tab]
  );

  async function markRead(id: string) {
    if (!session) return;
    const target = items.find((n) => n.id === id);
    if (!target || target.read) return;

    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));

    try {
      await fetch(`${API_URL}/api/notifications/${id}/read`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.token}` },
      });
    } catch {
      /* optimistic — ignore network failure */
    }
  }

  async function markAllRead() {
    if (!session || unreadCount === 0) return;

    const previous = items;
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));

    try {
      const res = await fetch(`${API_URL}/api/notifications/read-all`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.token}` },
      });
      if (!res.ok) throw new Error();
    } catch {
      setItems(previous);
      setError("Couldn't mark all as read. Please try again.");
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Notifications</h1>
          <p className="mt-1 text-sm text-slate-500">
            Alerts about your account, security, and requests.
          </p>
        </div>

        {unreadCount > 0 ? (
          <button
            type="button"
            onClick={markAllRead}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Mark all as read
          </button>
        ) : null}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1">
        {(["ALL", "UNREAD"] as const).map((key) => {
          const active = tab === key;
          const count = key === "ALL" ? items.length : unreadCount;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${
                active
                  ? "bg-emerald-50 text-emerald-800"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              {key === "ALL" ? "All" : "Unread"}
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

      {/* Error */}
      {error ? (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <span className="mt-0.5 text-base leading-none">!</span>
          <div className="flex-1">
            <p>{error}</p>
            {session ? (
              <button
                type="button"
                onClick={() => load(session)}
                className="mt-2 text-xs font-semibold underline"
              >
                Try again
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* List */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <SkeletonList />
        ) : visible.length === 0 ? (
          <EmptyState tab={tab} />
        ) : (
          <ul className="divide-y divide-slate-100">
            {visible.map((n) => {
              const style = TYPE_STYLES[n.type] ?? TYPE_STYLES.SYSTEM;
              const body = (
                <>
                  <span
                    className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${style.bg} ${style.fg}`}
                  >
                    {style.label.slice(0, 2).toUpperCase()}
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <p
                        className={`truncate text-sm ${
                          n.read ? "font-medium text-slate-700" : "font-semibold text-slate-900"
                        }`}
                      >
                        {n.title}
                      </p>
                      <span className="shrink-0 text-xs text-slate-400">{timeAgo(n.createdAt)}</span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-slate-500">
                      {n.body}
                    </p>
                  </div>

                  {!n.read ? (
                    <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
                  ) : null}
                </>
              );

              return (
                <li key={n.id}>
                  {n.href ? (
                    <Link
                      href={n.href}
                      onClick={() => markRead(n.id)}
                      className={`flex gap-4 px-5 py-4 transition hover:bg-slate-50 ${
                        !n.read ? "bg-emerald-50/40" : ""
                      }`}
                    >
                      {body}
                    </Link>
                  ) : (
                    <div
                      onClick={() => markRead(n.id)}
                      className={`flex gap-4 px-5 py-4 transition ${!n.read ? "bg-emerald-50/40" : ""}`}
                    >
                      {body}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

/* ---------- helpers ---------- */

function SkeletonList() {
  return (
    <ul className="divide-y divide-slate-100">
      {[0, 1, 2, 3].map((i) => (
        <li key={i} className="flex animate-pulse gap-4 px-5 py-4">
          <div className="h-9 w-9 shrink-0 rounded-xl bg-slate-100" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 w-2/5 rounded bg-slate-100" />
            <div className="h-3 w-4/5 rounded bg-slate-100" />
          </div>
        </li>
      ))}
    </ul>
  );
}

function EmptyState({ tab }: { tab: "ALL" | "UNREAD" }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.6}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-6 w-6"
          aria-hidden
        >
          <path d="M18 8.5a6 6 0 1 0-12 0c0 5-2 6.5-2 6.5h16s-2-1.5-2-6.5Z" />
          <path d="M10.3 19a2 2 0 0 0 3.4 0" />
        </svg>
      </span>
      <p className="mt-4 text-sm font-semibold text-slate-800">
        {tab === "UNREAD" ? "You're all caught up" : "No notifications yet"}
      </p>
      <p className="mt-1 max-w-xs text-sm text-slate-500">
        {tab === "UNREAD"
          ? "There are no unread notifications on your account."
          : "When something happens on your account, you'll see it here."}
      </p>
    </div>
  );
}