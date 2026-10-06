"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { readAuth, type AuthSession } from "@/lib/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

type AccountType = "SAVINGS" | "CURRENT";

export default function OpenAccountPage() {
  const router = useRouter();
  const [session, setSession] = useState<AuthSession | null>(null);
  const [type, setType] = useState<AccountType>("SAVINGS");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<{ accountNumber: string; type: string } | null>(null);

  useEffect(() => {
    const current = readAuth();
    if (!current) {
      router.replace("/login");
      return;
    }
    setSession(current);
  }, [router]);

  async function submit() {
    if (!session) return;
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch(`${API_URL}/api/customer/accounts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.token}`,
        },
        body: JSON.stringify({ type }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.message ?? "Couldn't open the account.");
      }

      setCreated({
        accountNumber: data.accountNumber,
        type: data.type,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!session) return null;

  if (created) {
    return (
      <div className="mx-auto max-w-lg">
        <div className="rounded-2xl border border-emerald-200 bg-white p-8 text-center shadow-sm">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
            ✓
          </span>
          <p className="mt-5 text-xs font-semibold uppercase tracking-wider text-emerald-700">
            Account opened
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
            Your account is ready
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Your {created.type.toLowerCase()} account has been opened successfully.
          </p>

          <div className="mt-6 rounded-xl bg-slate-50 p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Account number
            </p>
            <p className="mt-2 font-mono text-2xl font-bold tracking-wider text-slate-900">
              {created.accountNumber}
            </p>
          </div>

          <button
            type="button"
            onClick={() => router.push("/customer/dashboard")}
            className="mt-6 w-full rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500"
          >
            Go to dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <button
          type="button"
          onClick={() => router.push("/customer/dashboard")}
          className="mb-4 text-sm font-medium text-slate-500 hover:text-slate-800"
        >
          ← Back to dashboard
        </button>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Open a bank account</h1>
        <p className="mt-1 text-sm text-slate-500">
          Your KYC has been approved. Choose the account you want to open.
        </p>
      </div>

      {error ? (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <AccountChoice
          selected={type === "SAVINGS"}
          title="Savings account"
          description="For everyday saving and personal banking."
          onClick={() => setType("SAVINGS")}
        />
        <AccountChoice
          selected={type === "CURRENT"}
          title="Current account"
          description="For regular payments and transactional banking."
          onClick={() => setType("CURRENT")}
        />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 text-emerald-600">✓</span>
          <div>
            <p className="text-sm font-semibold text-slate-900">No opening balance required</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">
              The new account starts at KES 0.00. You can fund it through a teller deposit or an internal transfer once another account has funds.
            </p>
          </div>
        </div>

        <button
          type="button"
          disabled={submitting}
          onClick={submit}
          className="mt-6 w-full rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Opening account…" : `Open ${type === "SAVINGS" ? "savings" : "current"} account`}
        </button>
      </div>
    </div>
  );
}

function AccountChoice({
  selected,
  title,
  description,
  onClick,
}: {
  selected: boolean;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border p-5 text-left transition ${
        selected
          ? "border-emerald-500 bg-emerald-50 ring-2 ring-emerald-500/10"
          : "border-slate-200 bg-white hover:border-emerald-300"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">{description}</p>
        </div>
        <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
          selected ? "border-emerald-600 bg-emerald-600 text-white" : "border-slate-300"
        }`}>
          {selected ? "✓" : null}
        </span>
      </div>
    </button>
  );
}
