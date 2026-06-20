import type { NextFunction, Request, Response } from "express";

/**
 * ⚠️ SECURITY WARNING — MVP SCAFFOLDING ONLY, NOT PRODUCTION-SAFE ⚠️
 *
 * Admin authorization in this file is derived ENTIRELY from the client-supplied
 * `x-warqless-admin-role` header (with id/email read from `x-warqless-admin-id`
 * and `x-warqless-admin-email`). There is NO token, signature, or session
 * verification, so any unauthenticated client can send
 * `x-warqless-admin-role: admin` and pass every gate below — including
 * admin-only mutations (e.g. force-logout, platform-settings PATCH) and actor
 * impersonation via `getAdminPanelActor`. This is a full server-side admin
 * authorization bypass.
 *
 * This header-based model is intentional MVP scaffolding for the current
 * development phase. Behavior is being kept as-is for now by decision.
 *
 * TODO(security): Before production, REPLACE this with a verifiable credential.
 * Validate a signed session token / JWT (or at minimum a shared bearer secret)
 * and derive the role server-side from that verified credential instead of
 * trusting the `x-warqless-admin-role` header. Until then, do NOT expose these
 * routes to untrusted networks.
 */

export type AdminActor = {
  id: string;
  email: string;
};

export type AdminPanelRole = "admin" | "publisher";

export type AdminPanelActor = AdminActor & {
  role: AdminPanelRole;
};

function headerValue(req: Request, name: string): string | undefined {
  const value = req.header(name);
  return value && value.trim() ? value.trim() : undefined;
}

export function getAdminActor(req: Request): AdminActor {
  return {
    id: headerValue(req, "x-warqless-admin-id") ?? "demo-admin",
    email: headerValue(req, "x-warqless-admin-email") ?? "admin@warqless.com",
  };
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const role = headerValue(req, "x-warqless-admin-role");

  if (!role) {
    res.status(401).json({ message: "Authentication required" });
    return;
  }

  if (role !== "admin") {
    res.status(403).json({ message: "Admin role required" });
    return;
  }

  next();
}

export function getAdminPanelActor(req: Request): AdminPanelActor {
  const role = headerValue(req, "x-warqless-admin-role");

  return {
    id: headerValue(req, "x-warqless-admin-id") ?? (role === "publisher" ? "pub1" : "admin1"),
    email: headerValue(req, "x-warqless-admin-email") ?? (role === "publisher" ? "publisher@darmaref.eg" : "admin@warqless.com"),
    role: role === "publisher" ? "publisher" : "admin",
  };
}

export function requireAdminPanelUser(req: Request, res: Response, next: NextFunction) {
  const role = headerValue(req, "x-warqless-admin-role");

  if (!role) {
    res.status(401).json({ message: "Authentication required" });
    return;
  }

  if (role !== "admin" && role !== "publisher") {
    res.status(403).json({ message: "Admin panel role required" });
    return;
  }

  next();
}
