"use client";

import { useState } from "react";
import { Activity, CheckCircle2, Coins, UsersRound } from "lucide-react";
import { Area, Bar, CartesianGrid, ComposedChart, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { statusLabel } from "@/lib/automatedOutreach";

export type Usage = { requests: number; inputTokens: number; outputTokens: number; unmeasuredRequests: number; reservedTokens: number };
export type Day = { date: string; requests: number; inputTokens: number; outputTokens: number; leads: number; enrolledLeads: number; completed: number; failed: number; estimatedSpendUsd: number };
export type OverviewMetrics = { states: Record<string, number>; usage: Usage; total: number; leads: number; totalEnrolledLeads: number; rangeEnrolledLeads: number; estimatedSpendUsd: number; unpricedRequests: number; pricingSnapshot: string; daily: Day[]; stages: { key: string; running: number; failed: number; requests: number; tokens: number }[] };

const usd = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 4 }).format(value || 0);
const panel = "rounded-[24px] border border-slate-200/80 bg-white p-4 shadow-[0_15px_40px_-28px_rgba(15,23,42,.25)] sm:p-6";
function fillDays(rows: Day[], start: string, end: string) {
  const byDate = new Map(rows.map(row => [row.date, row]));
  const days: Day[] = [];
  const cursor = new Date(`${start}T00:00:00Z`);
  const last = new Date(`${end}T00:00:00Z`);
  for (; cursor <= last; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
    const date = cursor.toISOString().slice(0, 10);
    days.push(byDate.get(date) || { date, requests: 0, inputTokens: 0, outputTokens: 0, leads: 0, enrolledLeads: 0, completed: 0, failed: 0, estimatedSpendUsd: 0 });
  }
  return days;
}

export function StatusOutreachAnalytics({ data, start, end }: { data: OverviewMetrics; start: string; end: string }) {
  const [focus, setFocus] = useState<"activity" | "spend" | "tokens">("activity");
  const series = {
    activity: [{ key: "enrolledLeads", label: "New enrolled leads", color: "#6955e8", kind: "bar" }, { key: "leads", label: "Leads with runs", color: "#38bdf8", kind: "area" }, { key: "completed", label: "Completed runs", color: "#10b981", kind: "area" }, { key: "failed", label: "Failed runs", color: "#fb7185", kind: "area" }],
    spend: [{ key: "estimatedSpendUsd", label: "Estimated model spend (USD)", color: "#6955e8", kind: "area" }, { key: "requests", label: "Model requests", color: "#38bdf8", kind: "bar" }],
    tokens: [{ key: "inputTokens", label: "Input tokens", color: "#6955e8", kind: "area" }, { key: "outputTokens", label: "Output tokens", color: "#10b981", kind: "bar" }],
  } as const;
  const cards = [
    { label: "Total enrolled leads", value: data.totalEnrolledLeads.toLocaleString(), detail: `${data.rangeEnrolledLeads} added in selected dates`, icon: UsersRound, tone: "bg-indigo-50 text-indigo-700" },
    { label: "Leads with runs", value: data.leads.toLocaleString(), detail: "Unique leads in selected dates", icon: UsersRound, tone: "bg-violet-50 text-violet-700" },
    { label: "Estimated model spend", value: usd(data.estimatedSpendUsd), detail: `${data.unpricedRequests} requests without a price`, icon: Coins, tone: "bg-amber-50 text-amber-700" },
    { label: "Model requests", value: data.usage.requests.toLocaleString(), detail: `${data.usage.unmeasuredRequests} with unknown token usage`, icon: Activity, tone: "bg-sky-50 text-sky-700" },
    { label: "Completed runs", value: (data.states.completed || 0).toLocaleString(), detail: `${data.states.failed || 0} failed · ${data.states.running || 0} running`, icon: CheckCircle2, tone: "bg-emerald-50 text-emerald-700" },
  ];
  return <div className="space-y-4">
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{cards.map(metric => <div key={metric.label} className="group rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50/70 p-4 transition hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-lg"><div className="flex items-center justify-between"><p className="text-xs font-medium text-slate-500">{metric.label}</p><span className={`rounded-xl p-2 ${metric.tone}`}><metric.icon className="h-4 w-4" /></span></div><p className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">{metric.value}</p><p className="mt-2 text-xs text-slate-500">{metric.detail}</p></div>)}</div>
    <section className={panel}><div className="flex flex-wrap items-start justify-between gap-4"><div><h3 className="text-lg font-semibold text-slate-950">Activity over time</h3><p className="mt-1 text-xs text-slate-500">Hover or tap a point to inspect daily activity.</p></div><div role="group" aria-label="Chart metric" className="flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1">{(["activity", "spend", "tokens"] as const).map(metric => <button key={metric} type="button" aria-pressed={focus === metric} onClick={() => setFocus(metric)} className={`rounded-lg px-3 py-2 text-xs font-semibold capitalize transition ${focus === metric ? "bg-white text-violet-700 shadow-sm" : "text-slate-500 hover:text-slate-900"}`}>{metric}</button>)}</div></div>
      <div className="mt-6 h-72 w-full sm:h-80"><ResponsiveContainer width="100%" height="100%"><ComposedChart data={fillDays(data.daily, start, end)} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}><CartesianGrid stroke="#e9eaf0" strokeDasharray="3 5" vertical={false} /><XAxis dataKey="date" tickFormatter={value => value.slice(5)} tick={{fontSize:11, fill:"#64748b"}} minTickGap={25} /><YAxis yAxisId="left" tick={{fontSize:11, fill:"#64748b"}} width={45} /><YAxis yAxisId="right" orientation="right" tick={{fontSize:11, fill:"#64748b"}} width={45} /><Tooltip content={({active,payload}) => { const day = payload?.[0]?.payload as Day | undefined; return active && day ? <div className="min-w-52 rounded-xl border border-slate-200 bg-white p-3 text-xs shadow-xl"><p className="mb-2 font-semibold text-slate-900">{day.date}</p><p>New enrolled leads: {day.enrolledLeads}</p><p>Leads with runs: {day.leads}</p><p>Completed / failed runs: {day.completed} / {day.failed}</p><p>Model requests: {day.requests}</p><p>Input / output tokens: {day.inputTokens.toLocaleString()} / {day.outputTokens.toLocaleString()}</p><p className="mt-2 font-semibold text-violet-700">Estimated spend: {usd(day.estimatedSpendUsd)}</p></div> : null; }} /><Legend wrapperStyle={{fontSize:12}} />{series[focus].map(item => item.kind === "bar" ? <Bar key={item.key} yAxisId={item.key === series[focus][0].key ? "left" : "right"} dataKey={item.key} name={item.label} fill={item.color} radius={[5,5,0,0]} maxBarSize={28} /> : <Area key={item.key} yAxisId={item.key === series[focus][0].key ? "left" : "right"} dataKey={item.key} name={item.label} stroke={item.color} fill={item.color} fillOpacity={.08} strokeWidth={2.5} type="monotone" />)}</ComposedChart></ResponsiveContainer></div>
      <p className="mt-3 border-t border-slate-100 pt-3 text-xs text-slate-500">Left axis: {series[focus][0].label}. Right axis: remaining series. New enrolled leads includes template and agentic modes; period leads with runs counts each lead once.</p>
    </section>
    <div className="grid gap-4 lg:grid-cols-[1.2fr_.8fr]"><section className={panel}><h3 className="font-semibold text-slate-900">Agent flow</h3><p className="mt-1 text-xs text-slate-500">Research & plan → Writer → Reviewer. Saved templates do not consume model requests.</p><div className="mt-4 grid gap-3 sm:grid-cols-3">{data.stages.map((stage, index) => <div key={stage.key} className="rounded-xl border border-slate-200 p-4"><div className="mb-3 flex items-center gap-2"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-violet-100 text-xs font-bold text-violet-700">{index + 1}</span><span className="text-sm font-semibold">{statusLabel(stage.key)}</span></div><p className="text-xl font-semibold">{stage.requests.toLocaleString()} <span className="text-xs font-normal text-slate-500">requests</span></p><p className="mt-1 text-xs text-slate-500">{stage.tokens.toLocaleString()} tokens · {stage.failed} failed</p></div>)}</div></section><aside className="rounded-[24px] bg-slate-950 p-6 text-slate-100"><Coins className="h-5 w-5 text-violet-300" /><h3 className="mt-4 text-lg font-semibold">Understanding spend</h3><p className="mt-2 text-sm leading-6 text-slate-300">Estimates use recorded input and output tokens with the {data.pricingSnapshot} rate snapshot. Cache discounts, web searches, other provider charges and unmeasured usage are excluded. This is not an invoice.</p><div className="mt-5 border-t border-white/10 pt-4 text-sm"><span className="text-slate-400">Measured tokens</span><strong className="float-right">{(data.usage.inputTokens + data.usage.outputTokens).toLocaleString()}</strong></div></aside></div>
  </div>;
}
