"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Bot, Home, Loader2, LogOut, Sparkles, Webhook } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { clearPersona } from "@/lib/persona";
import { getSupabaseClient } from "@/lib/supabaseClient";
import {
  AgenticApiError,
  dispatchOutreachQueue,
  getOutreachQueue,
  getReadiness,
  startRun,
  submitRunAnswers,
  toAgenticApiError,
} from "@/features/agentic-nizo/api/client";
import type { MissingFieldsMap, OutreachQueueResponse, RunEvent } from "@/features/agentic-nizo/api/types";
import { ClarificationForm } from "@/features/agentic-nizo/components/ClarificationForm";
import { EventsTimeline } from "@/features/agentic-nizo/components/EventsTimeline";
import { IcpForm } from "@/features/agentic-nizo/components/IcpForm";
import { OutreachQueueTable } from "@/features/agentic-nizo/components/OutreachQueueTable";
import { RunStatusPanel } from "@/features/agentic-nizo/components/RunStatusPanel";
import { useRunPolling } from "@/features/agentic-nizo/hooks/useRunPolling";

type ReadinessState = "checking" | "ready" | "error";

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function stringifyValue(value: unknown): string {
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function getByPath(record: Record<string, unknown> | null, path: string): unknown {
  if (!record) return undefined;
  return path.split(".").reduce<unknown>((current, key) => {
    if (!isObjectRecord(current)) return undefined;
    return current[key];
  }, record);
}

function findStringByPaths(record: Record<string, unknown> | null, paths: string[]): string | null {
  for (const path of paths) {
    const value = getByPath(record, path);
    if (typeof value === "string" && value.trim()) return value;
  }
  return null;
}

function findNumberByPaths(record: Record<string, unknown> | null, paths: string[]): number | null {
  for (const path of paths) {
    const value = getByPath(record, path);
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string") {
      const parsed = Number(value);
      if (!Number.isNaN(parsed) && Number.isFinite(parsed)) return parsed;
    }
  }
  return null;
}

function findArrayCountByPaths(record: Record<string, unknown> | null, paths: string[]): number | null {
  for (const path of paths) {
    const value = getByPath(record, path);
    if (Array.isArray(value)) return value.length;
  }
  return null;
}

function normalizeMissingFields(value: unknown): MissingFieldsMap {
  if (!isObjectRecord(value)) return {};
  const entries = Object.entries(value).filter(
    ([key, question]) => Boolean(key) && typeof question === "string",
  ) as Array<[string, string]>;
  return Object.fromEntries(entries);
}

function normalizeAnswers(value: unknown): Record<string, string> {
  if (!isObjectRecord(value)) return {};
  const entries = Object.entries(value)
    .map(([key, rawValue]) => [key, typeof rawValue === "string" ? rawValue : String(rawValue)] as const)
    .filter(([key]) => key.length > 0);
  return Object.fromEntries(entries);
}

function latestFailedEvent(events: RunEvent[] | undefined): RunEvent | null {
  if (!events || events.length === 0) return null;

  for (let index = events.length - 1; index >= 0; index -= 1) {
    const event = events[index];
    const status = (event.status || "").toLowerCase();
    const message = (event.message || "").toLowerCase();
    if (status.includes("fail") || message.includes("fail")) return event;
  }

  return null;
}

export default function AgenticNizoPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [runId, setRunId] = useState<string | null>(null);
  const [rotation, setRotation] = useState(0);

  const [lastSubmittedIcp, setLastSubmittedIcp] = useState("");
  const [isStartingRun, setIsStartingRun] = useState(false);
  const [startError, setStartError] = useState<AgenticApiError | null>(null);

  const [isSubmittingAnswers, setIsSubmittingAnswers] = useState(false);
  const [answersError, setAnswersError] = useState<AgenticApiError | null>(null);

  const [queue, setQueue] = useState<OutreachQueueResponse | null>(null);
  const [queueError, setQueueError] = useState<AgenticApiError | null>(null);
  const [isQueueLoading, setIsQueueLoading] = useState(false);
  const [isDispatching, setIsDispatching] = useState(false);
  const [queueSyncRunId, setQueueSyncRunId] = useState<string | null>(null);

  const [readinessState, setReadinessState] = useState<ReadinessState>("checking");
  const [readinessMessage, setReadinessMessage] = useState("Checking backend readiness...");
  const [readinessDetail, setReadinessDetail] = useState<unknown>(null);

  const { runDetail, isInitialLoading, isRefreshing, isPolling, error: runError, lastUpdatedAt, refreshRun } = useRunPolling(
    runId,
  );

  const contextRecord = useMemo(() => {
    if (isObjectRecord(runDetail?.context)) return runDetail.context;
    return null;
  }, [runDetail?.context]);

  const missingFields = useMemo(
    () => normalizeMissingFields(runDetail?.missing_fields),
    [runDetail?.missing_fields],
  );

  const existingAnswers = useMemo(
    () => normalizeAnswers(getByPath(contextRecord, "answers")),
    [contextRecord],
  );

  const failedEvent = useMemo(() => latestFailedEvent(runDetail?.events), [runDetail?.events]);

  const confidenceValue = useMemo(
    () =>
      findNumberByPaths(contextRecord, [
        "classification_confidence",
        "pipeline_confidence",
        "classification.confidence",
      ]),
    [contextRecord],
  );

  const classificationReason = useMemo(
    () =>
      findStringByPaths(contextRecord, [
        "classification_reason",
        "pipeline_reason",
        "classification.reason",
      ]),
    [contextRecord],
  );

  const companiesCount = useMemo(
    () => findArrayCountByPaths(contextRecord, ["companies", "qualified_companies", "context.companies"]),
    [contextRecord],
  );
  const profilesCount = useMemo(
    () => findArrayCountByPaths(contextRecord, ["profiles", "validated_profiles", "leads"]),
    [contextRecord],
  );
  const messagesCount = useMemo(
    () => findArrayCountByPaths(contextRecord, ["messages", "message_drafts", "drafts"]),
    [contextRecord],
  );

  const retryIcp = useMemo(() => {
    return (
      lastSubmittedIcp ||
      findStringByPaths(contextRecord, ["icp", "input_icp", "intake.icp"]) ||
      ""
    );
  }, [contextRecord, lastSubmittedIcp]);

  const updateRunIdInUrl = useCallback(
    (nextRunId: string | null) => {
      setRunId(nextRunId);
      const nextParams = new URLSearchParams(searchParams.toString());
      if (nextRunId) {
        nextParams.set("run_id", nextRunId);
      } else {
        nextParams.delete("run_id");
      }

      const query = nextParams.toString();
      const nextUrl = query ? `/agentic-nizo?${query}` : "/agentic-nizo";
      router.replace(nextUrl);
    },
    [router, searchParams],
  );

  useEffect(() => {
    const queryRunId = searchParams.get("run_id");
    setRunId(queryRunId);
  }, [searchParams]);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;

    const rotateIcon = () => {
      setRotation((previous) => previous + 360);
      const delay = Math.floor(Math.random() * 7000) + 3000;
      timeoutId = setTimeout(rotateIcon, delay);
    };

    timeoutId = setTimeout(rotateIcon, 2000);
    return () => clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    let isMounted = true;

    const checkReadiness = async () => {
      try {
        await getReadiness();
        if (!isMounted) return;
        setReadinessState("ready");
        setReadinessMessage("Backend ready");
        setReadinessDetail(null);
      } catch (error) {
        const parsedError = toAgenticApiError(error);
        if (!isMounted) return;
        setReadinessState("error");
        setReadinessMessage(parsedError.message);
        setReadinessDetail(parsedError.detail || parsedError.raw);
      }
    };

    void checkReadiness();

    return () => {
      isMounted = false;
    };
  }, []);

  const fetchQueue = useCallback(async (targetRunId: string, silent = false) => {
    if (!silent) setIsQueueLoading(true);
    setQueueError(null);

    try {
      const queueResponse = await getOutreachQueue(targetRunId);
      setQueue(queueResponse);
    } catch (error) {
      setQueueError(toAgenticApiError(error));
    } finally {
      if (!silent) setIsQueueLoading(false);
    }
  }, []);

  useEffect(() => {
    if (runDetail?.status !== "completed" || !runId || queueSyncRunId === runId) return;
    setQueueSyncRunId(runId);
    void fetchQueue(runId);
  }, [fetchQueue, queueSyncRunId, runDetail?.status, runId]);

  const clearRunContext = useCallback(() => {
    updateRunIdInUrl(null);
    setQueue(null);
    setQueueError(null);
    setQueueSyncRunId(null);
    setStartError(null);
    setAnswersError(null);
  }, [updateRunIdInUrl]);

  const handleStartRun = useCallback(
    async (icp: string) => {
      setIsStartingRun(true);
      setStartError(null);
      setAnswersError(null);
      setQueue(null);
      setQueueError(null);
      setQueueSyncRunId(null);

      try {
        const response = await startRun({ icp });
        setLastSubmittedIcp(icp);
        updateRunIdInUrl(response.run_id);
        toast.success("Agentic run started", {
          description: `Run ${response.run_id.slice(0, 8)} is now ${response.status}.`,
        });
      } catch (error) {
        const parsedError = toAgenticApiError(error);
        setStartError(parsedError);
        toast.error("Unable to start run", { description: parsedError.message });
      } finally {
        setIsStartingRun(false);
      }
    },
    [updateRunIdInUrl],
  );

  const handleSubmitClarification = useCallback(
    async (answers: Record<string, string>) => {
      if (!runId) return;

      setIsSubmittingAnswers(true);
      setAnswersError(null);

      try {
        await submitRunAnswers(runId, { answers });
        toast.success("Clarification submitted", {
          description: "Agents resumed processing with your answers.",
        });
        await refreshRun(false);
      } catch (error) {
        const parsedError = toAgenticApiError(error);
        setAnswersError(parsedError);
        toast.error("Unable to submit answers", { description: parsedError.message });
      } finally {
        setIsSubmittingAnswers(false);
      }
    },
    [refreshRun, runId],
  );

  const handleDispatch = useCallback(async () => {
    if (!runId) return;
    setIsDispatching(true);
    try {
      const response = await dispatchOutreachQueue(runId);
      toast.success("Dispatch triggered", {
        description: response.message || "Manual outreach dispatch request was accepted.",
      });
      await fetchQueue(runId, true);
    } catch (error) {
      const parsedError = toAgenticApiError(error);
      toast.error("Dispatch failed", { description: parsedError.message });
    } finally {
      setIsDispatching(false);
    }
  }, [fetchQueue, runId]);

  const handleRetryFailedRun = useCallback(async () => {
    const retryText = retryIcp.trim();
    if (retryText.length < 10) {
      toast.error("Retry unavailable", {
        description: "No usable ICP found for retry. Submit a fresh ICP in the form.",
      });
      return;
    }
    await handleStartRun(retryText);
  }, [handleStartRun, retryIcp]);

  const handleSignOut = async () => {
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to sign out.";
      toast.error("Sign out failed", { description: message });
      return;
    }

    clearPersona();
    router.replace("/sign-in");
  };

  const shouldShowQueue = runDetail?.status === "completed" || Boolean(queue?.rows?.length);
  const queueTotal = queue?.total ?? queue?.rows?.length ?? 0;

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-white">
      <div className="pointer-events-none absolute inset-0 z-0">
        <div className="absolute -right-32 top-1/2 -translate-y-1/2 rotate-[26deg] opacity-[0.05]">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-[72rem] w-[72rem] text-blue-900"
          >
            <path d="M18 16.98h-5.99c-1.1 0-1.95.94-2.48 1.9A4 4 0 0 1 2 17c.01-.7.2-1.4.57-2" />
            <path d="m6 17 3.13-5.78c.53-.97.1-2.18-.5-3.1a4 4 0 1 1 6.89-4.06" />
            <path d="m12 6 3.13 5.73C15.66 12.7 16.9 13 18 13a4 4 0 0 1 0 8" />
          </svg>
        </div>
      </div>

      <div className="absolute left-6 top-6 z-30 flex items-center gap-3">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1, rotate: rotation }}
          transition={{
            scale: { type: "spring", stiffness: 260, damping: 20 },
            rotate: { duration: 2, ease: "easeInOut" },
          }}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-700 text-white"
        >
          <Webhook className="h-5 w-5" />
        </motion.div>
        <span className="text-xl font-medium tracking-wide text-zinc-900">supernizo campaigns</span>
      </div>

      <div className="fixed right-6 top-6 z-30 flex items-center gap-2">
        <Link href="/choose-persona">
          <Button
            variant="outline"
            className="h-10 rounded-md border-zinc-200 bg-white/90 text-zinc-700 hover:bg-zinc-50"
          >
            <Bot className="mr-2 h-4 w-4 text-blue-600" />
            Roles
          </Button>
        </Link>
        <Link href="/dashboard">
          <Button
            variant="outline"
            className="h-10 w-10 rounded-md border-zinc-200 bg-white/90 p-0 text-zinc-700 hover:bg-zinc-50"
            aria-label="Go to dashboard"
          >
            <Home className="h-4 w-4" />
          </Button>
        </Link>
        <Button
          variant="outline"
          onClick={handleSignOut}
          className="h-10 rounded-md border-zinc-200 bg-white/90 text-zinc-700 hover:bg-zinc-50"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </Button>
      </div>

      <div className="relative z-10 mx-auto w-full max-w-[1200px] px-6 pb-16 pt-28">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-6 max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
            <Sparkles className="h-3.5 w-3.5" />
            Agentic Nizo Beta
          </div>
          <h1 className="text-4xl font-semibold tracking-tight text-zinc-900 sm:text-5xl">
            Multi-Agent Lead Orchestration Console
          </h1>
          <p className="text-sm leading-6 text-zinc-600">
            Submit ICP, monitor live run stages, answer clarification requests, inspect final outcomes, and manually trigger outreach dispatch.
          </p>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Badge
              variant="outline"
              className={
                readinessState === "ready"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : readinessState === "error"
                    ? "border-red-200 bg-red-50 text-red-700"
                    : "border-zinc-200 bg-zinc-50 text-zinc-700"
              }
            >
              {readinessState === "checking" ? "Readiness: checking" : readinessState === "ready" ? "Readiness: ready" : "Readiness: issue"}
            </Badge>
            <span className="text-zinc-500">{readinessMessage}</span>
          </div>
        </motion.div>

        <RunStatusPanel
          runId={runId}
          runDetail={runDetail}
          isPolling={isPolling}
          isRefreshing={isRefreshing || isInitialLoading}
          lastUpdatedAt={lastUpdatedAt}
          onRefresh={() => {
            void refreshRun(false);
          }}
        />

        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.06fr)_minmax(0,0.94fr)]">
          <section className="space-y-6">
            <IcpForm
              isSubmitting={isStartingRun}
              runId={runId}
              defaultIcp={lastSubmittedIcp}
              error={startError}
              onSubmit={handleStartRun}
              onResetRun={clearRunContext}
            />

            {runDetail?.status === "needs_user_input" ? (
              <ClarificationForm
                missingFields={missingFields}
                existingAnswers={existingAnswers}
                isSubmitting={isSubmittingAnswers}
                error={answersError}
                onSubmit={handleSubmitClarification}
              />
            ) : null}

            {runDetail?.status === "failed" ? (
              <Card className="border-red-200/80 bg-red-50/65 shadow-[0_20px_32px_-28px_rgba(127,29,29,0.5)]">
                <CardHeader>
                  <CardTitle className="text-xl text-red-900">Run Failed</CardTitle>
                  <CardDescription className="text-red-700/90">
                    The workflow stopped before completion. You can inspect the failure and retry.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-red-900">
                    {failedEvent?.message || "No failure message was attached to the latest event."}
                  </p>

                  {failedEvent?.payload ? (
                    <details>
                      <summary className="cursor-pointer text-xs font-medium text-red-800">Failed payload</summary>
                      <pre className="mt-2 max-h-52 overflow-auto rounded-lg bg-white/80 p-2 text-xs text-red-900">
                        {stringifyValue(failedEvent.payload)}
                      </pre>
                    </details>
                  ) : null}

                  <Button type="button" onClick={handleRetryFailedRun} disabled={isStartingRun} className="btn-sidebar-noise h-9">
                    {isStartingRun ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Retrying...
                      </>
                    ) : (
                      "Retry with same ICP"
                    )}
                  </Button>
                </CardContent>
              </Card>
            ) : null}

            {runDetail?.status === "completed" ? (
              <Card className="border-emerald-200/80 bg-emerald-50/40 shadow-[0_20px_34px_-30px_rgba(6,95,70,0.5)]">
                <CardHeader>
                  <CardTitle className="text-xl text-emerald-900">Run Completed</CardTitle>
                  <CardDescription className="text-emerald-700/90">
                    Review final pipeline metadata and generated output counts.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-emerald-200/70 bg-white/80 p-3">
                      <p className="text-xs uppercase tracking-wide text-emerald-700">Pipeline</p>
                      <p className="mt-1 text-lg font-semibold text-emerald-900">{runDetail.pipeline || "n/a"}</p>
                    </div>
                    <div className="rounded-xl border border-emerald-200/70 bg-white/80 p-3">
                      <p className="text-xs uppercase tracking-wide text-emerald-700">Queue Rows</p>
                      <p className="mt-1 text-lg font-semibold text-emerald-900">{queueTotal}</p>
                    </div>
                    <div className="rounded-xl border border-emerald-200/70 bg-white/80 p-3">
                      <p className="text-xs uppercase tracking-wide text-emerald-700">Classification Confidence</p>
                      <p className="mt-1 text-lg font-semibold text-emerald-900">
                        {confidenceValue !== null ? confidenceValue.toFixed(2) : "n/a"}
                      </p>
                    </div>
                    <div className="rounded-xl border border-emerald-200/70 bg-white/80 p-3">
                      <p className="text-xs uppercase tracking-wide text-emerald-700">Classification Reason</p>
                      <p className="mt-1 text-sm font-medium text-emerald-900">
                        {classificationReason || "No reason provided."}
                      </p>
                    </div>
                    <div className="rounded-xl border border-emerald-200/70 bg-white/80 p-3">
                      <p className="text-xs uppercase tracking-wide text-emerald-700">Companies</p>
                      <p className="mt-1 text-lg font-semibold text-emerald-900">
                        {companiesCount !== null ? companiesCount : "n/a"}
                      </p>
                    </div>
                    <div className="rounded-xl border border-emerald-200/70 bg-white/80 p-3">
                      <p className="text-xs uppercase tracking-wide text-emerald-700">Profiles</p>
                      <p className="mt-1 text-lg font-semibold text-emerald-900">
                        {profilesCount !== null ? profilesCount : "n/a"}
                      </p>
                    </div>
                    <div className="rounded-xl border border-emerald-200/70 bg-white/80 p-3 sm:col-span-2">
                      <p className="text-xs uppercase tracking-wide text-emerald-700">Messages</p>
                      <p className="mt-1 text-lg font-semibold text-emerald-900">
                        {messagesCount !== null ? messagesCount : "n/a"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : null}

            {shouldShowQueue ? (
              <OutreachQueueTable
                queue={queue}
                isLoading={isQueueLoading}
                isDispatching={isDispatching}
                error={queueError}
                onRefresh={() => {
                  if (!runId) return;
                  void fetchQueue(runId);
                }}
                onDispatch={() => {
                  void handleDispatch();
                }}
              />
            ) : null}
          </section>

          <section className="space-y-6">
            <EventsTimeline events={runDetail?.events} />

            {runError ? (
              <Card className="border-red-200/80 bg-red-50/65">
                <CardHeader>
                  <CardTitle className="text-lg text-red-900">Run API Error</CardTitle>
                  <CardDescription className="text-red-700/90">
                    Polling hit an API error. You can refresh after checking backend/token config.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-sm font-medium text-red-900">{runError.message}</p>
                  <p className="text-xs text-red-700">HTTP {runError.status}</p>
                  {runError.detail ? (
                    <details>
                      <summary className="cursor-pointer text-xs font-medium text-red-800">Raw error detail</summary>
                      <pre className="mt-2 max-h-52 overflow-auto rounded-lg bg-white/80 p-2 text-xs text-red-900">
                        {stringifyValue(runError.detail)}
                      </pre>
                    </details>
                  ) : null}
                </CardContent>
              </Card>
            ) : null}

            {readinessState === "error" && readinessDetail ? (
              <Card className="border-amber-200/80 bg-amber-50/70">
                <CardHeader>
                  <CardTitle className="text-lg text-amber-900">Backend Readiness Details</CardTitle>
                  <CardDescription className="text-amber-700/90">
                    This usually means env variables or callback configuration are incomplete.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <pre className="max-h-60 overflow-auto rounded-lg bg-white/85 p-2 text-xs text-amber-900">
                    {stringifyValue(readinessDetail)}
                  </pre>
                </CardContent>
              </Card>
            ) : null}
          </section>
        </div>
      </div>
    </div>
  );
}
