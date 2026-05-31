/**
 * Mock security data for the Warqless Admin Dashboard.
 *
 * In production:
 * - Events come from the backend security event log (server-side, tamper-proof)
 * - Device reset requests are stored in the database
 * - Admin actions trigger real backend operations
 *
 * For this MVP demo, all data is local to the admin package.
 * The student app logs events to its own AsyncStorage separately.
 */

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

export type SecuritySeverity = "low" | "medium" | "high" | "critical";

export interface SecurityEvent {
  id: string;
  type: SecurityEventType;
  severity: SecuritySeverity;
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

export type DeviceResetStatus = "pending" | "approved" | "rejected";

export interface DeviceResetRequest {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  deviceId: string;
  reason: string;
  status: DeviceResetStatus;
  createdAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const LABEL: Record<SecurityEventType, string> = {
  device_registered:      "Device Registered",
  device_verified:        "Device Verified",
  device_blocked:         "Device Blocked",
  device_reset_requested: "Reset Requested",
  device_reset_approved:  "Reset Approved",
  device_reset_rejected:  "Reset Rejected",
  reader_opened:          "Reader Opened",
  reader_access_denied:   "Access Denied",
  license_check_failed:   "License Failed",
  screenshot_attempt:     "Screenshot Attempt",
  suspicious_activity:    "Suspicious Activity",
};

export function getEventLabel(type: SecurityEventType): string {
  return LABEL[type] ?? type;
}

export function getSeverityColor(severity: SecuritySeverity): string {
  return {
    low:      "bg-slate-100 text-slate-700",
    medium:   "bg-amber-100 text-amber-700",
    high:     "bg-orange-100 text-orange-700",
    critical: "bg-red-100 text-red-700",
  }[severity];
}

export function getEventTypeColor(type: SecurityEventType): string {
  const critical = ["device_blocked", "screenshot_attempt", "suspicious_activity"];
  const high     = ["reader_access_denied", "license_check_failed"];
  const medium   = ["device_reset_requested", "device_reset_rejected"];
  if (critical.includes(type)) return "bg-red-50 text-red-700 border-red-200";
  if (high.includes(type))     return "bg-orange-50 text-orange-700 border-orange-200";
  if (medium.includes(type))   return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-blue-50 text-blue-700 border-blue-200";
}

// ── Mock Security Events ──────────────────────────────────────────────────────

export let SECURITY_EVENTS: SecurityEvent[] = [
  {
    id: "evt-001",
    type: "device_blocked",
    severity: "critical",
    userId: "u2",
    userName: "Ahmed Hassan",
    userEmail: "ahmed.h@example.com",
    deviceId: "f3a1••••••••9b2e",
    message: "Login attempt from unregistered device. Account is bound to a different device.",
    metadata: { blockedDeviceId: "f3a1••••••••9b2e", registeredDeviceId: "bee4••••••••11cd" },
    createdAt: "2026-05-31T09:14:22Z",
  },
  {
    id: "evt-002",
    type: "screenshot_attempt",
    severity: "critical",
    userId: "u1",
    userName: "Sara Mohamed",
    userEmail: "sara.m@example.com",
    bookId: "1",
    bookTitle: "Mathematics Mastery — Final Revision",
    deviceId: "dee2••••••••34e3",
    message: "Screen capture attempt detected while reading protected content.",
    metadata: { page: "47", readingMode: "sepia" },
    createdAt: "2026-05-31T08:55:10Z",
  },
  {
    id: "evt-003",
    type: "reader_access_denied",
    severity: "high",
    userId: "u3",
    userName: "Nour El-Din",
    userEmail: "nour.d@example.com",
    bookId: "5",
    bookTitle: "Physics Deep Dive — Mechanics",
    deviceId: "a1c3••••••••77f0",
    message: "Reader access denied. Book not purchased or borrowed by this student.",
    createdAt: "2026-05-31T08:33:04Z",
  },
  {
    id: "evt-004",
    type: "device_reset_requested",
    severity: "medium",
    userId: "u4",
    userName: "Mariam Khalil",
    userEmail: "mariam.k@example.com",
    deviceId: "cc8d••••••••52a1",
    message: "Student submitted a device change request. Reason: lost phone, bought new one.",
    metadata: { requestId: "req-001", reason: "I lost my old phone and bought a new one." },
    createdAt: "2026-05-31T08:10:47Z",
  },
  {
    id: "evt-005",
    type: "suspicious_activity",
    severity: "critical",
    userId: "u2",
    userName: "Ahmed Hassan",
    userEmail: "ahmed.h@example.com",
    deviceId: "f3a1••••••••9b2e",
    message: "3 consecutive login attempts from blocked devices within 10 minutes. Possible account sharing.",
    metadata: { blockedAttempts: "3", windowMinutes: "10" },
    createdAt: "2026-05-31T07:58:30Z",
  },
  {
    id: "evt-006",
    type: "reader_opened",
    severity: "low",
    userId: "u1",
    userName: "Sara Mohamed",
    userEmail: "sara.m@example.com",
    bookId: "1",
    bookTitle: "Mathematics Mastery — Final Revision",
    deviceId: "dee2••••••••34e3",
    message: "Reader opened for licensed book. Access verified.",
    metadata: { licenseId: "LIC-1001", page: "231" },
    createdAt: "2026-05-31T07:45:00Z",
  },
  {
    id: "evt-007",
    type: "license_check_failed",
    severity: "high",
    userId: "u5",
    userName: "Omar Farouk",
    userEmail: "omar.f@example.com",
    bookId: "3",
    bookTitle: "English Literature — Complete Guide",
    deviceId: "91b2••••••••c4d5",
    message: "License verification failed. Could not confirm book ownership.",
    metadata: { bookId: "3", error: "license_not_found" },
    createdAt: "2026-05-30T22:11:33Z",
  },
  {
    id: "evt-008",
    type: "device_verified",
    severity: "low",
    userId: "u1",
    userName: "Sara Mohamed",
    userEmail: "sara.m@example.com",
    deviceId: "dee2••••••••34e3",
    message: "Login from registered primary device. Access granted.",
    createdAt: "2026-05-30T20:30:15Z",
  },
  {
    id: "evt-009",
    type: "reader_access_denied",
    severity: "high",
    userId: "u6",
    userName: "Layla Mahmoud",
    userEmail: "layla.m@example.com",
    bookId: "7",
    bookTitle: "Biology Mastery — Grade 11",
    deviceId: "3e8f••••••••0a91",
    message: "Reader access denied. Book is currently lent out by the owner.",
    metadata: { borrowerId: "u8", dueAt: "2026-06-05" },
    createdAt: "2026-05-30T19:05:55Z",
  },
  {
    id: "evt-010",
    type: "device_reset_requested",
    severity: "medium",
    userId: "u7",
    userName: "Youssef Adel",
    userEmail: "youssef.a@example.com",
    deviceId: "7d44••••••••8b12",
    message: "Student submitted a device change request. Reason: device sent to repair.",
    metadata: { requestId: "req-002", reason: "My phone is at the repair shop for 2 weeks." },
    createdAt: "2026-05-29T14:22:00Z",
  },
  {
    id: "evt-011",
    type: "device_reset_approved",
    severity: "low",
    userId: "u9",
    userName: "Hana Ibrahim",
    userEmail: "hana.i@example.com",
    deviceId: "5c01••••••••e23a",
    message: "Admin approved device reset request. Student can register a new device on next login.",
    metadata: { requestId: "req-003", approvedBy: "admin@warqless.com" },
    createdAt: "2026-05-29T11:00:00Z",
  },
  {
    id: "evt-012",
    type: "device_registered",
    severity: "low",
    userId: "u10",
    userName: "Khaled Nasser",
    userEmail: "khaled.n@example.com",
    deviceId: "aa21••••••••6f88",
    message: "First login. Device registered as primary device for account.",
    createdAt: "2026-05-28T16:40:20Z",
  },
  {
    id: "evt-013",
    type: "screenshot_attempt",
    severity: "critical",
    userId: "u3",
    userName: "Nour El-Din",
    userEmail: "nour.d@example.com",
    bookId: "2",
    bookTitle: "Chemistry Question Bank — All Chapters",
    deviceId: "a1c3••••••••77f0",
    message: "Screen capture attempt blocked. Content protection active.",
    metadata: { page: "12", readingMode: "light" },
    createdAt: "2026-05-28T14:15:44Z",
  },
  {
    id: "evt-014",
    type: "device_blocked",
    severity: "critical",
    userId: "u4",
    userName: "Mariam Khalil",
    userEmail: "mariam.k@example.com",
    deviceId: "new9••••••••0011",
    message: "Login blocked. Account already bound to a different physical device.",
    createdAt: "2026-05-27T10:05:00Z",
  },
  {
    id: "evt-015",
    type: "reader_opened",
    severity: "low",
    userId: "u6",
    userName: "Layla Mahmoud",
    userEmail: "layla.m@example.com",
    bookId: "4",
    bookTitle: "Arabic Language — Advanced Level",
    deviceId: "3e8f••••••••0a91",
    message: "Reader opened successfully. License and device verified.",
    metadata: { licenseId: "LIC-1044", page: "1" },
    createdAt: "2026-05-27T09:00:00Z",
  },
  {
    id: "evt-016",
    type: "device_reset_rejected",
    severity: "medium",
    userId: "u11",
    userName: "Dina Samir",
    userEmail: "dina.s@example.com",
    deviceId: "88cc••••••••1230",
    message: "Admin rejected device reset request. Reason: insufficient justification.",
    metadata: { requestId: "req-004", rejectedBy: "admin@warqless.com" },
    createdAt: "2026-05-26T15:30:00Z",
  },
  {
    id: "evt-017",
    type: "license_check_failed",
    severity: "high",
    userId: "u12",
    userName: "Tamer Hosny",
    userEmail: "tamer.h@example.com",
    bookId: "6",
    bookTitle: "Computer Science Modern Bundle",
    deviceId: "2b77••••••••4e90",
    message: "License validation failed. Book access expired or revoked.",
    createdAt: "2026-05-26T13:20:00Z",
  },
  {
    id: "evt-018",
    type: "device_verified",
    severity: "low",
    userId: "u5",
    userName: "Omar Farouk",
    userEmail: "omar.f@example.com",
    deviceId: "91b2••••••••c4d5",
    message: "Returning login from registered device. Session restored.",
    createdAt: "2026-05-25T08:00:00Z",
  },
  {
    id: "evt-019",
    type: "reader_access_denied",
    severity: "high",
    userId: "u2",
    userName: "Ahmed Hassan",
    userEmail: "ahmed.h@example.com",
    bookId: "9",
    bookTitle: "History and Geography — Complete",
    deviceId: "bee4••••••••11cd",
    message: "Reader access denied. Book not in student's library.",
    createdAt: "2026-05-24T17:45:00Z",
  },
  {
    id: "evt-020",
    type: "suspicious_activity",
    severity: "critical",
    userId: "u13",
    userName: "Ramy Wael",
    userEmail: "ramy.w@example.com",
    deviceId: "d9f0••••••••3c21",
    message: "5 reader access denial events in 30 minutes. Possible probing for unlicensed content.",
    metadata: { denialCount: "5", windowMinutes: "30" },
    createdAt: "2026-05-24T16:00:00Z",
  },
];

// ── Mock Device Reset Requests ─────────────────────────────────────────────────

export let DEVICE_RESET_REQUESTS: DeviceResetRequest[] = [
  {
    id: "req-001",
    userId: "u4",
    userName: "Mariam Khalil",
    userEmail: "mariam.k@example.com",
    deviceId: "cc8d••••••••52a1",
    reason: "I lost my old phone and bought a new one. I need to link my account to the new device to access my books.",
    status: "pending",
    createdAt: "2026-05-31T08:10:47Z",
  },
  {
    id: "req-002",
    userId: "u7",
    userName: "Youssef Adel",
    userEmail: "youssef.a@example.com",
    deviceId: "7d44••••••••8b12",
    reason: "My phone is at the repair shop for 2 weeks. I need to use a temporary device to continue my studies.",
    status: "pending",
    createdAt: "2026-05-29T14:22:00Z",
  },
  {
    id: "req-003",
    userId: "u9",
    userName: "Hana Ibrahim",
    userEmail: "hana.i@example.com",
    deviceId: "5c01••••••••e23a",
    reason: "Phone was stolen. Police report filed. I need to access my books on a new device.",
    status: "approved",
    createdAt: "2026-05-28T09:00:00Z",
    resolvedAt: "2026-05-29T11:00:00Z",
    resolvedBy: "Admin",
  },
  {
    id: "req-004",
    userId: "u11",
    userName: "Dina Samir",
    userEmail: "dina.s@example.com",
    deviceId: "88cc••••••••1230",
    reason: "I want to use a different phone.",
    status: "rejected",
    createdAt: "2026-05-25T12:00:00Z",
    resolvedAt: "2026-05-26T15:30:00Z",
    resolvedBy: "Admin",
  },
];

// ── Computed stats ────────────────────────────────────────────────────────────

export function getSecurityStats() {
  return {
    totalEvents:       SECURITY_EVENTS.length,
    deviceBlocked:     SECURITY_EVENTS.filter((e) => e.type === "device_blocked").length,
    accessDenied:      SECURITY_EVENTS.filter((e) => e.type === "reader_access_denied").length,
    screenshotAttempts: SECURITY_EVENTS.filter((e) => e.type === "screenshot_attempt").length,
    pendingResets:     DEVICE_RESET_REQUESTS.filter((r) => r.status === "pending").length,
    criticalEvents:    SECURITY_EVENTS.filter((e) => e.severity === "critical").length,
  };
}

// ── Admin actions (mock — update local state) ─────────────────────────────────

export function approveDeviceReset(requestId: string, adminEmail: string): boolean {
  const req = DEVICE_RESET_REQUESTS.find((r) => r.id === requestId);
  if (!req || req.status !== "pending") return false;
  req.status = "approved";
  req.resolvedAt = new Date().toISOString();
  req.resolvedBy = adminEmail;

  SECURITY_EVENTS.unshift({
    id: "evt-" + Date.now(),
    type: "device_reset_approved",
    severity: "low",
    userId: req.userId,
    userName: req.userName,
    userEmail: req.userEmail,
    deviceId: req.deviceId,
    message: `Admin approved device reset request for ${req.userName}. Student can register new device on next login.`,
    metadata: { requestId: req.id, approvedBy: adminEmail },
    createdAt: new Date().toISOString(),
  });
  return true;
}

export function rejectDeviceReset(requestId: string, adminEmail: string): boolean {
  const req = DEVICE_RESET_REQUESTS.find((r) => r.id === requestId);
  if (!req || req.status !== "pending") return false;
  req.status = "rejected";
  req.resolvedAt = new Date().toISOString();
  req.resolvedBy = adminEmail;

  SECURITY_EVENTS.unshift({
    id: "evt-" + Date.now(),
    type: "device_reset_rejected",
    severity: "medium",
    userId: req.userId,
    userName: req.userName,
    userEmail: req.userEmail,
    deviceId: req.deviceId,
    message: `Admin rejected device reset request for ${req.userName}.`,
    metadata: { requestId: req.id, rejectedBy: adminEmail },
    createdAt: new Date().toISOString(),
  });
  return true;
}
