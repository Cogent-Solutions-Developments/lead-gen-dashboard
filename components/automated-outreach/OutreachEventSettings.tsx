"use client";

import Link from "next/link";
import { useState } from "react";
import { FileText, Sparkles } from "lucide-react";
import { useOutreachResource } from "@/hooks/useOutreachResource";
import { setEventContentMode } from "@/lib/automatedOutreachApi";
import { LINKEDIN_AGENTIC_DISABLED_REASON, eventContentMode, type OutreachConfiguration, type OutreachContentMode, type OutreachDepartment } from "@/lib/automatedOutreach";
import { OutreachModeToggle } from "./OutreachModeToggle";
import { TemplateEditor } from "./OutreachTemplateSettings";
import { OutreachFeedback } from "./OutreachStatus";

export function OutreachEventSettings({department, eventKey, eventName, onSaved, backHref}: {department: OutreachDepartment; eventKey: string; eventName: string; backHref?: string; onSaved: () => void}) {
  const {data, error, reload} = useOutreachResource<OutreachConfiguration>(department === "linkedin" ? "/configuration?department=linkedin" : "/configuration");
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
  const missingConfiguration = (data?.missingConfiguration ?? []).filter(issue => mode === "generated" || issue !== "Content generation credential is not configured");
  const mailSettingsHref = `/settings?section=outreach&department=${data?.mailWebhookGroup ?? (department === "linkedin" ? "sales" : "status-outreach")}`;
  return <section aria-label="Event outreach setup" className="min-w-0 rounded-2xl border border-violet-200/80 bg-white p-5 shadow-sm dark:border-violet-900 dark:bg-slate-950 sm:p-6">
    <header className="mb-5 flex flex-wrap items-start justify-between gap-4"><div className="flex items-start gap-3"><span className="rounded-lg border border-violet-200 bg-violet-50 p-2.5 text-violet-700"><FileText className="h-5 w-5" /></span><div><h2 className="text-sm font-semibold">Status Outreach sequence</h2><p className="mt-1 max-w-2xl text-xs leading-5 text-slate-500">Three emails for this event. Email 1 starts when ready; emails 2 and 3 follow four days after the previous send.</p></div></div>{data && <OutreachModeToggle label="Content mode for this event" value={mode} onChange={mode => void change(mode)} generatedDisabledReason={department === "linkedin" ? LINKEDIN_AGENTIC_DISABLED_REASON : undefined} disabled={busy} />}</header>
    {department === "linkedin" && <p role="status" className="mb-4 text-xs text-zinc-500">{LINKEDIN_AGENTIC_DISABLED_REASON}</p>}
    {department === "linkedin" && <p className="mb-4 text-xs text-zinc-500">Emails use your <Link href={mailSettingsHref} className="font-medium underline">Sales mail settings</Link>.</p>}
    <OutreachFeedback error={error} loading={!data && !error} reload={reload} />
    {saveError && <p role="alert" className="mb-4 text-sm text-red-600">{saveError}</p>}
    {!!missingConfiguration.length && <div role="status" className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900"><p className="font-semibold">Outreach setup needs attention</p><ul className="mt-2 space-y-1">{missingConfiguration.map(issue => <li key={issue}>{issue}</li>)}</ul><Link href={mailSettingsHref} className="mt-2 inline-block font-medium underline">Open mail settings</Link></div>}
    {data && !eventDeliveryEnabled && <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">Automatic email delivery is off for this event. Content preparation continues in the selected mode. Use its Send mail toggle on the <Link className="font-semibold underline" href={backHref ?? `/admin/lead-intelligence/${department}`}>{department === "linkedin" ? "campaigns page" : `${department} events page`}</Link> to enable delivery.</p>}
    {data && <div hidden={mode !== "template"}><TemplateEditor key={`${department}:${eventKey}`} config={data} department={department} eventKey={eventKey} eventName={eventName} reload={() => {reload(); onSaved();}} /></div>}
    {data && mode === "generated" && <div className="flex items-start gap-3 rounded-xl bg-violet-50 p-4 dark:bg-violet-950/40"><Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-violet-600" /><div><h3 className="text-sm font-semibold">Agentic content preparation is automatic</h3><p className="mt-1 text-xs leading-6 text-slate-600 dark:text-slate-400">The agents research the event and eligible leads, then write and check all three emails. The Send mail toggle for that event controls delivery only. Missing event evidence can pause content preparation; delivery issues pause sending for recovery.</p><Link href="/settings/content-generation?tab=status-outreach" className="mt-2 inline-block text-xs font-medium text-violet-700 underline">Agent settings and recovery</Link></div></div>}
    <p className="mt-4 text-xs leading-5 text-slate-500">Status changes keep the same sequence. Deal Closed or Confirmed stops further emails. Changing content mode does not restart a lead.</p>
  </section>;
}
