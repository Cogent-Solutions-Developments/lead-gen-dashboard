"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { listEvents, type EventSummaryItem } from "@/lib/apiRouter";
import { usePersona } from "@/hooks/usePersona";
import { toast } from "sonner";

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong.";
}

function renderRelatedCampaigns(names: string[]) {
  if (names.length === 0) return "No related campaigns";
  if (names.length <= 2) return names.join(", ");
  return `${names.slice(0, 2).join(", ")} +${names.length - 2} more`;
}

export function RecentEvents() {
  const { persona } = usePersona();
  const [events, setEvents] = useState<EventSummaryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const response = await listEvents();
        if (!alive) return;
        setEvents((response.events || []).slice(0, 6));
      } catch (error: unknown) {
        if (!alive) return;
        toast.error("Failed to load events", {
          description: getErrorMessage(error),
        });
        setEvents([]);
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [persona]);

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-transparent shadow-none">
      <div className="relative z-[2] min-h-0 flex-1 overflow-y-auto pt-0 scrollbar-hide">
        <div className="divide-y divide-zinc-100">
          {loading && <div className="py-6 text-sm font-light text-zinc-400">Syncing event data...</div>}

          {!loading && events.length === 0 && (
            <div className="py-6 text-sm font-light text-zinc-400">No events indexed.</div>
          )}

          {!loading &&
            events.map((event) => (
              <Link
                key={event.canonicalEventKey}
                href={`/leads?event=${encodeURIComponent(event.canonicalEventKey)}`}
                className="group flex w-full items-center justify-between border-b border-zinc-100 py-10 text-left transition-colors hover:border-zinc-300"
              >
                <div className="min-w-0 space-y-4">
                  <h4 className="truncate pr-4 text-3xl font-light tracking-tight text-zinc-950 group-hover:text-blue-700">
                    {event.canonicalEventName}
                  </h4>
                  <p className="text-sm font-light text-zinc-500" title={event.relatedCampaignNames.join(", ")}>
                    {renderRelatedCampaigns(event.relatedCampaignNames)}
                  </p>
                  <div className="flex flex-wrap gap-10">
                    <div className="flex items-center gap-2.5">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Campaigns</span>
                      <span className="text-sm font-light text-zinc-950">{event.campaignCount}</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Leads</span>
                      <span className="text-sm font-light text-zinc-950">{event.leadCount}</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
        </div>
      </div>
    </div>
  );
}
