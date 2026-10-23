"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiClient } from "@/lib/apiClient";
import { OUTREACH_API } from "@/lib/automatedOutreachApi";

export function useOutreachResource<T>(path: string, refreshInterval = 30000) {
  const [result, setResult] = useState<{ path: string; data: T | null; error: string | null }>({ path, data: null, error: null });
  const [refreshing, setRefreshing] = useState(false);
  const [version, setVersion] = useState(0);
  const sequence = useRef(0);
  const reload = useCallback(() => setVersion((value) => value + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    let inFlight = false;
    const fetch = async () => {
      if (inFlight || !active) return;
      inFlight = true;
      const request = ++sequence.current;
      setRefreshing(true);
      try {
        const response = await apiClient.get<T>(OUTREACH_API + path, { signal: controller.signal });
        if (active && request === sequence.current) setResult({ path, data: response.data, error: null });
      } catch (error) {
        if (active && request === sequence.current) setResult((old) => ({ path, data: old.path === path ? old.data : null, error: error instanceof Error ? error.message : "Could not load outreach data" }));
      } finally {
        inFlight = false;
        if (active && request === sequence.current) setRefreshing(false);
      }
    };
    void fetch();
    const interval = setInterval(() => { if (!document.hidden) void fetch(); }, refreshInterval);
    const refreshWhenVisible = () => { if (!document.hidden) void fetch(); };
    window.addEventListener("focus", refreshWhenVisible);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      active = false; controller.abort(); clearInterval(interval);
      window.removeEventListener("focus", refreshWhenVisible);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [path, version, refreshInterval]);

  return { data: result.path === path ? result.data : null, error: result.path === path ? result.error : null, refreshing, reload };
}
