"use client";

import { useId, type ReactNode } from "react";
import { Input } from "@/components/ui/input";

/** Shared presentation for campaign follow-ups and event Status Outreach. */
export function EmailSequenceTemplateEditor({steps, selected, onSelect, subject, body, onSubjectChange, onBodyChange, disabled = false, subjectExtra, actions, bodyPlaceholder, bodyRows = 4, hint}: {
  steps: {label: string; configured: boolean}[]; selected: number; onSelect: (index: number) => void;
  subject: string; body: string; onSubjectChange: (value: string) => void; onBodyChange: (value: string) => void;
  disabled?: boolean; subjectExtra?: ReactNode; actions: ReactNode; bodyPlaceholder?: string; bodyRows?: number; hint?: ReactNode;
}) {
  const id = useId();
  return <div className="min-w-0">
    <div role="tablist" aria-label="Email templates" className="mb-4 flex flex-wrap gap-1.5">{steps.map((step, index) => <button key={step.label} type="button" role="tab" id={`${id}-tab-${index}`} aria-controls={`${id}-panel`} aria-selected={selected === index} tabIndex={selected === index ? 0 : -1} disabled={disabled} onClick={() => onSelect(index)} onKeyDown={event => {
      if (!["ArrowRight", "ArrowLeft", "Home", "End"].includes(event.key)) return;
      event.preventDefault(); const next = event.key === "Home" ? 0 : event.key === "End" ? steps.length - 1 : (index + (event.key === "ArrowRight" ? 1 : steps.length - 1)) % steps.length;
      onSelect(next); document.getElementById(`${id}-tab-${next}`)?.focus();
    }} className={`rounded-lg border px-3 py-1.5 text-left text-[11px] font-semibold transition-colors ${selected === index ? "border-violet-600 bg-violet-600 text-white" : "border-violet-200 bg-white text-violet-700 hover:border-violet-300 hover:bg-violet-50 dark:border-violet-800 dark:bg-slate-900 dark:text-violet-300"}`}>
      {step.label}{step.configured && <span aria-label="Saved" className={`ml-1.5 text-[9px] ${selected === index ? "text-white/75" : "text-emerald-600"}`}>●</span>}
    </button>)}</div>
    <div role="tabpanel" id={`${id}-panel`} aria-labelledby={`${id}-tab-${selected}`}>
      {hint && <div className="mb-4 text-xs leading-5 text-slate-500 dark:text-slate-400">{hint}</div>}
      <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)_auto] xl:items-end">
        <div className="min-w-0"><label htmlFor={`${id}-subject`} className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-400">Subject</label><Input id={`${id}-subject`} value={subject} onChange={event => onSubjectChange(event.target.value)} disabled={disabled} placeholder={`e.g. ${steps[selected].label} — {{first_name}}`} className="h-10 border-violet-200 bg-white text-sm dark:border-violet-800 dark:bg-slate-900" />{subjectExtra}</div>
        <div className="min-w-0"><label htmlFor={`${id}-body`} className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-400">Email body</label><textarea rows={bodyRows} id={`${id}-body`} value={body} onChange={event => onBodyChange(event.target.value)} disabled={disabled} placeholder={bodyPlaceholder} className="min-h-28 w-full resize-y rounded-md border border-violet-200 bg-white px-3 py-2 text-sm text-slate-950 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-violet-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-violet-800 dark:bg-slate-900 dark:text-slate-100" /></div>
        <div className="flex flex-wrap gap-2 xl:w-44 xl:flex-col">{actions}</div>
      </div>
    </div>
  </div>;
}
