"use client";

import { useMemo } from "react";
import { Clock3, GitFork, ListTree } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { RunEvent } from "@/features/agentic-nizo/api/types";

interface EventsTimelineProps {
  events?: RunEvent[];
}

function stringifyValue(value: unknown): string {
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function toEventTimestampValue(input: string | undefined, fallbackIndex: number): number {
  if (!input) return fallbackIndex;
  const parsed = Date.parse(input);
  return Number.isNaN(parsed) ? fallbackIndex : parsed;
}

function statusTone(status: string | undefined): string {
  if (!status) return "border-zinc-200 bg-zinc-100 text-zinc-700";
  if (status.includes("fail")) return "border-red-200 bg-red-50 text-red-700";
  if (status.includes("success") || status === "completed") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status.includes("running")) return "border-blue-200 bg-blue-50 text-blue-700";
  return "border-zinc-200 bg-zinc-100 text-zinc-700";
}

export function EventsTimeline({ events = [] }: EventsTimelineProps) {
  const sortedEvents = useMemo(() => {
    return events
      .map((event, index) => ({
        event,
        index,
        sortKey: toEventTimestampValue(event.created_at, index),
      }))
      .sort((a, b) => a.sortKey - b.sortKey);
  }, [events]);

  return (
    <Card className="border-zinc-200/80 bg-white/92 shadow-[0_20px_36px_-30px_rgba(9,40,105,0.48)] backdrop-blur-sm">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
            <ListTree className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-xl text-zinc-900">Execution Timeline</CardTitle>
            <CardDescription>Stage-by-stage event trail from the backend workflow.</CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {sortedEvents.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50/75 px-4 py-6 text-center text-sm text-zinc-500">
            Events will appear once the run begins processing.
          </div>
        ) : (
          <div className="space-y-4">
            {sortedEvents.map(({ event, index }) => (
              <article
                key={`${event.id || event.created_at || "event"}-${index}`}
                className="rounded-xl border border-zinc-200 bg-white/80 p-4 shadow-[0_8px_24px_-22px_rgba(9,40,105,0.6)]"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <GitFork className="h-4 w-4 text-blue-700" />
                    <p className="text-sm font-semibold text-zinc-900">{event.stage || "unknown_stage"}</p>
                  </div>
                  <Badge className={`border ${statusTone(event.status)}`}>{event.status || "unknown"}</Badge>
                </div>

                <p className="mt-2 text-sm leading-6 text-zinc-700">{event.message || "No event message provided."}</p>

                <div className="mt-3 flex items-center gap-1 text-xs text-zinc-500">
                  <Clock3 className="h-3.5 w-3.5" />
                  {event.created_at ? new Date(event.created_at).toLocaleString() : "Timestamp unavailable"}
                </div>

                <details className="mt-3">
                  <summary className="cursor-pointer text-xs font-medium text-zinc-700">View payload</summary>
                  <pre className="mt-2 max-h-56 overflow-auto rounded-lg bg-zinc-900 px-3 py-2 text-xs text-zinc-100">
                    {stringifyValue(event.payload ?? {})}
                  </pre>
                </details>
              </article>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
