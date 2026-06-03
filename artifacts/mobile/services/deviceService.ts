/**
 * DEVICE SERVICE — MVP / DEMO ONLY
 *
 * This creates a lightweight device fingerprint using a UUID stored in
 * AsyncStorage. On first run, a random UUID is generated and stored as the
 * device's permanent identifier.
 *
 * Current backend integration stores/verifies this generated ID server-side.
 *
 * LIMITATIONS — must be replaced in production with:
 *   - Signed device tokens with short TTL
 *   - Platform-level identifiers (Android ANDROID_ID, iOS identifierForVendor)
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

const DEVICE_ID_KEY = "warqless_device_id";
const DEVICE_REGISTERED_AT_KEY = "warqless_device_registered_at";
const PRIMARY_DEVICE_PREFIX = "warqless_primary_device_";

function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Returns a stable device ID for this installation.
 * Persists in AsyncStorage; same ID survives app restarts.
 */
export async function getCurrentDeviceId(): Promise<string> {
  try {
    const stored = await AsyncStorage.getItem(DEVICE_ID_KEY);
    if (stored) return stored;
    const newId = generateUUID();
    await AsyncStorage.setItem(DEVICE_ID_KEY, newId);
    return newId;
  } catch {
    return "fallback-device-id";
  }
}

export async function getDeviceRegisteredAt(): Promise<string> {
  try {
    const stored = await AsyncStorage.getItem(DEVICE_REGISTERED_AT_KEY);
    if (stored) return stored;
    const createdAt = new Date().toISOString();
    await AsyncStorage.setItem(DEVICE_REGISTERED_AT_KEY, createdAt);
    return createdAt;
  } catch {
    return new Date().toISOString();
  }
}

/** @deprecated Device binding is now handled by the backend verification API. */
export async function registerPrimaryDevice(userId: string): Promise<void> {
  const deviceId = await getCurrentDeviceId();
  await AsyncStorage.setItem(`${PRIMARY_DEVICE_PREFIX}${userId}`, deviceId);
}

/** @deprecated Device binding is now handled by the backend verification API. */
export async function getPrimaryDeviceId(userId: string): Promise<string | null> {
  return AsyncStorage.getItem(`${PRIMARY_DEVICE_PREFIX}${userId}`);
}

export type DeviceCheckResult =
  | { allowed: true }
  | { allowed: false; reason: "different_device" | "no_device" };

/** @deprecated Use verifyStudentDevice from catalogService instead. */
export async function verifyPrimaryDevice(userId: string): Promise<DeviceCheckResult> {
  const currentId = await getCurrentDeviceId();
  const primaryId = await getPrimaryDeviceId(userId);

  if (!primaryId) {
    // No device registered yet — register this one
    await registerPrimaryDevice(userId);
    return { allowed: true };
  }

  if (currentId === primaryId) return { allowed: true };

  // Different device
  return { allowed: false, reason: "different_device" };
}

/**
 * Clear the primary device registration for a user.
 * In production this MUST require admin/support approval.
 */
export async function clearPrimaryDevice(userId: string): Promise<void> {
  await AsyncStorage.removeItem(`${PRIMARY_DEVICE_PREFIX}${userId}`);
}
