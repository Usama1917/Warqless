/**
 * LICENSE & ACCESS SERVICE — MVP / DEMO ONLY
 *
 * Provides placeholder functions for:
 *   - Online connectivity check
 *   - Book license verification
 *   - Reader access guard
 *
 * PRODUCTION REQUIREMENTS (not yet implemented):
 *   - Real server-side license tokens with expiry
 *   - Signed, short-lived streaming URLs per page
 *   - Server verification on every book open
 *   - Revocation support for refunds/disputes
 *   - Secure session management
 */

import { Platform } from "react-native";

export type OnlineCheckResult =
  | { online: true }
  | { online: false; message: string };

/**
 * Verify the app has an active internet connection.
 * Uses navigator.onLine on web, fetch-based probe on native.
 */
export async function verifyOnlineAccess(): Promise<OnlineCheckResult> {
  try {
    if (Platform.OS === "web") {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        return { online: false, message: "offline" };
      }
      return { online: true };
    }
    // Native: attempt a lightweight HEAD request to a reliable endpoint
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    try {
      const res = await fetch("https://dns.google/resolve?name=warqless.com&type=A", {
        method: "GET",
        signal: controller.signal,
      });
      clearTimeout(timeout);
      return res.ok ? { online: true } : { online: false, message: "offline" };
    } catch {
      clearTimeout(timeout);
      return { online: false, message: "offline" };
    }
  } catch {
    return { online: false, message: "offline" };
  }
}

export type LicenseCheckResult =
  | { valid: true }
  | { valid: false; reason: "not_purchased" | "expired" | "device_mismatch" };

/**
 * Verify a student holds a valid license for a book.
 * MVP: checks local purchasedBooks state.
 *
 * Production: this should call the API with a signed session token
 * and return a short-lived, server-signed page access token.
 */
export function verifyBookLicense(
  bookId: string,
  purchasedBookIds: string[],
): LicenseCheckResult {
  const isPurchased = purchasedBookIds.includes(bookId);

  if (!isPurchased) {
    return { valid: false, reason: "not_purchased" };
  }

  return { valid: true };
}
