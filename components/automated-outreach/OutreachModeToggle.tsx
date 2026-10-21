"use client";

import { FileText, Sparkles } from "lucide-react";
import type { OutreachContentMode } from "@/lib/automatedOutreach";

export function OutreachModeToggle({value, onChange, disabled, label}: {value: OutreachContentMode; onChange: (mode: OutreachContentMode) => void; disabled?: boolean; label: string}) {
  return <div role="group" aria-label={label} className="inline-flex max-w-full rounded-xl border border-violet-200 bg-violet-50/60 p-1 dark:border-violet-800 dark:bg-violet-950/30">
    {([{value: "template", label: "Template", icon: FileText}, {value: "generated", label: "Agentic", icon: Sparkles}] as const).map(option => <button key={option.value} type="button" aria-pressed={value === option.value} disabled={disabled} onClick={() => onChange(option.value)} className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors disabled:opacity-60 ${value === option.value ? "bg-violet-600 text-white shadow-sm" : "text-violet-700 hover:bg-white dark:text-violet-300 dark:hover:bg-slate-800"}`}><option.icon className="h-3.5 w-3.5" />{option.label}</button>)}
  </div>;
}
