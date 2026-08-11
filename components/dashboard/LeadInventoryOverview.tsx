"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, Copy, Database, Info, UsersRound } from "lucide-react";
import type { DashboardLeadInventory } from "@/lib/api";

const DEPARTMENTS = [
  { key: "sales", label: "Sales", color: "bg-blue-600" },
  { key: "delegate", label: "Delegate", color: "bg-emerald-500" },
  { key: "production", label: "Production", color: "bg-amber-500" },
] as const;

function number(value: number) {
  return Number(value || 0).toLocaleString();
}

function SummaryMetric({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Database;
  label: string;
  value: number;
  tone: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3 border-r border-zinc-100 px-4 last:border-r-0 first:pl-0 last:pr-0">
      <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${tone}`}>
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-zinc-400">{label}</p>
        <p className="mt-0.5 truncate text-2xl font-light tabular-nums tracking-tight text-zinc-950">{number(value)}</p>
      </div>
    </div>
  );
}

export function LeadInventoryOverview({
  data,
  loading,
  error,
}: {
  data: DashboardLeadInventory | null;
  loading: boolean;
  error?: string | null;
}) {
  const [showAll, setShowAll] = useState(false);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [showCounting, setShowCounting] = useState(false);
  const items = data?.items || [];
  const visibleItems = showAll ? items : items.slice(0, 4);
  let maxRaw = 1;
  for (const item of items) maxRaw = Math.max(maxRaw, item.rawLeads);

  if (loading && !data) {
    return (
      <section className="mt-8 animate-pulse border border-zinc-200 bg-white p-6 shadow-sm" aria-label="Loading lead inventory">
        <div className="h-4 w-32 rounded bg-zinc-100" />
        <div className="mt-6 grid grid-cols-3 gap-4">
          {[0, 1, 2].map((item) => <div key={item} className="h-14 rounded bg-zinc-100" />)}
        </div>
        <div className="mt-6 space-y-3">
          {[0, 1, 2].map((item) => <div key={item} className="h-9 rounded bg-zinc-100" />)}
        </div>
      </section>
    );
  }

  if (!data) {
    return error ? (
      <section className="mt-8 border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
        Lead inventory unavailable.
      </section>
    ) : null;
  }

  return (
    <section className="mt-8 border border-zinc-200 bg-white p-6 shadow-[0_1px_2px_rgba(60,64,67,0.08),0_1px_3px_1px_rgba(60,64,67,0.06)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-medium tracking-tight text-zinc-950">Lead inventory</h2>
          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">
            {number(data.totals.eventCount)} events
          </span>
        </div>
        <button
          type="button"
          onClick={() => setShowCounting((value) => !value)}
          className="grid h-8 w-8 place-items-center rounded-full text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          aria-label="Explain lead counting"
          aria-expanded={showCounting}
          title="How counts work"
        >
          <Info className="h-4 w-4" />
        </button>
      </div>

      {showCounting ? (
        <p className="mt-3 border-l-2 border-blue-500 pl-3 text-xs leading-5 text-zinc-500">
          Unique: {data.counting.uniqueIdentity}. Department totals: {data.counting.departmentScope}.
        </p>
      ) : null}

      <div className="mt-5 grid grid-cols-1 gap-3 border-b border-zinc-100 pb-5 sm:grid-cols-3 sm:gap-0">
        <SummaryMetric icon={Database} label="All rows" value={data.totals.rawLeads} tone="bg-blue-50 text-blue-700" />
        <SummaryMetric icon={UsersRound} label="Unique" value={data.totals.uniqueLeads} tone="bg-emerald-50 text-emerald-700" />
        <SummaryMetric icon={Copy} label="Repeats" value={data.totals.duplicateLeads} tone="bg-amber-50 text-amber-700" />
      </div>

      {items.length === 0 ? (
        <p className="py-8 text-center text-sm text-zinc-400">No leads yet.</p>
      ) : (
        <div className="mt-4 space-y-1">
          {visibleItems.map((item) => {
            const expanded = expandedKey === item.canonicalEventKey;
            const rawWidth = Math.max((item.rawLeads / maxRaw) * 100, item.rawLeads ? 4 : 0);
            const uniqueWidth = item.rawLeads ? (item.uniqueLeads / item.rawLeads) * 100 : 0;
            return (
              <div key={item.canonicalEventKey} className="border-b border-zinc-100 last:border-b-0">
                <button
                  type="button"
                  onClick={() => setExpandedKey(expanded ? null : item.canonicalEventKey)}
                  className="group grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-4 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 sm:grid-cols-[minmax(8rem,0.85fr)_minmax(10rem,1.15fr)_auto]"
                  aria-expanded={expanded}
                >
                  <span className="truncate text-sm font-medium text-zinc-800 group-hover:text-blue-700">
                    {item.canonicalEventName}
                  </span>
                  <span className="relative hidden h-2 overflow-hidden rounded-full bg-zinc-100 sm:block">
                    <span className="absolute inset-y-0 left-0 overflow-hidden rounded-full bg-blue-100" style={{ width: `${rawWidth}%` }}>
                      <span className="block h-full rounded-full bg-blue-600" style={{ width: `${uniqueWidth}%` }} />
                    </span>
                  </span>
                  <span className="flex min-w-[7.5rem] items-center justify-end gap-2 text-xs tabular-nums">
                    <span className="font-semibold text-zinc-900">{number(item.rawLeads)}</span>
                    <span className="text-zinc-300">/</span>
                    <span className="text-blue-700">{number(item.uniqueLeads)}</span>
                    <ChevronDown className={`h-4 w-4 text-zinc-400 transition-transform ${expanded ? "rotate-180" : ""}`} />
                  </span>
                </button>

                {expanded ? (
                  <div className="mb-3 grid gap-3 bg-zinc-50 p-4 sm:grid-cols-[1fr_auto] sm:items-center">
                    <div className="grid grid-cols-3 gap-2">
                      {DEPARTMENTS.map((department) => {
                        const count = item.departments[department.key]?.uniqueLeads || 0;
                        return (
                          <div key={department.key} className="border border-zinc-200 bg-white px-3 py-2">
                            <div className="flex items-center gap-2">
                              <span className={`h-1.5 w-1.5 rounded-full ${department.color}`} />
                              <span className="truncate text-[0.65rem] font-semibold uppercase tracking-wider text-zinc-400">{department.label}</span>
                            </div>
                            <p className="mt-1 text-lg font-light tabular-nums text-zinc-900">{number(count)}</p>
                          </div>
                        );
                      })}
                    </div>
                    <Link
                      href={`/leads?event=${encodeURIComponent(item.canonicalEventKey)}`}
                      className="text-xs font-semibold text-blue-700 hover:text-blue-900 hover:underline"
                    >
                      Open leads
                    </Link>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      {items.length > 4 ? (
        <button
          type="button"
          onClick={() => setShowAll((value) => !value)}
          className="mt-4 text-xs font-semibold text-blue-700 hover:text-blue-900 hover:underline"
        >
          {showAll ? "Show less" : `All ${number(items.length)} events`}
        </button>
      ) : null}
    </section>
  );
}
