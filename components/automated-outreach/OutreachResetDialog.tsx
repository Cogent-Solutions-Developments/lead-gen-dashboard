"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { controlOutreach } from "@/lib/automatedOutreachApi";
import type { OutreachLead } from "@/lib/automatedOutreach";

export function OutreachResetDialog({lead, onClose, onReset}: {lead: OutreachLead; onClose: () => void; onReset: () => void}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {const element = dialog.current; const previous = document.activeElement as HTMLElement | null; element?.showModal(); return () => {element?.close(); previous?.focus();};}, []);
  return createPortal(<dialog ref={dialog} aria-labelledby="reset-outreach-title" onCancel={event => {event.preventDefault(); if (!busy) onClose();}} className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl backdrop:bg-black/40 backdrop:backdrop-blur-sm dark:bg-slate-950 dark:text-slate-100">
    <RotateCcw className="mb-3 h-6 w-6 text-violet-600" /><h2 id="reset-outreach-title" className="text-lg font-semibold">Reset unsent content?</h2>
    <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-400">Clear the prepared content for the {3 - lead.sentCount} unsent email{3 - lead.sentCount === 1 ? "" : "s"} for <strong>{lead.lead.name}</strong>. Content will be prepared again automatically when this event is ready.</p>
    <p className="mt-3 text-xs leading-5 text-slate-500">{lead.sentCount > 0 ? `${lead.sentCount} sent email${lead.sentCount === 1 ? "" : "s"}, their content and delivery receipts stay read-only. ` : ""}The send count, next scheduled time, delivery controls and lead status stay the same.</p>
    {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
    <div className="mt-6 flex flex-wrap justify-end gap-2"><Button type="button" variant="outline" disabled={busy} onClick={onClose}>Cancel</Button><Button type="button" disabled={busy} className="bg-violet-600 text-white hover:bg-violet-700" onClick={async () => {setBusy(true); setError(null); try {await controlOutreach(lead.id, "reset"); onReset();} catch (error) {setError(error instanceof Error ? error.message : "Could not reset outreach");} finally {setBusy(false);}}}>{busy ? "Resetting…" : "Reset unsent content"}</Button></div>
  </dialog>, document.body);
}
