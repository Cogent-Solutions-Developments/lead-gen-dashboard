"use client";

import { useState } from "react";
import { Mail, Check, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useOutreachResource } from "@/hooks/useOutreachResource";
import { OUTREACH_DEPARTMENTS, type OutreachConfiguration, type OutreachDepartment, type OutreachEmailTemplate, type OutreachEvent } from "@/lib/automatedOutreach";
import { saveOutreachTemplates } from "@/lib/automatedOutreachApi";

const topics = ["Relevant speakers", "Relevant companies represented", "Personalized programme highlights"];
const hints = ["Two speaker bullets with name, role, organisation and relevance.", "Represented companies, recipient relevance and potential commercial value. No bullets.", "Three programme bullets connected to the lead's role or company."];
const selectClass = "mt-1.5 h-10 w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900";

export function OutreachTemplateSettings({config, reload}: {config: OutreachConfiguration; reload: () => void}) {
  const [department, setDepartment] = useState<OutreachDepartment>("sales");
  const [eventKey, setEventKey] = useState("");
  const {data, error} = useOutreachResource<{items: OutreachEvent[]}>(`/events?department=${department}`);
  const selected = data?.items.find(event => event.key === eventKey);
  return <section aria-label="Event email templates" className="mt-8 border-t border-slate-200 pt-6 dark:border-slate-700">
    <div className="mb-5 flex items-start gap-3"><Mail className="mt-1 h-5 w-5 shrink-0 text-blue-600" /><div><h3 className="font-semibold">Event email templates</h3><p className="mt-1 text-sm leading-6 text-slate-500">Save all three emails for each event and department. Saved templates are used automatically when template mode and delivery are enabled. Editing them does not restart any lead’s sequence.</p></div></div>
    <div className="mb-5 grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
      <label className="min-w-0 text-xs font-medium">Department<select className={selectClass} value={department} onChange={event => {setDepartment(event.target.value as OutreachDepartment); setEventKey("");}}>{OUTREACH_DEPARTMENTS.map(item => <option key={item.key} value={item.key}>{item.label}</option>)}</select></label>
      <label className="min-w-0 text-xs font-medium">Event<select className={selectClass} value={eventKey} onChange={event => setEventKey(event.target.value)}><option value="">Select an event</option>{data?.items.map(event => <option key={event.key} value={event.key}>{event.name}</option>)}</select></label>
    </div>
    {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
    {!eventKey && <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">Choose an event to configure its three emails.</p>}
    {selected && <TemplateEditor key={`${department}:${eventKey}`} config={config} department={department} eventKey={eventKey} eventName={selected.name} reload={reload} />}
  </section>;
}

export function TemplateEditor({config, department, eventKey, eventName, reload}: {config: OutreachConfiguration; department: OutreachDepartment; eventKey: string; eventName: string; reload: () => void}) {
  const initial = () => config.eventTemplates?.[department]?.[eventKey] ?? config.templateStarters ?? topics.map(() => ({subject: "", body: ""}));
  const [templates, setTemplates] = useState<OutreachEmailTemplate[]>(initial);
  const [revision, setRevision] = useState(config.revision);
  const [baseline, setBaseline] = useState(() => JSON.stringify(config.eventTemplates?.[department]?.[eventKey] ?? null));
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const saved = Boolean(config.eventTemplates?.[department]?.[eventKey]?.length);
  const stale = config.revision > revision && JSON.stringify(config.eventTemplates?.[department]?.[eventKey] ?? null) !== baseline;
  function update(key: "subject" | "body", value: string) {setTemplates(current => current.map((item, index) => index === step ? {...item, [key]: value} : item));}
  return <form aria-label={`Email templates for ${eventName}`} className="space-y-5" onSubmit={async event => {
    event.preventDefault(); setBusy(true); setError(null);
    try {const result = await saveOutreachTemplates({revision: Math.max(revision, config.revision), department, eventKey, templates}); const savedTemplates = result.eventTemplates?.[department]?.[eventKey] ?? templates; setRevision(result.revision); setTemplates(savedTemplates); setBaseline(JSON.stringify(savedTemplates)); toast.success("Three event templates saved"); reload();}
    catch (error) {setError(error instanceof Error ? error.message : "Could not save templates"); reload();}
    finally {setBusy(false);}
  }}>
    <div className="flex flex-wrap items-center justify-between gap-2"><h4 className="text-sm font-medium">{eventName}</h4><span className={`flex items-center gap-1 text-xs ${saved ? "text-emerald-700" : "text-amber-700"}`}>{saved && <Check className="h-3.5 w-3.5" />}{saved ? "Saved templates available" : "Setup needed · no template emails will send yet"}</span></div>
    <div role="tablist" aria-label="Email sequence" className="grid gap-2 md:grid-cols-3">{topics.map((topic, index) => <button key={topic} id={`email-template-tab-${index}`} type="button" role="tab" aria-selected={step === index} aria-controls="email-template-panel" onClick={() => setStep(index)} onKeyDown={event => {if (event.key === "ArrowRight" || event.key === "ArrowLeft") {event.preventDefault(); const next = (index + (event.key === "ArrowRight" ? 1 : 2)) % 3; setStep(next); document.getElementById(`email-template-tab-${next}`)?.focus();}}} className={`rounded-xl border p-3 text-left ${step === index ? "border-blue-500 bg-blue-50 text-blue-800 dark:bg-blue-950 dark:text-blue-200" : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"}`}><span className="block text-xs">Email {index + 1} · {index === 0 ? "When eligible" : "4 days after previous send"}</span><span className="mt-1 block text-sm font-semibold">{topic}</span></button>)}</div>
    <fieldset disabled={busy} id="email-template-panel" role="tabpanel" aria-labelledby={`email-template-tab-${step}`} className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 sm:p-5 dark:border-slate-700 dark:bg-slate-900">
      <p className="text-xs leading-5 text-slate-500">{hints[step]} Keep the sample’s greeting, paragraph order, one question and “Best regards,” closing. Replace every [Add …] instruction with verified information.</p>
      <label className="block text-xs font-medium">Subject<Input value={templates[step].subject} onChange={event => update("subject", event.target.value)} required maxLength={240} className="mt-1.5" /></label>
      <label className="block text-xs font-medium">Email body<Textarea value={templates[step].body} onChange={event => update("body", event.target.value)} required maxLength={6000} rows={17} className="mt-1.5 text-sm leading-6" /></label>
      <details className="text-xs text-slate-500"><summary className="flex cursor-pointer items-center gap-1">Personalisation variables<ChevronDown className="h-3 w-3" /></summary><div className="mt-3 flex flex-wrap gap-2">{config.templateVariables?.map(variable => <code key={variable} className="rounded bg-slate-100 px-2 py-1 dark:bg-slate-800">{`{{${variable}}}`}</code>)}</div><p className="mt-2 leading-5">Only use values that exist on the lead or event. Missing values prevent sending and appear in delivery tracking.</p></details>
    </fieldset>
    {stale && <div role="alert" className="rounded-lg border border-amber-200 p-3 text-sm">These event templates changed. Your draft is retained. <Button type="button" variant="outline" disabled={busy} onClick={() => {setTemplates(initial()); setRevision(config.revision); setBaseline(JSON.stringify(config.eventTemplates?.[department]?.[eventKey] ?? null)); setError(null);}}>Reload saved templates</Button></div>}
    {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
    {config.contentMode === "generated" && <p className="text-xs text-amber-700">Generated mode is currently enabled. These templates will be used after you select and save template mode above.</p>}
    <Button type="submit" disabled={busy || stale} className="bg-blue-600 text-white">{busy ? "Saving…" : "Save all three templates"}</Button>
  </form>;
}
