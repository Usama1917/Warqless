import { useState, type FormEvent } from "react";
import { useLocation } from "wouter";
import { Search, Plus, Building2, TrendingUp, Trash2 } from "lucide-react";
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
import { PUBLISHERS, Publisher } from "@/data/mockData";
import { useAdminLanguage } from "@/context/AdminLanguageContext";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import { calculateBooksRevenue } from "@/lib/revenue";
import {
  DEFAULT_EDUCATION_STAGE,
  EDUCATION_STAGE_GROUPS,
  isEducationStageLevel,
  type EducationStageLevel,
} from "@/lib/educationOptions";
import {
  type CreatedPublisher,
  readDeletedPublisherIds,
  readCreatedPublishers,
  saveDeletedPublisherIds,
  saveStoredPublishers,
  type PublisherContentItem,
} from "@/lib/publisherStorage";
import { readStoredBooks } from "@/lib/bookStorage";
import { useToast } from "@/hooks/use-toast";

function statusVariant(s: Publisher["status"]) {
  return s === "active" ? ("success" as const) : ("danger" as const);
}

const LANGUAGE_OPTIONS = ["ar", "en", "fr", "de"] as const;
const CLASSIFICATION_OPTIONS = [
  "term1",
  "term2",
  "questions_practice",
  "explanation",
  "revision",
  "notes",
  "booklet",
  "workbook",
] as const;
const ACADEMIC_YEAR_OPTIONS = Array.from({ length: 12 }, (_, index) => {
  const startYear = 2025 + index;
  return `${startYear}/${startYear + 1}`;
});

type BookLanguage = (typeof LANGUAGE_OPTIONS)[number];
type BookClassification = (typeof CLASSIFICATION_OPTIONS)[number];

type AddPublisherForm = {
  email: string;
  password: string;
  accountName: string;
  tradeName: string;
  contents: PublisherContentForm[];
};

type PublisherTextField = Exclude<keyof AddPublisherForm, "contents">;

type PublisherContentForm = {
  id: string;
  bookLanguages: string;
  academicYears: string;
  educationalStage: string;
  subjects: string;
  classification: string;
};

function createEmptyContentForm(): PublisherContentForm {
  return {
    id: `content-${Date.now()}-${Math.round(Math.random() * 100000)}`,
    bookLanguages: "ar",
    academicYears: ACADEMIC_YEAR_OPTIONS[0],
    educationalStage: DEFAULT_EDUCATION_STAGE,
    subjects: "",
    classification: "term1",
  };
}

function createEmptyPublisherForm(): AddPublisherForm {
  return {
    email: "",
    password: "",
    accountName: "",
    tradeName: "",
    contents: [createEmptyContentForm()],
  };
}

function uniqueValues(values: string[]) {
  return Array.from(new Set(values));
}

function contentFormFromItem(
  item: Partial<PublisherContentItem>,
  index: number,
  prefix: string,
): PublisherContentForm {
  return {
    id: `${prefix}-content-${index}-${Date.now()}`,
    bookLanguages: item.bookLanguages?.[0] ?? "ar",
    academicYears: item.academicYears?.[0] ?? ACADEMIC_YEAR_OPTIONS[0],
    educationalStage: item.educationalStages?.[0] ?? DEFAULT_EDUCATION_STAGE,
    subjects: item.subjects?.[0] ?? "",
    classification: item.classifications?.[0] ?? "term1",
  };
}

function createPublisherFormFromPublisher(
  publisher: CreatedPublisher,
  books: ReturnType<typeof readStoredBooks>,
): AddPublisherForm {
  const publisherBooks = books.filter((book) => book.publisherId === publisher.id);
  const contentItems =
    publisher.contentItems?.length
      ? publisher.contentItems
      : publisher.subjects?.length
        ? publisher.subjects.map((subject) => ({
            bookLanguages: [publisher.bookLanguages?.[0] ?? "ar"],
            academicYears: [publisher.academicYears?.[0] ?? ACADEMIC_YEAR_OPTIONS[0]],
            educationalStages: [publisher.educationalStages?.[0] ?? DEFAULT_EDUCATION_STAGE],
            subjects: [subject],
            classifications: [publisher.classifications?.[0] ?? "term1"],
          }))
        : publisherBooks.map((book) => ({
            bookLanguages: [publisher.bookLanguages?.[0] ?? "ar"],
            academicYears: [publisher.academicYears?.[0] ?? ACADEMIC_YEAR_OPTIONS[0]],
            educationalStages: [book.educationalStage ?? DEFAULT_EDUCATION_STAGE],
            subjects: [book.subject],
            classifications: [publisher.classifications?.[0] ?? "term1"],
          }));

  return {
    email: publisher.email,
    password: "",
    accountName: publisher.accountName ?? publisher.name,
    tradeName: publisher.tradeName ?? publisher.name,
    contents: contentItems.length
      ? contentItems.map((item, index) => contentFormFromItem(item, index, publisher.id))
      : [createEmptyContentForm()],
  };
}

export default function PublishersPage() {
  const { t, isRTL, formatCurrency, formatDate } = useAdminLanguage();
  const { registerPublisherAccount } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [createdPublishers, setCreatedPublishers] = useState<CreatedPublisher[]>(
    readCreatedPublishers,
  );
  const [deletedPublisherIds, setDeletedPublisherIds] = useState<string[]>(
    readDeletedPublisherIds,
  );
  const [allBooks] = useState(readStoredBooks);
  const [isAddSheetOpen, setIsAddSheetOpen] = useState(false);
  const [editingPublisherId, setEditingPublisherId] = useState<string | null>(null);
  const [publisherDeleteTarget, setPublisherDeleteTarget] = useState<CreatedPublisher | null>(null);
  const [contentDeleteTargetId, setContentDeleteTargetId] = useState<string | null>(null);
  const [publisherForm, setPublisherForm] = useState<AddPublisherForm>(createEmptyPublisherForm);
  const storedPublisherById = new Map(createdPublishers.map((publisher) => [publisher.id, publisher]));
  const basePublisherIds = new Set(PUBLISHERS.map((publisher) => publisher.id));
  const deletedPublisherIdSet = new Set(deletedPublisherIds);
  const publishers: CreatedPublisher[] = [
    ...PUBLISHERS.filter((publisher) => !deletedPublisherIdSet.has(publisher.id)).map(
      (publisher) => storedPublisherById.get(publisher.id) ?? publisher,
    ),
    ...createdPublishers.filter(
      (publisher) => !basePublisherIds.has(publisher.id) && !deletedPublisherIdSet.has(publisher.id),
    ),
  ];

  const filtered = publishers.filter(
    (p) =>
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.accountName?.toLowerCase().includes(search.toLowerCase()) ||
      p.tradeName?.toLowerCase().includes(search.toLowerCase()) ||
      p.email.toLowerCase().includes(search.toLowerCase()) ||
      p.country.toLowerCase().includes(search.toLowerCase()) ||
      p.subjects?.some((subject) => subject.toLowerCase().includes(search.toLowerCase()))
  );

  const totalRevenue = calculateBooksRevenue(allBooks);
  const totalBooks = allBooks.length;
  const publisherSummaries = filtered.map((publisher) => {
    const books = allBooks.filter((book) => book.publisherId === publisher.id);

    return {
      publisher,
      books,
      revenue: calculateBooksRevenue(books),
    };
  });
  const normalizedEmail = publisherForm.email.trim().toLowerCase();
  const emailAlreadyExists = publishers.some(
    (publisher) =>
      publisher.id !== editingPublisherId &&
      publisher.email.toLowerCase() === normalizedEmail,
  );
  const contentItems: PublisherContentItem[] = publisherForm.contents.map((content) => ({
    bookLanguages: content.bookLanguages ? [content.bookLanguages] : [],
    academicYears: content.academicYears ? [content.academicYears] : [],
    educationalStages: content.educationalStage ? [content.educationalStage] : [],
    subjects: content.subjects.trim() ? [content.subjects.trim()] : [],
    classifications: content.classification ? [content.classification] : [],
  }));
  const contentLanguages = uniqueValues(contentItems.flatMap((content) => content.bookLanguages));
  const contentYears = uniqueValues(contentItems.flatMap((content) => content.academicYears));
  const contentEducationalStages = uniqueValues(
    contentItems.flatMap((content) => content.educationalStages ?? []),
  );
  const contentSubjects = uniqueValues(contentItems.flatMap((content) => content.subjects));
  const contentClassifications = uniqueValues(
    contentItems.flatMap((content) => content.classifications ?? []),
  );
  const getLanguageLabel = (value: string) =>
    LANGUAGE_OPTIONS.includes(value as BookLanguage)
      ? t.publishers.languageNames[value as BookLanguage]
      : value;
  const getClassificationLabel = (value: string) =>
    CLASSIFICATION_OPTIONS.includes(value as BookClassification)
      ? t.publishers.classificationNames[value as BookClassification]
      : value;
  const getEducationStageLabel = (value: string) =>
    isEducationStageLevel(value)
      ? t.education.levels[value as EducationStageLevel]
      : value;
  const allContentItemsComplete = contentItems.every(
    (content) =>
      content.bookLanguages.length > 0 &&
      content.academicYears.length > 0 &&
      (content.educationalStages?.length ?? 0) > 0 &&
      content.subjects.length > 0 &&
      (content.classifications?.length ?? 0) > 0,
  );
  const hasContentRows = publisherForm.contents.length > 0;
  const canSavePublisher =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail) &&
    (editingPublisherId ? publisherForm.password.length === 0 || publisherForm.password.length >= 6 : publisherForm.password.length >= 6) &&
    publisherForm.accountName.trim().length > 0 &&
    publisherForm.tradeName.trim().length > 0 &&
    (!hasContentRows || allContentItemsComplete) &&
    !emailAlreadyExists;
  const editingPublisher = editingPublisherId
    ? publishers.find((publisher) => publisher.id === editingPublisherId)
    : undefined;
  const publisherDeleteBooksCount = publisherDeleteTarget
    ? allBooks.filter((book) => book.publisherId === publisherDeleteTarget.id).length
    : 0;

  const openAddPublisherSheet = () => {
    setEditingPublisherId(null);
    setPublisherForm(createEmptyPublisherForm());
    setIsAddSheetOpen(true);
  };

  const openEditPublisherSheet = (publisher: CreatedPublisher) => {
    setEditingPublisherId(publisher.id);
    setPublisherForm(createPublisherFormFromPublisher(publisher, allBooks));
    setIsAddSheetOpen(true);
  };

  const handlePublisherSheetOpenChange = (open: boolean) => {
    setIsAddSheetOpen(open);
    if (!open) {
      setEditingPublisherId(null);
      setPublisherDeleteTarget(null);
      setContentDeleteTargetId(null);
    }
  };

  const openPublisherBooks = (publisherId: string) => {
    navigate(`/books?publisherId=${encodeURIComponent(publisherId)}`);
  };

  const updatePublisherForm = (key: PublisherTextField, value: string) => {
    setPublisherForm((current) => ({ ...current, [key]: value }));
  };

  const updatePublisherContent = (
    id: string,
    key: keyof Omit<PublisherContentForm, "id">,
    value: string,
  ) => {
    setPublisherForm((current) => ({
      ...current,
      contents: current.contents.map((content) =>
        content.id === id ? { ...content, [key]: value } : content,
      ),
    }));
  };

  const addPublisherContent = () => {
    setPublisherForm((current) => ({
      ...current,
      contents: [...current.contents, createEmptyContentForm()],
    }));
  };

  const requestRemovePublisherContent = (id: string) => {
    setContentDeleteTargetId(id);
  };

  const confirmRemovePublisherContent = () => {
    if (!contentDeleteTargetId) return;
    setPublisherForm((current) => ({
      ...current,
      contents: current.contents.filter((content) => content.id !== contentDeleteTargetId),
    }));
    setContentDeleteTargetId(null);
  };

  const confirmDeletePublisher = () => {
    if (!publisherDeleteTarget) return;

    const publisherId = publisherDeleteTarget.id;

    setCreatedPublishers((current) => {
      const next = current.filter((publisher) => publisher.id !== publisherId);
      saveStoredPublishers(next);
      return next;
    });

    if (basePublisherIds.has(publisherId)) {
      setDeletedPublisherIds((current) => {
        const next = current.includes(publisherId) ? current : [...current, publisherId];
        saveDeletedPublisherIds(next);
        return next;
      });
    } else {
      setDeletedPublisherIds((current) => {
        const next = current.filter((id) => id !== publisherId);
        if (next.length !== current.length) saveDeletedPublisherIds(next);
        return next;
      });
    }

    // TODO: Production should likely soft-delete/suspend publishers and let the backend enforce cascade rules.
    setPublisherDeleteTarget(null);
    setEditingPublisherId(null);
    setIsAddSheetOpen(false);
    toast({ title: t.publishers.publisherDeletedSuccess });
  };

  const togglePublisherStatus = (publisher: CreatedPublisher) => {
    const nextStatus: Publisher["status"] =
      publisher.status === "active" ? "suspended" : "active";
    const updatedPublisher: CreatedPublisher = { ...publisher, status: nextStatus };

    setCreatedPublishers((current) => {
      const next = [
        updatedPublisher,
        ...current.filter((existing) => existing.id !== publisher.id),
      ];
      saveStoredPublishers(next);
      return next;
    });
  };

  const handleAddPublisher = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSavePublisher) return;

    const existingPublisher = editingPublisherId
      ? publishers.find((publisher) => publisher.id === editingPublisherId)
      : undefined;
    const publisherId = existingPublisher?.id ?? `p-${Date.now()}`;
    const accountName = publisherForm.accountName.trim();
    const tradeName = publisherForm.tradeName.trim();
    const newPublisher: CreatedPublisher = {
      id: publisherId,
      name: tradeName,
      email: normalizedEmail,
      phone: existingPublisher?.phone ?? "",
      country: existingPublisher?.country ?? "Egypt",
      booksCount: existingPublisher?.booksCount ?? 0,
      totalRevenue: existingPublisher?.totalRevenue ?? 0,
      status: existingPublisher?.status ?? "active",
      joinedAt: existingPublisher?.joinedAt ?? new Date().toISOString(),
      accountName,
      tradeName,
      bookLanguages: contentLanguages,
      academicYears: contentYears,
      educationalStages: contentEducationalStages,
      subjects: contentSubjects,
      classifications: contentClassifications,
      contentItems,
    };

    setCreatedPublishers((current) => {
      const next = [newPublisher, ...current.filter((publisher) => publisher.id !== publisherId)];
      saveStoredPublishers(next);
      return next;
    });
    if (!existingPublisher || publisherForm.password.length > 0) {
      registerPublisherAccount({
        id: `pub-${publisherId}`,
        publisherId,
        name: accountName,
        email: normalizedEmail,
        password: publisherForm.password,
      });
    }
    setSearch("");
    setEditingPublisherId(null);
    setIsAddSheetOpen(false);
  };

  return (
    <div className="p-6">
      <PageHeader
        title={t.publishers.title}
        subtitle={t.publishers.subtitle(publishers.filter((p) => p.status === "active").length, totalBooks, formatCurrency(totalRevenue))}
        actions={
          <button
            type="button"
            onClick={openAddPublisherSheet}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition"
          >
            {isAddSheetOpen ? <Building2 size={15} /> : <Plus size={15} />}
            {isAddSheetOpen ? t.publishers.publisherDetails : t.publishers.addPublisher}
          </button>
        }
      />

      <div className="relative mb-5">
        <Search size={15} className={cn("absolute top-1/2 -translate-y-1/2 text-muted-foreground", isRTL ? "right-3" : "left-3")} />
        <input
          type="search"
          placeholder={t.publishers.searchPlaceholder}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={cn(
            "w-full max-w-sm py-2.5 rounded-xl border border-input bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring",
            isRTL ? "pr-9 pl-4" : "pl-9 pr-4",
          )}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {publisherSummaries.map(({ publisher, books, revenue }) => (
          <div key={publisher.id} className="bg-card border border-card-border rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Building2 size={18} className="text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-foreground text-sm">{publisher.name}</p>
                  <p className="text-muted-foreground text-xs">{publisher.country}</p>
                </div>
              </div>
              <Badge variant={statusVariant(publisher.status)}>{t.common[publisher.status]}</Badge>
            </div>

            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="bg-muted rounded-lg p-2.5 text-center">
                <p className="text-sm font-bold text-foreground">{books.length}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{t.common.books}</p>
              </div>
              <div className="bg-muted rounded-lg p-2.5 text-center col-span-2">
                <p className="text-sm font-bold text-foreground">{formatCurrency(revenue)}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{t.common.revenue}</p>
              </div>
            </div>

            <div className="text-xs text-muted-foreground space-y-1">
              <div className="flex items-center justify-between">
                <span>{publisher.email}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>{t.common.joined} {formatDate(publisher.joinedAt, { month: "short", year: "numeric" })}</span>
                <div className={cn("flex items-center gap-1 font-medium", publisher.status === "active" ? "text-emerald-600" : "text-destructive")}>
                  <TrendingUp size={11} />
                  <span>{t.common[publisher.status]}</span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3.5 border-t border-border flex gap-2">
              <button
                type="button"
                onClick={() => openPublisherBooks(publisher.id)}
                className="flex-1 py-1.5 text-xs font-medium text-primary border border-primary/30 rounded-lg hover:bg-primary/5 transition"
              >
                {t.publishers.viewBooks}
              </button>
              <button
                type="button"
                onClick={() => openEditPublisherSheet(publisher)}
                className="flex-1 py-1.5 text-xs font-medium text-foreground border border-border rounded-lg hover:bg-muted transition"
              >
                {t.common.edit}
              </button>
              {publisher.status === "active" ? (
                <button
                  type="button"
                  onClick={() => togglePublisherStatus(publisher)}
                  className="flex-1 py-1.5 text-xs font-medium text-destructive border border-destructive/30 rounded-lg hover:bg-destructive/5 transition"
                >
                  {t.common.suspend}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => togglePublisherStatus(publisher)}
                  className="flex-1 py-1.5 text-xs font-medium text-emerald-600 border border-emerald-200 rounded-lg hover:bg-emerald-50 transition"
                >
                  {t.common.reactivate}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="py-16 text-center text-muted-foreground text-sm">
          {t.publishers.noPublishers}
        </div>
      )}

      <Sheet open={isAddSheetOpen} onOpenChange={handlePublisherSheetOpenChange}>
        <SheetContent
          side="bottom"
          dir={isRTL ? "rtl" : "ltr"}
          className="flex h-[94vh] max-h-[94vh] overflow-hidden rounded-t-2xl border-card-border p-0 sm:left-1/2 sm:right-auto sm:w-[min(92rem,calc(100vw-2rem))] sm:-translate-x-1/2"
        >
          <form onSubmit={handleAddPublisher} className="flex h-full min-h-0 w-full flex-col">
            <SheetHeader className={cn("shrink-0 border-b border-border px-6 py-5", isRTL ? "text-right" : "text-left")}>
              <SheetTitle className="text-xl">{t.publishers.publisherDetails}</SheetTitle>
              <SheetDescription>{t.publishers.publisherDetailsDesc}</SheetDescription>
            </SheetHeader>

            <div className="grid min-h-0 flex-1 grid-cols-1 gap-6 overflow-y-auto px-6 py-5 lg:grid-cols-[1fr_340px]">
              <div className="space-y-6">
                <section className="rounded-xl border border-border bg-card p-4">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">{t.publishers.accountSection}</h3>
                    <p className="mt-0.5 text-xs text-muted-foreground">{t.publishers.accountSectionDesc}</p>
                  </div>
                  <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <label className="space-y-1.5">
                      <span className="block text-xs font-medium text-muted-foreground">{t.common.email}</span>
                      <input
                        dir="ltr"
                        type="email"
                        value={publisherForm.email}
                        onChange={(event) => updatePublisherForm("email", event.target.value)}
                        className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm text-foreground outline-none transition focus:ring-2 focus:ring-ring"
                        required
                      />
                      {emailAlreadyExists && normalizedEmail && (
                        <span className="block text-[11px] text-destructive">{t.publishers.emailAlreadyExists}</span>
                      )}
                    </label>
                    <label className="space-y-1.5">
                      <span className="block text-xs font-medium text-muted-foreground">{t.publishers.password}</span>
                      <input
                        dir="ltr"
                        type="password"
                        value={publisherForm.password}
                        onChange={(event) => updatePublisherForm("password", event.target.value)}
                        placeholder={editingPublisherId ? t.common.leaveBlank : t.publishers.passwordPlaceholder}
                        autoComplete="new-password"
                        className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none transition focus:ring-2 focus:ring-ring"
                        required={!editingPublisherId}
                      />
                    </label>
                  </div>
                </section>

                <section className="rounded-xl border border-border bg-card p-4">
                  <h3 className="text-sm font-semibold text-foreground">{t.publishers.publisherDataSection}</h3>
                  <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <label className="space-y-1.5">
                      <span className="block text-xs font-medium text-muted-foreground">{t.publishers.accountName}</span>
                      <input
                        value={publisherForm.accountName}
                        onChange={(event) => updatePublisherForm("accountName", event.target.value)}
                        placeholder={t.publishers.accountNamePlaceholder}
                        className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none transition focus:ring-2 focus:ring-ring"
                        required
                      />
                    </label>
                    <label className="space-y-1.5">
                      <span className="block text-xs font-medium text-muted-foreground">{t.publishers.tradeName}</span>
                      <input
                        value={publisherForm.tradeName}
                        onChange={(event) => updatePublisherForm("tradeName", event.target.value)}
                        placeholder={t.publishers.tradeNamePlaceholder}
                        className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none transition focus:ring-2 focus:ring-ring"
                        required
                      />
                    </label>
                  </div>
                </section>

                <section className="relative rounded-xl border border-border bg-card p-4">
                  <div className="pr-12">
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">{t.publishers.contentSection}</h3>
                      <p className="mt-0.5 text-xs text-muted-foreground">{t.publishers.commaHint}</p>
                    </div>
                    <button
                      type="button"
                      onClick={addPublisherContent}
                      aria-label={t.publishers.addContent}
                      title={t.publishers.addContent}
                      className="absolute right-4 top-4 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm transition hover:opacity-90"
                    >
                      <Plus size={18} />
                    </button>
                  </div>

                  <div className="mt-4 space-y-4">
                    {publisherForm.contents.length === 0 && (
                      <div className="rounded-xl border border-dashed border-border bg-muted/20 px-4 py-6 text-center text-sm text-muted-foreground">
                        {t.publishers.noContentAdded}
                      </div>
                    )}
                    {publisherForm.contents.map((content, index) => (
                      <div key={content.id} className="rounded-xl border border-border bg-muted/25 p-4">
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <p className="text-xs font-semibold text-muted-foreground">
                            {t.publishers.contentItem(index + 1)}
                          </p>
                          <button
                            type="button"
                            onClick={() => requestRemovePublisherContent(content.id)}
                            aria-label={t.publishers.deleteContent}
                            title={t.publishers.deleteContent}
                            className="flex h-7 w-7 items-center justify-center rounded-lg border border-destructive/30 text-destructive transition hover:bg-destructive/10"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-[150px_165px_220px_minmax(180px,1fr)_200px]">
                          <label className="space-y-1.5">
                            <span className="block text-xs font-medium text-muted-foreground">{t.publishers.bookLanguages}</span>
                            <select
                              value={content.bookLanguages}
                              onChange={(event) => updatePublisherContent(content.id, "bookLanguages", event.target.value)}
                              className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none transition focus:ring-2 focus:ring-ring"
                              required
                            >
                              {LANGUAGE_OPTIONS.map((language) => (
                                <option key={language} value={language}>
                                  {t.publishers.languageNames[language]}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="space-y-1.5">
                            <span className="block text-xs font-medium text-muted-foreground">{t.publishers.academicYears}</span>
                            <select
                              dir="ltr"
                              value={content.academicYears}
                              onChange={(event) => updatePublisherContent(content.id, "academicYears", event.target.value)}
                              className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none transition focus:ring-2 focus:ring-ring"
                              required
                            >
                              {ACADEMIC_YEAR_OPTIONS.map((academicYear) => (
                                <option key={academicYear} value={academicYear}>
                                  {academicYear}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="space-y-1.5">
                            <span className="block text-xs font-medium text-muted-foreground">{t.education.field}</span>
                            <select
                              value={content.educationalStage}
                              onChange={(event) => updatePublisherContent(content.id, "educationalStage", event.target.value)}
                              className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm text-foreground outline-none transition focus:ring-2 focus:ring-ring"
                              required
                            >
                              {EDUCATION_STAGE_GROUPS.map((group) => (
                                <optgroup key={group.id} label={t.education.groups[group.id]}>
                                  {group.levels.map((level) => (
                                    <option key={level} value={level}>
                                      {t.education.levels[level]}
                                    </option>
                                  ))}
                                </optgroup>
                              ))}
                            </select>
                          </label>
                          <label className="space-y-1.5">
                            <span className="block text-xs font-medium text-muted-foreground">{t.publishers.subjects}</span>
                            <input
                              value={content.subjects}
                              onChange={(event) => updatePublisherContent(content.id, "subjects", event.target.value)}
                              placeholder={t.publishers.subjectsPlaceholder}
                              className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none transition focus:ring-2 focus:ring-ring"
                              required
                            />
                          </label>
                          <label className="space-y-1.5">
                            <span className="block text-xs font-medium text-muted-foreground">{t.publishers.classification}</span>
                            <select
                              value={content.classification}
                              onChange={(event) => updatePublisherContent(content.id, "classification", event.target.value)}
                              className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm text-foreground outline-none transition focus:ring-2 focus:ring-ring"
                              required
                            >
                              {CLASSIFICATION_OPTIONS.map((classification) => (
                                <option key={classification} value={classification}>
                                  {t.publishers.classificationNames[classification]}
                                </option>
                              ))}
                            </select>
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </div>

              <aside className="rounded-xl border border-border bg-muted/40 p-4">
                <h3 className="text-sm font-semibold text-foreground">{t.publishers.publisherDetails}</h3>
                <dl className="mt-4 space-y-3 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-muted-foreground">{t.publishers.accountName}</dt>
                    <dd className="font-medium text-foreground">{publisherForm.accountName || "-"}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-muted-foreground">{t.publishers.tradeName}</dt>
                    <dd className="font-medium text-foreground">{publisherForm.tradeName || "-"}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-muted-foreground">{t.common.email}</dt>
                    <dd className="font-medium text-foreground" dir="ltr">{normalizedEmail || "-"}</dd>
                  </div>
                </dl>

                <div className="mt-5 border-t border-border pt-4">
                  <p className="text-xs font-medium text-muted-foreground">{t.publishers.contentSection}</p>
                  <div className="mt-3 space-y-4">
                    {contentItems.length === 0 && (
                      <p className="rounded-lg border border-dashed border-border bg-card px-3 py-4 text-xs text-muted-foreground">
                        {t.publishers.noContentAdded}
                      </p>
                    )}
                    {contentItems.map((content, index) => (
                      <div key={publisherForm.contents[index]?.id ?? index}>
                        <p className="text-[11px] font-semibold text-muted-foreground">
                          {t.publishers.contentItem(index + 1)}
                        </p>
                        <div className="mt-2 space-y-2">
                          {[
                            { label: t.publishers.bookLanguages, values: content.bookLanguages.map(getLanguageLabel) },
                            { label: t.publishers.academicYears, values: content.academicYears },
                            {
                              label: t.education.field,
                              values: (content.educationalStages ?? []).map(getEducationStageLabel),
                            },
                            { label: t.publishers.subjects, values: content.subjects },
                            {
                              label: t.publishers.classification,
                              values: (content.classifications ?? []).map(getClassificationLabel),
                            },
                          ].map((group) => (
                            <div key={group.label}>
                              <p className="text-[11px] text-muted-foreground">{group.label}</p>
                              <div className="mt-1 flex flex-wrap gap-1.5">
                                {group.values.length > 0 ? (
                                  group.values.map((value) => (
                                    <span key={value} className="rounded-full bg-card px-2 py-1 text-xs text-foreground">
                                      {value}
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-xs text-muted-foreground">-</span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <p className="mt-5 rounded-lg bg-primary/10 px-3 py-2 text-xs text-primary">
                  {t.publishers.loginReady}
                </p>
              </aside>
            </div>

            <SheetFooter className="shrink-0 gap-3 border-t border-border bg-background px-6 py-4 sm:justify-between sm:space-x-0">
              <div>
                {editingPublisher && (
                  <button
                    type="button"
                    onClick={() => setPublisherDeleteTarget(editingPublisher)}
                    className="rounded-xl border border-destructive/35 bg-background px-4 py-2 text-sm font-medium text-destructive transition hover:bg-destructive/10"
                  >
                    {t.publishers.deletePublisher}
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
                  disabled={!canSavePublisher}
                  className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {editingPublisherId ? t.common.saveChanges : t.publishers.savePublisher}
                </button>
              </div>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      <AlertDialog
        open={!!contentDeleteTargetId}
        onOpenChange={(open) => {
          if (!open) setContentDeleteTargetId(null);
        }}
      >
        <AlertDialogContent dir={isRTL ? "rtl" : "ltr"}>
          <AlertDialogHeader className={isRTL ? "text-right" : "text-left"}>
            <AlertDialogTitle>{t.publishers.deleteContentTitle}</AlertDialogTitle>
            <AlertDialogDescription>{t.publishers.deleteContentMessage}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:space-x-0">
            <AlertDialogCancel>{t.books.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmRemovePublisherContent}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t.publishers.deleteContentConfirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!publisherDeleteTarget}
        onOpenChange={(open) => {
          if (!open) setPublisherDeleteTarget(null);
        }}
      >
        <AlertDialogContent dir={isRTL ? "rtl" : "ltr"}>
          <AlertDialogHeader className={isRTL ? "text-right" : "text-left"}>
            <AlertDialogTitle>{t.publishers.deletePublisherTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {t.publishers.deletePublisherMessage}
              {publisherDeleteBooksCount > 0 && (
                <span className="mt-2 block font-medium text-destructive">
                  {t.publishers.deletePublisherBooksWarning}
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:space-x-0">
            <AlertDialogCancel>{t.books.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeletePublisher}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t.publishers.deletePublisher}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
