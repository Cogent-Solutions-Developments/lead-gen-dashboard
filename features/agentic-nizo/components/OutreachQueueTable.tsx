"use client";

import { Loader2, RefreshCcw, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { AgenticApiError } from "@/features/agentic-nizo/api/client";
import type { OutreachQueueResponse } from "@/features/agentic-nizo/api/types";

interface OutreachQueueTableProps {
  queue: OutreachQueueResponse | null;
  isLoading: boolean;
  isDispatching: boolean;
  error?: AgenticApiError | null;
  onRefresh: () => void;
  onDispatch: () => void;
}

function stringifyValue(value: unknown): string {
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
}

function statusTone(status: string | null | undefined): string {
  if (!status) return "border-zinc-200 bg-zinc-100 text-zinc-700";
  if (status === "failed" || status === "dead_letter" || status === "confirmed_failed") {
    return "border-red-200 bg-red-50 text-red-700";
  }
  if (status === "retry") return "border-amber-200 bg-amber-50 text-amber-700";
  if (status === "confirmed_sent" || status === "delivered_to_provider") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (status === "queued" || status === "locked" || status === "sending") {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }
  return "border-zinc-200 bg-zinc-100 text-zinc-700";
}

export function OutreachQueueTable({
  queue,
  isLoading,
  isDispatching,
  error,
  onRefresh,
  onDispatch,
}: OutreachQueueTableProps) {
  const rows = queue?.rows || [];

  return (
    <Card className="border-zinc-200/80 bg-white/92 shadow-[0_20px_36px_-30px_rgba(9,40,105,0.48)] backdrop-blur-sm">
      <CardHeader>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle className="text-xl text-zinc-900">Outreach Queue</CardTitle>
            <CardDescription>
              Provider/channel queue with delivery states, retries, and callback outcomes.
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onRefresh}
              disabled={isLoading}
              className="h-8 border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
              Refresh queue
            </Button>
            <Button type="button" onClick={onDispatch} disabled={isDispatching} className="btn-sidebar-noise h-8">
              {isDispatching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Manual dispatch
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50/80 p-3">
            <p className="text-sm font-medium text-red-900">{error.message}</p>
            {error.detail ? (
              <details className="mt-2">
                <summary className="cursor-pointer text-xs font-medium text-red-800">Raw error detail</summary>
                <pre className="mt-2 max-h-44 overflow-auto rounded-md bg-white/70 p-2 text-xs text-red-900">
                  {stringifyValue(error.detail)}
                </pre>
              </details>
            ) : null}
          </div>
        ) : null}

        {isLoading ? (
          <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50/75 px-4 py-6 text-center text-sm text-zinc-500">
            Loading queue rows...
          </div>
        ) : null}

        {!isLoading && rows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50/75 px-4 py-6 text-center text-sm text-zinc-500">
            No queue rows yet for this run.
          </div>
        ) : null}

        {!isLoading && rows.length > 0 ? (
          <div className="overflow-x-auto rounded-xl border border-zinc-200">
            <table className="min-w-full border-collapse bg-white text-left text-sm">
              <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
                <tr>
                  <th className="px-3 py-2">Provider</th>
                  <th className="px-3 py-2">Channel</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Attempts</th>
                  <th className="px-3 py-2">Due</th>
                  <th className="px-3 py-2">Callback</th>
                  <th className="px-3 py-2">Last error</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-t border-zinc-100 align-top text-zinc-700">
                    <td className="px-3 py-3">{row.provider || "-"}</td>
                    <td className="px-3 py-3">{row.channel || "-"}</td>
                    <td className="px-3 py-3">
                      <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${statusTone(row.status)}`}>
                        {row.status || "-"}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      {(row.attempts ?? 0).toString()} / {(row.max_attempts ?? 0).toString()}
                    </td>
                    <td className="px-3 py-3">{formatDate(row.due_at)}</td>
                    <td className="px-3 py-3">{row.callback_status || "-"}</td>
                    <td className="max-w-[14rem] truncate px-3 py-3" title={row.last_error || ""}>
                      {row.last_error || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
