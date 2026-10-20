"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, RefreshCw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CampaignPageHeader } from "@/components/campaigns/CampaignListPresentation";
import { LeadSheetPanel, LeadSheetFilterButtons, leadSheetToolbarClassName } from "@/components/leads/LeadSheetPresentation";
import { useOutreachResource } from "@/hooks/useOutreachResource";
import { statusLabel, type OutreachDepartment, type OutreachLeadsResponse } from "@/lib/automatedOutreach";
import { OutreachFeedback } from "./OutreachStatus";
import { OutreachLeadRow } from "./OutreachLeadRow";
import { OutreachPagination } from "./OutreachPagination";

export function OutreachLeadTable({ department, eventKey }: { department?: OutreachDepartment; eventKey?: string }) {
  const [cluster, setCluster] = useState("");
  const [state, setState] = useState("");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [offset, setOffset] = useState(0);
  const params = new URLSearchParams({ offset: String(offset), limit: "25" });
  if (department) params.set("department", department);
  if (eventKey) params.set("eventKey", eventKey);
  if (cluster) params.set("workflowStatus", cluster);
  if (state) params.set("state", state);
  if (query) params.set("search", query);
  const { data, error, reload, refreshing } = useOutreachResource<OutreachLeadsResponse>(`/leads?${params}`);
  const totalTabs = data?.tabs.reduce((sum, tab) => sum + tab.count, 0) ?? 0;
  return <div className="space-y-5 font-sans text-zinc-900 dark:text-zinc-100">
    {department && <>
      <Link href={`/admin/lead-intelligence/${department}`} className="inline-flex items-center gap-2 text-xs text-zinc-500 hover:text-zinc-900"><ArrowLeft className="h-3.5 w-3.5" />{statusLabel(department)} events</Link>
      <CampaignPageHeader title={data?.items[0]?.eventName || statusLabel(eventKey || "Event leads")} description="3 automatic follow-ups · 4 days apart" />
    </>}
    <LeadSheetPanel>
      <div className="relative z-[6] flex flex-wrap items-center justify-between gap-3 px-6 pt-0.5">
        <nav aria-label="Lead status" className={leadSheetToolbarClassName}><LeadSheetFilterButtons items={[{ key: "", label: "All leads", count: totalTabs }, ...(data?.tabs ?? [])]} value={cluster} onChange={(key) => { setCluster(key); setOffset(0); }} /></nav>
        <div className="flex flex-wrap items-center gap-2">
          <form onSubmit={(event) => { event.preventDefault(); setQuery(search.trim()); setOffset(0); }} className="relative"><button type="submit" aria-label="Search leads" className="absolute left-3 top-2 text-zinc-400"><Search className="h-3.5 w-3.5" /></button><Input aria-label="Search leads by name, company or email" placeholder="Search leads" value={search} onChange={(event) => { setSearch(event.target.value); if (!event.target.value) { setQuery(""); setOffset(0); } }} className="h-8 w-56 border-zinc-300/80 bg-white/80 pl-8 text-xs" /></form>
          <select aria-label="Filter outreach state" value={state} onChange={(event) => { setState(event.target.value); setOffset(0); }} className="h-8 rounded-md border border-zinc-300/80 bg-white/80 px-2 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"><option value="">All follow-ups</option>{["active", "paused", "attention", "failed", "blocked", "completed", "stopped", "opted_out", "replied", "bounced"].map((value) => <option key={value} value={value}>{statusLabel(value)}</option>)}</select>
          <Button type="button" variant="outline" aria-label="Refresh leads" title="Refresh leads" disabled={refreshing} onClick={reload} className="h-8 w-8 p-0"><RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} /></Button>
        </div>
      </div>
      <div className="relative z-[2] px-4"><OutreachFeedback error={error} loading={!data && !error} reload={reload} />
        {data && <div className="overflow-x-auto"><table className="w-full min-w-[1000px] text-left"><caption className="sr-only">Lead profiles, contact information and automatic follow-up activity</caption>
          <thead className="border-b border-zinc-100/85 bg-white/70 dark:border-zinc-700 dark:bg-zinc-800"><tr>{["No.", "Profile", "Contact Info", "Content", "Status", "Sent", "Quick Actions"].map((title) => <th scope="col" key={title} className={`px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-zinc-400 ${title === "Quick Actions" ? "text-right" : title === "Sent" ? "text-center" : ""}`}>{title}</th>)}</tr></thead>
          <tbody className="divide-y divide-zinc-100/70 dark:divide-zinc-700">{data.items.map((lead, index) => <OutreachLeadRow key={lead.id} lead={lead} number={offset + index + 1} showEvent={!eventKey} reload={reload} />)}{!data.items.length && <tr><td colSpan={7} className="px-6 py-10 text-center text-sm text-zinc-500">No leads match this status or filter.</td></tr>}</tbody>
        </table></div>}
      </div>
      {data && <OutreachPagination page={Math.floor(offset / 25) + 1} pageSize={25} total={data.total} onChange={(page) => setOffset((page - 1) * 25)} />}
    </LeadSheetPanel>
  </div>;
}
