import type { NextFunction, Request, Response } from "express";

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
