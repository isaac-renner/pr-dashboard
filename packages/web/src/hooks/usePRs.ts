import { useState, useEffect, useCallback, useRef } from "react";
import type { PR } from "../lib/types";

interface UsePRsResult {
  prs: PR[];
  lastRefreshed: string | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function usePRs(): UsePRsResult {
  const [prs, setPrs] = useState<PR[]>([]);
  const [lastRefreshed, setLastRefreshed] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [, setTick] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  const fetchPRs = useCallback(async () => {
    try {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      const res = await fetch("/api/prs", { signal: controller.signal });
      if (!res.ok) throw new Error(`Failed to fetch PRs: ${res.status}`);
      const data = await res.json();
      setPrs(data.prs);
      setLastRefreshed(data.lastRefreshed);
      setError(null);
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/refresh", { method: "POST" });
      if (!res.ok) throw new Error(`Refresh failed: ${res.status}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Refresh failed");
      setLoading(false);
      return;
    }
    await fetchPRs();
  }, [fetchPRs]);

  // Initial fetch
  useEffect(() => {
    fetchPRs();
    return () => abortRef.current?.abort();
  }, [fetchPRs]);

  // Re-render every 10s to keep "last refreshed X ago" label fresh
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 10_000);
    return () => clearInterval(id);
  }, []);

  return { prs, lastRefreshed, loading, error, refresh };
}
