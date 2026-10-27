"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { ArrowLeft, ChevronRight, Search, RefreshCw } from "lucide-react";
import { setEventContentMode, setEventOutreach } from "@/lib/automatedOutreachApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CampaignListHeader, CampaignPageHeader, campaignListShellClassName, campaignListRowClassName } from "@/components/campaigns/CampaignListPresentation";
import { useOutreachResource } from "@/hooks/useOutreachResource";
import { statusLabel, type OutreachContentMode, type OutreachDepartment, type OutreachEvent } from "@/lib/automatedOutreach";
import { OutreachFeedback } from "./OutreachStatus";
import { OutreachPagination } from "./OutreachPagination";

import { OutreachModeToggle } from "./OutreachModeToggle";

function EventSwitch({ label, checked, disabled, onChange }: { label: string; checked: boolean; disabled: boolean; onChange: (checked: boolean) => void }) {
  return <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-700">
    <span className="w-7">{checked ? "On" : "Off"}</span>
    <input role="switch" type="checkbox" aria-label={label} className="peer sr-only" checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} />
    <span aria-hidden="true" className="relative h-6 w-11 rounded-full bg-slate-300 transition-colors after:absolute after:left-1 after:top-1 after:h-4 after:w-4 after:rounded-full after:bg-white after:shadow-sm after:transition-transform peer-checked:bg-blue-600 peer-checked:after:translate-x-5 peer-focus-visible:ring-2 peer-focus-visible:ring-blue-500 peer-focus-visible:ring-offset-2 peer-disabled:opacity-50" />
  </label>;
}

const eventColumns = "lg:grid-cols-[minmax(0,1fr)_minmax(170px,0.4fr)_23rem]";

export function OutreachEvents({ department }: { department: OutreachDepartment }) {
  const { data, error, reload, refreshing } = useOutreachResource<{ items: OutreachEvent[]; revision: number; enabled: boolean }>(`/events?department=${department}`, 5000);
  const [saving, setSaving] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const revisionRef = useRef(0);
  async function toggleEvent(event: OutreachEvent, mode: OutreachContentMode) {
    if (!data) return;
    setSaving(event.key); setSaveError(null);
    try { const revision = Math.max(data.revision, revisionRef.current); const saved = await setEventContentMode(department, event.key, mode, revision); revisionRef.current = saved?.revision ?? revision + 1; }
    catch (error) { revisionRef.current = 0; setSaveError(error instanceof Error ? error.message : "Could not update event outreach"); }
    finally { reload(); setSaving(null); }
  }
  async function toggleControl(event: OutreachEvent, enabled: boolean) {
    if (!data) return;
    setSaving(event.key); setSaveError(null);
    try {
      const revision = Math.max(data.revision, revisionRef.current);
      const saved = await setEventOutreach(department, event.key, enabled, revision);
      revisionRef.current = saved?.revision ?? revision + 1;
    } catch (error) { revisionRef.current = 0; setSaveError(error instanceof Error ? error.message : "Could not update event controls"); }
    finally { reload(); setSaving(null); }
  }
  const [search, setSearch] = useState("");
  const [requestedPage, setPage] = useState(1);
  const events = (data?.items ?? []).filter((event) => event.name.toLowerCase().includes(search.trim().toLowerCase()));
  const pageSize = 6;
  const page = Math.min(requestedPage, Math.max(1, Math.ceil(events.length / pageSize)));
  return <div className="flex min-h-0 flex-col gap-5 p-1 font-sans lg:h-[calc(100dvh-3rem)]">
    <Link href="/admin/lead-intelligence" className="inline-flex items-center gap-2 text-xs text-zinc-500 hover:text-zinc-900"><ArrowLeft className="h-3.5 w-3.5" />Dashboard</Link>
    <CampaignPageHeader title={`${statusLabel(department)} events`} description={data?.enabled === false ? "Automatic email delivery is off by default. Content preparation continues for eligible leads." : "View leads and outreach activity by event."}>
      <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto"><div className="relative w-full sm:w-64 sm:shrink-0"><Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-zinc-400" /><Input aria-label="Search events" placeholder="Search events" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} className="h-9 w-full border-zinc-300/80 bg-white/80 pl-9 text-sm" /></div><Button type="button" variant="outline" onClick={reload} disabled={refreshing} aria-label="Refresh events" className="h-9"><RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />Refresh</Button></div>
    </CampaignPageHeader>
    <OutreachFeedback error={error} loading={!data && !error} reload={reload} />
    {saveError && <p role="alert" className="text-sm text-red-700">{saveError}</p>}
    {data && <section className={`${campaignListShellClassName} flex-1`} aria-label={`${statusLabel(department)} events`}>
      <CampaignListHeader label="Event" className={`${eventColumns} gap-5`} />
      <div className="scrollbar-modern min-h-0 flex-1 overflow-y-auto">
      {events.slice((page - 1) * pageSize, page * pageSize).map((event) => {
        const href = `/admin/lead-intelligence/${department}/${encodeURIComponent(event.key)}`;
        return <article key={event.key} className={campaignListRowClassName}>
          <div className={`grid gap-5 px-6 py-5 md:min-h-32 md:items-center ${eventColumns}`}>
            <div className="min-w-0"><Link href={href} className="text-base font-semibold text-zinc-900 hover:text-blue-700"><h2>{event.name}</h2></Link><p className="mt-2 text-xs text-zinc-500">{Object.entries(event.statuses).map(([status, count]) => `${statusLabel(status)} ${count}`).join(" · ")}</p></div>
            <div className="grid grid-cols-2 gap-4">{[{ label: "Total leads", value: event.leads }, { label: "Active leads", value: event.active }].map((metric) => <div key={metric.label}><p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">{metric.label}</p><p className="mt-0.5 text-2xl font-bold leading-none text-zinc-900">{metric.value.toLocaleString()}</p></div>)}</div>
            <div className="flex flex-col items-start gap-3 lg:items-end">
              <div className="flex w-full flex-wrap items-center gap-3 lg:flex-nowrap lg:justify-end">
                <OutreachModeToggle label={`Content mode for ${event.name}`} value={event.contentMode ?? "template"} disabled={saving !== null} onChange={mode => void toggleEvent(event, mode)} />
                <div className="inline-flex shrink-0 items-center gap-1.5"><span className="text-[11px] text-zinc-500">Send mail</span><EventSwitch label={`Automatic email delivery for ${event.name}`} checked={event.outreachEnabled} disabled={saving !== null} onChange={enabled => void toggleControl(event, enabled)} /></div>
              </div>
              <p className="text-xs text-zinc-500">{event.contentMode === "generated" ? "Agentic content" : event.templatesReady ? "3 templates saved" : "Add 3 templates on the lead sheet"}</p>
              <Button asChild variant="outline" className="h-9 w-fit rounded-md border-zinc-300/80 bg-white/82 px-3.5 text-xs font-semibold text-zinc-700 shadow-[0_8px_14px_-12px_rgba(2,10,27,0.42),inset_0_1px_0_rgba(255,255,255,0.95)] lg:justify-self-end"><Link href={href}>View Leads<ChevronRight className="h-4 w-4" /></Link></Button>
            </div>
          </div>
        </article>;
      })}
      {!events.length && <p className="px-6 py-12 text-center text-sm text-zinc-500">{search ? "No events match your search." : "No event leads available yet."}</p>}
      </div>
      <OutreachPagination page={page} pageSize={pageSize} total={events.length} onChange={setPage} />
    </section>}
  </div>;
}
