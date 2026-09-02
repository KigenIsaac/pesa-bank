"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { readAuth, roleLabel, type AuthSession } from "@/lib/auth";
import { fullDate, timeAgo } from "@/lib/format";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

type TicketStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
type TicketPriority = "LOW" | "NORMAL" | "HIGH";

type TicketMessage = {
  id: string;
  author: string;
  body: string;
  createdAt: string;
  fromStaff: boolean;
};

type Ticket = {
  id: string;
  reference: string;
  subject: string;
  category: string;
  priority: TicketPriority;
  status: TicketStatus;
  createdAt: string;
  updatedAt: string;
  messages: TicketMessage[];
};

const CATEGORIES = [
  "Account",
  "Transaction",
  "KYC verification",
  "Card",
  "Loan",
  "Other",
];

const STATUS_STYLES: Record<TicketStatus, string> = {
  OPEN: "bg-amber-50 text-amber-700",
  IN_PROGRESS: "bg-blue-50 text-blue-700",
  RESOLVED: "bg-emerald-50 text-emerald-700",
  CLOSED: "bg-slate-100 text-slate-600",
};

const STATUS_LABELS: Record<TicketStatus, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In progress",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
};

export default function SupportPage() {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [view, setView] = useState<"list" | "new">("list");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // New ticket form
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("Account");
  const [priority, setPriority] = useState<TicketPriority>("NORMAL");
  const [message, setMessage] = useState("");
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // Reply
  const [reply, setReply] = useState("");
  const [replying, setReplying] = useState(false);

  const load = useCallback(async (current: AuthSession) => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${API_URL}/api/support/tickets`, {
        headers: { Authorization: `Bearer ${current.token}` },
      });

      if (!res.ok) throw new Error("Couldn't load your support tickets.");

      const data = await res.json();
      const list: Ticket[] = Array.isArray(data) ? data : data.items ?? [];
      setTickets(list);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Couldn't load your support tickets."
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

  const selected = useMemo(
    () => tickets.find((t) => t.id === selectedId) ?? null,
    [tickets, selectedId]
  );

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!session) return;

    const next: Record<string, string> = {};
    if (!subject.trim()) next.subject = "Give your request a short title.";
    if (!message.trim()) next.message = "Describe the issue you're facing.";
    else if (message.trim().length < 15) next.message = "Add a little more detail.";

    setFormErrors(next);
    if (Object.keys(next).length > 0) return;

    setSubmitting(true);

    try {
      const res = await fetch(`${API_URL}/api/support/tickets`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.token}`,
        },
        body: JSON.stringify({
          subject: subject.trim(),
          category,
          priority,
          message: message.trim(),
        }),
      });

      if (!res.ok) throw new Error("Couldn't create your ticket. Please try again.");

      const created: Ticket = await res.json();
      setTickets((prev) => [created, ...prev]);
      setSubject("");
      setCategory("Account");
      setPriority("NORMAL");
      setMessage("");
      setFormErrors({});
      setView("list");
      setSelectedId(created.id);
    } catch (err) {
      setFormErrors({
        form: err instanceof Error ? err.message : "Something went wrong.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReply(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!session || !selected || !reply.trim()) return;

    setReplying(true);

    try {
      const res = await fetch(`${API_URL}/api/support/tickets/${selected.id}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.token}`,
        },
        body: JSON.stringify({ body: reply.trim() }),
      });

      if (!res.ok) throw new Error("Couldn't send your reply.");

      const created: TicketMessage = await res.json();
      setTickets((prev) =>
        prev.map((t) =>
          t.id === selected.id
            ? {
                ...t,
                status: t.status === "RESOLVED" || t.status === "CLOSED" ? "OPEN" : t.status,
                updatedAt: new Date().toISOString(),
                messages: [...t.messages, created],
              }
            : t
        )
      );
      setReply("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setReplying(false);
    }
  }

  const inputClass = (hasError?: string) =>
    [
      "w-full rounded-xl border bg-white px-4 py-3 text-sm text-slate-900 outline-none transition",
      "placeholder:text-slate-400 focus:ring-4",
      hasError
        ? "border-red-300 focus:border-red-500 focus:ring-red-500/10"
        : "border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/10",
    ].join(" ");

  if (!session) return null;

  /* ------------------------------- New ticket ------------------------------- */
  if (view === "new") {
    return (
      <div className="space-y-6">
        <div>
          <button
            type="button"
            onClick={() => setView("list")}
            className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition hover:text-slate-800"
          >
            ← Back to tickets
          </button>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">New support request</h1>
          <p className="mt-1 text-sm text-slate-500">
            Tell us what you need help with and we&apos;ll get back to you.
          </p>
        </div>

        <form
          onSubmit={handleCreate}
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div className="space-y-5">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Subject</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Transfer to M-Pesa failed"
                maxLength={120}
                className={inputClass(formErrors.subject)}
              />
              {formErrors.subject ? (
                <p className="mt-1.5 text-xs text-red-600">{formErrors.subject}</p>
              ) : null}
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Priority</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as TicketPriority)}
                  className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                >
                  <option value="LOW">Low — general question</option>
                  <option value="NORMAL">Normal — needs attention</option>
                  <option value="HIGH">High — money or access affected</option>
                </select>
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Message</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={6}
                placeholder="Include what happened, when, and any reference numbers."
                className={inputClass(formErrors.message)}
              />
              {formErrors.message ? (
                <p className="mt-1.5 text-xs text-red-600">{formErrors.message}</p>
              ) : null}
            </div>
          </div>

          {formErrors.form ? (
            <div className="mt-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm text-red-700">
              <span className="mt-0.5 text-base leading-none">!</span>
              <span>{formErrors.form}</span>
            </div>
          ) : null}

          <div className="mt-6 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setView("list")}
              className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {submitting ? "Submitting…" : "Submit request"}
            </button>
          </div>
        </form>
      </div>
    );
  }

  /* --------------------------------- Detail --------------------------------- */
  if (selected) {
    return (
      <div className="space-y-6">
        <div>
          <button
            type="button"
            onClick={() => setSelectedId(null)}
            className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition hover:text-slate-800"
          >
            ← Back to tickets
          </button>

          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-bold tracking-tight text-slate-900">
                {selected.subject}
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                {selected.reference} · {selected.category} · opened{" "}
                {timeAgo(selected.createdAt)}
              </p>
            </div>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLES[selected.status]}`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-current" />
              {STATUS_LABELS[selected.status]}
            </span>
          </div>
        </div>

        {/* Thread */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <ul className="divide-y divide-slate-100">
            {selected.messages.map((m) => (
              <li key={m.id} className="px-5 py-5">
                <div className="flex items-start gap-3">
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                      m.fromStaff
                        ? "bg-emerald-600 text-white"
                        : "bg-slate-200 text-slate-700"
                    }`}
                  >
                    {m.fromStaff ? "PB" : "You"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-2">
                      <span className="text-sm font-semibold text-slate-800">{m.author}</span>
                      {m.fromStaff ? (
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                          Support
                        </span>
                      ) : null}
                      <span className="text-xs text-slate-400">{fullDate(m.createdAt)}</span>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                      {m.body}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Reply */}
        {selected.status === "CLOSED" ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">
            This ticket is closed. If you still need help, please open a new request.
          </div>
        ) : (
          <form
            onSubmit={handleReply}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Add a reply
            </label>
            <textarea
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              rows={4}
              placeholder="Type your message…"
              className={inputClass()}
            />
            <div className="mt-4 flex justify-end">
              <button
                type="submit"
                disabled={replying || !reply.trim()}
                className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {replying ? "Sending…" : "Send reply"}
              </button>
            </div>
          </form>
        )}
      </div>
    );
  }

  /* ---------------------------------- List ---------------------------------- */
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Support</h1>
          <p className="mt-1 text-sm text-slate-500">
            Raise a request and track responses from our team.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setView("new")}
          className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-500"
        >
          New request
        </button>
      </div>

      {error ? (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <span className="mt-0.5 text-base leading-none">!</span>
          <div className="flex-1">
            <p>{error}</p>
            <button
              type="button"
              onClick={() => load(session)}
              className="mt-2 text-xs font-semibold underline"
            >
              Try again
            </button>
          </div>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <ul className="divide-y divide-slate-100">
            {[0, 1, 2].map((i) => (
              <li key={i} className="animate-pulse px-5 py-5">
                <div className="h-3.5 w-1/3 rounded bg-slate-100" />
                <div className="mt-3 h-3 w-2/3 rounded bg-slate-100" />
              </li>
            ))}
          </ul>
        ) : tickets.length === 0 ? (
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
                <circle cx="12" cy="12" r="9" />
                <circle cx="12" cy="12" r="3.5" />
              </svg>
            </span>
            <p className="mt-4 text-sm font-semibold text-slate-800">No support requests</p>
            <p className="mt-1 max-w-xs text-sm text-slate-500">
              If you need help with anything, open a request and we&apos;ll respond.
            </p>
            <button
              type="button"
              onClick={() => setView("new")}
              className="mt-5 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500"
            >
              New request
            </button>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {tickets.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(t.id)}
                  className="flex w-full items-start gap-4 px-5 py-4 text-left transition hover:bg-slate-50"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-sm font-semibold text-slate-900">
                        {t.subject}
                      </span>
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${STATUS_STYLES[t.status]}`}
                      >
                        {STATUS_LABELS[t.status]}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {t.reference} · {t.category} · updated {timeAgo(t.updatedAt)}
                    </p>
                  </div>
                  <span className="mt-1 shrink-0 text-slate-300">›</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {session.role !== "CUSTOMER" ? (
        <p className="text-xs text-slate-400">
          Signed in as {roleLabel(session.role)}. Staff tickets are handled by the operations desk.
        </p>
      ) : null}
    </div>
  );
}