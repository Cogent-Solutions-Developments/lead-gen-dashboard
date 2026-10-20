"use client";

import Link from "next/link";
import { useState } from "react";
import { RefreshCw, Webhook } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useOutreachResource } from "@/hooks/useOutreachResource";
import { OUTREACH_DEPARTMENTS, outreachDate, type OutreachConfiguration } from "@/lib/automatedOutreach";
import { saveOutreachDeliveryConfiguration, type OutreachDeliveryUpdate } from "@/lib/automatedOutreachApi";
import { OutreachFeedback } from "./OutreachStatus";

function deliveryDraft(config: OutreachConfiguration): OutreachDeliveryUpdate {
  return { revision: config.revision, enabled: config.enabled, senderName: config.senderName,
    senderEmail: config.senderEmail, callbackBaseUrl: config.callbackBaseUrl,
    callbackSecret: "", clearCallbackSecret: false, webhooks: {} };
}

export function OutreachDeliveryForm({ config, reload }: { config: OutreachConfiguration; reload: () => void }) {
  const [draft, setDraft] = useState(() => deliveryDraft(config));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const stale = config.revision > draft.revision;
  return <form aria-label="Automated follow-up mail settings" className="space-y-5" onSubmit={async (event) => {
    event.preventDefault(); setBusy(true); setError(null);
    try {
      const saved = await saveOutreachDeliveryConfiguration(draft);
      setDraft(deliveryDraft(saved));
      toast.success("Follow-up mail settings saved");
      reload();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not save delivery settings");
      reload();
    } finally { setBusy(false); }
  }}>
    <fieldset disabled={busy} className="space-y-5">
      <legend className="sr-only">Automated follow-up delivery</legend>
      <div className="flex flex-wrap items-start justify-between gap-4 rounded-lg border border-slate-200 bg-slate-50/70 p-4"><div><p className="text-sm font-semibold text-slate-900">Automatic delivery</p><p className="mt-1 text-xs text-slate-500">Three emails per lead, four days apart. Eligible leads enroll automatically.</p><p className="mt-2 text-xs text-slate-400">Last discovery: {outreachDate(config.lastScanAt)}</p></div><label className="flex items-center gap-2 text-sm text-slate-700"><input aria-label="Enable automatic follow-up delivery" type="checkbox" checked={draft.enabled} onChange={(event) => setDraft({ ...draft, enabled: event.target.checked })} />Enabled</label></div>
      {(config.missingConfiguration.length > 0 || OUTREACH_DEPARTMENTS.some((d) => !config.webhooks[d.key].configured)) && <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><p className="font-medium">Delivery setup needed</p><ul className="mt-2 list-disc space-y-1 pl-5">{config.missingConfiguration.map((item) => <li key={item}>{item}</li>)}{OUTREACH_DEPARTMENTS.filter((d) => !config.webhooks[d.key].configured).map((d) => <li key={d.key}>{d.label} follow-up webhook</li>)}</ul></div>}
      <div className="grid gap-4 lg:grid-cols-2">
        <fieldset className="space-y-4 rounded-xl border border-slate-200 p-4"><legend className="px-1 text-sm font-semibold text-slate-900">Follow-up sender</legend>
          <label className="block text-xs font-medium text-slate-700">Sender name<Input aria-label="Follow-up sender name" required={draft.enabled} maxLength={120} value={draft.senderName} onChange={(event) => setDraft({ ...draft, senderName: event.target.value })} className="mt-1.5 border-slate-300" /></label>
          <label className="block text-xs font-medium text-slate-700">Sender email<Input aria-label="Follow-up sender email" required={draft.enabled} type="email" maxLength={320} value={draft.senderEmail} onChange={(event) => setDraft({ ...draft, senderEmail: event.target.value })} className="mt-1.5 border-slate-300" /></label>
          <p className="text-xs leading-5 text-slate-500">This sender is used for automated follow-up mail.</p>
        </fieldset>
        <fieldset className="space-y-4 rounded-xl border border-slate-200 p-4"><legend className="px-1 text-sm font-semibold text-slate-900">Delivery callbacks</legend>
          <label className="block text-xs font-medium text-slate-700">Public callback base URL<Input aria-label="Follow-up callback base URL" type="url" required={draft.enabled} maxLength={2048} value={draft.callbackBaseUrl} onChange={(event) => setDraft({ ...draft, callbackBaseUrl: event.target.value })} placeholder="https://your-backend.example.com" className="mt-1.5 border-slate-300" /></label>
          <p className="break-all text-xs text-slate-500">Callback endpoint: {draft.callbackBaseUrl ? `${draft.callbackBaseUrl.replace(/\/$/, "")}/api/automated-outreach/callback` : "Set the public base URL above."}</p>
          <label className="block text-xs font-medium text-slate-700">Callback signing secret<Input aria-label="Follow-up callback signing secret" type="password" autoComplete="new-password" minLength={32} maxLength={512} disabled={draft.clearCallbackSecret} value={draft.callbackSecret} onChange={(event) => setDraft({ ...draft, callbackSecret: event.target.value })} placeholder={config.callbackSecretConfigured ? "Leave blank to keep saved secret" : "Enter a secret of at least 32 characters"} className="mt-1.5 border-slate-300" /></label>
          <p className="text-xs text-slate-500">{config.callbackSecretConfigured ? "The saved secret is encrypted and never displayed." : "Use the same signing secret in the dedicated mail receiver."}</p>
          {config.callbackSecretConfigured && <label className="flex items-center gap-2 text-xs text-slate-600"><input aria-label="Clear saved follow-up callback secret" type="checkbox" checked={draft.clearCallbackSecret} onChange={(event) => setDraft({ ...draft, clearCallbackSecret: event.target.checked, callbackSecret: "" })} />Clear saved callback secret</label>}
        </fieldset>
      </div>
      <fieldset className="rounded-xl border border-slate-200 p-4"><legend className="px-1 text-sm font-semibold text-slate-900">Automated follow-up webhooks</legend><p className="mb-4 text-xs text-slate-500">Dedicated Make.com endpoints for this follow-up service. Blank fields keep saved endpoints.</p>
        <div className="grid gap-4 md:grid-cols-3">{OUTREACH_DEPARTMENTS.map((department) => <div key={department.key} className="rounded-lg border border-slate-200 bg-slate-50/50 p-4"><label className="text-sm font-semibold text-slate-900">{department.label}<Input aria-label={`${department.label} follow-up webhook`} type="url" autoComplete="off" value={draft.webhooks[department.key] ?? ""} onChange={(event) => setDraft({ ...draft, webhooks: { ...draft.webhooks, [department.key]: event.target.value } })} placeholder={draft.webhooks[department.key] === null ? "Endpoint will be removed" : config.webhooks[department.key].maskedUrl || "https://hook.make.com/…"} className="mt-2 border-slate-300 bg-white font-normal" /></label>{config.webhooks[department.key].configured && <button type="button" onClick={() => setDraft({ ...draft, webhooks: { ...draft.webhooks, [department.key]: draft.webhooks[department.key] === null ? "" : null } })} className="mt-2 text-xs text-red-700 underline">{draft.webhooks[department.key] === null ? "Keep saved endpoint" : "Remove saved endpoint"}</button>}</div>)}</div>
      </fieldset>
    </fieldset>
    {stale && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"><span>Follow-up settings changed elsewhere. Your draft is retained.</span><Button type="button" variant="outline" disabled={busy} onClick={() => { setDraft(deliveryDraft(config)); setError(null); }}>Reload saved values</Button></div>}
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    <div className="flex flex-wrap items-center justify-between gap-3"><Button type="submit" disabled={busy || stale} className="bg-blue-600 text-white hover:bg-blue-700">{busy ? "Saving…" : "Save follow-up mail settings"}</Button><Link href="/settings/content-generation#automated-followup-content" className="text-sm text-blue-600 hover:underline">Manage follow-up content in Content Generation</Link></div>
  </form>;
}

export function OutreachDeliverySettings() {
  const { data, error, reload, refreshing } = useOutreachResource<OutreachConfiguration>("/configuration");
  return <section aria-label="Automated follow-up mail" className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
    <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 p-5 sm:p-6"><div className="flex items-center gap-3"><Webhook className="h-7 w-7 text-blue-600" /><div><h2 className="font-semibold text-slate-900">Automated follow-up mail</h2><p className="mt-1 text-sm text-slate-500">Dedicated sender, department endpoints, and signed delivery callbacks.</p></div></div><Button type="button" variant="outline" onClick={reload} disabled={refreshing}><RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />Refresh</Button></header>
    <div className="p-5 sm:p-6"><OutreachFeedback error={error} loading={!data && !error} reload={reload} />{data && <OutreachDeliveryForm config={data} reload={reload} />}</div>
  </section>;
}
