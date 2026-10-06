import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-12">
      <article className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <Link href="/register" className="text-sm font-medium text-emerald-700 hover:underline">
          ← Back to registration
        </Link>
        <h1 className="mt-6 text-3xl font-bold tracking-tight text-slate-900">Privacy Notice</h1>
        <p className="mt-2 text-sm text-slate-500">Pesa Bank demonstration application</p>
        <div className="mt-8 space-y-6 text-sm leading-7 text-slate-600">
          <section><h2 className="font-semibold text-slate-900">Demonstration data</h2><p>This project is intended for local and portfolio demonstrations. Use synthetic test information only.</p></section>
          <section><h2 className="font-semibold text-slate-900">Authentication data</h2><p>Passwords are hashed by the backend and are not stored as plaintext. Demo configuration should use non-production credentials.</p></section>
          <section><h2 className="font-semibold text-slate-900">Production boundary</h2><p>This notice is not a substitute for the privacy, security, retention, and regulatory controls required by a real financial institution.</p></section>
        </div>
      </article>
    </main>
  );
}
