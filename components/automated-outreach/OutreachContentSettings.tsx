"use client";

import { useState } from "react";
import { ChevronDown, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useOutreachResource } from "@/hooks/useOutreachResource";
import type { OutreachConfiguration } from "@/lib/automatedOutreach";
import { saveOutreachContentConfiguration, type OutreachContentUpdate } from "@/lib/automatedOutreachApi";
import { OutreachFeedback } from "./OutreachStatus";
import { OutreachTemplateSettings } from "./OutreachTemplateSettings";

function contentDraft(config: OutreachConfiguration): OutreachContentUpdate {
  return { revision: config.revision, contentMode: config.contentMode ?? "template", model: config.model, prompt: config.prompt,
    reasoningEffort: config.reasoningEffort, maxOutputTokens: config.maxOutputTokens,
    plannerModel: config.plannerModel || config.model, writerModel: config.writerModel || config.model, reviewerModel: config.reviewerModel || config.model,
    maxRequests: config.maxRequests ?? 6, maxTokens: config.maxTokens ?? 30000, maxContextChars: config.maxContextChars ?? 24000 };
}

export function OutreachContentForm({ config, reload }: { config: OutreachConfiguration; reload: () => void }) {
  const [draft, setDraft] = useState(() => contentDraft(config));
  const [baseline, setBaseline] = useState(() => JSON.stringify({...contentDraft(config), revision: 0}));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const stale = config.revision > draft.revision && JSON.stringify({...contentDraft(config), revision: 0}) !== baseline;
  return <form aria-label="Status Outreach settings" className="space-y-5" onSubmit={async (event) => {
    event.preventDefault(); setBusy(true); setError(null);
    try {
      const saved = await saveOutreachContentConfiguration({...draft, revision: Math.max(draft.revision, config.revision)});
      setDraft(contentDraft(saved));
      setBaseline(JSON.stringify({...contentDraft(saved), revision: 0}));
      toast.success("Outreach content settings saved");
      reload();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not save content settings");
      reload();
    } finally { setBusy(false); }
  }}>
    <fieldset disabled={busy} className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
      <legend className="px-1 text-sm font-semibold">Email content</legend>
      <div className="grid gap-3 sm:grid-cols-2">{([{value: "template", title: "Use saved templates", detail: "Default · Your three event emails, with lead details filled in. No AI generation."}, {value: "generated", title: "Enable generated emails", detail: "Research the event website, personalise each topic, then review before sending."}] as const).map(option => <label key={option.value} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 ${draft.contentMode === option.value ? "border-blue-500 bg-blue-50 dark:bg-blue-950/40" : "border-slate-200 dark:border-slate-700"}`}><input type="radio" name="outreach-content-mode" value={option.value} checked={draft.contentMode === option.value} onChange={() => setDraft({...draft, contentMode: option.value})} className="mt-1" /><span><span className="block text-sm font-semibold">{option.title}</span><span className="mt-1 block text-xs leading-5 text-slate-500 dark:text-slate-400">{option.detail}</span></span></label>)}</div>
      <p className="text-xs leading-5 text-slate-500">One sequence per lead and event: relevant speakers → represented companies → programme highlights. Email 1 starts when eligible and configured; emails 2 and 3 follow four days after the previous send. Status changes never restart the sequence. Deal Closed or Confirmed stops it.</p>
    </fieldset>
    <fieldset hidden={draft.contentMode !== "generated"} disabled={busy || draft.contentMode !== "generated"} className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
      <legend className="px-1 text-sm font-semibold text-slate-900">Agent models and gates</legend>
      <p className="text-xs text-slate-500">Uses the official event website, lead details, fixed email topic and previous sends. The sample format is enforced; missing evidence blocks sending.</p>
      <div className="grid gap-4 md:grid-cols-3">
        {([['plannerModel', 'Planner'], ['writerModel', 'Writer'], ['reviewerModel', 'Reviewer']] as const).map(([key, label]) => <label key={key} className="block text-xs font-medium text-slate-700">{label} model<select aria-label={`${label} model`} value={draft[key]} onChange={(event) => setDraft({ ...draft, [key]: event.target.value })} className="mt-1.5 h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm">{config.modelOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>)}
        <label className="block text-xs font-medium text-slate-700">Reasoning effort
          <select aria-label="Outreach reasoning effort" value={draft.reasoningEffort} onChange={(event) => setDraft({ ...draft, reasoningEffort: event.target.value as OutreachContentUpdate["reasoningEffort"] })} className="mt-1.5 h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm">{["none", "low", "medium", "high"].map((option) => <option key={option} value={option}>{option}</option>)}</select>
        </label>
        <label className="block text-xs font-medium text-slate-700">Maximum output tokens
          <Input aria-label="Outreach output token limit" type="number" min={512} max={6000} step={1} required value={draft.maxOutputTokens} onChange={(event) => setDraft({ ...draft, maxOutputTokens: Number(event.target.value) })} className="mt-1.5 border-slate-300" />
        </label>
      </div>
      <div className="grid gap-4 md:grid-cols-3">{([{key: 'maxRequests', label: 'Requests per run', min: 3, max: 30}, {key: 'maxTokens', label: 'Tokens per run', min: 6000, max: 500000}, {key: 'maxContextChars', label: 'Context characters per stage', min: 1000, max: 100000}] as const).map(({key, label, min, max}) => <label key={key} className="block text-xs font-medium text-slate-700">{label}<Input aria-label={label} type="number" required min={min} max={max} step={1} value={draft[key]} onChange={event => setDraft({...draft, [key]: Number(event.target.value)})} className="mt-1.5 border-slate-300" /></label>)}</div>
      <p className="text-xs text-slate-500">Research & plan → Writer → Reviewer. Research uses up to three web searches per request. Each stage saves a checkpoint. Gates include retries; unknown usage keeps its reserved budget.</p>
      <label className="block text-xs font-medium text-slate-700">Editorial guidance
        <Textarea aria-label="Outreach editorial guidance" rows={5} maxLength={12000} value={draft.prompt} onChange={(event) => setDraft({ ...draft, prompt: event.target.value })} placeholder="Brand voice, event context and approved messaging guidance…" className="mt-1.5 border-slate-300" />
      </label>
    </fieldset>
    {stale && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"><span>Outreach content settings changed elsewhere. Your draft is retained.</span><Button type="button" variant="outline" disabled={busy} onClick={() => { setDraft(contentDraft(config)); setBaseline(JSON.stringify({...contentDraft(config), revision: 0})); setError(null); }}>Reload saved values</Button></div>}
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    <Button type="submit" disabled={busy || stale} className="bg-blue-600 text-white hover:bg-blue-700">{busy ? "Saving…" : "Save outreach content"}</Button>
  </form>;
}

export function OutreachContentSettings() {
  const [open, setOpen] = useState(false);
  const { data, error, reload } = useOutreachResource<OutreachConfiguration>("/configuration");
  return <section id="automated-followup-content" aria-label="Status Outreach" className="mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
    <header className="flex flex-wrap items-center justify-between gap-4 p-5 sm:p-6">
      <div className="flex items-center gap-3"><Sparkles className="h-7 w-7 shrink-0 text-blue-600" /><div><h2 className="text-lg font-semibold text-slate-900">Status Outreach</h2><p className="mt-1 text-sm text-slate-500">Three emails per lead. Templates by default; generated content when enabled.</p></div></div>
      <Button type="button" aria-expanded={open} aria-controls="automated-followup-content-form" onClick={() => setOpen((value) => !value)} className="bg-slate-950 text-white hover:bg-slate-800">Manage content<ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} /></Button>
    </header>
    <div id="automated-followup-content-form" hidden={!open} className="border-t border-slate-200 bg-slate-50/70 p-5 sm:p-6">
      <OutreachFeedback error={error} loading={!data && !error} reload={reload} />
      {data && <OutreachContentForm config={data} reload={reload} />}
      {data && <OutreachTemplateSettings config={data} reload={reload} />}
    </div>
  </section>;
}
