"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Mail, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LeadSheetFilterButtons, leadSheetToolbarClassName } from "@/components/leads/LeadSheetPresentation";
import { outreachDate, statusLabel, type OutreachLead, type OutreachMessage } from "@/lib/automatedOutreach";
import { useOutreachResource } from "@/hooks/useOutreachResource";
import { prepareOutreachContent } from "@/lib/automatedOutreachApi";
import { OutreachAuditLog } from "./OutreachAuditLog";
import { OutreachDeliveryTimeline } from "./OutreachDeliveryTimeline";

export function OutreachLeadReview({ lead, initialView, onClose }: { lead: OutreachLead; initialView: "content" | "history"; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [view, setView] = useState(initialView);
  const [step, setStep] = useState(String(Math.min(3, lead.sentCount + 1)));
  useEffect(() => {
    const element = dialog.current;
    const previousFocus = document.activeElement as HTMLElement | null;
    element?.showModal();
    return () => { element?.close(); previousFocus?.focus(); };
  }, []);
  const [preparationError, setPreparationError] = useState<string | null>(null);
  const [preparing, setPreparing] = useState(false);
  const { data: content, error: contentError, reload: reloadContent } = useOutreachResource<{ messages: OutreachMessage[] }>(`/leads/${encodeURIComponent(lead.id)}/content`, 3000);
  useEffect(() => {
    if (view !== "content" || lead.sentCount >= 3) return;
    let active = true;
    prepareOutreachContent(lead.id).then(() => { if (active) { setPreparationError(null); reloadContent(); } }).catch(error => { if (active) setPreparationError(error instanceof Error ? error.message : "Could not prepare content"); });
    return () => { active = false; };
  }, [lead.id, lead.sentCount, view, reloadContent]);
  async function retryContent() {
    setPreparing(true); setPreparationError(null);
    try { await prepareOutreachContent(lead.id, true); reloadContent(); }
    catch (error) { setPreparationError(error instanceof Error ? error.message : "Could not prepare content"); }
    finally { setPreparing(false); }
  }
  const currentLead = { ...lead, messages: content?.messages ?? lead.messages };
  const message = currentLead.messages.find((item) => item.step === Number(step));
  const isPreview = message?.status.startsWith("preview");
  const pending = !message || ["preview_queued", "preview_generating", "generating"].includes(message.status);
  return createPortal(<dialog ref={dialog} aria-labelledby={`review-${lead.id}`} onCancel={onClose} onClick={(event) => { if (event.target === event.currentTarget) onClose(); }} className="fixed inset-0 m-auto max-h-[85dvh] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto rounded-2xl border border-zinc-300 bg-white p-0 text-zinc-900 shadow-2xl backdrop:bg-zinc-950/35 backdrop:backdrop-blur-[2px] dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100">
    <header className="sticky top-0 z-10 bg-white dark:bg-zinc-900 flex items-start justify-between gap-4 border-b border-zinc-200 p-6 dark:border-zinc-700"><div><div className="flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-md border border-violet-200 bg-violet-50 text-violet-700"><Mail className="h-4 w-4" /></span><h2 id={`review-${lead.id}`} className="text-base font-semibold">Status Outreach</h2></div><p className="mt-1 text-sm text-zinc-500">{lead.lead.name} · {lead.email || "Email missing"}</p><p className="mt-2 text-sm font-medium">{lead.eventName}</p><p className="mt-1 text-xs text-zinc-500">{statusLabel(lead.department)} · Lead status: {statusLabel(lead.workflowStatus)}</p></div><Button type="button" variant="ghost" aria-label="Close outreach details" onClick={onClose} className="h-8 w-8 p-0"><X className="h-4 w-4" /></Button></header>
    <div className="space-y-5 p-6">
      <nav aria-label="Outreach details" className={leadSheetToolbarClassName}><LeadSheetFilterButtons items={[{ key: "content", label: "Content & delivery" }, { key: "history", label: "Activity history" }]} value={view} onChange={setView} /></nav>
      {view === "history" ? <OutreachAuditLog enrollmentId={lead.id} /> : <>
        <OutreachDeliveryTimeline lead={currentLead} selectedStep={step} onSelect={setStep} />
        {(preparationError || contentError) && <div role="alert" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"><p>{preparationError || contentError}</p><Button type="button" variant="outline" disabled={preparing} onClick={() => void retryContent()} className="mt-2">Retry content preparation</Button></div>}
        {isPreview && message?.subject && <p className="text-xs text-violet-700 dark:text-violet-300">Content preview · prepared {outreachDate(message.updatedAt)}. Final content is refreshed before sending using the latest lead status and previous sent emails.</p>}
        {pending && !preparationError && <p role="status" className="text-sm text-zinc-500">{message?.status === "preview_generating" || message?.status === "generating" ? "Preparing this email with the content agents…" : "Content preparation is queued. The subject and email body will appear here automatically."}</p>}
        {message?.status === "preview_failed" && <Button type="button" variant="outline" disabled={preparing} onClick={() => void retryContent()}>Retry content preparation</Button>}
        {message ? <div className="space-y-4"><section aria-label="Email subject" className="space-y-1.5"><h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Subject</h3><p className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700">{message.subject || "Content not generated"}</p></section><section aria-label="Email body" className="space-y-1.5"><h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Email body</h3><div className="max-h-64 overflow-y-auto whitespace-pre-wrap rounded-md border border-zinc-300 px-3 py-2 text-sm leading-6 text-zinc-700 dark:border-zinc-700 dark:text-zinc-300">{message.body || "Content has not been generated yet."}</div></section>{message.error && <p className="text-sm text-red-600">{message.error}</p>}
          {!isPreview && <section className="border-t border-zinc-200 pt-4 dark:border-zinc-700"><h3 className="mb-3 text-sm font-semibold">Delivery tracking</h3><dl className="grid gap-2 text-xs">{Object.entries(message.tracking).filter(([key]) => key.endsWith("At") && key !== "countedAt").map(([key, value]) => <div key={key} className="flex flex-wrap justify-between gap-2"><dt className="text-zinc-500">{statusLabel(key.replace(/At$/, ""))}</dt><dd>{outreachDate(value)}</dd></div>)}</dl>{!Object.keys(message.tracking).length && <p className="text-xs text-zinc-500">No delivery updates yet.</p>}{message.status === "accepted" && <p className="mt-2 text-xs text-amber-700">Awaiting send confirmation</p>}</section>}
          <details className="border-t border-zinc-200 pt-3 text-xs text-zinc-500 dark:border-zinc-700"><summary className="cursor-pointer">Technical details</summary><div className="mt-3 space-y-2 break-all">{message.intent && <p>Approach: {message.intent}</p>}<p>Configuration revision: {message.configRevision}</p><p>Message ID: {message.id}</p>{message.tracking.providerMessageId && <p>Provider ID: {message.tracking.providerMessageId}</p>}</div></details>
        </div> : <div className="rounded-lg border border-zinc-200 p-5 text-sm text-zinc-500 dark:border-zinc-700"><h3 className="font-medium">Email content</h3><p className="mt-2">Preparing a preview for this outreach step does not send an email or change its schedule.</p>{lead.reason && <p className="mt-2">{lead.reason}</p>}</div>}
        <p className="text-xs text-zinc-400">Enrolled {outreachDate(lead.enrolledAt)} · {lead.sentCount} of 3 emails sent</p>
      </>}
    </div>
    <footer className="sticky bottom-0 flex justify-end border-t border-zinc-100 bg-white px-5 py-3 dark:border-zinc-700 dark:bg-zinc-900"><Button type="button" variant="outline" onClick={onClose}>Close</Button></footer>
  </dialog>, document.body);
}
