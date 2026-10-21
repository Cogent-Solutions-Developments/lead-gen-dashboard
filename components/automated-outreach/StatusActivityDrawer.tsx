"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowRight, ChevronDown, ChevronUp, History, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { statusLabel } from "@/lib/automatedOutreach";
import { statusActivityPath, statusActivityTime, type StatusActivityLead, type StatusActivityPage, type StatusHistoryEntry } from "@/lib/statusOutreachActivity";
import { useStatusActivity } from "@/hooks/useStatusActivity";
import { OutreachPagination } from "./OutreachPagination";

const muted = "text-zinc-500 dark:text-zinc-400";

function WorkflowHistory({ id }: { id: string }) {
  const [page, setPage] = useState(1);
  const { data, error, reload } = useStatusActivity<StatusActivityPage<StatusHistoryEntry>>(
    `/status-activity/leads/${encodeURIComponent(id)}/history?offset=${(page - 1) * 10}&limit=10`, 15000);
  return <section aria-label="Lead workflow history" className="mt-4 border-t border-zinc-200 pt-4 dark:border-zinc-700">
    <p className={`mb-4 text-xs ${muted}`}>Newest first · Includes updates across the lead’s owners. Each entry identifies its owner.</p>
    {error && <p role="alert" className="mb-3 text-sm text-red-700 dark:text-red-400">{error} <button type="button" onClick={reload} className="underline">Retry</button></p>}
    {!data && !error && <p role="status" className={`text-sm ${muted}`}>Loading history…</p>}
    {data && !data.total && <p className={`text-sm ${muted}`}>No workflow history has been recorded for this lead.</p>}
    <ol className="space-y-4">{data?.items.map(entry => <li key={entry.id} className="relative border-l-2 border-blue-200 pl-4 dark:border-blue-900">
      <span aria-hidden="true" className="absolute -left-[5px] top-1 h-2 w-2 rounded-full bg-blue-500" />
      <p className="flex flex-wrap items-center gap-1.5 text-sm font-medium">
        {entry.previousStatus === entry.status ? <>Comment / workflow update · {statusLabel(entry.status)}</> : <>{entry.previousStatus ? statusLabel(entry.previousStatus) : "First recorded status"}<ArrowRight aria-hidden="true" className="h-3.5 w-3.5 text-zinc-400" />{statusLabel(entry.status)}</>}
      </p>
      <p className="mt-1 text-xs"><span className="font-medium">{entry.actor || "Updater not recorded"}</span><span className={muted}> · <time dateTime={entry.at}>{statusActivityTime(entry.at)}</time></span></p>
      <p className={`mt-1 text-xs ${muted}`}>Lead owner: {entry.owner || "Not recorded"}</p>
      {entry.previousStatus && <p className={`mt-1 text-xs ${muted}`}>Previous update: {entry.previousActor || "Updater not recorded"} · {statusActivityTime(entry.previousAt)}</p>}
      {entry.comment && <blockquote className="mt-2 whitespace-pre-wrap break-words rounded-lg bg-zinc-50 p-3 text-sm leading-6 dark:bg-zinc-800">{entry.comment}</blockquote>}
    </li>)}</ol>
    {data && data.total > 10 && <div className="mt-4"><OutreachPagination page={page} pageSize={10} total={data.total} onChange={setPage} /></div>}
  </section>;
}

function StatusLeadCard({ lead }: { lead: StatusActivityLead }) {
  const [expanded, setExpanded] = useState(false);
  return <article className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
    <div className="flex flex-wrap items-start justify-between gap-2">
      <div className="min-w-0"><h3 className="break-words font-semibold">{lead.name}</h3><p className={`mt-0.5 break-words text-xs ${muted}`}>{[lead.company, lead.email].filter(Boolean).join(" · ") || "Contact details not recorded"}</p></div>
      <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 dark:bg-blue-950 dark:text-blue-300">{statusLabel(lead.status)}</span>
    </div>
    <p className="mt-3 text-sm font-medium">{lead.eventName}</p>
    <p className={`mt-0.5 text-xs ${muted}`}>{statusLabel(lead.department)} · Lead owner: {lead.owner || "Not recorded"}</p>
    <dl className="mt-4 grid gap-4 rounded-lg bg-zinc-50 p-3 text-xs dark:bg-zinc-800/60 sm:grid-cols-2">
      <div><dt className={muted}>Latest workflow update</dt><dd className="mt-1 font-medium">{lead.actor || "Updater not recorded"}</dd><dd className={`mt-1 ${muted}`}><time dateTime={lead.updatedAt}>{statusActivityTime(lead.updatedAt)}</time></dd></div>
      <div><dt className={muted}>Previous recorded status</dt><dd className="mt-1 font-medium">{lead.previousStatus ? statusLabel(lead.previousStatus) : "Not recorded"}</dd>{lead.previousStatus && <dd className={`mt-1 ${muted}`}>{lead.previousActor || "Updater not recorded"}<br />{statusActivityTime(lead.previousAt)}</dd>}</div>
    </dl>
    {lead.comment && <div className="mt-3"><p className={`text-xs ${muted}`}>Latest comment</p><p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6">{lead.comment}</p></div>}
    <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
      <p className={`text-xs ${muted}`}>Outreach delivery: {statusLabel(lead.deliveryState)}</p>
      <Button type="button" variant="outline" className="h-8 gap-1.5 text-xs" aria-expanded={expanded} aria-controls={`workflow-history-${lead.id}`} onClick={() => setExpanded(value => !value)}><History aria-hidden="true" className="h-3.5 w-3.5" />{expanded ? "Hide history" : "View status history"}{expanded ? <ChevronUp aria-hidden="true" className="h-3.5 w-3.5" /> : <ChevronDown aria-hidden="true" className="h-3.5 w-3.5" />}</Button>
    </div>
    <div id={`workflow-history-${lead.id}`}>{expanded && <WorkflowHistory id={lead.id} />}</div>
  </article>;
}

export function StatusActivityDrawer({ status, department, eventKey, eventName, onClose }: {
  status: { key: string; label: string }; department: string; eventKey: string; eventName: string; onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [page, setPage] = useState(1);
  const [draft, setDraft] = useState("");
  const [search, setSearch] = useState("");
  const query = statusActivityPath(department, eventKey, { status: status.key, search, offset: String((page - 1) * 20), limit: "20" });
  const { data, error, reload, refreshing } = useStatusActivity<StatusActivityPage<StatusActivityLead>>(`/status-activity/leads?${query}`, 15000);
  useEffect(() => {
    const element = dialog.current;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    element?.showModal();
    return () => { element?.close(); document.body.style.overflow = previousOverflow; previousFocus?.focus(); };
  }, []);
  return createPortal(<dialog ref={dialog} aria-labelledby="status-cluster-title" onCancel={onClose} onClick={event => { if (event.target === event.currentTarget) onClose(); }}
    className="fixed inset-y-0 left-auto right-0 m-0 h-dvh max-h-dvh w-full max-w-3xl overflow-y-auto border-l border-zinc-200 bg-zinc-50 p-0 text-zinc-900 shadow-2xl backdrop:bg-zinc-950/35 backdrop:backdrop-blur-[2px] dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 sm:rounded-l-2xl">
    <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-900">
      <div className="flex items-start justify-between gap-4">
        <div><p className={`text-xs font-medium ${muted}`}>Lead status activity</p><h2 id="status-cluster-title" className="mt-1 text-xl font-semibold">{status.label}<span className={`ml-2 text-sm font-normal ${muted}`}>{data ? `${data.total.toLocaleString()} leads` : ""}</span></h2></div>
        <Button type="button" autoFocus variant="outline" size="icon" aria-label="Close status details" onClick={onClose}><X aria-hidden="true" className="h-4 w-4" /></Button>
      </div>
      <p className={`mt-2 text-sm ${muted}`}>{department ? statusLabel(department) : "All departments"} · {eventName}</p>
      <form className="mt-4 flex gap-2" onSubmit={event => { event.preventDefault(); setSearch(draft.trim()); setPage(1); }}>
        <label className="sr-only" htmlFor="status-lead-search">Search leads by name, company or email</label>
        <input id="status-lead-search" type="search" maxLength={200} value={draft} onChange={event => setDraft(event.target.value)} placeholder="Name, company or email" className="h-9 min-w-0 flex-1 rounded-lg border border-zinc-300 bg-transparent px-3 text-sm dark:border-zinc-700" />
        <Button type="submit" variant="outline" className="h-9"><Search aria-hidden="true" className="h-4 w-4" />Search</Button>
      </form>
      <div className={`mt-3 flex flex-wrap items-center justify-between gap-2 text-xs ${muted}`}><span>Refreshes every 15 seconds · Times in {Intl.DateTimeFormat().resolvedOptions().timeZone}</span><button type="button" disabled={refreshing} onClick={reload} className="text-blue-600 underline disabled:opacity-50 dark:text-blue-400">{refreshing ? "Refreshing…" : "Refresh"}</button></div>
    </header>
    <div className="space-y-4 p-5">
      {error && <p role="alert" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{data ? "Showing the last successful update. " : ""}{error} <button type="button" className="underline" onClick={reload}>Retry</button></p>}
      {!data && !error && <p role="status" className={`py-10 text-center text-sm ${muted}`}>Loading leads and their latest updates…</p>}
      {data && !data.items.length && <div className={`py-10 text-center text-sm ${muted}`}><p>{data.total ? "Leads moved to another page as statuses changed." : search ? "No leads match your search." : "No tracked leads currently have this status."}</p>{(page > 1 || search) && <button type="button" className="mt-3 text-blue-600 underline" onClick={() => { setPage(1); setSearch(""); setDraft(""); }}>Show all leads in this status</button>}</div>}
      {data?.items.map(lead => <StatusLeadCard key={lead.id} lead={lead} />)}
    </div>
    {data && <footer className="sticky bottom-0 border-t border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900"><OutreachPagination page={page} pageSize={20} total={data.total} onChange={setPage} /></footer>}
  </dialog>, document.body);
}
