"use client";

import { useCallback, useEffect, useState } from "react";
import { apiClient } from "@/lib/apiClient";
import { OUTREACH_API } from "@/lib/automatedOutreachApi";

type Snapshot<T> = { path: string; data: T | null; previous: T | null; error: string | null };

/** One request at a time; hidden tabs stop polling. Filters never share a baseline. */
export function useStatusActivity<T>(path: string, interval = 5000, refreshKey = 0) {
  const [snapshot, setSnapshot] = useState<Snapshot<T>>({ path, data: null, previous: null, error: null });
  const [refreshing, setRefreshing] = useState(false);
  const [version, setVersion] = useState(0);
  const reload = useCallback(() => setVersion(value => value + 1), []);
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    let pending = false;
    async function refresh() {
      if (pending || document.hidden) return;
      pending = true;
      setRefreshing(true);
      try {
        const response = await apiClient.get<T>(OUTREACH_API + path, { signal: controller.signal });
        if (active) setSnapshot(old => ({ path, data: response.data, previous: old.path === path ? old.data : null, error: null }));
      } catch (error) {
        if (active) setSnapshot(old => ({
          path, data: old.path === path ? old.data : null, previous: old.path === path ? old.previous : null,
          error: (error as { status?: number })?.status === 404
            ? "Status activity is unavailable. Please retry or contact your administrator."
            : error instanceof Error ? error.message : "Could not refresh workflow activity",
        }));
      } finally {
        pending = false;
        if (active) setRefreshing(false);
      }
    }
    void refresh();
    const timer = window.setInterval(() => void refresh(), interval);
    const onVisible = () => { if (!document.hidden) void refresh(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { active = false; controller.abort(); window.clearInterval(timer); document.removeEventListener("visibilitychange", onVisible); };
  }, [path, interval, version, refreshKey]);
  return { data: snapshot.path === path ? snapshot.data : null, previous: snapshot.path === path ? snapshot.previous : null,
    error: snapshot.path === path ? snapshot.error : null, refreshing, reload };
}
