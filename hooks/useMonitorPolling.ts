"use client";

import { useEffect, useState } from "react";

// One request at a time. Hidden/offline tabs pause; unmounts and changed
// windows cancel requests. Retain last good data but explicitly mark it stale.
export function useMonitorPolling<T>(
  load: (signal: AbortSignal) => Promise<T>,
  intervalMs: number,
  live: boolean,
  refreshKey: number,
) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [receivedAt, setReceivedAt] = useState<number | null>(null);
  const [suspended, setSuspended] = useState<"offline" | "hidden" | null>(null);

  useEffect(() => {
    let disposed = false;
    let running = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let requestTimeout: ReturnType<typeof setTimeout> | undefined;
    let controller: AbortController | undefined;
    const suspension = () =>
      !navigator.onLine
        ? "offline"
        : document.visibilityState === "hidden"
          ? "hidden"
          : null;
    const poll = async () => {
      if (disposed || running) return;
      const reason = suspension();
      setSuspended(reason);
      if (reason) return;
      running = true;
      controller = new AbortController();
      requestTimeout = setTimeout(() => controller?.abort(), 15_000);
      setPending(true);
      try {
        const next = await load(controller.signal);
        if (!disposed) {
          setData(next);
          setError(null);
          setReceivedAt(Date.now());
        }
      } catch (cause) {
        if (!disposed)
          setError(
            cause instanceof Error && cause.name !== "AbortError"
              ? cause.message
              : "The update timed out. Showing the last available data.",
          );
      } finally {
        clearTimeout(requestTimeout);
        running = false;
        if (!disposed) {
          setPending(false);
          if (live && !suspension())
            timer = setTimeout(() => void poll(), intervalMs);
        }
      }
    };
    const wake = () => {
      if (timer) clearTimeout(timer);
      setSuspended(suspension());
      if (live) void poll();
    };
    void poll();
    document.addEventListener("visibilitychange", wake);
    window.addEventListener("online", wake);
    window.addEventListener("offline", wake);
    return () => {
      disposed = true;
      clearTimeout(timer);
      clearTimeout(requestTimeout);
      controller?.abort();
      document.removeEventListener("visibilitychange", wake);
      window.removeEventListener("online", wake);
      window.removeEventListener("offline", wake);
    };
  }, [load, intervalMs, live, refreshKey]);

  return { data, error, pending, receivedAt, suspended };
}
