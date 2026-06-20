import { useEffect, useState } from "react";
import { Search, Plus, Star, BookOpen, Filter } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/Badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { AdminBook, Publisher } from "@/data/mockData";
import { useAuth } from "@/context/AuthContext";
import { useAdminLanguage } from "@/context/AdminLanguageContext";
import { cn } from "@/lib/utils";
import { calculateBookRevenue, calculateBooksRevenue } from "@/lib/revenue";
import { type CreatedPublisher, readVisiblePublishers } from "@/lib/publisherStorage";
import {
  DEFAULT_EDUCATION_STAGE,
  EDUCATION_STAGE_GROUPS,
  EDUCATION_STAGE_LEVELS,
  isEducationStageLevel,
  type EducationStageLevel,
} from "@/lib/educationOptions";
import {
  BOOK_CLASSIFICATION_OPTIONS,
  DEFAULT_BOOK_CLASSIFICATION,
  isBookClassification,
  type BookClassification,
} from "@/lib/classificationOptions";
import {
  getStoredBooksUpdatedAt,
  hasStoredBooks,
  readStoredBooks,
  saveStoredBooks,
  type StoredAdminBook,
} from "@/lib/bookStorage";
import { fetchSyncedAdminBooks, syncCatalogBooks } from "@/lib/apiSync";
import { useToast } from "@/hooks/use-toast";

function statusVariant(s: AdminBook["status"]) {
  if (s === "published") return "success" as const;
  if (s === "draft") return "neutral" as const;
  return "danger" as const;
}

type DiscountResponsibility = "platform" | "publisher" | "shared";
type EditableBookStatus = Extract<AdminBook["status"], "published" | "draft">;

type BooksPageBook = StoredAdminBook;

type BooksPagePublisher = Publisher & {
  subjects?: string[];
  educationalStages?: string[];
  classifications?: string[];
  contentItems?: {
    subjects?: string[];
    educationalStages?: string[];
    classifications?: string[];
  }[];
};

type AddBookForm = {
  publisherId: string;
  title: string;
  subject: string;
  educationalStage: string;
  // Publisher content rows define allowed scope; book records are the real student-facing books.
  // Classification is stored on the book so two books can share scope but differ by term/category.
  classification: string;
  status: EditableBookStatus;
  price: string;
  commissionPct: string;
  couponCode: string;
  discountPct: string;
  discountResponsibility: DiscountResponsibility;
};

function mergePublishersWithBookPublishers(
  publishers: CreatedPublisher[],
  books: BooksPageBook[],
): BooksPagePublisher[] {
  const publisherById = new Map<string, BooksPagePublisher>(
    publishers.map((publisher) => [publisher.id, publisher]),
  );

  for (const book of books) {
    if (!book.publisherId || publisherById.has(book.publisherId)) continue;

    const publisherBooks = books.filter((candidate) => candidate.publisherId === book.publisherId);
    const createdAtValues = publisherBooks
      .map((candidate) => new Date(candidate.createdAt).getTime())
      .filter((value) => !Number.isNaN(value));
    const joinedAt =
      createdAtValues.length > 0
        ? new Date(Math.min(...createdAtValues)).toISOString().slice(0, 10)
        : new Date().toISOString().slice(0, 10);

    publisherById.set(book.publisherId, {
      id: book.publisherId,
      name: book.publisher || book.publisherId,
      email: "",
      phone: "",
      country: "",
      booksCount: publisherBooks.length,
      totalRevenue: calculateBooksRevenue(publisherBooks),
      status: "active",
      joinedAt,
      subjects: uniqueValues(publisherBooks.map((candidate) => candidate.subject)),
      educationalStages: uniqueValues(
        publisherBooks
          .map((candidate) => candidate.educationalStage)
          .filter((value): value is string => Boolean(value)),
      ),
      classifications: uniqueValues(publisherBooks.map((candidate) => candidate.classification)),
    });
  }

  return Array.from(publisherById.values());
}

function uniqueValues(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function getPublisherSubjects(
  books: BooksPageBook[],
  publisherId: string,
  publishers: BooksPagePublisher[],
) {
  const contentSubjects =
    publishers.find((publisher) => publisher.id === publisherId)?.subjects ?? [];

  return Array.from(
    new Set(
      [
        ...contentSubjects,
        ...books
          .filter((book) => book.publisherId === publisherId)
          .map((book) => book.subject),
      ].filter(Boolean),
    ),
  ).sort((a, b) => a.localeCompare(b));
}

function getPublisherEducationalStages(publisher?: BooksPagePublisher) {
  if (!publisher) return [...EDUCATION_STAGE_LEVELS];

  const configuredStages = [
    ...(publisher.educationalStages ?? []),
    ...(publisher.contentItems?.flatMap((content) => content.educationalStages ?? []) ?? []),
  ].filter(isEducationStageLevel);

  if (configuredStages.length === 0) return [...EDUCATION_STAGE_LEVELS];

  return EDUCATION_STAGE_LEVELS.filter((stage) => configuredStages.includes(stage));
}

function getMatchingPublisherContentItems(
  publisher: BooksPagePublisher | undefined,
  subject: string,
  educationalStage: string,
) {
  if (!publisher?.contentItems?.length) return [];

  return publisher.contentItems.filter((content) => {
    const subjects = content.subjects ?? [];
    const stages = content.educationalStages ?? [];
    const subjectMatches = subjects.length === 0 || subjects.includes(subject);
    const stageMatches = stages.length === 0 || stages.includes(educationalStage);
    return subjectMatches && stageMatches;
  });
}

function getPublisherBookClassifications(
  publisher: BooksPagePublisher | undefined,
  subject: string,
  educationalStage: string,
) {
  const matchingContentItems = getMatchingPublisherContentItems(
    publisher,
    subject,
    educationalStage,
  );
  if ((publisher?.contentItems?.length ?? 0) > 0 && matchingContentItems.length === 0) {
    return [...BOOK_CLASSIFICATION_OPTIONS];
  }

  const scopedClassifications = uniqueValues(
    matchingContentItems.flatMap((content) => content.classifications ?? []),
  );
  const publisherClassifications = uniqueValues(publisher?.classifications ?? []);
  const sourceClassifications = scopedClassifications.length
    ? scopedClassifications
    : publisherClassifications;

  if (sourceClassifications.length === 0) return [...BOOK_CLASSIFICATION_OPTIONS];

  const knownClassifications = BOOK_CLASSIFICATION_OPTIONS.filter((classification) =>
    sourceClassifications.includes(classification),
  );
  const customClassifications = sourceClassifications.filter(
    (classification) => !knownClassifications.includes(classification as BookClassification),
  );

  return [...knownClassifications, ...customClassifications];
}

function readPublisherFilterFromUrl(publishers: BooksPagePublisher[]) {
  if (typeof window === "undefined") return "";

  const publisherId = new URLSearchParams(window.location.search).get("publisherId") ?? "";
  return publishers.some((publisher) => publisher.id === publisherId) ? publisherId : "";
}

function clampPercent(value: string) {
  return Math.min(Math.max(Number(value) || 0, 0), 100);
}

function normalizeDiscountResponsibility(value: unknown): DiscountResponsibility {
  return value === "publisher" || value === "shared" ? value : "platform";
}

function normalizeEditableBookStatus(status: AdminBook["status"]): EditableBookStatus {
  return status === "published" ? "published" : "draft";
}

function inferEducationStageFromGrade(grade: string) {
  const gradeNumber = Number(grade.match(/grade\s*(\d+)/i)?.[1]);

  if (gradeNumber >= 1 && gradeNumber <= 6) return `primary_${gradeNumber}`;
  if (gradeNumber >= 7 && gradeNumber <= 9) return `preparatory_${gradeNumber - 6}`;
  if (gradeNumber >= 10 && gradeNumber <= 12) return `secondary_${gradeNumber - 9}`;

  return DEFAULT_EDUCATION_STAGE;
}

function getBookListPrice(book: BooksPageBook) {
  return book.originalPrice ?? book.price;
}

function getBookDiscountPct(book: BooksPageBook) {
  if (typeof book.discountPct === "number") return book.discountPct;
  if (book.originalPrice && book.originalPrice > 0) {
    return ((book.originalPrice - book.price) / book.originalPrice) * 100;
  }

  return 0;
}

function createEmptyBookForm(
  publisherId: string,
  books: BooksPageBook[],
  publishers: BooksPagePublisher[],
): AddBookForm {
  const publisher = publishers.find((candidate) => candidate.id === publisherId);
  const subject = getPublisherSubjects(books, publisherId, publishers)[0] ?? "";
  const educationalStage =
    getPublisherEducationalStages(publisher)[0] ?? DEFAULT_EDUCATION_STAGE;

  return {
    publisherId,
    title: "",
    subject,
    educationalStage,
    classification:
      getPublisherBookClassifications(publisher, subject, educationalStage)[0] ??
      DEFAULT_BOOK_CLASSIFICATION,
    status: "draft",
    price: "",
    commissionPct: "30",
    couponCode: "",
    discountPct: "",
    discountResponsibility: "platform",
  };
}

function createBookFormFromBook(book: BooksPageBook): AddBookForm {
  const discountPct = getBookDiscountPct(book);
  const educationalStage =
    book.educationalStage && isEducationStageLevel(book.educationalStage)
      ? book.educationalStage
      : inferEducationStageFromGrade(book.grade);

  return {
    publisherId: book.publisherId,
    title: book.title,
    subject: book.subject,
    educationalStage,
    classification: book.classification || DEFAULT_BOOK_CLASSIFICATION,
    status: normalizeEditableBookStatus(book.status),
    price: String(getBookListPrice(book)),
    commissionPct: String(book.commissionPct ?? 30),
    couponCode: book.couponCode ?? "",
    discountPct: discountPct > 0 ? String(Number(discountPct.toFixed(1))) : "",
    discountResponsibility: normalizeDiscountResponsibility(book.discountResponsibility),
  };
}

function parseDateMs(value?: string) {
  if (!value) return 0;
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

export default function BooksPage() {
  const { user } = useAuth();
  const { t, isRTL, formatCurrency, formatNumber } = useAdminLanguage();
  const { toast } = useToast();
  const [visiblePublishers] = useState<CreatedPublisher[]>(readVisiblePublishers);
  const [allBooks, setAllBooks] = useState<BooksPageBook[]>(readStoredBooks);
  const allPublishers = mergePublishersWithBookPublishers(visiblePublishers, allBooks);
  const initialPublisherFilter = readPublisherFilterFromUrl(allPublishers);
  const defaultPublisherId = initialPublisherFilter || allPublishers[0]?.id || "";
  const [isAddSheetOpen, setIsAddSheetOpen] = useState(false);
  const [editingBookId, setEditingBookId] = useState<string | null>(null);
  const [bookDeleteTarget, setBookDeleteTarget] = useState<BooksPageBook | null>(null);
  const [publisherFilter, setPublisherFilter] = useState(initialPublisherFilter);
  const [bookForm, setBookForm] = useState<AddBookForm>(() =>
    createEmptyBookForm(defaultPublisherId, allBooks, allPublishers),
  );
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    let active = true;

    const loadBooksFromLocalApi = async (attempt = 0) => {
      const synced = await fetchSyncedAdminBooks();

      if (!active) return;

      if (synced.books.length === 0) {
        if (attempt < 5) {
          window.setTimeout(() => {
            void loadBooksFromLocalApi(attempt + 1);
          }, 1000);
        }
        return;
      }

      // Re-read local state AFTER the await so edits committed during the
      // in-flight request (handleAddBook / confirmDeleteBook) are respected
      // before deciding whether to adopt the synced catalog books.
      const localHasBooks = hasStoredBooks();
      const localUpdatedAtMs = parseDateMs(getStoredBooksUpdatedAt());
      const apiUpdatedAtMs = parseDateMs(synced.updatedAt);

      if (!localHasBooks || (localUpdatedAtMs > 0 && apiUpdatedAtMs > localUpdatedAtMs)) {
        setAllBooks(synced.books);
        saveStoredBooks(synced.books, { syncApi: false, updatedAt: synced.updatedAt });
        return;
      }

      syncCatalogBooks(readStoredBooks());
    };

    void loadBooksFromLocalApi();

    return () => {
      active = false;
    };
  }, []);

  const availablePublishers = user?.role === "publisher"
    ? allPublishers.filter((p) => p.id === user.publisherId)
    : allPublishers;

  const books = user?.role === "publisher"
    ? allBooks.filter((b) => b.publisherId === user.publisherId)
    : allBooks;
  const filteredPublisher = allPublishers.find((publisher) => publisher.id === publisherFilter);
  const editingBook = editingBookId
    ? allBooks.find((book) => book.id === editingBookId)
    : undefined;

  const selectedPublisher =
    availablePublishers.find((publisher) => publisher.id === bookForm.publisherId) ??
    availablePublishers[0];
  const publisherSubjects = selectedPublisher
    ? getPublisherSubjects(allBooks, selectedPublisher.id, allPublishers)
    : [];
  const publisherEducationalStages = getPublisherEducationalStages(selectedPublisher);
  const matchingPublisherContentItems = getMatchingPublisherContentItems(
    selectedPublisher,
    bookForm.subject,
    bookForm.educationalStage,
  );
  const filteredClassificationOptions = getPublisherBookClassifications(
    selectedPublisher,
    bookForm.subject,
    bookForm.educationalStage,
  );
  const classificationOptions =
    bookForm.classification && !filteredClassificationOptions.includes(bookForm.classification)
      ? [bookForm.classification, ...filteredClassificationOptions]
      : filteredClassificationOptions;
  const showClassificationFallback =
    Boolean(selectedPublisher?.contentItems?.length) &&
    bookForm.subject.trim().length > 0 &&
    bookForm.educationalStage.trim().length > 0 &&
    matchingPublisherContentItems.length === 0;
  const getEducationStageLabel = (value: string) =>
    isEducationStageLevel(value)
      ? t.education.levels[value as EducationStageLevel]
      : value;
  const getClassificationLabel = (value: string) => {
    if (isBookClassification(value)) {
      return t.books.classificationNames[value];
    }

    return t.publishers.classificationNames[
      value as keyof typeof t.publishers.classificationNames
    ] ?? value;
  };
  const priceValue = Number(bookForm.price) || 0;
  const discountPct = clampPercent(bookForm.discountPct);
  const commissionPct = clampPercent(bookForm.commissionPct);
  const discountValue = priceValue * (discountPct / 100);
  const finalPrice = Math.max(priceValue - discountValue, 0);
  const basePlatformCommission = priceValue * (commissionPct / 100);
  const commissionValue = basePlatformCommission;
  const basePublisherShare = priceValue - basePlatformCommission;
  const platformDiscountCost =
    bookForm.discountResponsibility === "platform"
      ? discountValue
      : bookForm.discountResponsibility === "shared"
        ? discountValue / 2
        : 0;
  const publisherDiscountCost =
    bookForm.discountResponsibility === "publisher"
      ? discountValue
      : bookForm.discountResponsibility === "shared"
        ? discountValue / 2
        : 0;
  const platformNet = basePlatformCommission - platformDiscountCost;
  const publisherNet = basePublisherShare - publisherDiscountCost;
  const platformNetPct = finalPrice > 0 ? (platformNet / finalPrice) * 100 : 0;
  const publisherNetPct = finalPrice > 0 ? (publisherNet / finalPrice) * 100 : 0;
  const canSaveBook =
    Boolean(selectedPublisher) &&
    bookForm.title.trim().length > 0 &&
    bookForm.subject.trim().length > 0 &&
    bookForm.educationalStage.trim().length > 0 &&
    bookForm.classification.trim().length > 0 &&
    priceValue > 0 &&
    commissionPct >= 0;

  const createEmptyForm = (publisherId: string): AddBookForm =>
    createEmptyBookForm(publisherId, allBooks, allPublishers);

  const openAddBookSheet = () => {
    const publisherId = selectedPublisher?.id ?? availablePublishers[0]?.id ?? "";
    setEditingBookId(null);
    setBookDeleteTarget(null);
    setBookForm(createEmptyForm(publisherId));
    setIsAddSheetOpen(true);
  };

  const openEditBookSheet = (book: BooksPageBook) => {
    setEditingBookId(book.id);
    setBookDeleteTarget(null);
    setBookForm(createBookFormFromBook(book));
    setIsAddSheetOpen(true);
  };

  const handleBookSheetOpenChange = (open: boolean) => {
    setIsAddSheetOpen(open);
    if (!open) {
      setEditingBookId(null);
      setBookDeleteTarget(null);
    }
  };

  const updatePublisher = (publisherId: string) => {
    const nextPublisher = allPublishers.find((publisher) => publisher.id === publisherId);
    const nextSubject = getPublisherSubjects(allBooks, publisherId, allPublishers)[0] ?? "";
    const nextEducationalStage =
      getPublisherEducationalStages(nextPublisher)[0] ?? DEFAULT_EDUCATION_STAGE;
    setBookForm((current) => ({
      ...current,
      publisherId,
      subject: nextSubject,
      educationalStage: nextEducationalStage,
      classification:
        getPublisherBookClassifications(nextPublisher, nextSubject, nextEducationalStage)[0] ??
        DEFAULT_BOOK_CLASSIFICATION,
    }));
  };

  const handleAddBook = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedPublisher || !canSaveBook) return;

    const existingBook = editingBookId
      ? allBooks.find((book) => book.id === editingBookId)
      : undefined;
    const salesCount = existingBook?.salesCount ?? 0;
    const savedBook: BooksPageBook = {
      id: existingBook?.id ?? `new-${Date.now()}`,
      title: bookForm.title.trim(),
      publisherId: selectedPublisher.id,
      publisher: selectedPublisher.name,
      subject: bookForm.subject,
      classification: bookForm.classification,
      grade: getEducationStageLabel(bookForm.educationalStage),
      type: existingBook?.type ?? "Book",
      price: Number(finalPrice.toFixed(2)),
      originalPrice: discountPct > 0 ? priceValue : undefined,
      status: bookForm.status,
      salesCount,
      totalRevenue: Number((finalPrice * salesCount).toFixed(2)),
      rating: existingBook?.rating ?? 0,
      lendingEnabled: existingBook?.lendingEnabled ?? false,
      createdAt: existingBook?.createdAt ?? new Date().toISOString(),
      educationalStage: bookForm.educationalStage,
      commissionPct,
      couponCode: bookForm.couponCode.trim() || undefined,
      discountPct: discountPct || undefined,
      discountResponsibility: bookForm.discountResponsibility,
    };

    setAllBooks((current) => {
      const next = existingBook
        ? current.map((book) => (book.id === existingBook.id ? savedBook : book))
        : [savedBook, ...current];
      saveStoredBooks(next);
      return next;
    });
    setSearch("");
    if (!existingBook) setStatusFilter(bookForm.status);
    setEditingBookId(null);
    setIsAddSheetOpen(false);
  };

  const confirmDeleteBook = () => {
    if (!bookDeleteTarget) return;

    setAllBooks((current) => {
      const next = current.filter((book) => book.id !== bookDeleteTarget.id);
      saveStoredBooks(next);
      return next;
    });
    setBookDeleteTarget(null);
    setEditingBookId(null);
    setIsAddSheetOpen(false);
    toast({ title: t.books.bookDeletedSuccess });
  };

  const formatPercentValue = (value: number) => `${formatNumber(Number(value.toFixed(1)))}%`;
  const discountResponsibilityOptions: { value: DiscountResponsibility; label: string }[] = [
    { value: "platform", label: t.books.discountPaidByPlatform },
    { value: "publisher", label: t.books.discountPaidByPublisher },
    { value: "shared", label: t.books.discountShared },
  ];

  const filtered = books.filter((b) => {
    const matchSearch =
      !search ||
      b.title.toLowerCase().includes(search.toLowerCase()) ||
      b.publisher.toLowerCase().includes(search.toLowerCase()) ||
      b.subject.toLowerCase().includes(search.toLowerCase()) ||
      getClassificationLabel(b.classification).toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || b.status === statusFilter;
    const matchPublisher = !publisherFilter || b.publisherId === publisherFilter;
    return matchSearch && matchStatus && matchPublisher;
  });

  const totals = {
    revenue: calculateBooksRevenue(books),
    sales: books.reduce((s, b) => s + b.salesCount, 0),
    published: books.filter((b) => b.status === "published").length,
  };

  return (
    <div className="p-6">
      <PageHeader
        title={t.books.title}
        subtitle={t.books.subtitle(totals.published, formatNumber(totals.sales), formatCurrency(totals.revenue))}
        actions={
          <button
            type="button"
            onClick={openAddBookSheet}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition"
          >
            {isAddSheetOpen ? <BookOpen size={15} /> : <Plus size={15} />}
            {isAddSheetOpen ? t.books.bookDetails : t.books.addBook}
          </button>
        }
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search size={15} className={cn("absolute top-1/2 -translate-y-1/2 text-muted-foreground", isRTL ? "right-3" : "left-3")} />
          <input
            type="search"
            placeholder={t.books.searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={cn(
              "w-full py-2.5 rounded-xl border border-input bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition",
              isRTL ? "pr-9 pl-4" : "pl-9 pr-4",
            )}
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-muted-foreground" />
          {(["all", "published", "draft", "suspended"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
                statusFilter === s
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.common[s]}
            </button>
          ))}
        </div>
      </div>

      {filteredPublisher && (
        <div className="mb-5 flex items-center justify-between gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-2.5 text-sm text-primary">
          <span>
            {t.common.publisher}: <span className="font-semibold">{filteredPublisher.name}</span>
          </span>
          <button
            type="button"
            onClick={() => {
              setPublisherFilter("");
              window.history.replaceState(null, "", window.location.pathname);
            }}
            className="rounded-lg border border-primary/25 px-3 py-1 text-xs font-medium transition hover:bg-primary/10"
          >
            {t.common.all}
          </button>
        </div>
      )}

      {/* Table */}
      <div className="bg-card border border-card-border rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="text-start px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">{t.common.book}</th>
              <th className="text-start px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide hidden md:table-cell">{t.common.subject}</th>
              <th className="text-start px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide hidden lg:table-cell">{t.common.publisher}</th>
              <th className="text-end px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">{t.common.price}</th>
              <th className="text-end px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide hidden lg:table-cell">{t.common.sales}</th>
              <th className="text-end px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide hidden xl:table-cell">{t.common.revenue}</th>
              <th className="text-center px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">{t.common.status}</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map((book) => (
              <tr key={book.id} className="hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <BookOpen size={16} className="text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-foreground truncate max-w-[200px]">{book.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {t.books.gradeClassificationAndType(
                          book.grade,
                          getClassificationLabel(book.classification),
                          book.type,
                        )}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{book.subject}</td>
                <td className="px-4 py-3 text-muted-foreground text-xs hidden lg:table-cell">{book.publisher}</td>
                <td className="px-4 py-3 text-end tabular-nums">
                  <span className="font-semibold text-foreground">{formatCurrency(book.price)}</span>
                  {book.originalPrice && (
                    <span className="text-muted-foreground text-xs line-through ms-1">{formatCurrency(book.originalPrice)}</span>
                  )}
                </td>
                <td className="px-4 py-3 text-end text-muted-foreground tabular-nums hidden lg:table-cell">
                  {formatNumber(book.salesCount)}
                </td>
                <td className="px-4 py-3 text-end font-semibold text-foreground tabular-nums hidden xl:table-cell">
                  {formatCurrency(calculateBookRevenue(book))}
                </td>
                <td className="px-4 py-3 text-center">
                  <Badge variant={statusVariant(book.status)}>{t.common[book.status]}</Badge>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5 justify-end">
                    {book.rating > 0 && (
                      <div className="flex items-center gap-0.5 text-amber-500">
                        <Star size={11} fill="currentColor" />
                        <span className="text-xs text-muted-foreground">{book.rating}</span>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => openEditBookSheet(book)}
                      className="text-xs text-primary hover:underline ms-2"
                    >
                      {t.common.edit}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="py-16 text-center text-muted-foreground text-sm">
            {t.books.noBooks}
          </div>
        )}
      </div>

      <Sheet open={isAddSheetOpen} onOpenChange={handleBookSheetOpenChange}>
        <SheetContent
          side="bottom"
          dir={isRTL ? "rtl" : "ltr"}
          className="flex h-[94vh] max-h-[94vh] overflow-hidden rounded-t-2xl border-card-border p-0 sm:left-1/2 sm:right-auto sm:w-[min(72rem,calc(100vw-2rem))] sm:-translate-x-1/2"
        >
          <form onSubmit={handleAddBook} className="flex h-full min-h-0 w-full flex-col">
            <SheetHeader className={cn("shrink-0 border-b border-border px-6 py-5", isRTL ? "text-right" : "text-left")}>
              <SheetTitle className="text-xl">{t.books.bookDetails}</SheetTitle>
              <SheetDescription>{t.books.bookDetailsDesc}</SheetDescription>
            </SheetHeader>

            <div className="grid min-h-0 flex-1 grid-cols-1 gap-6 overflow-y-auto px-6 py-5 lg:grid-cols-[1fr_280px]">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="space-y-1.5">
                  <span className="block text-xs font-medium text-muted-foreground">{t.books.publisherField}</span>
                  <select
                    value={bookForm.publisherId}
                    onChange={(event) => updatePublisher(event.target.value)}
                    className="w-full rounded-xl border border-input bg-card px-3 py-2.5 text-sm text-foreground outline-none transition focus:ring-2 focus:ring-ring"
                  >
                    {availablePublishers.map((publisher) => (
                      <option key={publisher.id} value={publisher.id}>
                        {publisher.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-1.5">
                  <span className="block text-xs font-medium text-muted-foreground">{t.books.subjectField}</span>
                  <select
                    value={bookForm.subject}
                    onChange={(event) => {
                      const nextSubject = event.target.value;
                      setBookForm((current) => {
                        const nextClassifications = getPublisherBookClassifications(
                          selectedPublisher,
                          nextSubject,
                          current.educationalStage,
                        );

                        return {
                          ...current,
                          subject: nextSubject,
                          classification: nextClassifications.includes(current.classification)
                            ? current.classification
                            : nextClassifications[0] ?? DEFAULT_BOOK_CLASSIFICATION,
                        };
                      });
                    }}
                    className="w-full rounded-xl border border-input bg-card px-3 py-2.5 text-sm text-foreground outline-none transition focus:ring-2 focus:ring-ring"
                    required
                  >
                    {publisherSubjects.length === 0 && (
                      <option value="">{t.books.selectSubject}</option>
                    )}
                    {publisherSubjects.map((subject) => (
                      <option key={subject} value={subject}>
                        {subject}
                      </option>
                    ))}
                  </select>
                  {selectedPublisher && (
                    <span className="block text-[11px] text-muted-foreground">
                      {t.books.publisherSubjectsHint(selectedPublisher.name)}
                    </span>
                  )}
                </label>

                <label className="space-y-1.5 sm:col-span-2">
                  <span className="block text-xs font-medium text-muted-foreground">{t.education.field}</span>
                  <select
                    value={bookForm.educationalStage}
                    onChange={(event) => {
                      const nextEducationalStage = event.target.value;
                      setBookForm((current) => {
                        const nextClassifications = getPublisherBookClassifications(
                          selectedPublisher,
                          current.subject,
                          nextEducationalStage,
                        );

                        return {
                          ...current,
                          educationalStage: nextEducationalStage,
                          classification: nextClassifications.includes(current.classification)
                            ? current.classification
                            : nextClassifications[0] ?? DEFAULT_BOOK_CLASSIFICATION,
                        };
                      });
                    }}
                    className="w-full rounded-xl border border-input bg-card px-3 py-2.5 text-sm text-foreground outline-none transition focus:ring-2 focus:ring-ring"
                    required
                  >
                    {EDUCATION_STAGE_GROUPS.map((group) => {
                      const levels = group.levels.filter((level) =>
                        publisherEducationalStages.includes(level),
                      );

                      if (levels.length === 0) return null;

                      return (
                        <optgroup key={group.id} label={t.education.groups[group.id]}>
                          {levels.map((level) => (
                            <option key={level} value={level}>
                              {t.education.levels[level]}
                            </option>
                          ))}
                        </optgroup>
                      );
                    })}
                  </select>
                </label>

                <label className="space-y-1.5">
                  <span className="block text-xs font-medium text-muted-foreground">{t.books.classificationField}</span>
                  <select
                    value={bookForm.classification}
                    onChange={(event) =>
                      setBookForm((current) => ({ ...current, classification: event.target.value }))
                    }
                    className="w-full rounded-xl border border-input bg-card px-3 py-2.5 text-sm text-foreground outline-none transition focus:ring-2 focus:ring-ring"
                    required
                  >
                    {classificationOptions.length === 0 && (
                      <option value="">{t.books.selectClassification}</option>
                    )}
                    {classificationOptions.map((classification) => (
                      <option key={classification} value={classification}>
                        {getClassificationLabel(classification)}
                      </option>
                    ))}
                  </select>
                  {showClassificationFallback && (
                    <span className="block text-[11px] text-muted-foreground">
                      {t.books.noMatchingPublisherContent}
                    </span>
                  )}
                  {!bookForm.classification && (
                    <span className="block text-[11px] text-destructive">
                      {t.books.classificationRequired}
                    </span>
                  )}
                </label>

                <label className="space-y-1.5">
                  <span className="block text-xs font-medium text-muted-foreground">{t.books.publicationStatus}</span>
                  <select
                    value={bookForm.status}
                    onChange={(event) =>
                      setBookForm((current) => ({
                        ...current,
                        status: event.target.value as EditableBookStatus,
                      }))
                    }
                    className="w-full rounded-xl border border-input bg-card px-3 py-2.5 text-sm text-foreground outline-none transition focus:ring-2 focus:ring-ring"
                    required
                  >
                    {(["draft", "published"] as const).map((status) => (
                      <option key={status} value={status}>
                        {t.common[status]}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-1.5 sm:col-span-2">
                  <span className="block text-xs font-medium text-muted-foreground">{t.books.bookNameField}</span>
                  <input
                    value={bookForm.title}
                    onChange={(event) => setBookForm((current) => ({ ...current, title: event.target.value }))}
                    placeholder={t.books.bookNamePlaceholder}
                    className="w-full rounded-xl border border-input bg-card px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none transition focus:ring-2 focus:ring-ring"
                    required
                  />
                </label>

                <label className="space-y-1.5">
                  <span className="block text-xs font-medium text-muted-foreground">{t.books.priceField}</span>
                  <input
                    dir="ltr"
                    type="number"
                    min="0"
                    step="0.01"
                    value={bookForm.price}
                    onChange={(event) => setBookForm((current) => ({ ...current, price: event.target.value }))}
                    className="w-full rounded-xl border border-input bg-card px-3 py-2.5 text-sm text-foreground outline-none transition focus:ring-2 focus:ring-ring"
                    required
                  />
                </label>

                <label className="space-y-1.5">
                  <span className="block text-xs font-medium text-muted-foreground">{t.books.commissionField}</span>
                  <input
                    dir="ltr"
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={bookForm.commissionPct}
                    onChange={(event) => setBookForm((current) => ({ ...current, commissionPct: event.target.value }))}
                    className="w-full rounded-xl border border-input bg-card px-3 py-2.5 text-sm text-foreground outline-none transition focus:ring-2 focus:ring-ring"
                    required
                  />
                </label>

                <div className="border-t border-border pt-4 sm:col-span-2">
                  <h3 className="text-sm font-semibold text-foreground">{t.books.optionalOptions}</h3>
                  <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <label className="space-y-1.5">
                      <span className="block text-xs font-medium text-muted-foreground">{t.books.couponCode}</span>
                      <input
                        dir="ltr"
                        value={bookForm.couponCode}
                        onChange={(event) => setBookForm((current) => ({ ...current, couponCode: event.target.value }))}
                        placeholder={t.books.couponPlaceholder}
                        className="w-full rounded-xl border border-input bg-card px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none transition focus:ring-2 focus:ring-ring"
                      />
                    </label>
                    <label className="space-y-1.5">
                      <span className="block text-xs font-medium text-muted-foreground">{t.books.discountField}</span>
                      <input
                        dir="ltr"
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={bookForm.discountPct}
                        onChange={(event) => setBookForm((current) => ({ ...current, discountPct: event.target.value }))}
                        className="w-full rounded-xl border border-input bg-card px-3 py-2.5 text-sm text-foreground outline-none transition focus:ring-2 focus:ring-ring"
                      />
                    </label>
                    <fieldset className="space-y-2 sm:col-span-2">
                      <legend className="text-xs font-medium text-muted-foreground">
                        {t.books.discountResponsibility}
                      </legend>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                        {discountResponsibilityOptions.map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            aria-pressed={bookForm.discountResponsibility === option.value}
                            onClick={() =>
                              setBookForm((current) => ({
                                ...current,
                                discountResponsibility: option.value,
                              }))
                            }
                            className={cn(
                              "rounded-xl border px-3 py-2 text-sm font-medium transition",
                              bookForm.discountResponsibility === option.value
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border bg-card text-muted-foreground hover:text-foreground",
                            )}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </fieldset>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-muted/40 p-4">
                <h3 className="text-sm font-semibold text-foreground">{t.books.bookDetails}</h3>
                <dl className="mt-4 space-y-3 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-muted-foreground">{t.books.publisherField}</dt>
                    <dd className="font-medium text-foreground">{selectedPublisher?.name ?? t.books.selectPublisher}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-muted-foreground">{t.books.subjectField}</dt>
                    <dd className="font-medium text-foreground">{bookForm.subject || t.books.selectSubject}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-muted-foreground">{t.education.field}</dt>
                    <dd className="font-medium text-foreground">{getEducationStageLabel(bookForm.educationalStage)}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-muted-foreground">{t.books.classificationField}</dt>
                    <dd className="font-medium text-foreground">
                      {bookForm.classification
                        ? getClassificationLabel(bookForm.classification)
                        : t.books.selectClassification}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-muted-foreground">{t.books.publicationStatus}</dt>
                    <dd className="font-medium text-foreground">{t.common[bookForm.status]}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-muted-foreground">{t.books.finalPrice}</dt>
                    <dd className="font-bold text-foreground tabular-nums" dir="ltr">
                      {formatCurrency(finalPrice)}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-muted-foreground">{t.books.commissionValue}</dt>
                    <dd className="font-bold text-primary tabular-nums" dir="ltr">
                      {formatCurrency(commissionValue)}
                    </dd>
                  </div>
                </dl>

                <div className="mt-5 border-t border-border pt-4">
                  <h3 className="text-sm font-semibold text-foreground">{t.books.commercialSummary}</h3>
                  <dl className="mt-4 space-y-3 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <dt className="text-muted-foreground">{t.books.listPrice}</dt>
                      <dd className="font-medium text-foreground tabular-nums" dir="ltr">
                        {formatCurrency(priceValue)}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <dt className="text-muted-foreground">{t.books.discountValue}</dt>
                      <dd className="font-medium text-foreground tabular-nums" dir="ltr">
                        {formatCurrency(discountValue)}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <dt className="text-muted-foreground">{t.books.customerPrice}</dt>
                      <dd className="font-bold text-foreground tabular-nums" dir="ltr">
                        {formatCurrency(finalPrice)}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <dt className="text-muted-foreground">{t.books.platformDiscountCost}</dt>
                      <dd className="font-medium text-foreground tabular-nums" dir="ltr">
                        {formatCurrency(platformDiscountCost)}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <dt className="text-muted-foreground">{t.books.publisherDiscountCost}</dt>
                      <dd className="font-medium text-foreground tabular-nums" dir="ltr">
                        {formatCurrency(publisherDiscountCost)}
                      </dd>
                    </div>
                    <div className="rounded-lg bg-card p-3">
                      <div className="flex items-center justify-between gap-3">
                        <dt className="text-muted-foreground">{t.books.adminNetPerCopy}</dt>
                        <dd
                          className={cn(
                            "font-bold tabular-nums",
                            platformNet < 0 ? "text-destructive" : "text-primary",
                          )}
                          dir="ltr"
                        >
                          {formatCurrency(platformNet)}
                        </dd>
                      </div>
                      <div className="mt-1 flex items-center justify-between gap-3">
                        <dt className="text-xs text-muted-foreground">{t.books.adminNetMargin}</dt>
                        <dd
                          className={cn(
                            "text-xs font-semibold tabular-nums",
                            platformNet < 0 ? "text-destructive" : "text-primary",
                          )}
                          dir="ltr"
                        >
                          {formatPercentValue(platformNetPct)}
                        </dd>
                      </div>
                    </div>
                    <div className="rounded-lg bg-card p-3">
                      <div className="flex items-center justify-between gap-3">
                        <dt className="text-muted-foreground">{t.books.publisherNetPerCopy}</dt>
                        <dd
                          className={cn(
                            "font-bold tabular-nums",
                            publisherNet < 0 ? "text-destructive" : "text-foreground",
                          )}
                          dir="ltr"
                        >
                          {formatCurrency(publisherNet)}
                        </dd>
                      </div>
                      <div className="mt-1 flex items-center justify-between gap-3">
                        <dt className="text-xs text-muted-foreground">{t.books.publisherNetMargin}</dt>
                        <dd
                          className={cn(
                            "text-xs font-semibold tabular-nums",
                            publisherNet < 0 ? "text-destructive" : "text-foreground",
                          )}
                          dir="ltr"
                        >
                          {formatPercentValue(publisherNetPct)}
                        </dd>
                      </div>
                    </div>
                  </dl>
                </div>
              </div>
            </div>

            <SheetFooter className="shrink-0 gap-3 border-t border-border bg-background px-6 py-4 sm:justify-between sm:space-x-0">
              <div>
                {editingBook && (
                  <button
                    type="button"
                    onClick={() => setBookDeleteTarget(editingBook)}
                    className="rounded-xl border border-destructive/35 bg-background px-4 py-2 text-sm font-medium text-destructive transition hover:bg-destructive/10"
                  >
                    {t.books.deleteBook}
                  </button>
                )}
              </div>
              <div className="flex flex-col-reverse gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={() => setIsAddSheetOpen(false)}
                  className="rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition hover:bg-muted"
                >
                  {t.books.cancel}
                </button>
                <button
                  type="submit"
                  disabled={!canSaveBook}
                  className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {editingBookId
                    ? t.common.saveChanges
                    : bookForm.status === "published"
                      ? t.books.publishBook
                      : t.books.saveDraft}
                </button>
              </div>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      <AlertDialog
        open={!!bookDeleteTarget}
        onOpenChange={(open) => {
          if (!open) setBookDeleteTarget(null);
        }}
      >
        <AlertDialogContent dir={isRTL ? "rtl" : "ltr"}>
          <AlertDialogHeader className={isRTL ? "text-right" : "text-left"}>
            <AlertDialogTitle>{t.books.deleteBookTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {t.books.deleteBookMessage}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:space-x-0">
            <AlertDialogCancel>{t.books.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteBook}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t.books.deleteBook}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
