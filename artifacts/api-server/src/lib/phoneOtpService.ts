import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  PHONE_VERIFICATION_MAX_ATTEMPTS,
  PHONE_VERIFICATION_TTL_MINUTES,
  createPhoneVerificationCode,
  createPhoneVerificationHash,
  normalizeEgyptPhone,
  shouldExposeDevPhoneOtp,
  verifyPhoneVerificationCode,
} from "./phoneVerification";
import { sendSms, type SmsPurpose } from "./smsService";

export type PhoneOtpPurpose = SmsPurpose;

type PhoneOtpRecord = {
  id: string;
  phone: string;
  purpose: PhoneOtpPurpose;
  codeHash: string;
  attempts: number;
  maxAttempts: number;
  expiresAt: string;
  lastSentAt: string;
  resendAvailableAt: string;
  consumedAt?: string;
  verifiedAt?: string;
  createdAt: string;
  updatedAt: string;
};

type StoredSecurityEvent = {
  id: string;
  type: string;
  severity: "low" | "medium" | "high" | "critical";
  deviceId: string;
  deviceIdMasked?: string;
  message: string;
  createdAt: string;
  metadata?: Record<string, string>;
};

type StoredAccount = {
  phone?: string;
  phoneVerified?: boolean;
  phoneVerifiedAt?: string;
  phoneVerificationCodeHash?: string;
  phoneVerificationExpiresAt?: string;
  phoneVerificationAttempts?: number;
};

type StoredStudent = StoredAccount & {
  id?: string;
  name?: string;
  email?: string;
  securityEvents?: StoredSecurityEvent[];
};

type CatalogState = {
  phoneOtpCodes?: PhoneOtpRecord[];
  students?: StoredStudent[];
  adminPanelSettings?: {
    accounts?: StoredAccount[];
  };
  updatedAt?: string;
  [key: string]: unknown;
};

type SendOtpResult = {
  success: true;
  phone: string;
  purpose: PhoneOtpPurpose;
  expiresIn: number;
  expiresAt: string;
  resendAvailableIn: number;
  devCode?: string;
};

type VerifyOtpResult = {
  success: true;
  phone: string;
  purpose: PhoneOtpPurpose;
  phoneVerified?: boolean;
};

export class PhoneOtpError extends Error {
  status: number;
  payload: Record<string, unknown>;

  constructor(status: number, message: string, payload: Record<string, unknown> = {}) {
    super(message);
    this.status = status;
    this.payload = payload;
  }
}

const DATA_FILE = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "data",
  "catalog.json",
);

const OTP_TTL_SECONDS = Number(process.env.PHONE_OTP_TTL_SECONDS ?? PHONE_VERIFICATION_TTL_MINUTES * 60);
const OTP_RESEND_COOLDOWN_SECONDS = Number(process.env.PHONE_OTP_RESEND_COOLDOWN_SECONDS ?? 60);
const OTP_MAX_ATTEMPTS = Number(process.env.PHONE_OTP_MAX_ATTEMPTS ?? PHONE_VERIFICATION_MAX_ATTEMPTS);

const OTP_PURPOSES: PhoneOtpPurpose[] = ["phone_verification", "login_2fa", "password_reset"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

function normalizePurpose(value: unknown): PhoneOtpPurpose | null {
  return OTP_PURPOSES.includes(value as PhoneOtpPurpose) ? value as PhoneOtpPurpose : null;
}

function parseDateMs(value?: string) {
  if (!value) return 0;
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
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

function normalizeOtpRecord(value: unknown): PhoneOtpRecord | null {
  if (!isRecord(value)) return null;
  const purpose = normalizePurpose(value.purpose);
  const phone = normalizeEgyptPhone(value.phone);
  if (
    !purpose ||
    !phone ||
    typeof value.id !== "string" ||
    typeof value.codeHash !== "string" ||
    typeof value.expiresAt !== "string" ||
    typeof value.lastSentAt !== "string" ||
    typeof value.resendAvailableAt !== "string" ||
    typeof value.createdAt !== "string" ||
    typeof value.updatedAt !== "string"
  ) {
    return null;
  }

  return {
    id: value.id,
    phone,
    purpose,
    codeHash: value.codeHash,
    attempts: typeof value.attempts === "number" ? value.attempts : 0,
    maxAttempts: typeof value.maxAttempts === "number" ? value.maxAttempts : OTP_MAX_ATTEMPTS,
    expiresAt: value.expiresAt,
    lastSentAt: value.lastSentAt,
    resendAvailableAt: value.resendAvailableAt,
    consumedAt: typeof value.consumedAt === "string" ? value.consumedAt : undefined,
    verifiedAt: typeof value.verifiedAt === "string" ? value.verifiedAt : undefined,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  };
}

function getOtpRecords(state: CatalogState) {
  return Array.isArray(state.phoneOtpCodes)
    ? state.phoneOtpCodes.map(normalizeOtpRecord).filter((record): record is PhoneOtpRecord => Boolean(record))
    : [];
}

function findActiveOtp(records: PhoneOtpRecord[], phone: string, purpose: PhoneOtpPurpose, nowMs: number) {
  return records
    .filter((record) =>
      record.phone === phone &&
      record.purpose === purpose &&
      !record.consumedAt &&
      parseDateMs(record.expiresAt) > nowMs
    )
    .sort((a, b) => parseDateMs(b.createdAt) - parseDateMs(a.createdAt))[0];
}

function sanitizePhoneOtpRecords(records: PhoneOtpRecord[], nowMs: number) {
  const thirtyDaysAgo = nowMs - 30 * 24 * 60 * 60 * 1000;
  return records.filter((record) => parseDateMs(record.createdAt) >= thirtyDaysAgo);
}

function messageForPurpose(purpose: PhoneOtpPurpose, code: string) {
  if (purpose === "login_2fa") return `Your Warqless login verification code is ${code}.`;
  if (purpose === "password_reset") return `Your Warqless password reset code is ${code}.`;
  return `Your Warqless phone verification code is ${code}.`;
}

function markMatchingPhonesVerified(state: CatalogState, phone: string, verifiedAt: string) {
  let changed = false;

  if (Array.isArray(state.students)) {
    state.students = state.students.map((student) => {
      if (normalizeEgyptPhone(student.phone) !== phone) return student;
      changed = true;
      return {
        ...student,
        phone,
        phoneVerified: true,
        phoneVerifiedAt: verifiedAt,
        phoneVerificationCodeHash: undefined,
        phoneVerificationExpiresAt: undefined,
        phoneVerificationAttempts: 0,
      };
    });
  }

  const accounts = state.adminPanelSettings?.accounts;
  if (Array.isArray(accounts)) {
    state.adminPanelSettings = {
      ...state.adminPanelSettings,
      accounts: accounts.map((account) => {
        if (normalizeEgyptPhone(account.phone) !== phone) return account;
        changed = true;
        return {
          ...account,
          phone,
          phoneVerified: true,
          phoneVerifiedAt: verifiedAt,
          phoneVerificationCodeHash: undefined,
          phoneVerificationExpiresAt: undefined,
          phoneVerificationAttempts: 0,
        };
      }),
    };
  }

  return changed;
}

function createRepeatedFailureSecurityEvent(phone: string, purpose: PhoneOtpPurpose): StoredSecurityEvent {
  return {
    id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    type: "suspicious_activity",
    severity: "high",
    deviceId: "phone_otp",
    deviceIdMasked: "phone_otp",
    message: `Repeated failed phone OTP verification attempts for ${purpose}.`,
    metadata: { phone, purpose },
    createdAt: new Date().toISOString(),
  };
}

function appendRepeatedFailureEventIfPossible(state: CatalogState, phone: string, purpose: PhoneOtpPurpose) {
  if (!Array.isArray(state.students)) return false;

  let appended = false;
  const event = createRepeatedFailureSecurityEvent(phone, purpose);
  state.students = state.students.map((student) => {
    if (normalizeEgyptPhone(student.phone) !== phone) return student;
    appended = true;
    const events = Array.isArray(student.securityEvents) ? student.securityEvents : [];
    return {
      ...student,
      securityEvents: [event, ...events].slice(0, 100),
    };
  });

  return appended;
}

export function parsePhoneOtpPayload(body: unknown): { phone: string; purpose: PhoneOtpPurpose } {
  const raw = isRecord(body) ? body : {};
  const phone = normalizeEgyptPhone(raw.phone);
  const purpose = normalizePurpose(raw.purpose);

  if (!phone) {
    throw new PhoneOtpError(400, "Enter a valid Egyptian mobile phone number.", { success: false });
  }

  if (!purpose) {
    throw new PhoneOtpError(400, "Invalid OTP purpose.", { success: false });
  }

  return { phone, purpose };
}

export async function sendPhoneOtp(body: unknown): Promise<SendOtpResult> {
  const { phone, purpose } = parsePhoneOtpPayload(body);
  const state = await readState();
  const now = new Date();
  const nowMs = now.getTime();
  const nowIso = now.toISOString();
  const records = sanitizePhoneOtpRecords(getOtpRecords(state), nowMs);
  const active = findActiveOtp(records, phone, purpose, nowMs);

  if (active && parseDateMs(active.resendAvailableAt) > nowMs) {
    const retryAfter = Math.ceil((parseDateMs(active.resendAvailableAt) - nowMs) / 1000);
    throw new PhoneOtpError(429, "Please wait before requesting another code.", {
      success: false,
      retryAfter,
    });
  }

  const code = createPhoneVerificationCode();
  const expiresAt = new Date(nowMs + OTP_TTL_SECONDS * 1000).toISOString();
  const resendAvailableAt = new Date(nowMs + OTP_RESEND_COOLDOWN_SECONDS * 1000).toISOString();
  const nextRecord: PhoneOtpRecord = {
    id: `otp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    phone,
    purpose,
    codeHash: createPhoneVerificationHash(code),
    attempts: 0,
    maxAttempts: OTP_MAX_ATTEMPTS,
    expiresAt,
    lastSentAt: nowIso,
    resendAvailableAt,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  const nextRecords = [
    nextRecord,
    ...records.map((record) =>
      record.phone === phone && record.purpose === purpose && !record.consumedAt
        ? { ...record, consumedAt: nowIso, updatedAt: nowIso }
        : record
    ),
  ];

  await sendSms({
    to: phone,
    purpose,
    code,
    body: messageForPurpose(purpose, code),
  });

  state.phoneOtpCodes = nextRecords;
  state.updatedAt = nowIso;
  await writeState(state);

  return {
    success: true,
    phone,
    purpose,
    expiresIn: OTP_TTL_SECONDS,
    expiresAt,
    resendAvailableIn: OTP_RESEND_COOLDOWN_SECONDS,
    devCode: shouldExposeDevPhoneOtp() ? code : undefined,
  };
}

export async function verifyPhoneOtp(body: unknown): Promise<VerifyOtpResult> {
  const { phone, purpose } = parsePhoneOtpPayload(body);
  const raw = isRecord(body) ? body : {};
  const code = typeof raw.code === "string" ? raw.code.trim() : "";

  if (!/^\d{6}$/.test(code)) {
    throw new PhoneOtpError(400, "Enter the 6-digit verification code.", { success: false });
  }

  const state = await readState();
  const now = new Date();
  const nowMs = now.getTime();
  const nowIso = now.toISOString();
  const records = sanitizePhoneOtpRecords(getOtpRecords(state), nowMs);
  const active = findActiveOtp(records, phone, purpose, nowMs);

  if (!active) {
    throw new PhoneOtpError(400, "No active verification code found. Request a new code.", { success: false });
  }

  if (active.attempts >= active.maxAttempts) {
    appendRepeatedFailureEventIfPossible(state, phone, purpose);
    state.phoneOtpCodes = records;
    state.updatedAt = nowIso;
    await writeState(state);
    throw new PhoneOtpError(429, "Too many verification attempts. Request a new code.", { success: false });
  }

  if (!verifyPhoneVerificationCode(code, active.codeHash)) {
    const nextAttempts = active.attempts + 1;
    const tooManyAttempts = nextAttempts >= active.maxAttempts;
    const nextRecords = records.map((record) =>
      record.id === active.id
        ? { ...record, attempts: nextAttempts, updatedAt: nowIso }
        : record
    );

    state.phoneOtpCodes = nextRecords;
    if (tooManyAttempts) {
      appendRepeatedFailureEventIfPossible(state, phone, purpose);
    }
    state.updatedAt = nowIso;
    await writeState(state);

    throw new PhoneOtpError(tooManyAttempts ? 429 : 400, tooManyAttempts
      ? "Too many verification attempts. Request a new code."
      : "Incorrect verification code.", {
      success: false,
      attemptsRemaining: Math.max(active.maxAttempts - nextAttempts, 0),
    });
  }

  state.phoneOtpCodes = records.map((record) =>
    record.id === active.id
      ? { ...record, consumedAt: nowIso, verifiedAt: nowIso, updatedAt: nowIso }
      : record
  );

  const phoneVerified = purpose === "phone_verification"
    ? markMatchingPhonesVerified(state, phone, nowIso) || true
    : undefined;

  state.updatedAt = nowIso;
  await writeState(state);

  return {
    success: true,
    phone,
    purpose,
    phoneVerified,
  };
}
