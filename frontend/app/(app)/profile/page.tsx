"use client";

import { useEffect, useMemo, useState } from "react";
import { readAuth, roleLabel, type AuthSession } from "@/lib/auth";
import { initialsFrom } from "@/lib/format";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

type ProfileFields = {
  fullName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  physicalAddress: string;
  county: string;
  postalAddress: string;
};

type KycSummary = {
  status: "NOT_STARTED" | "PENDING" | "APPROVED" | "REJECTED";
  idType?: string;
  idNumber?: string;
  kraPin?: string;
};

const emptyProfile: ProfileFields = {
  fullName: "",
  email: "",
  phone: "",
  dateOfBirth: "",
  physicalAddress: "",
  county: "",
  postalAddress: "",
};

export default function ProfilePage() {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [profile, setProfile] = useState<ProfileFields>(emptyProfile);
  const [kyc, setKyc] = useState<KycSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Password change
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwErrors, setPwErrors] = useState<Record<string, string>>({});
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMessage, setPwMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  /* Load */
  useEffect(() => {
    const current = readAuth();
    if (!current) return;

    setSession(current);
    setProfile((p) => ({
      ...p,
      fullName: current.name ?? "",
      email: current.email,
    }));

    let cancelled = false;
    setLoading(true);

    fetch(`${API_URL}/api/me`, {
      headers: { Authorization: `Bearer ${current.token}` },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        setProfile({
          fullName: data.fullName ?? current.name ?? "",
          email: data.email ?? current.email,
          phone: data.phone ?? "",
          dateOfBirth: data.dateOfBirth ?? "",
          physicalAddress: data.physicalAddress ?? "",
          county: data.county ?? "",
          postalAddress: data.postalAddress ?? "",
        });
        if (data.kyc) setKyc(data.kyc as KycSummary);
      })
      .catch(() => {
        /* offline — keep session values */
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  /* Auto-dismiss success */
  useEffect(() => {
    if (!saveSuccess) return;
    const t = setTimeout(() => setSaveSuccess(false), 3000);
    return () => clearTimeout(t);
  }, [saveSuccess]);

  const initials = useMemo(
    () => (session ? initialsFrom(session.name || session.email) : "?"),
    [session]
  );

  function update<K extends keyof ProfileFields>(key: K, value: ProfileFields[K]) {
    setProfile((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!session) return;

    setSaveError("");
    setSaveSuccess(false);

    if (!profile.fullName.trim()) {
      setSaveError("Full name is required.");
      return;
    }
    if (!profile.phone.trim()) {
      setSaveError("Phone number is required.");
      return;
    }

    setSaving(true);

    try {
      const res = await fetch(`${API_URL}/api/me`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.token}`,
        },
        body: JSON.stringify({
          fullName: profile.fullName.trim(),
          phone: profile.phone.trim(),
          dateOfBirth: profile.dateOfBirth || null,
          physicalAddress: profile.physicalAddress.trim(),
          county: profile.county,
          postalAddress: profile.postalAddress.trim(),
        }),
      });

      if (!res.ok) {
        throw new Error(
          res.status === 400
            ? "Some details were rejected. Please check and try again."
            : "Couldn't save your changes right now."
        );
      }

      setSaveSuccess(true);
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : "Something went wrong. Please try again."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handlePasswordChange(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!session) return;

    const next: Record<string, string> = {};
    if (!currentPassword) next.currentPassword = "Enter your current password.";
    if (!newPassword) next.newPassword = "Enter a new password.";
    else if (newPassword.length < 8) next.newPassword = "Use at least 8 characters.";
    else if (!/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/\d/.test(newPassword)) {
      next.newPassword = "Include uppercase, lowercase, and a number.";
    }
    if (confirmPassword !== newPassword) next.confirmPassword = "Passwords do not match.";

    setPwErrors(next);
    setPwMessage(null);
    if (Object.keys(next).length > 0) return;

    setPwSaving(true);

    try {
      const res = await fetch(`${API_URL}/api/me/password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.token}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      if (res.status === 401) {
        setPwMessage({ kind: "err", text: "Your current password is incorrect." });
        return;
      }
      if (!res.ok) {
        throw new Error("Couldn't update your password right now.");
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPwMessage({ kind: "ok", text: "Password updated successfully." });
    } catch (err) {
      setPwMessage({
        kind: "err",
        text: err instanceof Error ? err.message : "Something went wrong.",
      });
    } finally {
      setPwSaving(false);
    }
  }

  const inputClass = (error?: string) =>
    [
      "w-full rounded-xl border bg-white px-4 py-3 text-sm text-slate-900 outline-none transition",
      "placeholder:text-slate-400 focus:ring-4",
      error
        ? "border-red-300 focus:border-red-500 focus:ring-red-500/10"
        : "border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/10",
    ].join(" ");

  if (!session) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Profile</h1>
        <p className="mt-1 text-sm text-slate-500">
          Manage your personal details and account security.
        </p>
      </div>

      {/* Identity card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center gap-5">
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-600 text-xl font-black text-white">
            {initials}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-semibold text-slate-900">
              {profile.fullName || session.email.split("@")[0]}
            </p>
            <p className="truncate text-sm text-slate-500">{profile.email}</p>
            <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              {roleLabel(session.role)}
            </span>
          </div>
        </div>
      </div>

      {/* KYC summary — customers only */}
      {session.role === "CUSTOMER" && kyc ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-slate-900">KYC verification</h2>
              <p className="mt-1 text-xs text-slate-500">
                Verified details are locked and can only be changed by the bank.
              </p>
            </div>
            <KycBadge status={kyc.status} />
          </div>

          <dl className="mt-5 grid gap-4 sm:grid-cols-3">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
                ID type
              </dt>
              <dd className="mt-1 text-sm font-medium text-slate-800">
                {kyc.idType ?? "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
                ID number
              </dt>
              <dd className="mt-1 text-sm font-medium text-slate-800">
                {maskValue(kyc.idNumber)}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
                KRA PIN
              </dt>
              <dd className="mt-1 text-sm font-medium text-slate-800">{kyc.kraPin ?? "—"}</dd>
            </div>
          </dl>

          {kyc.status === "REJECTED" ? (
            <div className="mt-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm text-red-700">
              <span className="mt-0.5 text-base leading-none">!</span>
              <p>
                Your verification was rejected. Please contact support or visit a branch to
                resolve this.
              </p>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Personal details */}
      <form
        onSubmit={handleSave}
        className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <h2 className="text-base font-semibold text-slate-900">Personal details</h2>
        <p className="mt-1 text-xs text-slate-500">
          Keep these up to date. We may use them to contact you about your account.
        </p>

        <div className="mt-5 space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Full name</label>
              <input
                type="text"
                value={profile.fullName}
                onChange={(e) => update("fullName", e.target.value)}
                disabled={loading}
                className={inputClass()}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Email address</label>
              <input
                type="email"
                value={profile.email}
                readOnly
                disabled
                className="w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500"
              />
              <p className="mt-1.5 text-xs text-slate-400">
                Contact support to change your email.
              </p>
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Phone number</label>
              <input
                type="tel"
                value={profile.phone}
                onChange={(e) => update("phone", e.target.value)}
                placeholder="0712 345 678"
                disabled={loading}
                className={inputClass()}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Date of birth</label>
              <input
                type="date"
                value={profile.dateOfBirth}
                onChange={(e) => update("dateOfBirth", e.target.value)}
                disabled={loading}
                className={inputClass()}
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Physical address
            </label>
            <input
              type="text"
              value={profile.physicalAddress}
              onChange={(e) => update("physicalAddress", e.target.value)}
              placeholder="e.g. Kilimani, Argwings Kodhek Road"
              disabled={loading}
              className={inputClass()}
            />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">County</label>
              <input
                type="text"
                value={profile.county}
                onChange={(e) => update("county", e.target.value)}
                placeholder="Nairobi"
                disabled={loading}
                className={inputClass()}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Postal address
              </label>
              <input
                type="text"
                value={profile.postalAddress}
                onChange={(e) => update("postalAddress", e.target.value)}
                placeholder="P.O. Box 12345-00100"
                disabled={loading}
                className={inputClass()}
              />
            </div>
          </div>
        </div>

        {saveError ? (
          <div className="mt-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm text-red-700">
            <span className="mt-0.5 text-base leading-none">!</span>
            <span>{saveError}</span>
          </div>
        ) : null}

        {saveSuccess ? (
          <div className="mt-5 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-sm text-emerald-800">
            <span className="mt-0.5 text-base leading-none">✓</span>
            <span>Your details have been saved.</span>
          </div>
        ) : null}

        <div className="mt-6 flex justify-end">
          <button
            type="submit"
            disabled={saving || loading}
            className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>

      {/* Security */}
      <form
        onSubmit={handlePasswordChange}
        className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <h2 className="text-base font-semibold text-slate-900">Security</h2>
        <p className="mt-1 text-xs text-slate-500">
          Use a strong password you don&apos;t use anywhere else.
        </p>

        <div className="mt-5 space-y-5">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Current password
            </label>
            <input
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className={inputClass(pwErrors.currentPassword)}
            />
            {pwErrors.currentPassword ? (
              <p className="mt-1.5 text-xs text-red-600">{pwErrors.currentPassword}</p>
            ) : null}
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                New password
              </label>
              <input
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className={inputClass(pwErrors.newPassword)}
              />
              {pwErrors.newPassword ? (
                <p className="mt-1.5 text-xs text-red-600">{pwErrors.newPassword}</p>
              ) : null}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Confirm new password
              </label>
              <input
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={inputClass(pwErrors.confirmPassword)}
              />
              {pwErrors.confirmPassword ? (
                <p className="mt-1.5 text-xs text-red-600">{pwErrors.confirmPassword}</p>
              ) : null}
            </div>
          </div>
        </div>

        {pwMessage ? (
          <div
            className={`mt-5 flex items-start gap-3 rounded-xl border p-3.5 text-sm ${
              pwMessage.kind === "ok"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            <span className="mt-0.5 text-base leading-none">
              {pwMessage.kind === "ok" ? "✓" : "!"}
            </span>
            <span>{pwMessage.text}</span>
          </div>
        ) : null}

        <div className="mt-6 flex justify-end">
          <button
            type="submit"
            disabled={pwSaving}
            className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {pwSaving ? "Updating…" : "Update password"}
          </button>
        </div>
      </form>
    </div>
  );
}

/* ---------- helpers ---------- */

function maskValue(value?: string) {
  if (!value) return "—";
  if (value.length <= 4) return value;
  return `${"•".repeat(Math.max(0, value.length - 4))}${value.slice(-4)}`;
}

function KycBadge({ status }: { status: KycSummary["status"] }) {
  const styles: Record<KycSummary["status"], string> = {
    APPROVED: "bg-emerald-50 text-emerald-700",
    PENDING: "bg-amber-50 text-amber-700",
    REJECTED: "bg-red-50 text-red-700",
    NOT_STARTED: "bg-slate-100 text-slate-600",
  };
  const labels: Record<KycSummary["status"], string> = {
    APPROVED: "Verified",
    PENDING: "Pending review",
    REJECTED: "Rejected",
    NOT_STARTED: "Not started",
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