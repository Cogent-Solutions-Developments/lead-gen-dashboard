"use client";

import { Mail } from "lucide-react";
import { outreachDate, type OutreachLead } from "@/lib/automatedOutreach";
import { outreachDeliverySteps, outreachTimelineDate } from "@/lib/outreachDeliveryTimeline";

export function OutreachDeliveryTimeline({ lead, selectedStep, onSelect }: { lead: OutreachLead; selectedStep: string; onSelect: (step: string) => void }) {
  const steps = outreachDeliverySteps(lead);
  const selected = steps.find(item => String(item.step) === selectedStep) ?? steps[0];
  return <section aria-label="Status Outreach email timeline" className="rounded-xl border border-violet-100 bg-[linear-gradient(135deg,rgba(245,243,255,0.9),rgba(255,255,255,0.96))] p-3 sm:p-4 dark:border-violet-900 dark:bg-none dark:bg-violet-950/20">
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">Outreach status</h3><p className="mt-0.5 text-[11px] text-zinc-500">{lead.sentCount} of 3 emails sent · four days apart. Select an email to view its content and delivery details.</p></div><span className="rounded-full border border-violet-200 bg-violet-100 px-2 py-0.5 text-[10px] font-semibold text-violet-700 dark:border-violet-800 dark:bg-violet-950 dark:text-violet-300">{selected.label}</span></div>
    <ol className="flex items-start" aria-label="Three automatic outreach emails">
      {steps.map((item, index) => {
        const active = String(item.step) === selectedStep;
        return <li key={item.step} className="flex min-w-0 flex-1 items-start last:flex-none">
          <button type="button" aria-pressed={active} aria-label={`${item.label}: ${item.state}${item.date ? `, ${outreachDate(item.date)}` : ""}`} onClick={() => onSelect(String(item.step))} className="group flex w-24 flex-col items-center gap-1.5 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-violet-600 sm:w-28">
            <span className={`flex h-9 w-9 items-center justify-center rounded-full border-2 transition-colors ${active ? "border-violet-600 bg-violet-600 text-white shadow-[0_8px_16px_-10px_rgba(124,58,237,0.9)]" : item.needsAttention ? "border-red-300 bg-red-50 text-red-600" : item.confirmed ? "border-violet-300 bg-violet-100 text-violet-700" : "border-zinc-200 bg-white text-zinc-400 group-hover:border-violet-300 group-hover:text-violet-600 dark:border-zinc-600 dark:bg-zinc-900"}`}><Mail className="h-4 w-4" /></span>
            <span className={`text-center text-[11px] font-semibold leading-tight ${active ? "text-violet-700 dark:text-violet-300" : "text-zinc-600 dark:text-zinc-300"}`}>{item.label}</span>
            <span className={`text-center text-[10px] leading-tight ${item.needsAttention ? "text-red-600" : "text-zinc-500"}`}>{item.state}</span>
            {item.date && <time dateTime={item.date} title={outreachDate(item.date)} className="text-center text-[10px] leading-tight text-zinc-500">{item.scheduled ? "Due " : ""}{outreachTimelineDate(item.date)}</time>}
          </button>
          {index < steps.length - 1 && <span aria-hidden="true" className={`mt-4 h-0.5 min-w-2 flex-1 rounded-full ${item.confirmed ? "bg-violet-300" : "bg-zinc-200 dark:bg-zinc-700"}`} />}
        </li>;
      })}
    </ol>
  </section>;
}