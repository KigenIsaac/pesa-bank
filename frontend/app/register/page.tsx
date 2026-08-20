"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { readAuth, roleToPath, type Role, writeAuth } from "@/lib/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

type FieldErrors = Partial<
  Record<"fullName" | "email" | "phone" | "password" | "confirmPassword" | "terms", string>
>;

const passwordRules = [
  { label: "At least 8 characters", test: (v: string) => v.length >= 8 },
  { label: "One uppercase letter", test: (v: string) => /[A-Z]/.test(v) },
  { label: "One lowercase letter", test: (v: string) => /[a-z]/.test(v) },
  { label: "One number", test: (v: string) => /\d/.test(v) },
];

export default function RegisterPage() {
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const auth = readAuth();
    if (auth) {
      router.replace(roleToPath(auth.role));
    }
  }, [router]);

  const passwordChecks = useMemo(
    () => passwordRules.map((rule) => ({ ...rule, passed: rule.test(password) })),
    [password]
  );

  const passwordScore = passwordChecks.filter((c) => c.passed).length;
  const strengthLabel = ["Too weak", "Weak", "Fair", "Good", "Strong"][passwordScore];
  const strengthColor = [
    "bg-slate-200",
    "bg-red-400",
    "bg-amber-400",
    "bg-lime-400",
    "bg-emerald-500",
  ][passwordScore];

  function validate(): FieldErrors {
    const next: FieldErrors = {};

    if (!fullName.trim()) {
      next.fullName = "Enter your full name as it appears on your ID.";
    } else if (fullName.trim().length < 3) {
      next.fullName = "Name looks too short.";
    }

    if (!email.trim()) {
      next.email = "Enter your email address.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      next.email = "Enter a valid email address.";
    }

    const digits = phone.replace(/\D/g, "");
    if (!phone.trim()) {
      next.phone = "Enter your phone number.";
    } else if (!/^(?:254|0)?(7|1)\d{8}$/.test(digits)) {
      next.phone = "Enter a valid Kenyan number, e.g. 0712 345 678.";
    }

    if (!password) {
      next.password = "Create a password.";
    } else if (passwordScore < passwordRules.length) {
      next.password = "Your password does not meet all requirements.";
    }

    if (!confirmPassword) {
      next.confirmPassword = "Re-enter your password.";
    } else if (confirmPassword !== password) {
      next.confirmPassword = "Passwords do not match.";
    }

    if (!acceptedTerms) {
      next.terms = "You must accept the terms to continue.";
    }

    return next;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError("");

    const validation = validate();
    setErrors(validation);
    if (Object.keys(validation).length > 0) return;

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: fullName.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim(),
          password,
        }),
      });

      if (!response.ok) {
        if (response.status === 409) {
          throw new Error("An account with this email already exists.");
        }
        if (response.status === 400) {
          throw new Error("Please check your details and try again.");
        }
        throw new Error("We couldn't create your account right now. Please try again.");
      }

      const data = await response.json();

      // If the API returns a session, sign the user straight in.
      if (data?.token) {
        const normalizedRole = (String(data.role ?? "CUSTOMER").toUpperCase() as Role);
        writeAuth({
          token: data.token,
          role: normalizedRole,
          email: data.email ?? email.trim().toLowerCase(),
        });
        router.replace(roleToPath(normalizedRole));
        return;
      }

      router.replace("/login?registered=1");
    } catch (err) {
      if (err instanceof TypeError) {
        setFormError("Unable to reach the server. Check your connection and try again.");
      } else {
        setFormError(
          err instanceof Error ? err.message : "Something went wrong. Please try again."
        );
      }
    } finally {
      setLoading(false);
    }
  }

  const inputClass = (hasError?: string) =>
    [
      "w-full rounded-xl border bg-white py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition",
      "placeholder:text-slate-400 focus:ring-4",
      hasError
        ? "border-red-300 focus:border-red-500 focus:ring-red-500/10"
        : "border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/10",
    ].join(" ");

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-50 px-4 py-12">
      {/* Soft backdrop */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -top-48 left-1/2 h-96 w-[40rem] -translate-x-1/2 rounded-full bg-emerald-200/40 blur-3xl" />
        <div className="absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-emerald-100/70 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Brand */}
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-600 text-lg font-black tracking-tight text-white shadow-lg shadow-emerald-600/25">
            PB
          </div>
          <h1 className="mt-5 text-2xl font-bold tracking-tight text-slate-900">
            Open your Pesa Bank account
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            It takes about two minutes. No paperwork required.
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-900/5 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            {/* Full name */}
            <div>
              <label htmlFor="fullName" className="mb-1.5 block text-sm font-medium text-slate-700">
                Full name
              </label>
              <div className="relative">
                <svg
                  aria-hidden
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"
                  />
                </svg>
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  autoComplete="name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Asha Wanjiru"
                  className={inputClass(errors.fullName)}
                />
              </div>
              {errors.fullName ? (
                <p className="mt-1.5 text-xs text-red-600">{errors.fullName}</p>
              ) : null}
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-slate-700">
                Email address
              </label>
              <div className="relative">
                <svg
                  aria-hidden
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75"
                  />
                </svg>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className={inputClass(errors.email)}
                />
              </div>
              {errors.email ? (
                <p className="mt-1.5 text-xs text-red-600">{errors.email}</p>
              ) : null}
            </div>

            {/* Phone */}
            <div>
              <label htmlFor="phone" className="mb-1.5 block text-sm font-medium text-slate-700">
                Phone number
              </label>
              <div className="relative">
                <svg
                  aria-hidden
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M10.5 1.5H8.25A2.25 2.25 0 0 0 6 3.75v16.5a2.25 2.25 0 0 0 2.25 2.25h7.5A2.25 2.25 0 0 0 18 20.25V3.75a2.25 2.25 0 0 0-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3"
                  />
                </svg>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0712 345 678"
                  className={inputClass(errors.phone)}
                />
              </div>
              {errors.phone ? (
                <p className="mt-1.5 text-xs text-red-600">{errors.phone}</p>
              ) : null}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-slate-700">
                Password
              </label>
              <div className="relative">
                <svg
                  aria-hidden
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z"
                  />
                </svg>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a password"
                  className={`${inputClass(errors.password)} pr-12`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                >
                  {showPassword ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-5 w-5">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12c1.292 4.338 5.31 7.5 10.066 7.5.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88"
                      />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-5 w-5">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z"
                      />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                    </svg>
                  )}
                </button>
              </div>

              {/* Strength meter */}
              {password ? (
                <div className="mt-2.5">
                  <div className="flex items-center gap-2">
                    <div className="flex h-1.5 flex-1 gap-1">
                      {[0, 1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className={`h-full flex-1 rounded-full transition-colors ${
                            i < passwordScore ? strengthColor : "bg-slate-200"
                          }`}
                        />
                      ))}
                    </div>
                    <span className="w-16 text-right text-xs font-medium text-slate-500">
                      {strengthLabel}
                    </span>
                  </div>
                  <ul className="mt-2 space-y-1">
                    {passwordChecks.map((check) => (
                      <li
                        key={check.label}
                        className={`flex items-center gap-1.5 text-xs ${
                          check.passed ? "text-emerald-700" : "text-slate-400"
                        }`}
                      >
                        <svg
                          aria-hidden
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={2}
                          className="h-3.5 w-3.5 shrink-0"
                        >
                          {check.passed ? (
                            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                          ) : (
                            <circle cx="12" cy="12" r="9" strokeWidth={1.5} />
                          )}
                        </svg>
                        {check.label}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {errors.password ? (
                <p className="mt-1.5 text-xs text-red-600">{errors.password}</p>
              ) : null}
            </div>

            {/* Confirm password */}
            <div>
              <label
                htmlFor="confirmPassword"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Confirm password
              </label>
              <div className="relative">
                <svg
                  aria-hidden
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.751A11.959 11.959 0 0 1 12 2.714Z"
                  />
                </svg>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your password"
                  className={inputClass(errors.confirmPassword)}
                />
              </div>
              {errors.confirmPassword ? (
                <p className="mt-1.5 text-xs text-red-600">{errors.confirmPassword}</p>
              ) : null}
            </div>

            {/* Terms */}
            <div>
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-slate-300 text-emerald-600 focus:ring-2 focus:ring-emerald-500/30"
                />
                <span className="text-xs leading-relaxed text-slate-600">
                  I agree to the{" "}
                  <a href="/terms" className="font-medium text-emerald-700 hover:underline">
                    Terms of Service
                  </a>{" "}
                  and{" "}
                  <a href="/privacy" className="font-medium text-emerald-700 hover:underline">
                    Privacy Policy
                  </a>
                  , and consent to identity verification.
                </span>
              </label>
              {errors.terms ? (
                <p className="mt-1.5 text-xs text-red-600">{errors.terms}</p>
              ) : null}
            </div>

            {/* Form-level error */}
            {formError ? (
              <div
                role="alert"
                className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm text-red-700"
              >
                <svg
                  aria-hidden
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  className="mt-0.5 h-4 w-4 shrink-0"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"
                  />
                </svg>
                <span>{formError}</span>
              </div>
            ) : null}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/25 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? (
                <>
                  <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 animate-spin">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
                    <path fill="currentColor" className="opacity-75" d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z" />
                  </svg>
                  Creating your account…
                </>
              ) : (
                "Create account"
              )}
            </button>
          </form>

          <div className="mt-6 border-t border-slate-100 pt-5 text-center text-sm text-slate-500">
            Already have an account?{" "}
            <a href="/login" className="font-medium text-emerald-700 hover:text-emerald-800 hover:underline">
              Sign in
            </a>
          </div>
        </div>

        <p className="mt-6 text-center text-xs leading-relaxed text-slate-400">
          Secured with 256-bit encryption. Your details are never shared without consent.
        </p>
      </div>
    </main>
  );
}