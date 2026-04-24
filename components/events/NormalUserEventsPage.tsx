"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { listEvents, type EventSummaryItem } from "@/lib/apiRouter";
import { usePersona } from "@/hooks/usePersona";
import { ChevronRight, Layers3, RefreshCcw, Search, Users } from "lucide-react";
import { toast } from "sonner";

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong.";
}

function renderRelatedCampaigns(names: string[]) {
  if (names.length === 0) return "-";
  if (names.length <= 2) return names.join(", ");
  return `${names.slice(0, 2).join(", ")} +${names.length - 2} more`;
}

export function NormalUserEventsPage() {
  const { persona } = usePersona();
  const personaLabel =
    persona === "delegates" ? "Delegate" : persona === "production" ? "Production" : "Sales";

  const [items, setItems] = useState<EventSummaryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const response = await listEvents();
        if (!cancelled) {
          setItems(response.events || []);
        }
      } catch (error: unknown) {
        if (!cancelled) {
          toast.error("Failed to load events", {
            description: getErrorMessage(error),
          });
          setItems([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [refreshTick]);

  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return items;

    return items.filter((item) => {
      const haystack = [
        item.canonicalEventName,
        item.canonicalEventKey,
        ...item.relatedCampaignNames,
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [items, searchQuery]);

  const totalLeadCount = useMemo(
    () => items.reduce((sum, item) => sum + Number(item.leadCount || 0), 0),
    [items]
  );

  return (
    <div className="font-sans flex h-[calc(100dvh-3rem)] min-h-0 flex-col overflow-hidden bg-transparent p-1">
      <div className="relative z-10 flex shrink-0 flex-col gap-4 border-b border-zinc-100/90 bg-transparent pb-6 backdrop-blur-[8px] sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-zinc-400">
            {personaLabel} Workspace
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-900">Events</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Open an event to review one combined lead sheet across all related campaign runs.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge className="rounded-md border border-zinc-200/80 bg-zinc-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-zinc-500 shadow-none">
            {items.length} events
          </Badge>
          <Badge className="rounded-md border border-zinc-200/80 bg-zinc-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-zinc-500 shadow-none">
            {totalLeadCount} unique leads
          </Badge>
        </div>
      </div>

      <div className="mt-5 flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-zinc-200/80 bg-white/32 backdrop-blur-[8px]">
        <div className="flex shrink-0 flex-col gap-3 border-b border-zinc-200/70 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search event or related campaign"
              className="h-9 border-zinc-200/80 bg-white/85 pl-9 text-sm"
            />
          </div>

          <Button
            variant="outline"
            className="h-9 shrink-0 border-zinc-200/80 bg-white/85 px-3.5 text-xs font-semibold text-zinc-700 hover:bg-white"
            onClick={() => setRefreshTick((value) => value + 1)}
          >
            <RefreshCcw className="mr-1.5 h-3.5 w-3.5" />
            Refresh
          </Button>
        </div>

        <div className="min-h-0 flex-1 overflow-auto px-4 py-3">
          {loading ? (
            <div className="px-5 py-10 text-sm text-zinc-500">Loading events...</div>
          ) : filteredItems.length === 0 ? (
            <div className="px-5 py-10 text-sm text-zinc-500">
              {searchQuery.trim() ? "No events match the current search." : "No events found."}
            </div>
          ) : (
            <table className="min-w-[900px] w-full">
              <thead className="border-b border-zinc-100/85 bg-white/70">
                <tr>
                  <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                    Event
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                    Related Campaigns
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                    Campaigns
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                    Unique Leads
                  </th>
                  <th className="px-4 py-3 text-right text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-zinc-100/70">
                {filteredItems.map((item, index) => (
                  <motion.tr
                    key={item.canonicalEventKey}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className="group transition-colors hover:bg-white/46"
                  >
                    <td className="px-4 py-4 align-top">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-zinc-900">
                          {item.canonicalEventName}
                        </p>
                        <p className="mt-1 text-xs text-zinc-400">{item.canonicalEventKey}</p>
                      </div>
                    </td>

                    <td className="px-4 py-4 align-top">
                      <p className="text-sm text-zinc-700" title={item.relatedCampaignNames.join(", ")}>
                        {renderRelatedCampaigns(item.relatedCampaignNames)}
                      </p>
                    </td>

                    <td className="px-4 py-4 align-top">
                      <span className="inline-flex items-center gap-2 text-sm font-medium text-zinc-700">
                        <Layers3 className="h-4 w-4 text-zinc-400" />
                        {item.campaignCount}
                      </span>
                    </td>

                    <td className="px-4 py-4 align-top">
                      <span className="inline-flex items-center gap-2 text-sm font-medium text-zinc-700">
                        <Users className="h-4 w-4 text-zinc-400" />
                        {item.leadCount}
                      </span>
                    </td>

                    <td className="px-4 py-4 align-top text-right">
                      <Link href={`/leads?event=${encodeURIComponent(item.canonicalEventKey)}`}>
                        <Button className="h-9 rounded-md border border-zinc-200/80 bg-white/82 px-3.5 text-xs font-semibold text-zinc-700 shadow-[0_8px_14px_-12px_rgba(2,10,27,0.42),inset_0_1px_0_rgba(255,255,255,0.95)] hover:border-zinc-300 hover:bg-white hover:text-zinc-900">
                          Open Lead Sheet
                          <ChevronRight className="ml-1 h-3 w-3" />
                        </Button>
                      </Link>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
