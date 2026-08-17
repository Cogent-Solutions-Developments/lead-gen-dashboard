import { Loader2 } from "lucide-react";
import type { LeadOriginHistoryItem, WorkflowStatusHistoryItem } from "@/lib/apiRouter";
import { LeadOwnershipHistory } from "@/components/leads/LeadOriginTag";
import { formatUsd, workflowHistoryAttributionText } from "@/lib/leadWorkflowHistory";

function formatDateTime(value?: string | null) {
  if (!value) return "Time unavailable";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Time unavailable";
  return parsed.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function humanize(value: string) {
  return value.split(/[-_\s]+/).filter(Boolean).map((part) => part[0]?.toUpperCase() + part.slice(1)).join(" ");
}

export function LeadHistoryContent({
  kind,
  leadName,
  company,
  statusItems,
  ownerItems,
  loading,
  error,
  getStatusDotClass,
}: {
  kind: "status" | "owner";
  leadName: string;
  company: string;
  statusItems: WorkflowStatusHistoryItem[];
  ownerItems: LeadOriginHistoryItem[];
  loading: boolean;
  error?: string | null;
  getStatusDotClass: (status: string) => string;
}) {
  return (
    <div className="space-y-6">
      <div className="border-b border-zinc-100 pb-6">
        <p className="text-xs font-medium text-zinc-400">Selected profile</p>
        <h3 className="mt-2 text-2xl font-light tracking-tight text-zinc-950">{leadName || "-"}</h3>
        <p className="mt-1 text-sm font-light text-zinc-500">{company || "-"}</p>
      </div>

      {loading ? (
        <div className="flex h-32 items-center justify-center text-sm font-light text-zinc-400">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Loading history...
        </div>
      ) : error ? (
        <div className="border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      ) : kind === "owner" ? (
        <LeadOwnershipHistory items={ownerItems} />
      ) : statusItems.length === 0 ? (
        <div className="border border-zinc-200 bg-zinc-50 p-6 text-sm text-zinc-500">
          No status updates or comments have been recorded yet.
        </div>
      ) : (
        <div className="border-y border-zinc-300">
          <div className="flex items-center justify-between border-b border-zinc-200 py-3">
            <span className="text-xs font-medium text-zinc-400">Timeline</span>
            <span className="text-xs text-zinc-400">
              {statusItems.length} update{statusItems.length === 1 ? "" : "s"}
            </span>
          </div>
          <div className="max-h-[26rem] overflow-y-auto pr-1 scrollbar-modern">
            {statusItems.map((entry) => {
              const revenue = formatUsd(entry.dealAmountUsd);
              return (
                <article key={entry.id} className="group grid grid-cols-[2.75rem_minmax(0,1fr)] border-b border-zinc-100 last:border-b-0">
                  <div className="relative flex justify-center">
                    <span className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-blue-500/35" />
                    <span className="relative mt-5 flex h-[18px] w-[18px] items-center justify-center rounded-full border border-blue-500 bg-white shadow-[0_0_0_3px_rgba(37,99,235,0.08)]">
                      <span className={`h-2.5 w-2.5 rounded-full ${getStatusDotClass(entry.workflowStatus)}`} />
                    </span>
                  </div>
                  <div className="min-w-0 py-5 transition-colors group-hover:bg-zinc-50/40">
                    <div className="flex flex-wrap items-start justify-between gap-3 pr-1">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-base font-medium tracking-tight text-zinc-950">
                            {entry.workflowStatusLabel || humanize(entry.workflowStatus)}
                          </h4>
                          {revenue ? <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">{revenue}</span> : null}
                        </div>
                        <p className="mt-1 text-xs text-zinc-400">{workflowHistoryAttributionText(entry)}</p>
                      </div>
                      <time className="shrink-0 text-right text-xs leading-5 text-zinc-400">{formatDateTime(entry.createdAt)}</time>
                    </div>
                    <div className="mt-3 max-w-xl border-l border-zinc-200 pl-3">
                      <p className="whitespace-pre-wrap text-sm font-light leading-6 text-zinc-600">{entry.comment || "No comment added."}</p>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
