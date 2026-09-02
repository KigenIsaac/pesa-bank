"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { readAuth, type AuthSession } from "@/lib/auth";
import { fullDate } from "@/lib/format";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

type KycDetail = {
  id: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  submittedAt: string;
  fullName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  gender: string;
  maritalStatus: string;
  nationality: string;
  idType: string;
  idNumber: string;
  idIssueDate?: string;
  idExpiryDate?: string;
  kraPin: string;
  physicalAddress: string;
  town: string;
  county: string;
  postalAddress?: string;
  employmentStatus: string;
  employerName?: string;
  occupation: string;
  monthlyIncome: string;
  sourceOfFunds: string;
  accountPurpose: string;
  accountPurposeOther?: string;
  nextOfKin: { name: string; relationship: string; phone: string };
  isPep: boolean;
  pepDetails?: string;
  rejectionReason?: string;
};

export default function AdminKycDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [session, setSession] = useState<AuthSession | null>(null);
  const [kyc, setKyc] = useState<KycDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [rejecting, setRejecting] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState("");

  const load = useCallback(
    async (current: AuthSession) => {
      setLoading(true);
      setError("");

      try {
        const res = await fetch(`${API_URL}/api/admin/kyc/${params.id}`, {
          headers: { Authorization: `Bearer ${current.token}` },
        });
        if (!res.ok) throw new Error("Couldn't load this submission.");
        const data = await res.json();
        setKyc(data);
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

  async function approve() {
    if (!session || !kyc) return;
    setActionLoading(true);
    setActionError("");

    try {
      const res = await fetch(`${API_URL}/api/admin/kyc/${kyc.id}/approve`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.token}` },
      });
      if (!res.ok) throw new Error("Couldn't approve this submission.");
      router.replace("/admin/kyc");
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setActionLoading(false);
    }
  }

  async function reject() {
    if (!session || !kyc) return;
    if (!rejectionReason.trim()) {
      setActionError("Provide a reason for rejection.");
      return;
    }

    setActionLoading(true);
    setActionError("");

    try {
      const res = await fetch(`${API_URL}/api/admin/kyc/${kyc.id}/reject`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.token}`,
        },
        body: JSON.stringify({ reason: rejectionReason.trim() }),
      });
      if (!res.ok) throw new Error("Couldn't reject this submission.");
      router.replace("/admin/kyc");
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setActionLoading(false);
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

  if (error || !kyc) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        {error || "Submission not found."}
      </div>
    );
  }

  const isPending = kyc.status === "PENDING";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <button
          type="button"
          onClick={() => router.push("/admin/kyc")}
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition hover:text-slate-800"
        >
          ← Back to KYC review
        </button>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              {kyc.fullName}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Submitted {fullDate(kyc.submittedAt)}
            </p>
          </div>
          <StatusBadge status={kyc.status} />
        </div>
      </div>

      {actionError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {actionError}
        </div>
      ) : null}

      {/* PEP warning */}
      {kyc.isPep ? (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
          <p className="font-semibold">Politically Exposed Person</p>
          <p className="mt-1 text-xs leading-relaxed">
            {kyc.pepDetails || "Customer declared PEP status without additional details."}
          </p>
        </div>
      ) : null}

      {/* Details grid */}
      <Section title="Personal information">
        <Row label="Full name" value={kyc.fullName} />
        <Row label="Email" value={kyc.email} />
        <Row label="Phone" value={kyc.phone} />
        <Row label="Date of birth" value={kyc.dateOfBirth} />
        <Row label="Gender" value={kyc.gender} />
        <Row label="Marital status" value={kyc.maritalStatus} />
        <Row label="Nationality" value={kyc.nationality} />
      </Section>

      <Section title="Identification & tax">
        <Row label="ID type" value={kyc.idType} />
        <Row label="ID number" value={kyc.idNumber} />
        {kyc.idIssueDate ? <Row label="Issued" value={kyc.idIssueDate} /> : null}
        {kyc.idExpiryDate ? <Row label="Expires" value={kyc.idExpiryDate} /> : null}
        <Row label="KRA PIN" value={kyc.kraPin} />
      </Section>

      <Section title="Address">
        <Row label="Physical" value={kyc.physicalAddress} />
        <Row label="Town" value={kyc.town} />
        <Row label="County" value={kyc.county} />
        {kyc.postalAddress ? <Row label="Postal" value={kyc.postalAddress} /> : null}
      </Section>

      <Section title="Employment & financial">
        <Row label="Status" value={kyc.employmentStatus} />
        {kyc.employerName ? <Row label="Employer" value={kyc.employerName} /> : null}
        <Row label="Occupation" value={kyc.occupation} />
        <Row label="Monthly income" value={kyc.monthlyIncome} />
        <Row label="Source of funds" value={kyc.sourceOfFunds} />
      </Section>

      <Section title="Account purpose">
        <Row label="Purpose" value={kyc.accountPurpose} />
        {kyc.accountPurposeOther ? <Row label="Details" value={kyc.accountPurposeOther} /> : null}
      </Section>

      <Section title="Next of kin">
        <Row label="Name" value={kyc.nextOfKin.name} />
        <Row label="Relationship" value={kyc.nextOfKin.relationship} />
        <Row label="Phone" value={kyc.nextOfKin.phone} />
      </Section>

      {/* Rejection reason display */}
      {kyc.status === "REJECTED" && kyc.rejectionReason ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
          <p className="text-sm font-semibold text-red-800">Rejection reason</p>
          <p className="mt-1 text-sm text-red-700">{kyc.rejectionReason}</p>
        </div>
      ) : null}

      {/* Actions */}
      {isPending ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          {rejecting ? (
            <>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Reason for rejection
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={3}
                placeholder="Explain why this submission cannot be approved."
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-red-500 focus:ring-4 focus:ring-red-500/10"
              />
              <div className="mt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setRejecting(false);
                    setRejectionReason("");
                  }}
                  className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={reject}
                  disabled={actionLoading}
                  className="rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-red-600/20 transition hover:bg-red-500 disabled:opacity-70"
                >
                  {actionLoading ? "Rejecting…" : "Confirm rejection"}
                </button>
              </div>
            </>
          ) : (
            <div className="flex flex-wrap items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setRejecting(true)}
                className="rounded-xl border border-red-200 bg-white px-5 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-50"
              >
                Reject
              </button>
              <button
                type="button"
                onClick={approve}
                disabled={actionLoading}
                className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-500 disabled:opacity-70"
              >
                {actionLoading ? "Approving…" : "Approve KYC"}
              </button>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

/* ---------- helpers ---------- */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
      <dl className="mt-4 grid gap-x-6 gap-y-3 sm:grid-cols-2">{children}</dl>
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

function StatusBadge({ status }: { status: "PENDING" | "APPROVED" | "REJECTED" }) {
  const styles = {
    PENDING: "bg-amber-50 text-amber-700",
    APPROVED: "bg-emerald-50 text-emerald-700",
    REJECTED: "bg-red-50 text-red-700",
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