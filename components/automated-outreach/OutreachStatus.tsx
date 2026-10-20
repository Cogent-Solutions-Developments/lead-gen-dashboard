"use client";

import { RefreshCw } from "lucide-react";
import { statusLabel } from "@/lib/automatedOutreach";

export function OutreachBadge({ value }: { value: string }) {
  const color = ["active", "sent", "delivered", "completed"].includes(value) ? "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:ring-emerald-800" : ["failed", "attention", "bounced", "uncertain"].includes(value) ? "bg-red-50 text-red-700 ring-red-200 dark:bg-red-950 dark:text-red-300 dark:ring-red-800" : "bg-zinc-100 text-zinc-600 ring-zinc-300 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-600";
  return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-medium ring-1 ring-inset ${color}`}>{statusLabel(value)}</span>;
}

export function OutreachFeedback({ error, loading, reload }: { error: string | null; loading: boolean; reload: () => void }) {
  if (error) return <div role="alert" className="my-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}<button type="button" className="ml-3 underline" onClick={reload}>Retry</button></div>;
  if (loading) return <p role="status" className="my-8 flex items-center gap-2 text-sm text-slate-500"><RefreshCw className="h-4 w-4 animate-spin" />Loading lead intelligence…</p>;
  return null;
}
