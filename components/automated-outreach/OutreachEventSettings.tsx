"use client";

import Link from "next/link";
import { useState } from "react";
import { FileText, Sparkles } from "lucide-react";
import { useOutreachResource } from "@/hooks/useOutreachResource";
import { setEventContentMode } from "@/lib/automatedOutreachApi";
import { eventContentMode, type OutreachConfiguration, type OutreachContentMode, type OutreachDepartment } from "@/lib/automatedOutreach";
import { OutreachModeToggle } from "./OutreachModeToggle";
import { TemplateEditor } from "./OutreachTemplateSettings";
import { OutreachFeedback } from "./OutreachStatus";

export function OutreachEventSettings({department, eventKey, eventName, onSaved}: {department: OutreachDepartment; eventKey: string; eventName: string; onSaved: () => void}) {
  const {data, error, reload} = useOutreachResource<OutreachConfiguration>("/configuration");
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  async function change(mode: OutreachContentMode) {
    if (!data) return;
    setBusy(true); setSaveError(null);
    try {await setEventContentMode(department, eventKey, mode, data.revision); reload(); onSaved();}
    catch (error) {setSaveError(error instanceof Error ? error.message : "Could not update event mode"); reload();}
    finally {setBusy(false);}
  }
  const mode = data ? eventContentMode(data, department, eventKey) : "template";
  const eventDeliveryEnabled = data?.eventOutreach?.[department]?.[eventKey] ?? data?.enabled ?? true;
  return <section aria-label="Event outreach setup" className="min-w-0 rounded-2xl border border-violet-200/80 bg-white p-5 shadow-sm dark:border-violet-900 dark:bg-slate-950 sm:p-6">
    <header className="mb-5 flex flex-wrap items-start justify-between gap-4"><div className="flex items-start gap-3"><span className="rounded-lg border border-violet-200 bg-violet-50 p-2.5 text-violet-700"><FileText className="h-5 w-5" /></span><div><h2 className="text-sm font-semibold">Status Outreach sequence</h2><p className="mt-1 max-w-2xl text-xs leading-5 text-slate-500">Three emails for this event. Email 1 starts when ready; emails 2 and 3 follow four days after the previous send.</p></div></div>{data && <OutreachModeToggle label="Content mode for this event" value={mode} onChange={mode => void change(mode)} disabled={busy} />}</header>
    <OutreachFeedback error={error} loading={!data && !error} reload={reload} />
    {saveError && <p role="alert" className="mb-4 text-sm text-red-600">{saveError}</p>}
    {data && !eventDeliveryEnabled && <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">Automatic content preparation and delivery are off for this event. Use its toggle on the <Link className="font-semibold underline" href={`/admin/lead-intelligence/${department}`}>{department} events page</Link> to enable them.</p>}
    {data && <div hidden={mode !== "template"}><TemplateEditor key={`${department}:${eventKey}`} config={data} department={department} eventKey={eventKey} eventName={eventName} reload={() => {reload(); onSaved();}} /></div>}
    {data && mode === "generated" && <div className="flex items-start gap-3 rounded-xl bg-violet-50 p-4 dark:bg-violet-950/40"><Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-violet-600" /><div><h3 className="text-sm font-semibold">Agentic outreach is automatic</h3><p className="mt-1 text-xs leading-6 text-slate-600 dark:text-slate-400">When automatic outreach is enabled for this event, the agents research it and each lead, then write and check all three emails. Sending follows the same event toggle. Missing event evidence or a delivery issue pauses the affected lead for recovery.</p><Link href="/settings/content-generation?tab=status-outreach" className="mt-2 inline-block text-xs font-medium text-violet-700 underline">Agent settings and recovery</Link></div></div>}
    <p className="mt-4 text-xs leading-5 text-slate-500">Status changes keep the same sequence. Deal Closed or Confirmed stops further emails. Changing content mode does not restart a lead.</p>
  </section>;
}
