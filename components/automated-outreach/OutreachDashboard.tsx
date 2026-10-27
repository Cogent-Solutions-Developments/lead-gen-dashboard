"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowUpRight, Mail, RefreshCw, Users, Clock3, CircleAlert } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { ChartCard, SummaryMetric } from "@/components/dashboard/DashboardPresentation";
import { CampaignPageHeader } from "@/components/campaigns/CampaignListPresentation";
import { useOutreachResource } from "@/hooks/useOutreachResource";
import { OUTREACH_DEPARTMENTS, outreachDate, statusLabel, type OutreachSummary } from "@/lib/automatedOutreach";
import { OutreachFeedback } from "./OutreachStatus";
import { StatusActivityChart } from "./StatusActivityChart";

export function OutreachDashboard() {
  const [refreshKey, setRefreshKey] = useState(0);
  const { data, error, reload, refreshing } = useOutreachResource<OutreachSummary>("/summary", 5000);
  const total = data?.departments.reduce((sum, row) => sum + row.leads, 0) ?? 0;
  const sent = data?.departments.reduce((sum, row) => sum + row.sent, 0) ?? 0;
  const attention = data?.needsAttention ?? ((data?.states.attention ?? 0) + (data?.states.failed ?? 0) + (data?.states.blocked ?? 0));
  return <div className="space-y-6 p-1 font-sans text-zinc-950">
    {data && (!data.configuration.enabled || data.configuration.missingConfiguration.length > 0) && <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200/80 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200"><span className="inline-flex items-center gap-2"><CircleAlert className="h-4 w-4 shrink-0" aria-hidden="true" />{!data.configuration.enabled ? "Automatic outreach is off by default. Individual events can be enabled." : "Automatic delivery is waiting for central configuration."}</span><Link href="/settings?section=outreach&department=status-outreach" className="inline-flex items-center gap-1 text-xs font-medium underline underline-offset-4">Open automation controls<ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" /></Link></div>}
    <CampaignPageHeader title="Status Outreach" description="Event lead status and automatic outreach across your departments.">
      <Button type="button" variant="outline" onClick={() => { reload(); setRefreshKey(value => value + 1); }} disabled={refreshing} className="analytics-frost-btn h-10 px-4">
        <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />Refresh
      </Button>
    </CampaignPageHeader>
    <StatusActivityChart refreshKey={refreshKey} />
    <OutreachFeedback error={error} loading={!data && !error} reload={reload} />
    {data && <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[
        { label: "Eligible lead inventory", value: total, icon: Users, detail: "Across all departments", tone: "bg-blue-50 text-blue-700" },
        { label: "Active sequences", value: data.states.active ?? 0, icon: Clock3, detail: "Eligible for status outreach", tone: "bg-violet-50 text-violet-700" },
        { label: "Confirmed emails sent", value: sent, icon: Mail, detail: "Confirmed delivery activity", tone: "bg-emerald-50 text-emerald-700" },
        { label: "Needs attention", value: attention, icon: CircleAlert, detail: "Leads blocked or with a content or delivery issue", tone: "bg-amber-50 text-amber-700" },
      ].map((card) => <SummaryMetric key={card.label} label={card.label} value={card.value.toLocaleString()} icon={card.icon} detail={card.detail} tone={card.tone} />)}</div>
      <div className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
        <ChartCard title="Email activity" subtitle="Confirmed sends · last 30 days · UTC">{data.daily.length ? <div className="mt-5 h-64" role="img" aria-label={`Daily confirmed email sends: ${data.daily.map((day) => `${day.date}: ${day.sent}`).join(", ")}`}><ResponsiveContainer width="100%" height="100%"><AreaChart data={data.daily}><defs><linearGradient id="outreach-area" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#2563eb" stopOpacity={0.25} /><stop offset="100%" stopColor="#2563eb" stopOpacity={0} /></linearGradient></defs><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="date" tick={{ fontSize: 10 }} /><YAxis allowDecimals={false} width={35} /><Tooltip /><Area type="monotone" dataKey="sent" stroke="#2563eb" fill="url(#outreach-area)" strokeWidth={2} /></AreaChart></ResponsiveContainer></div> : <div className="flex h-64 items-center justify-center text-sm text-zinc-400">Confirmed sends will appear here.</div>}</ChartCard>
        <ChartCard title="Sequence health" subtitle="Current status outreach activity"><div className="mt-5 space-y-3">{Object.entries(data.states).map(([state, count]) => <div key={state}><div className="mb-1 flex justify-between text-xs"><span>{statusLabel(state)}</span><span className="tabular-nums">{count}</span></div><div className="h-2 rounded-full bg-zinc-100"><div className={`h-2 rounded-full ${["attention", "failed", "blocked"].includes(state) ? "bg-amber-500" : "bg-blue-600"}`} style={{ width: `${total ? count / total * 100 : 0}%` }} /></div></div>)}{!total && <p className="text-sm text-zinc-500">Automatic discovery runs every minute. Large inventories are scanned in batches.</p>}</div><Link href="/settings?section=outreach&department=status-outreach" className="mt-6 inline-flex items-center gap-1 text-sm font-medium text-blue-600">Manage automation<ArrowUpRight className="h-4 w-4" /></Link></ChartCard>
      </div>
      <section><h2 className="mb-3 font-semibold">Departments</h2><div className="grid gap-4 md:grid-cols-3">{OUTREACH_DEPARTMENTS.map((department) => {
        const row = data.departments.find((item) => item.department === department.key);
        return <Link key={department.key} href={`/admin/lead-intelligence/${department.key}`} className="group min-w-0 border border-zinc-200 bg-white p-5 shadow-[0_1px_2px_rgba(60,64,67,0.08)] transition-colors hover:border-blue-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"><div className="flex justify-between font-semibold">{department.label}<ArrowUpRight className="h-5 w-5 text-zinc-400 group-hover:text-blue-600" /></div><p className="mt-5 text-3xl font-light tabular-nums tracking-tight">{(row?.leads ?? 0).toLocaleString()} <span className="text-sm font-normal text-zinc-500">leads</span></p><p className="mt-2 text-xs text-zinc-500">{row?.active ?? 0} active · {row?.sent ?? 0} confirmed sends</p></Link>;
      })}</div></section>
      <footer className="flex flex-wrap justify-between gap-2 text-xs text-zinc-500"><span>3 messages · 4 days apart · enrollment is automatic</span><span>Last discovery: {outreachDate(data.configuration.lastScanAt)}</span></footer>
    </>}
  </div>;
}
