"use client";

import Link from "next/link";
import { useState } from "react";
import { RefreshCw, Webhook } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useOutreachResource } from "@/hooks/useOutreachResource";
import { outreachDate, type OutreachConfiguration } from "@/lib/automatedOutreach";
import { saveOutreachDeliveryConfiguration, type OutreachDeliveryUpdate } from "@/lib/automatedOutreachApi";
import { OutreachFeedback } from "./OutreachStatus";

function deliveryDraft(config: OutreachConfiguration): OutreachDeliveryUpdate {
  return { revision: config.revision, enabled: config.enabled };
}

export function OutreachDeliveryForm({ config, reload }: { config: OutreachConfiguration; reload: () => void }) {
  const [draft, setDraft] = useState(() => deliveryDraft(config));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const stale = config.revision > draft.revision;
  return <form aria-label="Status Outreach settings" className="space-y-5" onSubmit={async (event) => {
    event.preventDefault(); setBusy(true); setError(null);
    try {
      const saved = await saveOutreachDeliveryConfiguration(draft);
      setDraft(deliveryDraft(saved));
      toast.success("Outreach mail settings saved");
      reload();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not save delivery settings");
      reload();
    } finally { setBusy(false); }
  }}>
    <fieldset disabled={busy} className="space-y-5">
      <legend className="sr-only">Status Outreach delivery</legend>
      <div className="flex flex-wrap items-start justify-between gap-4 rounded-lg border border-slate-200 bg-slate-50/70 p-4"><div><p className="text-sm font-semibold text-slate-900">Automatic delivery</p><p className="mt-1 text-xs text-slate-500">Three emails per lead, four days apart. Eligible leads enroll automatically.</p><p className="mt-2 text-xs text-slate-400">Last discovery: {outreachDate(config.lastScanAt)}</p></div><label className="flex items-center gap-2 text-sm text-slate-700"><input aria-label="Enable automatic outreach delivery" type="checkbox" checked={draft.enabled} onChange={(event) => setDraft({ ...draft, enabled: event.target.checked })} />Enabled</label></div>
      {config.missingConfiguration.length > 0 && <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><p className="font-medium">Delivery setup needed</p><ul className="mt-2 list-disc space-y-1 pl-5">{config.missingConfiguration.map((item) => <li key={item}>{item}</li>)}</ul></div>}
      <p className="text-sm text-slate-500">Uses the active Status Outreach Make.com webhooks managed above. Multiple active webhooks rotate automatically.</p>
      <p className="text-xs text-slate-500">Sender and delivery tracking use the existing Make.com mail connection and callback flow.</p>
    </fieldset>
    {stale && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"><span>Outreach settings changed elsewhere. Your draft is retained.</span><Button type="button" variant="outline" disabled={busy} onClick={() => { setDraft(deliveryDraft(config)); setError(null); }}>Reload saved values</Button></div>}
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    <div className="flex flex-wrap items-center justify-between gap-3"><Button type="submit" disabled={busy || stale} className="bg-blue-600 text-white hover:bg-blue-700">{busy ? "Saving…" : "Save outreach mail settings"}</Button><Link href="/settings/content-generation?tab=status-outreach" className="text-sm text-blue-600 hover:underline">Manage outreach content in Content Generation</Link></div>
  </form>;
}

export function OutreachDeliverySettings() {
  const { data, error, reload, refreshing } = useOutreachResource<OutreachConfiguration>("/configuration");
  return <section aria-label="Status Outreach" className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
    <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 p-5 sm:p-6"><div className="flex items-center gap-3"><Webhook className="h-7 w-7 text-blue-600" /><div><h2 className="font-semibold text-slate-900">Delivery settings</h2><p className="mt-1 text-sm text-slate-500">Enable or pause Status Outreach delivery.</p></div></div><Button type="button" variant="outline" onClick={reload} disabled={refreshing}><RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />Refresh</Button></header>
    <div className="p-5 sm:p-6"><OutreachFeedback error={error} loading={!data && !error} reload={reload} />{data && <OutreachDeliveryForm config={data} reload={reload} />}</div>
  </section>;
}
