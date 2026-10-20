"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, RefreshCw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CampaignPageHeader } from "@/components/campaigns/CampaignListPresentation";
import { LeadSheetPanel, LeadSheetFilterButtons, leadSheetToolbarClassName } from "@/components/leads/LeadSheetPresentation";
import { useOutreachResource } from "@/hooks/useOutreachResource";
import { OUTREACH_DEPARTMENTS, statusLabel, type OutreachDepartment, type OutreachLeadsResponse } from "@/lib/automatedOutreach";
import { deliveryStateLabels } from "@/lib/outreachActivity";
import { OutreachFeedback } from "./OutreachStatus";
import { OutreachLeadRow } from "./OutreachLeadRow";
import { OutreachPagination } from "./OutreachPagination";

const selectClass = "mt-1 h-9 w-full rounded-md border border-zinc-300/80 bg-white/80 px-2 text-sm text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300";

export function OutreachLeadTable({ department, eventKey }: { department?: OutreachDepartment; eventKey?: string }) {
  const [selectedDepartment, setDepartment] = useState("");
  const [selectedEvent, setEvent] = useState("");
  const [cluster, setCluster] = useState("");
  const [state, setState] = useState("");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [offset, setOffset] = useState(0);
  const effectiveDepartment = department || selectedDepartment;
  const effectiveEvent = eventKey || selectedEvent;
  const params = new URLSearchParams({ offset: String(offset), limit: "25" });
  if (effectiveDepartment) params.set("department", effectiveDepartment);
  if (effectiveEvent) params.set("eventKey", effectiveEvent);
  if (cluster) params.set("workflowStatus", cluster);
  if (state) params.set("state", state);
  if (query) params.set("search", query);
  const { data, error, reload, refreshing } = useOutreachResource<OutreachLeadsResponse>(`/leads?${params}`);
  const totalTabs = data?.tabs.reduce((sum, tab) => sum + tab.count, 0) ?? 0;
  const columns = ["No.", "Profile", ...(!eventKey ? ["Event / campaign"] : []), "Contact Info", "Content", "Lead status", "Delivery state", "Emails sent", "Quick Actions"];
  return <div className="space-y-5 font-sans text-zinc-900 dark:text-zinc-100">
    {department && <>
      <Link href={`/admin/lead-intelligence/${department}`} className="inline-flex items-center gap-2 text-xs text-zinc-500 hover:text-zinc-900"><ArrowLeft className="h-3.5 w-3.5" />{statusLabel(department)} events</Link>
      <CampaignPageHeader title={data?.events?.find(event => event.key === eventKey)?.name || data?.items[0]?.eventName || statusLabel(eventKey || "Event leads")} description="3 status-based messages · 4 days apart" />
    </>}
    <LeadSheetPanel>
      <div className="space-y-4 px-6 pt-0.5">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {!department && <label className="min-w-0 text-xs font-medium text-zinc-500">Department<select aria-label="Filter by department" value={selectedDepartment} onChange={(event) => { setDepartment(event.target.value); setEvent(""); setCluster(""); setOffset(0); }} className={selectClass}><option value="">All departments</option>{OUTREACH_DEPARTMENTS.map(item => <option key={item.key} value={item.key}>{item.label}</option>)}</select></label>}
          {!eventKey && <label className="min-w-0 text-xs font-medium text-zinc-500">Event / campaign<select aria-label="Filter by event or campaign" value={selectedEvent} onChange={(event) => { setEvent(event.target.value); setCluster(""); setOffset(0); }} className={selectClass}><option value="">All events / campaigns</option>{data?.events?.map(item => <option key={item.key} value={item.key}>{item.name}</option>)}</select></label>}
          {!eventKey && <label className="min-w-0 text-xs font-medium text-zinc-500">Lead status<select aria-label="Filter by lead status" value={cluster} onChange={(event) => { setCluster(event.target.value); setOffset(0); }} className={selectClass}><option value="">All lead statuses</option>{data?.tabs.map(item => <option key={item.key} value={item.key}>{item.label} ({item.count})</option>)}</select></label>}
          <label className="min-w-0 text-xs font-medium text-zinc-500">Delivery state<select aria-label="Filter outreach state" value={state} onChange={(event) => { setState(event.target.value); setOffset(0); }} className={selectClass}><option value="">All delivery states</option>{Object.entries(deliveryStateLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        </div>
        {eventKey && <div className="space-y-2"><p className="text-xs font-medium text-zinc-500">Filter by lead status</p><nav aria-label="Lead status" className={leadSheetToolbarClassName}><LeadSheetFilterButtons items={[{ key: "", label: "All leads", count: totalTabs }, ...(data?.tabs ?? [])]} value={cluster} onChange={(key) => { setCluster(key); setOffset(0); }} /></nav></div>}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-zinc-500">Lead status is the department’s workflow stage. Delivery state shows whether Status Outreach can continue.</p>
          <div className="flex flex-wrap items-center gap-2"><form onSubmit={(event) => { event.preventDefault(); setQuery(search.trim()); setOffset(0); }} className="relative"><button type="submit" aria-label="Search leads" className="absolute left-3 top-2 text-zinc-400"><Search className="h-3.5 w-3.5" /></button><Input aria-label="Search leads by name, company or email" placeholder="Name, company or email" value={search} onChange={(event) => { setSearch(event.target.value); if (!event.target.value) { setQuery(""); setOffset(0); } }} className="h-8 w-56 border-zinc-300/80 bg-white/80 pl-8 text-xs" /></form>
          <Button type="button" variant="outline" aria-label="Refresh leads" disabled={refreshing} onClick={reload} className="h-8 gap-1.5 px-2 text-xs"><RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />Refresh</Button></div>
        </div>
      </div>
      <div className="relative z-[2] px-4"><OutreachFeedback error={error} loading={!data && !error} reload={reload} />
        {data && <div className="overflow-x-auto"><table className="w-full min-w-[1200px] text-left"><caption className="sr-only">Lead outreach by event, workflow status and delivery state</caption>
          <thead className="border-b border-zinc-100/85 bg-white/70 dark:border-zinc-700 dark:bg-zinc-800"><tr>{columns.map((title) => <th scope="col" key={title} className={`px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-zinc-400 ${title === "Quick Actions" ? "text-right" : title === "Emails sent" ? "text-center" : ""}`}>{title}</th>)}</tr></thead>
          <tbody className="divide-y divide-zinc-100/70 dark:divide-zinc-700">{data.items.map((lead, index) => <OutreachLeadRow key={lead.id} lead={lead} number={offset + index + 1} showEvent={!eventKey} reload={reload} />)}{!data.items.length && <tr><td colSpan={columns.length} className="px-6 py-10 text-center text-sm text-zinc-500">No leads match these filters. Try another event, lead status or delivery state.</td></tr>}</tbody>
        </table></div>}
      </div>
      {data && <OutreachPagination page={Math.floor(offset / 25) + 1} pageSize={25} total={data.total} onChange={(page) => setOffset((page - 1) * 25)} />}
    </LeadSheetPanel>
  </div>;
}