import { Router, type IRouter } from "express";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { requireAdmin } from "../middlewares/adminAuth";
import {
  PHONE_VERIFICATION_MAX_ATTEMPTS,
  createPhoneVerificationCode,
  createPhoneVerificationHash,
  getPhoneVerificationExpiresAt,
  logDevPhoneOtp,
  normalizeEgyptPhone,
  shouldExposeDevPhoneOtp,
  verifyPhoneVerificationCode,
} from "../lib/phoneVerification";

type AdminBookInput = {
  id: string;
  title: string;
  publisherId?: string;
  publisher: string;
  subject: string;
  classification?: string;
  grade: string;
  type: string;
  price: number;
  originalPrice?: number;
  status: "published" | "draft" | "suspended";
  salesCount?: number;
  rating?: number;
  lendingEnabled?: boolean;
  createdAt?: string;
  couponCode?: string;
  discountPct?: number;
  discountResponsibility?: "platform" | "publisher" | "shared";
};

type CatalogOrder = {
  id: string;
  studentId: string;
  studentName: string;
  bookId: string;
  bookTitle: string;
  publisherId: string;
  publisher: string;
  amount: number;
  status: "completed" | "refunded" | "pending";
  createdAt: string;
  couponCode?: string;
  discountAmount?: number;
};

type StudentDevice = {
  deviceId: string;
  maskedDeviceId: string;
  platform: string;
  osVersion?: string;
  appVersion?: string;
  deviceName?: string;
  registeredAt: string;
  lastVerifiedAt: string;
  status: "active" | "blocked" | "pending_reset" | "removed";
  isPrimary?: boolean;
};

type DeviceChangeRequest = {
  id: string;
  deviceId: string;
  currentDeviceId?: string;
  requestedDeviceId?: string;
  reason: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
  requestedAt?: string;
  resolvedAt?: string;
  resolvedByAdminId?: string;
  adminNote?: string;
  updatedAt?: string;
};

type StudentSecurityEvent = {
  id: string;
  type: string;
  severity: "low" | "medium" | "high" | "critical";
  deviceId: string;
  deviceIdMasked?: string;
  message: string;
  createdAt: string;
  metadata?: Record<string, string>;
  reviewed?: boolean;
  reviewedAt?: string;
  reviewedByAdminId?: string;
};

type StudentCoupon = {
  code: string;
  status: "used" | "unused";
  bookId?: string;
  bookTitle?: string;
  discountPct?: number;
  discountResponsibility?: "platform" | "publisher" | "shared";
  usedAt?: string;
};

type StudentAuthSummary = {
  authProvider: "email_password_demo";
  passwordSet: boolean;
  passwordHashStored: boolean;
  passwordLastChangedAt?: string;
  lastLoginAt?: string;
  failedLoginAttempts: number;
  note: string;
};

type CatalogStudent = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  phoneVerified?: boolean;
  phoneVerifiedAt?: string;
  phoneVerificationCodeHash?: string;
  phoneVerificationExpiresAt?: string;
  phoneVerificationAttempts?: number;
  grade: string;
  booksOwned: number;
  booksBorrowed: number;
  totalSpent: number;
  devices: number;
  joinedAt: string;
  status: "active" | "suspended";
  currentDevice?: StudentDevice;
  deviceHistory: StudentDevice[];
  deviceChangeRequests: DeviceChangeRequest[];
  securityEvents: StudentSecurityEvent[];
  auth: StudentAuthSummary;
};

type PublicBookType =
  | "revision"
  | "textbook"
  | "workbook"
  | "question_bank"
  | "exam_prep"
  | "bundle";

type PublicBook = {
  id: string;
  title: string;
  publisherId?: string;
  publisher: string;
  subject: string;
  grade: string;
  academicYear: string;
  price: number;
  originalPrice?: number;
  couponCode?: string;
  discountPct?: number;
  discountResponsibility?: "platform" | "publisher" | "shared";
  description: string;
  pages: number;
  type: PublicBookType;
  lendingEnabled: boolean;
  rating: number;
  reviewCount: number;
  coverGradient: string[];
  coverAccent: string;
  isNew: boolean;
  isPopular: boolean;
  isFeatured: boolean;
  tags: string[];
};

type PlatformSettings = {
  accountSecurity: {
    sessionTimeoutMinutes: number;
    forceLogoutVersion: number;
    forceLogoutIssuedAt?: string;
  };
  deviceProtection: {
    oneDeviceOnlyForStudents: boolean;
    requireAdminApprovalForDeviceReset: boolean;
    deviceResetCooldownDays: number;
    maxDeviceResetRequestsPerMonth: number;
    blockLoginFromUnregisteredDevices: boolean;
    logEveryBlockedDeviceAttempt: boolean;
  };
  readerProtection: {
    requireInternetToOpenBooks: boolean;
    blockUnpurchasedReaderAccess: boolean;
    visibleWatermark: boolean;
    watermarkStudentEmail: boolean;
    watermarkDeviceId: boolean;
    watermarkTimestamp: boolean;
    screenshotProtectionEnabled: boolean;
    logScreenshotAttempts: boolean;
  };
  notifications: {
    adminEmailNotifications: boolean;
    publisherSecuritySummaryNotifications: boolean;
    studentAccountSecurityNotifications: boolean;
    deviceResetRequestNotifications: boolean;
  };
};

type CatalogState = {
  adminBooks: AdminBookInput[];
  orders: CatalogOrder[];
  students: CatalogStudent[];
  adminAuditLogs: unknown[];
  adminPanelSettings?: {
    platform?: unknown;
    [key: string]: unknown;
  };
  updatedAt: string;
  [key: string]: unknown;
};

const DATA_FILE = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "data",
  "catalog.json",
);

const SEED_BOOKS: AdminBookInput[] = [
  {
    id: "b1",
    title: "Mathematics Grade 10 — Thanawy",
    publisherId: "p1",
    publisher: "Dar Al-Ma'aref",
    subject: "Mathematics",
    classification: "term1",
    grade: "Grade 10",
    type: "Textbook",
    price: 89,
    originalPrice: 120,
    status: "published",
    salesCount: 1842,
    rating: 4.8,
    lendingEnabled: true,
    createdAt: "2024-02-01",
  },
  {
    id: "b2",
    title: "Physics Explained — Grade 11",
    publisherId: "p2",
    publisher: "Al-Shorouk Publishers",
    subject: "Physics",
    classification: "term1",
    grade: "Grade 11",
    type: "Textbook",
    price: 79,
    status: "published",
    salesCount: 1124,
    rating: 4.6,
    lendingEnabled: true,
    createdAt: "2024-02-15",
  },
  {
    id: "b3",
    title: "Arabic Language & Literature",
    publisherId: "p1",
    publisher: "Dar Al-Ma'aref",
    subject: "Arabic",
    classification: "term1",
    grade: "Grade 9",
    type: "Textbook",
    price: 65,
    status: "published",
    salesCount: 2310,
    rating: 4.9,
    lendingEnabled: false,
    createdAt: "2024-01-20",
  },
  {
    id: "b4",
    title: "Chemistry Workbook — Grade 12",
    publisherId: "p3",
    publisher: "Merit Publishing",
    subject: "Chemistry",
    classification: "workbook",
    grade: "Grade 12",
    type: "Workbook",
    price: 55,
    status: "published",
    salesCount: 756,
    rating: 4.4,
    lendingEnabled: true,
    createdAt: "2024-03-05",
  },
  {
    id: "b5",
    title: "Biology: Life Sciences",
    publisherId: "p4",
    publisher: "Arab Science Publishers",
    subject: "Biology",
    classification: "term1",
    grade: "Grade 10",
    type: "Textbook",
    price: 95,
    originalPrice: 130,
    status: "published",
    salesCount: 983,
    rating: 4.7,
    lendingEnabled: true,
    createdAt: "2024-04-12",
  },
];

const SUBJECT_THEMES: Record<string, { gradient: string[]; accent: string }> = {
  mathematics: { gradient: ["#1A4A7C", "#0D2D50"], accent: "#E8A22C" },
  physics: { gradient: ["#1B4332", "#0A2418"], accent: "#52B788" },
  chemistry: { gradient: ["#B7410E", "#7A2B0A"], accent: "#FF8C42" },
  biology: { gradient: ["#155E63", "#0A3D40"], accent: "#06B6D4" },
  arabic: { gradient: ["#1A1A2E", "#16213E"], accent: "#E94560" },
  english: { gradient: ["#7B2D8B", "#4A1A55"], accent: "#E040FB" },
  history: { gradient: ["#744210", "#4A2A0A"], accent: "#D97706" },
};

const DEFAULT_PLATFORM_SETTINGS: PlatformSettings = {
  accountSecurity: {
    sessionTimeoutMinutes: 60,
    forceLogoutVersion: 0,
  },
  deviceProtection: {
    oneDeviceOnlyForStudents: true,
    requireAdminApprovalForDeviceReset: true,
    deviceResetCooldownDays: 7,
    maxDeviceResetRequestsPerMonth: 2,
    blockLoginFromUnregisteredDevices: true,
    logEveryBlockedDeviceAttempt: true,
  },
  readerProtection: {
    requireInternetToOpenBooks: true,
    blockUnpurchasedReaderAccess: true,
    visibleWatermark: true,
    watermarkStudentEmail: true,
    watermarkDeviceId: true,
    watermarkTimestamp: true,
    screenshotProtectionEnabled: true,
    logScreenshotAttempts: true,
  },
  notifications: {
    adminEmailNotifications: true,
    publisherSecuritySummaryNotifications: false,
    studentAccountSecurityNotifications: true,
    deviceResetRequestNotifications: true,
  },
};

function createSeedState(): CatalogState {
  return { adminBooks: SEED_BOOKS, orders: [], students: [], adminAuditLogs: [], updatedAt: new Date().toISOString() };
}

async function readState(): Promise<CatalogState> {
  try {
    const raw = await readFile(DATA_FILE, "utf8");
    const parsed = JSON.parse(raw) as Partial<CatalogState>;
    if (!Array.isArray(parsed.adminBooks)) return createSeedState();

    return {
      ...parsed,
      adminBooks: parsed.adminBooks.filter(isAdminBookInput),
      orders: Array.isArray(parsed.orders) ? parsed.orders.filter(isCatalogOrder) : [],
      students: Array.isArray(parsed.students)
        ? parsed.students.map(normalizeStoredStudent).filter((student): student is CatalogStudent => Boolean(student))
        : [],
      adminAuditLogs: Array.isArray(parsed.adminAuditLogs) ? parsed.adminAuditLogs : [],
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : new Date().toISOString(),
    };
  } catch {
    return createSeedState();
  }
}

async function writeState(state: CatalogState): Promise<void> {
  await mkdir(path.dirname(DATA_FILE), { recursive: true });
  await writeFile(DATA_FILE, JSON.stringify(state, null, 2));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

function normalizeInteger(value: unknown, fallback: number, min: number, max: number): number {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : Number.NaN;
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(Math.trunc(parsed), min), max);
}

function getPlatformSettings(state: CatalogState): PlatformSettings {
  const rawPlatform = isRecord(state.adminPanelSettings?.platform) ? state.adminPanelSettings.platform : {};
  const accountSecurity = isRecord(rawPlatform.accountSecurity) ? rawPlatform.accountSecurity : {};
  const deviceProtection = isRecord(rawPlatform.deviceProtection) ? rawPlatform.deviceProtection : {};
  const readerProtection = isRecord(rawPlatform.readerProtection) ? rawPlatform.readerProtection : {};
  const notifications = isRecord(rawPlatform.notifications) ? rawPlatform.notifications : {};

  return {
    accountSecurity: {
      sessionTimeoutMinutes: normalizeInteger(
        accountSecurity.sessionTimeoutMinutes,
        DEFAULT_PLATFORM_SETTINGS.accountSecurity.sessionTimeoutMinutes,
        5,
        1440,
      ),
      forceLogoutVersion: normalizeInteger(
        accountSecurity.forceLogoutVersion,
        DEFAULT_PLATFORM_SETTINGS.accountSecurity.forceLogoutVersion,
        0,
        1_000_000,
      ),
      forceLogoutIssuedAt:
        typeof accountSecurity.forceLogoutIssuedAt === "string" ? accountSecurity.forceLogoutIssuedAt : undefined,
    },
    deviceProtection: {
      oneDeviceOnlyForStudents:
        typeof deviceProtection.oneDeviceOnlyForStudents === "boolean"
          ? deviceProtection.oneDeviceOnlyForStudents
          : DEFAULT_PLATFORM_SETTINGS.deviceProtection.oneDeviceOnlyForStudents,
      requireAdminApprovalForDeviceReset:
        typeof deviceProtection.requireAdminApprovalForDeviceReset === "boolean"
          ? deviceProtection.requireAdminApprovalForDeviceReset
          : DEFAULT_PLATFORM_SETTINGS.deviceProtection.requireAdminApprovalForDeviceReset,
      deviceResetCooldownDays: normalizeInteger(
        deviceProtection.deviceResetCooldownDays,
        DEFAULT_PLATFORM_SETTINGS.deviceProtection.deviceResetCooldownDays,
        0,
        365,
      ),
      maxDeviceResetRequestsPerMonth: normalizeInteger(
        deviceProtection.maxDeviceResetRequestsPerMonth,
        DEFAULT_PLATFORM_SETTINGS.deviceProtection.maxDeviceResetRequestsPerMonth,
        0,
        50,
      ),
      blockLoginFromUnregisteredDevices:
        typeof deviceProtection.blockLoginFromUnregisteredDevices === "boolean"
          ? deviceProtection.blockLoginFromUnregisteredDevices
          : DEFAULT_PLATFORM_SETTINGS.deviceProtection.blockLoginFromUnregisteredDevices,
      logEveryBlockedDeviceAttempt:
        typeof deviceProtection.logEveryBlockedDeviceAttempt === "boolean"
          ? deviceProtection.logEveryBlockedDeviceAttempt
          : DEFAULT_PLATFORM_SETTINGS.deviceProtection.logEveryBlockedDeviceAttempt,
    },
    readerProtection: {
      requireInternetToOpenBooks:
        typeof readerProtection.requireInternetToOpenBooks === "boolean"
          ? readerProtection.requireInternetToOpenBooks
          : DEFAULT_PLATFORM_SETTINGS.readerProtection.requireInternetToOpenBooks,
      blockUnpurchasedReaderAccess:
        typeof readerProtection.blockUnpurchasedReaderAccess === "boolean"
          ? readerProtection.blockUnpurchasedReaderAccess
          : DEFAULT_PLATFORM_SETTINGS.readerProtection.blockUnpurchasedReaderAccess,
      visibleWatermark:
        typeof readerProtection.visibleWatermark === "boolean"
          ? readerProtection.visibleWatermark
          : DEFAULT_PLATFORM_SETTINGS.readerProtection.visibleWatermark,
      watermarkStudentEmail:
        typeof readerProtection.watermarkStudentEmail === "boolean"
          ? readerProtection.watermarkStudentEmail
          : DEFAULT_PLATFORM_SETTINGS.readerProtection.watermarkStudentEmail,
      watermarkDeviceId:
        typeof readerProtection.watermarkDeviceId === "boolean"
          ? readerProtection.watermarkDeviceId
          : DEFAULT_PLATFORM_SETTINGS.readerProtection.watermarkDeviceId,
      watermarkTimestamp:
        typeof readerProtection.watermarkTimestamp === "boolean"
          ? readerProtection.watermarkTimestamp
          : DEFAULT_PLATFORM_SETTINGS.readerProtection.watermarkTimestamp,
      screenshotProtectionEnabled:
        typeof readerProtection.screenshotProtectionEnabled === "boolean"
          ? readerProtection.screenshotProtectionEnabled
          : DEFAULT_PLATFORM_SETTINGS.readerProtection.screenshotProtectionEnabled,
      logScreenshotAttempts:
        typeof readerProtection.logScreenshotAttempts === "boolean"
          ? readerProtection.logScreenshotAttempts
          : DEFAULT_PLATFORM_SETTINGS.readerProtection.logScreenshotAttempts,
    },
    notifications: {
      adminEmailNotifications:
        typeof notifications.adminEmailNotifications === "boolean"
          ? notifications.adminEmailNotifications
          : DEFAULT_PLATFORM_SETTINGS.notifications.adminEmailNotifications,
      publisherSecuritySummaryNotifications:
        typeof notifications.publisherSecuritySummaryNotifications === "boolean"
          ? notifications.publisherSecuritySummaryNotifications
          : DEFAULT_PLATFORM_SETTINGS.notifications.publisherSecuritySummaryNotifications,
      studentAccountSecurityNotifications:
        typeof notifications.studentAccountSecurityNotifications === "boolean"
          ? notifications.studentAccountSecurityNotifications
          : DEFAULT_PLATFORM_SETTINGS.notifications.studentAccountSecurityNotifications,
      deviceResetRequestNotifications:
        typeof notifications.deviceResetRequestNotifications === "boolean"
          ? notifications.deviceResetRequestNotifications
          : DEFAULT_PLATFORM_SETTINGS.notifications.deviceResetRequestNotifications,
    },
  };
}

function isAdminBookInput(value: unknown): value is AdminBookInput {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    typeof value.title === "string" &&
    typeof value.publisher === "string" &&
    typeof value.subject === "string" &&
    typeof value.grade === "string" &&
    typeof value.type === "string" &&
    typeof value.price === "number" &&
    (value.status === "published" || value.status === "draft" || value.status === "suspended")
  );
}

function isCatalogOrder(value: unknown): value is CatalogOrder {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    typeof value.studentId === "string" &&
    typeof value.studentName === "string" &&
    typeof value.bookId === "string" &&
    typeof value.bookTitle === "string" &&
    typeof value.publisherId === "string" &&
    typeof value.publisher === "string" &&
    typeof value.amount === "number" &&
    typeof value.createdAt === "string" &&
    (value.status === "completed" || value.status === "refunded" || value.status === "pending")
  );
}

function normalizeIncomingOrder(
  value: unknown,
  student: CatalogStudent,
  books: AdminBookInput[],
): CatalogOrder | undefined {
  if (!isRecord(value)) return undefined;

  const bookId = typeof value.bookId === "string" ? value.bookId : "";
  const book = books.find((candidate) => candidate.id === bookId);
  const bookTitle =
    typeof value.bookTitle === "string"
      ? value.bookTitle
      : book?.title;
  const publisher =
    typeof value.publisher === "string"
      ? value.publisher
      : book?.publisher;

  if (!bookId || !bookTitle || !publisher) return undefined;

  const amount =
    typeof value.amount === "number" && Number.isFinite(value.amount)
      ? value.amount
      : book?.price ?? 0;
  const status =
    value.status === "refunded" || value.status === "pending"
      ? value.status
      : "completed";
  const couponCode = typeof value.couponCode === "string" && value.couponCode.trim()
    ? value.couponCode.trim()
    : undefined;
  const discountAmount =
    typeof value.discountAmount === "number" && Number.isFinite(value.discountAmount)
      ? value.discountAmount
      : undefined;

  return {
    id: typeof value.id === "string" ? value.id : `mobile-${student.id}-${bookId}`,
    studentId: student.id,
    studentName: student.name,
    bookId,
    bookTitle,
    publisherId:
      typeof value.publisherId === "string"
        ? value.publisherId
        : book?.publisherId ?? "",
    publisher,
    amount: Number(amount.toFixed(2)),
    status,
    createdAt:
      typeof value.createdAt === "string"
        ? value.createdAt
        : new Date().toISOString(),
    couponCode,
    discountAmount,
  };
}

function mergeOrders(existingOrders: CatalogOrder[], incomingOrders: CatalogOrder[]) {
  const byId = new Map<string, CatalogOrder>();
  for (const order of existingOrders) byId.set(order.id, order);
  for (const order of incomingOrders) byId.set(order.id, { ...byId.get(order.id), ...order });
  return Array.from(byId.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

function maskDeviceId(id: string): string {
  if (id.length <= 8) return "********";
  return `${id.slice(0, 4)}********${id.slice(-4)}`;
}

function normalizeDevice(value: unknown): StudentDevice | undefined {
  if (!isRecord(value) || typeof value.deviceId !== "string") return undefined;
  const now = new Date().toISOString();
  return {
    deviceId: value.deviceId,
    maskedDeviceId: typeof value.maskedDeviceId === "string" ? value.maskedDeviceId : maskDeviceId(value.deviceId),
    platform: typeof value.platform === "string" ? value.platform : "unknown",
    osVersion: typeof value.osVersion === "string" ? value.osVersion : undefined,
    appVersion: typeof value.appVersion === "string" ? value.appVersion : undefined,
    deviceName: typeof value.deviceName === "string" ? value.deviceName : undefined,
    registeredAt: typeof value.registeredAt === "string" ? value.registeredAt : now,
    lastVerifiedAt: typeof value.lastVerifiedAt === "string" ? value.lastVerifiedAt : now,
    status:
      value.status === "blocked" || value.status === "pending_reset" || value.status === "removed"
        ? value.status
        : "active",
    isPrimary: typeof value.isPrimary === "boolean" ? value.isPrimary : undefined,
  };
}

function normalizeDeviceChangeRequest(value: unknown): DeviceChangeRequest | undefined {
  if (!isRecord(value) || typeof value.reason !== "string") return undefined;
  return {
    id: typeof value.id === "string" ? value.id : `reset-${Date.now()}`,
    deviceId: typeof value.deviceId === "string" ? value.deviceId : "unknown",
    currentDeviceId: typeof value.currentDeviceId === "string" ? value.currentDeviceId : undefined,
    requestedDeviceId: typeof value.requestedDeviceId === "string" ? value.requestedDeviceId : undefined,
    reason: value.reason,
    status:
      value.status === "approved" || value.status === "rejected"
        ? value.status
        : "pending",
    createdAt: typeof value.createdAt === "string" ? value.createdAt : new Date().toISOString(),
    requestedAt: typeof value.requestedAt === "string" ? value.requestedAt : undefined,
    resolvedAt: typeof value.resolvedAt === "string" ? value.resolvedAt : undefined,
    resolvedByAdminId: typeof value.resolvedByAdminId === "string" ? value.resolvedByAdminId : undefined,
    adminNote: typeof value.adminNote === "string" ? value.adminNote : undefined,
    updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : undefined,
  };
}

function normalizeSecurityEvent(value: unknown): StudentSecurityEvent | undefined {
  if (!isRecord(value) || typeof value.type !== "string" || typeof value.message !== "string") return undefined;
  return {
    id: typeof value.id === "string" ? value.id : `evt-${Date.now()}`,
    type: value.type,
    severity:
      value.severity === "medium" || value.severity === "high" || value.severity === "critical"
        ? value.severity
        : "low",
    deviceId: typeof value.deviceId === "string" ? maskDeviceId(value.deviceId) : "unknown",
    deviceIdMasked: typeof value.deviceId === "string" ? maskDeviceId(value.deviceId) : undefined,
    message: value.message,
    createdAt: typeof value.createdAt === "string" ? value.createdAt : new Date().toISOString(),
    metadata: isRecord(value.metadata)
      ? Object.fromEntries(
          Object.entries(value.metadata).filter((entry): entry is [string, string] => typeof entry[1] === "string"),
        )
      : undefined,
    reviewed: typeof value.reviewed === "boolean" ? value.reviewed : undefined,
    reviewedAt: typeof value.reviewedAt === "string" ? value.reviewedAt : undefined,
    reviewedByAdminId: typeof value.reviewedByAdminId === "string" ? value.reviewedByAdminId : undefined,
  };
}

function normalizeAuthSummary(value: unknown, existing?: StudentAuthSummary): StudentAuthSummary {
  const auth = isRecord(value) ? value : {};
  return {
    authProvider: "email_password_demo",
    passwordSet: typeof auth.passwordSet === "boolean" ? auth.passwordSet : existing?.passwordSet ?? true,
    passwordHashStored:
      typeof auth.passwordHashStored === "boolean" ? auth.passwordHashStored : existing?.passwordHashStored ?? false,
    passwordLastChangedAt:
      typeof auth.passwordLastChangedAt === "string" ? auth.passwordLastChangedAt : existing?.passwordLastChangedAt,
    lastLoginAt: typeof auth.lastLoginAt === "string" ? auth.lastLoginAt : existing?.lastLoginAt,
    failedLoginAttempts:
      typeof auth.failedLoginAttempts === "number" ? auth.failedLoginAttempts : existing?.failedLoginAttempts ?? 0,
    note:
      typeof auth.note === "string"
        ? auth.note
        : "Password value is never returned to the admin UI. This MVP uses demo email/password auth.",
  };
}

function dedupeDevices(devices: StudentDevice[]) {
  const byId = new Map<string, StudentDevice>();
  for (const device of devices) byId.set(device.deviceId, { ...byId.get(device.deviceId), ...device });
  return Array.from(byId.values());
}

function dedupeEvents(events: StudentSecurityEvent[]) {
  const seen = new Set<string>();
  return events.filter((event) => {
    if (seen.has(event.id)) return false;
    seen.add(event.id);
    return true;
  });
}

function normalizeStoredStudent(value: unknown): CatalogStudent | null {
  return normalizeIncomingStudent(value, undefined, true);
}

function normalizeIncomingStudent(value: unknown, existing?: CatalogStudent, trustStoredVerification = false): CatalogStudent | null {
  if (!isRecord(value)) return null;
  if (typeof value.id !== "string" || typeof value.name !== "string" || typeof value.email !== "string") return null;

  const currentDevice = normalizeDevice(value.currentDevice) ?? existing?.currentDevice;
  const incomingHistory = Array.isArray(value.deviceHistory)
    ? value.deviceHistory.map(normalizeDevice).filter((device): device is StudentDevice => Boolean(device))
    : [];
  const deviceHistory = dedupeDevices([
    ...(existing?.deviceHistory ?? []),
    ...incomingHistory,
    ...(currentDevice ? [currentDevice] : []),
  ]);
  const incomingRequests = Array.isArray(value.deviceChangeRequests)
    ? value.deviceChangeRequests
        .map(normalizeDeviceChangeRequest)
        .filter((request): request is DeviceChangeRequest => Boolean(request))
    : [];
  const incomingEvents = Array.isArray(value.securityEvents)
    ? value.securityEvents.map(normalizeSecurityEvent).filter((event): event is StudentSecurityEvent => Boolean(event))
    : [];
  const rawPhone = typeof value.phone === "string" ? value.phone : undefined;
  const phoneWasProvided = rawPhone !== undefined;
  const normalizedPhone = phoneWasProvided ? normalizeEgyptPhone(rawPhone) ?? undefined : existing?.phone;
  if (phoneWasProvided && rawPhone.trim() && !normalizedPhone) return null;
  const phoneChanged = trustStoredVerification ? false : normalizedPhone !== existing?.phone;
  const phoneVerified = phoneChanged
    ? false
    : trustStoredVerification
      ? Boolean(value.phoneVerified)
      : Boolean(existing?.phoneVerified);

  return {
    id: value.id,
    name: value.name,
    email: value.email,
    phone: normalizedPhone,
    phoneVerified,
    phoneVerifiedAt: phoneChanged
      ? undefined
      : trustStoredVerification && typeof value.phoneVerifiedAt === "string"
        ? value.phoneVerifiedAt
        : existing?.phoneVerifiedAt,
    phoneVerificationCodeHash:
      phoneChanged
        ? undefined
        : trustStoredVerification && typeof value.phoneVerificationCodeHash === "string"
          ? value.phoneVerificationCodeHash
          : existing?.phoneVerificationCodeHash,
    phoneVerificationExpiresAt:
      phoneChanged
        ? undefined
        : trustStoredVerification && typeof value.phoneVerificationExpiresAt === "string"
          ? value.phoneVerificationExpiresAt
          : existing?.phoneVerificationExpiresAt,
    phoneVerificationAttempts:
      phoneChanged
        ? 0
        : trustStoredVerification && typeof value.phoneVerificationAttempts === "number"
          ? value.phoneVerificationAttempts
          : existing?.phoneVerificationAttempts,
    grade: typeof value.grade === "string" ? value.grade : existing?.grade ?? "Grade 12",
    booksOwned: typeof value.booksOwned === "number" ? value.booksOwned : existing?.booksOwned ?? 0,
    booksBorrowed: typeof value.booksBorrowed === "number" ? value.booksBorrowed : existing?.booksBorrowed ?? 0,
    totalSpent: typeof value.totalSpent === "number" ? value.totalSpent : existing?.totalSpent ?? 0,
    devices: typeof value.devices === "number" ? value.devices : existing?.devices ?? 1,
    joinedAt: typeof value.joinedAt === "string" ? value.joinedAt : existing?.joinedAt ?? new Date().toISOString(),
    status: existing?.status ?? (value.status === "suspended" ? "suspended" : "active"),
    currentDevice,
    deviceHistory,
    deviceChangeRequests: [...incomingRequests, ...(existing?.deviceChangeRequests ?? [])],
    securityEvents: dedupeEvents([...incomingEvents, ...(existing?.securityEvents ?? [])]).slice(0, 100),
    auth: normalizeAuthSummary(value.auth, existing?.auth),
  };
}

function normalizeBookType(value: string): PublicBookType {
  const normalized = value.trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (normalized.includes("revision")) return "revision";
  if (normalized.includes("workbook")) return "workbook";
  if (normalized.includes("question") || normalized.includes("practice")) return "question_bank";
  if (normalized.includes("exam")) return "exam_prep";
  if (normalized.includes("bundle")) return "bundle";
  return "textbook";
}

function getTheme(subject: string) {
  return SUBJECT_THEMES[subject.trim().toLowerCase()] ?? {
    gradient: ["#1A4A7C", "#102A43"],
    accent: "#E8A22C",
  };
}

function getPageCount(type: PublicBookType): number {
  if (type === "bundle") return 540;
  if (type === "question_bank") return 420;
  if (type === "exam_prep") return 360;
  if (type === "workbook") return 220;
  if (type === "revision") return 300;
  return 260;
}

function toPublicBook(book: AdminBookInput, index: number): PublicBook | null {
  if (book.status !== "published") return null;

  const type = normalizeBookType(book.type);
  const theme = getTheme(book.subject);
  const salesCount = Number.isFinite(book.salesCount) ? book.salesCount ?? 0 : 0;
  const createdAt = book.createdAt ? new Date(book.createdAt).getTime() : 0;
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

  return {
    id: book.id,
    title: book.title,
    publisherId: book.publisherId,
    publisher: book.publisher,
    subject: book.subject,
    grade: book.grade,
    academicYear: "2025/2026",
    price: book.price,
    originalPrice: book.originalPrice,
    couponCode: book.couponCode,
    discountPct: book.discountPct,
    discountResponsibility: book.discountResponsibility,
    description: `${book.title} is a ${book.subject} ${book.grade} ${type.replace("_", " ")} from ${book.publisher}. It is synced from the Warqless admin and publisher dashboard.`,
    pages: getPageCount(type),
    type,
    lendingEnabled: Boolean(book.lendingEnabled),
    rating: Number.isFinite(book.rating) && (book.rating ?? 0) > 0 ? Number((book.rating ?? 0).toFixed(1)) : 4.2,
    reviewCount: Math.max(18, Math.round(salesCount * 1.2)),
    coverGradient: theme.gradient,
    coverAccent: theme.accent,
    isNew: createdAt > thirtyDaysAgo || index < 2,
    isPopular: salesCount >= 900,
    isFeatured: index < 4 || salesCount >= 1500,
    tags: [book.subject.toLowerCase(), book.grade.toLowerCase().replace(/\s+/g, "-"), type],
  };
}

function buildStudentCoupons(state: CatalogState, student: CatalogStudent) {
  const couponBooks = state.adminBooks.filter(
    (book) => book.status === "published" && typeof book.couponCode === "string" && book.couponCode.trim(),
  );
  const usedOrders = state.orders.filter((order) => order.studentId === student.id && order.couponCode);
  const usedCodes = new Set(usedOrders.map((order) => order.couponCode));
  const used: StudentCoupon[] = usedOrders.map((order) => ({
    code: order.couponCode ?? "",
    status: "used",
    bookId: order.bookId,
    bookTitle: order.bookTitle,
    usedAt: order.createdAt,
  }));
  const unused: StudentCoupon[] = couponBooks
    .filter((book) => !usedCodes.has(book.couponCode))
    .map((book) => ({
      code: book.couponCode ?? "",
      status: "unused",
      bookId: book.id,
      bookTitle: book.title,
      discountPct: book.discountPct,
      discountResponsibility: book.discountResponsibility,
    }));

  return { used, unused };
}

function enrichStudent(state: CatalogState, student: CatalogStudent) {
  const { phoneVerificationCodeHash: _phoneVerificationCodeHash, ...safeStudent } = student;
  return {
    ...safeStudent,
    coupons: buildStudentCoupons(state, student),
  };
}

function createSecurityEvent({
  type,
  severity,
  deviceId,
  message,
  metadata,
}: {
  type: string;
  severity: StudentSecurityEvent["severity"];
  deviceId: string;
  message: string;
  metadata?: Record<string, string>;
}): StudentSecurityEvent {
  return {
    id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    type,
    severity,
    deviceId: maskDeviceId(deviceId),
    deviceIdMasked: maskDeviceId(deviceId),
    message,
    metadata,
    createdAt: new Date().toISOString(),
  };
}

function appendStudentEvent(student: CatalogStudent, event: StudentSecurityEvent) {
  return {
    ...student,
    securityEvents: dedupeEvents([event, ...student.securityEvents]).slice(0, 100),
  };
}

function hasRecentEvent(
  student: CatalogStudent,
  type: string,
  deviceId: string,
  windowMs: number,
  extraMatch?: (event: StudentSecurityEvent) => boolean,
) {
  const now = Date.now();
  const maskedDeviceId = maskDeviceId(deviceId);
  return student.securityEvents.some((event) => {
    const eventTime = new Date(event.createdAt).getTime();
    if (Number.isNaN(eventTime) || now - eventTime > windowMs) return false;
    if (event.type !== type) return false;
    if (event.deviceId !== maskedDeviceId && event.deviceIdMasked !== maskedDeviceId) return false;
    return extraMatch ? extraMatch(event) : true;
  });
}

function buildVerifiedDevice(value: unknown): StudentDevice | undefined {
  const device = normalizeDevice(value);
  if (!device) return undefined;
  const now = new Date().toISOString();
  return {
    ...device,
    maskedDeviceId: device.maskedDeviceId || maskDeviceId(device.deviceId),
    registeredAt: device.registeredAt || now,
    lastVerifiedAt: now,
    status: "active",
    isPrimary: true,
  };
}

function buildStudentForDeviceVerification(id: string, value: unknown, device: StudentDevice): CatalogStudent | null {
  if (!isRecord(value)) return null;
  const now = new Date().toISOString();
  const name = typeof value.name === "string" && value.name.trim() ? value.name : undefined;
  const email = typeof value.email === "string" && value.email.trim() ? value.email : undefined;
  if (!name || !email) return null;
  const normalizedPhone = typeof value.phone === "string" ? normalizeEgyptPhone(value.phone) ?? undefined : undefined;
  const phoneVerified = normalizedPhone ? Boolean(value.phoneVerified) : false;

  return {
    id,
    name,
    email,
    phone: normalizedPhone,
    phoneVerified,
    phoneVerifiedAt: phoneVerified
      ? typeof value.phoneVerifiedAt === "string"
        ? value.phoneVerifiedAt
        : now
      : undefined,
    grade: typeof value.grade === "string" ? value.grade : "Grade 12",
    booksOwned: typeof value.booksOwned === "number" ? value.booksOwned : 0,
    booksBorrowed: 0,
    totalSpent: typeof value.totalSpent === "number" ? value.totalSpent : 0,
    devices: 1,
    joinedAt: typeof value.joinedAt === "string" ? value.joinedAt : now,
    status: "active",
    currentDevice: device,
    deviceHistory: [device],
    deviceChangeRequests: [],
    securityEvents: [],
    auth: normalizeAuthSummary(value.auth),
  };
}

function getPrimaryDevice(student: CatalogStudent) {
  return student.currentDevice ?? student.deviceHistory.find((device) => device.isPrimary || device.status === "active");
}

function setPrimaryDevice(student: CatalogStudent, device: StudentDevice): CatalogStudent {
  return {
    ...student,
    currentDevice: device,
    devices: Math.max(student.devices, 1),
    deviceHistory: dedupeDevices([
      ...student.deviceHistory.map((item) => ({
        ...item,
        status: item.deviceId === device.deviceId ? "active" as const : item.status,
        isPrimary: item.deviceId === device.deviceId,
        lastVerifiedAt: item.deviceId === device.deviceId ? device.lastVerifiedAt : item.lastVerifiedAt,
      })),
      device,
    ]),
  };
}

function addBlockedDevice(student: CatalogStudent, device: StudentDevice): CatalogStudent {
  const blockedDevice: StudentDevice = {
    ...device,
    status: "blocked",
    isPrimary: false,
  };

  return {
    ...student,
    deviceHistory: dedupeDevices([...student.deviceHistory, blockedDevice]),
  };
}

function hasCompletedOrderForBook(state: CatalogState, studentId: string, bookId: string) {
  return state.orders.some(
    (order) => order.studentId === studentId && order.bookId === bookId && order.status === "completed",
  );
}

function parseDateMs(value?: string) {
  if (!value) return 0;
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

function latestDeviceResetRequest(student: CatalogStudent) {
  return [...student.deviceChangeRequests].sort((a, b) => parseDateMs(b.createdAt) - parseDateMs(a.createdAt))[0];
}

function countDeviceResetRequestsThisMonth(student: CatalogStudent, now = new Date()) {
  const monthStart = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1);
  return student.deviceChangeRequests.filter((request) => parseDateMs(request.createdAt) >= monthStart).length;
}

function getDeviceResetCooldownUntil(student: CatalogStudent, cooldownDays: number) {
  if (cooldownDays <= 0) return undefined;
  const latest = latestDeviceResetRequest(student);
  if (!latest) return undefined;
  const latestMs = parseDateMs(latest.createdAt);
  if (!latestMs) return undefined;
  const cooldownUntil = latestMs + cooldownDays * 24 * 60 * 60 * 1000;
  return cooldownUntil > Date.now() ? new Date(cooldownUntil).toISOString() : undefined;
}

function updateStudentInState(state: CatalogState, student: CatalogStudent): CatalogState {
  return {
    ...state,
    students: [student, ...state.students.filter((candidate) => candidate.id !== student.id)],
    updatedAt: new Date().toISOString(),
  };
}

function buildCatalogResponse(state: CatalogState) {
  const books = state.adminBooks
    .map(toPublicBook)
    .filter((book): book is PublicBook => Boolean(book));
  const publishers = Array.from(new Set(books.map((book) => book.publisher))).sort();
  const grades = Array.from(new Set(books.map((book) => book.grade))).sort();
  const subjects = Array.from(new Set(books.map((book) => book.subject))).sort();

  return {
    books,
    publishers,
    grades,
    subjects,
    updatedAt: state.updatedAt,
  };
}

const router: IRouter = Router();

router.get("/catalog", async (_req, res, next) => {
  try {
    const state = await readState();
    res.json(buildCatalogResponse(state));
  } catch (err) {
    next(err);
  }
});

router.get("/catalog/books", async (_req, res, next) => {
  try {
    const state = await readState();
    res.json({
      books: state.adminBooks,
      updatedAt: state.updatedAt,
    });
  } catch (err) {
    next(err);
  }
});

router.get("/platform-settings", async (_req, res, next) => {
  try {
    const state = await readState();
    res.json({
      platformSettings: getPlatformSettings(state),
      updatedAt: state.updatedAt,
    });
  } catch (err) {
    next(err);
  }
});

router.put("/catalog/books", requireAdmin, async (req, res, next) => {
  try {
    const incoming = Array.isArray(req.body?.books) ? req.body.books : [];
    const books = incoming.filter(isAdminBookInput);
    const currentState = await readState();
    const state: CatalogState = {
      ...currentState,
      adminBooks: books,
      updatedAt: new Date().toISOString(),
    };
    await writeState(state);
    res.json(buildCatalogResponse(state));
  } catch (err) {
    next(err);
  }
});

router.get("/orders", requireAdmin, async (_req, res, next) => {
  try {
    const state = await readState();
    res.json({ orders: state.orders, updatedAt: state.updatedAt });
  } catch (err) {
    next(err);
  }
});

router.get("/students", requireAdmin, async (_req, res, next) => {
  try {
    const state = await readState();
    res.json({
      students: state.students.map((student) => enrichStudent(state, student)),
      updatedAt: state.updatedAt,
    });
  } catch (err) {
    next(err);
  }
});

router.post("/students", async (req, res, next) => {
  try {
    const state = await readState();
    const existingStudent = state.students.find((student) => student.id === req.body?.id);
    const incomingStudent = normalizeIncomingStudent(req.body, existingStudent);
    if (!incomingStudent) {
      res.status(400).json({ message: "Invalid student payload" });
      return;
    }

    const nextState: CatalogState = {
      ...state,
      students: [incomingStudent, ...state.students.filter((candidate) => candidate.id !== incomingStudent.id)],
      orders: mergeOrders(
        state.orders,
        Array.isArray(req.body?.orders)
          ? req.body.orders
              .map((order: unknown) => normalizeIncomingOrder(order, incomingStudent, state.adminBooks))
              .filter((order: CatalogOrder | undefined): order is CatalogOrder => Boolean(order))
          : [],
      ),
      updatedAt: new Date().toISOString(),
    };

    await writeState(nextState);
    res.status(existingStudent ? 200 : 201).json(enrichStudent(nextState, incomingStudent));
  } catch (err) {
    next(err);
  }
});

router.patch("/students/:id/phone", async (req, res, next) => {
  try {
    const state = await readState();
    const existingStudent = state.students.find((student) => student.id === req.params.id);
    if (!existingStudent) {
      res.status(404).json({ message: "Student not found" });
      return;
    }

    const normalizedPhone = normalizeEgyptPhone(req.body?.phone);
    if (!normalizedPhone) {
      res.status(400).json({ message: "Enter a valid Egyptian mobile phone number, e.g. +201001234567 or 01001234567." });
      return;
    }

    const phoneChanged = normalizedPhone !== existingStudent.phone;
    const student: CatalogStudent = {
      ...existingStudent,
      phone: normalizedPhone,
      phoneVerified: phoneChanged ? false : Boolean(existingStudent.phoneVerified),
      phoneVerifiedAt: phoneChanged ? undefined : existingStudent.phoneVerifiedAt,
      phoneVerificationCodeHash: phoneChanged ? undefined : existingStudent.phoneVerificationCodeHash,
      phoneVerificationExpiresAt: phoneChanged ? undefined : existingStudent.phoneVerificationExpiresAt,
      phoneVerificationAttempts: phoneChanged ? 0 : existingStudent.phoneVerificationAttempts,
    };
    const nextState = updateStudentInState(state, student);
    await writeState(nextState);
    res.json(enrichStudent(nextState, student));
  } catch (err) {
    next(err);
  }
});

router.post("/students/:id/phone/request-verification", async (req, res, next) => {
  try {
    const state = await readState();
    const existingStudent = state.students.find((student) => student.id === req.params.id);
    if (!existingStudent) {
      res.status(404).json({ message: "Student not found" });
      return;
    }

    const normalizedPhone = normalizeEgyptPhone(existingStudent.phone);
    if (!normalizedPhone) {
      res.status(400).json({ message: "Add a valid phone number before requesting verification." });
      return;
    }

    const code = createPhoneVerificationCode();
    const expiresAt = getPhoneVerificationExpiresAt();
    const student: CatalogStudent = {
      ...existingStudent,
      phone: normalizedPhone,
      phoneVerified: false,
      phoneVerifiedAt: undefined,
      phoneVerificationCodeHash: createPhoneVerificationHash(code),
      phoneVerificationExpiresAt: expiresAt,
      phoneVerificationAttempts: 0,
    };
    const nextState = updateStudentInState(state, student);
    await writeState(nextState);

    logDevPhoneOtp("student", student.id, normalizedPhone, code);
    res.json({
      message: "Phone verification code sent.",
      expiresAt,
      devCode: shouldExposeDevPhoneOtp() ? code : undefined,
      student: enrichStudent(nextState, student),
    });
  } catch (err) {
    next(err);
  }
});

router.post("/students/:id/phone/verify", async (req, res, next) => {
  try {
    const code = typeof req.body?.code === "string" ? req.body.code.trim() : "";
    if (!/^\d{6}$/.test(code)) {
      res.status(400).json({ message: "Enter the 6-digit verification code." });
      return;
    }

    const state = await readState();
    const existingStudent = state.students.find((student) => student.id === req.params.id);
    if (!existingStudent) {
      res.status(404).json({ message: "Student not found" });
      return;
    }

    const now = new Date();
    if (!existingStudent.phoneVerificationCodeHash || !existingStudent.phoneVerificationExpiresAt) {
      res.status(400).json({ message: "No phone verification code has been requested." });
      return;
    }

    if (new Date(existingStudent.phoneVerificationExpiresAt).getTime() <= now.getTime()) {
      const student: CatalogStudent = {
        ...existingStudent,
        phoneVerificationCodeHash: undefined,
        phoneVerificationExpiresAt: undefined,
        phoneVerificationAttempts: 0,
      };
      const nextState = updateStudentInState(state, student);
      await writeState(nextState);
      res.status(400).json({ message: "Phone verification code expired. Request a new code." });
      return;
    }

    const attempts = existingStudent.phoneVerificationAttempts ?? 0;
    if (attempts >= PHONE_VERIFICATION_MAX_ATTEMPTS) {
      res.status(429).json({ message: "Too many verification attempts. Request a new code." });
      return;
    }

    if (!verifyPhoneVerificationCode(code, existingStudent.phoneVerificationCodeHash)) {
      const nextAttempts = attempts + 1;
      const student: CatalogStudent = {
        ...existingStudent,
        phoneVerificationAttempts: nextAttempts,
      };
      const nextState = updateStudentInState(state, student);
      await writeState(nextState);
      res.status(nextAttempts >= PHONE_VERIFICATION_MAX_ATTEMPTS ? 429 : 400).json({
        message:
          nextAttempts >= PHONE_VERIFICATION_MAX_ATTEMPTS
            ? "Too many verification attempts. Request a new code."
            : "Incorrect phone verification code.",
        attemptsRemaining: Math.max(PHONE_VERIFICATION_MAX_ATTEMPTS - nextAttempts, 0),
      });
      return;
    }

    const verifiedAt = now.toISOString();
    const student: CatalogStudent = {
      ...existingStudent,
      phoneVerified: true,
      phoneVerifiedAt: verifiedAt,
      phoneVerificationCodeHash: undefined,
      phoneVerificationExpiresAt: undefined,
      phoneVerificationAttempts: 0,
    };
    const nextState = updateStudentInState(state, student);
    await writeState(nextState);
    res.json({
      message: "Phone verified successfully.",
      student: enrichStudent(nextState, student),
    });
  } catch (err) {
    next(err);
  }
});

router.post("/students/:id/device-verification", async (req, res, next) => {
  try {
    const state = await readState();
    const platformSettings = getPlatformSettings(state);
    const deviceSettings = platformSettings.deviceProtection;
    const device = buildVerifiedDevice(req.body?.device);
    if (!device) {
      res.status(400).json({ message: "Invalid device payload" });
      return;
    }

    const existingStudent = state.students.find((student) => student.id === req.params.id);
    const studentPayload = isRecord(req.body?.student) ? req.body.student : {};
    const now = new Date().toISOString();

    if (!existingStudent) {
      const newStudent = buildStudentForDeviceVerification(req.params.id, studentPayload, device);
      if (!newStudent) {
        res.status(400).json({ message: "Invalid student payload" });
        return;
      }

      const event = createSecurityEvent({
        type: "device_registered",
        severity: "low",
        deviceId: device.deviceId,
        message: `First login. Device registered as primary device for account ${newStudent.email}.`,
      });
      const student = appendStudentEvent(newStudent, event);
      const nextState = updateStudentInState(state, student);
      await writeState(nextState);
      res.status(201).json({ allowed: true, action: "registered", student: enrichStudent(nextState, student), event });
      return;
    }

    const primaryDevice = getPrimaryDevice(existingStudent);
    if (!primaryDevice || primaryDevice.status === "pending_reset" || primaryDevice.status === "removed") {
      const verifiedDevice: StudentDevice = {
        ...device,
        registeredAt: now,
        lastVerifiedAt: now,
        status: "active",
        isPrimary: true,
      };
      const event = createSecurityEvent({
        type: "device_registered",
        severity: "low",
        deviceId: verifiedDevice.deviceId,
        message: `Device registered as the primary device for account ${existingStudent.email}.`,
      });
      const student = appendStudentEvent(setPrimaryDevice(existingStudent, verifiedDevice), event);
      const nextState = updateStudentInState(state, student);
      await writeState(nextState);
      res.json({ allowed: true, action: "registered", student: enrichStudent(nextState, student), event });
      return;
    }

    if (primaryDevice.deviceId === device.deviceId) {
      const verifiedDevice: StudentDevice = {
        ...primaryDevice,
        ...device,
        status: "active",
        isPrimary: true,
        lastVerifiedAt: now,
      };
      let student = setPrimaryDevice(existingStudent, verifiedDevice);
      let event: StudentSecurityEvent | undefined;

      if (!hasRecentEvent(student, "device_verified", device.deviceId, 30 * 60 * 1000)) {
        event = createSecurityEvent({
          type: "device_verified",
          severity: "low",
          deviceId: device.deviceId,
          message: "Login from registered primary device. Access granted.",
        });
        student = appendStudentEvent(student, event);
      }

      const nextState = updateStudentInState(state, student);
      await writeState(nextState);
      res.json({ allowed: true, action: "verified", student: enrichStudent(nextState, student), event });
      return;
    }

    if (!deviceSettings.oneDeviceOnlyForStudents || !deviceSettings.blockLoginFromUnregisteredDevices) {
      const verifiedDevice: StudentDevice = {
        ...device,
        registeredAt: now,
        lastVerifiedAt: now,
        status: "active",
        isPrimary: false,
      };
      const event = createSecurityEvent({
        type: "device_verified",
        severity: "low",
        deviceId: device.deviceId,
        message: "Login from an additional device allowed by platform device policy.",
        metadata: {
          policy: "multi_device_allowed",
          registeredDeviceId: maskDeviceId(primaryDevice.deviceId),
        },
      });
      const student = appendStudentEvent({
        ...existingStudent,
        deviceHistory: dedupeDevices([...existingStudent.deviceHistory, verifiedDevice]),
      }, event);
      const nextState = updateStudentInState(state, student);
      await writeState(nextState);
      res.json({ allowed: true, action: "verified", student: enrichStudent(nextState, student), event });
      return;
    }

    const event = createSecurityEvent({
      type: "device_blocked",
      severity: "critical",
      deviceId: device.deviceId,
      message: "Login attempt from unregistered device. Account is bound to a different device.",
      metadata: {
        blockedDeviceId: maskDeviceId(device.deviceId),
        registeredDeviceId: maskDeviceId(primaryDevice.deviceId),
      },
    });
    const student = deviceSettings.logEveryBlockedDeviceAttempt
      ? appendStudentEvent(addBlockedDevice(existingStudent, device), event)
      : addBlockedDevice(existingStudent, device);
    const nextState = updateStudentInState(state, student);
    await writeState(nextState);
    res.status(403).json({
      allowed: false,
      action: "blocked",
      reason: "different_device",
      message: "This account is linked to another device. It can only be opened from one device.",
      event,
    });
  } catch (err) {
    next(err);
  }
});

router.post("/students/:id/reader-access", async (req, res, next) => {
  try {
    const state = await readState();
    const readerSettings = getPlatformSettings(state).readerProtection;
    const student = state.students.find((candidate) => candidate.id === req.params.id);
    if (!student) {
      res.status(404).json({ allowed: false, reason: "student_not_found", message: "Student not found" });
      return;
    }

    const bookId = typeof req.body?.bookId === "string" ? req.body.bookId : "";
    const bookTitle = typeof req.body?.bookTitle === "string" ? req.body.bookTitle : bookId;
    const deviceId = typeof req.body?.deviceId === "string" ? req.body.deviceId : "";
    const clientClaimsPurchased = Boolean(req.body?.clientClaimsPurchased);
    const page = typeof req.body?.page === "string" ? req.body.page : undefined;
    if (!bookId || !deviceId) {
      res.status(400).json({ allowed: false, reason: "invalid_payload", message: "Invalid reader access payload" });
      return;
    }

    const primaryDevice = getPrimaryDevice(student);
    if (!primaryDevice || primaryDevice.deviceId !== deviceId || primaryDevice.status !== "active") {
      const event = createSecurityEvent({
        type: "license_check_failed",
        severity: "high",
        deviceId,
        message: `License verification failed for "${bookTitle}". Device binding could not be verified.`,
        metadata: { bookId, bookTitle, reason: "device_mismatch" },
      });
      const nextStudent = appendStudentEvent(student, event);
      const nextState = updateStudentInState(state, nextStudent);
      await writeState(nextState);
      res.status(403).json({ allowed: false, reason: "device_mismatch", event });
      return;
    }

    const ownsBook = hasCompletedOrderForBook(state, student.id, bookId);
    if (!ownsBook && readerSettings.blockUnpurchasedReaderAccess) {
      const type = clientClaimsPurchased ? "license_check_failed" : "reader_access_denied";
      const event = createSecurityEvent({
        type,
        severity: "high",
        deviceId,
        message: clientClaimsPurchased
          ? `License verification failed for "${bookTitle}". Backend could not confirm book ownership.`
          : `Reader access denied for "${bookTitle}". Book not purchased.`,
        metadata: { bookId, bookTitle, reason: clientClaimsPurchased ? "license_not_found" : "not_purchased" },
      });
      const nextStudent = appendStudentEvent(student, event);
      const nextState = updateStudentInState(state, nextStudent);
      await writeState(nextState);
      res.status(403).json({ allowed: false, reason: clientClaimsPurchased ? "license_failed" : "not_purchased", event });
      return;
    }

    let nextStudent = student;
    let event: StudentSecurityEvent | undefined;
    if (
      !hasRecentEvent(student, "reader_opened", deviceId, 5 * 60 * 1000, (candidate) => candidate.metadata?.bookId === bookId)
    ) {
      event = createSecurityEvent({
        type: "reader_opened",
        severity: "low",
        deviceId,
        message: ownsBook
          ? `Reader opened for "${bookTitle}". License and device verified.`
          : `Reader opened for "${bookTitle}" because unpurchased access blocking is disabled by platform settings.`,
        metadata: { bookId, bookTitle, ...(page ? { page } : {}), ownsBook: ownsBook ? "true" : "false" },
      });
      nextStudent = appendStudentEvent(student, event);
    }

    const nextState = updateStudentInState(state, nextStudent);
    await writeState(nextState);
    res.json({ allowed: true, event });
  } catch (err) {
    next(err);
  }
});

router.patch("/students/:id/status", requireAdmin, async (req, res, next) => {
  try {
    const nextStatus = req.body?.status === "suspended" ? "suspended" : "active";
    const state = await readState();
    const existingStudent = state.students.find((student) => student.id === req.params.id);

    if (!existingStudent) {
      res.status(404).json({ message: "Student not found" });
      return;
    }

    const student: CatalogStudent = { ...existingStudent, status: nextStatus };
    const nextState: CatalogState = {
      ...state,
      students: state.students.map((candidate) => candidate.id === student.id ? student : candidate),
      updatedAt: new Date().toISOString(),
    };

    await writeState(nextState);
    res.json(enrichStudent(nextState, student));
  } catch (err) {
    next(err);
  }
});

router.post("/students/:id/device-reset-requests", async (req, res, next) => {
  try {
    const state = await readState();
    const deviceSettings = getPlatformSettings(state).deviceProtection;
    const existingStudent = state.students.find((student) => student.id === req.params.id);
    if (!existingStudent) {
      res.status(404).json({ message: "Student not found" });
      return;
    }

    const requestDeviceId = typeof req.body?.deviceId === "string"
      ? req.body.deviceId
      : existingStudent.currentDevice?.deviceId ?? "unknown";
    const pendingRequest = existingStudent.deviceChangeRequests.find((request) => request.status === "pending");
    if (deviceSettings.requireAdminApprovalForDeviceReset && pendingRequest) {
      const event = createSecurityEvent({
        type: "device_reset_requested",
        severity: "medium",
        deviceId: requestDeviceId,
        message: "Device reset request blocked because another request is still pending.",
        metadata: { reason: "pending_request", requestId: pendingRequest.id },
      });
      const student = appendStudentEvent(existingStudent, event);
      const nextState = updateStudentInState(state, student);
      await writeState(nextState);
      res.status(429).json({
        reason: "pending_request",
        message: "You already have a pending device reset request.",
        event,
      });
      return;
    }

    const monthlyCount = countDeviceResetRequestsThisMonth(existingStudent);
    if (monthlyCount >= deviceSettings.maxDeviceResetRequestsPerMonth) {
      const event = createSecurityEvent({
        type: "device_reset_requested",
        severity: "high",
        deviceId: requestDeviceId,
        message: "Device reset request blocked because the monthly limit was reached.",
        metadata: {
          reason: "monthly_limit",
          monthlyCount: String(monthlyCount),
          maxPerMonth: String(deviceSettings.maxDeviceResetRequestsPerMonth),
        },
      });
      const student = appendStudentEvent(existingStudent, event);
      const nextState = updateStudentInState(state, student);
      await writeState(nextState);
      res.status(429).json({
        reason: "monthly_limit",
        message: "You reached the monthly device reset request limit.",
        event,
      });
      return;
    }

    const cooldownUntil = getDeviceResetCooldownUntil(existingStudent, deviceSettings.deviceResetCooldownDays);
    if (cooldownUntil) {
      const event = createSecurityEvent({
        type: "device_reset_requested",
        severity: "medium",
        deviceId: requestDeviceId,
        message: "Device reset request blocked because the cooldown period is still active.",
        metadata: {
          reason: "cooldown",
          cooldownUntil,
          cooldownDays: String(deviceSettings.deviceResetCooldownDays),
        },
      });
      const student = appendStudentEvent(existingStudent, event);
      const nextState = updateStudentInState(state, student);
      await writeState(nextState);
      res.status(429).json({
        reason: "cooldown",
        message: "You must wait before submitting another device reset request.",
        cooldownUntil,
        event,
      });
      return;
    }

    const now = new Date().toISOString();
    const request = normalizeDeviceChangeRequest({
      id: `reset-${Date.now()}`,
      deviceId: requestDeviceId,
      currentDeviceId: existingStudent.currentDevice?.deviceId,
      requestedDeviceId: typeof req.body?.requestedDeviceId === "string" ? req.body.requestedDeviceId : undefined,
      reason: typeof req.body?.reason === "string" ? req.body.reason : "",
      status: deviceSettings.requireAdminApprovalForDeviceReset ? "pending" : "approved",
      createdAt: now,
      requestedAt: now,
      resolvedAt: deviceSettings.requireAdminApprovalForDeviceReset ? undefined : now,
      resolvedByAdminId: deviceSettings.requireAdminApprovalForDeviceReset ? undefined : "platform-policy",
      adminNote: deviceSettings.requireAdminApprovalForDeviceReset ? undefined : "Auto-approved because admin approval is disabled in platform settings.",
      updatedAt: now,
    });
    if (!request) {
      res.status(400).json({ message: "Invalid reset request payload" });
      return;
    }

    const event = createSecurityEvent({
      type: "device_reset_requested",
      severity: "medium",
      deviceId: request.deviceId,
      message: `Student requested a device change. Reason: ${request.reason}`,
      metadata: {
        currentDeviceId: request.currentDeviceId ? maskDeviceId(request.currentDeviceId) : "unknown",
        requestedDeviceId: request.requestedDeviceId ? maskDeviceId(request.requestedDeviceId) : "not_provided",
      },
    });
    const nextStudentBase: CatalogStudent = deviceSettings.requireAdminApprovalForDeviceReset
      ? existingStudent
      : {
          ...existingStudent,
          currentDevice: existingStudent.currentDevice
            ? { ...existingStudent.currentDevice, status: "pending_reset" }
            : existingStudent.currentDevice,
          deviceHistory: existingStudent.deviceHistory.map((device) =>
            device.deviceId === request.currentDeviceId ? { ...device, status: "pending_reset" } : device
          ),
        };

    const student: CatalogStudent = {
      ...nextStudentBase,
      deviceChangeRequests: [request, ...existingStudent.deviceChangeRequests],
      securityEvents: dedupeEvents([event, ...existingStudent.securityEvents]).slice(0, 100),
    };
    const nextState: CatalogState = {
      ...state,
      students: state.students.map((candidate) => candidate.id === student.id ? student : candidate),
      updatedAt: new Date().toISOString(),
    };

    await writeState(nextState);
    res.status(201).json(request);
  } catch (err) {
    next(err);
  }
});

router.post("/students/:id/security-events", async (req, res, next) => {
  try {
    const state = await readState();
    const existingStudent = state.students.find((student) => student.id === req.params.id);
    if (!existingStudent) {
      res.status(404).json({ message: "Student not found" });
      return;
    }

    const event = normalizeSecurityEvent(req.body);
    if (!event) {
      res.status(400).json({ message: "Invalid security event payload" });
      return;
    }

    const student: CatalogStudent = {
      ...existingStudent,
      securityEvents: dedupeEvents([event, ...existingStudent.securityEvents]).slice(0, 100),
    };
    const nextState: CatalogState = {
      ...state,
      students: state.students.map((candidate) => candidate.id === student.id ? student : candidate),
      updatedAt: new Date().toISOString(),
    };

    await writeState(nextState);
    res.status(201).json(event);
  } catch (err) {
    next(err);
  }
});

router.post("/orders", async (req, res, next) => {
  try {
    const state = await readState();
    const bookId = typeof req.body?.bookId === "string" ? req.body.bookId : "";
    const studentId = typeof req.body?.studentId === "string" ? req.body.studentId : "mobile-user";
    const studentName = typeof req.body?.studentName === "string" ? req.body.studentName : "Mobile student";
    const couponCode = typeof req.body?.couponCode === "string" ? req.body.couponCode.trim() : "";
    const book = state.adminBooks.find((candidate) => candidate.id === bookId);

    if (!book || book.status !== "published") {
      res.status(404).json({ message: "Book not found" });
      return;
    }

    const discountPct = couponCode && book.couponCode === couponCode ? book.discountPct ?? 0 : 0;
    const discountAmount = Number((book.price * (discountPct / 100)).toFixed(2));
    const order: CatalogOrder = {
      id: `mobile-${Date.now()}`,
      studentId,
      studentName,
      bookId: book.id,
      bookTitle: book.title,
      publisherId: book.publisherId ?? "",
      publisher: book.publisher,
      amount: Number(Math.max(book.price - discountAmount, 0).toFixed(2)),
      status: "completed",
      createdAt: new Date().toISOString(),
      couponCode: couponCode || undefined,
      discountAmount: discountAmount || undefined,
    };

    const nextState: CatalogState = {
      ...state,
      orders: [order, ...state.orders],
      updatedAt: new Date().toISOString(),
    };
    await writeState(nextState);
    res.status(201).json(order);
  } catch (err) {
    next(err);
  }
});

export default router;
