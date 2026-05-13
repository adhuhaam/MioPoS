import session from "express-session";

declare module "express-session" {
  interface SessionData {
    staffId: number;
    outletId: number;
    role: string;
  }
}

export const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET ?? "chainpos-dev-secret-change-in-production",
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: false,
    maxAge: 8 * 60 * 60 * 1000,
  },
});

export function requireAuth(req: any, res: any, next: any) {
  if (!req.session?.staffId) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  next();
}

export function requireRole(...roles: string[]) {
  return (req: any, res: any, next: any) => {
    if (!req.session?.staffId) return res.status(401).json({ error: "Not authenticated" });
    if (!roles.includes(req.session.role)) return res.status(403).json({ error: "Forbidden" });
    next();
  };
}
