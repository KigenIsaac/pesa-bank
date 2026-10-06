import Link from "next/link";

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-12">
      <article className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <Link href="/register" className="text-sm font-medium text-emerald-700 hover:underline">
          ← Back to registration
        </Link>
        <h1 className="mt-6 text-3xl font-bold tracking-tight text-slate-900">Terms of Service</h1>
        <p className="mt-2 text-sm text-slate-500">Pesa Bank demonstration application</p>
        <div className="mt-8 space-y-6 text-sm leading-7 text-slate-600">
          <section><h2 className="font-semibold text-slate-900">1. Demonstration use</h2><p>This application is a software demonstration and portfolio project. It is not a real banking service and must not be used with real funds or sensitive production information.</p></section>
          <section><h2 className="font-semibold text-slate-900">2. Account information</h2><p>Information entered into this demonstration should be fictional or test data. Do not submit real identity documents, passwords, financial credentials, or other sensitive information.</p></section>
          <section><h2 className="font-semibold text-slate-900">3. No financial services</h2><p>Pesa Bank does not provide actual deposits, payments, lending, custody, or regulated financial services through this project.</p></section>
        </div>
      </article>
    </main>
  );
}
