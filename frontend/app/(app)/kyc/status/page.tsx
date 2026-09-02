"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { readAuth, type AuthSession } from "@/lib/auth";
import { fullDate } from "@/lib/format";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

type KycStatus = "NOT_STARTED" | "PENDING" | "APPROVED" | "REJECTED";

type KycRecord = {
  status: KycStatus;
  submittedAt?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  rejectionReason?: string;
  summary?: {
    fullName: string;
    idType: string;
    idNumber: string;
    kraPin: string;
    county: string;
    accountPurpose: string;
  };
};

export default function KycStatusPage() {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [record, setRecord] = useState<KycRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async (current: AuthSession) => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${API_URL}/api/kyc/status`, {
        headers: { Authorization: `Bearer ${current.token}` },
      });
      if (!res.ok) throw new Error("Couldn't load your KYC status.");
      const data: KycRecord = await res.json();
      setRecord(data);
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

  if (!session) return null;

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-1/3 animate-pulse rounded bg-slate-100" />
        <div className="h-56 animate-pulse rounded-2xl bg-slate-100" />
      </div>
    );
  }

  if (error || !record) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        {error || "KYC record not found."}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          KYC verification
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Track the status of your identity verification.
        </p>
      </div>

      {/* Status hero */}
      <StatusHero status={record.status} />

      {/* Rejection reason */}
      {record.status === "REJECTED" ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
          <h2 className="text-sm font-semibold text-red-900">Reason for rejection</h2>
          <p className="mt-2 text-sm leading-relaxed text-red-800">
            {record.rejectionReason ||
              "Your submission didn't meet our requirements. Please contact support for details."}
          </p>

          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/onboarding/kyc"
              className="rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-500"
            >
              Resubmit KYC
            </Link>
            <Link
              href="/support"
              className="rounded-xl border border-red-200 bg-white px-5 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-50"
            >
              Contact support
            </Link>
          </div>
        </div>
      ) : null}

      {/* Not started */}
      {record.status === "NOT_STARTED" ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Get started</h2>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">
            Complete your KYC to unlock transfers, payments, and statements. It takes
            about five minutes.
          </p>
          <div className="mt-5">
            <Link
              href="/onboarding/kyc"
              className="inline-block rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-500"
            >
              Start KYC
            </Link>
          </div>
        </div>
      ) : null}

      {/* Submitted details summary */}
      {record.summary && record.status !== "NOT_STARTED" ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Submitted details</h2>
          <dl className="mt-4 grid gap-x-6 gap-y-3 sm:grid-cols-2">
            <Row label="Full name" value={record.summary.fullName} />
            <Row label="ID type" value={record.summary.idType} />
            <Row label="ID number" value={maskValue(record.summary.idNumber)} />
            <Row label="KRA PIN" value={record.summary.kraPin} />
            <Row label="County" value={record.summary.county} />
            <Row label="Account purpose" value={record.summary.accountPurpose} />
          </dl>
        </div>
      ) : null}

      {/* Timeline */}
      {record.status !== "NOT_STARTED" ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Timeline</h2>
          <ol className="mt-4 space-y-4">
            <TimelineItem
              title="Submitted"
              detail={
                record.submittedAt ? fullDate(record.submittedAt) : "—"
              }
              done
            />
            <TimelineItem
              title="Under review"
              detail={
                record.status === "PENDING"
                  ? "Our team is reviewing your documents."
                  : record.reviewedAt
                  ? fullDate(record.reviewedAt)
                  : "—"
              }
              done={record.status !== "PENDING"}
              active={record.status === "PENDING"}
            />
            <TimelineItem
              title={
                record.status === "REJECTED"
                  ? "Not approved"
                  : record.status === "APPROVED"
                  ? "Approved"
                  : "Decision"
              }
              detail={
                record.status === "APPROVED"
                  ? "You now have full access to your account."
                  : record.status === "REJECTED"
                  ? "See the reason above."
                  : "Pending a decision."
              }
              done={record.status === "APPROVED" || record.status === "REJECTED"}
              failed={record.status === "REJECTED"}
            />
          </ol>
        </div>
      ) : null}

      {/* Support footer */}
      {record.status === "PENDING" ? (
        <p className="text-xs text-slate-400">
          Reviews typically take up to 1 business day. If it&apos;s been longer,{" "}
          <Link href="/support" className="font-medium text-emerald-700 hover:underline">
            contact support
          </Link>
          .
        </p>
      ) : null}
    </div>
  );
}

/* ---------- helpers ---------- */

function StatusHero({ status }: { status: KycStatus }) {
  const config: Record<
    KycStatus,
    { label: string; title: string; description: string; bg: string; fg: string }
  > = {
    NOT_STARTED: {
      label: "Not started",
      title: "You haven't started KYC yet",
      description: "Verify your identity to unlock all banking features.",
      bg: "border-slate-200 bg-white",
      fg: "bg-slate-100 text-slate-700",
    },
    PENDING: {
      label: "Pending review",
      title: "Your KYC is under review",
      description: "We'll notify you as soon as a decision is made — usually within 1 business day.",
      bg: "border-amber-200 bg-amber-50",
      fg: "bg-amber-100 text-amber-800",
    },
    APPROVED: {
      label: "Verified",
      title: "Your identity is verified",
      description: "You have full access to transfers, payments, and statements.",
      bg: "border-emerald-200 bg-emerald-50",
      fg: "bg-emerald-100 text-emerald-800",
    },
    REJECTED: {
      label: "Not approved",
      title: "Your KYC was not approved",
      description: "Please review the reason below and resubmit.",
      bg: "border-red-200 bg-red-50",
      fg: "bg-red-100 text-red-800",
    },
  };

  const c = config[status];

  return (
    <div className={`rounded-2xl border ${c.bg} p-6 shadow-sm`}>
      <span
        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${c.fg}`}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-current" />
        {c.label}
      </span>
      <h2 className="mt-3 text-lg font-bold text-slate-900">{c.title}</h2>
      <p className="mt-1 text-sm leading-relaxed text-slate-600">{c.description}</p>
    </div>
  );
}

function Row({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm text-slate-800">{value || "—"}</dd>
    </div>
  );
}

function TimelineItem({
  title,
  detail,
  done,
  active,
  failed,
}: {
  title: string;
  detail: string;
  done?: boolean;
  active?: boolean;
  failed?: boolean;
}) {
  const dotClass = failed
    ? "bg-red-500"
    : done
    ? "bg-emerald-500"
    : active
    ? "bg-amber-500"
    : "bg-slate-300";

  return (
    <li className="flex items-start gap-3">
      <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${dotClass}`} />
      <div>
        <p className="text-sm font-medium text-slate-800">{title}</p>
        <p className="mt-0.5 text-xs text-slate-500">{detail}</p>
      </div>
    </li>
  );
}

function maskValue(value?: string) {
  if (!value) return "—";
  if (value.length <= 4) return value;
  return `${"•".repeat(Math.max(0, value.length - 4))}${value.slice(-4)}`;
}