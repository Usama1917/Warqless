import Constants from "expo-constants";

import type { Book } from "@/data/mockData";

export interface StudentAccountPayload {
  id: string;
  name: string;
  email: string;
  phone?: string;
  phoneVerified?: boolean;
  phoneVerifiedAt?: string;
  grade: string;
  booksOwned: number;
  booksBorrowed: number;
  totalSpent: number;
  devices: number;
  joinedAt: string;
  status: "active" | "suspended";
  currentDevice?: {
    deviceId: string;
    maskedDeviceId: string;
    platform: string;
    osVersion?: string;
    appVersion?: string;
    deviceName?: string;
    registeredAt: string;
    lastVerifiedAt: string;
    status: "active" | "blocked" | "pending_reset";
  };
  auth?: {
    authProvider: "email_password_demo";
    passwordSet: boolean;
    passwordHashStored: boolean;
    passwordLastChangedAt?: string;
    lastLoginAt?: string;
    failedLoginAttempts: number;
    note: string;
  };
  securityEvents?: {
    id: string;
    type: string;
    severity: "low" | "medium" | "high" | "critical";
    deviceId: string;
    message: string;
    createdAt: string;
    metadata?: Record<string, string>;
  }[];
  orders?: {
    id: string;
    bookId: string;
    bookTitle: string;
    publisherId?: string;
    publisher: string;
    amount: number;
    status: "completed" | "refunded" | "pending";
    createdAt: string;
    couponCode?: string;
    discountAmount?: number;
  }[];
}

interface DevicePayload {
  deviceId: string;
  maskedDeviceId: string;
  platform: string;
  osVersion?: string;
  appVersion?: string;
  deviceName?: string;
  registeredAt: string;
  lastVerifiedAt: string;
  status: "active" | "blocked" | "pending_reset";
}

export type DeviceVerificationResult =
  | { allowed: true; action: "registered" | "verified"; event?: unknown; student?: StudentAccountPayload }
  | { allowed: false; action: "blocked"; reason: "different_device"; message: string; event?: unknown };

export type ReaderAccessResult =
  | { allowed: true; event?: unknown }
  | {
      allowed: false;
      reason: "not_purchased" | "license_failed" | "device_mismatch" | "student_not_found" | "invalid_payload";
      message?: string;
      event?: unknown;
    };

export type PlatformSettings = {
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

export const DEFAULT_PLATFORM_SETTINGS: PlatformSettings = {
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

export class DeviceResetRequestError extends Error {
  reason?: "pending_request" | "monthly_limit" | "cooldown";
  cooldownUntil?: string;

  constructor(message: string, reason?: DeviceResetRequestError["reason"], cooldownUntil?: string) {
    super(message);
    this.reason = reason;
    this.cooldownUntil = cooldownUntil;
  }
}

export type StudentPhoneVerificationResponse = {
  message: string;
  expiresAt?: string;
  devCode?: string;
  student?: StudentAccountPayload;
};

export interface CatalogResponse {
  books: Book[];
  publishers: string[];
  grades: string[];
  subjects: string[];
  updatedAt: string;
}

function stripTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

function getExpoHost(): string | null {
  const constants = Constants as typeof Constants & {
    manifest?: { debuggerHost?: string; hostUri?: string };
    manifest2?: { extra?: { expoClient?: { hostUri?: string }; expoGo?: { debuggerHost?: string } } };
  };

  const hostUri =
    Constants.expoConfig?.hostUri ??
    constants.manifest?.hostUri ??
    constants.manifest?.debuggerHost ??
    constants.manifest2?.extra?.expoClient?.hostUri ??
    constants.manifest2?.extra?.expoGo?.debuggerHost;

  return hostUri?.split(":")[0] ?? null;
}

export function getCatalogApiBaseUrl() {
  const configured = process.env.EXPO_PUBLIC_API_URL;
  if (configured) return stripTrailingSlash(configured);

  const expoHost = getExpoHost();
  if (expoHost) return `http://${expoHost}:4000/api`;

  return "http://localhost:4000/api";
}

export async function fetchCatalog(): Promise<CatalogResponse> {
  const response = await fetch(`${getCatalogApiBaseUrl()}/catalog`);
  if (!response.ok) {
    throw new Error(`Catalog request failed with status ${response.status}`);
  }
  return response.json() as Promise<CatalogResponse>;
}

function mergePlatformSettings(settings: Partial<PlatformSettings> | undefined): PlatformSettings {
  const input = settings ?? {};
  return {
    ...DEFAULT_PLATFORM_SETTINGS,
    ...input,
    accountSecurity: {
      ...DEFAULT_PLATFORM_SETTINGS.accountSecurity,
      ...(input.accountSecurity ?? {}),
    },
    deviceProtection: {
      ...DEFAULT_PLATFORM_SETTINGS.deviceProtection,
      ...(input.deviceProtection ?? {}),
    },
    readerProtection: {
      ...DEFAULT_PLATFORM_SETTINGS.readerProtection,
      ...(input.readerProtection ?? {}),
    },
    notifications: {
      ...DEFAULT_PLATFORM_SETTINGS.notifications,
      ...(input.notifications ?? {}),
    },
  };
}

export async function fetchPlatformSettings(): Promise<PlatformSettings> {
  const response = await fetch(`${getCatalogApiBaseUrl()}/platform-settings`);
  if (!response.ok) {
    throw new Error(`Platform settings request failed with status ${response.status}`);
  }

  const data = await response.json() as { platformSettings?: Partial<PlatformSettings> };
  return mergePlatformSettings(data.platformSettings);
}

export async function createOrderFromBook({
  book,
  studentId,
  studentName,
}: {
  book: Book;
  studentId: string;
  studentName: string;
}) {
  const response = await fetch(`${getCatalogApiBaseUrl()}/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      bookId: book.id,
      studentId,
      studentName,
      couponCode: book.couponCode,
    }),
  });

  if (!response.ok) {
    throw new Error(`Order request failed with status ${response.status}`);
  }

  return response.json();
}

export async function upsertStudentAccount(student: StudentAccountPayload) {
  const response = await fetch(`${getCatalogApiBaseUrl()}/students`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(student),
  });

  if (!response.ok) {
    throw new Error(`Student sync failed with status ${response.status}`);
  }

  return response.json();
}

export async function updateStudentPhone(studentId: string, phone: string): Promise<StudentAccountPayload> {
  const response = await fetch(`${getCatalogApiBaseUrl()}/students/${encodeURIComponent(studentId)}/phone`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(typeof data.message === "string" ? data.message : `Phone update failed with status ${response.status}`);
  }

  return data as StudentAccountPayload;
}

export async function requestStudentPhoneVerification(studentId: string): Promise<StudentPhoneVerificationResponse> {
  const response = await fetch(`${getCatalogApiBaseUrl()}/students/${encodeURIComponent(studentId)}/phone/request-verification`, {
    method: "POST",
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(typeof data.message === "string" ? data.message : `Phone verification request failed with status ${response.status}`);
  }

  return data as StudentPhoneVerificationResponse;
}

export async function verifyStudentPhone(studentId: string, code: string): Promise<StudentPhoneVerificationResponse> {
  const response = await fetch(`${getCatalogApiBaseUrl()}/students/${encodeURIComponent(studentId)}/phone/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(typeof data.message === "string" ? data.message : `Phone verification failed with status ${response.status}`);
  }

  return data as StudentPhoneVerificationResponse;
}

export async function verifyStudentDevice({
  studentId,
  student,
  device,
}: {
  studentId: string;
  student: Pick<StudentAccountPayload, "name" | "email" | "phone" | "phoneVerified" | "phoneVerifiedAt" | "grade" | "joinedAt" | "totalSpent" | "booksOwned" | "auth">;
  device: DevicePayload;
}): Promise<DeviceVerificationResult> {
  let response: Response;
  try {
    response = await fetch(`${getCatalogApiBaseUrl()}/students/${encodeURIComponent(studentId)}/device-verification`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ student, device }),
    });
  } catch {
    throw new Error("security_backend_unavailable");
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok && response.status !== 403) {
    throw new Error(typeof data.message === "string" ? data.message : `Device verification failed with status ${response.status}`);
  }

  return data as DeviceVerificationResult;
}

export async function verifyReaderAccess({
  studentId,
  bookId,
  bookTitle,
  deviceId,
  clientClaimsPurchased,
  page,
}: {
  studentId: string;
  bookId: string;
  bookTitle?: string;
  deviceId: string;
  clientClaimsPurchased: boolean;
  page?: number;
}): Promise<ReaderAccessResult> {
  let response: Response;
  try {
    response = await fetch(`${getCatalogApiBaseUrl()}/students/${encodeURIComponent(studentId)}/reader-access`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bookId,
        bookTitle,
        deviceId,
        clientClaimsPurchased,
        page: typeof page === "number" ? String(page) : undefined,
      }),
    });
  } catch {
    throw new Error("security_backend_unavailable");
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok && response.status !== 403 && response.status !== 404) {
    throw new Error(typeof data.message === "string" ? data.message : `Reader access check failed with status ${response.status}`);
  }

  return data as ReaderAccessResult;
}

export async function createDeviceResetRequest({
  studentId,
  deviceId,
  reason,
}: {
  studentId: string;
  deviceId: string;
  reason: string;
}) {
  const response = await fetch(`${getCatalogApiBaseUrl()}/students/${encodeURIComponent(studentId)}/device-reset-requests`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ deviceId, reason }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new DeviceResetRequestError(
      typeof data.message === "string" ? data.message : `Device reset request failed with status ${response.status}`,
      data.reason,
      typeof data.cooldownUntil === "string" ? data.cooldownUntil : undefined,
    );
  }

  return data;
}

export async function sendStudentSecurityEvent({
  studentId,
  event,
}: {
  studentId: string;
  event: {
    id: string;
    type: string;
    severity: "low" | "medium" | "high" | "critical";
    deviceId: string;
    message: string;
    createdAt: string;
    metadata?: Record<string, string>;
  };
}) {
  const response = await fetch(`${getCatalogApiBaseUrl()}/students/${encodeURIComponent(studentId)}/security-events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(event),
  });

  if (!response.ok && response.status !== 404) {
    throw new Error(`Security event sync failed with status ${response.status}`);
  }
}
