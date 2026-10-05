"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { KeyRound, Pencil, Plus, RefreshCw, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SettingsBackButton } from "@/components/settings/SettingsBackButton";
import { configurationError, deleteWhatsAppCredential, listWhatsAppCredentials, saveWhatsAppCredential, type WhatsAppCredential } from "@/lib/whatsappConfiguration";

const SECRET_FIELDS = {
  d360: [["D360_API_KEY", "Production API key"], ["D360_SANDBOX_API_KEY", "Sandbox API key"], ["D360_WEBHOOK_TOKEN", "Webhook token"], ["D360_APP_SECRET", "App secret (optional signature verification)"]],
  twilio: [["TWILIO_AUTH_TOKEN", "Auth token"]],
};

export function OutreachCredentialSettings({ onBack }: { onBack: () => void }) {
  const [connections, setConnections] = useState<WhatsAppCredential[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [view, setView] = useState<"list" | "form">("list");
  const [editing, setEditing] = useState<WhatsAppCredential | null>(null);
  const [name, setName] = useState("");
  const [provider, setProvider] = useState<"d360" | "twilio">("d360");
  const [accountSid, setAccountSid] = useState("");
  const [secrets, setSecrets] = useState<Record<string, string>>({});
  const [cleared, setCleared] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState<WhatsAppCredential | null>(null);

  const refresh = useCallback(async () => {
    setBusy(true);
    setError("");
    try { setConnections(await listWhatsAppCredentials()); setLoaded(true); }
    catch (err) { setError(configurationError(err)); }
    finally { setBusy(false); }
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);

  function openForm(connection: WhatsAppCredential | null) {
    setEditing(connection);
    setName(connection?.name || "");
    setProvider(connection?.provider || "d360");
    setAccountSid(connection?.accountSid || "");
    setSecrets({});
    setCleared({});
    setError("");
    setDeleting(null);
    setView("form");
  }

  function showList() {
    setSecrets({}); setCleared({}); setEditing(null); setError(""); setView("list");
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    const updates: Record<string, string> = {};
    for (const [key] of SECRET_FIELDS[provider]) {
      if (cleared[key]) updates[key] = "";
      else if (secrets[key]?.trim()) updates[key] = secrets[key].trim();
    }
    try {
      const saved = await saveWhatsAppCredential({ name: name.trim(), provider, accountSid: accountSid.trim(), secrets: updates, ...(editing ? { revision: editing.revision } : {}) }, editing?.id);
      setConnections(current => [...current.filter(item => item.id !== saved.id), saved].sort((a, b) => a.name.localeCompare(b.name)));
      showList();
      toast.success("Credential connection saved");
    } catch (err) { setError(configurationError(err)); }
    finally { setBusy(false); }
  }

  async function remove() {
    if (!deleting || busy) return;
    setBusy(true); setError("");
    try {
      await deleteWhatsAppCredential(deleting);
      setConnections(current => current.filter(item => item.id !== deleting.id));
      setDeleting(null);
      toast.success("Credential connection deleted");
    } catch (err) { setError(configurationError(err)); }
    finally { setBusy(false); }
  }

  const filtered = connections.filter(item => `${item.name} ${item.provider === "d360" ? "360dialog" : "Twilio"}`.toLowerCase().includes(search.toLowerCase()));
  return (
    <Card className="border-slate-200 p-6">
      <div className="flex items-center justify-between gap-4">
        <SettingsBackButton onClick={onBack} />
        <Button variant="outline" disabled={busy} onClick={() => { showList(); void refresh(); }}><RefreshCw className="h-4 w-4" />Refresh</Button>
      </div>
      <div><h2 className="text-xl font-semibold">Credentials</h2><p className="mt-1 text-sm text-slate-500">Manage named WhatsApp connections and their encrypted API keys and secrets.</p></div>
      <nav aria-label="Credential management" className="grid grid-cols-2 gap-1 rounded-xl border border-slate-200 bg-white p-1">
        <button type="button" disabled={busy} aria-current={view === "list" ? "page" : undefined} onClick={showList} className={`flex h-11 items-center justify-center gap-2 rounded-lg text-sm font-semibold ${view === "list" ? "bg-blue-600 text-white shadow-sm" : "text-slate-600 hover:bg-blue-50"}`}><KeyRound className="h-4 w-4" />Connections</button>
        <button type="button" disabled={busy} aria-current={view === "form" ? "page" : undefined} onClick={() => openForm(null)} className={`flex h-11 items-center justify-center gap-2 rounded-lg text-sm font-semibold ${view === "form" ? "bg-blue-600 text-white shadow-sm" : "text-slate-600 hover:bg-blue-50"}`}><Plus className="h-4 w-4" />{editing ? "Edit connection" : "Add connection"}</button>
      </nav>
      {error ? <p role="alert" className="text-sm text-red-700">{error}</p> : null}
      {view === "list" ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="relative w-full sm:max-w-sm"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" /><Input aria-label="Search connections" placeholder="Search connections" className="pl-9" value={search} onChange={event => setSearch(event.target.value)} /></div>
            <Button disabled={busy} onClick={() => openForm(null)}><Plus className="h-4 w-4" />Add connection</Button>
          </div>
          {!loaded ? <p role="status" className="text-sm text-slate-500">{busy ? "Loading connections…" : "Connections unavailable. Refresh to retry."}</p> : !filtered.length ? <p className="rounded-lg border border-dashed p-8 text-center text-sm text-slate-500">{search ? "No matching connections." : "Create a connection, then select its name in WhatsApp configuration."}</p> : (
            <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">
              {filtered.map(connection => (
                <div key={connection.id} className="flex flex-wrap items-center justify-between gap-4 p-4">
                  <div className="flex min-w-0 items-center gap-3"><div className="rounded-lg bg-blue-50 p-3 text-blue-600"><KeyRound className="h-5 w-5" /></div><div className="min-w-0"><h3 className="break-words font-semibold">{connection.name}</h3><p className="mt-1 text-xs text-slate-500">{connection.provider === "d360" ? "360dialog" : "Twilio"} · {connection.configuredFields.length} secrets saved{connection.inUse ? " · Selected in configuration" : ""}</p></div></div>
                  <div className="flex items-center gap-2"><Button variant="outline" disabled={busy} onClick={() => openForm(connection)} aria-label={`Edit ${connection.name}`}><Pencil className="h-4 w-4" />Edit</Button><Button variant="outline" className="text-red-600" disabled={busy || connection.inUse} title={connection.inUse ? "Select another connection in WhatsApp configuration before deleting" : undefined} onClick={() => setDeleting(connection)} aria-label={`Delete ${connection.name}`}><Trash2 className="h-4 w-4" />Delete</Button></div>
                </div>
              ))}
            </div>
          )}
          {deleting ? <div role="alertdialog" aria-labelledby="delete-credential-title" className="rounded-lg border border-red-200 bg-red-50 p-4"><h3 id="delete-credential-title" className="font-semibold">Delete {deleting.name}?</h3><p className="mt-1 text-sm text-slate-600">This permanently removes this connection and its stored secrets.</p><div className="mt-3 flex gap-2"><Button variant="destructive" disabled={busy} onClick={() => void remove()}>Delete connection</Button><Button variant="outline" disabled={busy} onClick={() => setDeleting(null)}>Cancel</Button></div></div> : null}
        </div>
      ) : (
        <form onSubmit={save} className="space-y-5">
          <h3 className="font-semibold">{editing ? `Edit ${editing.name}` : "Add credential connection"}</h3>
          <fieldset disabled={busy} className="grid gap-5 md:grid-cols-2">
            <div className="space-y-1.5"><label htmlFor="connection-name" className="text-sm font-medium">Connection name</label><Input id="connection-name" required minLength={3} maxLength={120} value={name} onChange={event => setName(event.target.value)} placeholder="e.g. Marketing WhatsApp production" /></div>
            <div className="space-y-1.5"><label htmlFor="connection-provider" className="text-sm font-medium">Provider</label><select id="connection-provider" disabled={!!editing} className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm disabled:opacity-60" value={provider} onChange={event => { setProvider(event.target.value as "d360" | "twilio"); setSecrets({}); setCleared({}); }}><option value="d360">360dialog</option><option value="twilio">Twilio</option></select></div>
            {provider === "twilio" ? <div className="space-y-1.5 md:col-span-2"><label htmlFor="connection-account-sid" className="text-sm font-medium">Twilio account SID</label><Input id="connection-account-sid" required maxLength={34} pattern="AC[a-fA-F0-9]{32}" value={accountSid} onChange={event => setAccountSid(event.target.value)} placeholder="AC…" /></div> : null}
            {SECRET_FIELDS[provider].map(([key, title]) => <div key={key} className="space-y-1.5"><label htmlFor={`secret-${key}`} className="text-sm font-medium">{title}</label><Input id={`secret-${key}`} type="password" autoComplete="new-password" maxLength={2048} disabled={!!cleared[key]} value={secrets[key] || ""} onChange={event => setSecrets(current => ({ ...current, [key]: event.target.value }))} placeholder={editing?.configuredFields.includes(key) ? "Leave blank to keep saved secret" : "Enter secret"} /><p className="text-xs text-slate-500">{editing?.configuredFields.includes(key) ? "Secret saved. Its value is never displayed." : "No secret saved."}</p>{editing?.configuredFields.includes(key) ? <label className="flex items-center gap-2 text-xs text-slate-600"><input type="checkbox" checked={!!cleared[key]} onChange={event => setCleared(current => ({ ...current, [key]: event.target.checked }))} />Clear saved secret</label> : null}</div>)}
          </fieldset>
          <p className="text-xs text-slate-500">Secrets are encrypted in the database. Blank inputs preserve saved secrets. Connections can be prepared while WhatsApp outreach is disabled.</p>
          <div className="flex gap-3"><Button type="submit" disabled={busy}>{busy ? "Saving…" : "Save connection"}</Button><Button type="button" variant="outline" disabled={busy} onClick={showList}>Cancel</Button></div>
        </form>
      )}
    </Card>
  );
}
