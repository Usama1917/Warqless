import { PUBLISHERS, type Publisher } from "@/data/mockData";

export const CREATED_PUBLISHERS_STORAGE_KEY = "warqless_created_publishers";
export const DELETED_PUBLISHERS_STORAGE_KEY = "warqless_deleted_publishers";

export type PublisherContentItem = {
  bookLanguages: string[];
  academicYears: string[];
  educationalStages?: string[];
  subjects: string[];
  classifications?: string[];
};

export type CreatedPublisher = Publisher & {
  accountName?: string;
  tradeName?: string;
  bookLanguages?: string[];
  academicYears?: string[];
  educationalStages?: string[];
  subjects?: string[];
  classifications?: string[];
  contentItems?: PublisherContentItem[];
};

export function parseStoredList(value: string) {
  return value
    .split(/[,،]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function readCreatedPublishers(): CreatedPublisher[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(CREATED_PUBLISHERS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveStoredPublishers(publishers: CreatedPublisher[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CREATED_PUBLISHERS_STORAGE_KEY, JSON.stringify(publishers));
}

export function readDeletedPublisherIds(): string[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(DELETED_PUBLISHERS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

export function saveDeletedPublisherIds(publisherIds: string[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(DELETED_PUBLISHERS_STORAGE_KEY, JSON.stringify(publisherIds));
}

export function readVisiblePublishers(): CreatedPublisher[] {
  const createdPublishers = readCreatedPublishers();
  const deletedPublisherIds = new Set(readDeletedPublisherIds());
  const storedPublisherById = new Map(createdPublishers.map((publisher) => [publisher.id, publisher]));
  const basePublisherIds = new Set(PUBLISHERS.map((publisher) => publisher.id));

  return [
    ...PUBLISHERS.filter((publisher) => !deletedPublisherIds.has(publisher.id)).map(
      (publisher) => storedPublisherById.get(publisher.id) ?? publisher,
    ),
    ...createdPublishers.filter(
      (publisher) => !basePublisherIds.has(publisher.id) && !deletedPublisherIds.has(publisher.id),
    ),
  ];
}
