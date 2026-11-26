"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getCampaignReuseOptions, reuseCampaign, type CampaignReuseOptions } from "@/lib/campaignReuse";
import type { Persona } from "@/lib/persona";

export function ReuseCampaignDialog({ campaign, persona, onClose, onCreated }: {
  campaign: { id: string; name: string };
  persona: Persona;
  onClose: () => void;
  onCreated: (id: string, count: number) => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const requests = useRef(new Map<string, string>());
  const submitting = useRef(false);
  const [options, setOptions] = useState<CampaignReuseOptions | null>(null);
  const [eventId, setEventId] = useState("");
  const [category, setCategory] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);

  useEffect(() => {
    let cancelled = false;
    getCampaignReuseOptions(campaign.id, persona).then(data => {
      if (cancelled) return;
      setOptions(data);
      setEventId(data.suggestedEventId || "");
      setCategory(data.category || "");
      setError("");
    }).catch(error => {
      if (!cancelled) setError(error instanceof Error ? error.message : "Unable to load events.");
    });
    return () => { cancelled = true; };
  }, [campaign.id, persona, attempt]);

  const events = (options?.events || []).filter(event => event.isActive);

  return <dialog ref={dialogRef} aria-labelledby="reuse-campaign-title"
    onCancel={event => { event.preventDefault(); if (!submitting.current) onClose(); }}
    className="fixed inset-0 m-auto w-[calc(100%_-_2rem)] max-h-[90dvh] max-w-lg overflow-y-auto rounded-2xl border border-zinc-300 bg-white p-6 text-zinc-900 shadow-xl backdrop:bg-zinc-950/40 backdrop:backdrop-blur-sm">
    <form onSubmit={async event => {
      event.preventDefault();
      if (!eventId || !options || !options.leadCount || submitting.current) return;
      submitting.current = true;
      setBusy(true);
      setError("");
      try {
        const key = JSON.stringify([eventId, category.trim()]);
        const requestId = requests.current.get(key) || crypto.randomUUID();
        requests.current.set(key, requestId);
        const result = await reuseCampaign(campaign.id, persona, { eventRegistryId: eventId, category: category.trim(), requestId });
        onCreated(result.id, result.reusedLeads);
      } catch (error) {
        setError(error instanceof Error ? error.message : "Unable to create campaign. Please retry.");
      } finally {
        submitting.current = false;
        setBusy(false);
      }
    }}>
      <div className="flex items-start justify-between gap-4">
        <h2 id="reuse-campaign-title" className="text-xl font-semibold">Clone campaign</h2>
        <Button type="button" variant="ghost" size="sm" aria-label="Close clone campaign" disabled={busy} onClick={onClose}><X className="h-4 w-4" /></Button>
      </div>
      <fieldset disabled={busy || !options} className="mt-5 space-y-4 disabled:opacity-60">
        <div className="space-y-2">
          <label htmlFor="reuse-event" className="block text-sm font-medium">Event <span className="text-rose-600">*</span></label>
          <select id="reuse-event" required value={eventId} onChange={event => setEventId(event.target.value)} className="h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm">
            <option value="">{options ? "Select event" : error ? "Events unavailable" : "Loading events…"}</option>
            {events.map(event => <option key={event.id} value={event.id}>{[event.eventName, event.date, event.location].filter(Boolean).join(" · ")}</option>)}
          </select>
          {options && !events.length && <p className="text-sm text-amber-700">No active events available.</p>}
        </div>
        <div className="space-y-2">
          <label htmlFor="reuse-category" className="block text-sm font-medium">Category <span className="font-normal text-zinc-500">(optional)</span></label>
          <Input id="reuse-category" maxLength={120} value={category} onChange={event => setCategory(event.target.value)} placeholder={options?.category || "Enter category"} />
        </div>
      </fieldset>
      {options?.leadCount === 0 && <p className="mt-3 text-sm text-amber-700">This campaign has no leads to reuse.</p>}
      {error && <div role="alert" className="mt-3 text-sm text-rose-700">{error}{!options && <Button type="button" variant="ghost" onClick={() => { setError(""); setAttempt(value => value + 1); }}>Retry loading</Button>}</div>}
      <div className="mt-6 flex justify-end gap-2">
        <Button type="button" variant="outline" disabled={busy} onClick={onClose}>Cancel</Button>
        <Button type="submit" disabled={busy || !options?.leadCount || !eventId}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{busy ? "Creating…" : "Create campaign"}</Button>
      </div>
    </form>
  </dialog>;
}
