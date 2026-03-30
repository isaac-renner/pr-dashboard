/**
 * useSSE — subscribes to the server's SSE endpoint (/api/events) and
 * refreshes the PR atoms whenever fresh data is available.
 *
 * Reconnects automatically with exponential backoff (1s → 30s cap).
 */

import { useAtomSet } from "@effect/atom-react";
import { useEffect } from "react";
import { sseRefreshAtom } from "../atoms/prs.js";

export function useSSE() {
  const triggerRefresh = useAtomSet(sseRefreshAtom);

  useEffect(() => {
    let es: EventSource | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let reconnectDelay = 1_000;
    let disposed = false;

    function connect() {
      if (disposed) return;

      es = new EventSource("/api/events");

      es.addEventListener("refresh", () => {
        triggerRefresh();
      });

      es.addEventListener("open", () => {
        reconnectDelay = 1_000; // reset backoff on successful connection
      });

      es.addEventListener("error", () => {
        es?.close();
        es = null;
        if (!disposed) {
          reconnectTimer = setTimeout(connect, reconnectDelay);
          reconnectDelay = Math.min(reconnectDelay * 2, 30_000);
        }
      });
    }

    connect();

    return () => {
      disposed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      es?.close();
    };
  }, [triggerRefresh]);
}
