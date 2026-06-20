import { Router, type IRouter } from "express";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getAdminActor, requireAdmin } from "../middlewares/adminAuth";
import { runExclusive } from "../lib/stateMutex";

type SecuritySeverity = "low" | "medium" | "high" | "critical";
type DeviceResetStatus = "pending" | "approved" | "rejected";
type DeviceStatus = "active" | "blocked" | "pending_reset" | "removed";

type StoredSecurityEvent = {
  id: string;
  type: string;
  severity: SecuritySeverity;
  deviceId?: string;
  deviceIdMasked?: string;
  message: string;
  metadata?: Record<string, unknown>;
  reviewed?: boolean;
  reviewedAt?: string;
  reviewedByAdminId?: string;
  createdAt: string;
};

type StoredAdminSecurityEvent = StoredSecurityEvent & {
  userId: string;
  userName: string;
  userEmail: string;
};

type StoredDevice = {
  deviceId: string;
  maskedDeviceId?: string;
  deviceName?: string;
  platform?: string;
  appVersion?: string;
  status?: DeviceStatus;
  isPrimary?: boolean;
  registeredAt?: string;
  lastVerifiedAt?: string;
};

type StoredDeviceResetRequest = {
  id: string;
  deviceId?: string;
  currentDeviceId?: string;
  requestedDeviceId?: string;
  reason: string;
  status: DeviceResetStatus;
  createdAt: string;
  requestedAt?: string;
  resolvedAt?: string;
  resolvedByAdminId?: string;
  adminNote?: string;
  updatedAt?: string;
};

type StoredStudent = {
  id: string;
  name: string;
  email: string;
  currentDevice?: StoredDevice;
  deviceHistory?: StoredDevice[];
  deviceChangeRequests?: StoredDeviceResetRequest[];
  securityEvents?: StoredSecurityEvent[];
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
  adminBooks?: unknown[];
  orders?: unknown[];
  students?: StoredStudent[];
  adminSecurityEvents?: StoredAdminSecurityEvent[];
  adminAuditLogs?: AdminAuditLog[];
  updatedAt?: string;
  [key: string]: unknown;
};

type SecurityEventResponse = {
  id: string;
  type: string;
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

type DeviceResetRequestResponse = {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  currentDeviceId: string;
  requestedDeviceId?: string;
  reason: string;
  status: DeviceResetStatus;
  requestedAt: string;
  resolvedAt?: string;
  resolvedByAdminId?: string;
  adminNote?: string;
  createdAt: string;
  updatedAt?: string;
};

const DATA_FILE = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "data",
  "catalog.json",
);

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizePage(value: unknown) {
  const page = Number(value);
  return Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
}

function normalizeLimit(value: unknown) {
  const limit = Number(value);
  if (!Number.isFinite(limit) || limit <= 0) return DEFAULT_LIMIT;
  return Math.min(Math.floor(limit), MAX_LIMIT);
}

function paginate<T>(items: T[], page: number, limit: number) {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const start = (page - 1) * limit;
  return {
    items: items.slice(start, start + limit),
    page,
    limit,
    total,
    totalPages,
  };
}

function parseOptionalDate(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parseOptionalBoolean(value: unknown) {
  if (value === "true") return true;
  if (value === "false") return false;
  return null;
}

function eventTimestamp(event: SecurityEventResponse) {
  const time = new Date(event.createdAt).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function requestTimestamp(request: DeviceResetRequestResponse) {
  const time = new Date(request.requestedAt).getTime();
  return Number.isNaN(time) ? 0 : time;
}

async function readState(): Promise<CatalogState> {
  try {
    const raw = await readFile(DATA_FILE, "utf8");
    const parsed = JSON.parse(raw) as CatalogState;
    return {
      ...parsed,
      students: Array.isArray(parsed.students) ? parsed.students : [],
      adminSecurityEvents: Array.isArray(parsed.adminSecurityEvents) ? parsed.adminSecurityEvents : [],
      adminAuditLogs: Array.isArray(parsed.adminAuditLogs) ? parsed.adminAuditLogs : [],
    };
  } catch {
    return {
      adminBooks: [],
      orders: [],
      students: [],
      adminSecurityEvents: [],
      adminAuditLogs: [],
      updatedAt: new Date().toISOString(),
    };
  }
}

async function writeState(state: CatalogState) {
  await mkdir(path.dirname(DATA_FILE), { recursive: true });
  await writeFile(DATA_FILE, JSON.stringify(state, null, 2));
}

function metadataString(value: Record<string, unknown> | undefined, key: string) {
  const item = value?.[key];
  return typeof item === "string" && item.trim() ? item : undefined;
}

function toSecurityEventResponse(student: StoredStudent, event: StoredSecurityEvent): SecurityEventResponse {
  return {
    id: event.id,
    type: event.type,
    severity: event.severity,
    userId: student.id,
    userName: student.name,
    userEmail: student.email,
    bookId: metadataString(event.metadata, "bookId"),
    bookTitle: metadataString(event.metadata, "bookTitle"),
    deviceIdMasked: event.deviceIdMasked ?? event.deviceId,
    message: event.message,
    metadata: event.metadata,
    reviewed: Boolean(event.reviewed),
    reviewedAt: event.reviewedAt,
    reviewedByAdminId: event.reviewedByAdminId,
    createdAt: event.createdAt,
  };
}

function toAdminSecurityEventResponse(event: StoredAdminSecurityEvent): SecurityEventResponse {
  return {
    id: event.id,
    type: event.type,
    severity: event.severity,
    userId: event.userId,
    userName: event.userName,
    userEmail: event.userEmail,
    bookId: metadataString(event.metadata, "bookId"),
    bookTitle: metadataString(event.metadata, "bookTitle"),
    deviceIdMasked: event.deviceIdMasked ?? event.deviceId,
    message: event.message,
    metadata: event.metadata,
    reviewed: Boolean(event.reviewed),
    reviewedAt: event.reviewedAt,
    reviewedByAdminId: event.reviewedByAdminId,
    createdAt: event.createdAt,
  };
}

function getSecurityEvents(state: CatalogState) {
  const studentEvents = (state.students ?? [])
    .flatMap((student) =>
      (student.securityEvents ?? [])
        .filter((event) => event.id && event.type && event.message && event.createdAt)
        .map((event) => toSecurityEventResponse(student, event)),
    );
  const adminEvents = (state.adminSecurityEvents ?? [])
    .filter((event) => event.id && event.type && event.message && event.createdAt)
    .map(toAdminSecurityEventResponse);

  return [...studentEvents, ...adminEvents].sort((a, b) => eventTimestamp(b) - eventTimestamp(a));
}

function maskDeviceId(id: string): string {
  if (id.length <= 8) return "********";
  return `${id.slice(0, 4)}********${id.slice(-4)}`;
}

function currentDeviceIdFor(student: StoredStudent, request: StoredDeviceResetRequest) {
  return request.currentDeviceId ?? request.deviceId ?? student.currentDevice?.deviceId ?? "unknown";
}

function toDeviceResetRequestResponse(
  student: StoredStudent,
  request: StoredDeviceResetRequest,
): DeviceResetRequestResponse {
  const requestedAt = request.requestedAt ?? request.createdAt;
  return {
    id: request.id,
    userId: student.id,
    userName: student.name,
    userEmail: student.email,
    currentDeviceId: maskDeviceId(currentDeviceIdFor(student, request)),
    requestedDeviceId: request.requestedDeviceId,
    reason: request.reason,
    status: request.status,
    requestedAt,
    resolvedAt: request.resolvedAt,
    resolvedByAdminId: request.resolvedByAdminId,
    adminNote: request.adminNote,
    createdAt: request.createdAt,
    updatedAt: request.updatedAt,
  };
}

function getDeviceResetRequests(state: CatalogState) {
  return (state.students ?? [])
    .flatMap((student) =>
      (student.deviceChangeRequests ?? [])
        .filter((request) => request.id && request.reason && request.status && request.createdAt)
        .map((request) => toDeviceResetRequestResponse(student, request)),
    )
    .sort((a, b) => requestTimestamp(b) - requestTimestamp(a));
}

function findStoredSecurityEvent(state: CatalogState, id: string) {
  for (const event of state.adminSecurityEvents ?? []) {
    if (event.id === id) return { kind: "admin" as const, event };
  }

  for (const student of state.students ?? []) {
    for (const event of student.securityEvents ?? []) {
      if (event.id === id) return { kind: "student" as const, student, event };
    }
  }
  return null;
}

function findStoredDeviceResetRequest(state: CatalogState, id: string) {
  for (const student of state.students ?? []) {
    for (const request of student.deviceChangeRequests ?? []) {
      if (request.id === id) return { student, request };
    }
  }
  return null;
}

function appendAuditLog(
  state: CatalogState,
  log: Omit<AdminAuditLog, "id" | "createdAt">,
) {
  const auditLog: AdminAuditLog = {
    ...log,
    id: createId("audit"),
    createdAt: new Date().toISOString(),
  };
  state.adminAuditLogs = [auditLog, ...(state.adminAuditLogs ?? [])];
}

function appendStudentSecurityEvent(student: StoredStudent, event: StoredSecurityEvent) {
  student.securityEvents = [event, ...(student.securityEvents ?? [])];
}

function markCurrentDevicePendingReset(student: StoredStudent, currentDeviceId: string) {
  if (student.currentDevice && student.currentDevice.deviceId === currentDeviceId) {
    student.currentDevice = {
      ...student.currentDevice,
      status: "pending_reset",
      lastVerifiedAt: new Date().toISOString(),
    };
  }

  student.deviceHistory = (student.deviceHistory ?? []).map((device) =>
    device.deviceId === currentDeviceId
      ? { ...device, status: "pending_reset" }
      : device,
  );
}

function monthBounds(reference = new Date()) {
  const currentStart = new Date(Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth(), 1));
  const nextStart = new Date(Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth() + 1, 1));
  const previousStart = new Date(Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth() - 1, 1));
  return { currentStart, nextStart, previousStart };
}

function monthOverMonth(
  events: SecurityEventResponse[],
  predicate: (event: SecurityEventResponse) => boolean,
) {
  const { currentStart, nextStart, previousStart } = monthBounds();
  const current = events.filter((event) => {
    const createdAt = new Date(event.createdAt);
    return createdAt >= currentStart && createdAt < nextStart && predicate(event);
  }).length;
  const previous = events.filter((event) => {
    const createdAt = new Date(event.createdAt);
    return createdAt >= previousStart && createdAt < currentStart && predicate(event);
  }).length;

  if (previous === 0) return null;
  return Number((((current - previous) / previous) * 100).toFixed(2));
}

function resetRequestMonthOverMonth(
  requests: DeviceResetRequestResponse[],
  predicate: (request: DeviceResetRequestResponse) => boolean,
) {
  const { currentStart, nextStart, previousStart } = monthBounds();
  const current = requests.filter((request) => {
    const requestedAt = new Date(request.requestedAt);
    return requestedAt >= currentStart && requestedAt < nextStart && predicate(request);
  }).length;
  const previous = requests.filter((request) => {
    const requestedAt = new Date(request.requestedAt);
    return requestedAt >= previousStart && requestedAt < currentStart && predicate(request);
  }).length;

  if (previous === 0) return null;
  return Number((((current - previous) / previous) * 100).toFixed(2));
}

const router: IRouter = Router();

router.use("/admin", requireAdmin);

router.get("/admin/security/events", async (req, res, next) => {
  try {
    const state = await readState();
    const severity = typeof req.query.severity === "string" ? req.query.severity : "";
    const type = typeof req.query.type === "string" ? req.query.type : "";
    const search = typeof req.query.search === "string" ? req.query.search.trim().toLowerCase() : "";
    const reviewed = parseOptionalBoolean(req.query.reviewed);
    const dateFrom = parseOptionalDate(req.query.dateFrom);
    const dateTo = parseOptionalDate(req.query.dateTo);
    const page = normalizePage(req.query.page);
    const limit = normalizeLimit(req.query.limit);

    const filtered = getSecurityEvents(state).filter((event) => {
      if (severity && event.severity !== severity) return false;
      if (type && event.type !== type) return false;
      if (reviewed !== null && event.reviewed !== reviewed) return false;

      const createdAt = new Date(event.createdAt);
      if (dateFrom && createdAt < dateFrom) return false;
      if (dateTo && createdAt > dateTo) return false;

      if (search) {
        const haystack = [
          event.id,
          event.type,
          event.severity,
          event.userName,
          event.userEmail,
          event.bookId,
          event.bookTitle,
          event.deviceIdMasked,
          event.message,
        ].filter(Boolean).join(" ").toLowerCase();
        if (!haystack.includes(search)) return false;
      }

      return true;
    });

    const result = paginate(filtered, page, limit);
    res.json({
      events: result.items,
      page: result.page,
      limit: result.limit,
      total: result.total,
      totalPages: result.totalPages,
    });
  } catch (err) {
    next(err);
  }
});

router.get("/admin/security/events/:id", async (req, res, next) => {
  try {
    const state = await readState();
    const found = findStoredSecurityEvent(state, req.params.id);
    if (!found) {
      res.status(404).json({ message: "Security event not found" });
      return;
    }

    res.json({
      event: found.kind === "admin"
        ? toAdminSecurityEventResponse(found.event)
        : toSecurityEventResponse(found.student, found.event),
    });
  } catch (err) {
    next(err);
  }
});

router.patch("/admin/security/events/:id/review", async (req, res, next) => {
  try {
    const result = await runExclusive(async () => {
      const state = await readState();
      const found = findStoredSecurityEvent(state, req.params.id);
      if (!found) {
        return { status: 404, body: { message: "Security event not found" } };
      }

      const admin = getAdminActor(req);
      const now = new Date().toISOString();
      found.event.reviewed = true;
      found.event.reviewedAt = now;
      found.event.reviewedByAdminId = admin.id;

      appendAuditLog(state, {
        adminId: admin.id,
        action: "security_event.reviewed",
        targetType: "security_event",
        targetId: found.event.id,
        message: `Admin ${admin.email} reviewed security event ${found.event.id}.`,
        metadata: {
          eventType: found.event.type,
          severity: found.event.severity,
          userId: found.kind === "admin" ? found.event.userId : found.student.id,
        },
      });

      state.updatedAt = now;
      await writeState(state);

      return {
        status: 200,
        body: {
          event: found.kind === "admin"
            ? toAdminSecurityEventResponse(found.event)
            : toSecurityEventResponse(found.student, found.event),
        },
      };
    });

    res.status(result.status).json(result.body);
  } catch (err) {
    next(err);
  }
});

router.get("/admin/security/metrics", async (_req, res, next) => {
  try {
    const state = await readState();
    const events = getSecurityEvents(state);
    const requests = getDeviceResetRequests(state);

    res.json({
      totalEvents: events.length,
      deviceBlocked: events.filter((event) => event.type === "device_blocked").length,
      accessDenied: events.filter((event) => event.type === "reader_access_denied").length,
      screenshots: events.filter((event) => event.type === "screenshot_attempt").length,
      pendingResets: requests.filter((request) => request.status === "pending").length,
      criticalEvents: events.filter((event) => event.severity === "critical").length,
      monthOverMonth: {
        totalEvents: monthOverMonth(events, () => true),
        deviceBlocked: monthOverMonth(events, (event) => event.type === "device_blocked"),
        accessDenied: monthOverMonth(events, (event) => event.type === "reader_access_denied"),
        screenshots: monthOverMonth(events, (event) => event.type === "screenshot_attempt"),
        pendingResets: resetRequestMonthOverMonth(requests, (request) => request.status === "pending"),
        criticalEvents: monthOverMonth(events, (event) => event.severity === "critical"),
      },
    });
  } catch (err) {
    next(err);
  }
});

router.get("/admin/device-reset-requests", async (req, res, next) => {
  try {
    const state = await readState();
    const status = typeof req.query.status === "string" ? req.query.status : "";
    const search = typeof req.query.search === "string" ? req.query.search.trim().toLowerCase() : "";
    const page = normalizePage(req.query.page);
    const limit = normalizeLimit(req.query.limit);

    const filtered = getDeviceResetRequests(state).filter((request) => {
      if (status && request.status !== status) return false;
      if (search) {
        const haystack = [
          request.id,
          request.userId,
          request.userName,
          request.userEmail,
          request.currentDeviceId,
          request.requestedDeviceId,
          request.reason,
          request.adminNote,
        ].filter(Boolean).join(" ").toLowerCase();
        if (!haystack.includes(search)) return false;
      }
      return true;
    });

    const result = paginate(filtered, page, limit);
    res.json({
      requests: result.items,
      page: result.page,
      limit: result.limit,
      total: result.total,
      totalPages: result.totalPages,
    });
  } catch (err) {
    next(err);
  }
});

router.get("/admin/device-reset-requests/:id", async (req, res, next) => {
  try {
    const state = await readState();
    const found = findStoredDeviceResetRequest(state, req.params.id);
    if (!found) {
      res.status(404).json({ message: "Device reset request not found" });
      return;
    }

    res.json({ request: toDeviceResetRequestResponse(found.student, found.request) });
  } catch (err) {
    next(err);
  }
});

router.post("/admin/device-reset-requests/:id/approve", async (req, res, next) => {
  try {
    const result = await runExclusive(async () => {
      const state = await readState();
      const found = findStoredDeviceResetRequest(state, req.params.id);
      if (!found) {
        return { status: 404, body: { message: "Device reset request not found" } };
      }

      if (found.request.status !== "pending") {
        return { status: 409, body: { message: "Only pending requests can be approved" } };
      }

      const admin = getAdminActor(req);
      const now = new Date().toISOString();
      const currentDeviceId = currentDeviceIdFor(found.student, found.request);
      const adminNote = isRecord(req.body) && typeof req.body.adminNote === "string"
        ? req.body.adminNote
        : undefined;

      found.request.status = "approved";
      found.request.resolvedAt = now;
      found.request.resolvedByAdminId = admin.id;
      found.request.adminNote = adminNote;
      found.request.updatedAt = now;
      markCurrentDevicePendingReset(found.student, currentDeviceId);

      appendStudentSecurityEvent(found.student, {
        id: createId("evt"),
        type: "device_reset_approved",
        severity: "low",
        deviceId: maskDeviceId(currentDeviceId),
        deviceIdMasked: maskDeviceId(currentDeviceId),
        message: `Admin approved device reset request for ${found.student.name}. Student can register a new device on next login.`,
        metadata: {
          requestId: found.request.id,
          approvedByAdminId: admin.id,
          approvedByAdminEmail: admin.email,
        },
        createdAt: now,
      });

      appendAuditLog(state, {
        adminId: admin.id,
        action: "device_reset_request.approved",
        targetType: "device_reset_request",
        targetId: found.request.id,
        message: `Admin ${admin.email} approved device reset request ${found.request.id}.`,
        metadata: {
          userId: found.student.id,
          currentDeviceId,
          requestedDeviceId: found.request.requestedDeviceId,
          adminNote,
        },
      });

      state.updatedAt = now;
      await writeState(state);

      return {
        status: 200,
        body: { request: toDeviceResetRequestResponse(found.student, found.request) },
      };
    });

    res.status(result.status).json(result.body);
  } catch (err) {
    next(err);
  }
});

router.post("/admin/device-reset-requests/:id/reject", async (req, res, next) => {
  try {
    const result = await runExclusive(async () => {
      const state = await readState();
      const found = findStoredDeviceResetRequest(state, req.params.id);
      if (!found) {
        return { status: 404, body: { message: "Device reset request not found" } };
      }

      if (found.request.status !== "pending") {
        return { status: 409, body: { message: "Only pending requests can be rejected" } };
      }

      const admin = getAdminActor(req);
      const now = new Date().toISOString();
      const currentDeviceId = currentDeviceIdFor(found.student, found.request);
      const adminNote = isRecord(req.body) && typeof req.body.adminNote === "string"
        ? req.body.adminNote
        : undefined;

      found.request.status = "rejected";
      found.request.resolvedAt = now;
      found.request.resolvedByAdminId = admin.id;
      found.request.adminNote = adminNote;
      found.request.updatedAt = now;

      appendStudentSecurityEvent(found.student, {
        id: createId("evt"),
        type: "device_reset_rejected",
        severity: "medium",
        deviceId: maskDeviceId(currentDeviceId),
        deviceIdMasked: maskDeviceId(currentDeviceId),
        message: `Admin rejected device reset request for ${found.student.name}.`,
        metadata: {
          requestId: found.request.id,
          rejectedByAdminId: admin.id,
          rejectedByAdminEmail: admin.email,
          adminNote,
        },
        createdAt: now,
      });

      appendAuditLog(state, {
        adminId: admin.id,
        action: "device_reset_request.rejected",
        targetType: "device_reset_request",
        targetId: found.request.id,
        message: `Admin ${admin.email} rejected device reset request ${found.request.id}.`,
        metadata: {
          userId: found.student.id,
          currentDeviceId,
          adminNote,
        },
      });

      state.updatedAt = now;
      await writeState(state);

      return {
        status: 200,
        body: { request: toDeviceResetRequestResponse(found.student, found.request) },
      };
    });

    res.status(result.status).json(result.body);
  } catch (err) {
    next(err);
  }
});

export default router;
