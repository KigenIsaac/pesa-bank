"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { readAuth, roleLabel, type AuthSession, type Role } from "@/lib/auth";
import { fullDate } from "@/lib/format";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

type UserDetail = {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  role: Role;
  status: "ACTIVE" | "SUSPENDED" | "PENDING";
  createdAt: string;
  lastLoginAt?: string;
  kycStatus?: "NOT_STARTED" | "PENDING" | "APPROVED" | "REJECTED";
  accountsCount?: number;
};

export default function AdminUserDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [session, setSession] = useState<AuthSession | null>(null);
  const [user, setUser] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [roleDraft, setRoleDraft] = useState<Role>("CUSTOMER");
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState("");
  const [actionMessage, setActionMessage] = useState("");

  const load = useCallback(
    async (current: AuthSession) => {
      setLoading(true);
      setError("");

      try {
        const res = await fetch(`${API_URL}/api/admin/users/${params.id}`, {
          headers: { Authorization: `Bearer ${current.token}` },
        });
        if (!res.ok) throw new Error("Couldn't load this user.");
        const data: UserDetail = await res.json();
        setUser(data);
        setRoleDraft(data.role);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      } finally {
        setLoading(false);
      }
    },
    [params.id]
  );

  useEffect(() => {
    const current = readAuth();
    if (!current) return;
    setSession(current);
    load(current);
  }, [load]);

  async function updateRole() {
    if (!session || !user || roleDraft === user.role) return;

    setSaving(true);
    setActionError("");
    setActionMessage("");

    try {
      const res = await fetch(`${API_URL}/api/admin/users/${user.id}/role`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.token}`,
        },
        body: JSON.stringify({ role: roleDraft }),
      });
      if (!res.ok) throw new Error("Couldn't update role.");
      setUser({ ...user, role: roleDraft });
      setActionMessage("Role updated.");
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleSuspend() {
    if (!session || !user) return;

    const nextStatus = user.status === "SUSPENDED" ? "ACTIVE" : "SUSPENDED";
    setSaving(true);
    setActionError("");
    setActionMessage("");

    try {
      const res = await fetch(`${API_URL}/api/admin/users/${user.id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.token}`,
        },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!res.ok) throw new Error("Couldn't update user status.");
      setUser({ ...user, status: nextStatus });
      setActionMessage(nextStatus === "SUSPENDED" ? "User suspended." : "User reactivated.");
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  async function resetPassword() {
    if (!session || !user) return;

    setSaving(true);
    setActionError("");
    setActionMessage("");

    try {
      const res = await fetch(`${API_URL}/api/admin/users/${user.id}/reset-password`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.token}` },
      });
      if (!res.ok) throw new Error("Couldn't send reset link.");
      setActionMessage("Password reset email sent.");
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  if (!session) return null;

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-1/3 animate-pulse rounded bg-slate-100" />
        <div className="h-64 animate-pulse rounded-2xl bg-slate-100" />
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        {error || "User not found."}
      </div>
    );
  }

  const isSelf = user.email === session.email;

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={() => router.push("/admin/users")}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition hover:text-slate-800"
      >
        ← Back to users
      </button>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-600 text-lg font-black text-white">
            {user.fullName
              .split(" ")
              .slice(0, 2)
              .map((p) => p[0])
              .join("")
              .toUpperCase()}
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">{user.fullName}</h1>
            <p className="mt-0.5 text-sm text-slate-500">{user.email}</p>
          </div>
        </div>
        <StatusBadge status={user.status} />
      </div>

      {actionError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {actionError}
        </div>
      ) : null}
      {actionMessage ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          {actionMessage}
        </div>
      ) : null}

      {/* Profile details */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">Profile</h2>
        <dl className="mt-4 grid gap-x-6 gap-y-3 sm:grid-cols-2">
          <Row label="Full name" value={user.fullName} />
          <Row label="Email" value={user.email} />
          <Row label="Phone" value={user.phone} />
          <Row label="Role" value={roleLabel(user.role)} />
          <Row label="Joined" value={fullDate(user.createdAt)} />
          <Row
            label="Last login"
            value={user.lastLoginAt ? fullDate(user.lastLoginAt) : "Never"}
          />
          {user.kycStatus ? <Row label="KYC status" value={user.kycStatus} /> : null}
          {typeof user.accountsCount === "number" ? (
            <Row label="Accounts" value={String(user.accountsCount)} />
          ) : null}
        </dl>
      </div>

      {/* Role management */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">Role</h2>
        <p className="mt-1 text-xs text-slate-500">
          Changes take effect on the user&apos;s next login.
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <select
            value={roleDraft}
            onChange={(e) => setRoleDraft(e.target.value as Role)}
            disabled={isSelf}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 disabled:cursor-not-allowed disabled:bg-slate-50"
          >
            <option value="CUSTOMER">Customer</option>
            <option value="TELLER">Teller</option>
            <option value="ADMIN">Administrator</option>
          </select>

          <button
            type="button"
            onClick={updateRole}
            disabled={isSelf || saving || roleDraft === user.role}
            className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Save role
          </button>

          {isSelf ? (
            <p className="text-xs text-slate-400">You can&apos;t change your own role.</p>
          ) : null}
        </div>
      </div>

      {/* Account actions */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">Account actions</h2>

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={resetPassword}
            disabled={saving}
            className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
          >
            Send password reset
          </button>

          <button
            type="button"
            onClick={toggleSuspend}
            disabled={isSelf || saving}
            className={`rounded-xl px-5 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
              user.status === "SUSPENDED"
                ? "bg-emerald-600 text-white hover:bg-emerald-500"
                : "border border-red-200 bg-white text-red-700 hover:bg-red-50"
            }`}
          >
            {user.status === "SUSPENDED" ? "Reactivate user" : "Suspend user"}
          </button>

          {isSelf ? (
            <p className="text-xs text-slate-400">
              You can&apos;t suspend your own account.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="mt-0.5 text-sm text-slate-800">{value || "—"}</dd>
    </div>
  );
}

function StatusBadge({ status }: { status: UserDetail["status"] }) {
  const styles = {
    ACTIVE: "bg-emerald-50 text-emerald-700",
    SUSPENDED: "bg-red-50 text-red-700",
    PENDING: "bg-amber-50 text-amber-700",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${styles[status]}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}