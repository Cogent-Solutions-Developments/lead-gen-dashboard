"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { KeyRound, Power, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SettingsBackButton } from "@/components/settings/SettingsBackButton";
import { configurationError, getWhatsAppConfiguration, saveWhatsAppConfiguration, type WhatsAppConfiguration } from "@/lib/whatsappConfiguration";

const OPTIONS: Record<string, string[]> = {
  WHATSAPP_PROVIDER: ["d360", "twilio"],
  D360_ENV: ["sandbox", "production"],
  TWILIO_WHATSAPP_ENV: ["sandbox", "production"],
  TWILIO_WHATSAPP_TEMPLATE_MODE: ["default", "name_only"],
};

function label(key: string) {
  const labels: Record<string, string> = {
    WHATSAPP_PROVIDER: "Provider", D360_ENV: "Environment", TWILIO_WHATSAPP_ENV: "Environment",
    D360_DEFAULT_TEMPLATE_LANG: "Template language", TWILIO_WEBHOOK_MAX_BYTES: "Webhook maximum bytes",
    TWILIO_BASE_CALLBACK_URL: "Status callback URL", TWILIO_WEBHOOK_PUBLIC_BASE_URL: "Public API base URL for signature verification",
  };
  return labels[key] || key.replace(/^TWILIO_WHATSAPP_|^TWILIO_|^D360_|^WHATSAPP_/, "").toLowerCase().split("_").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
}

export function OutreachWhatsAppSettings({ onBack }: { onBack: () => void }) {
  const [configuration, setConfiguration] = useState<WhatsAppConfiguration | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [credentialRefs, setCredentialRefs] = useState<Record<string, string>>({});
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const accept = useCallback((data: WhatsAppConfiguration) => {
    setConfiguration(data);
    setValues(data.values);
    setCredentialRefs(data.credentialRefs);
    setEnabled(data.enabled);
  }, []);

  const refresh = useCallback(async () => {
    setBusy(true);
    setError("");
    try { accept(await getWhatsAppConfiguration()); }
    catch (err) { setError(configurationError(err)); }
    finally { setBusy(false); }
  }, [accept]);
  useEffect(() => { void refresh(); }, [refresh]);

  async function toggle() {
    if (!configuration || busy) return;
    if (!enabled) {
      setEnabled(true);
      setError("");
      return;
    }
    if (!configuration.enabled) {
      accept(configuration);
      return;
    }
    setBusy(true);
    setError("");
    try {
      accept(await saveWhatsAppConfiguration({ enabled: false, revision: configuration.revision, values: {} }));
      window.dispatchEvent(new Event("whatsapp-configuration-changed"));
      toast.success("WhatsApp outreach disabled");
    } catch (err) { setError(configurationError(err)); }
    finally { setBusy(false); }
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!configuration || !enabled || busy) return;
    setBusy(true);
    setError("");
    try {
      accept(await saveWhatsAppConfiguration({ enabled: true, revision: configuration.revision, values, credentialRefs }));
      window.dispatchEvent(new Event("whatsapp-configuration-changed"));
      toast.success("WhatsApp configuration saved and enabled");
    } catch (err) { setError(configurationError(err)); }
    finally { setBusy(false); }
  }

  const provider = values.WHATSAPP_PROVIDER || "d360";
  const keys = Object.keys(values).filter(key => key === "WHATSAPP_PROVIDER" || key.startsWith(provider === "d360" ? "D360_" : "TWILIO_"));
  const connections = configuration?.credentials.filter(item => item.provider === provider) || [];
  const locked = busy || !enabled;
  const pendingActivation = enabled && !configuration?.enabled;

  return (
    <Card className="border-slate-200 p-6">
      <div className="flex items-center justify-between gap-4">
        <SettingsBackButton onClick={onBack} />
        <Button variant="outline" onClick={() => void refresh()} disabled={busy}><RefreshCw className="h-4 w-4" />Refresh</Button>
      </div>
      <div><h2 className="text-xl font-semibold">WhatsApp outreach</h2><p className="mt-1 text-sm text-slate-500">Configure delivery using a named, secure credential connection.</p></div>
      <div className={`flex flex-col justify-between gap-5 rounded-xl border p-5 sm:flex-row sm:items-center ${enabled ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
        <div className="flex items-start gap-3">
          <Power className={`mt-1 h-6 w-6 shrink-0 ${enabled ? "text-emerald-700" : "text-amber-700"}`} />
          <div>
            <h3 className="text-base font-semibold">{pendingActivation ? "Ready to configure" : enabled ? "WhatsApp outreach enabled" : "WhatsApp outreach disabled"}</h3>
            <p className="mt-1 max-w-2xl text-sm text-slate-600">{pendingActivation ? "Editing is unlocked. Choose a connection, complete the settings, and save to activate outreach." : enabled ? "Turning this off immediately pauses WhatsApp sends and locks configuration." : "Configuration is locked. Turn on the switch to edit. Mail outreach continues independently."}</p>
          </div>
        </div>
        <button type="button" role="switch" aria-checked={enabled} aria-label="Enable WhatsApp outreach" disabled={!configuration || busy} onClick={() => void toggle()} className="flex shrink-0 items-center gap-3 self-start rounded-lg px-2 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50 sm:self-center">
          <span className="text-sm font-semibold">{enabled ? "Enabled" : "Disabled"}</span>
          <span className={`relative inline-flex h-8 w-14 rounded-full transition-colors ${enabled ? "bg-emerald-600" : "bg-slate-400"}`}><span className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-transform ${enabled ? "translate-x-7" : "translate-x-1"}`} /></span>
        </button>
      </div>
      {error ? <p role="alert" className="text-sm text-red-700">{error}</p> : null}
      {!configuration ? <p role="status">{busy ? "Loading configuration…" : "Configuration unavailable. Refresh to retry."}</p> : (
        <form onSubmit={save} className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-blue-100 bg-blue-50/50 p-4">
            <div className="flex items-center gap-2 text-sm text-slate-700"><KeyRound className="h-4 w-4 text-blue-600" />API keys and secrets are managed in Credentials.</div>
            <Link href="/settings?section=credentials" className="text-sm font-semibold text-blue-700 hover:underline">Manage credential connections</Link>
          </div>
          <fieldset disabled={locked} className={`grid gap-5 md:grid-cols-2 ${!enabled ? "opacity-55" : ""}`}>
            <legend className="mb-4 font-semibold">{provider === "d360" ? "360dialog" : "Twilio"} configuration</legend>
            {keys.map(key => (
              <div key={key} className="space-y-1.5">
                <label htmlFor={key} className="text-sm font-medium">{label(key)}</label>
                {OPTIONS[key] ? (
                  <select id={key} className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm disabled:cursor-not-allowed" value={values[key]} onChange={event => setValues(current => ({ ...current, [key]: event.target.value }))}>
                    {OPTIONS[key].map(option => <option key={option} value={option}>{option === "d360" ? "360dialog" : option.replace("_", " ")}</option>)}
                  </select>
                ) : <Input id={key} maxLength={2048} value={values[key] || ""} onChange={event => setValues(current => ({ ...current, [key]: event.target.value }))} />}
              </div>
            ))}
            <div className="space-y-1.5 md:col-span-2">
              <label htmlFor="credential-connection" className="text-sm font-medium">Credential connection</label>
              <select id="credential-connection" className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm disabled:cursor-not-allowed" value={credentialRefs[provider] || ""} onChange={event => {
                const id = event.target.value;
                setCredentialRefs(current => { const next = { ...current }; if (id) next[provider] = id; else delete next[provider]; return next; });
              }}>
                <option value="">Select a {provider === "d360" ? "360dialog" : "Twilio"} connection</option>
                {connections.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
              <p className="text-xs text-slate-500">{connections.length ? "This named connection supplies the provider credentials securely." : "Create a connection in Credentials first, then refresh this page."}</p>
            </div>
          </fieldset>
          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-5">
            <p className="text-xs text-slate-500">{pendingActivation ? "Outreach remains paused until a valid configuration is saved." : "Queued messages resume when outreach is reactivated."}</p>
            <Button type="submit" disabled={locked}>{busy ? "Saving…" : pendingActivation ? "Save and enable outreach" : "Save configuration"}</Button>
          </div>
        </form>
      )}
    </Card>
  );
}
