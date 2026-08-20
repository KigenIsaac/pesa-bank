export type Role = "CUSTOMER" | "TELLER" | "ADMIN";

export type AuthSession = {
  token: string;
  role: Role;
  email: string;
  name?: string;
};

const STORAGE_KEY = "pesabank.auth";

export function readAuth(): AuthSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AuthSession;
    if (!parsed?.token || !parsed?.role) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeAuth(session: AuthSession) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function clearAuth() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}

export function roleToPath(role: string): string {
  switch (String(role).toUpperCase()) {
    case "ADMIN":
      return "/admin/dashboard";
    case "TELLER":
      return "/teller/dashboard";
    default:
      return "/customer/dashboard";
  }
}

export function roleLabel(role: string): string {
  switch (String(role).toUpperCase()) {
    case "ADMIN":
      return "Administrator";
    case "TELLER":
      return "Teller";
    default:
      return "Customer";
  }
}

export function rolePrefix(role: string): string {
  switch (String(role).toUpperCase()) {
    case "ADMIN":
      return "/admin";
    case "TELLER":
      return "/teller";
    default:
      return "/customer";
  }
}