import type { Response } from "express";

interface Subscriber {
  outletId: number | null;
  send: (payload: string) => void;
  close: () => void;
}

const subscribers = new Set<Subscriber>();

export function subscribe(
  outletId: number | null,
  res: Response,
): () => void {
  const sub: Subscriber = {
    outletId,
    send: (payload: string) => {
      try {
        res.write(payload);
      } catch {
        subscribers.delete(sub);
      }
    },
    close: () => {
      subscribers.delete(sub);
    },
  };
  subscribers.add(sub);
  return () => sub.close();
}

export function broadcast(outletId: number, event: Record<string, unknown>): void {
  const payload = `data: ${JSON.stringify(event)}\n\n`;
  for (const sub of subscribers) {
    if (sub.outletId === null || sub.outletId === outletId) {
      sub.send(payload);
    }
  }
}
