"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, ChevronRight, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CampaignListHeader, CampaignPageHeader, campaignListShellClassName, campaignListRowClassName } from "@/components/campaigns/CampaignListPresentation";
import { useOutreachResource } from "@/hooks/useOutreachResource";
import { statusLabel, type OutreachDepartment, type OutreachEvent } from "@/lib/automatedOutreach";
import { OutreachFeedback } from "./OutreachStatus";
import { OutreachPagination } from "./OutreachPagination";

const eventColumns = "md:grid-cols-[minmax(0,1fr)_minmax(220px,0.7fr)_7.5rem]";

export function OutreachEvents({ department }: { department: OutreachDepartment }) {
  const { data, error, reload } = useOutreachResource<{ items: OutreachEvent[] }>(`/events?department=${department}`);
  const [search, setSearch] = useState("");
  const [requestedPage, setPage] = useState(1);
  const events = (data?.items ?? []).filter((event) => event.name.toLowerCase().includes(search.trim().toLowerCase()));
  const pageSize = 6;
  const page = Math.min(requestedPage, Math.max(1, Math.ceil(events.length / pageSize)));
  return <div className="flex min-h-0 flex-col gap-5 p-1 font-sans lg:h-[calc(100dvh-3rem)]">
    <Link href="/admin/lead-intelligence" className="inline-flex items-center gap-2 text-xs text-zinc-500 hover:text-zinc-900"><ArrowLeft className="h-3.5 w-3.5" />Dashboard</Link>
    <CampaignPageHeader title={`${statusLabel(department)} events`} description="View leads and follow-up activity by event.">
      <div className="relative w-full sm:w-64 sm:shrink-0"><Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-zinc-400" /><Input aria-label="Search events" placeholder="Search events" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} className="h-9 w-full border-zinc-300/80 bg-white/80 pl-9 text-sm" /></div>
    </CampaignPageHeader>
    <OutreachFeedback error={error} loading={!data && !error} reload={reload} />
    {data && <section className={`${campaignListShellClassName} flex-1`} aria-label={`${statusLabel(department)} events`}>
      <CampaignListHeader label="Event" className={`${eventColumns} gap-5`} />
      <div className="scrollbar-modern min-h-0 flex-1 overflow-y-auto">
      {events.slice((page - 1) * pageSize, page * pageSize).map((event) => {
        const href = `/admin/lead-intelligence/${department}/${encodeURIComponent(event.key)}`;
        return <article key={event.key} className={campaignListRowClassName}>
          <div className={`grid gap-5 px-6 py-5 md:min-h-32 md:items-center ${eventColumns}`}>
            <div className="min-w-0"><Link href={href} className="text-base font-semibold text-zinc-900 hover:text-blue-700"><h2>{event.name}</h2></Link><p className="mt-2 text-xs text-zinc-500">{Object.entries(event.statuses).map(([status, count]) => `${statusLabel(status)} ${count}`).join(" · ")}</p></div>
            <div className="grid grid-cols-2 gap-4">{[{ label: "Total leads", value: event.leads }, { label: "Active follow-ups", value: event.active }].map((metric) => <div key={metric.label}><p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">{metric.label}</p><p className="mt-0.5 text-2xl font-bold leading-none text-zinc-900">{metric.value.toLocaleString()}</p></div>)}</div>
            <Button asChild variant="outline" className="h-9 w-fit rounded-md border-zinc-300/80 bg-white/82 px-3.5 text-xs font-semibold text-zinc-700 shadow-[0_8px_14px_-12px_rgba(2,10,27,0.42),inset_0_1px_0_rgba(255,255,255,0.95)] md:justify-self-end"><Link href={href}>View Leads<ChevronRight className="h-4 w-4" /></Link></Button>
          </div>
        </article>;
      })}
      {!events.length && <p className="px-6 py-12 text-center text-sm text-zinc-500">{search ? "No events match your search." : "No event leads available yet."}</p>}
      </div>
      <OutreachPagination page={page} pageSize={pageSize} total={events.length} onChange={setPage} />
    </section>}
  </div>;
}
