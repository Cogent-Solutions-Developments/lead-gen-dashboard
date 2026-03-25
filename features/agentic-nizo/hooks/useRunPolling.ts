"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AgenticApiError, getRunDetail, toAgenticApiError } from "@/features/agentic-nizo/api/client";
import type { RunDetailResponse, TerminalRunStatus } from "@/features/agentic-nizo/api/types";

const POLL_INTERVAL_MS = 2500;
const TERMINAL_STATUSES = new Set<TerminalRunStatus>(["completed", "failed", "cancelled"]);

export function isTerminalRunStatus(status?: string | null): status is TerminalRunStatus {
  return Boolean(status && TERMINAL_STATUSES.has(status as TerminalRunStatus));
}

interface UseRunPollingResult {
  runDetail: RunDetailResponse | null;
  isInitialLoading: boolean;
  isRefreshing: boolean;
  isPolling: boolean;
  error: AgenticApiError | null;
  lastUpdatedAt: Date | null;
  refreshRun: (silent?: boolean) => Promise<RunDetailResponse | undefined>;
}

export function useRunPolling(runId: string | null): UseRunPollingResult {
  const [runDetail, setRunDetail] = useState<RunDetailResponse | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<AgenticApiError | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);

  const activeRunIdRef = useRef<string | null>(runId);

  useEffect(() => {
    activeRunIdRef.current = runId;
  }, [runId]);

  const refreshRun = useCallback(
    async (silent = false) => {
      if (!runId) return undefined;

      setError(null);
      if (silent) {
        setIsRefreshing(true);
      } else {
        setIsInitialLoading(true);
      }

      try {
        const detail = await getRunDetail(runId);
        if (activeRunIdRef.current !== runId) return undefined;
        setRunDetail(detail);
        setLastUpdatedAt(new Date());
        return detail;
      } catch (error) {
        if (activeRunIdRef.current !== runId) return undefined;
        setError(toAgenticApiError(error));
        return undefined;
      } finally {
        if (activeRunIdRef.current !== runId) return;
        if (silent) {
          setIsRefreshing(false);
        } else {
          setIsInitialLoading(false);
        }
      }
    },
    [runId],
  );

  useEffect(() => {
    if (!runId) {
      setRunDetail(null);
      setError(null);
      setIsInitialLoading(false);
      setIsRefreshing(false);
      setLastUpdatedAt(null);
      return;
    }

    void refreshRun(false);
  }, [runId, refreshRun]);

  useEffect(() => {
    if (!runId) return;
    if (isTerminalRunStatus(runDetail?.status)) return;

    const intervalId = setInterval(() => {
      void refreshRun(true);
    }, POLL_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, [runId, runDetail?.status, refreshRun]);

  const isPolling = useMemo(
    () => Boolean(runId) && !isTerminalRunStatus(runDetail?.status),
    [runId, runDetail?.status],
  );

  return {
    runDetail,
    isInitialLoading,
    isRefreshing,
    isPolling,
    error,
    lastUpdatedAt,
    refreshRun,
  };
}
