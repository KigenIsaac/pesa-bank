"use client";

import { useEffect, useState } from "react";
import { readAuth, type AuthSession } from "@/lib/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

type Settings = {
  bankName: string;
  supportEmail: string;
  supportPhone: string;
  minPasswordLength: number;
  sessionTimeoutMinutes: number;
  enforce2FAForStaff: boolean;
  dailyTransferLimit: number;
  maxCashWithdrawal: number;
  maintenanceMode: boolean;
};

const DEFAULTS: Settings = {
  bankName: "Pesa Bank",
  supportEmail: "support@pesabank.co.ke",
  supportPhone: "+254 700 000 000",
  minPasswordLength: 8,
  sessionTimeoutMinutes: 30,
  enforce2FAForStaff: true,
  dailyTransferLimit: 500000,
  maxCashWithdrawal: 100000,
  maintenanceMode: false,
};

export default function AdminSettingsPage() {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    const current = readAuth();
    if (!current) return;
    setSession(current);

    let cancelled = false;
    setLoading(true);

    fetch(`${API_URL}/api/admin/settings`, {
      headers: { Authorization: `Bearer ${current.token}` },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data) setSettings({ ...DEFAULTS, ...data });
      })
      .catch(() => {
        /* offline — keep defaults */
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!session) return;

    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch(`${API_URL}/api/admin/settings`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.token}`,
        },
        body: JSON.stringify(settings),
      });
      if (!res.ok) throw new Error("Couldn't save settings.");
      setMessage({ kind: "ok", text: "Settings saved." });
    } catch (err) {
      setMessage({
        kind: "err",
        text: err instanceof Error ? err.message : "Something went wrong.",
      });
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    "w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10";

  if (!session) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Settings</h1>
        <p className="mt-1 text-sm text-slate-500">
          Bank-wide configuration. Changes apply immediately.
        </p>
      </div>

      {message ? (
        <div
          className={`rounded-xl border p-4 text-sm ${
            message.kind === "ok"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {message.text}
        </div>
      ) : null}

      <form onSubmit={save} className="space-y-5">
        {/* General */}
        <Section title="General">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Bank name">
              <input
                type="text"
                value={settings.bankName}
                onChange={(e) => setSettings({ ...settings, bankName: e.target.value })}
                className={inputClass}
              />
            </Field>
            <Field label="Support email">
              <input
                type="email"
                value={settings.supportEmail}
                onChange={(e) => setSettings({ ...settings, supportEmail: e.target.value })}
                className={inputClass}
              />
            </Field>
            <Field label="Support phone">
              <input
                type="tel"
                value={settings.supportPhone}
                onChange={(e) => setSettings({ ...settings, supportPhone: e.target.value })}
                className={inputClass}
              />
            </Field>
          </div>
        </Section>

        {/* Security */}
        <Section title="Security">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Minimum password length">
              <input
                type="number"
                min={6}
                max={32}
                value={settings.minPasswordLength}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    minPasswordLength: Number(e.target.value) || 8,
                  })
                }
                className={inputClass}
              />
            </Field>
            <Field label="Session timeout (minutes)">
              <input
                type="number"
                min={5}
                max={240}
                value={settings.sessionTimeoutMinutes}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    sessionTimeoutMinutes: Number(e.target.value) || 30,
                  })
                }
                className={inputClass}
              />
            </Field>
          </div>
          <label className="mt-4 flex items-center gap-3">
            <input
              type="checkbox"
              checked={settings.enforce2FAForStaff}
              onChange={(e) =>
                setSettings({ ...settings, enforce2FAForStaff: e.target.checked })
              }
              className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500/30"
            />
            <span className="text-sm text-slate-700">
              Require two-factor authentication for staff accounts
            </span>
          </label>
        </Section>

        {/* Limits */}
        <Section title="Transaction limits">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Daily transfer limit (KES)">
              <input
                type="number"
                min={0}
                step={1000}
                value={settings.dailyTransferLimit}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    dailyTransferLimit: Number(e.target.value) || 0,
                  })
                }
                className={inputClass}
              />
            </Field>
            <Field label="Max cash withdrawal (KES)">
              <input
                type="number"
                min={0}
                step={1000}
                value={settings.maxCashWithdrawal}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    maxCashWithdrawal: Number(e.target.value) || 0,
                  })
                }
                className={inputClass}
              />
            </Field>
          </div>
        </Section>

        {/* Maintenance */}
        <Section title="Operations">
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={settings.maintenanceMode}
              onChange={(e) =>
                setSettings({ ...settings, maintenanceMode: e.target.checked })
              }
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-red-600 focus:ring-red-500/30"
            />
            <span className="text-sm text-slate-700">
              Enable maintenance mode
              <span className="mt-1 block text-xs text-slate-500">
                Customers will see a maintenance notice. Staff can still log in.
              </span>
            </span>
          </label>
        </Section>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving || loading}
            className="rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {saving ? "Saving…" : "Save settings"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-slate-700">{label}</label>
      {children}
    </div>
  );
}