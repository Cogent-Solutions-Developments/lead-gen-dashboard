"use client";

import { Loader2, RefreshCcw, Radar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { RunDetailResponse } from "@/features/agentic-nizo/api/types";

interface RunStatusPanelProps {
  runId: string | null;
  runDetail: RunDetailResponse | null;
  isPolling: boolean;
  isRefreshing: boolean;
  lastUpdatedAt: Date | null;
  onRefresh: () => void;
}

const STATUS_STYLES: Record<string, string> = {
  created: "border-zinc-200 bg-zinc-100 text-zinc-700",
  running: "border-blue-200 bg-blue-50 text-blue-700",
  needs_user_input: "border-amber-200 bg-amber-50 text-amber-700",
  completed: "border-emerald-200 bg-emerald-50 text-emerald-700",
  failed: "border-red-200 bg-red-50 text-red-700",
  cancelled: "border-zinc-300 bg-zinc-100 text-zinc-600",
};

function getStatusStyle(status: string | undefined) {
  if (!status) return "border-zinc-200 bg-zinc-100 text-zinc-700";
  return STATUS_STYLES[status] || "border-zinc-200 bg-zinc-100 text-zinc-700";
}

export function RunStatusPanel({
  runId,
  runDetail,
  isPolling,
  isRefreshing,
  lastUpdatedAt,
  onRefresh,
}: RunStatusPanelProps) {
  const statusValue = runDetail?.status || (runId ? "loading" : "idle");
  const pipelineValue = runDetail?.pipeline || "pending";
  const stageValue = runDetail?.stage || "awaiting_intake";

  return (
    <div className="sticky top-4 z-20 rounded-2xl border border-zinc-200/80 bg-white/88 px-4 py-3 shadow-[0_20px_30px_-26px_rgba(9,40,105,0.55)] backdrop-blur-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
            <Radar className={`h-5 w-5 ${isPolling ? "animate-pulse" : ""}`} />
          </div>
          <div>
            <p className="text-sm font-semibold text-zinc-900">Run Status</p>
            <p className="text-xs text-zinc-500">
              {runId ? `Run ID: ${runId}` : "Start a run to see pipeline progress."}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge className={`border ${getStatusStyle(statusValue)}`}>{statusValue}</Badge>
          <Badge variant="outline" className="border-blue-100 bg-blue-50 text-blue-700">
            pipeline: {pipelineValue}
          </Badge>
          <Badge variant="outline" className="border-zinc-200 bg-zinc-50 text-zinc-700">
            stage: {stageValue}
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <p className="text-xs text-zinc-500">
            {lastUpdatedAt ? `Updated ${lastUpdatedAt.toLocaleTimeString()}` : "No run updates yet."}
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={onRefresh}
            disabled={!runId || isRefreshing}
            className="h-8 border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
          >
            {isRefreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
            Refresh
          </Button>
        </div>
      </div>
    </div>
  );
}
