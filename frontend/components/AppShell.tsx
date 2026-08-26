"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  readAuth,
  clearAuth,
  rolePrefix,
  roleLabel,
  type AuthSession,
  type Role,
} from "@/lib/auth";
import { initialsFrom } from "@/lib/format";

/* ------------------------------------------------------------------ */
/* Icons                                                               */
/* ------------------------------------------------------------------ */

const ICONS: Record<string, React.ReactNode> = {
  grid: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </>
  ),
  wallet: (
    <>
      <path d="M3 8.5A2.5 2.5 0 0 1 5.5 6H19a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5.5A2.5 2.5 0 0 1 3 15.5v-7Z" />
      <path d="M3 9h13a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2H3" />
      <circle cx="16.5" cy="12" r="0.75" fill="currentColor" stroke="none" />
    </>
  ),
  send: (
    <>
      <path d="M21.5 3.5 2.5 10.5l7 2.5 2.5 7 9.5-16.5Z" />
      <path d="m9.5 13 4-4" />
    </>
  ),
  receipt: (
    <>
      <path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z" />
      <path d="M9.5 8.5h5M9.5 12.5h5" />
    </>
  ),
  file: (
    <>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z" />
      <path d="M14 3v5h5" />
    </>
  ),
  life: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="3.5" />
      <path d="m5.6 5.6 3.8 3.8M14.6 14.6l3.8 3.8M18.4 5.6l-3.8 3.8M9.4 14.6l-3.8 3.8" />
    </>
  ),
  bell: (
    <>
      <path d="M18 8.5a6 6 0 1 0-12 0c0 5-2 6.5-2 6.5h16s-2-1.5-2-6.5Z" />
      <path d="M10.3 19a2 2 0 0 0 3.4 0" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="3.75" />
      <path d="M4.5 20.5a7.5 7.5 0 0 1 15 0" />
    </>
  ),
  users: (
    <>
      <circle cx="9.5" cy="8" r="3.25" />
      <path d="M3 20a6.5 6.5 0 0 1 13 0" />
      <path d="M16.5 5.2a3.25 3.25 0 0 1 0 6.1M18 20a6.6 6.6 0 0 0-1.6-4.3" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3 5 6v5.5c0 4.4 2.9 8.1 7 9.5 4.1-1.4 7-5.1 7-9.5V6l-7-3Z" />
      <path d="m9 12 2.2 2.2L15.5 10" />
    </>
  ),
  list: (
    <>
      <path d="M8 6h13M8 12h13M8 18h13" />
      <circle cx="3.75" cy="6" r="1.25" fill="currentColor" stroke="none" />
      <circle cx="3.75" cy="12" r="1.25" fill="currentColor" stroke="none" />
      <circle cx="3.75" cy="18" r="1.25" fill="currentColor" stroke="none" />
    </>
  ),
  rotate: (
    <>
      <path d="M20 11.5A8 8 0 0 0 6.3 6.3L4 8.5" />
      <path d="M4 4v4.5h4.5" />
      <path d="M4 12.5a8 8 0 0 0 13.7 5.2L20 15.5" />
      <path d="M20 20v-4.5h-4.5" />
    </>
  ),
  chart: (
    <>
      <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
    </>
  ),
  clipboard: (
    <>
      <path d="M9 4h6v3H9V4Z" />
      <path d="M15 5.5h2.5A1.5 1.5 0 0 1 19 7v12.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 19.5V7a1.5 1.5 0 0 1 1.5-1.5H9" />
      <path d="M8.5 11.5h7M8.5 15.5h4.5" />
    </>
  ),
  cog: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2.75v2M12 19.25v2M4.2 7l1.7 1M18.1 16l1.7 1M4.2 17l1.7-1M18.1 8l1.7-1M2.75 12h2M19.25 12h2" />
    </>
  ),
  cash: (
    <>
      <rect x="2.5" y="6.5" width="19" height="11" rx="2" />
      <circle cx="12" cy="12" r="2.5" />
      <path d="M6 12h.01M18 12h.01" />
    </>
  ),
  down: (
    <>
      <path d="M12 4v14" />
      <path d="m6.5 12.5 5.5 5.5 5.5-5.5" />
    </>
  ),
  up: (
    <>
      <path d="M12 20V6" />
      <path d="m6.5 11.5 5.5-5.5 5.5 5.5" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4.5 4.5" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  logout: (
    <>
      <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" />
      <path d="M10 16.5 14.5 12 10 7.5" />
      <path d="M14.5 12H3.5" />
    </>
  ),
  menu: (
    <>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </>
  ),
  close: (
    <>
      <path d="M6 6l12 12M18 6 6 18" />
    </>
  ),
  chevron: (
    <>
      <path d="m6 9.5 6 6 6-6" />
    </>
  ),
  check: (
    <>
      <path d="m5 12.5 4.5 4.5L19 7" />
    </>
  ),
  alert: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5v5M12 16h.01" />
    </>
  ),
  lock: (
    <>
      <rect x="4.5" y="10" width="15" height="10.5" rx="2" />
      <path d="M8 10V7.5a4 4 0 0 1 8 0V10" />
    </>
  ),
};

function Icon({ name, className = "h-5 w-5" }: { name: string; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {ICONS[name] ?? ICONS.grid}
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Navigation                                                          */
/* ------------------------------------------------------------------ */

type NavItem = { label: string; href: string; icon: string };

const NAV: Record<Role, NavItem[]> = {
  CUSTOMER: [
    { label: "Dashboard", href: "/customer/dashboard", icon: "grid" },
    { label: "Accounts", href: "/customer/accounts", icon: "wallet" },
    { label: "Transfer", href: "/customer/transfer", icon: "send" },
    { label: "Payments", href: "/customer/payments", icon: "receipt" },
    { label: "Statements", href: "/customer/statements", icon: "file" },
    { label: "Support", href: "/support", icon: "life" },
    { label: "Notifications", href: "/notifications", icon: "bell" },
    { label: "Profile", href: "/profile", icon: "user" },
  ],
  TELLER: [
    { label: "Dashboard", href: "/teller/dashboard", icon: "grid" },
    { label: "Till", href: "/teller/till", icon: "cash" },
    { label: "Deposit", href: "/teller/deposit", icon: "down" },
    { label: "Withdrawal", href: "/teller/withdrawal", icon: "up" },
    { label: "Transfer", href: "/teller/transfer", icon: "send" },
    { label: "Customer Lookup", href: "/teller/customer-lookup", icon: "search" },
    { label: "Transactions", href: "/teller/transactions", icon: "list" },
    { label: "End of Day", href: "/teller/eod", icon: "clock" },
    { label: "Profile", href: "/profile", icon: "user" },
  ],
  ADMIN: [
    { label: "Dashboard", href: "/admin/dashboard", icon: "grid" },
    { label: "KYC Review", href: "/admin/kyc", icon: "shield" },
    { label: "Users", href: "/admin/users", icon: "users" },
    { label: "Accounts", href: "/admin/accounts", icon: "wallet" },
    { label: "Transactions", href: "/admin/transactions", icon: "list" },
    { label: "Reversals", href: "/admin/reversals", icon: "rotate" },
    { label: "Reports", href: "/admin/reports", icon: "chart" },
    { label: "Audit", href: "/admin/audit", icon: "clipboard" },
    { label: "Compliance", href: "/admin/compliance", icon: "shield" },
    { label: "Settings", href: "/admin/settings", icon: "cog" },
    { label: "Profile", href: "/profile", icon: "user" },
  ],
};

const SHARED_PREFIXES = ["/profile", "/notifications", "/support", "/logout"];

/* ------------------------------------------------------------------ */
/* Shell                                                               */
/* ------------------------------------------------------------------ */

export default function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const [session, setSession] = useState<AuthSession | null>(null);
  const [ready, setReady] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [unread, setUnread] = useState(0);

  /* Auth + role guard */
  useEffect(() => {
    const current = readAuth();

    if (!current) {
      router.replace("/login");
      return;
    }

    const prefix = rolePrefix(current.role);
    const isShared = SHARED_PREFIXES.some((p) => pathname.startsWith(p));
    const isOwnArea = pathname.startsWith(prefix);

    if (!isShared && !isOwnArea) {
      router.replace("/unauthorized");
      return;
    }

    setSession(current);
    setReady(true);
  }, [pathname, router]);

  /* Close menus on navigation */
  useEffect(() => {
    setMobileOpen(false);
    setMenuOpen(false);
  }, [pathname]);

  /* Unread notification count */
  useEffect(() => {
    if (!session) return;
    let cancelled = false;

    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

    fetch(`${apiUrl}/api/notifications/unread-count`, {
      headers: { Authorization: `Bearer ${session.token}` },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data && typeof data.count === "number") {
          setUnread(data.count);
        }
      })
      .catch(() => {
        /* silent — backend may not be running */
      });

    return () => {
      cancelled = true;
    };
  }, [session, pathname]);

  const nav = useMemo(() => (session ? NAV[session.role] ?? [] : []), [session]);

  const home = useMemo(() => {
    if (!session) return "/login";
    const prefix = rolePrefix(session.role);
    return `${prefix}/dashboard`;
  }, [session]);

  function handleLogout() {
    clearAuth();
    router.replace("/login");
  }

  if (!ready || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6 animate-spin text-emerald-600">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
          <path fill="currentColor" className="opacity-75" d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z" />
        </svg>
      </div>
    );
  }

  const initials = initialsFrom(session.name || session.email);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Mobile overlay */}
      {mobileOpen ? (
        <div
          className="fixed inset-0 z-30 bg-slate-900/40 lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden
        />
      ) : null}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 transform border-r border-slate-200 bg-white transition-transform duration-200 lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 items-center justify-between border-b border-slate-100 px-5">
          <Link href={home} className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-xs font-black text-white">
              PB
            </span>
            <span className="text-sm font-bold tracking-tight">Pesa Bank</span>
          </Link>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 lg:hidden"
            aria-label="Close menu"
          >
            <Icon name="close" className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex h-[calc(100vh-4rem)] flex-col gap-1 overflow-y-auto px-3 py-4">
          {nav.map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== "/profile" &&
                item.href !== "/notifications" &&
                item.href !== "/support" &&
                pathname.startsWith(`${item.href}/`));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  active
                    ? "bg-emerald-50 text-emerald-800"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <Icon
                  name={item.icon}
                  className={`h-[18px] w-[18px] ${active ? "text-emerald-600" : "text-slate-400"}`}
                />
                <span className="flex-1">{item.label}</span>
                {item.href === "/notifications" && unread > 0 ? (
                  <span className="rounded-full bg-emerald-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                    {unread > 9 ? "9+" : unread}
                  </span>
                ) : null}
              </Link>
            );
          })}

          <div className="mt-auto pt-3">
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-red-50 hover:text-red-700"
            >
              <Icon name="logout" className="h-[18px] w-[18px] text-slate-400" />
              Sign out
            </button>
          </div>
        </nav>
      </aside>

      {/* Main column */}
      <div className="lg:pl-64">
        {/* Topbar */}
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur sm:px-6">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
            aria-label="Open menu"
          >
            <Icon name="menu" className="h-5 w-5" />
          </button>

          <div className="flex-1" />

          <Link
            href="/notifications"
            className="relative rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Notifications"
          >
            <Icon name="bell" className="h-5 w-5" />
            {unread > 0 ? (
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-white" />
            ) : null}
          </Link>

          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="flex items-center gap-2 rounded-xl p-1 pr-2 transition hover:bg-slate-100"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">
                {initials}
              </span>
              <span className="hidden text-left sm:block">
                <span className="block text-xs font-semibold leading-tight text-slate-800">
                  {session.name || session.email.split("@")[0]}
                </span>
                <span className="block text-[11px] leading-tight text-slate-500">
                  {roleLabel(session.role)}
                </span>
              </span>
              <Icon name="chevron" className="hidden h-4 w-4 text-slate-400 sm:block" />
            </button>

            {menuOpen ? (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setMenuOpen(false)}
                  aria-hidden
                />
                <div
                  role="menu"
                  className="absolute right-0 z-20 mt-2 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl shadow-slate-900/10"
                >
                  <div className="border-b border-slate-100 px-4 py-3">
                    <p className="truncate text-sm font-semibold text-slate-800">
                      {session.name || session.email.split("@")[0]}
                    </p>
                    <p className="truncate text-xs text-slate-500">{session.email}</p>
                  </div>
                  <Link
                    href="/profile"
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
                    role="menuitem"
                  >
                    <Icon name="user" className="h-4 w-4 text-slate-400" />
                    Profile
                  </Link>
                  <Link
                    href="/support"
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
                    role="menuitem"
                  >
                    <Icon name="life" className="h-4 w-4 text-slate-400" />
                    Support
                  </Link>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex w-full items-center gap-3 border-t border-slate-100 px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50"
                    role="menuitem"
                  >
                    <Icon name="logout" className="h-4 w-4" />
                    Sign out
                  </button>
                </div>
              </>
            ) : null}
          </div>
        </header>

        {/* Page content */}
        <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">{children}</main>
      </div>
    </div>
  );
}