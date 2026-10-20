"use client";

import { useState } from "react";
import { RefreshCw, RotateCcw, ShieldCheck } from "lucide-react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useOutreachResource } from "@/hooks/useOutreachResource";
import { recoverStatusOutreachRun } from "@/lib/automatedOutreachApi";
import { outreachDate, statusLabel } from "@/lib/automatedOutreach";
import { OutreachContentSettings } from "./OutreachContentSettings";
import { OutreachFeedback } from "./OutreachStatus";
import { OutreachOperations } from "./OutreachOperations";
import { OutreachPagination } from "./OutreachPagination";

type Usage = { requests: number; inputTokens: number; outputTokens: number; unmeasuredRequests: number; reservedTokens: number };
type Overview = {
  states: Record<string, number>; usage: Usage; total: number;
  daily: { date: string; requests: number; inputTokens: number; outputTokens: number }[];
  stages: { key: string; running: number; failed: number; requests: number; tokens: number }[];
  items: { id: string; eventName: string; leadName: string; department: string; step: number; state: string; stage: string; completedStages: string[]; usage: Usage; error: string | null; recoverable: boolean; updatedAt: string }[];
};
const panel = "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm";
function dateRange() { const end = new Date(); const start = new Date(end); start.setUTCDate(start.getUTCDate() - 13); return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) }; }

export function StatusOutreachControlCenter() {
  const [range, setRange] = useState(dateRange);
  const [draftRange, setDraftRange] = useState(range);
  const [page, setPage] = useState(1);
  const [recovering, setRecovering] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const { data, error, reload, refreshing } = useOutreachResource<Overview>(`/content/overview?startDate=${range.start}&endDate=${range.end}&offset=${(page - 1) * 25}&limit=25`);
  async function recover(id: string) {
    setRecovering(id); setActionError(null); setNotice(null);
    try { await recoverStatusOutreachRun(id); setNotice("Recovery queued. The worker resumes saved checkpoints when this event is enabled and the lead is eligible."); reload(); }
    catch (error) { setActionError(error instanceof Error ? error.message : "Could not recover generation"); }
    finally { setRecovering(null); }
  }
  return <div className="space-y-4">
    <OutreachContentSettings />
    <section className={panel} aria-label="Status Outreach usage">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4"><div><h2 className="text-lg font-semibold text-slate-900">Usage & outcomes</h2><p className="text-sm text-slate-500">Status Outreach agent runs only. Dates use UTC; refreshes every 30 seconds.</p></div><Button variant="outline" onClick={reload} disabled={refreshing}><RefreshCw className="h-4 w-4" />Refresh</Button></div>
      <form className="mb-5 flex flex-wrap items-end gap-3" onSubmit={event => { event.preventDefault(); setRange(draftRange); setPage(1); }}><label className="text-xs text-slate-600">From<Input aria-label="Status Outreach start date" type="date" required max={draftRange.end} value={draftRange.start} onChange={event => setDraftRange({...draftRange, start: event.target.value})} /></label><label className="text-xs text-slate-600">To<Input aria-label="Status Outreach end date" type="date" required min={draftRange.start} value={draftRange.end} onChange={event => setDraftRange({...draftRange, end: event.target.value})} /></label><Button type="submit" className="bg-blue-600 text-white">Apply range</Button></form>
      <OutreachFeedback error={error} loading={!data && !error} reload={reload} />
      {data && <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[{label:'Runs',value:data.total,detail:`${data.states.running || 0} running · ${data.states.queued || 0} queued`},{label:'Model requests',value:data.usage.requests,detail:`${data.usage.unmeasuredRequests} with unknown usage`},{label:'Measured tokens',value:data.usage.inputTokens + data.usage.outputTokens,detail:`${data.usage.inputTokens.toLocaleString()} input · ${data.usage.outputTokens.toLocaleString()} output`},{label:'Completed',value:data.states.completed || 0,detail:`${data.states.failed || 0} failed · ${data.states.cancelled || 0} cancelled`}].map(metric => <div key={metric.label} className="rounded-xl border border-slate-200 p-4 shadow-sm"><p className="text-xs uppercase tracking-wider text-slate-500">{metric.label}</p><p className="my-2 text-2xl font-bold text-slate-900">{metric.value.toLocaleString()}</p><p className="text-xs text-slate-500">{metric.detail}</p></div>)}</div>}
    </section>
    {data && <>
      <div className="grid gap-4 xl:grid-cols-2"><section className={panel}><h3 className="font-semibold text-slate-900">Token usage</h3><p className="mb-4 text-xs text-slate-500">Measured input and output tokens by run creation date.</p><div aria-label="Chart series" className="mb-3 flex gap-4 text-xs"><span className="text-blue-600">Input tokens</span><span className="text-emerald-600">Output tokens</span></div>{data.daily.length ? <div className="h-56"><ResponsiveContainer width="100%" height="100%"><LineChart data={data.daily}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" tick={{fontSize:10}} /><YAxis tick={{fontSize:10}} /><Tooltip /><Line type="monotone" dataKey="inputTokens" name="Input tokens" stroke="#2563eb" /><Line type="monotone" dataKey="outputTokens" name="Output tokens" stroke="#10b981" /></LineChart></ResponsiveContainer></div> : <p className="py-16 text-center text-sm text-slate-500">No agent runs in this period.</p>}</section>
      <section className={panel}><h3 className="font-semibold text-slate-900">Agent flow</h3><p className="mb-4 text-xs text-slate-500">Planner → Writer → Reviewer. Only approved content proceeds to delivery.</p><div className="space-y-3">{data.stages.map((stage, index) => <div key={stage.key} className="flex items-center justify-between rounded-lg border border-slate-200 p-3"><span className="text-sm font-medium">{index + 1}. {statusLabel(stage.key)}</span><span className="text-xs text-slate-500">{stage.running} pending · {stage.failed} failed<br />{stage.requests} requests · {stage.tokens.toLocaleString()} tokens</span></div>)}</div><p className="mt-4 flex gap-2 text-xs text-emerald-700"><ShieldCheck className="h-4 w-4 shrink-0" />Completed stages are saved. Request, token and context gates are checked before each model call.</p></section></div>
      <section className={panel}><div className="mb-4"><h3 className="font-semibold text-slate-900">Runs & recovery</h3><p className="mt-1 text-xs text-slate-500">Recover a failed stage after fixing its configuration. A changed prompt or model starts fresh checkpoints. Unknown token usage remains reserved against the run budget.</p></div>
        {actionError && <p role="alert" className="mb-3 text-sm text-red-700">{actionError}</p>}{notice && <p role="status" className="mb-3 text-sm text-emerald-700">{notice}</p>}
        <div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left text-xs"><thead className="border-b bg-slate-50 text-slate-500"><tr>{['Lead / event','State','Checkpoint','Usage','Updated','Recovery'].map(label => <th key={label} className="p-3 font-medium uppercase">{label}</th>)}</tr></thead><tbody>{data.items.map(run => <tr key={run.id} className="border-b border-slate-100"><td className="max-w-64 p-3"><p className="font-semibold text-slate-900">{run.leadName}</p><p className="mt-1 text-slate-500">{run.eventName} · {statusLabel(run.department)} · Message {run.step}</p></td><td className="p-3">{statusLabel(run.state)}</td><td className="max-w-72 p-3"><p>{statusLabel(run.stage)}</p><p className="mt-1 text-slate-500">{run.completedStages.length}/3 checkpoints saved</p>{run.error && <p className="mt-2 text-amber-700">{run.error}</p>}</td><td className="p-3">{run.usage.requests} requests<p className="mt-1 text-slate-500">{((run.usage.inputTokens || 0)+(run.usage.outputTokens || 0)).toLocaleString()} measured tokens</p>{run.usage.unmeasuredRequests > 0 && <p className="mt-1 text-amber-700">{run.usage.unmeasuredRequests} unknown · {(run.usage.reservedTokens || 0).toLocaleString()} reserved</p>}</td><td className="p-3">{outreachDate(run.updatedAt)}</td><td className="p-3">{run.recoverable ? <Button variant="outline" size="sm" disabled={recovering !== null} onClick={() => void recover(run.id)}><RotateCcw className="h-3.5 w-3.5" />{recovering === run.id ? 'Queuing…' : 'Recover'}</Button> : <span className="text-slate-400">{run.state === 'queued' ? 'Queued' : '—'}</span>}</td></tr>)}{!data.items.length && <tr><td colSpan={6} className="p-8 text-center text-slate-500">No runs in this period.</td></tr>}</tbody></table></div><OutreachPagination page={page} pageSize={25} total={data.total} onChange={setPage} />
      </section>
    </>}
    <OutreachOperations />
  </div>;
}
