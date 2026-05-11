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

interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  grade: string;
  avatar?: string;
  devicesCount: number;
}

interface AppContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  purchasedBooks: PurchasedBook[];
  borrowedBooks: BorrowedBook[];
  login: (email: string, password: string) => Promise<boolean>;
  register: (
    name: string,
    email: string,
    phone: string,
    password: string
  ) => Promise<boolean>;
  logout: () => void;
  purchaseBook: (book: Book) => Promise<void>;
  updateReadingProgress: (
    bookId: string,
    page: number,
    progress: number
  ) => void;
  toggleBookmark: (bookId: string, page: number) => void;
  lendBook: (
    bookId: string,
    borrowerPhone: string,
    days: number
  ) => Promise<boolean>;
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
          setUser(session.user);
        }
      } catch {}
      setIsLoading(false);
    };
    loadSession();
  }, []);

  const login = useCallback(
    async (email: string, _password: string): Promise<boolean> => {
      await new Promise((r) => setTimeout(r, 1200));
      if (email.includes("@")) {
        const loggedUser = { ...MOCK_USER, email };
        setUser(loggedUser);
        await AsyncStorage.setItem(
          "warqless_session",
          JSON.stringify({ user: loggedUser })
        );
        return true;
      }
      return false;
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
      await new Promise((r) => setTimeout(r, 1500));
      const newUser: User = {
        id: "user-" + Date.now(),
        name,
        email,
        phone,
        grade: "Grade 12",
        devicesCount: 1,
      };
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
    await AsyncStorage.removeItem("warqless_session");
  }, []);

  const purchaseBook = useCallback(async (book: Book) => {
    await new Promise((r) => setTimeout(r, 1000));
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
      await new Promise((r) => setTimeout(r, 1000));
      const book = purchasedBooks.find((b) => b.id === bookId);
      if (!book || !book.lendingEnabled) return false;
      const returnDate = new Date();
      returnDate.setDate(returnDate.getDate() + days);
      const lent: BorrowedBook = {
        ...book,
        borrowDate: new Date().toISOString().split("T")[0],
        returnDate: returnDate.toISOString().split("T")[0],
        ownerId: user?.id || "",
        ownerName: user?.name || "",
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
