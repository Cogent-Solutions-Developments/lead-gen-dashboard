"use client";

import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";

export const leadSheetToolbarClassName = "inline-flex flex-wrap items-center rounded-xl border border-zinc-300/90 bg-white/60 p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_4px_8px_-10px_rgba(2,10,27,0.34)] backdrop-blur-[6px] dark:border-zinc-700 dark:bg-zinc-800/90 dark:shadow-none";

/** The same sheet surface and filter buttons used by the campaign lead sheet. */
export function LeadSheetPanel({ children }: { children: ReactNode }) {
  return <Card className="campaign-leads-panel relative isolate mt-3 flex flex-col overflow-hidden rounded-2xl border border-[rgb(255_255_255_/_0.82)] bg-[linear-gradient(160deg,rgba(255,255,255,0.84)_0%,rgba(250,252,255,0.66)_56%,rgba(240,246,253,0.56)_100%)] backdrop-blur-[16px] [backdrop-filter:saturate(175%)_blur(16px)] shadow-[0_0_0_1px_rgba(255,255,255,0.82),0_0_12px_-9px_rgba(2,10,27,0.58),0_0_6px_-5px_rgba(15,23,42,0.36),inset_0_1px_0_rgba(255,255,255,1),inset_0_-2px_0_rgba(221,230,244,0.74),inset_0_0_22px_rgba(255,255,255,0.2)]">
    <div className="pointer-events-none absolute -right-20 -top-24 h-60 w-60 rounded-full bg-gradient-to-br from-sky-300/34 via-blue-500/12 to-blue-700/0 blur-3xl dark:hidden" />
    <div className="pointer-events-none absolute -left-24 -bottom-20 h-56 w-56 rounded-full bg-gradient-to-tr from-blue-300/20 via-sky-200/10 to-transparent blur-3xl dark:hidden" />
    {children}
  </Card>;
}

export function LeadSheetFilterButtons<T extends string>({ items, value, onChange }: {
  items: readonly { key: T; label: string; count?: number }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return <>{items.map((tab) => <button key={tab.key} type="button" aria-pressed={value === tab.key}
    onClick={() => onChange(tab.key)}
    className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${value === tab.key
      ? "bg-zinc-900 text-white shadow-[0_6px_10px_-12px_rgba(2,10,27,0.42)]"
      : "text-zinc-600 hover:bg-white hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white"}`}>
    {tab.label}{tab.count !== undefined && <span className={`ml-1.5 text-[10px] ${value === tab.key ? "text-white/80" : "text-zinc-400"}`}>{tab.count}</span>}
  </button>)}</>;
}
