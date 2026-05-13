import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

export function useRealtimeSync() {
  const qc = useQueryClient();

  useEffect(() => {
    const base = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
    const url = `${base}/api/events`;

    let es: EventSource;
    let retryTimeout: ReturnType<typeof setTimeout>;

    function connect() {
      es = new EventSource(url, { withCredentials: true });

      es.onmessage = () => {
        qc.invalidateQueries();
      };

      es.onerror = () => {
        es.close();
        retryTimeout = setTimeout(connect, 5000);
      };
    }

    connect();

    return () => {
      clearTimeout(retryTimeout);
      es?.close();
    };
  }, [qc]);
}
