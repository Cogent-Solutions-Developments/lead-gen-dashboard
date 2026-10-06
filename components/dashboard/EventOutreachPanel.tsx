"use client";

import { useMemo, useState } from "react";
import { Bar, BarChart, Brush, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CalendarDays, ChevronDown, GitBranch, Info, MailCheck, Megaphone, UserRoundCheck } from "lucide-react";
import type { DashboardOutreachTracking, DashboardOutreachTrackingItem } from "@/lib/api";
import { campaignShare, emailStages, eventInsights } from "@/lib/eventOutreach";

const format = (value: number) => value.toLocaleString();
const shortDate = (value: string) => new Date(`${value}T12:00:00Z`).toLocaleDateString([], { month: "short", day: "numeric", timeZone: "UTC" });
const fullDate = (value: string) => new Date(`${value}T12:00:00Z`).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

function StageBars({ counts }: { counts: DashboardOutreachTracking["totals"] | DashboardOutreachTrackingItem }) {
  return <dl className="space-y-3">{emailStages(counts).map((stage) => (
    <div key={stage.key}>
      <div className="flex justify-between gap-3 text-xs"><dt className="text-zinc-600">{stage.label}</dt><dd className="font-medium tabular-nums text-zinc-900">{format(stage.value)}</dd></div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-zinc-100"><div className="h-full rounded-full" style={{ background: stage.color, width: `${campaignShare(stage.value, counts.sentEmailCount)}%` }} /></div>
    </div>
  ))}</dl>;
}

function CampaignDetails({ item, eventSent, startDate, endDate, timezone }: { item: DashboardOutreachTrackingItem; eventSent: number } & Pick<DashboardOutreachTracking, "startDate" | "endDate" | "timezone">) {
  const share = campaignShare(item.sentEmailCount, eventSent);
  return (
    <details className="group border-t border-zinc-100">
      <summary className="grid cursor-pointer grid-cols-[1rem_minmax(0,1fr)] items-center gap-x-3 gap-y-2 px-5 py-4 hover:bg-blue-50/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 sm:grid-cols-[1rem_minmax(0,1fr)_auto]">
        <ChevronDown className="h-4 w-4 shrink-0 text-zinc-400 transition-transform group-open:rotate-180" aria-hidden="true" />
        <span className="min-w-0 space-y-2">
          <span className="block break-words text-sm font-medium text-zinc-900">{item.campaignName}</span>
          <span className="block h-1.5 max-w-sm overflow-hidden rounded-full bg-zinc-100" role="img" aria-label={`${share.toFixed(1)}% of event emails`}><span className="block h-full rounded-full bg-blue-600" style={{ width: `${share}%` }} /></span>
        </span>
        <span className="col-start-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs tabular-nums text-zinc-600 sm:col-start-auto">
          <span className="inline-flex items-center gap-1.5"><MailCheck className="h-3.5 w-3.5 text-blue-600" aria-hidden="true" /><strong className="text-zinc-900">{format(item.sentEmailCount)}</strong> sent</span>
          <span>{format(item.contactedLeadCount)} leads</span>
          <span>{format(item.followUpEmailCount)} follow-ups</span>
          <span title="Share of this event’s sent emails" className="rounded-full bg-blue-50 px-2 py-1 font-medium text-blue-700">{share.toLocaleString([], { maximumFractionDigits: 1 })}%</span>
        </span>
      </summary>
      <div className="space-y-4 bg-zinc-50/70 px-5 pb-5 pt-2 sm:pl-12">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-500"><CalendarDays className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /><span><time dateTime={startDate}>{fullDate(startDate)}</time>{startDate !== endDate ? <> – <time dateTime={endDate}>{fullDate(endDate)}</time></> : null} · {timezone}</span></p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">{emailStages(item).map((stage) => (
          <div key={stage.key} className="border-l-2 pl-3" style={{ borderColor: stage.color }}><p className="text-xs text-zinc-500">{stage.label}</p><p className="mt-1 text-lg tabular-nums text-zinc-900">{format(stage.value)}</p></div>
        ))}</div>
        <p className="break-all font-mono text-[0.65rem] text-zinc-400">ID: {item.campaignId}</p>
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
  const insights = useMemo(() => selected ? eventInsights(selected.totals, selected.dailyActivity) : null, [selected]);

  return (
    <section className="overflow-hidden border border-zinc-200 bg-white shadow-[0_1px_2px_rgba(60,64,67,0.08)]" aria-labelledby="event-outreach-heading">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 px-5 py-4">
        <h3 id="event-outreach-heading" className="text-base font-semibold text-zinc-950">Event emails</h3>
        <span className="text-xs text-zinc-500">{shortDate(data.startDate)} – {shortDate(data.endDate)} · {data.timezone}</span>
      </div>
      {!events ? <p role="status" className="px-5 py-8 text-sm text-zinc-500">Event stats unavailable.</p> : !events.length ? <p role="status" className="px-5 py-8 text-sm text-zinc-500">No emails sent. Try another date range.</p> : <>
        <div className="grid gap-4 border-b border-zinc-100 bg-zinc-50/60 px-5 py-4 sm:grid-cols-2">
          <label className="text-xs font-medium text-zinc-600">Search<input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Event name" className="mt-1.5 block h-10 w-full border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100" /></label>
          <label className="text-xs font-medium text-zinc-600">Event ({format(filteredEvents.length)})<select value={selected?.canonicalEventKey ?? ""} onChange={(event) => setSelectedKey(event.target.value)} disabled={!filteredEvents.length} className="mt-1.5 block h-10 w-full border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 disabled:opacity-50">{filteredEvents.length ? filteredEvents.map((event) => <option key={event.canonicalEventKey} value={event.canonicalEventKey}>{event.canonicalEventName} · {format(event.totals.sentEmailCount)} sent</option>) : <option value="">No events found</option>}</select></label>
        </div>
        {selected && insights ? <div key={selected.canonicalEventKey}>
          <div className="flex flex-wrap items-start justify-between gap-3 px-5 pt-5">
            <h4 className="min-w-0 break-words text-lg font-semibold text-zinc-950">{selected.canonicalEventName}</h4>
            <details className="max-w-sm text-xs text-zinc-500">
              <summary className="flex cursor-pointer items-center gap-1.5 rounded px-1 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"><Info className="h-3.5 w-3.5" aria-hidden="true" />About counts</summary>
              <p className="mt-2 rounded border border-zinc-200 bg-zinc-50 p-3 leading-relaxed">Sent emails only. Follow-ups are included. Leads count once per event; campaign leads may overlap. All figures use the selected dates.</p>
            </details>
          </div>
          <dl className="grid grid-cols-2 gap-3 px-5 py-4 lg:grid-cols-4">{[
            { label: "Emails sent", value: selected.totals.sentEmailCount, icon: MailCheck, tone: "bg-blue-50 text-blue-600" },
            { label: "Leads reached", value: selected.totals.contactedLeadCount, icon: UserRoundCheck, tone: "bg-emerald-50 text-emerald-600" },
            { label: "Campaigns", value: selected.totals.campaignCount, icon: Megaphone, tone: "bg-amber-50 text-amber-600" },
            { label: "Follow-ups", value: selected.totals.followUpEmailCount, icon: GitBranch, tone: "bg-violet-50 text-violet-600" },
          ].map(({ label, value, icon: Icon, tone }) => (
            <div key={label} className="flex items-center gap-3 border border-zinc-200 px-3 py-3 sm:px-4"><span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${tone}`}><Icon className="h-4 w-4" aria-hidden="true" /></span><div><dt className="text-xs text-zinc-500">{label}</dt><dd className="mt-1 text-2xl font-light tabular-nums text-zinc-950">{format(value)}</dd></div></div>
          ))}</dl>
          <dl className="mx-5 mb-5 grid grid-cols-1 gap-3 bg-zinc-50 px-4 py-3 text-xs sm:grid-cols-3">
            <div className="flex flex-wrap justify-between gap-2 sm:block"><dt className="text-zinc-500">Emails / lead</dt><dd className="font-semibold tabular-nums text-zinc-800 sm:mt-1">{insights.emailsPerLead?.toLocaleString([], { maximumFractionDigits: 1 }) ?? "—"}</dd></div>
            <div className="flex flex-wrap justify-between gap-2 sm:block"><dt className="text-zinc-500">Busiest day</dt><dd className="font-semibold text-zinc-800 sm:mt-1">{insights.busiestDay ? <>{shortDate(insights.busiestDay.date)} <span className="font-normal text-zinc-500">· {format(insights.busiestDay.sentEmailCount)} sent</span></> : "—"}</dd></div>
            <div className="flex flex-wrap justify-between gap-2 sm:block"><dt className="text-zinc-500">Last send day</dt><dd className="font-semibold text-zinc-800 sm:mt-1">{insights.lastSendDay ? shortDate(insights.lastSendDay) : "—"}</dd></div>
          </dl>
          <div className="grid gap-6 px-5 pb-5 lg:grid-cols-[minmax(0,1fr)_18rem]">
            <div className="min-w-0">
              <h5 className="text-sm font-semibold text-zinc-900">Emails by day</h5>
              <div className="mt-3 h-60" role="img" aria-label={`First emails and follow-ups sent by day for ${selected.canonicalEventName}`}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={insights.dailyActivity} accessibilityLayer margin={{ left: -15, right: 8, top: 8, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke="#e4e4e7" strokeDasharray="3 5" />
                    <XAxis dataKey="date" tickFormatter={shortDate} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} minTickGap={24} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip labelFormatter={(value) => fullDate(String(value))} contentStyle={{ fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="initialEmailCount" name="First emails" stackId="sent" fill="#2563eb" maxBarSize={28} />
                    <Bar dataKey="followUpEmailCount" name="Follow-ups" stackId="sent" fill="#8b5cf6" radius={[3, 3, 0, 0]} maxBarSize={28} />
                    {selected.dailyActivity.length > 14 ? <Brush dataKey="date" tickFormatter={shortDate} height={18} /> : null}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div><h5 className="mb-4 text-sm font-semibold text-zinc-900">Email stages</h5><StageBars counts={selected.totals} /></div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-zinc-200 px-5 py-4"><h5 className="text-sm font-semibold text-zinc-900">Campaigns <span className="ml-1 rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600">{format(selected.items.length)}</span></h5><span className="text-xs text-zinc-500">% of event emails</span></div>
          {selected.items.map((item) => <CampaignDetails key={item.campaignId} item={item} eventSent={selected.totals.sentEmailCount} startDate={data.startDate} endDate={data.endDate} timezone={data.timezone} />)}
        </div> : <p role="status" className="px-5 py-8 text-sm text-zinc-500">No events found.</p>}
      </>}
    </section>
  );
}
