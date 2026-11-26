"use client";

import { Input } from "@/components/ui/input";

export type CampaignEventFilterValues = { eventYear: string };

export function CampaignEventFilters({ values, onChange }: {
  values: CampaignEventFilterValues;
  onChange: (values: CampaignEventFilterValues) => void;
}) {
  const invalidYear = values.eventYear && (!/^[1-9]\d{3}$/.test(values.eventYear) || Number(values.eventYear) > 9998);
  return <div className="min-w-0 space-y-2">
    <label htmlFor="campaign-event-year-filter" className="block text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Year</label>
    <Input id="campaign-event-year-filter" type="number" min="1000" max="9998" value={values.eventYear}
      onChange={event => onChange({ eventYear: event.target.value })} placeholder="Any year"
      aria-invalid={Boolean(invalidYear)} aria-describedby={invalidYear ? "campaign-year-error" : undefined}
      className="h-9 border-zinc-300/80 bg-white/80 text-sm" />
    {invalidYear && <p id="campaign-year-error" className="text-xs text-amber-700">Enter a four-digit year.</p>}
  </div>;
}
