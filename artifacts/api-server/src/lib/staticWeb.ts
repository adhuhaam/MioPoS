import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express, { type Express, type Request, type Response, type NextFunction } from "express";
import { logger } from "./logger";

const moduleDir = path.dirname(fileURLToPath(import.meta.url));

function resolveWebRoot(): string | null {
  const candidates = [
    path.resolve(moduleDir, "../../../restaurant-pos/dist/public"),
    path.resolve(process.cwd(), "artifacts/restaurant-pos/dist/public"),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(path.join(candidate, "index.html"))) {
      return candidate;
    }
  }
  return null;
}

export function installStaticWeb(app: Express): void {
  const webRoot = resolveWebRoot();
  if (!webRoot) {
    if (process.env.NODE_ENV === "production") {
      logger.warn("restaurant-pos static build not found; web UI will not be served");
    }
    return;
  }

  logger.info({ webRoot }, "Serving restaurant-pos static files");

  app.use(
    express.static(webRoot, {
      index: false,
      maxAge: process.env.NODE_ENV === "production" ? "1d" : 0,
    }),
  );

  app.get("/{*path}", (req: Request, res: Response, next: NextFunction) => {
    if (req.method !== "GET" && req.method !== "HEAD") {
      next();
      return;
    }
    if (req.path.startsWith("/api")) {
      next();
      return;
    }
    // express.static already served files under webRoot; anything else is a client route.
    // Never join req.path — avoids traversal and always SPA-fallbacks (no 404 via next()).
    res.sendFile("index.html", { root: webRoot });
  });
}
