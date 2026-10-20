"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LeadSheetFilterButtons, leadSheetToolbarClassName } from "@/components/leads/LeadSheetPresentation";
import { outreachDate, statusLabel, type OutreachLead } from "@/lib/automatedOutreach";
import { OutreachAuditLog } from "./OutreachAuditLog";
import { OutreachBadge } from "./OutreachStatus";

export function OutreachLeadReview({ lead, initialView, onClose }: { lead: OutreachLead; initialView: "content" | "history"; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [view, setView] = useState(initialView);
  const [step, setStep] = useState(String(Math.max(1, ...lead.messages.map((message) => message.step))));
  useEffect(() => {
    const element = dialog.current;
    const previousFocus = document.activeElement as HTMLElement | null;
    element?.showModal();
    return () => { element?.close(); previousFocus?.focus(); };
  }, []);
  const message = lead.messages.find((item) => item.step === Number(step));
  return createPortal(<dialog ref={dialog} aria-labelledby={`review-${lead.id}`} onCancel={onClose} onClick={(event) => { if (event.target === event.currentTarget) onClose(); }} className="fixed inset-0 m-auto max-h-[85dvh] w-[calc(100%-2rem)] max-w-3xl overflow-y-auto rounded-2xl border border-zinc-300 bg-white p-0 text-zinc-900 shadow-2xl backdrop:bg-zinc-950/35 backdrop:backdrop-blur-[2px] dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100">
    <header className="flex items-start justify-between gap-4 border-b border-zinc-200 p-6 dark:border-zinc-700"><div><h2 id={`review-${lead.id}`} className="text-xl font-semibold tracking-tight">Follow-up details</h2><p className="mt-1 text-sm text-zinc-500">{lead.lead.name} · {lead.email || "Email missing"}</p></div><Button type="button" variant="ghost" aria-label="Close follow-up details" onClick={onClose} className="h-8 w-8 p-0"><X className="h-4 w-4" /></Button></header>
    <div className="space-y-5 p-6">
      <nav aria-label="Follow-up details" className={leadSheetToolbarClassName}><LeadSheetFilterButtons items={[{ key: "content", label: "Content & delivery" }, { key: "history", label: "Activity history" }]} value={view} onChange={setView} /></nav>
      {view === "history" ? <OutreachAuditLog enrollmentId={lead.id} /> : <>
        <div className="flex flex-wrap items-center justify-between gap-3"><nav aria-label="Follow-up email" className={leadSheetToolbarClassName}><LeadSheetFilterButtons items={[1, 2, 3].map((number) => ({ key: String(number), label: `Follow-up ${number}` }))} value={step} onChange={setStep} /></nav><OutreachBadge value={message?.status || (lead.state === "active" ? "scheduled" : lead.state)} /></div>
        {message ? <div className="space-y-4"><h3 className="font-semibold">{message.subject || "Content not generated"}</h3>{message.body && <p className="whitespace-pre-wrap text-sm leading-7 text-zinc-600 dark:text-zinc-300">{message.body}</p>}{message.error && <p className="text-sm text-red-600">{message.error}</p>}
          <section className="border-t border-zinc-200 pt-4 dark:border-zinc-700"><h3 className="mb-3 text-sm font-semibold">Delivery tracking</h3><dl className="grid gap-2 text-xs">{Object.entries(message.tracking).filter(([key]) => key.endsWith("At") && key !== "countedAt").map(([key, value]) => <div key={key} className="flex flex-wrap justify-between gap-2"><dt className="text-zinc-500">{statusLabel(key.replace(/At$/, ""))}</dt><dd>{outreachDate(value)}</dd></div>)}</dl>{!Object.keys(message.tracking).length && <p className="text-xs text-zinc-500">No delivery updates yet.</p>}{message.status === "accepted" && <p className="mt-2 text-xs text-amber-700">Awaiting send confirmation</p>}</section>
          <details className="border-t border-zinc-200 pt-3 text-xs text-zinc-500 dark:border-zinc-700"><summary className="cursor-pointer">Technical details</summary><div className="mt-3 space-y-2 break-all">{message.intent && <p>Approach: {message.intent}</p>}<p>Configuration revision: {message.configRevision}</p><p>Message ID: {message.id}</p>{message.tracking.providerMessageId && <p>Provider ID: {message.tracking.providerMessageId}</p>}</div></details>
        </div> : <div className="rounded-lg border border-zinc-200 p-5 text-sm text-zinc-500 dark:border-zinc-700"><p>Content is generated automatically when this follow-up is due.</p>{lead.reason && <p className="mt-2">{lead.reason}</p>}</div>}
        <p className="text-xs text-zinc-400">Enrolled {outreachDate(lead.enrolledAt)} · {lead.sentCount} of 3 emails sent</p>
      </>}
    </div>
  </dialog>, document.body);
}
