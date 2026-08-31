"use client";

import { useEffect, useState } from "react";
import { readAuth, type AuthSession } from "@/lib/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

export default function CustomerSecurityPage() {
  const [session, setSession] = useState<AuthSession | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwErrors, setPwErrors] = useState<Record<string, string>>({});
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMessage, setPwMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const [twoFA, setTwoFA] = useState(false);
  const [savingTwoFA, setSavingTwoFA] = useState(false);
  const [twoFAMessage, setTwoFAMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    const current = readAuth();
    if (!current) return;
    setSession(current);

    fetch(`${API_URL}/api/customer/security`, {
      headers: { Authorization: `Bearer ${current.token}` },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) setTwoFA(Boolean(data.twoFactorEnabled));
      })
      .catch(() => {});
  }, []);

  async function changePassword(e: React.FormEvent<HTMLFormElement>) {
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
      if (!res.ok) throw new Error("Couldn't update your password.");

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPwMessage({ kind: "ok", text: "Password updated." });
    } catch (err) {
      setPwMessage({
        kind: "err",
        text: err instanceof Error ? err.message : "Something went wrong.",
      });
    } finally {
      setPwSaving(false);
    }
  }

  async function toggleTwoFA(next: boolean) {
    if (!session) return;
    setSavingTwoFA(true);
    setTwoFAMessage(null);

    try {
      const res = await fetch(`${API_URL}/api/customer/security/2fa`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.token}`,
        },
        body: JSON.stringify({ enabled: next }),
      });
      if (!res.ok) throw new Error("Couldn't update two-factor authentication.");
      setTwoFA(next);
      setTwoFAMessage({
        kind: "ok",
        text: next ? "Two-factor authentication enabled." : "Two-factor authentication disabled.",
      });
    } catch (err) {
      setTwoFAMessage({
        kind: "err",
        text: err instanceof Error ? err.message : "Something went wrong.",
      });
    } finally {
      setSavingTwoFA(false);
    }
  }

  if (!session) return null;

  const inputClass = (err?: string) =>
    [
      "w-full rounded-xl border bg-white px-4 py-3 text-sm outline-none transition",
      err
        ? "border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-500/10"
        : "border-slate-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10",
    ].join(" ");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Security</h1>
        <p className="mt-1 text-sm text-slate-500">
          Keep your account safe with a strong password and extra verification.
        </p>
      </div>

      {/* Password */}
      <form
        onSubmit={changePassword}
        className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <h2 className="text-sm font-semibold text-slate-900">Change password</h2>

        <div className="mt-5 space-y-4">
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

          <div className="grid gap-4 sm:grid-cols-2">
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
            className={`mt-5 rounded-xl border p-3.5 text-sm ${
              pwMessage.kind === "ok"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            {pwMessage.text}
          </div>
        ) : null}

        <div className="mt-6 flex justify-end">
          <button
            type="submit"
            disabled={pwSaving}
            className="rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-500 disabled:opacity-70"
          >
            {pwSaving ? "Updating…" : "Update password"}
          </button>
        </div>
      </form>

      {/* 2FA */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-slate-900">
              Two-factor authentication
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Add an extra step when signing in — we&apos;ll send a code to your phone.
            </p>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={twoFA}
            onClick={() => toggleTwoFA(!twoFA)}
            disabled={savingTwoFA}
            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition ${
              twoFA ? "bg-emerald-600" : "bg-slate-300"
            } ${savingTwoFA ? "opacity-60" : ""}`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
                twoFA ? "translate-x-5" : "translate-x-0.5"
              }`}
            />
          </button>
        </div>

        {twoFAMessage ? (
          <div
            className={`mt-5 rounded-xl border p-3.5 text-sm ${
              twoFAMessage.kind === "ok"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            {twoFAMessage.text}
          </div>
        ) : null}
      </div>
    </div>
  );
}