import type { StoredAdminBook } from "@/lib/bookStorage";
import type { AdminRole, AdminUser, Order, Student } from "@/data/mockData";

export type SecuritySeverity = "low" | "medium" | "high" | "critical";

export type SecurityEventType =
  | "device_registered"
  | "device_verified"
  | "device_blocked"
  | "device_reset_requested"
  | "device_reset_approved"
  | "device_reset_rejected"
  | "reader_opened"
  | "reader_access_denied"
  | "license_check_failed"
  | "screenshot_attempt"
  | "suspicious_activity"
  | "phone_changed"
  | "phone_verification_code_sent"
  | "phone_verified"
  | "phone_verification_failed"
  | "two_factor_enabled"
  | "two_factor_disabled"
  | "two_factor_challenge_sent"
  | "two_factor_success"
  | "two_factor_failed";

export type SecurityEvent = {
  id: string;
  type: SecurityEventType;
  severity: SecuritySeverity;
  userId?: string;
  userName: string;
  userEmail: string;
  bookId?: string;
  bookTitle?: string;
  deviceIdMasked?: string;
  message: string;
  metadata?: Record<string, unknown>;
  reviewed: boolean;
  reviewedAt?: string;
  reviewedByAdminId?: string;
  createdAt: string;
};

export type SecurityMetrics = {
  totalEvents: number;
  deviceBlocked: number;
  accessDenied: number;
  screenshots: number;
  pendingResets: number;
  criticalEvents: number;
  monthOverMonth: {
    totalEvents: number | null;
    deviceBlocked: number | null;
    accessDenied: number | null;
    screenshots: number | null;
    pendingResets: number | null;
    criticalEvents: number | null;
  };
};

export type DeviceResetRequest = {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  currentDeviceId: string;
  requestedDeviceId?: string;
  reason: string;
  status: "pending" | "approved" | "rejected";
  requestedAt: string;
  resolvedAt?: string;
  resolvedByAdminId?: string;
  adminNote?: string;
  createdAt: string;
  updatedAt?: string;
};

export type AdminSettingsLanguage = "en" | "ar";

export type AdminAccountSettings = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  phoneVerified?: boolean;
  phoneVerifiedAt?: string;
  twoFactorEnabled?: boolean;
  twoFactorEnabledAt?: string;
  role: AdminRole;
  publisherId?: string;
};

export type AccountPreferences = {
  adminInterfaceLanguage: AdminSettingsLanguage;
  emailNotifications: boolean;
};

export type PlatformSettings = {
  enableBookLending: boolean;
  autoSuspendOverdueBorrowers: boolean;
  studentArabicInterface: boolean;
  overdueLendingAlerts: boolean;
  accountSecurity: {
    requirePhoneVerificationForNewAccounts: boolean;
    requireTwoFactorForAdmins: boolean;
    requireTwoFactorForPublishers: boolean;
    allowStudentOptionalTwoFactor: boolean;
    maxFailedLoginAttempts: number;
    accountLockDurationMinutes: number;
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
  monitoring: {
    enableSecurityEventLogging: boolean;
    autoMarkLowRiskEventsAfterDays: number;
    keepSecurityLogsForDays: number;
    notifyAdminOnCriticalEvents: boolean;
    notifyAdminOnRepeatedDeviceBlockedAttempts: boolean;
    notifyAdminOnScreenshotAttempts: boolean;
  };
  notifications: {
    adminEmailNotifications: boolean;
    publisherSecuritySummaryNotifications: boolean;
    studentAccountSecurityNotifications: boolean;
    deviceResetRequestNotifications: boolean;
  };
};

export type AdminSettingsResponse = {
  account: AdminAccountSettings;
  preferences: AccountPreferences;
  platformSettings: PlatformSettings;
};

export type SaveAdminSettingsPayload = {
  account: {
    name: string;
    email: string;
    phone?: string;
    newPassword?: string;
  };
  preferences: AccountPreferences;
  platformSettings?: PlatformSettings;
};

export type PhoneVerificationResponse = {
  message: string;
  expiresAt?: string;
  devCode?: string;
  account: AdminAccountSettings;
};

export type AdminLoginResult =
  | { status: "ok"; account: AdminAccountSettings }
  | {
      status: "two_factor_required";
      challengeId: string;
      expiresIn?: number;
      expiresAt?: string;
      maskedPhone?: string;
      devCode?: string;
      message?: string;
    };

export type TwoFactorRequestResponse = {
  message: string;
  enabled: boolean;
  expiresAt?: string;
  expiresIn?: number;
  maskedPhone?: string;
  devCode?: string;
};

export type TwoFactorSettingsResponse = {
  message: string;
  account: AdminAccountSettings;
};

export type ForceLogoutResponse = {
  message: string;
  platformSettings: PlatformSettings;
};

type PaginatedSecurityEvents = {
  events: SecurityEvent[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

type PaginatedDeviceResetRequests = {
  requests: DeviceResetRequest[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export function getAdminApiBaseUrl(): string | null {
  if (typeof window === "undefined") return null;

  const configured = import.meta.env.VITE_API_URL;
  if (configured) return configured.replace(/\/+$/, "");

  const hostname = window.location.hostname || "localhost";
  return `http://${hostname}:4000/api`;
}

function getAdminAuthHeaders(user: AdminUser | null): HeadersInit {
  if (!user) return {};

  return {
    "x-warqless-admin-role": user.role,
    "x-warqless-admin-id": user.id,
    "x-warqless-admin-email": user.email,
  };
}

// Mirrors the session persisted by AuthContext so catalog sync helpers that are
// not called with an AdminUser (e.g. from non-React storage utilities) can still
// send the admin auth headers required by the now-guarded catalog endpoints.
const CURRENT_ADMIN_USER_STORAGE_KEY = "warqless_admin_current_user";

function readStoredAdminUser(): AdminUser | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(CURRENT_ADMIN_USER_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (
      parsed &&
      typeof parsed.id === "string" &&
      typeof parsed.email === "string" &&
      (parsed.role === "admin" || parsed.role === "publisher")
    ) {
      return {
        id: parsed.id,
        name: typeof parsed.name === "string" ? parsed.name : "",
        email: parsed.email,
        role: parsed.role,
        publisherId: typeof parsed.publisherId === "string" ? parsed.publisherId : undefined,
      };
    }
  } catch {
    return null;
  }

  return null;
}

function getStoredAdminAuthHeaders(): HeadersInit {
  return getAdminAuthHeaders(readStoredAdminUser());
}

function appendDefinedSearchParam(params: URLSearchParams, key: string, value: string | number | boolean | undefined) {
  if (value === undefined || value === "") return;
  params.set(key, String(value));
}

function startOfDate(value?: string) {
  return value ? `${value}T00:00:00.000Z` : undefined;
}

function endOfDate(value?: string) {
  return value ? `${value}T23:59:59.999Z` : undefined;
}

async function parseJsonResponse<T>(response: Response, fallbackMessage: string): Promise<T> {
  if (!response.ok) {
    let message = fallbackMessage;
    try {
      const data = await response.json() as { message?: string };
      if (data.message) message = data.message;
    } catch {
      // Keep the fallback message if the response body is not JSON.
    }
    throw new Error(message);
  }

  return response.json() as Promise<T>;
}

export async function loginAdminAccount(
  email: string,
  password: string,
  role: AdminRole,
): Promise<AdminLoginResult> {
  const apiBaseUrl = getAdminApiBaseUrl();
  if (!apiBaseUrl) throw new Error("Admin API URL is unavailable.");

  const response = await fetch(`${apiBaseUrl}/admin/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, role }),
  });

  const data = await parseJsonResponse<
    { account: AdminAccountSettings } | {
      twoFactorRequired: true;
      challengeId: string;
      expiresIn?: number;
      expiresAt?: string;
      maskedPhone?: string;
      devCode?: string;
      message?: string;
    }
  >(
    response,
    "Invalid credentials.",
  );
  if ("twoFactorRequired" in data && data.twoFactorRequired) {
    return {
      status: "two_factor_required",
      challengeId: data.challengeId,
      expiresIn: data.expiresIn,
      expiresAt: data.expiresAt,
      maskedPhone: data.maskedPhone,
      devCode: data.devCode,
      message: data.message,
    };
  }

  if ("account" in data) {
    return { status: "ok", account: data.account };
  }

  throw new Error("Invalid login response.");
}

export async function verifyAdminTwoFactorLogin(
  challengeId: string,
  code: string,
): Promise<AdminAccountSettings> {
  const apiBaseUrl = getAdminApiBaseUrl();
  if (!apiBaseUrl) throw new Error("Admin API URL is unavailable.");

  const response = await fetch(`${apiBaseUrl}/admin/auth/2fa/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ challengeId, code }),
  });

  const data = await parseJsonResponse<{ account: AdminAccountSettings }>(
    response,
    "Could not verify two-factor code.",
  );
  return data.account;
}

export async function fetchAdminSettings(user: AdminUser | null): Promise<AdminSettingsResponse> {
  const apiBaseUrl = getAdminApiBaseUrl();
  if (!apiBaseUrl) throw new Error("Admin API URL is unavailable.");

  const response = await fetch(`${apiBaseUrl}/admin/settings`, {
    cache: "no-store",
    headers: getAdminAuthHeaders(user),
  });

  return parseJsonResponse<AdminSettingsResponse>(response, "Could not load settings.");
}

export async function saveAdminSettings(
  user: AdminUser | null,
  payload: SaveAdminSettingsPayload,
): Promise<AdminSettingsResponse> {
  const apiBaseUrl = getAdminApiBaseUrl();
  if (!apiBaseUrl) throw new Error("Admin API URL is unavailable.");

  const response = await fetch(`${apiBaseUrl}/admin/settings`, {
    method: "PATCH",
    headers: {
      ...getAdminAuthHeaders(user),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return parseJsonResponse<AdminSettingsResponse>(response, "Could not save settings.");
}

export async function requestAdminPhoneVerification(user: AdminUser | null): Promise<PhoneVerificationResponse> {
  const apiBaseUrl = getAdminApiBaseUrl();
  if (!apiBaseUrl) throw new Error("Admin API URL is unavailable.");

  const response = await fetch(`${apiBaseUrl}/admin/settings/phone/request-verification`, {
    method: "POST",
    headers: getAdminAuthHeaders(user),
  });

  return parseJsonResponse<PhoneVerificationResponse>(response, "Could not request phone verification.");
}

export async function verifyAdminPhone(user: AdminUser | null, code: string): Promise<PhoneVerificationResponse> {
  const apiBaseUrl = getAdminApiBaseUrl();
  if (!apiBaseUrl) throw new Error("Admin API URL is unavailable.");

  const response = await fetch(`${apiBaseUrl}/admin/settings/phone/verify`, {
    method: "POST",
    headers: {
      ...getAdminAuthHeaders(user),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ code }),
  });

  return parseJsonResponse<PhoneVerificationResponse>(response, "Could not verify phone.");
}

export async function requestAdminTwoFactorChange(
  user: AdminUser | null,
  enabled: boolean,
): Promise<TwoFactorRequestResponse> {
  const apiBaseUrl = getAdminApiBaseUrl();
  if (!apiBaseUrl) throw new Error("Admin API URL is unavailable.");

  const response = await fetch(`${apiBaseUrl}/admin/settings/2fa/request`, {
    method: "POST",
    headers: {
      ...getAdminAuthHeaders(user),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ enabled }),
  });

  return parseJsonResponse<TwoFactorRequestResponse>(response, "Could not request two-factor confirmation.");
}

export async function confirmAdminTwoFactorChange(
  user: AdminUser | null,
  enabled: boolean,
  code: string,
): Promise<TwoFactorSettingsResponse> {
  const apiBaseUrl = getAdminApiBaseUrl();
  if (!apiBaseUrl) throw new Error("Admin API URL is unavailable.");

  const response = await fetch(`${apiBaseUrl}/admin/settings/2fa/confirm`, {
    method: "POST",
    headers: {
      ...getAdminAuthHeaders(user),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ enabled, code }),
  });

  return parseJsonResponse<TwoFactorSettingsResponse>(response, "Could not confirm two-factor change.");
}

export async function disableAdminTwoFactorWithPassword(
  user: AdminUser | null,
  password: string,
): Promise<TwoFactorSettingsResponse> {
  const apiBaseUrl = getAdminApiBaseUrl();
  if (!apiBaseUrl) throw new Error("Admin API URL is unavailable.");

  const response = await fetch(`${apiBaseUrl}/admin/settings/2fa/disable-password`, {
    method: "POST",
    headers: {
      ...getAdminAuthHeaders(user),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ password }),
  });

  return parseJsonResponse<TwoFactorSettingsResponse>(response, "Could not disable two-factor authentication.");
}

export async function forceLogoutAllAdminSessions(user: AdminUser | null): Promise<ForceLogoutResponse> {
  const apiBaseUrl = getAdminApiBaseUrl();
  if (!apiBaseUrl) throw new Error("Admin API URL is unavailable.");

  const response = await fetch(`${apiBaseUrl}/admin/settings/force-logout`, {
    method: "POST",
    headers: getAdminAuthHeaders(user),
  });

  return parseJsonResponse<ForceLogoutResponse>(response, "Could not force logout active sessions.");
}

export function syncCatalogBooks(books: StoredAdminBook[]) {
  const apiBaseUrl = getAdminApiBaseUrl();
  if (!apiBaseUrl) return;

  void fetch(`${apiBaseUrl}/catalog/books`, {
    method: "PUT",
    headers: {
      ...getStoredAdminAuthHeaders(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ books }),
  }).catch(() => {
    // Local demo sync is best-effort. The admin UI should still save locally if the API is off.
  });
}

export async function fetchSyncedAdminBooks(): Promise<{ books: StoredAdminBook[]; updatedAt?: string }> {
  const apiBaseUrl = getAdminApiBaseUrl();
  if (!apiBaseUrl) return { books: [] };

  const response = await fetch(`${apiBaseUrl}/catalog/books`, { cache: "no-store" }).catch(() => null);
  if (!response?.ok) return { books: [] };

  const data = await response.json() as { books?: StoredAdminBook[]; updatedAt?: string };
  return {
    books: Array.isArray(data.books) ? data.books : [],
    updatedAt: typeof data.updatedAt === "string" ? data.updatedAt : undefined,
  };
}

export async function fetchSyncedStudents(): Promise<Student[]> {
  const apiBaseUrl = getAdminApiBaseUrl();
  if (!apiBaseUrl) return [];

  const response = await fetch(`${apiBaseUrl}/students`, {
    cache: "no-store",
    headers: getStoredAdminAuthHeaders(),
  }).catch(() => null);
  if (!response?.ok) return [];

  const data = await response.json() as { students?: Student[] };
  return Array.isArray(data.students) ? data.students : [];
}

export function syncStudentStatus(studentId: string, status: Student["status"]) {
  const apiBaseUrl = getAdminApiBaseUrl();
  if (!apiBaseUrl) return;

  void fetch(`${apiBaseUrl}/students/${encodeURIComponent(studentId)}/status`, {
    method: "PATCH",
    headers: {
      ...getStoredAdminAuthHeaders(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ status }),
  }).catch(() => {
    // Local admin status changes are saved even if the local API is not running.
  });
}

export async function fetchSyncedOrders(): Promise<Order[]> {
  const apiBaseUrl = getAdminApiBaseUrl();
  if (!apiBaseUrl) return [];

  const response = await fetch(`${apiBaseUrl}/orders`, {
    cache: "no-store",
    headers: getStoredAdminAuthHeaders(),
  }).catch(() => null);
  if (!response?.ok) return [];

  const data = await response.json() as { orders?: Order[] };
  return Array.isArray(data.orders) ? data.orders : [];
}

export async function fetchSecurityMetrics(user: AdminUser | null): Promise<SecurityMetrics> {
  const apiBaseUrl = getAdminApiBaseUrl();
  if (!apiBaseUrl) throw new Error("Admin API URL is unavailable.");

  const response = await fetch(`${apiBaseUrl}/admin/security/metrics`, {
    cache: "no-store",
    headers: getAdminAuthHeaders(user),
  });

  return parseJsonResponse<SecurityMetrics>(response, "Could not load security metrics.");
}

export async function fetchSecurityEvents({
  user,
  search,
  severity,
  type,
  dateFrom,
  dateTo,
  reviewed,
  page = 1,
  limit = 100,
}: {
  user: AdminUser | null;
  search?: string;
  severity?: SecuritySeverity | "all";
  type?: SecurityEventType | "all";
  dateFrom?: string;
  dateTo?: string;
  reviewed?: boolean;
  page?: number;
  limit?: number;
}): Promise<PaginatedSecurityEvents> {
  const apiBaseUrl = getAdminApiBaseUrl();
  if (!apiBaseUrl) throw new Error("Admin API URL is unavailable.");

  const params = new URLSearchParams();
  appendDefinedSearchParam(params, "search", search?.trim());
  appendDefinedSearchParam(params, "severity", severity && severity !== "all" ? severity : undefined);
  appendDefinedSearchParam(params, "type", type && type !== "all" ? type : undefined);
  appendDefinedSearchParam(params, "dateFrom", startOfDate(dateFrom));
  appendDefinedSearchParam(params, "dateTo", endOfDate(dateTo));
  appendDefinedSearchParam(params, "reviewed", reviewed);
  appendDefinedSearchParam(params, "page", page);
  appendDefinedSearchParam(params, "limit", limit);

  const response = await fetch(`${apiBaseUrl}/admin/security/events?${params.toString()}`, {
    cache: "no-store",
    headers: getAdminAuthHeaders(user),
  });

  return parseJsonResponse<PaginatedSecurityEvents>(response, "Could not load security events.");
}

export async function fetchSecurityEvent(user: AdminUser | null, eventId: string): Promise<SecurityEvent> {
  const apiBaseUrl = getAdminApiBaseUrl();
  if (!apiBaseUrl) throw new Error("Admin API URL is unavailable.");

  const response = await fetch(`${apiBaseUrl}/admin/security/events/${encodeURIComponent(eventId)}`, {
    cache: "no-store",
    headers: getAdminAuthHeaders(user),
  });
  const data = await parseJsonResponse<{ event: SecurityEvent }>(response, "Could not load security event.");
  return data.event;
}

export async function reviewSecurityEvent(user: AdminUser | null, eventId: string): Promise<SecurityEvent> {
  const apiBaseUrl = getAdminApiBaseUrl();
  if (!apiBaseUrl) throw new Error("Admin API URL is unavailable.");

  const response = await fetch(`${apiBaseUrl}/admin/security/events/${encodeURIComponent(eventId)}/review`, {
    method: "PATCH",
    headers: {
      ...getAdminAuthHeaders(user),
      "Content-Type": "application/json",
    },
  });
  const data = await parseJsonResponse<{ event: SecurityEvent }>(response, "Could not review security event.");
  return data.event;
}

export async function fetchDeviceResetRequests({
  user,
  status,
  search,
  page = 1,
  limit = 100,
}: {
  user: AdminUser | null;
  status?: DeviceResetRequest["status"] | "all";
  search?: string;
  page?: number;
  limit?: number;
}): Promise<PaginatedDeviceResetRequests> {
  const apiBaseUrl = getAdminApiBaseUrl();
  if (!apiBaseUrl) throw new Error("Admin API URL is unavailable.");

  const params = new URLSearchParams();
  appendDefinedSearchParam(params, "status", status && status !== "all" ? status : undefined);
  appendDefinedSearchParam(params, "search", search?.trim());
  appendDefinedSearchParam(params, "page", page);
  appendDefinedSearchParam(params, "limit", limit);

  const response = await fetch(`${apiBaseUrl}/admin/device-reset-requests?${params.toString()}`, {
    cache: "no-store",
    headers: getAdminAuthHeaders(user),
  });

  return parseJsonResponse<PaginatedDeviceResetRequests>(response, "Could not load device reset requests.");
}

export async function approveDeviceResetRequest(user: AdminUser | null, requestId: string): Promise<DeviceResetRequest> {
  const apiBaseUrl = getAdminApiBaseUrl();
  if (!apiBaseUrl) throw new Error("Admin API URL is unavailable.");

  const response = await fetch(`${apiBaseUrl}/admin/device-reset-requests/${encodeURIComponent(requestId)}/approve`, {
    method: "POST",
    headers: {
      ...getAdminAuthHeaders(user),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}),
  });

  const data = await parseJsonResponse<{ request: DeviceResetRequest }>(response, "Could not approve device reset request.");
  return data.request;
}

export async function rejectDeviceResetRequest(user: AdminUser | null, requestId: string): Promise<DeviceResetRequest> {
  const apiBaseUrl = getAdminApiBaseUrl();
  if (!apiBaseUrl) throw new Error("Admin API URL is unavailable.");

  const response = await fetch(`${apiBaseUrl}/admin/device-reset-requests/${encodeURIComponent(requestId)}/reject`, {
    method: "POST",
    headers: {
      ...getAdminAuthHeaders(user),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}),
  });

  const data = await parseJsonResponse<{ request: DeviceResetRequest }>(response, "Could not reject device reset request.");
  return data.request;
}
