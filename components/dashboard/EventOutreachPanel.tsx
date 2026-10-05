"use client";

import { useMemo, useState } from "react";
import { Bar, BarChart, Brush, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CalendarDays, ChevronDown } from "lucide-react";
import type { DashboardOutreachTracking, DashboardOutreachTrackingItem } from "@/lib/api";

const format = (value: number) => value.toLocaleString();
const shortDate = (value: string) => new Date(`${value}T12:00:00Z`).toLocaleDateString([], { month: "short", day: "numeric" });
const stages = [
  { key: "initialEmailCount", label: "Initial", color: "#2563eb" },
  { key: "firstFollowUpEmailCount", label: "1st follow-up", color: "#06b6d4" },
  { key: "secondFollowUpEmailCount", label: "2nd follow-up", color: "#10b981" },
  { key: "thirdFollowUpEmailCount", label: "3rd follow-up", color: "#f59e0b" },
  { key: "finalFollowUpEmailCount", label: "Final follow-up", color: "#8b5cf6" },
] as const;

function CampaignDetails({ item }: { item: DashboardOutreachTrackingItem }) {
  const unknown = item.followUpEmailCount - stages.slice(1).reduce((total, stage) => total + item[stage.key], 0);
  return (
    <details className="group border-t border-zinc-100">
      <summary className="grid cursor-pointer grid-cols-[1rem_minmax(0,1fr)] items-center gap-x-3 gap-y-2 px-5 py-4 hover:bg-blue-50/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 sm:grid-cols-[1rem_minmax(0,1fr)_auto]">
        <ChevronDown className="h-4 w-4 shrink-0 text-zinc-400 transition-transform group-open:rotate-180" aria-hidden="true" />
        <span className="min-w-0 flex-1 break-words text-sm font-medium text-zinc-900">{item.campaignName}</span>
        <span className="col-start-2 text-xs tabular-nums text-zinc-500 sm:col-start-auto"><strong className="text-zinc-900">{format(item.sentEmailCount)}</strong> sent · {format(item.contactedLeadCount)} leads · {format(item.followUpEmailCount)} follow-ups</span>
      </summary>
      <div className="space-y-4 bg-zinc-50/70 px-5 pb-5 pt-2 sm:pl-13">
        <p className="break-all font-mono text-xs text-zinc-500">Campaign ID: {item.campaignId}</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {stages.map((stage) => <div key={stage.key}><p className="text-xs text-zinc-500">{stage.label}</p><p className="mt-1 text-lg tabular-nums text-zinc-900">{format(item[stage.key])}</p><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-200"><div className="h-full rounded-full" style={{ background: stage.color, width: `${item.sentEmailCount ? item[stage.key] / item.sentEmailCount * 100 : 0}%` }} /></div></div>)}
        </div>
        {unknown > 0 ? <p className="text-xs text-zinc-500">{format(unknown)} follow-ups have no recorded stage.</p> : null}
      </div>
    </details>
  );
}

export function EventOutreachPanel({ data }: { data: DashboardOutreachTracking }) {
  const [selectedKey, setSelectedKey] = useState("");
  const [search, setSearch] = useState("");
  const events = data.events;
  const filteredEvents = useMemo(() => events?.filter((event) => `${event.canonicalEventName} ${event.canonicalEventKey}`.toLowerCase().includes(search.trim().toLowerCase())) ?? [], [events, search]);
  const selected = filteredEvents.find((event) => event.canonicalEventKey === selectedKey) ?? filteredEvents[0];

  return (
    <section className="overflow-hidden border border-zinc-200 bg-white shadow-[0_1px_2px_rgba(60,64,67,0.08)]" aria-labelledby="event-outreach-heading">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-zinc-200 px-5 py-4">
        <div className="flex gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-blue-50 text-blue-700"><CalendarDays className="h-4 w-4" aria-hidden="true" /></span><div><h3 id="event-outreach-heading" className="text-base font-semibold text-zinc-950">Event outreach</h3><p className="mt-1 text-xs text-zinc-500">Explore each event and its campaigns in the selected reporting window.</p></div></div>
        <span className="text-xs text-zinc-500">{shortDate(data.startDate)} – {shortDate(data.endDate)} · {data.timezone}</span>
      </div>
      {!events ? <p role="status" className="px-5 py-8 text-sm text-zinc-500">Event analytics are unavailable. Refresh after the analytics service has been updated.</p> : !events.length ? <p role="status" className="px-5 py-8 text-sm text-zinc-500">No event outreach in this window. Try a different date range.</p> : <>
        <div className="grid gap-4 border-b border-zinc-100 bg-zinc-50/60 px-5 py-4 sm:grid-cols-2">
          <label className="text-xs font-medium text-zinc-600">Find an event<input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by event name" className="mt-1.5 block h-10 w-full border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100" /></label>
          <label className="text-xs font-medium text-zinc-600">Event · {format(filteredEvents.length)} available<select value={selected?.canonicalEventKey ?? ""} onChange={(event) => setSelectedKey(event.target.value)} disabled={!filteredEvents.length} className="mt-1.5 block h-10 w-full border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 disabled:opacity-50">{filteredEvents.length ? filteredEvents.map((event) => <option key={event.canonicalEventKey} value={event.canonicalEventKey}>{event.canonicalEventName} ({format(event.totals.sentEmailCount)} sent)</option>) : <option value="">No matching events</option>}</select></label>
        </div>
        {selected ? <div key={selected.canonicalEventKey}>
          <div className="px-5 pt-5"><h4 className="break-words text-lg font-semibold text-zinc-950">{selected.canonicalEventName}</h4><p className="mt-1 text-xs text-zinc-500">Sent emails only. Campaigns shown have sent activity in this window. Leads count distinct lead records across this event’s campaigns.</p></div>
          <dl className="grid grid-cols-2 gap-3 px-5 py-5 lg:grid-cols-4">{[
            ["Sent emails", selected.totals.sentEmailCount], ["Contacted leads", selected.totals.contactedLeadCount], ["Campaigns with sends", selected.totals.campaignCount], ["Follow-ups sent", selected.totals.followUpEmailCount],
          ].map(([label, value]) => <div key={label} className="border border-zinc-200 px-4 py-3"><dt className="text-xs text-zinc-500">{label}</dt><dd className="mt-1 text-2xl font-light tabular-nums text-zinc-950">{format(Number(value))}</dd></div>)}</dl>
          <div className="grid gap-6 px-5 pb-5 lg:grid-cols-[minmax(0,1fr)_18rem]">
            <div className="min-w-0"><h5 className="text-sm font-semibold text-zinc-900">Event activity</h5><div className="mt-3 h-64" role="img" aria-label={`Daily sent emails and follow-ups for ${selected.canonicalEventName}`}><ResponsiveContainer width="100%" height="100%"><BarChart data={selected.dailyActivity} margin={{ left: -15, right: 8, top: 8, bottom: 0 }}><CartesianGrid vertical={false} stroke="#e4e4e7" strokeDasharray="3 5" /><XAxis dataKey="date" tickFormatter={shortDate} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} minTickGap={24} /><YAxis allowDecimals={false} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} /><Tooltip labelFormatter={(value) => shortDate(String(value))} contentStyle={{ fontSize: 12 }} /><Legend wrapperStyle={{ fontSize: 11 }} /><Bar dataKey="sentEmailCount" name="All sent emails" fill="#2563eb" radius={[3, 3, 0, 0]} maxBarSize={24} /><Bar dataKey="followUpEmailCount" name="Follow-ups (included in sent)" fill="#8b5cf6" radius={[3, 3, 0, 0]} maxBarSize={24} />{selected.dailyActivity.length > 14 ? <Brush dataKey="date" tickFormatter={shortDate} height={18} /> : null}</BarChart></ResponsiveContainer></div></div>
            <div><h5 className="text-sm font-semibold text-zinc-900">Email breakdown</h5><dl className="mt-4 space-y-3">{stages.map((stage) => <div key={stage.key}><div className="flex justify-between gap-3 text-xs"><dt className="text-zinc-600">{stage.label}</dt><dd className="font-medium tabular-nums text-zinc-900">{format(selected.totals[stage.key])}</dd></div><div className="mt-1.5 h-2 overflow-hidden rounded-full bg-zinc-100"><div className="h-full rounded-full" style={{ background: stage.color, width: `${selected.totals.sentEmailCount ? selected.totals[stage.key] / selected.totals.sentEmailCount * 100 : 0}%` }} /></div></div>)}</dl>{selected.totals.followUpEmailCount > stages.slice(1).reduce((total, stage) => total + selected.totals[stage.key], 0) ? <p className="mt-3 text-xs text-zinc-500">Some follow-ups have no recorded stage.</p> : null}</div>
          </div>
          <div className="border-t border-zinc-200 px-5 py-4"><h5 className="text-sm font-semibold text-zinc-900">Campaign breakdown · {format(selected.items.length)}</h5><p className="mt-1 text-xs text-zinc-500">Expand a campaign to see its email stages. A lead may appear in more than one campaign.</p></div>
          {selected.items.map((item) => <CampaignDetails key={item.campaignId} item={item} />)}
        </div> : <p role="status" className="px-5 py-8 text-sm text-zinc-500">No events match your search.</p>}
      </>}
    </section>
  );
}
