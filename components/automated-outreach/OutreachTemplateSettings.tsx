"use client";

import { useState } from "react";
import { Check, Loader2, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { EmailSequenceTemplateEditor } from "@/components/campaigns/EmailSequenceTemplateEditor";
import type { OutreachConfiguration, OutreachDepartment, OutreachEmailTemplate } from "@/lib/automatedOutreach";
import { saveOutreachTemplates } from "@/lib/automatedOutreachApi";

const topics = ["Relevant speakers", "Relevant companies represented", "Programme highlights"];
const hints = ["Two speaker bullets with name, role, organisation and relevance.", "Represented companies, recipient relevance and potential commercial value. No bullets.", "Three programme bullets connected to the lead's role or company."];

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
    <EmailSequenceTemplateEditor
      steps={topics.map((topic, index) => ({label: `${index + 1}. ${topic}`, configured: Boolean(config.eventTemplates?.[department]?.[eventKey]?.[index]?.body)}))}
      bodyRows={10} selected={step} onSelect={setStep} subject={templates[step].subject} body={templates[step].body}
      onSubjectChange={value => update("subject", value)} onBodyChange={value => update("body", value)} disabled={busy}
      hint={<>{hints[step]} Keep the sample’s greeting, paragraph order, one question and “Best regards,” closing. Replace every [Add …] instruction with verified information.</>}
      subjectExtra={<p className="mt-3 text-xs leading-5 text-slate-500">{step === 0 ? "Starts automatically when eligible and ready." : "Sent four days after the previous email."}</p>}
      actions={<><Button type="submit" disabled={busy || stale || templates.some(item => !item.subject.trim() || !item.body.trim())} className="h-10 bg-violet-600 px-3 text-white hover:bg-violet-700">{busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}{busy ? "Saving…" : "Save all 3 templates"}</Button><Button type="button" variant="outline" disabled={busy} className="h-10 border-violet-200 text-violet-700" onClick={() => setTemplates(current => current.map((item, index) => index === step ? {subject: "", body: ""} : item))}><Trash2 className="mr-2 h-4 w-4" />Clear draft</Button></>}
    />
    <details className="text-xs text-slate-500"><summary className="cursor-pointer font-medium">Personalisation variables</summary><div className="mt-3 flex flex-wrap gap-2">{config.templateVariables?.map(variable => <code key={variable} className="rounded bg-slate-100 px-2 py-1 dark:bg-slate-800">{`{{${variable}}}`}</code>)}</div><p className="mt-2 leading-5">Missing lead or event values prevent sending and appear in delivery tracking.</p></details>
    {stale && <div role="alert" className="rounded-lg border border-amber-200 p-3 text-sm">These event templates changed. Your draft is retained. <Button type="button" variant="outline" disabled={busy} onClick={() => {setTemplates(initial()); setRevision(config.revision); setBaseline(JSON.stringify(config.eventTemplates?.[department]?.[eventKey] ?? null)); setError(null);}}>Reload saved templates</Button></div>}
    {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
    <p className="text-xs leading-5 text-slate-500">Save all three complete emails to start automatically when delivery is enabled. Saving does not restart existing sequences.</p>
  </form>;
}
