import { randomBytes, randomInt, scryptSync, timingSafeEqual } from "node:crypto";

export const PHONE_VERIFICATION_TTL_MINUTES = 10;
export const PHONE_VERIFICATION_MAX_ATTEMPTS = 5;

const EGYPT_MOBILE_RE = /^\+20(10|11|12|15)\d{8}$/;

export function normalizeEgyptPhone(value: unknown): string | null {
  if (typeof value !== "string") return null;

  let compact = value.trim().replace(/[\s().-]/g, "");
  if (!compact) return null;

  if (compact.startsWith("00")) compact = `+${compact.slice(2)}`;

  if (/^(010|011|012|015)\d{8}$/.test(compact)) {
    compact = `+2${compact}`;
  } else if (/^20(10|11|12|15)\d{8}$/.test(compact)) {
    compact = `+${compact}`;
  }

  return EGYPT_MOBILE_RE.test(compact) ? compact : null;
}

export function createPhoneVerificationCode() {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

export function createPhoneVerificationHash(code: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(code, salt, 64).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

export function verifyPhoneVerificationCode(code: string, storedHash: string): boolean {
  const [scheme, salt, hash] = storedHash.split(":");
  if (scheme !== "scrypt" || !salt || !hash) return false;

  const expected = Buffer.from(hash, "hex");
  const actual = scryptSync(code, salt, expected.length);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function getPhoneVerificationExpiresAt() {
  return new Date(Date.now() + PHONE_VERIFICATION_TTL_MINUTES * 60 * 1000).toISOString();
}

export function shouldExposeDevPhoneOtp() {
  return process.env.NODE_ENV !== "production";
}

export function logDevPhoneOtp(accountType: string, accountId: string, phone: string, code: string) {
  if (!shouldExposeDevPhoneOtp()) return;
  console.info(`[dev-only] ${accountType} ${accountId} phone OTP for ${phone}: ${code}`);
}
