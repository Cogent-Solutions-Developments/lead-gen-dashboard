"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useOutreachResource } from "@/hooks/useOutreachResource";
import { recoverStatusOutreachRun } from "@/lib/automatedOutreachApi";
import { OutreachContentSettings } from "./OutreachContentSettings";
import { OutreachFeedback } from "./OutreachStatus";
import { OutreachOperations } from "./OutreachOperations";
import { StatusOutreachAnalytics, type OverviewMetrics } from "./StatusOutreachAnalytics";
import { StatusOutreachRuns, type Run, type RunFilter } from "./StatusOutreachRuns";

type Overview = OverviewMetrics & { items: Run[]; itemTotal: number };
type View = "overview" | "runs" | "delivery";
const panel = "rounded-[24px] border border-slate-200/80 bg-white p-4 shadow-[0_15px_40px_-28px_rgba(15,23,42,.25)] sm:p-6";
function dateRange() { const end = new Date(); const start = new Date(end); start.setUTCDate(start.getUTCDate() - 29); return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) }; }

export function StatusOutreachControlCenter({ view = "overview" }: { view?: View }) {
  const [range, setRange] = useState(dateRange);
  const [draftRange, setDraftRange] = useState(range);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<RunFilter>("all");
  const [search, setSearch] = useState("");
  const [recovering, setRecovering] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const pageSize = view === "runs" ? 10 : 1;
  const path = `/content/overview?startDate=${range.start}&endDate=${range.end}&offset=${view === "runs" ? (page - 1) * pageSize : 0}&limit=${pageSize}&runState=${filter}&search=${encodeURIComponent(search)}`;
  const { data, error, reload, refreshing } = useOutreachResource<Overview>(view === "delivery" ? null : path);
  async function recover(id: string) {
    setRecovering(id); setActionError(null); setNotice(null);
    try { await recoverStatusOutreachRun(id); setNotice("Recovery queued. The worker will resume saved checkpoints when the event and lead are eligible."); reload(); }
    catch (caught) { setActionError(caught instanceof Error ? caught.message : "Could not recover generation"); }
    finally { setRecovering(null); }
  }
  if (view === "delivery") return <section className={panel}><div className="mb-5"><p className="text-xs font-semibold uppercase tracking-[.18em] text-violet-600">Status Outreach / Delivery</p><h2 className="mt-1 text-2xl font-semibold text-slate-950">Delivery tracking</h2><p className="mt-1 text-sm text-slate-500">Find a lead, inspect all three emails and follow its delivery history.</p></div><OutreachOperations /></section>;
  return <div className="space-y-5">
    {view === "overview" && <OutreachContentSettings />}
    <section className={panel} aria-label="Status Outreach usage">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[.18em] text-violet-600">Status Outreach / {view === "runs" ? "Recovery" : "Analytics"}</p><h2 className="mt-1 text-2xl font-semibold text-slate-950">{view === "runs" ? "Runs & recovery" : "Usage & outcomes"}</h2><p className="mt-1 text-sm text-slate-500">Generated Status Outreach only · Dates use UTC · Refreshes every 30 seconds.</p></div><Button variant="outline" onClick={reload} disabled={refreshing}><RefreshCw className="h-4 w-4" />Refresh</Button></div>
      <form className="mt-5 flex flex-wrap items-end gap-3" onSubmit={event => { event.preventDefault(); setRange(draftRange); setPage(1); }}><label className="text-xs text-slate-600">From<Input aria-label="Status Outreach start date" type="date" required max={draftRange.end} value={draftRange.start} onChange={event => setDraftRange({...draftRange, start: event.target.value})} /></label><label className="text-xs text-slate-600">To<Input aria-label="Status Outreach end date" type="date" required min={draftRange.start} value={draftRange.end} onChange={event => setDraftRange({...draftRange, end: event.target.value})} /></label><Button type="submit" className="bg-blue-600 text-white">Apply range</Button></form>
      <OutreachFeedback error={error} loading={!data && !error} reload={reload} />
    </section>
    {data && view === "overview" && <StatusOutreachAnalytics data={data} start={range.start} end={range.end} />}
    {data && view === "runs" && <StatusOutreachRuns data={data} page={page} onPage={setPage} filter={filter} onFilter={value => {setFilter(value);setPage(1);}} search={search} onSearch={value => {setSearch(value);setPage(1);}} recovering={recovering} onRecover={id => void recover(id)} actionError={actionError} notice={notice} />}
  </div>;
}
