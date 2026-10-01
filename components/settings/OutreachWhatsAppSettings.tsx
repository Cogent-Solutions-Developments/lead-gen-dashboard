"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SettingsBackButton } from "@/components/settings/SettingsBackButton";
import { getWhatsAppConfiguration, saveWhatsAppConfiguration, type WhatsAppConfiguration } from "@/lib/whatsappConfiguration";

const OPTIONS: Record<string, string[]> = {
  WHATSAPP_PROVIDER: ["d360", "twilio"],
  D360_ENV: ["sandbox", "production"],
  TWILIO_WHATSAPP_ENV: ["sandbox", "production"],
  TWILIO_WHATSAPP_TEMPLATE_MODE: ["default", "name_only"],
};

function label(key: string) {
  const labels: Record<string, string> = { WHATSAPP_PROVIDER: "Provider", D360_ENV: "Environment", TWILIO_WHATSAPP_ENV: "Environment", D360_DEFAULT_TEMPLATE_LANG: "Template language", D360_APP_SECRET: "App secret (optional signature verification)", TWILIO_WEBHOOK_MAX_BYTES: "Webhook maximum bytes", TWILIO_BASE_CALLBACK_URL: "Status callback URL", TWILIO_WEBHOOK_PUBLIC_BASE_URL: "Public API base URL for signature verification" };
  if (labels[key]) return labels[key];
  return key.replace(/^TWILIO_WHATSAPP_|^TWILIO_|^D360_|^WHATSAPP_/, "").toLowerCase().split("_").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
}

export function OutreachWhatsAppSettings({ onBack }: { onBack: () => void }) {
  const [configuration, setConfiguration] = useState<WhatsAppConfiguration | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [secrets, setSecrets] = useState<Record<string, string>>({});
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const accept = useCallback((data: WhatsAppConfiguration) => {
    setConfiguration(data); setValues(data.values); setSecrets({}); setEnabled(data.enabled);
  }, []);
  const refresh = useCallback(async () => {
    setBusy(true); setError("");
    try { accept(await getWhatsAppConfiguration()); }
    catch (err) { setError(err instanceof Error ? err.message : "Unable to load configuration"); }
    finally { setBusy(false); }
  }, [accept]);
  useEffect(() => { void refresh(); }, [refresh]);

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!configuration) return;
    setBusy(true); setError("");
    try {
      accept(await saveWhatsAppConfiguration({ enabled, revision: configuration.revision, values: { ...values, ...secrets } }));
      window.dispatchEvent(new Event("whatsapp-configuration-changed"));
      toast.success("WhatsApp configuration saved");
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to save configuration"); }
    finally { setBusy(false); }
  }

  async function deactivate() {
    if (!configuration) return;
    setBusy(true); setError("");
    try {
      accept(await saveWhatsAppConfiguration({ enabled: false, revision: configuration.revision, values: {} }));
      window.dispatchEvent(new Event("whatsapp-configuration-changed"));
      toast.success("WhatsApp outreach deactivated");
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to deactivate"); }
    finally { setBusy(false); }
  }

  const provider = values.WHATSAPP_PROVIDER || "d360";
  const keys = configuration ? [...Object.keys(values), ...configuration.secretFields].filter(key => key === "WHATSAPP_PROVIDER" || key.startsWith(provider === "d360" ? "D360_" : "TWILIO_")) : [];
  return <Card className="border-slate-200 p-6">
    <div className="flex items-center justify-between gap-4"><SettingsBackButton onClick={onBack} /><Button variant="outline" onClick={() => void refresh()} disabled={busy}>Refresh</Button></div>
    <div><p className="text-xs text-slate-500">Settings / Outreach Configuration / WhatsApp</p><h2 className="mt-2 text-lg font-semibold">WhatsApp outreach</h2><p className="text-sm text-slate-500">Manage provider credentials, templates, senders, and webhook settings.</p></div>
    <div className={`rounded-lg border p-4 ${configuration?.enabled ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
      <p className="font-medium">{configuration?.enabled ? "Outreach active" : "Outreach disabled"}</p>
      <p className="mt-1 text-sm">Deactivation stops new WhatsApp sends and pauses queued messages. Queued messages resume after reactivation. Mail outreach continues independently.</p>
      {configuration?.enabled ? <Button className="mt-3" variant="destructive" disabled={busy} onClick={() => void deactivate()}>Deactivate now</Button> : null}
    </div>
    {error ? <p role="alert" className="text-sm text-red-700">{error}</p> : null}
    {!configuration ? <p role="status">{busy ? "Loading configuration…" : "Configuration unavailable. Use Refresh to retry."}</p> : <form onSubmit={save} className="space-y-6">
      <fieldset disabled={busy} className="grid gap-5 md:grid-cols-2">
        <legend className="mb-4 font-medium">{provider === "d360" ? "360dialog" : "Twilio"} configuration</legend>
        {keys.map(key => {
          const secret = configuration.secretFields.includes(key);
          const configured = configuration.configuredSecrets.includes(key);
          return <div key={key} className="space-y-1.5">
            <label htmlFor={key} className="text-sm font-medium">{label(key)}</label>
            {OPTIONS[key] ? <select id={key} className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm" value={values[key]} onChange={event => setValues(current => ({ ...current, [key]: event.target.value }))}>{OPTIONS[key].map(option => <option key={option} value={option}>{option === "d360" ? "360dialog" : option.replace("_", " ")}</option>)}</select> : <Input id={key} type={secret ? "password" : "text"} autoComplete={secret ? "new-password" : "off"} maxLength={2048} value={secret ? secrets[key] ?? "" : values[key] ?? ""} placeholder={secret ? configured ? "Saved securely — leave blank to keep" : "Enter secret" : "Optional unless required for activation"} onChange={event => secret ? setSecrets(current => {
                const next = { ...current };
                if (event.target.value) next[key] = event.target.value;
                else delete next[key];
                return next;
              }) : setValues(current => ({ ...current, [key]: event.target.value }))} />}
            {secret ? <div className="flex items-center justify-between gap-2 text-xs text-slate-500"><span>{configured ? "Encrypted secret saved" : "No secret saved"}</span>{configured ? <button type="button" className="text-red-700 underline" onClick={() => setSecrets(current => {
              const next = { ...current };
              if (next[key] === "") delete next[key];
              else next[key] = "";
              return next;
            })}>{secrets[key] === "" ? "Undo clearing secret" : "Clear saved secret"}</button> : null}</div> : null}
          </div>;
        })}
      </fieldset>
      <label className="flex items-center gap-3 text-sm"><input type="checkbox" checked={enabled} disabled={busy} onChange={event => setEnabled(event.target.checked)} />Enable WhatsApp outreach after saving</label>
      <p className="text-xs text-slate-500">Credentials are encrypted in the database. Only super admins can manage these settings. All required provider settings must be present before activation.</p>
      <Button type="submit" disabled={busy}>{busy ? "Saving…" : "Save configuration"}</Button>
    </form>}
  </Card>;
}
