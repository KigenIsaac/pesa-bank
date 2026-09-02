"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { readAuth, type AuthSession, type Role } from "@/lib/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

type FormState = {
  fullName: string;
  email: string;
  phone: string;
  role: Role;
  password: string;
  confirmPassword: string;
  sendInvite: boolean;
};

const initialForm: FormState = {
  fullName: "",
  email: "",
  phone: "",
  role: "CUSTOMER",
  password: "",
  confirmPassword: "",
  sendInvite: true,
};

const ROLES: { value: Role; label: string; description: string }[] = [
  { value: "CUSTOMER", label: "Customer", description: "Personal banking" },
  { value: "TELLER", label: "Teller", description: "Branch cash operations" },
  { value: "ADMIN", label: "Administrator", description: "Full bank control" },
];

export default function AdminNewUserPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(initialForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key as string];
        return next;
      });
    }
  }

  function validate(): Record<string, string> {
    const e: Record<string, string> = {};

    if (!form.fullName.trim()) e.fullName = "Full name is required.";
    else if (form.fullName.trim().length < 3) e.fullName = "Name looks too short.";

    if (!form.email.trim()) e.email = "Email address is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      e.email = "Enter a valid email address.";
    }

    const digits = form.phone.replace(/\D/g, "");
    if (!form.phone.trim()) e.phone = "Phone number is required.";
    else if (!/^(?:254|0)?(7|1)\d{8}$/.test(digits)) {
      e.phone = "Enter a valid Kenyan number, e.g. 0712 345 678.";
    }

    if (!form.sendInvite) {
      if (!form.password) e.password = "Set a temporary password.";
      else if (form.password.length < 8) e.password = "Use at least 8 characters.";
      else if (
        !/[A-Z]/.test(form.password) ||
        !/[a-z]/.test(form.password) ||
        !/\d/.test(form.password)
      ) {
        e.password = "Include uppercase, lowercase, and a number.";
      }
      if (form.confirmPassword !== form.password) {
        e.confirmPassword = "Passwords do not match.";
      }
    }

    return e;
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError("");

    const validation = validate();
    setErrors(validation);
    if (Object.keys(validation).length > 0) return;

    const session = readAuth();
    if (!session) return;

    setSubmitting(true);

    try {
      const res = await fetch(`${API_URL}/api/admin/users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.token}`,
        },
        body: JSON.stringify({
          fullName: form.fullName.trim(),
          email: form.email.trim().toLowerCase(),
          phone: form.phone.trim(),
          role: form.role,
          password: form.sendInvite ? null : form.password,
          sendInvite: form.sendInvite,
        }),
      });

      if (res.status === 409) {
        throw new Error("A user with this email already exists.");
      }
      if (res.status === 400) {
        throw new Error("Some details were rejected. Please check and try again.");
      }
      if (!res.ok) throw new Error("Couldn't create this user.");

      const created = await res.json();
      router.replace(`/admin/users/${created.id}`);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass = (err?: string) =>
    [
      "w-full rounded-xl border bg-white px-4 py-3 text-sm outline-none transition",
      "placeholder:text-slate-400 focus:ring-4",
      err
        ? "border-red-300 focus:border-red-500 focus:ring-red-500/10"
        : "border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/10",
    ].join(" ");

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link
          href="/admin/users"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition hover:text-slate-800"
        >
          ← Back to users
        </Link>

        <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">
          Add user
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Create a staff or customer account. Customers usually self-register.
        </p>
      </div>

      <form
        onSubmit={submit}
        className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        {/* Identity */}
        <div className="space-y-5">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Full name
            </label>
            <input
              type="text"
              value={form.fullName}
              onChange={(e) => update("fullName", e.target.value)}
              placeholder="e.g. Asha Wanjiru"
              className={inputClass(errors.fullName)}
              autoComplete="name"
            />
            {errors.fullName ? (
              <p className="mt-1.5 text-xs text-red-600">{errors.fullName}</p>
            ) : null}
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Email address
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                placeholder="user@pesabank.co.ke"
                className={inputClass(errors.email)}
                autoComplete="email"
              />
              {errors.email ? (
                <p className="mt-1.5 text-xs text-red-600">{errors.email}</p>
              ) : null}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Phone number
              </label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => update("phone", e.target.value)}
                placeholder="0712 345 678"
                className={inputClass(errors.phone)}
                autoComplete="tel"
              />
              {errors.phone ? (
                <p className="mt-1.5 text-xs text-red-600">{errors.phone}</p>
              ) : null}
            </div>
          </div>
        </div>

        {/* Role */}
        <div className="border-t border-slate-100 pt-5">
          <label className="mb-2 block text-sm font-medium text-slate-700">Role</label>
          <div className="grid gap-3 sm:grid-cols-3">
            {ROLES.map((r) => {
              const active = form.role === r.value;
              return (
                <label
                  key={r.value}
                  className={`flex cursor-pointer flex-col rounded-xl border px-4 py-3 transition ${
                    active
                      ? "border-emerald-500 bg-emerald-50 ring-2 ring-emerald-500/20"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="role"
                    value={r.value}
                    checked={active}
                    onChange={() => update("role", r.value)}
                    className="sr-only"
                  />
                  <span className="text-sm font-semibold text-slate-900">{r.label}</span>
                  <span className="mt-0.5 text-xs text-slate-500">{r.description}</span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Password / invite */}
        <div className="border-t border-slate-100 pt-5">
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={form.sendInvite}
              onChange={(e) => update("sendInvite", e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500/30"
            />
            <span className="text-sm text-slate-700">
              Send email invitation
              <span className="mt-1 block text-xs text-slate-500">
                The user will receive a link to set their own password.
              </span>
            </span>
          </label>

          {!form.sendInvite ? (
            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Temporary password
                </label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => update("password", e.target.value)}
                  className={inputClass(errors.password)}
                  autoComplete="new-password"
                />
                {errors.password ? (
                  <p className="mt-1.5 text-xs text-red-600">{errors.password}</p>
                ) : null}
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Confirm password
                </label>
                <input
                  type="password"
                  value={form.confirmPassword}
                  onChange={(e) => update("confirmPassword", e.target.value)}
                  className={inputClass(errors.confirmPassword)}
                  autoComplete="new-password"
                />
                {errors.confirmPassword ? (
                  <p className="mt-1.5 text-xs text-red-600">
                    {errors.confirmPassword}
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>

        {formError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm text-red-700">
            {formError}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-100 pt-5">
          <button
            type="button"
            onClick={() => router.push("/admin/users")}
            className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {submitting ? "Creating…" : "Create user"}
          </button>
        </div>
      </form>

      <p className="text-xs leading-relaxed text-slate-400">
        Staff accounts are audited. Role changes and suspension are recorded in the
        audit log.
      </p>
    </div>
  );
}