"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, ChevronRight, Layers3, Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
    <Card className="relative isolate flex h-full min-h-[20rem] flex-col overflow-hidden rounded-2xl border border-[rgb(255_255_255_/_0.82)] bg-slate p-0 lg:min-h-0 [background-image:radial-gradient(132%_120%_at_88%_-8%,rgba(125,177,255,0.42)_0%,rgba(183,214,255,0.17)_34%,rgba(255,255,255,0)_60%),radial-gradient(126%_112%_at_10%_6%,rgba(255,255,255,0.72)_0%,rgba(250,252,255,0.5)_52%,rgba(240,246,253,0.38)_100%),linear-gradient(160deg,rgba(255,255,255,0.8)_0%,rgba(250,252,255,0.64)_56%,rgba(240,246,253,0.52)_100%)] backdrop-blur-[16px] [backdrop-filter:saturate(175%)_blur(16px)] shadow-[0_0_0_1px_rgba(255,255,255,0.82),0_0_12px_-9px_rgba(2,10,27,0.58),0_0_6px_-5px_rgba(15,23,42,0.36),inset_0_1px_0_rgba(255,255,255,1),inset_0_-2px_0_rgba(221,230,244,0.74),inset_0_0_22px_rgba(255,255,255,0.24)]">
      <div className="pointer-events-none absolute -right-20 -top-24 h-60 w-60 rounded-full bg-gradient-to-br from-sky-300/34 via-blue-500/12 to-blue-700/0 blur-3xl" />
      <div className="pointer-events-none absolute -left-24 -bottom-20 h-56 w-56 rounded-full bg-gradient-to-tr from-blue-300/20 via-sky-200/10 to-transparent blur-3xl" />

      <div className="relative z-[2] flex shrink-0 items-center justify-between border-b border-slate-100/70 bg-gradient-to-b from-white/50 to-white/20 px-5 py-4 backdrop-blur-[10px] [backdrop-filter:saturate(150%)_blur(10px)]">
        <div>
          <h3 className="text-lg font-semibold text-zinc-900">Recent Events</h3>
          <p className="text-sm text-zinc-500">Combined lead sheets across related campaigns</p>
        </div>
        <Button
          asChild
          variant="ghost"
          className="h-10 rounded-md border border-slate-300/80 bg-gradient-to-br from-white/95 via-slate-50/90 to-blue-50/80 px-4 text-slate-700 transition-all hover:-translate-y-0.5 hover:border-slate-300/95 hover:from-white hover:to-blue-50/90 hover:text-slate-900"
        >
          <Link href="/campaigns">
            <span className="text-sm font-semibold">View all</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>

      <div className="relative z-[2] min-h-0 flex-1 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        <div className="divide-y divide-zinc-100/80 px-2 pb-2">
          {loading ? <div className="p-6 text-sm text-zinc-400">Loading...</div> : null}

          {!loading && events.length === 0 ? (
            <div className="p-6 text-sm text-zinc-400">No events yet</div>
          ) : null}

          {!loading &&
            events.map((event) => (
              <Link
                key={event.canonicalEventKey}
                href={`/leads?event=${encodeURIComponent(event.canonicalEventKey)}`}
                className="group my-1 flex w-full items-center justify-between rounded-xl border border-transparent bg-gradient-to-b from-white/90 to-slate-50/80 p-4 text-left shadow-none transition-colors hover:border-slate-300/90 hover:from-white/95 hover:to-slate-50/85"
              >
                <div className="min-w-0 space-y-2">
                  <h4 className="truncate pr-4 font-medium text-zinc-900">{event.canonicalEventName}</h4>
                  <p className="text-xs text-zinc-500" title={event.relatedCampaignNames.join(", ")}>
                    {renderRelatedCampaigns(event.relatedCampaignNames)}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Badge className="rounded-full border border-zinc-200/85 bg-zinc-100/88 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-600 shadow-none">
                      <Layers3 className="mr-1 h-3 w-3" />
                      {event.campaignCount} campaigns
                    </Badge>
                    <Badge className="rounded-full border border-zinc-200/85 bg-zinc-100/88 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-600 shadow-none">
                      <Users className="mr-1 h-3 w-3" />
                      {event.leadCount} leads
                    </Badge>
                  </div>
                </div>

                <ChevronRight className="h-4 w-4 shrink-0 text-zinc-300 transition-transform group-hover:translate-x-0.5 group-hover:text-zinc-500" />
              </Link>
            ))}
        </div>
      </div>
    </Card>
  );
}
