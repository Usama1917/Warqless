/**
 * SECURITY EVENT SERVICE — MVP / DEMO ONLY
 *
 * Logs security events to AsyncStorage on the student device.
 * In production, ALL events must be sent to the backend immediately
 * so they are tamper-proof and visible to admins in real time.
 *
 * Production requirements:
 * - Server-side event ingestion endpoint (authenticated)
 * - Immutable append-only event log in DB
 * - Server-side device binding verification
 * - Real-time admin event stream
 * - Anomaly scoring & automatic suspension triggers
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

const EVENTS_KEY = "warqless_security_events";
const MAX_EVENTS  = 100; // keep last 100 on-device

// ── Types ─────────────────────────────────────────────────────────────────────

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
  | "suspicious_activity";

export type SecurityEventSeverity = "low" | "medium" | "high" | "critical";

export interface SecurityEvent {
  id: string;
  type: SecurityEventType;
  severity: SecurityEventSeverity;
  userId: string;
  userName: string;
  userEmail: string;
  bookId?: string;
  bookTitle?: string;
  deviceId: string;
  message: string;
  metadata?: Record<string, string>;
  createdAt: string;
}

type CreateEventInput = Omit<SecurityEvent, "id" | "createdAt">;

// ── Helpers ───────────────────────────────────────────────────────────────────

function maskDeviceId(id: string): string {
  if (id.length <= 8) return "••••••••";
  return id.slice(0, 4) + "••••••••" + id.slice(-4);
}

const SEVERITY_MAP: Record<SecurityEventType, SecurityEventSeverity> = {
  device_registered:       "low",
  device_verified:         "low",
  device_blocked:          "critical",
  device_reset_requested:  "medium",
  device_reset_approved:   "low",
  device_reset_rejected:   "medium",
  reader_opened:           "low",
  reader_access_denied:    "high",
  license_check_failed:    "high",
  screenshot_attempt:      "critical",
  suspicious_activity:     "critical",
};

// ── Core API ──────────────────────────────────────────────────────────────────

/**
 * Log a new security event. Appends to the on-device queue.
 * In production: POST to /api/security/events with auth token.
 */
export async function logSecurityEvent(input: CreateEventInput): Promise<void> {
  try {
    const event: SecurityEvent = {
      ...input,
      id: "evt-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6),
      deviceId: maskDeviceId(input.deviceId),
      severity: input.severity ?? SEVERITY_MAP[input.type] ?? "low",
      createdAt: new Date().toISOString(),
    };

    const raw = await AsyncStorage.getItem(EVENTS_KEY);
    const events: SecurityEvent[] = raw ? JSON.parse(raw) : [];
    events.unshift(event); // newest first
    if (events.length > MAX_EVENTS) events.splice(MAX_EVENTS);
    await AsyncStorage.setItem(EVENTS_KEY, JSON.stringify(events));
  } catch {
    // Never throw — event logging must be non-blocking
  }
}

/** Retrieve all logged events (newest first). */
export async function getSecurityEvents(): Promise<SecurityEvent[]> {
  try {
    const raw = await AsyncStorage.getItem(EVENTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/** Filter events for a specific user. */
export async function getUserSecurityEvents(userId: string): Promise<SecurityEvent[]> {
  const all = await getSecurityEvents();
  return all.filter((e) => e.userId === userId);
}

/** Basic stats summary. */
export async function getSecurityEventStats() {
  const events = await getSecurityEvents();
  return {
    total:           events.length,
    deviceBlocked:   events.filter((e) => e.type === "device_blocked").length,
    accessDenied:    events.filter((e) => e.type === "reader_access_denied").length,
    screenshotAttempts: events.filter((e) => e.type === "screenshot_attempt").length,
    criticalCount:   events.filter((e) => e.severity === "critical").length,
  };
}

/** Clear all events (dev/testing only). */
export async function clearSecurityEvents(): Promise<void> {
  await AsyncStorage.removeItem(EVENTS_KEY);
}
