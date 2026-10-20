"use client";

import { useState } from "react";
import Link from "next/link";
import { deliveryStateLabels } from "@/lib/outreachActivity";
import { Eye, History, Pause, Play, RefreshCw, ShieldOff, Square } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { outreachActions, outreachDate, statusLabel, type OutreachAction, type OutreachLead } from "@/lib/automatedOutreach";
import { controlOutreach } from "@/lib/automatedOutreachApi";
import { OutreachBadge } from "./OutreachStatus";
import { OutreachLeadReview } from "./OutreachLeadReview";

const actions = {
  pause: { label: "Pause", icon: Pause }, resume: { label: "Resume", icon: Play },
  stop: { label: "Stop", icon: Square }, opt_out: { label: "Opt out", icon: ShieldOff },
  retry: { label: "Retry content", icon: RefreshCw },
};

export function OutreachLeadRow({ lead, number, showEvent, reload }: { lead: OutreachLead; number: number; showEvent?: boolean; reload: () => void }) {
  const [busy, setBusy] = useState(false);
  const [review, setReview] = useState<"content" | "history" | null>(null);
  const act = async (action: OutreachAction) => {
    setBusy(true);
    try { await controlOutreach(lead.id, action); toast.success(`${actions[action].label} applied`); reload(); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Could not update outreach"); }
    finally { setBusy(false); }
  };
  return <tr className="text-sm transition-colors hover:bg-white/40 dark:hover:bg-zinc-800/50">
    <td className="w-16 px-4 py-3.5"><span className="inline-flex h-7 min-w-7 items-center justify-center rounded-md border border-zinc-200 bg-white/70 px-1 text-xs text-zinc-500 dark:border-zinc-600 dark:text-zinc-300">{number}</span></td>
    <td className="max-w-72 px-4 py-3.5"><div className="flex flex-col"><span className="font-semibold text-zinc-900 dark:text-zinc-100">{lead.lead.name}</span><span className="text-xs text-zinc-500">{lead.lead.title || "—"}</span><span className="mt-0.5 text-xs text-zinc-400">{lead.lead.company || "—"}</span></div></td>
    {showEvent && <td className="min-w-56 max-w-80 px-4 py-3.5"><Link href={`/admin/lead-intelligence/${lead.department}/${encodeURIComponent(lead.eventKey)}`} className="text-sm font-medium text-zinc-800 hover:text-blue-700 hover:underline dark:text-zinc-200">{lead.eventName}</Link><p className="mt-1 text-xs text-zinc-500">{statusLabel(lead.department)}</p></td>}
    <td className="px-4 py-3.5"><div className="flex flex-col gap-1"><span className="break-all font-mono text-xs text-zinc-600 dark:text-zinc-300">{lead.email || "Email missing"}</span><span className="text-xs text-zinc-400">{lead.lead.phone}</span></div></td>
    <td className="px-4 py-3.5"><Button type="button" variant="outline" onClick={() => setReview("content")} aria-label={`View messages for ${lead.lead.name}`} className="h-8 gap-1.5 px-2.5 text-[11px]"><Eye className="h-3.5 w-3.5 text-zinc-400" />View</Button></td>
    <td className="px-4 py-3.5"><OutreachBadge value={lead.workflowStatus} /></td><td className="px-4 py-3.5"><div className="flex flex-col items-start gap-1.5"><span className="text-xs font-medium text-zinc-700 dark:text-zinc-300" title={lead.reason || undefined}>{deliveryStateLabels[lead.state] || statusLabel(lead.state)}</span>{lead.reason && <span className="max-w-48 text-xs text-zinc-500">{lead.reason}</span>}</div></td>
    <td className="px-4 py-3.5 text-center"><button type="button" onClick={() => setReview("content")} aria-label={`Delivery tracking for ${lead.lead.name}: ${lead.sentCount} of 3 sent`} className="inline-flex flex-col items-center gap-1.5 rounded-md p-1 focus-visible:outline-2 focus-visible:outline-blue-600"><span className="flex gap-1.5" aria-hidden="true">{[1, 2, 3].map((step) => <span key={step} className={`h-2.5 w-2.5 rounded-full ${step <= lead.sentCount ? "bg-emerald-500" : "bg-zinc-300 dark:bg-zinc-600"}`} />)}</span><span className="text-[10px] text-zinc-500">{lead.sentCount}/3 sent</span></button>{lead.nextDueAt && lead.state === "active" && <p className="mt-1 whitespace-nowrap text-[10px] text-zinc-400">Next: {outreachDate(lead.nextDueAt)}</p>}</td>
    <td className="px-4 py-3.5"><div className="flex justify-end gap-1.5">{outreachActions(lead).map((action) => {
      const { label, icon: Icon } = actions[action];
      return <Button key={action} type="button" variant="outline" disabled={busy} onClick={() => void act(action)} title={label} aria-label={`${label} outreach for ${lead.lead.name}`} className={`h-8 w-8 p-0 ${action === "opt_out" || action === "stop" ? "text-red-600 hover:border-red-200 hover:bg-red-50" : "text-zinc-500"}`}><Icon className="h-3.5 w-3.5" /></Button>;
    })}<Button type="button" variant="outline" onClick={() => setReview("history")} title="Activity history" aria-label={`Activity history for ${lead.lead.name}`} className="h-8 gap-1.5 px-2 text-xs text-zinc-600"><History className="h-3.5 w-3.5" />History</Button></div>
      {review && <OutreachLeadReview lead={lead} initialView={review} onClose={() => setReview(null)} />}
    </td>
  </tr>;
}
