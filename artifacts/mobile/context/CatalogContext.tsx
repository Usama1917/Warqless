import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  BOOKS,
  GRADES,
  PUBLISHERS,
  SUBJECTS,
  type Book,
} from "@/data/mockData";
import { fetchCatalog } from "@/services/catalogService";

interface CatalogContextValue {
  books: Book[];
  grades: string[];
  subjects: string[];
  publishers: string[];
  isLoading: boolean;
  isUsingApi: boolean;
  refreshCatalog: () => Promise<void>;
}

const CatalogContext = createContext<CatalogContextValue | undefined>(undefined);

export function CatalogProvider({ children }: { children: React.ReactNode }) {
  const [books, setBooks] = useState<Book[]>(BOOKS);
  const [grades, setGrades] = useState<string[]>(GRADES);
  const [subjects, setSubjects] = useState<string[]>(SUBJECTS);
  const [publishers, setPublishers] = useState<string[]>(PUBLISHERS);
  const [isLoading, setIsLoading] = useState(true);
  const [isUsingApi, setIsUsingApi] = useState(false);

  const refreshCatalog = useCallback(async () => {
    try {
      const catalog = await fetchCatalog();
      setBooks(catalog.books.length > 0 ? catalog.books : BOOKS);
      setGrades(catalog.grades.length > 0 ? catalog.grades : GRADES);
      setSubjects(catalog.subjects.length > 0 ? catalog.subjects : SUBJECTS);
      setPublishers(catalog.publishers.length > 0 ? catalog.publishers : PUBLISHERS);
      setIsUsingApi(true);
    } catch {
      setBooks(BOOKS);
      setGrades(GRADES);
      setSubjects(SUBJECTS);
      setPublishers(PUBLISHERS);
      setIsUsingApi(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshCatalog();
    const interval = setInterval(() => {
      void refreshCatalog();
    }, 5000);

    return () => clearInterval(interval);
  }, [refreshCatalog]);

  const value = useMemo<CatalogContextValue>(
    () => ({
      books,
      grades,
      subjects,
      publishers,
      isLoading,
      isUsingApi,
      refreshCatalog,
    }),
    [books, grades, isLoading, isUsingApi, publishers, refreshCatalog, subjects],
  );

  return (
    <CatalogContext.Provider value={value}>
      {children}
    </CatalogContext.Provider>
  );
}

export function useCatalog() {
  const ctx = useContext(CatalogContext);
  if (!ctx) throw new Error("useCatalog must be used inside CatalogProvider");
  return ctx;
}
