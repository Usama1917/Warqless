import { createInsertSchema } from "drizzle-zod";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { z } from "zod/v4";

export const studentDeviceStatusEnum = pgEnum("student_device_status", [
  "active",
  "blocked",
  "pending_reset",
  "removed",
]);

export const deviceResetRequestStatusEnum = pgEnum("device_reset_request_status", [
  "pending",
  "approved",
  "rejected",
]);

export const securityEventSeverityEnum = pgEnum("security_event_severity", [
  "low",
  "medium",
  "high",
  "critical",
]);

export const securityEventTypeEnum = pgEnum("security_event_type", [
  "device_registered",
  "device_verified",
  "device_blocked",
  "device_reset_requested",
  "device_reset_approved",
  "device_reset_rejected",
  "reader_opened",
  "reader_access_denied",
  "license_check_failed",
  "screenshot_attempt",
  "suspicious_activity",
]);

const metadataColumn = () => jsonb("metadata").$type<Record<string, unknown>>();

export const studentDevicesTable = pgTable(
  "student_devices",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    deviceIdHash: text("device_id_hash").notNull(),
    maskedDeviceId: text("masked_device_id").notNull(),
    deviceName: text("device_name"),
    platform: text("platform").notNull(),
    appVersion: text("app_version"),
    status: studentDeviceStatusEnum("status").notNull().default("active"),
    isPrimary: boolean("is_primary").notNull().default(false),
    registeredAt: timestamp("registered_at", { withTimezone: true }).notNull(),
    lastVerifiedAt: timestamp("last_verified_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("student_devices_user_id_idx").on(table.userId),
    uniqueIndex("student_devices_user_device_hash_idx").on(table.userId, table.deviceIdHash),
    index("student_devices_status_idx").on(table.status),
    index("student_devices_registered_at_idx").on(table.registeredAt),
    index("student_devices_last_verified_at_idx").on(table.lastVerifiedAt),
  ],
);

export const deviceResetRequestsTable = pgTable(
  "device_reset_requests",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    currentDeviceId: text("current_device_id").notNull(),
    requestedDeviceId: text("requested_device_id"),
    reason: text("reason").notNull(),
    status: deviceResetRequestStatusEnum("status").notNull().default("pending"),
    requestedAt: timestamp("requested_at", { withTimezone: true }).notNull(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    resolvedByAdminId: text("resolved_by_admin_id"),
    adminNote: text("admin_note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("device_reset_requests_user_id_idx").on(table.userId),
    index("device_reset_requests_status_idx").on(table.status),
    index("device_reset_requests_requested_at_idx").on(table.requestedAt),
    index("device_reset_requests_created_at_idx").on(table.createdAt),
    index("device_reset_requests_resolved_by_admin_id_idx").on(table.resolvedByAdminId),
  ],
);

export const securityEventsTable = pgTable(
  "security_events",
  {
    id: text("id").primaryKey(),
    type: securityEventTypeEnum("type").notNull(),
    severity: securityEventSeverityEnum("severity").notNull(),
    userId: text("user_id"),
    userName: text("user_name").notNull(),
    userEmail: text("user_email").notNull(),
    bookId: text("book_id"),
    bookTitle: text("book_title"),
    deviceIdMasked: text("device_id_masked"),
    message: text("message").notNull(),
    metadata: metadataColumn(),
    reviewed: boolean("reviewed").notNull().default(false),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    reviewedByAdminId: text("reviewed_by_admin_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("security_events_type_idx").on(table.type),
    index("security_events_severity_idx").on(table.severity),
    index("security_events_user_id_idx").on(table.userId),
    index("security_events_created_at_idx").on(table.createdAt),
    index("security_events_reviewed_idx").on(table.reviewed),
    index("security_events_user_created_at_idx").on(table.userId, table.createdAt),
  ],
);

export const adminAuditLogsTable = pgTable(
  "admin_audit_logs",
  {
    id: text("id").primaryKey(),
    adminId: text("admin_id").notNull(),
    action: text("action").notNull(),
    targetType: text("target_type").notNull(),
    targetId: text("target_id").notNull(),
    message: text("message").notNull(),
    metadata: metadataColumn(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("admin_audit_logs_admin_id_idx").on(table.adminId),
    index("admin_audit_logs_action_idx").on(table.action),
    index("admin_audit_logs_target_idx").on(table.targetType, table.targetId),
    index("admin_audit_logs_created_at_idx").on(table.createdAt),
  ],
);

export const phoneVerificationOtpsTable = pgTable(
  "phone_verification_otps",
  {
    id: text("id").primaryKey(),
    accountType: text("account_type").notNull(),
    accountId: text("account_id").notNull(),
    phone: text("phone").notNull(),
    purpose: text("purpose").notNull().default("phone_verification"),
    codeHash: text("code_hash").notNull(),
    attempts: integer("attempts").notNull().default(0),
    maxAttempts: integer("max_attempts").notNull().default(5),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    lastSentAt: timestamp("last_sent_at", { withTimezone: true }).notNull().defaultNow(),
    resendAvailableAt: timestamp("resend_available_at", { withTimezone: true }).notNull().defaultNow(),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("phone_verification_otps_account_idx").on(table.accountType, table.accountId),
    index("phone_verification_otps_phone_purpose_idx").on(table.phone, table.purpose),
    index("phone_verification_otps_phone_idx").on(table.phone),
    index("phone_verification_otps_expires_at_idx").on(table.expiresAt),
  ],
);

export const insertStudentDeviceSchema = createInsertSchema(studentDevicesTable);
export const insertDeviceResetRequestSchema = createInsertSchema(deviceResetRequestsTable);
export const insertSecurityEventSchema = createInsertSchema(securityEventsTable);
export const insertAdminAuditLogSchema = createInsertSchema(adminAuditLogsTable);
export const insertPhoneVerificationOtpSchema = createInsertSchema(phoneVerificationOtpsTable);

export type StudentDevice = typeof studentDevicesTable.$inferSelect;
export type InsertStudentDevice = z.infer<typeof insertStudentDeviceSchema>;

export type DeviceResetRequest = typeof deviceResetRequestsTable.$inferSelect;
export type InsertDeviceResetRequest = z.infer<typeof insertDeviceResetRequestSchema>;

export type SecurityEvent = typeof securityEventsTable.$inferSelect;
export type InsertSecurityEvent = z.infer<typeof insertSecurityEventSchema>;

export type AdminAuditLog = typeof adminAuditLogsTable.$inferSelect;
export type InsertAdminAuditLog = z.infer<typeof insertAdminAuditLogSchema>;

export type PhoneVerificationOtp = typeof phoneVerificationOtpsTable.$inferSelect;
export type InsertPhoneVerificationOtp = z.infer<typeof insertPhoneVerificationOtpSchema>;
