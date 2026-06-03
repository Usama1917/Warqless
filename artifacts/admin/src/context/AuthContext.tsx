import React, { createContext, useContext, useEffect, useState } from "react";
import { AdminUser, AdminRole } from "@/data/mockData";
import { fetchAdminSettings, loginAdminAccount, verifyAdminTwoFactorLogin } from "@/lib/apiSync";

export const PUBLISHER_CREDENTIALS_STORAGE_KEY = "warqless_publisher_credentials";
const CURRENT_USER_STORAGE_KEY = "warqless_admin_current_user";
const SESSION_MESSAGE_STORAGE_KEY = "warqless_admin_session_message";

interface PublisherAccountCredentials {
  id: string;
  publisherId: string;
  name: string;
  email: string;
  password: string;
}

interface StoredCredential extends PublisherAccountCredentials {
  role: AdminRole;
  passwordHash?: string;
}

interface AuthContextType {
  user: AdminUser | null;
  login: (email: string, password: string, role: AdminRole) => Promise<AdminLoginResult>;
  verifyTwoFactorLogin: (challengeId: string, code: string) => Promise<boolean>;
  registerPublisherAccount: (credentials: PublisherAccountCredentials) => void;
  updateCurrentUser: (user: AdminUser) => void;
  logout: (message?: string) => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export type AdminLoginResult =
  | { status: "ok" }
  | { status: "invalid" }
  | { status: "blocked"; message: string }
  | {
      status: "two_factor_required";
      challengeId: string;
      expiresIn?: number;
      expiresAt?: string;
      maskedPhone?: string;
      devCode?: string;
      message?: string;
    };

const MOCK_CREDENTIALS = [
  { email: "admin@warqless.com", password: "admin123", role: "admin" as AdminRole, name: "Karim Mansour", id: "admin1" },
  { email: "publisher@darmaref.eg", password: "pub123", role: "publisher" as AdminRole, name: "Dar Al-Ma'aref", id: "pub1", publisherId: "p1" },
];

function isSecurityBlockingLoginError(message: string) {
  return /two-factor|temporarily locked|verified phone|phone number|required for this role/i.test(message);
}

function parseDateMs(value?: string) {
  if (!value) return 0;
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

async function hashPasswordForLocalCheck(password: string) {
  if (!window.crypto?.subtle) return "";

  const bytes = new TextEncoder().encode(password);
  const digest = await window.crypto.subtle.digest("SHA-256", bytes);
  return `sha256:${Array.from(new Uint8Array(digest))
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("")}`;
}

async function credentialMatches(
  credential: StoredCredential | (typeof MOCK_CREDENTIALS)[number],
  password: string,
) {
  if ("passwordHash" in credential && credential.passwordHash) {
    return credential.passwordHash === await hashPasswordForLocalCheck(password);
  }

  return credential.password === password;
}

function readStoredPublisherCredentials(): StoredCredential[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(PUBLISHER_CREDENTIALS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function readStoredSession(): { user: AdminUser; issuedAt: string } | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(CURRENT_USER_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (
      parsed &&
      typeof parsed.id === "string" &&
      typeof parsed.name === "string" &&
      typeof parsed.email === "string" &&
      (parsed.role === "admin" || parsed.role === "publisher")
    ) {
      const user = {
        id: parsed.id,
        name: parsed.name,
        email: parsed.email,
        phone: typeof parsed.phone === "string" ? parsed.phone : undefined,
        phoneVerified: Boolean(parsed.phoneVerified),
        phoneVerifiedAt: typeof parsed.phoneVerifiedAt === "string" ? parsed.phoneVerifiedAt : undefined,
        twoFactorEnabled: Boolean(parsed.twoFactorEnabled),
        twoFactorEnabledAt: typeof parsed.twoFactorEnabledAt === "string" ? parsed.twoFactorEnabledAt : undefined,
        role: parsed.role,
        publisherId: typeof parsed.publisherId === "string" ? parsed.publisherId : undefined,
      };
      return {
        user,
        issuedAt: typeof parsed.sessionIssuedAt === "string" ? parsed.sessionIssuedAt : new Date().toISOString(),
      };
    }
  } catch {
    return null;
  }

  return null;
}

function saveStoredUser(user: AdminUser, issuedAt: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CURRENT_USER_STORAGE_KEY, JSON.stringify({ ...user, sessionIssuedAt: issuedAt }));
}

function clearStoredUser() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(CURRENT_USER_STORAGE_KEY);
}

function saveSessionMessage(message?: string) {
  if (typeof window === "undefined" || !message) return;
  window.localStorage.setItem(SESSION_MESSAGE_STORAGE_KEY, message);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const storedSession = readStoredSession();
  const [user, setUser] = useState<AdminUser | null>(storedSession?.user ?? null);
  const [sessionIssuedAt, setSessionIssuedAt] = useState(storedSession?.issuedAt ?? "");
  const [publisherCredentials, setPublisherCredentials] = useState<StoredCredential[]>(
    readStoredPublisherCredentials,
  );

  const saveSession = (nextUser: AdminUser, issuedAt = sessionIssuedAt || new Date().toISOString()) => {
    setSessionIssuedAt(issuedAt);
    setUser(nextUser);
    saveStoredUser(nextUser, issuedAt);
  };

  const logout = (message?: string) => {
    setUser(null);
    setSessionIssuedAt("");
    saveSessionMessage(message);
    clearStoredUser();
  };

  useEffect(() => {
    if (!user || !sessionIssuedAt) return;
    let active = true;

    const validateSession = async () => {
      try {
        const settings = await fetchAdminSettings(user);
        if (!active) return;

        const issuedAtMs = parseDateMs(sessionIssuedAt);
        const forceLogoutMs = parseDateMs(settings.platformSettings.accountSecurity.forceLogoutIssuedAt);
        if (issuedAtMs && forceLogoutMs && issuedAtMs <= forceLogoutMs) {
          logout("You were signed out by an admin. Please login again.");
          return;
        }

        const timeoutMs = settings.platformSettings.accountSecurity.sessionTimeoutMinutes * 60 * 1000;
        if (issuedAtMs && Date.now() - issuedAtMs > timeoutMs) {
          logout("Your session expired. Please login again.");
        }
      } catch {
        // Keep the current demo session if the local API is temporarily unavailable.
      }
    };

    void validateSession();
    const timer = window.setInterval(validateSession, 30_000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [sessionIssuedAt, user?.email, user?.id, user?.role]);

  const loginWithLocalCredentials = async (
    email: string,
    password: string,
    role: AdminRole,
    includeMockCredentials: boolean,
  ): Promise<AdminLoginResult> => {
    const normalizedEmail = email.trim().toLowerCase();
    const credentials = [
      ...(includeMockCredentials ? MOCK_CREDENTIALS : []),
      ...publisherCredentials,
    ];
    const possibleMatches = credentials.filter(
      (c) => c.email.toLowerCase() === normalizedEmail && c.role === role
    );
    const match = (
      await Promise.all(
        possibleMatches.map(async (credential) =>
          (await credentialMatches(credential, password)) ? credential : null,
        ),
      )
    ).find((credential): credential is NonNullable<typeof credential> => Boolean(credential));

    if (match) {
      const issuedAt = new Date().toISOString();
      const nextUser = {
        id: match.id,
        name: match.name,
        email: match.email,
        role: match.role,
        publisherId: match.publisherId,
      };
      saveSession(nextUser, issuedAt);
      return { status: "ok" };
    }
    return { status: "invalid" };
  };

  const login = async (email: string, password: string, role: AdminRole): Promise<AdminLoginResult> => {
    try {
      const result = await loginAdminAccount(email, password, role);
      if (result.status === "two_factor_required") {
        return result;
      }

      const account = result.account;
      const issuedAt = new Date().toISOString();
      const nextUser: AdminUser = {
        id: account.id,
        name: account.name,
        email: account.email,
        phone: account.phone,
        phoneVerified: Boolean(account.phoneVerified),
        phoneVerifiedAt: account.phoneVerifiedAt,
        twoFactorEnabled: Boolean(account.twoFactorEnabled),
        twoFactorEnabledAt: account.twoFactorEnabledAt,
        role: account.role,
        publisherId: account.publisherId,
      };
      saveSession(nextUser, issuedAt);
      return { status: "ok" };
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (message && isSecurityBlockingLoginError(message)) {
        return { status: "blocked", message };
      }
      if (message === "Invalid credentials." || message === "Invalid credentials") {
        return loginWithLocalCredentials(email, password, role, false);
      }
      return loginWithLocalCredentials(email, password, role, true);
    }
  };

  const verifyTwoFactorLogin = async (challengeId: string, code: string): Promise<boolean> => {
    try {
      const account = await verifyAdminTwoFactorLogin(challengeId, code);
      const issuedAt = new Date().toISOString();
      const nextUser: AdminUser = {
        id: account.id,
        name: account.name,
        email: account.email,
        phone: account.phone,
        phoneVerified: Boolean(account.phoneVerified),
        phoneVerifiedAt: account.phoneVerifiedAt,
        twoFactorEnabled: Boolean(account.twoFactorEnabled),
        twoFactorEnabledAt: account.twoFactorEnabledAt,
        role: account.role,
        publisherId: account.publisherId,
      };
      saveSession(nextUser, issuedAt);
      return true;
    } catch {
      return false;
    }
  };

  const registerPublisherAccount = (credentials: PublisherAccountCredentials) => {
    const nextCredential: StoredCredential = {
      ...credentials,
      role: "publisher",
    };

    setPublisherCredentials((current) => {
      const next = [
        ...current.filter(
          (item) =>
            item.email !== credentials.email &&
            item.publisherId !== credentials.publisherId &&
            item.id !== credentials.id,
        ),
        nextCredential,
      ];
      window.localStorage.setItem(PUBLISHER_CREDENTIALS_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const updateCurrentUser = (nextUser: AdminUser) => {
    saveSession(nextUser);
  };

  return (
    <AuthContext.Provider value={{ user, login, verifyTwoFactorLogin, registerPublisherAccount, updateCurrentUser, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
