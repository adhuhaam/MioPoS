import { Router } from "express";
import type { Request, Response } from "express";
import { requireAuth } from "../lib/session";
import { subscribe } from "../lib/broadcaster";

const router = Router();

router.get("/events", requireAuth, (req: Request, res: Response) => {
  const outletId =
    req.session.role === "super_admin" ? null : (req.session.outletId ?? null);

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });

  res.write(": connected\n\n");

  const heartbeat = setInterval(() => {
    try {
      res.write(": heartbeat\n\n");
    } catch {
      clearInterval(heartbeat);
    }
  }, 25000);

  const unsubscribe = subscribe(outletId as any, res);

  req.on("close", () => {
    clearInterval(heartbeat);
    unsubscribe();
    res.end();
  });
});

export default router;
