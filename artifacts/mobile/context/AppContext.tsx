/**
 * AppContext — MVP / DEMO AUTH
 *
 * Authentication is DEMO-ONLY: any valid-looking email + any password works.
 * The device ID is still generated locally for the demo, but device binding
 * and security event logging now go through the local backend API.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { router } from "expo-router";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { Platform } from "react-native";

import {
  Book,
  BorrowedBook,
  MOCK_PURCHASED_BOOKS,
  PurchasedBook,
} from "@/data/mockData";
import {
  getCurrentDeviceId,
  getDeviceRegisteredAt,
} from "@/services/deviceService";
import {
  DEFAULT_PLATFORM_SETTINGS,
  fetchPlatformSettings,
  createOrderFromBook,
  requestStudentPhoneVerification,
  upsertStudentAccount,
  updateStudentPhone,
  verifyStudentDevice,
  verifyStudentPhone,
  type PlatformSettings,
  type StudentAccountPayload,
} from "@/services/catalogService";

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  phoneVerified?: boolean;
  phoneVerifiedAt?: string;
  grade: string;
  avatar?: string;
  devicesCount: number;
  joinedAt?: string;
  passwordUpdatedAt?: string;
  lastLoginAt?: string;
}

export type DeviceStatus =
  | "checking"
  | "allowed"
  | "blocked_different_device"
  | "security_unavailable"
  | "unknown";

type RegisterResult =
  | { status: "ok"; devCode?: string }
  | { status: "invalid_phone" | "device_blocked" | "security_unavailable" | "phone_verification_unavailable"; error?: string };

interface AppContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  deviceStatus: DeviceStatus;
  purchasedBooks: PurchasedBook[];
  borrowedBooks: BorrowedBook[];
  platformSettings: PlatformSettings;
  sessionMessage: string;
  clearSessionMessage: () => void;
  login: (email: string, password: string) => Promise<"ok" | "invalid" | "device_blocked" | "security_unavailable">;
  register: (
    name: string,
    email: string,
    phone: string,
    password: string
  ) => Promise<RegisterResult>;
  requestPhoneVerification: () => Promise<{ ok: boolean; devCode?: string; error?: string }>;
  verifyPhoneCode: (code: string) => Promise<{ ok: boolean; error?: string }>;
  changePhone: (phone: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => void;
  purchaseBook: (book: Book) => Promise<void>;
  updateReadingProgress: (bookId: string, page: number, progress: number) => void;
  toggleBookmark: (bookId: string, page: number) => void;
  lendBook: (bookId: string, borrowerPhone: string, days: number) => Promise<boolean>;
  returnBorrowedBook: (bookId: string) => void;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

const MOCK_USER: User = {
  id: "user-001",
  name: "Sara Mohamed",
  email: "student@example.com",
  phone: "+201012345678",
  phoneVerified: false,
  grade: "Grade 12",
  devicesCount: 1,
  joinedAt: "2026-06-01T00:00:00.000Z",
};

const SESSION_STORAGE_KEY = "warqless_session";

type StoredSession = {
  user?: User;
  issuedAt?: string;
};

function maskDeviceId(id: string): string {
  if (id.length <= 8) return "********";
  return `${id.slice(0, 4)}********${id.slice(-4)}`;
}

function parseDateMs(value?: string) {
  if (!value) return 0;
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

function isSessionExpired(issuedAt: string, settings: PlatformSettings) {
  const issuedAtMs = parseDateMs(issuedAt);
  if (!issuedAtMs) return false;
  return Date.now() - issuedAtMs > settings.accountSecurity.sessionTimeoutMinutes * 60 * 1000;
}

function isSessionForceLoggedOut(issuedAt: string, settings: PlatformSettings) {
  const issuedAtMs = parseDateMs(issuedAt);
  const forceLogoutMs = parseDateMs(settings.accountSecurity.forceLogoutIssuedAt);
  return Boolean(issuedAtMs && forceLogoutMs && issuedAtMs <= forceLogoutMs);
}

function isStoredUser(value: unknown): value is User {
  return Boolean(value) &&
    typeof value === "object" &&
    typeof (value as User).id === "string" &&
    typeof (value as User).name === "string" &&
    typeof (value as User).email === "string" &&
    typeof (value as User).phone === "string" &&
    typeof (value as User).grade === "string" &&
    typeof (value as User).devicesCount === "number";
}

function getMobileAppVersion() {
  return Constants.expoConfig?.version ?? "dev";
}

function getMobileDeviceName() {
  const constants = Constants as typeof Constants & { deviceName?: string };
  return constants.deviceName ?? (Platform.OS === "ios" ? "iOS device" : Platform.OS === "android" ? "Android device" : "Web browser");
}

function normalizeEgyptPhoneInput(value: string): string | null {
  let compact = value.trim().replace(/[\s().-]/g, "");
  if (compact.startsWith("00")) compact = `+${compact.slice(2)}`;
  if (/^(010|011|012|015)\d{8}$/.test(compact)) compact = `+2${compact}`;
  if (/^20(10|11|12|15)\d{8}$/.test(compact)) compact = `+${compact}`;
  return /^\+20(10|11|12|15)\d{8}$/.test(compact) ? compact : null;
}

function userFromStudentPayload(current: User, student?: StudentAccountPayload): User {
  if (!student) return current;
  return {
    ...current,
    phone: student.phone ?? current.phone,
    phoneVerified: Boolean(student.phoneVerified),
    phoneVerifiedAt: student.phoneVerifiedAt,
  };
}

function toOrderDate(purchaseDate: string) {
  const parsed = new Date(`${purchaseDate}T12:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) return new Date().toISOString();
  return parsed.toISOString();
}

async function getCurrentDevicePayload(status: "active" | "blocked" | "pending_reset" = "active") {
  const currentDeviceId = await getCurrentDeviceId();
  const registeredAt = await getDeviceRegisteredAt();
  const now = new Date().toISOString();

  return {
    deviceId: currentDeviceId,
    maskedDeviceId: maskDeviceId(currentDeviceId),
    platform: Platform.OS,
    osVersion: String(Platform.Version ?? ""),
    appVersion: getMobileAppVersion(),
    deviceName: getMobileDeviceName(),
    registeredAt,
    lastVerifiedAt: now,
    status,
  };
}

function getAuthSummary(user: User) {
  return {
    authProvider: "email_password_demo" as const,
    passwordSet: true,
    passwordHashStored: false,
    passwordLastChangedAt: user.passwordUpdatedAt,
    lastLoginAt: user.lastLoginAt,
    failedLoginAttempts: 0,
    note: "Password value is never sent to the admin UI. This MVP accepts demo email/password login.",
  };
}

function getVerificationStudentPayload(user: User, books: PurchasedBook[]) {
  return {
    name: user.name,
    email: user.email,
    phone: user.phone,
    phoneVerified: Boolean(user.phoneVerified),
    phoneVerifiedAt: user.phoneVerifiedAt,
    grade: user.grade,
    joinedAt: user.joinedAt ?? new Date().toISOString(),
    totalSpent: books.reduce((sum, book) => sum + book.price, 0),
    booksOwned: books.length,
    auth: getAuthSummary(user),
  };
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [deviceStatus, setDeviceStatus] = useState<DeviceStatus>("unknown");
  const [purchasedBooks, setPurchasedBooks] =
    useState<PurchasedBook[]>(MOCK_PURCHASED_BOOKS);
  const [borrowedBooks, setBorrowedBooks] =
    useState<BorrowedBook[]>([]);
  const [platformSettings, setPlatformSettings] = useState<PlatformSettings>(DEFAULT_PLATFORM_SETTINGS);
  const [sessionIssuedAt, setSessionIssuedAt] = useState("");
  const [sessionMessage, setSessionMessage] = useState("");

  const saveSession = useCallback(async (nextUser: User, issuedAt = sessionIssuedAt || new Date().toISOString()) => {
    setSessionIssuedAt(issuedAt);
    await AsyncStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ user: nextUser, issuedAt }));
  }, [sessionIssuedAt]);

  const expireSession = useCallback(async (message: string) => {
    setUser(null);
    setDeviceStatus("unknown");
    setSessionIssuedAt("");
    setSessionMessage(message);
    await AsyncStorage.removeItem(SESSION_STORAGE_KEY);
    router.replace("/auth");
  }, []);

  const clearSessionMessage = useCallback(() => {
    setSessionMessage("");
  }, []);

  // Refs so the run-once session-restore effect can read the latest values
  // without re-running when purchasedBooks / saveSession identity changes.
  const purchasedBooksRef = useRef(purchasedBooks);
  const saveSessionRef = useRef(saveSession);
  const expireSessionRef = useRef(expireSession);
  purchasedBooksRef.current = purchasedBooks;
  saveSessionRef.current = saveSession;
  expireSessionRef.current = expireSession;
  const hasRestoredRef = useRef(false);

  useEffect(() => {
    let active = true;
    const loadSettings = async () => {
      try {
        const settings = await fetchPlatformSettings();
        if (active) setPlatformSettings(settings);
      } catch {
        if (active) setPlatformSettings(DEFAULT_PLATFORM_SETTINGS);
      }
    };

    void loadSettings();
    const timer = setInterval(loadSettings, 30_000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (!user || !sessionIssuedAt) return;
    if (isSessionForceLoggedOut(sessionIssuedAt, platformSettings)) {
      void expireSession("force_logout");
      return;
    }
    if (isSessionExpired(sessionIssuedAt, platformSettings)) {
      void expireSession("expired");
    }
  }, [expireSession, platformSettings, sessionIssuedAt, user]);

  useEffect(() => {
    if (!user) return;

    const syncStudentAccount = async () => {
      const currentDevice = await getCurrentDevicePayload("active");
      const now = new Date().toISOString();

      await upsertStudentAccount({
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        phoneVerified: Boolean(user.phoneVerified),
        phoneVerifiedAt: user.phoneVerifiedAt,
        grade: user.grade,
        booksOwned: purchasedBooks.length,
        booksBorrowed: 0,
        totalSpent: purchasedBooks.reduce((sum, book) => sum + book.price, 0),
        devices: user.devicesCount,
        joinedAt: user.joinedAt ?? now,
        status: "active",
        currentDevice,
        auth: getAuthSummary(user),
        orders: purchasedBooks.map((book) => ({
          id: `purchase-${user.id}-${book.licenseId || book.id}`,
          bookId: book.id,
          bookTitle: book.title,
          publisherId: book.publisherId,
          publisher: book.publisher,
          amount: book.price,
          status: "completed",
          createdAt: toOrderDate(book.purchaseDate),
          couponCode: book.couponCode,
          discountAmount:
            typeof book.originalPrice === "number"
              ? Number(Math.max(book.originalPrice - book.price, 0).toFixed(2))
              : typeof book.discountPct === "number"
              ? Number((book.price * (book.discountPct / 100)).toFixed(2))
              : undefined,
        })),
      });
    };

    void syncStudentAccount().catch(() => {
      // Demo sync is best-effort. The mobile app should still work offline.
    });
  }, [purchasedBooks, user]);

  useEffect(() => {
    // Session restoration must run exactly once on mount. Re-running it on
    // purchasedBooks / saveSession identity changes would re-read the stale
    // stored session and re-trigger device verification during normal use.
    if (hasRestoredRef.current) return;
    hasRestoredRef.current = true;

    const loadSession = async () => {
      try {
        const stored = await AsyncStorage.getItem(SESSION_STORAGE_KEY);
        if (stored) {
          const session = JSON.parse(stored) as StoredSession;
          if (!isStoredUser(session.user)) {
            await AsyncStorage.removeItem(SESSION_STORAGE_KEY);
            setIsLoading(false);
            return;
          }
          const issuedAt = typeof session.issuedAt === "string" ? session.issuedAt : new Date().toISOString();
          const settings = await fetchPlatformSettings().catch(() => DEFAULT_PLATFORM_SETTINGS);
          setPlatformSettings(settings);
          if (isSessionForceLoggedOut(issuedAt, settings)) {
            await expireSessionRef.current("force_logout");
            setIsLoading(false);
            return;
          }
          if (isSessionExpired(issuedAt, settings)) {
            await expireSessionRef.current("expired");
            setIsLoading(false);
            return;
          }
          let loggedUser: User = {
            ...session.user,
            lastLoginAt: session.user?.lastLoginAt ?? new Date().toISOString(),
          };
          try {
            const result = await verifyStudentDevice({
              studentId: loggedUser.id,
              student: getVerificationStudentPayload(loggedUser, purchasedBooksRef.current),
              device: await getCurrentDevicePayload("active"),
            });

            if (!result.allowed) {
              setDeviceStatus("blocked_different_device");
              await AsyncStorage.removeItem(SESSION_STORAGE_KEY);
              setIsLoading(false);
              return;
            }

            loggedUser = userFromStudentPayload(loggedUser, result.student);
            setDeviceStatus("allowed");
          } catch {
            setDeviceStatus("security_unavailable");
            await AsyncStorage.removeItem(SESSION_STORAGE_KEY);
            setIsLoading(false);
            return;
          }

          setUser(loggedUser);
          await saveSessionRef.current(loggedUser, issuedAt);
        }
      } catch {}
      setIsLoading(false);
    };
    loadSession();
  }, []);

  const login = useCallback(
    async (email: string, _password: string): Promise<"ok" | "invalid" | "device_blocked" | "security_unavailable"> => {
      await new Promise((r) => setTimeout(r, 1000));

      // DEMO: any valid email format works
      if (!email.includes("@")) return "invalid";

      const now = new Date().toISOString();
      let loggedUser: User = {
        ...MOCK_USER,
        email,
        lastLoginAt: now,
      };

      try {
        const result = await verifyStudentDevice({
          studentId: loggedUser.id,
          student: getVerificationStudentPayload(loggedUser, purchasedBooks),
          device: await getCurrentDevicePayload("active"),
        });

        if (!result.allowed) {
          setDeviceStatus("blocked_different_device");
          return "device_blocked";
        }

        loggedUser = userFromStudentPayload(loggedUser, result.student);
        setDeviceStatus("allowed");
      } catch {
        setDeviceStatus("security_unavailable");
        return "security_unavailable";
      }

      setUser(loggedUser);
      await saveSession(loggedUser, now);
      return "ok";
    },
    [purchasedBooks, saveSession]
  );

  const register = useCallback(
    async (
      name: string,
      email: string,
      phone: string,
      _password: string
    ): Promise<RegisterResult> => {
      await new Promise((r) => setTimeout(r, 1200));
      const normalizedPhone = normalizeEgyptPhoneInput(phone);
      if (!normalizedPhone) return { status: "invalid_phone" };

      let newUser: User = {
        id: "user-" + Date.now(),
        name,
        email,
        phone: normalizedPhone,
        phoneVerified: false,
        grade: "Grade 12",
        devicesCount: 1,
        joinedAt: new Date().toISOString(),
        passwordUpdatedAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
      };
      try {
        const result = await verifyStudentDevice({
          studentId: newUser.id,
          student: getVerificationStudentPayload(newUser, purchasedBooks),
          device: await getCurrentDevicePayload("active"),
        });

        if (!result.allowed) {
          setDeviceStatus("blocked_different_device");
          return { status: "device_blocked" };
        }

        newUser = userFromStudentPayload(newUser, result.student);
        setDeviceStatus("allowed");
      } catch {
        setDeviceStatus("security_unavailable");
        return { status: "security_unavailable" };
      }

      setUser(newUser);
      const issuedAt = new Date().toISOString();
      await saveSession(newUser, issuedAt);
      try {
        const phoneResponse = await requestStudentPhoneVerification(newUser.id);
        const nextUser = userFromStudentPayload(newUser, phoneResponse.student);
        setUser(nextUser);
        await saveSession(nextUser, issuedAt);
        return { status: "ok", devCode: phoneResponse.devCode };
      } catch (error) {
        return {
          status: "phone_verification_unavailable",
          error: error instanceof Error ? error.message : "Could not request phone verification.",
        };
      }
    },
    [purchasedBooks, saveSession]
  );

  const requestPhoneVerification = useCallback(async () => {
    if (!user) return { ok: false, error: "You must be signed in first." };

    try {
      const response = await requestStudentPhoneVerification(user.id);
      const nextUser = userFromStudentPayload(user, response.student);
      setUser(nextUser);
      await saveSession(nextUser);
      return { ok: true, devCode: response.devCode };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : "Could not request phone verification.",
      };
    }
  }, [saveSession, user]);

  const verifyPhoneCode = useCallback(async (code: string) => {
    if (!user) return { ok: false, error: "You must be signed in first." };

    try {
      const response = await verifyStudentPhone(user.id, code);
      const nextUser = userFromStudentPayload(user, response.student);
      setUser(nextUser);
      await saveSession(nextUser);
      return { ok: true };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : "Could not verify phone.",
      };
    }
  }, [saveSession, user]);

  const changePhone = useCallback(async (phone: string) => {
    if (!user) return { ok: false, error: "You must be signed in first." };

    const normalizedPhone = normalizeEgyptPhoneInput(phone);
    if (!normalizedPhone) {
      return {
        ok: false,
        error: "Enter a valid Egyptian mobile number, e.g. +201001234567 or 01001234567.",
      };
    }

    try {
      const student = await updateStudentPhone(user.id, normalizedPhone);
      const nextUser = userFromStudentPayload(user, student);
      setUser(nextUser);
      await saveSession(nextUser);
      return { ok: true };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : "Could not update phone.",
      };
    }
  }, [saveSession, user]);

  const logout = useCallback(async () => {
    setUser(null);
    setDeviceStatus("unknown");
    setSessionIssuedAt("");
    await AsyncStorage.removeItem(SESSION_STORAGE_KEY);
  }, []);

  const purchaseBook = useCallback(async (book: Book) => {
    await new Promise((r) => setTimeout(r, 800));
    const purchased: PurchasedBook = {
      ...book,
      purchaseDate: new Date().toISOString().split("T")[0],
      licenseId: "LIC-" + Date.now(),
      progress: 0,
      lastPage: 1,
      bookmarkedPages: [],
    };
    setPurchasedBooks((prev) => {
      if (prev.find((b) => b.id === book.id)) return prev;
      return [...prev, purchased];
    });
    if (user) {
      void createOrderFromBook({
        book,
        studentId: user.id,
        studentName: user.name,
      }).catch(() => {
        // Demo order sync should not block the local purchase experience.
      });
    }
  }, [user]);

  const updateReadingProgress = useCallback(
    (bookId: string, page: number, progress: number) => {
      setPurchasedBooks((prev) => {
        const target = prev.find((b) => b.id === bookId);
        // No-op when nothing changed: avoid rewriting lastOpened and re-rendering.
        if (!target || (target.lastPage === page && target.progress === progress)) {
          return prev;
        }
        return prev.map((b) =>
          b.id === bookId
            ? {
                ...b,
                lastPage: page,
                progress,
                lastOpened: new Date().toISOString().split("T")[0],
              }
            : b
        );
      });
    },
    []
  );

  const toggleBookmark = useCallback((bookId: string, page: number) => {
    setPurchasedBooks((prev) =>
      prev.map((b) => {
        if (b.id !== bookId) return b;
        const has = b.bookmarkedPages.includes(page);
        return {
          ...b,
          bookmarkedPages: has
            ? b.bookmarkedPages.filter((p) => p !== page)
            : [...b.bookmarkedPages, page],
        };
      })
    );
  }, []);

  const lendBook = useCallback(
    async (
      bookId: string,
      _borrowerPhone: string,
      days: number
    ): Promise<boolean> => {
      await new Promise((r) => setTimeout(r, 800));
      const book = purchasedBooks.find((b) => b.id === bookId);
      if (!book || !book.lendingEnabled) return false;
      const returnDate = new Date();
      returnDate.setDate(returnDate.getDate() + days);
      const lent: BorrowedBook = {
        ...book,
        borrowDate: new Date().toISOString().split("T")[0],
        returnDate: returnDate.toISOString().split("T")[0],
        ownerId: user?.id ?? "",
        ownerName: user?.name ?? "",
        isLentOut: true,
        borrowerName: "Friend",
      };
      setBorrowedBooks((prev) => [...prev, lent]);
      return true;
    },
    [purchasedBooks, user]
  );

  const returnBorrowedBook = useCallback((bookId: string) => {
    setBorrowedBooks((prev) => prev.filter((b) => b.id !== bookId));
  }, []);

  return (
    <AppContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        deviceStatus,
        purchasedBooks,
        borrowedBooks,
        platformSettings,
        sessionMessage,
        clearSessionMessage,
        login,
        register,
        requestPhoneVerification,
        verifyPhoneCode,
        changePhone,
        logout,
        purchaseBook,
        updateReadingProgress,
        toggleBookmark,
        lendBook,
        returnBorrowedBook,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}
