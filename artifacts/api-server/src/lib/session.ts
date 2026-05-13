import session from "express-session";
import type { Request, Response, NextFunction } from "express";

declare module "express-session" {
  interface SessionData {
    staffId: number;
    outletId: number | null;
    role: string;
  }
}

const isProd = process.env.NODE_ENV === "production";

export const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET ?? (isProd ? (() => { throw new Error("SESSION_SECRET must be set in production"); })() : "chainpos-dev-secret"),
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    maxAge: 8 * 60 * 60 * 1000,
  },
});

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.session?.staffId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  next();
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.session?.staffId) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }
    if (!roles.includes(req.session.role ?? "")) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    next();
  };
}

export function resolveOutletId(req: Request, requested?: number): number | undefined {
  if (req.session.role === "super_admin") return requested;
  return req.session.outletId;
}
