"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { readAuth, type AuthSession } from "@/lib/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

const idTypes = ["NATIONAL_ID", "PASSPORT", "ALIEN_ID"] as const;
const employmentStatuses = ["EMPLOYED", "SELF_EMPLOYED", "STUDENT", "UNEMPLOYED", "RETIRED"] as const;
const purposes = ["SALARY", "BUSINESS", "SAVINGS", "INVESTMENT", "PERSONAL", "OTHER"] as const;

type FormState = {
  fullName: string;
  dateOfBirth: string;
  gender: string;
  maritalStatus: string;
  nationality: string;
  idType: string;
  idNumber: string;
  idIssueDate: string;
  idExpiryDate: string;
  kraPin: string;
  physicalAddress: string;
  town: string;
  county: string;
  postalAddress: string;
  employmentStatus: string;
  employerName: string;
  occupation: string;
  monthlyIncome: string;
  sourceOfFunds: string;
  accountPurpose: string;
  accountPurposeOther: string;
  nokName: string;
  nokRelationship: string;
  nokPhone: string;
  isPep: boolean;
  pepDetails: string;
};

const initialState: FormState = {
  fullName: "",
  dateOfBirth: "",
  gender: "",
  maritalStatus: "",
  nationality: "Kenyan",
  idType: "NATIONAL_ID",
  idNumber: "",
  idIssueDate: "",
  idExpiryDate: "",
  kraPin: "",
  physicalAddress: "",
  town: "",
  county: "",
  postalAddress: "",
  employmentStatus: "EMPLOYED",
  employerName: "",
  occupation: "",
  monthlyIncome: "",
  sourceOfFunds: "",
  accountPurpose: "SALARY",
  accountPurposeOther: "",
  nokName: "",
  nokRelationship: "",
  nokPhone: "",
  isPep: false,
  pepDetails: "",
};

export default function KycOnboardingPage() {
  const router = useRouter();
  const [session, setSession] = useState<AuthSession | null>(null);
  const [form, setForm] = useState<FormState>(initialState);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const current = readAuth();
    if (!current) {
      router.replace("/login");
      return;
    }
    setSession(current);

    fetch(`${API_URL}/api/kyc/status`, {
      headers: { Authorization: `Bearer ${current.token}` },
    })
      .then(async (res) => {
        if (!res.ok) throw new Error("Couldn't load your KYC status.");
        return res.json();
      })
      .then((data) => {
        if (data.status === "APPROVED" || data.status === "PENDING") {
          router.replace("/kyc/status");
          return;
        }

        if (data.summary) {
          setForm((current) => ({
            ...current,
            fullName: data.summary.fullName ?? current.fullName,
            idType: data.summary.idType ?? current.idType,
            idNumber: data.summary.idNumber ?? current.idNumber,
            kraPin: data.summary.kraPin ?? current.kraPin,
            county: data.summary.county ?? current.county,
            accountPurpose: data.summary.accountPurpose ?? current.accountPurpose,
          }));
        }
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Something went wrong."))
      .finally(() => setLoading(false));
  }, [router]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function validate(): string | null {
    if (!form.fullName.trim() || !form.dateOfBirth || !form.idNumber.trim() || !form.kraPin.trim()) {
      return "Complete your name, date of birth, ID number, and KRA PIN.";
    }
    if (!form.physicalAddress.trim() || !form.town.trim() || !form.county.trim()) {
      return "Complete your physical address, town, and county.";
    }
    if (!form.occupation.trim() || !form.nokName.trim() || !form.nokRelationship.trim() || !form.nokPhone.trim()) {
      return "Complete your occupation and next-of-kin details.";
    }
    if (!form.sourceOfFunds.trim() || !form.monthlyIncome.trim()) {
      return "Provide your source of funds and monthly income range.";
    }
    if (form.accountPurpose === "OTHER" && !form.accountPurposeOther.trim()) {
      return "Describe the purpose of the account.";
    }
    if (form.isPep && !form.pepDetails.trim()) {
      return "Provide details because you declared PEP status.";
    }
    return null;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session) return;

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const res = await fetch(`${API_URL}/api/kyc/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.token}`,
        },
        body: JSON.stringify({
          ...form,
          fullName: form.fullName.trim(),
          nationality: form.nationality.trim() || "Kenyan",
          idNumber: form.idNumber.trim(),
          kraPin: form.kraPin.trim().toUpperCase(),
          physicalAddress: form.physicalAddress.trim(),
          town: form.town.trim(),
          county: form.county.trim(),
          postalAddress: form.postalAddress.trim() || null,
          employerName: form.employerName.trim() || null,
          occupation: form.occupation.trim(),
          monthlyIncome: form.monthlyIncome.trim(),
          sourceOfFunds: form.sourceOfFunds.trim(),
          accountPurposeOther: form.accountPurposeOther.trim() || null,
          nokName: form.nokName.trim(),
          nokRelationship: form.nokRelationship.trim(),
          nokPhone: form.nokPhone.trim(),
          pepDetails: form.pepDetails.trim() || null,
          idIssueDate: form.idIssueDate || null,
          idExpiryDate: form.idExpiryDate || null,
          gender: form.gender.trim() || null,
          maritalStatus: form.maritalStatus.trim() || null,
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.message ?? "Couldn't submit your KYC application.");
      }

      router.replace("/kyc/status");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!session || loading) {
    return <div className="h-96 animate-pulse rounded-2xl bg-slate-100" />;
  }

  const input =
    "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10";
  const label = "mb-1.5 block text-sm font-medium text-slate-700";

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <button
          type="button"
          onClick={() => router.push("/kyc/status")}
          className="mb-4 text-sm font-medium text-slate-500 hover:text-slate-800"
        >
          ← Back to KYC status
        </button>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Identity verification</h1>
        <p className="mt-1 text-sm text-slate-500">
          Complete your KYC details so the bank can verify your identity and open your account.
        </p>
      </div>

      {error ? (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <form onSubmit={submit} className="space-y-6">
        <Section title="Personal information">
          <Field label="Full name" required>
            <input className={input} value={form.fullName} onChange={(e) => update("fullName", e.target.value)} />
          </Field>
          <Field label="Date of birth" required>
            <input className={input} type="date" value={form.dateOfBirth} onChange={(e) => update("dateOfBirth", e.target.value)} />
          </Field>
          <Field label="Gender">
            <select className={input} value={form.gender} onChange={(e) => update("gender", e.target.value)}>
              <option value="">Select</option><option>MALE</option><option>FEMALE</option><option>OTHER</option>
            </select>
          </Field>
          <Field label="Marital status">
            <select className={input} value={form.maritalStatus} onChange={(e) => update("maritalStatus", e.target.value)}>
              <option value="">Select</option><option>SINGLE</option><option>MARRIED</option><option>DIVORCED</option><option>WIDOWED</option>
            </select>
          </Field>
          <Field label="Nationality" required>
            <input className={input} value={form.nationality} onChange={(e) => update("nationality", e.target.value)} />
          </Field>
        </Section>

        <Section title="Identification & tax">
          <Field label="ID type" required>
            <select className={input} value={form.idType} onChange={(e) => update("idType", e.target.value)}>
              {idTypes.map((v) => <option key={v}>{v}</option>)}
            </select>
          </Field>
          <Field label="ID number" required>
            <input className={input} value={form.idNumber} onChange={(e) => update("idNumber", e.target.value)} />
          </Field>
          <Field label="ID issue date">
            <input className={input} type="date" value={form.idIssueDate} onChange={(e) => update("idIssueDate", e.target.value)} />
          </Field>
          <Field label="ID expiry date">
            <input className={input} type="date" value={form.idExpiryDate} onChange={(e) => update("idExpiryDate", e.target.value)} />
          </Field>
          <Field label="KRA PIN" required>
            <input className={input} value={form.kraPin} onChange={(e) => update("kraPin", e.target.value.toUpperCase())} />
          </Field>
        </Section>

        <Section title="Address">
          <Field label="Physical address" required wide>
            <input className={input} value={form.physicalAddress} onChange={(e) => update("physicalAddress", e.target.value)} />
          </Field>
          <Field label="Town" required>
            <input className={input} value={form.town} onChange={(e) => update("town", e.target.value)} />
          </Field>
          <Field label="County" required>
            <input className={input} value={form.county} onChange={(e) => update("county", e.target.value)} />
          </Field>
          <Field label="Postal address">
            <input className={input} value={form.postalAddress} onChange={(e) => update("postalAddress", e.target.value)} />
          </Field>
        </Section>

        <Section title="Employment & financial information">
          <Field label="Employment status" required>
            <select className={input} value={form.employmentStatus} onChange={(e) => update("employmentStatus", e.target.value)}>
              {employmentStatuses.map((v) => <option key={v}>{v}</option>)}
            </select>
          </Field>
          <Field label="Employer name">
            <input className={input} value={form.employerName} onChange={(e) => update("employerName", e.target.value)} />
          </Field>
          <Field label="Occupation" required>
            <input className={input} value={form.occupation} onChange={(e) => update("occupation", e.target.value)} />
          </Field>
          <Field label="Monthly income range" required>
            <input className={input} placeholder="e.g. 50001-100000" value={form.monthlyIncome} onChange={(e) => update("monthlyIncome", e.target.value)} />
          </Field>
          <Field label="Source of funds" required wide>
            <input className={input} placeholder="e.g. Employment, business income" value={form.sourceOfFunds} onChange={(e) => update("sourceOfFunds", e.target.value)} />
          </Field>
          <Field label="Account purpose" required>
            <select className={input} value={form.accountPurpose} onChange={(e) => update("accountPurpose", e.target.value)}>
              {purposes.map((v) => <option key={v}>{v}</option>)}
            </select>
          </Field>
          {form.accountPurpose === "OTHER" ? (
            <Field label="Other purpose" required>
              <input className={input} value={form.accountPurposeOther} onChange={(e) => update("accountPurposeOther", e.target.value)} />
            </Field>
          ) : null}
        </Section>

        <Section title="Next of kin">
          <Field label="Full name" required>
            <input className={input} value={form.nokName} onChange={(e) => update("nokName", e.target.value)} />
          </Field>
          <Field label="Relationship" required>
            <input className={input} value={form.nokRelationship} onChange={(e) => update("nokRelationship", e.target.value)} />
          </Field>
          <Field label="Phone number" required>
            <input className={input} value={form.nokPhone} onChange={(e) => update("nokPhone", e.target.value)} />
          </Field>
        </Section>

        <Section title="PEP declaration">
          <label className="flex items-start gap-3 rounded-xl border border-slate-200 p-4">
            <input type="checkbox" checked={form.isPep} onChange={(e) => update("isPep", e.target.checked)} className="mt-1 h-4 w-4" />
            <span>
              <span className="block text-sm font-medium text-slate-800">I am a politically exposed person (PEP)</span>
              <span className="mt-1 block text-xs text-slate-500">Declare this if applicable to you.</span>
            </span>
          </label>
          {form.isPep ? (
            <Field label="PEP details" required>
              <textarea className={input} rows={4} value={form.pepDetails} onChange={(e) => update("pepDetails", e.target.value)} />
            </Field>
          ) : null}
        </Section>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Submitting KYC…" : "Submit for verification"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function Field({
  label,
  children,
  required = false,
  wide = false,
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
  wide?: boolean;
}) {
  return (
    <div className={wide ? "sm:col-span-2" : ""}>
      <label className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}{required ? <span className="ml-1 text-red-500">*</span> : null}
      </label>
      {children}
    </div>
  );
}
