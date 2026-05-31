/**
 * AppContext — MVP / DEMO AUTH
 *
 * Authentication is DEMO-ONLY: any valid-looking email + any password works.
 * Device registration is simulated via AsyncStorage UUID.
 * Replace with real backend auth + server-side device registration before production.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import {
  Book,
  BorrowedBook,
  MOCK_BORROWED_BOOKS,
  MOCK_PURCHASED_BOOKS,
  PurchasedBook,
} from "@/data/mockData";
import {
  getCurrentDeviceId,
  getPrimaryDeviceId,
  registerPrimaryDevice,
} from "@/services/deviceService";
import { logSecurityEvent } from "@/services/securityEventService";

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  grade: string;
  avatar?: string;
  devicesCount: number;
}

export type DeviceStatus =
  | "checking"
  | "allowed"
  | "blocked_different_device"
  | "unknown";

interface AppContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  deviceStatus: DeviceStatus;
  purchasedBooks: PurchasedBook[];
  borrowedBooks: BorrowedBook[];
  login: (email: string, password: string) => Promise<"ok" | "invalid" | "device_blocked">;
  register: (
    name: string,
    email: string,
    phone: string,
    password: string
  ) => Promise<boolean>;
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
  email: "sara.m@example.com",
  phone: "+20 1012 345678",
  grade: "Grade 12",
  devicesCount: 1,
};

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [deviceStatus, setDeviceStatus] = useState<DeviceStatus>("unknown");
  const [purchasedBooks, setPurchasedBooks] =
    useState<PurchasedBook[]>(MOCK_PURCHASED_BOOKS);
  const [borrowedBooks, setBorrowedBooks] =
    useState<BorrowedBook[]>(MOCK_BORROWED_BOOKS);

  useEffect(() => {
    const loadSession = async () => {
      try {
        const stored = await AsyncStorage.getItem("warqless_session");
        if (stored) {
          const session = JSON.parse(stored);
          const loggedUser: User = session.user;
          // Verify device on session restore
          const currentDeviceId = await getCurrentDeviceId();
          const primaryDeviceId = await getPrimaryDeviceId(loggedUser.id);
          if (!primaryDeviceId) {
            // No device registered — register this one silently
            await registerPrimaryDevice(loggedUser.id);
            setDeviceStatus("allowed");
          } else if (currentDeviceId === primaryDeviceId) {
            setDeviceStatus("allowed");
          } else {
            setDeviceStatus("blocked_different_device");
            // Don't restore session if device mismatch
            await AsyncStorage.removeItem("warqless_session");
            setIsLoading(false);
            return;
          }
          setUser(loggedUser);
        }
      } catch {}
      setIsLoading(false);
    };
    loadSession();
  }, []);

  const login = useCallback(
    async (email: string, _password: string): Promise<"ok" | "invalid" | "device_blocked"> => {
      await new Promise((r) => setTimeout(r, 1000));

      // DEMO: any valid email format works
      if (!email.includes("@")) return "invalid";

      const loggedUser: User = { ...MOCK_USER, email };

      // Device check
      const currentDeviceId = await getCurrentDeviceId();
      const primaryDeviceId = await getPrimaryDeviceId(loggedUser.id);

      if (!primaryDeviceId) {
        // First login — register this device as primary
        await registerPrimaryDevice(loggedUser.id);
        setDeviceStatus("allowed");
        logSecurityEvent({
          type: "device_registered",
          severity: "low",
          userId: loggedUser.id,
          userName: loggedUser.name,
          userEmail: loggedUser.email,
          deviceId: currentDeviceId,
          message: `First login. Device registered as primary device for account ${loggedUser.email}.`,
        });
      } else if (currentDeviceId === primaryDeviceId) {
        setDeviceStatus("allowed");
        logSecurityEvent({
          type: "device_verified",
          severity: "low",
          userId: loggedUser.id,
          userName: loggedUser.name,
          userEmail: loggedUser.email,
          deviceId: currentDeviceId,
          message: `Login from registered primary device. Access granted.`,
        });
      } else {
        // Different device — block access permanently
        // Production: backend is the source of truth for device binding.
        // The app only provides device identity; server decides if access is allowed.
        setDeviceStatus("blocked_different_device");
        logSecurityEvent({
          type: "device_blocked",
          severity: "critical",
          userId: loggedUser.id,
          userName: loggedUser.name,
          userEmail: loggedUser.email,
          deviceId: currentDeviceId,
          message: `Login attempt from unregistered device. Account is permanently bound to a different device. Correct email/password does not override device binding.`,
          metadata: { blockedDeviceId: currentDeviceId, registeredDeviceId: primaryDeviceId },
        });
        return "device_blocked";
      }

      setUser(loggedUser);
      await AsyncStorage.setItem(
        "warqless_session",
        JSON.stringify({ user: loggedUser })
      );
      return "ok";
    },
    []
  );

  const register = useCallback(
    async (
      name: string,
      email: string,
      phone: string,
      _password: string
    ): Promise<boolean> => {
      await new Promise((r) => setTimeout(r, 1200));
      const newUser: User = {
        id: "user-" + Date.now(),
        name,
        email,
        phone,
        grade: "Grade 12",
        devicesCount: 1,
      };
      // Register this device as primary for the new user
      await registerPrimaryDevice(newUser.id);
      setDeviceStatus("allowed");
      setUser(newUser);
      await AsyncStorage.setItem(
        "warqless_session",
        JSON.stringify({ user: newUser })
      );
      return true;
    },
    []
  );

  const logout = useCallback(async () => {
    setUser(null);
    setDeviceStatus("unknown");
    await AsyncStorage.removeItem("warqless_session");
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
  }, []);

  const updateReadingProgress = useCallback(
    (bookId: string, page: number, progress: number) => {
      setPurchasedBooks((prev) =>
        prev.map((b) =>
          b.id === bookId
            ? {
                ...b,
                lastPage: page,
                progress,
                lastOpened: new Date().toISOString().split("T")[0],
              }
            : b
        )
      );
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
        login,
        register,
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
