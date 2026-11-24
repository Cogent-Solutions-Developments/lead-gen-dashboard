"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { listActiveEventRegistry, type AdminEventItem } from "@/lib/auth";
import { linkedInPageError, type LinkedInCampaign } from "@/lib/linkedinPages";
import { updateLinkedInCampaignEvent } from "@/lib/linkedinPagesApi";

export function LinkedInCampaignEventSettings({ campaign, onSaved }: { campaign: LinkedInCampaign; onSaved: () => void }) {
  const [events, setEvents] = useState<AdminEventItem[]>([]);
  const [eventKey, setEventKey] = useState(campaign.eventKey ?? "");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);
  useEffect(() => {
    let active = true;
    listActiveEventRegistry().then(
      items => { if (active) { setEvents(items); setLoading(false); } },
      error => { if (active) { setError(linkedInPageError(error)); setLoading(false); } },
    );
    return () => { active = false; };
  }, []);
  async function save() {
    if (inFlight.current) return;
    inFlight.current = true; setBusy(true); setError(null);
    try { await updateLinkedInCampaignEvent(campaign.pageId, campaign.id, eventKey || null); onSaved(); }
    catch (error) { setError(linkedInPageError(error)); }
    finally { inFlight.current = false; setBusy(false); }
  }
  return <section aria-label="LinkedIn campaign event" className="space-y-3 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-900">
    <label htmlFor="linkedin-linked-event" className="block text-sm font-semibold">Linked event</label>
    <p className="text-xs text-zinc-500">Use the event website, date and location for email templates and Agentic research. Changing the event preserves sent emails and sequence progress.</p>
    {!campaign.eventKey && <p role="status" className="text-xs text-amber-800 dark:text-amber-300">No event linked. Agentic research and templates using event details need a linked event.</p>}
    <div className="flex flex-wrap items-center gap-3"><select id="linkedin-linked-event" value={eventKey} onChange={event => setEventKey(event.target.value)} disabled={loading || busy} className="h-10 min-w-0 flex-1 rounded-md border border-zinc-300 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900"><option value="">No linked event</option>{campaign.eventKey && !events.some(event => event.eventKey === campaign.eventKey) && <option value={campaign.eventKey}>Current event (inactive or unavailable)</option>}{events.map(event => <option key={event.eventKey} value={event.eventKey}>{event.eventName}</option>)}</select><Button type="button" disabled={loading || busy || eventKey === (campaign.eventKey ?? "")} onClick={() => void save()}>{busy ? "Saving…" : "Save event"}</Button></div>
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
  </section>;
}
