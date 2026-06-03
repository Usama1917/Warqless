import { BOOKS, type AdminBook } from "@/data/mockData";
import { syncCatalogBooks } from "@/lib/apiSync";
import { DEFAULT_BOOK_CLASSIFICATION } from "@/lib/classificationOptions";

export const STORED_BOOKS_STORAGE_KEY = "warqless_admin_books";
export const STORED_BOOKS_UPDATED_AT_STORAGE_KEY = "warqless_admin_books_updated_at";

export type StoredAdminBook = AdminBook & {
  commissionPct?: number;
  couponCode?: string;
  discountPct?: number;
  discountResponsibility?: "platform" | "publisher" | "shared";
  educationalStage?: string;
};

function normalizeStoredBook(book: AdminBook): StoredAdminBook {
  return {
    ...book,
    classification: book.classification || DEFAULT_BOOK_CLASSIFICATION,
  };
}

export function readStoredBooks(): StoredAdminBook[] {
  if (typeof window === "undefined") return BOOKS.map(normalizeStoredBook);

  try {
    const raw = window.localStorage.getItem(STORED_BOOKS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) && parsed.length > 0
      ? parsed.map(normalizeStoredBook)
      : BOOKS.map(normalizeStoredBook);
  } catch {
    return BOOKS.map(normalizeStoredBook);
  }
}

export function hasStoredBooks() {
  if (typeof window === "undefined") return false;

  try {
    const raw = window.localStorage.getItem(STORED_BOOKS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) && parsed.length > 0;
  } catch {
    return false;
  }
}

export function getStoredBooksUpdatedAt() {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(STORED_BOOKS_UPDATED_AT_STORAGE_KEY) ?? "";
}

export function saveStoredBooks(
  books: StoredAdminBook[],
  options: { syncApi?: boolean; updatedAt?: string } = {},
) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORED_BOOKS_STORAGE_KEY, JSON.stringify(books));
  window.localStorage.setItem(
    STORED_BOOKS_UPDATED_AT_STORAGE_KEY,
    options.updatedAt ?? new Date().toISOString(),
  );

  if (options.syncApi !== false) {
    syncCatalogBooks(books);
  }
}
