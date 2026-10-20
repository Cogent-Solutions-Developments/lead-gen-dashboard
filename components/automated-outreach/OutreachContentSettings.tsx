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

function contentDraft(config: OutreachConfiguration): OutreachContentUpdate {
  return { revision: config.revision, model: config.model, prompt: config.prompt,
    reasoningEffort: config.reasoningEffort, maxOutputTokens: config.maxOutputTokens };
}

export function OutreachContentForm({ config, reload }: { config: OutreachConfiguration; reload: () => void }) {
  const [draft, setDraft] = useState(() => contentDraft(config));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const stale = config.revision > draft.revision;
  return <form aria-label="Automated follow-up content settings" className="space-y-5" onSubmit={async (event) => {
    event.preventDefault(); setBusy(true); setError(null);
    try {
      const saved = await saveOutreachContentConfiguration(draft);
      setDraft(contentDraft(saved));
      toast.success("Follow-up content settings saved");
      reload();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not save content settings");
      reload();
    } finally { setBusy(false); }
  }}>
    <fieldset disabled={busy} className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
      <legend className="px-1 text-sm font-semibold text-slate-900">Follow-up content agent</legend>
      <p className="text-xs text-slate-500">Uses each lead’s status, follow-up number, and previous messages. Applies only to automated follow-up emails.</p>
      <div className="grid gap-4 md:grid-cols-3">
        <label className="block text-xs font-medium text-slate-700">Model
          <select aria-label="Follow-up model" value={draft.model} onChange={(event) => setDraft({ ...draft, model: event.target.value })} className="mt-1.5 h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm">{config.modelOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select>
        </label>
        <label className="block text-xs font-medium text-slate-700">Reasoning effort
          <select aria-label="Follow-up reasoning effort" value={draft.reasoningEffort} onChange={(event) => setDraft({ ...draft, reasoningEffort: event.target.value as OutreachContentUpdate["reasoningEffort"] })} className="mt-1.5 h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm">{["none", "low", "medium", "high"].map((option) => <option key={option} value={option}>{option}</option>)}</select>
        </label>
        <label className="block text-xs font-medium text-slate-700">Maximum output tokens
          <Input aria-label="Follow-up output token limit" type="number" min={512} max={6000} step={1} required value={draft.maxOutputTokens} onChange={(event) => setDraft({ ...draft, maxOutputTokens: Number(event.target.value) })} className="mt-1.5 border-slate-300" />
        </label>
      </div>
      <label className="block text-xs font-medium text-slate-700">Editorial guidance
        <Textarea aria-label="Follow-up editorial guidance" rows={5} maxLength={12000} value={draft.prompt} onChange={(event) => setDraft({ ...draft, prompt: event.target.value })} placeholder="Brand voice, event context and approved messaging guidance…" className="mt-1.5 border-slate-300" />
      </label>
      <p className="text-xs text-slate-500">Shared credential: <code>{config.apiKeySource}</code></p>
    </fieldset>
    {stale && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"><span>Follow-up settings changed elsewhere. Your draft is retained.</span><Button type="button" variant="outline" disabled={busy} onClick={() => { setDraft(contentDraft(config)); setError(null); }}>Reload saved values</Button></div>}
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    <Button type="submit" disabled={busy || stale} className="bg-blue-600 text-white hover:bg-blue-700">{busy ? "Saving…" : "Save follow-up content"}</Button>
  </form>;
}

export function OutreachContentSettings() {
  const [open, setOpen] = useState(false);
  const { data, error, reload } = useOutreachResource<OutreachConfiguration>("/configuration");
  return <section id="automated-followup-content" aria-label="Automated follow-up content" className="mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
    <header className="flex flex-wrap items-center justify-between gap-4 p-5 sm:p-6">
      <div className="flex items-center gap-3"><Sparkles className="h-7 w-7 shrink-0 text-blue-600" /><div><h2 className="text-lg font-semibold text-slate-900">Automated follow-up content</h2><p className="mt-1 text-sm text-slate-500">Model, token limit, and messaging for automatic follow-up emails.</p></div></div>
      <Button type="button" aria-expanded={open} aria-controls="automated-followup-content-form" onClick={() => setOpen((value) => !value)} className="bg-slate-950 text-white hover:bg-slate-800">Manage content<ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} /></Button>
    </header>
    <div id="automated-followup-content-form" hidden={!open} className="border-t border-slate-200 bg-slate-50/70 p-5 sm:p-6">
      <OutreachFeedback error={error} loading={!data && !error} reload={reload} />
      {data && <OutreachContentForm config={data} reload={reload} />}
    </div>
  </section>;
}
