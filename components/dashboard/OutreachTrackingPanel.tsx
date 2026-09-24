"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, Check, Copy, GitBranch, Loader2, MailCheck, Megaphone, RefreshCw, UserRoundCheck } from "lucide-react";
import { toast } from "sonner";
import { Bar, Brush, CartesianGrid, ComposedChart, Legend, Line, PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { getDashboardOutreachTracking, type DashboardOutreachTracking } from "@/lib/api";

const MIX_COLORS = ["#2563eb", "#06b6d4", "#10b981", "#f59e0b", "#8b5cf6"];
const FALLBACK_TIMEZONES = ["UTC", "Asia/Colombo", "Asia/Dubai", "Asia/Kolkata", "Asia/Singapore", "Europe/London", "Europe/Paris", "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles", "Australia/Sydney"];

type DateRange = { startDate: string; endDate: string };

function browserTimeZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Colombo";
}

function dateInTimeZone(timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function shiftDate(value: string, days: number) {
  const date = new Date(`${value}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function sevenDayRange(timeZone: string): DateRange {
  const endDate = dateInTimeZone(timeZone);
  return { startDate: shiftDate(endDate, -6), endDate };
}

function supportedTimeZones(selected: string) {
  const supportedValuesOf = (Intl as unknown as { supportedValuesOf?: (key: "timeZone") => string[] }).supportedValuesOf;
  const values = supportedValuesOf ? supportedValuesOf("timeZone") : FALLBACK_TIMEZONES;
  return Array.from(new Set([selected, ...values])).sort((a, b) => a.localeCompare(b));
}

function number(value: number) {
  return Number(value || 0).toLocaleString();
}

function shortDate(value: string) {
  return new Date(`${value}T12:00:00Z`).toLocaleDateString([], { month: "short", day: "numeric" });
}

function CopyValue({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
      toast.success(`${label} copied`);
    } catch {
      toast.error("Copy failed");
    }
  };

  return (
    <button type="button" onClick={copy} className="group inline-flex max-w-full items-center gap-2 text-left text-zinc-700 transition-colors hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" aria-label={`Copy ${label}: ${value}`} title={`Copy ${label}`}>
      <span className="min-w-0 break-words">{value}</span>
      {copied ? <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden="true" /> : <Copy className="h-3.5 w-3.5 shrink-0 text-zinc-300 group-hover:text-blue-600" aria-hidden="true" />}
    </button>
  );
}

function Metric({ icon: Icon, label, value, tone }: { icon: typeof MailCheck; label: string; value: number; tone: string }) {
  return (
    <div className="flex items-center gap-3 border border-zinc-200 bg-white px-4 py-3">
      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${tone}`}><Icon className="h-4 w-4" aria-hidden="true" /></span>
      <div className="min-w-0">
        <p className="text-2xl font-light tabular-nums tracking-tight text-zinc-950">{number(value)}</p>
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-zinc-400">{label}</p>
      </div>
    </div>
  );
}

export function OutreachTrackingPanel() {
  const initialTimeZone = useMemo(browserTimeZone, []);
  const initialRange = useMemo(() => sevenDayRange(initialTimeZone), [initialTimeZone]);
  const [timeZone, setTimeZone] = useState(initialTimeZone);
  const [rangeDraft, setRangeDraft] = useState<DateRange>(initialRange);
  const [appliedRange, setAppliedRange] = useState<DateRange>(initialRange);
  const [recordDate, setRecordDate] = useState(initialRange.endDate);
  const [rangeData, setRangeData] = useState<DashboardOutreachTracking | null>(null);
  const [recordData, setRecordData] = useState<DashboardOutreachTracking | null>(null);
  const [rangeLoading, setRangeLoading] = useState(true);
  const [recordLoading, setRecordLoading] = useState(true);
  const [rangeError, setRangeError] = useState<string | null>(null);
  const [recordError, setRecordError] = useState<string | null>(null);
  const timeZones = useMemo(() => supportedTimeZones(timeZone), [timeZone]);
  const rangeInvalid = !rangeDraft.startDate || !rangeDraft.endDate || rangeDraft.startDate > rangeDraft.endDate;

  const loadRange = useCallback(async () => {
    setRangeLoading(true);
    try {
      setRangeData(await getDashboardOutreachTracking({ ...appliedRange, timezone: timeZone }));
      setRangeError(null);
    } catch (loadError) {
      setRangeError(loadError instanceof Error ? loadError.message : "Outreach analytics are unavailable.");
    } finally {
      setRangeLoading(false);
    }
  }, [appliedRange, timeZone]);

  const loadRecords = useCallback(async () => {
    setRecordLoading(true);
    try {
      setRecordData(await getDashboardOutreachTracking({ date: recordDate, timezone: timeZone }));
      setRecordError(null);
    } catch (loadError) {
      setRecordError(loadError instanceof Error ? loadError.message : "Campaign records are unavailable.");
    } finally {
      setRecordLoading(false);
    }
  }, [recordDate, timeZone]);

  useEffect(() => { void loadRange(); }, [loadRange]);
  useEffect(() => { void loadRecords(); }, [loadRecords]);

  const updateTimeZone = (nextTimeZone: string) => {
    const defaults = sevenDayRange(nextTimeZone);
    setTimeZone(nextTimeZone);
    setRangeDraft(defaults);
    setAppliedRange(defaults);
    setRecordDate(defaults.endDate);
    setRangeData(null);
    setRecordData(null);
  };

  const resetSevenDays = () => {
    const defaults = sevenDayRange(timeZone);
    setRangeDraft(defaults);
    setAppliedRange(defaults);
    setRangeData(null);
  };

  const applyRange = () => {
    if (rangeInvalid) return;
    setRangeData(null);
    setAppliedRange(rangeDraft);
  };

  const activityData = rangeData?.dailyActivity ?? [];
  const mixData = useMemo(() => [
    { name: "Initial", axisLabel: "Initial", value: Number(rangeData?.totals.initialEmailCount || 0), fill: MIX_COLORS[0] },
    { name: "1st follow-up", axisLabel: "1st", value: Number(rangeData?.totals.firstFollowUpEmailCount || 0), fill: MIX_COLORS[1] },
    { name: "2nd follow-up", axisLabel: "2nd", value: Number(rangeData?.totals.secondFollowUpEmailCount || 0), fill: MIX_COLORS[2] },
    { name: "3rd follow-up", axisLabel: "3rd", value: Number(rangeData?.totals.thirdFollowUpEmailCount || 0), fill: MIX_COLORS[3] },
    { name: "Final follow-up", axisLabel: "Final", value: Number(rangeData?.totals.finalFollowUpEmailCount || 0), fill: MIX_COLORS[4] },
  ], [rangeData?.totals]);
  const mixDomainMax = Math.max(1, ...mixData.map((entry) => entry.value));

  return (
    <div id="inventory-panel-outreach" role="tabpanel" aria-labelledby="inventory-tab-outreach" className="space-y-4">
      <section className="border border-zinc-200 bg-white p-4 shadow-[0_1px_2px_rgba(60,64,67,0.08)]">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-blue-50 text-blue-700"><CalendarDays className="h-4 w-4" aria-hidden="true" /></span>
            <div className="min-w-0">
              <label htmlFor="outreach-timezone" className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-zinc-400">Send timezone</label>
              <select id="outreach-timezone" value={timeZone} onChange={(event) => updateTimeZone(event.target.value)} className="mt-1 block h-9 w-full max-w-[24rem] border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-800 outline-none transition-colors hover:border-zinc-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100">
                {timeZones.map((zone) => <option key={zone} value={zone}>{zone.replaceAll("_", " ")}</option>)}
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-end gap-2">
            <label className="text-[0.65rem] font-semibold uppercase tracking-[0.13em] text-zinc-400">From<input type="date" value={rangeDraft.startDate} max={rangeDraft.endDate} onChange={(event) => setRangeDraft((current) => ({ ...current, startDate: event.target.value }))} className="mt-1 block h-9 border border-zinc-300 bg-white px-3 text-sm font-medium normal-case tracking-normal text-zinc-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100" /></label>
            <label className="text-[0.65rem] font-semibold uppercase tracking-[0.13em] text-zinc-400">To<input type="date" value={rangeDraft.endDate} min={rangeDraft.startDate} onChange={(event) => setRangeDraft((current) => ({ ...current, endDate: event.target.value }))} className="mt-1 block h-9 border border-zinc-300 bg-white px-3 text-sm font-medium normal-case tracking-normal text-zinc-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100" /></label>
            <button type="button" onClick={applyRange} disabled={rangeInvalid} className="h-9 bg-blue-600 px-4 text-xs font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">Apply</button>
            <button type="button" onClick={resetSevenDays} className="h-9 border border-zinc-300 bg-white px-4 text-xs font-semibold text-zinc-700 transition-colors hover:border-blue-500 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">Last 7 days</button>
            <button type="button" onClick={() => void loadRange()} disabled={rangeLoading} className="grid h-9 w-9 place-items-center border border-zinc-300 bg-white text-zinc-500 transition-colors hover:border-blue-500 hover:text-blue-700 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" aria-label="Refresh outreach analytics" title="Refresh analytics"><RefreshCw className={`h-4 w-4 ${rangeLoading ? "animate-spin" : ""}`} aria-hidden="true" /></button>
          </div>
        </div>
      </section>

      {rangeError ? <div role="alert" className="border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{rangeError}</div> : null}
      {rangeLoading && !rangeData ? <div className="grid h-[26rem] place-items-center border border-zinc-200 bg-white"><Loader2 className="h-6 w-6 animate-spin text-blue-600" aria-label="Loading outreach analytics" /></div> : null}

      {rangeData ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Metric icon={MailCheck} label="Sent" value={rangeData.totals.sentEmailCount} tone="bg-blue-50 text-blue-700" />
            <Metric icon={UserRoundCheck} label="Leads" value={rangeData.totals.contactedLeadCount} tone="bg-emerald-50 text-emerald-700" />
            <Metric icon={Megaphone} label="Campaigns" value={rangeData.totals.campaignCount} tone="bg-amber-50 text-amber-700" />
            <Metric icon={GitBranch} label="Follow-ups" value={rangeData.totals.followUpEmailCount} tone="bg-violet-50 text-violet-700" />
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(22rem,.5fr)]">
            <section className="border border-zinc-200 bg-white p-5 shadow-[0_1px_2px_rgba(60,64,67,0.08)]">
              <div className="flex flex-wrap items-baseline justify-between gap-2"><h3 className="text-base font-semibold tracking-tight text-zinc-950">Campaign activity</h3><span className="text-xs tabular-nums text-zinc-400">{shortDate(rangeData.startDate)} – {shortDate(rangeData.endDate)}</span></div>
              {rangeData.totals.sentEmailCount ? (
                <div className="mt-4 h-[24rem] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={activityData} margin={{ top: 14, right: 18, left: -8, bottom: activityData.length > 14 ? 24 : 4 }}>
                      <CartesianGrid stroke="#e4e4e7" strokeDasharray="3 5" vertical={false} />
                      <XAxis dataKey="date" tickFormatter={shortDate} tick={{ fill: "#71717a", fontSize: 10 }} axisLine={false} tickLine={false} minTickGap={18} />
                      <YAxis allowDecimals={false} tick={{ fill: "#71717a", fontSize: 10 }} axisLine={false} tickLine={false} width={42} />
                      <Tooltip labelFormatter={(value) => shortDate(String(value))} contentStyle={{ border: "1px solid #e4e4e7", borderRadius: 0, boxShadow: "0 12px 35px -22px rgba(15,23,42,.55)", fontSize: 12 }} />
                      <Legend wrapperStyle={{ fontSize: 11, paddingTop: 12 }} />
                      <Bar dataKey="sentEmailCount" name="Sent" fill="#2563eb" radius={[3, 3, 0, 0]} maxBarSize={24} />
                      <Bar dataKey="contactedLeadCount" name="Leads" fill="#86efac" radius={[3, 3, 0, 0]} maxBarSize={24} />
                      <Line type="monotone" dataKey="campaignCount" name="Campaigns" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 3, fill: "#fff", strokeWidth: 2 }} activeDot={{ r: 5 }} />
                      <Line type="monotone" dataKey="followUpEmailCount" name="Follow-ups" stroke="#8b5cf6" strokeWidth={2.5} strokeDasharray="5 4" dot={{ r: 2.5, fill: "#fff", strokeWidth: 2 }} activeDot={{ r: 5 }} />
                      {activityData.length > 14 ? <Brush dataKey="date" height={18} travellerWidth={8} tickFormatter={shortDate} stroke="#a1a1aa" /> : null}
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              ) : <div className="grid h-[24rem] place-items-center text-center"><div><MailCheck className="mx-auto h-8 w-8 text-zinc-300" aria-hidden="true" /><p className="mt-3 text-sm font-medium text-zinc-600">No sent emails in this window</p></div></div>}
            </section>

            <section className="border border-zinc-200 bg-white p-5 shadow-[0_1px_2px_rgba(60,64,67,0.08)]">
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="text-base font-semibold tracking-tight text-zinc-950">Email mix</h3>
                <span className="text-xs tabular-nums text-zinc-400">{number(rangeData.totals.sentEmailCount)} sent</span>
              </div>
              <div className="mt-1 h-[17rem]" role="img" aria-label={`Email mix spider chart. ${mixData.map((entry) => `${entry.name}: ${number(entry.value)}`).join(", ")}`}>
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={mixData} cx="50%" cy="50%" outerRadius="70%" margin={{ top: 10, right: 24, bottom: 10, left: 24 }}>
                    <PolarGrid gridType="polygon" stroke="#e4e4e7" radialLines />
                    <PolarAngleAxis dataKey="axisLabel" tick={{ fill: "#71717a", fontSize: 11, fontWeight: 600 }} tickLine={false} />
                    <PolarRadiusAxis domain={[0, mixDomainMax]} tick={false} axisLine={false} />
                    <Radar name="Emails" dataKey="value" stroke="#2563eb" strokeWidth={2.5} fill="#2563eb" fillOpacity={0.2} dot={{ r: 3.5, fill: "#2563eb", stroke: "#ffffff", strokeWidth: 1.5 }} activeDot={{ r: 5 }} />
                    <Tooltip labelFormatter={(label) => mixData.find((entry) => entry.axisLabel === label)?.name ?? String(label)} formatter={(value) => [number(Number(value)), "Emails"]} contentStyle={{ border: "1px solid #e4e4e7", borderRadius: 0, boxShadow: "0 12px 35px -22px rgba(15,23,42,.55)", fontSize: 12 }} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-5 xl:grid-cols-2 2xl:grid-cols-5">
                {mixData.map((entry) => <div key={entry.name} className="min-w-0 bg-zinc-50 px-2.5 py-2.5"><span className="mb-1.5 block h-1 w-6" style={{ backgroundColor: entry.fill }} /><p className="text-base font-light tabular-nums text-zinc-950">{number(entry.value)}</p><p className="truncate text-[0.58rem] font-semibold uppercase tracking-wider text-zinc-400" title={entry.name}>{entry.name}</p></div>)}
              </div>
            </section>
          </div>
        </>
      ) : null}

      <section className="overflow-hidden border border-zinc-200 bg-white shadow-[0_1px_2px_rgba(60,64,67,0.08)]">
        <div className="flex flex-col gap-3 border-b border-zinc-200 px-5 py-4 sm:flex-row sm:items-end sm:justify-between">
          <div><h3 className="text-base font-semibold tracking-tight text-zinc-950">Campaign records</h3><p className="mt-1 text-xs text-zinc-400">Sent emails for one calendar day</p></div>
          <div className="flex items-end gap-2">
            <label className="text-[0.65rem] font-semibold uppercase tracking-[0.13em] text-zinc-400">Record date<input type="date" value={recordDate} onChange={(event) => { if (!event.target.value) return; setRecordData(null); setRecordDate(event.target.value); }} className="mt-1 block h-9 border border-zinc-300 bg-white px-3 text-sm font-medium normal-case tracking-normal text-zinc-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100" /></label>
            <button type="button" onClick={() => void loadRecords()} disabled={recordLoading} className="grid h-9 w-9 place-items-center border border-zinc-300 bg-white text-zinc-500 transition-colors hover:border-blue-500 hover:text-blue-700 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" aria-label="Refresh campaign records" title="Refresh records"><RefreshCw className={`h-4 w-4 ${recordLoading ? "animate-spin" : ""}`} aria-hidden="true" /></button>
            <span className="mb-0.5 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold tabular-nums text-blue-700">{number(recordData?.items.length || 0)}</span>
          </div>
        </div>

        {recordError ? <div role="alert" className="border-b border-rose-200 bg-rose-50 px-5 py-3 text-sm text-rose-700">{recordError}</div> : null}
        {recordLoading && !recordData ? <div className="grid h-40 place-items-center"><Loader2 className="h-5 w-5 animate-spin text-blue-600" aria-label="Loading campaign records" /></div> : null}
        {recordData?.items.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1220px] text-left text-sm">
              <thead className="bg-zinc-50 text-[0.65rem] uppercase tracking-[0.13em] text-zinc-400"><tr><th className="px-5 py-3 font-semibold">Campaign ID</th><th className="px-4 py-3 font-semibold">Campaign</th><th className="px-4 py-3 font-semibold">Sent</th><th className="px-4 py-3 font-semibold">Leads</th><th className="px-4 py-3 font-semibold">Initial</th><th className="px-4 py-3 font-semibold">1st</th><th className="px-4 py-3 font-semibold">2nd</th><th className="px-4 py-3 font-semibold">3rd</th><th className="px-5 py-3 font-semibold">Final</th></tr></thead>
              <tbody className="divide-y divide-zinc-100">
                {recordData.items.map((item) => (
                  <tr key={item.campaignId} className="transition-colors hover:bg-blue-50/30">
                    <td className="max-w-[17rem] px-5 py-3 font-mono text-xs"><CopyValue value={item.campaignId} label="campaign ID" /></td>
                    <td className="max-w-[26rem] px-4 py-3 font-medium"><CopyValue value={item.campaignName} label="campaign name" /></td>
                    <td className="px-4 py-3 tabular-nums text-zinc-700">{number(item.sentEmailCount)}</td><td className="px-4 py-3 tabular-nums text-zinc-700">{number(item.contactedLeadCount)}</td><td className="px-4 py-3 tabular-nums text-zinc-700">{number(item.initialEmailCount)}</td><td className="px-4 py-3 tabular-nums text-zinc-700">{number(item.firstFollowUpEmailCount)}</td><td className="px-4 py-3 tabular-nums text-zinc-700">{number(item.secondFollowUpEmailCount)}</td><td className="px-4 py-3 tabular-nums text-zinc-700">{number(item.thirdFollowUpEmailCount)}</td><td className="px-5 py-3 tabular-nums text-zinc-700">{number(item.finalFollowUpEmailCount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
        {recordData && !recordData.items.length ? <div className="grid h-40 place-items-center text-center"><div><MailCheck className="mx-auto h-7 w-7 text-zinc-300" aria-hidden="true" /><p className="mt-2 text-sm font-medium text-zinc-600">No sent emails on this date</p></div></div> : null}
      </section>
    </div>
  );
}
