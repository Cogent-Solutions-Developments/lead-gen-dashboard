"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Copy, Eye, KeyRound, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { SettingsBackButton } from "@/components/settings/SettingsBackButton";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { apiClient } from "@/lib/apiClient";
import { configurationError } from "@/lib/whatsappConfiguration";

const endpoint = "/api/admin/settings/event-payments/keys";
const slugPattern = "[a-z0-9][a-z0-9-]{0,79}";
const validSlug = new RegExp("^" + slugPattern + "$");

type EventKey = {
  event_slug: string;
  key_prefix: string | null;
  revision: number;
  viewable: boolean;
};
type VisibleKey = { event_slug: string; key: string };
type KeyAction = { kind: "rotate" | "delete"; item: EventKey };

export function EventPaymentKeySettings() {
  const [items, setItems] = useState<EventKey[]>([]);
  const [slug, setSlug] = useState("");
  const [visibleKey, setVisibleKey] = useState<VisibleKey | null>(null);
  const [action, setAction] = useState<KeyAction | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setBusy(true);
    setError("");
    try {
      setItems((await apiClient.get<{ items: EventKey[] }>(endpoint)).data.items);
      setLoaded(true);
    } catch (err) {
      setError(configurationError(err));
    } finally {
      setBusy(false);
    }
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);

  async function issue(eventSlug: string, revision?: number) {
    if (busy || visibleKey) return;
    setBusy(true);
    setError("");
    try {
      const { data } = await apiClient.post<EventKey & VisibleKey>(
        endpoint + "/" + encodeURIComponent(eventSlug),
        revision === undefined ? {} : { revision },
      );
      setVisibleKey(data);
      setItems(current => [
        ...current.filter(item => item.event_slug !== data.event_slug),
        { event_slug: data.event_slug, key_prefix: data.key_prefix, revision: data.revision, viewable: data.viewable },
      ].sort((a, b) => a.event_slug.localeCompare(b.event_slug)));
      setSlug("");
      setAction(null);
    } catch (err) {
      setError(configurationError(err));
    } finally {
      setBusy(false);
    }
  }

  async function view(item: EventKey) {
    if (busy || visibleKey || action) return;
    setBusy(true);
    setError("");
    try {
      const { data } = await apiClient.get<VisibleKey>(endpoint + "/" + encodeURIComponent(item.event_slug));
      setVisibleKey(data);
    } catch (err) {
      setError(configurationError(err));
    } finally {
      setBusy(false);
    }
  }

  async function remove(item: EventKey) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await apiClient.delete(endpoint + "/" + encodeURIComponent(item.event_slug), { params: { revision: item.revision } });
      setItems(current => current.filter(key => key.event_slug !== item.event_slug));
      setAction(null);
      toast.success("Payment key deleted");
    } catch (err) {
      setError(configurationError(err));
    } finally {
      setBusy(false);
    }
  }

  function generate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const eventSlug = slug.trim();
    if (validSlug.test(eventSlug)) void issue(eventSlug);
  }

  async function copyKey() {
    if (!visibleKey) return;
    try {
      await navigator.clipboard.writeText(visibleKey.key);
      toast.success("Payment key copied");
    } catch {
      toast.error("Select and copy the key manually");
    }
  }

  return (
    <Card className="space-y-5 border-slate-200 p-6">
      <div className="flex items-start justify-between gap-4">
        <SettingsBackButton href="/settings" />
        <Button variant="outline" disabled={busy || !!visibleKey} onClick={() => void refresh()}>
          <RefreshCw className="h-4 w-4" aria-hidden="true" /> Refresh
        </Button>
      </div>
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Event Payment Keys</h1>
        <p className="mt-1 text-sm text-slate-500">Generate a key using the slug in the event site’s server configuration.</p>
      </div>
      {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
      {visibleKey ? (
        <section aria-labelledby="issued-key-title" className="space-y-3 rounded-lg border border-blue-200 bg-blue-50/50 p-4">
          <h2 id="issued-key-title" className="font-semibold text-slate-900">Payment key for {visibleKey.event_slug}</h2>
          <p className="text-sm text-slate-600">For AIMUP, set this key as <code>SUPERNIZO_EVENT_PAYMENT_API_KEY</code> in the event server’s environment.</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input aria-label="Payment key" readOnly value={visibleKey.key} className="font-mono" onFocus={event => event.currentTarget.select()} />
            <Button onClick={() => void copyKey()}><Copy className="h-4 w-4" aria-hidden="true" /> Copy key</Button>
          </div>
          <Button variant="outline" onClick={() => setVisibleKey(null)}>Hide key</Button>
        </section>
      ) : action ? (
        <section className={`space-y-3 rounded-lg border p-4 ${action.kind === "delete" ? "border-rose-200 bg-rose-50" : "border-amber-200 bg-amber-50"}`}>
          <h2 className="font-semibold">{action.kind === "delete" ? "Delete" : "Rotate"} key for {action.item.event_slug}?</h2>
          <p className="text-sm text-slate-600">
            {action.kind === "delete"
              ? "The key will stop working immediately. This event’s checkout will need a new key. Payment records will still be available in Supernizo."
              : "The current key stops working immediately. Update the event’s private key file as soon as you copy the replacement."}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" disabled={busy} onClick={() => setAction(null)}>Cancel</Button>
            {action.kind === "delete"
              ? <Button variant="destructive" disabled={busy} onClick={() => void remove(action.item)}>Delete key</Button>
              : <Button disabled={busy} onClick={() => void issue(action.item.event_slug, action.item.revision)}>Rotate key</Button>}
          </div>
        </section>
      ) : (
        <form onSubmit={generate} className="flex flex-col items-start gap-3 sm:flex-row sm:items-end">
          <div className="w-full max-w-sm space-y-1">
            <label htmlFor="payment-event-slug" className="text-sm font-medium">Event slug</label>
            <Input id="payment-event-slug" placeholder="aimup-nigeria-2027" required maxLength={80}
              value={slug} onChange={event => setSlug(event.target.value)} autoComplete="off" spellCheck={false} />
          </div>
          <Button type="submit" disabled={busy || !loaded || !validSlug.test(slug.trim())}>
            <KeyRound className="h-4 w-4" aria-hidden="true" /> Generate key
          </Button>
        </form>
      )}
      <section aria-label="Configured event keys" className="divide-y rounded-lg border border-slate-200">
        {items.map(item => (
          <div key={item.event_slug} className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <p className="break-all text-sm font-semibold text-slate-900">{item.event_slug}</p>
              <p className="text-xs text-slate-500">{item.key_prefix ? item.key_prefix + "…" : "Existing file key"}</p>
              {!item.viewable && <p className="mt-1 text-xs text-slate-500">Rotate once to enable viewing.</p>}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" disabled={busy || !!visibleKey || !!action || !item.viewable}
                onClick={() => void view(item)} aria-label={"View key for " + item.event_slug}>
                <Eye className="h-4 w-4" aria-hidden="true" /> View
              </Button>
              <Button variant="outline" size="sm" disabled={busy || !!visibleKey || !!action}
                onClick={() => setAction({ kind: "rotate", item })} aria-label={"Rotate key for " + item.event_slug}>Rotate</Button>
              <Button variant="outline" size="sm" className="text-rose-700 hover:text-rose-800"
                disabled={busy || !!visibleKey || !!action} onClick={() => setAction({ kind: "delete", item })}
                aria-label={"Delete key for " + item.event_slug}>
                <Trash2 className="h-4 w-4" aria-hidden="true" /> Delete
              </Button>
            </div>
          </div>
        ))}
        {!items.length && <p className="p-4 text-sm text-slate-500">{loaded ? "No event payment keys yet." : busy ? "Loading event keys…" : "Event keys could not be loaded."}</p>}
      </section>
    </Card>
  );
}
