import { Router, type IRouter } from "express";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { getAdminPanelActor, requireAdminPanelUser, type AdminPanelRole } from "../middlewares/adminAuth";
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
import { PhoneOtpError, sendPhoneOtp, verifyPhoneOtp } from "../lib/phoneOtpService";

type AdminLanguage = "en" | "ar";

type AdminPanelAccount = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  phoneVerified?: boolean;
  phoneVerifiedAt?: string;
  phoneVerificationCodeHash?: string;
  phoneVerificationExpiresAt?: string;
  phoneVerificationAttempts?: number;
  twoFactorEnabled?: boolean;
  twoFactorEnabledAt?: string;
  twoFactorDisabledAt?: string;
  role: AdminPanelRole;
  publisherId?: string;
  passwordHash?: string;
  passwordUpdatedAt?: string;
  failedLoginAttempts?: number;
  lockedUntil?: string;
  createdAt?: string;
  updatedAt?: string;
};

type AccountPreferences = {
  adminInterfaceLanguage: AdminLanguage;
  emailNotifications: boolean;
};

type AccountSecuritySettings = {
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

type DeviceProtectionSettings = {
  oneDeviceOnlyForStudents: boolean;
  requireAdminApprovalForDeviceReset: boolean;
  deviceResetCooldownDays: number;
  maxDeviceResetRequestsPerMonth: number;
  blockLoginFromUnregisteredDevices: boolean;
  logEveryBlockedDeviceAttempt: boolean;
};

type ReaderProtectionSettings = {
  requireInternetToOpenBooks: boolean;
  blockUnpurchasedReaderAccess: boolean;
  visibleWatermark: boolean;
  watermarkStudentEmail: boolean;
  watermarkDeviceId: boolean;
  watermarkTimestamp: boolean;
  screenshotProtectionEnabled: boolean;
  logScreenshotAttempts: boolean;
};

type MonitoringSettings = {
  enableSecurityEventLogging: boolean;
  autoMarkLowRiskEventsAfterDays: number;
  keepSecurityLogsForDays: number;
  notifyAdminOnCriticalEvents: boolean;
  notifyAdminOnRepeatedDeviceBlockedAttempts: boolean;
  notifyAdminOnScreenshotAttempts: boolean;
};

type PlatformNotificationSettings = {
  adminEmailNotifications: boolean;
  publisherSecuritySummaryNotifications: boolean;
  studentAccountSecurityNotifications: boolean;
  deviceResetRequestNotifications: boolean;
};

type PlatformSettings = {
  enableBookLending: boolean;
  autoSuspendOverdueBorrowers: boolean;
  studentArabicInterface: boolean;
  overdueLendingAlerts: boolean;
  accountSecurity: AccountSecuritySettings;
  deviceProtection: DeviceProtectionSettings;
  readerProtection: ReaderProtectionSettings;
  monitoring: MonitoringSettings;
  notifications: PlatformNotificationSettings;
};

type AdminPanelSettings = {
  accounts?: AdminPanelAccount[];
  accountPreferences?: Record<string, AccountPreferences>;
  platform?: PlatformSettings;
};

type AdminLoginChallenge = {
  id: string;
  accountId: string;
  role: AdminPanelRole;
  email: string;
  phone: string;
  status: "pending" | "verified" | "failed" | "expired";
  attempts: number;
  maxAttempts: number;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
};

type AdminSecurityEvent = {
  id: string;
  type: string;
  severity: "low" | "medium" | "high" | "critical";
  userId: string;
  userName: string;
  userEmail: string;
  deviceIdMasked?: string;
  message: string;
  metadata?: Record<string, unknown>;
  reviewed?: boolean;
  reviewedAt?: string;
  reviewedByAdminId?: string;
  createdAt: string;
};

type AdminAuditLog = {
  id: string;
  adminId: string;
  action: string;
  targetType: string;
  targetId: string;
  message: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
};

type CatalogState = {
  adminPanelSettings?: AdminPanelSettings;
  adminLoginChallenges?: AdminLoginChallenge[];
  adminSecurityEvents?: AdminSecurityEvent[];
  adminAuditLogs?: AdminAuditLog[];
  updatedAt?: string;
  [key: string]: unknown;
};

const TWO_FACTOR_CHALLENGE_TTL_SECONDS = Number(process.env.ADMIN_2FA_CHALLENGE_TTL_SECONDS ?? process.env.PHONE_OTP_TTL_SECONDS ?? 600);

const DATA_FILE = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "data",
  "catalog.json",
);

const DEFAULT_PLATFORM_SETTINGS: PlatformSettings = {
  enableBookLending: true,
  autoSuspendOverdueBorrowers: false,
  studentArabicInterface: false,
  overdueLendingAlerts: true,
  accountSecurity: {
    requirePhoneVerificationForNewAccounts: true,
    requireTwoFactorForAdmins: false,
    requireTwoFactorForPublishers: false,
    allowStudentOptionalTwoFactor: true,
    maxFailedLoginAttempts: 5,
    accountLockDurationMinutes: 15,
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
  monitoring: {
    enableSecurityEventLogging: true,
    autoMarkLowRiskEventsAfterDays: 30,
    keepSecurityLogsForDays: 365,
    notifyAdminOnCriticalEvents: true,
    notifyAdminOnRepeatedDeviceBlockedAttempts: true,
    notifyAdminOnScreenshotAttempts: true,
  },
  notifications: {
    adminEmailNotifications: true,
    publisherSecuritySummaryNotifications: false,
    studentAccountSecurityNotifications: true,
    deviceResetRequestNotifications: true,
  },
};

const DEFAULT_ACCOUNT_PREFERENCES: AccountPreferences = {
  adminInterfaceLanguage: "en",
  emailNotifications: true,
};

const DEFAULT_ACCOUNTS: AdminPanelAccount[] = [
  {
    id: "admin1",
    name: "Karim Mansour",
    email: "admin@warqless.com",
    phone: "+201001234567",
    phoneVerified: false,
    twoFactorEnabled: false,
    role: "admin",
  },
  {
    id: "pub1",
    name: "Dar Al-Ma'aref",
    email: "publisher@darmaref.eg",
    phone: "+201001234568",
    phoneVerified: false,
    twoFactorEnabled: false,
    role: "publisher",
    publisherId: "p1",
  },
];

const DEFAULT_PASSWORDS: Record<string, string> = {
  admin1: "admin123",
  pub1: "pub123",
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

async function readState(): Promise<CatalogState> {
  try {
    const raw = await readFile(DATA_FILE, "utf8");
    return JSON.parse(raw) as CatalogState;
  } catch {
    return { updatedAt: new Date().toISOString() };
  }
}

async function writeState(state: CatalogState) {
  await mkdir(path.dirname(DATA_FILE), { recursive: true });
  await writeFile(DATA_FILE, JSON.stringify(state, null, 2));
}

function normalizeRole(value: unknown): AdminPanelRole | null {
  if (value === "admin" || value === "publisher") return value;
  return null;
}

function normalizeLanguage(value: unknown): AdminLanguage {
  return value === "ar" ? "ar" : "en";
}

function normalizeInteger(value: unknown, fallback: number, min: number, max: number): number {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : Number.NaN;
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(Math.trunc(parsed), min), max);
}

function normalizeAccountSecuritySettings(value: unknown): AccountSecuritySettings {
  const raw = isRecord(value) ? value : {};
  const defaults = DEFAULT_PLATFORM_SETTINGS.accountSecurity;
  return {
    requirePhoneVerificationForNewAccounts:
      typeof raw.requirePhoneVerificationForNewAccounts === "boolean"
        ? raw.requirePhoneVerificationForNewAccounts
        : defaults.requirePhoneVerificationForNewAccounts,
    requireTwoFactorForAdmins:
      typeof raw.requireTwoFactorForAdmins === "boolean"
        ? raw.requireTwoFactorForAdmins
        : defaults.requireTwoFactorForAdmins,
    requireTwoFactorForPublishers:
      typeof raw.requireTwoFactorForPublishers === "boolean"
        ? raw.requireTwoFactorForPublishers
        : defaults.requireTwoFactorForPublishers,
    allowStudentOptionalTwoFactor:
      typeof raw.allowStudentOptionalTwoFactor === "boolean"
        ? raw.allowStudentOptionalTwoFactor
        : defaults.allowStudentOptionalTwoFactor,
    maxFailedLoginAttempts: normalizeInteger(raw.maxFailedLoginAttempts, defaults.maxFailedLoginAttempts, 1, 20),
    accountLockDurationMinutes: normalizeInteger(raw.accountLockDurationMinutes, defaults.accountLockDurationMinutes, 1, 1440),
    sessionTimeoutMinutes: normalizeInteger(raw.sessionTimeoutMinutes, defaults.sessionTimeoutMinutes, 5, 1440),
    forceLogoutVersion: normalizeInteger(raw.forceLogoutVersion, defaults.forceLogoutVersion, 0, 1_000_000),
    forceLogoutIssuedAt: typeof raw.forceLogoutIssuedAt === "string" ? raw.forceLogoutIssuedAt : undefined,
  };
}

function normalizeDeviceProtectionSettings(value: unknown): DeviceProtectionSettings {
  const raw = isRecord(value) ? value : {};
  const defaults = DEFAULT_PLATFORM_SETTINGS.deviceProtection;
  return {
    oneDeviceOnlyForStudents:
      typeof raw.oneDeviceOnlyForStudents === "boolean" ? raw.oneDeviceOnlyForStudents : defaults.oneDeviceOnlyForStudents,
    requireAdminApprovalForDeviceReset:
      typeof raw.requireAdminApprovalForDeviceReset === "boolean"
        ? raw.requireAdminApprovalForDeviceReset
        : defaults.requireAdminApprovalForDeviceReset,
    deviceResetCooldownDays: normalizeInteger(raw.deviceResetCooldownDays, defaults.deviceResetCooldownDays, 0, 365),
    maxDeviceResetRequestsPerMonth: normalizeInteger(
      raw.maxDeviceResetRequestsPerMonth,
      defaults.maxDeviceResetRequestsPerMonth,
      0,
      50,
    ),
    blockLoginFromUnregisteredDevices:
      typeof raw.blockLoginFromUnregisteredDevices === "boolean"
        ? raw.blockLoginFromUnregisteredDevices
        : defaults.blockLoginFromUnregisteredDevices,
    logEveryBlockedDeviceAttempt:
      typeof raw.logEveryBlockedDeviceAttempt === "boolean"
        ? raw.logEveryBlockedDeviceAttempt
        : defaults.logEveryBlockedDeviceAttempt,
  };
}

function normalizeReaderProtectionSettings(value: unknown): ReaderProtectionSettings {
  const raw = isRecord(value) ? value : {};
  const defaults = DEFAULT_PLATFORM_SETTINGS.readerProtection;
  return {
    requireInternetToOpenBooks:
      typeof raw.requireInternetToOpenBooks === "boolean" ? raw.requireInternetToOpenBooks : defaults.requireInternetToOpenBooks,
    blockUnpurchasedReaderAccess:
      typeof raw.blockUnpurchasedReaderAccess === "boolean"
        ? raw.blockUnpurchasedReaderAccess
        : defaults.blockUnpurchasedReaderAccess,
    visibleWatermark: typeof raw.visibleWatermark === "boolean" ? raw.visibleWatermark : defaults.visibleWatermark,
    watermarkStudentEmail:
      typeof raw.watermarkStudentEmail === "boolean" ? raw.watermarkStudentEmail : defaults.watermarkStudentEmail,
    watermarkDeviceId: typeof raw.watermarkDeviceId === "boolean" ? raw.watermarkDeviceId : defaults.watermarkDeviceId,
    watermarkTimestamp: typeof raw.watermarkTimestamp === "boolean" ? raw.watermarkTimestamp : defaults.watermarkTimestamp,
    screenshotProtectionEnabled:
      typeof raw.screenshotProtectionEnabled === "boolean"
        ? raw.screenshotProtectionEnabled
        : defaults.screenshotProtectionEnabled,
    logScreenshotAttempts:
      typeof raw.logScreenshotAttempts === "boolean" ? raw.logScreenshotAttempts : defaults.logScreenshotAttempts,
  };
}

function normalizeMonitoringSettings(value: unknown): MonitoringSettings {
  const raw = isRecord(value) ? value : {};
  const defaults = DEFAULT_PLATFORM_SETTINGS.monitoring;
  return {
    enableSecurityEventLogging:
      typeof raw.enableSecurityEventLogging === "boolean"
        ? raw.enableSecurityEventLogging
        : defaults.enableSecurityEventLogging,
    autoMarkLowRiskEventsAfterDays: normalizeInteger(
      raw.autoMarkLowRiskEventsAfterDays,
      defaults.autoMarkLowRiskEventsAfterDays,
      0,
      3650,
    ),
    keepSecurityLogsForDays: normalizeInteger(raw.keepSecurityLogsForDays, defaults.keepSecurityLogsForDays, 1, 3650),
    notifyAdminOnCriticalEvents:
      typeof raw.notifyAdminOnCriticalEvents === "boolean"
        ? raw.notifyAdminOnCriticalEvents
        : defaults.notifyAdminOnCriticalEvents,
    notifyAdminOnRepeatedDeviceBlockedAttempts:
      typeof raw.notifyAdminOnRepeatedDeviceBlockedAttempts === "boolean"
        ? raw.notifyAdminOnRepeatedDeviceBlockedAttempts
        : defaults.notifyAdminOnRepeatedDeviceBlockedAttempts,
    notifyAdminOnScreenshotAttempts:
      typeof raw.notifyAdminOnScreenshotAttempts === "boolean"
        ? raw.notifyAdminOnScreenshotAttempts
        : defaults.notifyAdminOnScreenshotAttempts,
  };
}

function normalizePlatformNotificationSettings(value: unknown): PlatformNotificationSettings {
  const raw = isRecord(value) ? value : {};
  const defaults = DEFAULT_PLATFORM_SETTINGS.notifications;
  return {
    adminEmailNotifications:
      typeof raw.adminEmailNotifications === "boolean" ? raw.adminEmailNotifications : defaults.adminEmailNotifications,
    publisherSecuritySummaryNotifications:
      typeof raw.publisherSecuritySummaryNotifications === "boolean"
        ? raw.publisherSecuritySummaryNotifications
        : defaults.publisherSecuritySummaryNotifications,
    studentAccountSecurityNotifications:
      typeof raw.studentAccountSecurityNotifications === "boolean"
        ? raw.studentAccountSecurityNotifications
        : defaults.studentAccountSecurityNotifications,
    deviceResetRequestNotifications:
      typeof raw.deviceResetRequestNotifications === "boolean"
        ? raw.deviceResetRequestNotifications
        : defaults.deviceResetRequestNotifications,
  };
}

function normalizeAccount(value: unknown): AdminPanelAccount | null {
  if (!isRecord(value)) return null;
  const role = normalizeRole(value.role);
  if (
    !role ||
    typeof value.id !== "string" ||
    typeof value.name !== "string" ||
    typeof value.email !== "string"
  ) {
    return null;
  }

  return {
    id: value.id,
    name: value.name,
    email: value.email,
    phone: normalizeEgyptPhone(value.phone) ?? undefined,
    phoneVerified: Boolean(value.phoneVerified),
    phoneVerifiedAt: typeof value.phoneVerifiedAt === "string" ? value.phoneVerifiedAt : undefined,
    phoneVerificationCodeHash:
      typeof value.phoneVerificationCodeHash === "string" ? value.phoneVerificationCodeHash : undefined,
    phoneVerificationExpiresAt:
      typeof value.phoneVerificationExpiresAt === "string" ? value.phoneVerificationExpiresAt : undefined,
    phoneVerificationAttempts:
      typeof value.phoneVerificationAttempts === "number" ? value.phoneVerificationAttempts : undefined,
    twoFactorEnabled: Boolean(value.twoFactorEnabled),
    twoFactorEnabledAt: typeof value.twoFactorEnabledAt === "string" ? value.twoFactorEnabledAt : undefined,
    twoFactorDisabledAt: typeof value.twoFactorDisabledAt === "string" ? value.twoFactorDisabledAt : undefined,
    role,
    publisherId: typeof value.publisherId === "string" ? value.publisherId : undefined,
    passwordHash: typeof value.passwordHash === "string" ? value.passwordHash : undefined,
    passwordUpdatedAt: typeof value.passwordUpdatedAt === "string" ? value.passwordUpdatedAt : undefined,
    failedLoginAttempts: normalizeInteger(value.failedLoginAttempts, 0, 0, 10_000),
    lockedUntil: typeof value.lockedUntil === "string" ? value.lockedUntil : undefined,
    createdAt: typeof value.createdAt === "string" ? value.createdAt : undefined,
    updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : undefined,
  };
}

function normalizePreferences(value: unknown): AccountPreferences {
  const raw = isRecord(value) ? value : {};
  return {
    adminInterfaceLanguage: normalizeLanguage(raw.adminInterfaceLanguage),
    emailNotifications:
      typeof raw.emailNotifications === "boolean"
        ? raw.emailNotifications
        : DEFAULT_ACCOUNT_PREFERENCES.emailNotifications,
  };
}

function normalizePlatformSettings(value: unknown): PlatformSettings {
  const raw = isRecord(value) ? value : {};
  return {
    enableBookLending:
      typeof raw.enableBookLending === "boolean"
        ? raw.enableBookLending
        : DEFAULT_PLATFORM_SETTINGS.enableBookLending,
    autoSuspendOverdueBorrowers:
      typeof raw.autoSuspendOverdueBorrowers === "boolean"
        ? raw.autoSuspendOverdueBorrowers
        : DEFAULT_PLATFORM_SETTINGS.autoSuspendOverdueBorrowers,
    studentArabicInterface:
      typeof raw.studentArabicInterface === "boolean"
        ? raw.studentArabicInterface
        : DEFAULT_PLATFORM_SETTINGS.studentArabicInterface,
    overdueLendingAlerts:
      typeof raw.overdueLendingAlerts === "boolean"
        ? raw.overdueLendingAlerts
        : DEFAULT_PLATFORM_SETTINGS.overdueLendingAlerts,
    accountSecurity: normalizeAccountSecuritySettings(raw.accountSecurity),
    deviceProtection: normalizeDeviceProtectionSettings(raw.deviceProtection),
    readerProtection: normalizeReaderProtectionSettings(raw.readerProtection),
    monitoring: normalizeMonitoringSettings(raw.monitoring),
    notifications: normalizePlatformNotificationSettings(raw.notifications),
  };
}

function normalizeSettings(value: unknown): Required<AdminPanelSettings> {
  const raw = isRecord(value) ? value : {};
  const rawPreferences = isRecord(raw.accountPreferences) ? raw.accountPreferences : {};

  return {
    accounts: Array.isArray(raw.accounts)
      ? raw.accounts.map(normalizeAccount).filter((account): account is AdminPanelAccount => Boolean(account))
      : [],
    accountPreferences: Object.fromEntries(
      Object.entries(rawPreferences).map(([accountId, prefs]) => [accountId, normalizePreferences(prefs)]),
    ),
    platform: normalizePlatformSettings(raw.platform),
  };
}

function publicAccount(account: AdminPanelAccount) {
  return {
    id: account.id,
    name: account.name,
    email: account.email,
    phone: account.phone,
    phoneVerified: Boolean(account.phoneVerified),
    phoneVerifiedAt: account.phoneVerifiedAt,
    twoFactorEnabled: Boolean(account.twoFactorEnabled),
    twoFactorEnabledAt: account.twoFactorEnabledAt,
    role: account.role,
    publisherId: account.publisherId,
  };
}

function fallbackAccountFor(role: AdminPanelRole, email?: string, id?: string): AdminPanelAccount {
  const defaultAccount = DEFAULT_ACCOUNTS.find(
    (account) => account.role === role && (account.id === id || account.email.toLowerCase() === email?.toLowerCase()),
  );

  if (defaultAccount) return defaultAccount;

  const normalizedEmail = email && EMAIL_RE.test(email) ? email : `${role}@warqless.local`;
  return {
    id: id || `${role}-${Date.now()}`,
    name: normalizedEmail.split("@")[0] || role,
    email: normalizedEmail,
    phoneVerified: false,
    twoFactorEnabled: false,
    role,
  };
}

function accountForActor(settings: Required<AdminPanelSettings>, actor: ReturnType<typeof getAdminPanelActor>) {
  return (
    settings.accounts.find((account) => account.id === actor.id) ??
    settings.accounts.find((account) => account.role === actor.role && account.email.toLowerCase() === actor.email.toLowerCase()) ??
    fallbackAccountFor(actor.role, actor.email, actor.id)
  );
}

function upsertAccount(settings: Required<AdminPanelSettings>, account: AdminPanelAccount) {
  settings.accounts = [
    account,
    ...settings.accounts.filter((candidate) => candidate.id !== account.id),
  ];
}

function preferencesFor(settings: Required<AdminPanelSettings>, accountId: string): AccountPreferences {
  return normalizePreferences(settings.accountPreferences[accountId]);
}

function setPreference(settings: Required<AdminPanelSettings>, accountId: string, preferences: AccountPreferences) {
  settings.accountPreferences[accountId] = preferences;
}

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function parseDateMs(value?: string) {
  if (!value) return 0;
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

function isActiveChallenge(challenge: AdminLoginChallenge, nowMs = Date.now()) {
  return challenge.status === "pending" && parseDateMs(challenge.expiresAt) > nowMs;
}

function sanitizeLoginChallenges(challenges: unknown, nowMs = Date.now()): AdminLoginChallenge[] {
  if (!Array.isArray(challenges)) return [];
  const oneDayAgo = nowMs - 24 * 60 * 60 * 1000;
  return challenges
    .filter((challenge): challenge is AdminLoginChallenge =>
      isRecord(challenge) &&
      typeof challenge.id === "string" &&
      typeof challenge.accountId === "string" &&
      (challenge.role === "admin" || challenge.role === "publisher") &&
      typeof challenge.email === "string" &&
      typeof challenge.phone === "string" &&
      (challenge.status === "pending" || challenge.status === "verified" || challenge.status === "failed" || challenge.status === "expired") &&
      typeof challenge.expiresAt === "string" &&
      typeof challenge.createdAt === "string" &&
      typeof challenge.updatedAt === "string",
    )
    .map((challenge) => ({
      ...challenge,
      attempts: typeof challenge.attempts === "number" ? challenge.attempts : 0,
      maxAttempts: typeof challenge.maxAttempts === "number" ? challenge.maxAttempts : PHONE_VERIFICATION_MAX_ATTEMPTS,
    }))
    .filter((challenge) => parseDateMs(challenge.createdAt) >= oneDayAgo);
}

function appendAdminSecurityEvent(
  state: CatalogState,
  account: AdminPanelAccount,
  input: Omit<AdminSecurityEvent, "id" | "userId" | "userName" | "userEmail" | "createdAt">,
) {
  const settings = normalizeSettings(state.adminPanelSettings);
  if (!settings.platform.monitoring.enableSecurityEventLogging) return;

  const event: AdminSecurityEvent = {
    ...input,
    id: createId("evt"),
    userId: account.id,
    userName: account.name,
    userEmail: account.email,
    createdAt: new Date().toISOString(),
  };
  state.adminSecurityEvents = [event, ...(state.adminSecurityEvents ?? [])].slice(0, 200);
}

function appendAdminAuditLog(
  state: CatalogState,
  account: AdminPanelAccount,
  input: Omit<AdminAuditLog, "id" | "adminId" | "createdAt">,
) {
  const auditLog: AdminAuditLog = {
    ...input,
    id: createId("audit"),
    adminId: account.id,
    createdAt: new Date().toISOString(),
  };
  state.adminAuditLogs = [auditLog, ...(state.adminAuditLogs ?? [])];
}

function respondPhoneOtpError(res: { status: (status: number) => { json: (body: unknown) => void } }, error: unknown) {
  if (error instanceof PhoneOtpError) {
    res.status(error.status).json({ message: error.message, ...error.payload });
    return true;
  }
  return false;
}

function createPasswordHash(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

function verifyPassword(password: string, passwordHash: string): boolean {
  const [scheme, salt, stored] = passwordHash.split(":");
  if (scheme !== "scrypt" || !salt || !stored) return false;

  const expected = Buffer.from(stored, "hex");
  const actual = scryptSync(password, salt, expected.length);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

function verifyAccountPassword(account: AdminPanelAccount, password: string): boolean {
  if (account.passwordHash) return verifyPassword(password, account.passwordHash);
  const defaultPassword = DEFAULT_PASSWORDS[account.id];
  return Boolean(defaultPassword) && password === defaultPassword;
}

function maskPhone(phone: string) {
  if (phone.length <= 6) return "******";
  return `${phone.slice(0, 4)}******${phone.slice(-3)}`;
}

function roleRequiresTwoFactor(platform: PlatformSettings, role: AdminPanelRole) {
  if (role === "admin") return platform.accountSecurity.requireTwoFactorForAdmins;
  return platform.accountSecurity.requireTwoFactorForPublishers;
}

function isAccountLocked(account: AdminPanelAccount, nowMs = Date.now()) {
  return Boolean(account.lockedUntil && parseDateMs(account.lockedUntil) > nowMs);
}

function platformSettingsChanged(before: PlatformSettings, after: PlatformSettings) {
  return JSON.stringify(before) !== JSON.stringify(after);
}

function mergePlatformSettings(current: PlatformSettings, input: Record<string, unknown>) {
  return normalizePlatformSettings({
    ...current,
    ...input,
    accountSecurity: {
      ...current.accountSecurity,
      ...(isRecord(input.accountSecurity) ? input.accountSecurity : {}),
    },
    deviceProtection: {
      ...current.deviceProtection,
      ...(isRecord(input.deviceProtection) ? input.deviceProtection : {}),
    },
    readerProtection: {
      ...current.readerProtection,
      ...(isRecord(input.readerProtection) ? input.readerProtection : {}),
    },
    monitoring: {
      ...current.monitoring,
      ...(isRecord(input.monitoring) ? input.monitoring : {}),
    },
    notifications: {
      ...current.notifications,
      ...(isRecord(input.notifications) ? input.notifications : {}),
    },
  });
}

function findLoginAccount(settings: Required<AdminPanelSettings>, role: AdminPanelRole, email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const stored = settings.accounts.find(
    (account) => account.role === role && account.email.toLowerCase() === normalizedEmail,
  );
  if (stored) return stored;

  const defaultAccount = DEFAULT_ACCOUNTS.find(
    (account) => account.role === role && account.email.toLowerCase() === normalizedEmail,
  );
  if (!defaultAccount) return null;

  const defaultWasOverridden = settings.accounts.some((account) => account.id === defaultAccount.id);
  return defaultWasOverridden ? null : defaultAccount;
}

const router: IRouter = Router();

router.post("/admin/auth/login", async (req, res, next) => {
  try {
    const role = normalizeRole(req.body?.role);
    const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const password = typeof req.body?.password === "string" ? req.body.password : "";

    if (!role || !EMAIL_RE.test(email) || !password) {
      res.status(400).json({ message: "Invalid login payload" });
      return;
    }

    const state = await readState();
    const settings = normalizeSettings(state.adminPanelSettings);
    let account = findLoginAccount(settings, role, email);

    if (!account) {
      res.status(401).json({ message: "Invalid credentials" });
      return;
    }

    if (isAccountLocked(account)) {
      res.status(423).json({
        message: "Account is temporarily locked because of too many failed login attempts.",
        lockedUntil: account.lockedUntil,
      });
      return;
    }

    if (!verifyAccountPassword(account, password)) {
      const now = new Date().toISOString();
      const nextFailedAttempts = (account.failedLoginAttempts ?? 0) + 1;
      const maxFailedAttempts = settings.platform.accountSecurity.maxFailedLoginAttempts;
      const shouldLock = nextFailedAttempts >= maxFailedAttempts;
      const lockedUntil = shouldLock
        ? new Date(Date.now() + settings.platform.accountSecurity.accountLockDurationMinutes * 60 * 1000).toISOString()
        : undefined;
      const nextAccount: AdminPanelAccount = {
        ...account,
        failedLoginAttempts: nextFailedAttempts,
        lockedUntil,
        updatedAt: now,
      };
      upsertAccount(settings, nextAccount);
      state.adminPanelSettings = settings;
      appendAdminSecurityEvent(state, nextAccount, {
        type: "suspicious_activity",
        severity: shouldLock ? "high" : "medium",
        deviceIdMasked: "admin_login",
        message: shouldLock
          ? `Admin panel account locked after ${nextFailedAttempts} failed login attempts.`
          : "Admin panel login failed because of an incorrect password.",
        metadata: {
          attempts: nextFailedAttempts,
          maxFailedAttempts,
          lockedUntil,
          role,
        },
      });
      state.updatedAt = now;
      await writeState(state);
      res.status(shouldLock ? 423 : 401).json({
        message: shouldLock
          ? "Account is temporarily locked because of too many failed login attempts."
          : "Invalid credentials",
        lockedUntil,
      });
      return;
    }

    if (account.failedLoginAttempts || account.lockedUntil) {
      account = {
        ...account,
        failedLoginAttempts: 0,
        lockedUntil: undefined,
        updatedAt: new Date().toISOString(),
      };
      upsertAccount(settings, account);
      state.adminPanelSettings = settings;
      state.updatedAt = account.updatedAt;
      await writeState(state);
    }

    const twoFactorRequiredByPolicy = roleRequiresTwoFactor(settings.platform, account.role);
    if (account.twoFactorEnabled || twoFactorRequiredByPolicy) {
      if (!account.phone) {
        res.status(403).json({
          message: twoFactorRequiredByPolicy
            ? "Two-factor authentication is required for this role. Add and verify a phone number first."
            : "Two-factor authentication is enabled, but this account has no phone number.",
        });
        return;
      }

      const phone = normalizeEgyptPhone(account.phone);
      if (!phone || !account.phoneVerified) {
        res.status(403).json({
          message: twoFactorRequiredByPolicy
            ? "Two-factor authentication is required for this role. Verify the account phone number first."
            : "Two-factor authentication requires a verified phone number.",
        });
        return;
      }

      let otp;
      try {
        otp = await sendPhoneOtp({ phone, purpose: "login_2fa" });
      } catch (error) {
        if (respondPhoneOtpError(res, error)) return;
        throw error;
      }

      const latestState = await readState();
      const latestSettings = normalizeSettings(latestState.adminPanelSettings);
      const latestAccount = latestSettings.accounts.find((candidate) => candidate.id === account.id) ?? account;
      const now = new Date().toISOString();
      const challenge: AdminLoginChallenge = {
        id: createId("2fa"),
        accountId: account.id,
        role: account.role,
        email: account.email,
        phone,
        status: "pending",
        attempts: 0,
        maxAttempts: PHONE_VERIFICATION_MAX_ATTEMPTS,
        expiresAt: otp.expiresAt,
        createdAt: now,
        updatedAt: now,
      };

      latestState.adminLoginChallenges = [
        challenge,
        ...sanitizeLoginChallenges(latestState.adminLoginChallenges).filter((item) => item.id !== challenge.id),
      ];
      appendAdminSecurityEvent(latestState, latestAccount, {
        type: "two_factor_challenge_sent",
        severity: "medium",
        deviceIdMasked: "admin_login",
        message: `Two-factor login challenge sent to ${maskPhone(phone)}.`,
        metadata: { challengeId: challenge.id, purpose: "login_2fa", role: account.role, policyRequired: twoFactorRequiredByPolicy },
      });
      latestState.updatedAt = now;
      await writeState(latestState);

      res.status(202).json({
        twoFactorRequired: true,
        challengeId: challenge.id,
        expiresIn: otp.expiresIn,
        expiresAt: otp.expiresAt,
        maskedPhone: maskPhone(phone),
        devCode: otp.devCode,
        message: "Two-factor authentication required.",
      });
      return;
    }

    res.json({ account: publicAccount(account) });
  } catch (err) {
    next(err);
  }
});

router.post("/admin/auth/2fa/verify", async (req, res, next) => {
  try {
    const challengeId = typeof req.body?.challengeId === "string" ? req.body.challengeId.trim() : "";
    const code = typeof req.body?.code === "string" ? req.body.code.trim() : "";

    if (!challengeId || !/^\d{6}$/.test(code)) {
      res.status(400).json({ message: "Enter the 6-digit two-factor code." });
      return;
    }

    const state = await readState();
    const settings = normalizeSettings(state.adminPanelSettings);
    const now = new Date();
    const nowIso = now.toISOString();
    const challenges = sanitizeLoginChallenges(state.adminLoginChallenges, now.getTime());
    const challenge = challenges.find((item) => item.id === challengeId);

    if (!challenge || !isActiveChallenge(challenge, now.getTime())) {
      res.status(400).json({ message: "Two-factor challenge expired. Please sign in again." });
      return;
    }

    const account = settings.accounts.find((candidate) => candidate.id === challenge.accountId);
    if (!account || !account.twoFactorEnabled || !account.phone || normalizeEgyptPhone(account.phone) !== challenge.phone) {
      res.status(400).json({ message: "Two-factor challenge is no longer valid. Please sign in again." });
      return;
    }

    if (challenge.attempts >= challenge.maxAttempts) {
      challenge.status = "failed";
      challenge.updatedAt = nowIso;
      state.adminLoginChallenges = challenges;
      appendAdminSecurityEvent(state, account, {
        type: "two_factor_failed",
        severity: "high",
        deviceIdMasked: "admin_login",
        message: "Two-factor login challenge failed because the attempt limit was reached.",
        metadata: { challengeId: challenge.id, reason: "attempt_limit" },
      });
      state.updatedAt = nowIso;
      await writeState(state);
      res.status(429).json({ message: "Too many verification attempts. Please sign in again." });
      return;
    }

    try {
      await verifyPhoneOtp({ phone: challenge.phone, purpose: "login_2fa", code });
    } catch (error) {
      const latestState = await readState();
      const latestChallenges = sanitizeLoginChallenges(latestState.adminLoginChallenges, now.getTime());
      const latestChallenge = latestChallenges.find((item) => item.id === challenge.id);
      if (latestChallenge) {
        latestChallenge.attempts += 1;
        latestChallenge.status = latestChallenge.attempts >= latestChallenge.maxAttempts ? "failed" : "pending";
        latestChallenge.updatedAt = nowIso;
      }
      appendAdminSecurityEvent(latestState, account, {
        type: "two_factor_failed",
        severity: latestChallenge && latestChallenge.attempts >= latestChallenge.maxAttempts ? "high" : "medium",
        deviceIdMasked: "admin_login",
        message: "Two-factor login challenge failed.",
        metadata: {
          challengeId: challenge.id,
          attempts: latestChallenge?.attempts ?? challenge.attempts + 1,
        },
      });
      latestState.adminLoginChallenges = latestChallenges;
      latestState.updatedAt = nowIso;
      await writeState(latestState);

      if (respondPhoneOtpError(res, error)) return;
      throw error;
    }

    const latestState = await readState();
    const latestChallenges = sanitizeLoginChallenges(latestState.adminLoginChallenges, now.getTime());
    const latestChallenge = latestChallenges.find((item) => item.id === challenge.id);
    if (latestChallenge) {
      latestChallenge.status = "verified";
      latestChallenge.updatedAt = nowIso;
    }
    latestState.adminLoginChallenges = latestChallenges;
    appendAdminSecurityEvent(latestState, account, {
      type: "two_factor_success",
      severity: "low",
      deviceIdMasked: "admin_login",
      message: "Two-factor login challenge verified successfully.",
      metadata: { challengeId: challenge.id },
    });
    latestState.updatedAt = nowIso;
    await writeState(latestState);

    res.json({ account: publicAccount(account) });
  } catch (err) {
    next(err);
  }
});

router.use("/admin/settings", requireAdminPanelUser);

router.get("/admin/settings", async (req, res, next) => {
  try {
    const actor = getAdminPanelActor(req);
    const state = await readState();
    const settings = normalizeSettings(state.adminPanelSettings);
    const account = accountForActor(settings, actor);
    const preferences = preferencesFor(settings, account.id);

    if (
      !state.adminPanelSettings ||
      !settings.accounts.some((candidate) => candidate.id === account.id) ||
      !settings.accountPreferences[account.id]
    ) {
      upsertAccount(settings, account);
      setPreference(settings, account.id, preferences);
      await writeState({
        ...state,
        adminPanelSettings: settings,
        updatedAt: new Date().toISOString(),
      });
    }

    res.json({
      account: publicAccount(account),
      preferences,
      platformSettings: settings.platform,
    });
  } catch (err) {
    next(err);
  }
});

router.patch("/admin/settings", async (req, res, next) => {
  try {
    const actor = getAdminPanelActor(req);
    const state = await readState();
    const settings = normalizeSettings(state.adminPanelSettings);
    const currentAccount = accountForActor(settings, actor);
    const errors: string[] = [];
    const now = new Date().toISOString();

    const accountInput = isRecord(req.body?.account) ? req.body.account : {};
    const preferenceInput = isRecord(req.body?.preferences) ? req.body.preferences : {};
    const platformInput = isRecord(req.body?.platformSettings) ? req.body.platformSettings : null;
    const previousPlatformSettings = settings.platform;

    const nextName =
      typeof accountInput.name === "string" ? accountInput.name.trim() : currentAccount.name;
    const nextEmail =
      typeof accountInput.email === "string" ? accountInput.email.trim().toLowerCase() : currentAccount.email;
    const phoneWasProvided = typeof accountInput.phone === "string";
    const normalizedPhone = phoneWasProvided ? normalizeEgyptPhone(accountInput.phone) ?? undefined : currentAccount.phone;
    const nextPassword =
      typeof accountInput.newPassword === "string" ? accountInput.newPassword : "";

    if (!nextName) errors.push("Name is required.");
    if (!EMAIL_RE.test(nextEmail)) errors.push("A valid email address is required.");
    if (phoneWasProvided && !normalizedPhone) {
      errors.push("Enter a valid Egyptian mobile phone number, e.g. +201001234567 or 01001234567.");
    }
    if (nextPassword && nextPassword.length < 6) errors.push("Password must be at least 6 characters.");

    const emailAlreadyUsed = settings.accounts.some(
      (account) =>
        account.id !== currentAccount.id &&
        account.role === currentAccount.role &&
        account.email.toLowerCase() === nextEmail,
    );
    if (emailAlreadyUsed) errors.push("This email is already used by another account.");

    if (platformInput && actor.role !== "admin") {
      res.status(403).json({ message: "Only admins can update platform settings." });
      return;
    }

    if (errors.length > 0) {
      res.status(400).json({ message: errors[0], errors });
      return;
    }

    const phoneChanged = normalizedPhone !== currentAccount.phone;
    const nextAccount: AdminPanelAccount = {
      ...currentAccount,
      name: nextName,
      email: nextEmail,
      phone: normalizedPhone,
      phoneVerified: phoneChanged ? false : Boolean(currentAccount.phoneVerified),
      phoneVerifiedAt: phoneChanged ? undefined : currentAccount.phoneVerifiedAt,
      phoneVerificationCodeHash: phoneChanged ? undefined : currentAccount.phoneVerificationCodeHash,
      phoneVerificationExpiresAt: phoneChanged ? undefined : currentAccount.phoneVerificationExpiresAt,
      phoneVerificationAttempts: phoneChanged ? 0 : currentAccount.phoneVerificationAttempts,
      twoFactorEnabled: phoneChanged ? false : Boolean(currentAccount.twoFactorEnabled),
      twoFactorEnabledAt: phoneChanged ? undefined : currentAccount.twoFactorEnabledAt,
      twoFactorDisabledAt: phoneChanged && currentAccount.twoFactorEnabled ? now : currentAccount.twoFactorDisabledAt,
      updatedAt: now,
      createdAt: currentAccount.createdAt ?? now,
      passwordHash: nextPassword ? createPasswordHash(nextPassword) : currentAccount.passwordHash,
      passwordUpdatedAt: nextPassword ? now : currentAccount.passwordUpdatedAt,
    };
    upsertAccount(settings, nextAccount);

    const nextPreferences: AccountPreferences = {
      ...preferencesFor(settings, nextAccount.id),
      adminInterfaceLanguage: normalizeLanguage(preferenceInput.adminInterfaceLanguage),
      emailNotifications:
        typeof preferenceInput.emailNotifications === "boolean"
          ? preferenceInput.emailNotifications
          : preferencesFor(settings, nextAccount.id).emailNotifications,
    };
    setPreference(settings, nextAccount.id, nextPreferences);

    const nextPlatformSettings = platformInput
      ? mergePlatformSettings(settings.platform, platformInput)
      : settings.platform;
    const didUpdatePlatformSettings =
      Boolean(platformInput) && platformSettingsChanged(previousPlatformSettings, nextPlatformSettings);
    settings.platform = nextPlatformSettings;

    const nextState: CatalogState = {
      ...state,
      adminPanelSettings: settings,
      updatedAt: now,
    };
    if (phoneChanged) {
      appendAdminAuditLog(nextState, nextAccount, {
        action: "account.phone_changed",
        targetType: "admin_panel_account",
        targetId: nextAccount.id,
        message: `Phone number changed for ${nextAccount.email}. Phone verification and 2FA were reset.`,
        metadata: { role: nextAccount.role },
      });
      appendAdminSecurityEvent(nextState, nextAccount, {
        type: "phone_changed",
        severity: "medium",
        deviceIdMasked: "admin_settings",
        message: `Phone number changed for ${nextAccount.email}. Verification status was reset.`,
        metadata: { role: nextAccount.role },
      });
    }
    if (nextPassword) {
      appendAdminAuditLog(nextState, nextAccount, {
        action: "account.password_changed",
        targetType: "admin_panel_account",
        targetId: nextAccount.id,
        message: `Password changed for ${nextAccount.email}.`,
        metadata: { role: nextAccount.role },
      });
    }
    if (currentAccount.email.toLowerCase() !== nextEmail) {
      appendAdminAuditLog(nextState, nextAccount, {
        action: "account.email_changed",
        targetType: "admin_panel_account",
        targetId: nextAccount.id,
        message: `Email changed from ${currentAccount.email} to ${nextEmail}.`,
        metadata: { role: nextAccount.role },
      });
    }
    if (didUpdatePlatformSettings) {
      appendAdminAuditLog(nextState, nextAccount, {
        action: "platform_settings.updated",
        targetType: "platform_settings",
        targetId: "global",
        message: `Platform settings updated by ${nextAccount.email}.`,
        metadata: { role: nextAccount.role },
      });
    }
    await writeState(nextState);

    res.json({
      account: publicAccount(nextAccount),
      preferences: nextPreferences,
      platformSettings: settings.platform,
    });
  } catch (err) {
    next(err);
  }
});

router.post("/admin/settings/force-logout", async (req, res, next) => {
  try {
    const actor = getAdminPanelActor(req);
    if (actor.role !== "admin") {
      res.status(403).json({ message: "Only admins can force logout all accounts." });
      return;
    }

    const state = await readState();
    const settings = normalizeSettings(state.adminPanelSettings);
    const account = accountForActor(settings, actor);
    const now = new Date().toISOString();
    settings.platform = {
      ...settings.platform,
      accountSecurity: {
        ...settings.platform.accountSecurity,
        forceLogoutVersion: settings.platform.accountSecurity.forceLogoutVersion + 1,
        forceLogoutIssuedAt: now,
      },
    };

    const nextState: CatalogState = {
      ...state,
      adminPanelSettings: settings,
      updatedAt: now,
    };
    appendAdminAuditLog(nextState, account, {
      action: "sessions.force_logout_all",
      targetType: "admin_sessions",
      targetId: "all",
      message: `Force logout marker issued by ${account.email}.`,
      metadata: {
        role: account.role,
        forceLogoutVersion: settings.platform.accountSecurity.forceLogoutVersion,
      },
    });
    await writeState(nextState);

    res.json({
      message: "Force logout marker issued.",
      platformSettings: settings.platform,
    });
  } catch (err) {
    next(err);
  }
});

router.post("/admin/settings/phone/request-verification", async (req, res, next) => {
  try {
    const actor = getAdminPanelActor(req);
    const state = await readState();
    const settings = normalizeSettings(state.adminPanelSettings);
    const currentAccount = accountForActor(settings, actor);

    if (!currentAccount.phone) {
      res.status(400).json({ message: "Add a valid phone number before requesting verification." });
      return;
    }

    const normalizedPhone = normalizeEgyptPhone(currentAccount.phone);
    if (!normalizedPhone) {
      res.status(400).json({ message: "Enter a valid Egyptian mobile phone number before requesting verification." });
      return;
    }

    const code = createPhoneVerificationCode();
    const expiresAt = getPhoneVerificationExpiresAt();
    const now = new Date().toISOString();
    const nextAccount: AdminPanelAccount = {
      ...currentAccount,
      phone: normalizedPhone,
      phoneVerified: false,
      phoneVerifiedAt: undefined,
      phoneVerificationCodeHash: createPhoneVerificationHash(code),
      phoneVerificationExpiresAt: expiresAt,
      phoneVerificationAttempts: 0,
      updatedAt: now,
      createdAt: currentAccount.createdAt ?? now,
    };

    upsertAccount(settings, nextAccount);
    const nextState: CatalogState = {
      ...state,
      adminPanelSettings: settings,
      updatedAt: now,
    };
    appendAdminSecurityEvent(nextState, nextAccount, {
      type: "phone_verification_code_sent",
      severity: "medium",
      deviceIdMasked: "admin_settings",
      message: `Phone verification code sent to ${maskPhone(normalizedPhone)}.`,
      metadata: { role: nextAccount.role, purpose: "phone_verification" },
    });
    await writeState(nextState);

    logDevPhoneOtp("admin-panel", nextAccount.id, normalizedPhone, code);
    res.json({
      message: "Phone verification code sent.",
      expiresAt,
      devCode: shouldExposeDevPhoneOtp() ? code : undefined,
      account: publicAccount(nextAccount),
    });
  } catch (err) {
    next(err);
  }
});

router.post("/admin/settings/phone/verify", async (req, res, next) => {
  try {
    const actor = getAdminPanelActor(req);
    const code = typeof req.body?.code === "string" ? req.body.code.trim() : "";

    if (!/^\d{6}$/.test(code)) {
      res.status(400).json({ message: "Enter the 6-digit verification code." });
      return;
    }

    const state = await readState();
    const settings = normalizeSettings(state.adminPanelSettings);
    const currentAccount = accountForActor(settings, actor);
    const now = new Date();

    if (!currentAccount.phoneVerificationCodeHash || !currentAccount.phoneVerificationExpiresAt) {
      res.status(400).json({ message: "No phone verification code has been requested." });
      return;
    }

    if (new Date(currentAccount.phoneVerificationExpiresAt).getTime() <= now.getTime()) {
      const expiredAccount: AdminPanelAccount = {
        ...currentAccount,
        phoneVerificationCodeHash: undefined,
        phoneVerificationExpiresAt: undefined,
        phoneVerificationAttempts: 0,
        updatedAt: now.toISOString(),
      };
      upsertAccount(settings, expiredAccount);
      const nextState: CatalogState = { ...state, adminPanelSettings: settings, updatedAt: now.toISOString() };
      appendAdminSecurityEvent(nextState, expiredAccount, {
        type: "phone_verification_failed",
        severity: "medium",
        deviceIdMasked: "admin_settings",
        message: "Phone verification failed because the code expired.",
        metadata: { role: expiredAccount.role, reason: "expired" },
      });
      await writeState(nextState);
      res.status(400).json({ message: "Phone verification code expired. Request a new code." });
      return;
    }

    const attempts = currentAccount.phoneVerificationAttempts ?? 0;
    if (attempts >= PHONE_VERIFICATION_MAX_ATTEMPTS) {
      appendAdminSecurityEvent(state, currentAccount, {
        type: "phone_verification_failed",
        severity: "high",
        deviceIdMasked: "admin_settings",
        message: "Phone verification failed because the attempt limit was reached.",
        metadata: { role: currentAccount.role, reason: "attempt_limit", attempts },
      });
      state.updatedAt = now.toISOString();
      await writeState(state);
      res.status(429).json({ message: "Too many verification attempts. Request a new code." });
      return;
    }

    if (!verifyPhoneVerificationCode(code, currentAccount.phoneVerificationCodeHash)) {
      const nextAttempts = attempts + 1;
      const nextAccount: AdminPanelAccount = {
        ...currentAccount,
        phoneVerificationAttempts: nextAttempts,
        updatedAt: now.toISOString(),
      };
      upsertAccount(settings, nextAccount);
      const nextState: CatalogState = { ...state, adminPanelSettings: settings, updatedAt: now.toISOString() };
      appendAdminSecurityEvent(nextState, nextAccount, {
        type: "phone_verification_failed",
        severity: nextAttempts >= PHONE_VERIFICATION_MAX_ATTEMPTS ? "high" : "medium",
        deviceIdMasked: "admin_settings",
        message: "Phone verification failed because the code was incorrect.",
        metadata: {
          role: nextAccount.role,
          reason: "incorrect_code",
          attempts: nextAttempts,
          attemptsRemaining: Math.max(PHONE_VERIFICATION_MAX_ATTEMPTS - nextAttempts, 0),
        },
      });
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
    const nextAccount: AdminPanelAccount = {
      ...currentAccount,
      phoneVerified: true,
      phoneVerifiedAt: verifiedAt,
      phoneVerificationCodeHash: undefined,
      phoneVerificationExpiresAt: undefined,
      phoneVerificationAttempts: 0,
      updatedAt: verifiedAt,
    };
    upsertAccount(settings, nextAccount);
    const nextState: CatalogState = { ...state, adminPanelSettings: settings, updatedAt: verifiedAt };
    appendAdminSecurityEvent(nextState, nextAccount, {
      type: "phone_verified",
      severity: "low",
      deviceIdMasked: "admin_settings",
      message: `Phone number verified for ${nextAccount.email}.`,
      metadata: { role: nextAccount.role },
    });
    appendAdminAuditLog(nextState, nextAccount, {
      action: "account.phone_verified",
      targetType: "admin_panel_account",
      targetId: nextAccount.id,
      message: `Phone number verified for ${nextAccount.email}.`,
      metadata: { role: nextAccount.role },
    });
    await writeState(nextState);
    res.json({
      message: "Phone verified successfully.",
      account: publicAccount(nextAccount),
    });
  } catch (err) {
    next(err);
  }
});

router.post("/admin/settings/2fa/request", async (req, res, next) => {
  try {
    const actor = getAdminPanelActor(req);
    const enabled = Boolean(req.body?.enabled);
    const state = await readState();
    const settings = normalizeSettings(state.adminPanelSettings);
    const account = accountForActor(settings, actor);

    if (!account.phone) {
      res.status(400).json({ message: "Please add and verify your phone number first." });
      return;
    }

    const phone = normalizeEgyptPhone(account.phone);
    if (!phone) {
      res.status(400).json({ message: "Please add and verify your phone number first." });
      return;
    }

    if (!account.phoneVerified) {
      res.status(400).json({ message: "Please verify your phone number before enabling 2FA." });
      return;
    }

    let otp;
    try {
      otp = await sendPhoneOtp({ phone, purpose: "login_2fa" });
    } catch (error) {
      if (respondPhoneOtpError(res, error)) return;
      throw error;
    }

    const latestState = await readState();
    const latestSettings = normalizeSettings(latestState.adminPanelSettings);
    const latestAccount = accountForActor(latestSettings, actor);
    appendAdminSecurityEvent(latestState, latestAccount, {
      type: "two_factor_challenge_sent",
      severity: "medium",
      deviceIdMasked: "admin_settings",
      message: `Two-factor ${enabled ? "enable" : "disable"} confirmation code sent to ${maskPhone(phone)}.`,
      metadata: { action: enabled ? "enable" : "disable", purpose: "login_2fa" },
    });
    latestState.updatedAt = new Date().toISOString();
    await writeState(latestState);

    res.json({
      message: enabled
        ? "Enter the SMS code to enable two-factor authentication."
        : "Enter the SMS code to disable two-factor authentication.",
      enabled,
      expiresAt: otp.expiresAt,
      expiresIn: otp.expiresIn,
      maskedPhone: maskPhone(phone),
      devCode: otp.devCode,
    });
  } catch (err) {
    next(err);
  }
});

router.post("/admin/settings/2fa/confirm", async (req, res, next) => {
  try {
    const actor = getAdminPanelActor(req);
    const enabled = Boolean(req.body?.enabled);
    const code = typeof req.body?.code === "string" ? req.body.code.trim() : "";

    if (!/^\d{6}$/.test(code)) {
      res.status(400).json({ message: "Enter the 6-digit two-factor code." });
      return;
    }

    const state = await readState();
    const settings = normalizeSettings(state.adminPanelSettings);
    const account = accountForActor(settings, actor);

    if (!account.phone) {
      res.status(400).json({ message: "Please add and verify your phone number first." });
      return;
    }

    const phone = normalizeEgyptPhone(account.phone);
    if (!phone) {
      res.status(400).json({ message: "Please add and verify your phone number first." });
      return;
    }

    if (!account.phoneVerified) {
      res.status(400).json({ message: "Please verify your phone number before enabling 2FA." });
      return;
    }

    try {
      await verifyPhoneOtp({ phone, purpose: "login_2fa", code });
    } catch (error) {
      const latestState = await readState();
      const latestSettings = normalizeSettings(latestState.adminPanelSettings);
      const latestAccount = accountForActor(latestSettings, actor);
      appendAdminSecurityEvent(latestState, latestAccount, {
        type: "two_factor_failed",
        severity: "medium",
        deviceIdMasked: "admin_settings",
        message: `Two-factor ${enabled ? "enable" : "disable"} confirmation failed.`,
        metadata: { action: enabled ? "enable" : "disable" },
      });
      latestState.updatedAt = new Date().toISOString();
      await writeState(latestState);

      if (respondPhoneOtpError(res, error)) return;
      throw error;
    }

    const latestState = await readState();
    const latestSettings = normalizeSettings(latestState.adminPanelSettings);
    const latestAccount = accountForActor(latestSettings, actor);
    const now = new Date().toISOString();
    const nextAccount: AdminPanelAccount = {
      ...latestAccount,
      twoFactorEnabled: enabled,
      twoFactorEnabledAt: enabled ? now : latestAccount.twoFactorEnabledAt,
      twoFactorDisabledAt: enabled ? latestAccount.twoFactorDisabledAt : now,
      updatedAt: now,
    };
    upsertAccount(latestSettings, nextAccount);
    latestState.adminPanelSettings = latestSettings;

    appendAdminSecurityEvent(latestState, nextAccount, {
      type: enabled ? "two_factor_enabled" : "two_factor_disabled",
      severity: "low",
      deviceIdMasked: "admin_settings",
      message: `Two-factor authentication ${enabled ? "enabled" : "disabled"} for ${nextAccount.email}.`,
      metadata: { action: enabled ? "enable" : "disable", method: "sms" },
    });
    appendAdminAuditLog(latestState, nextAccount, {
      action: enabled ? "two_factor.enabled" : "two_factor.disabled",
      targetType: "admin_panel_account",
      targetId: nextAccount.id,
      message: `Two-factor authentication ${enabled ? "enabled" : "disabled"} for ${nextAccount.email}.`,
      metadata: { role: nextAccount.role, method: "sms" },
    });
    latestState.updatedAt = now;
    await writeState(latestState);

    res.json({
      message: enabled ? "Two-factor authentication enabled." : "Two-factor authentication disabled.",
      account: publicAccount(nextAccount),
    });
  } catch (err) {
    next(err);
  }
});

router.post("/admin/settings/2fa/disable-password", async (req, res, next) => {
  try {
    const actor = getAdminPanelActor(req);
    const password = typeof req.body?.password === "string" ? req.body.password : "";
    if (!password) {
      res.status(400).json({ message: "Password confirmation is required." });
      return;
    }

    const state = await readState();
    const settings = normalizeSettings(state.adminPanelSettings);
    const account = accountForActor(settings, actor);

    if (!verifyAccountPassword(account, password)) {
      appendAdminSecurityEvent(state, account, {
        type: "two_factor_failed",
        severity: "medium",
        deviceIdMasked: "admin_settings",
        message: "Two-factor disable password confirmation failed.",
        metadata: { action: "disable", reason: "invalid_password" },
      });
      state.updatedAt = new Date().toISOString();
      await writeState(state);
      res.status(401).json({ message: "Password confirmation failed." });
      return;
    }

    const now = new Date().toISOString();
    const nextAccount: AdminPanelAccount = {
      ...account,
      twoFactorEnabled: false,
      twoFactorDisabledAt: now,
      updatedAt: now,
    };
    upsertAccount(settings, nextAccount);
    state.adminPanelSettings = settings;
    appendAdminSecurityEvent(state, nextAccount, {
      type: "two_factor_disabled",
      severity: "low",
      deviceIdMasked: "admin_settings",
      message: `Two-factor authentication disabled for ${nextAccount.email}.`,
      metadata: { action: "disable", method: "password" },
    });
    appendAdminAuditLog(state, nextAccount, {
      action: "two_factor.disabled",
      targetType: "admin_panel_account",
      targetId: nextAccount.id,
      message: `Two-factor authentication disabled for ${nextAccount.email}.`,
      metadata: { role: nextAccount.role, method: "password" },
    });
    state.updatedAt = now;
    await writeState(state);

    res.json({
      message: "Two-factor authentication disabled.",
      account: publicAccount(nextAccount),
    });
  } catch (err) {
    next(err);
  }
});

export default router;
