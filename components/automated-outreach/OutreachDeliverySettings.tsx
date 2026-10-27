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
  const [savedBaseline, setSavedBaseline] = useState(() => deliveryDraft(config));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedNotice, setSavedNotice] = useState(false);
  const stale = config.revision > savedBaseline.revision && config.enabled !== savedBaseline.enabled;

  async function setGlobalEnabled(enabled: boolean) {
    setDraft({ ...draft, enabled });
    setBusy(true);
    setError(null);
    setSavedNotice(false);
    try {
      // Event edits share the revision. Use the latest configuration revision
      // so a change to one event cannot strand this global control.
      const saved = await saveOutreachDeliveryConfiguration({ revision: config.revision, enabled });
      setDraft(deliveryDraft(saved));
      setSavedBaseline(deliveryDraft(saved));
      setSavedNotice(true);
      toast.success(`Automatic email delivery turned ${enabled ? "on" : "off"} for all events`);
      reload();
    } catch (error) {
      setDraft(savedBaseline);
      setError(error instanceof Error ? error.message : "Could not update automatic outreach");
      reload();
    } finally {
      setBusy(false);
    }
  }

  return <div aria-label="Status Outreach settings" className="space-y-5">
    <fieldset disabled={busy} className="space-y-5">
      <legend className="sr-only">Status Outreach delivery</legend>
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-slate-200 bg-slate-50/70 p-4"><div><p className="text-sm font-semibold text-slate-900">Automatic delivery</p><p className="mt-1 text-xs text-slate-500">Changing this switch sets email delivery On or Off for all events. Content preparation continues according to each event's Template or Agentic mode. You can then change delivery for any event individually on its department events page.</p><p className="mt-2 text-xs text-slate-400">Last discovery: {outreachDate(config.lastScanAt)}</p></div><div className="flex flex-col items-end gap-1"><label className="inline-flex cursor-pointer items-center gap-3 text-sm font-medium text-slate-700"><span>{draft.enabled ? "On" : "Off"}</span><input aria-label="Enable automatic outreach delivery" role="switch" type="checkbox" className="peer sr-only" checked={draft.enabled} onChange={(event) => void setGlobalEnabled(event.target.checked)} /><span aria-hidden="true" className="relative h-7 w-12 rounded-full bg-slate-300 transition-colors after:absolute after:left-1 after:top-1 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow-sm after:transition-transform peer-checked:bg-blue-600 peer-checked:after:translate-x-5 peer-focus-visible:ring-2 peer-focus-visible:ring-blue-500 peer-focus-visible:ring-offset-2 peer-disabled:opacity-50" /></label><span role="status" className="text-xs text-slate-500">{busy ? "Applying to all events…" : savedNotice ? "Global setting saved" : ""}</span></div></div>
      {config.missingConfiguration.length > 0 && <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><p className="font-medium">Delivery setup needed</p><ul className="mt-2 list-disc space-y-1 pl-5">{config.missingConfiguration.map((item) => <li key={item}>{item}</li>)}</ul></div>}
      <p className="text-sm text-slate-500">Uses the active Status Outreach Make.com webhooks managed above. Multiple active webhooks rotate automatically.</p>
      <p className="text-xs text-slate-500">Sender and delivery tracking use the existing Make.com mail connection and callback flow.</p>
    </fieldset>
    {stale && !busy && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"><span>Automatic delivery changed elsewhere.</span><Button type="button" variant="outline" onClick={() => { setDraft(deliveryDraft(config)); setSavedBaseline(deliveryDraft(config)); setSavedNotice(false); setError(null); }}>Reload saved value</Button></div>}
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    <Link href="/settings/content-generation?tab=status-outreach" className="inline-block text-sm text-blue-600 hover:underline">Manage outreach content in Content Generation</Link>
  </div>;
}

export function OutreachDeliverySettings() {
  const { data, error, reload, refreshing } = useOutreachResource<OutreachConfiguration>("/configuration");
  return <section aria-label="Status Outreach" className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
    <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 p-5 sm:p-6"><div className="flex items-center gap-3"><Webhook className="h-7 w-7 text-blue-600" /><div><h2 className="font-semibold text-slate-900">Delivery settings</h2><p className="mt-1 text-sm text-slate-500">Set the default for automatic email delivery.</p></div></div><Button type="button" variant="outline" onClick={reload} disabled={refreshing}><RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />Refresh</Button></header>
    <div className="space-y-6 p-5 sm:p-6"><OutreachFeedback error={error} loading={!data && !error} reload={reload} />{data && <OutreachDeliveryForm config={data} reload={reload} />}</div>
  </section>;
}
