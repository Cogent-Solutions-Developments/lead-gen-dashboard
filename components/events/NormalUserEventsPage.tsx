"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { listEvents, type EventSummaryItem } from "@/lib/apiRouter";
import {
  ArrowLeft,
  CalendarDays,
  ChevronRight,
  RefreshCcw,
  Search,
} from "lucide-react";
import { toast } from "sonner";

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong.";
}

export function NormalUserEventsPage() {
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
        ...(item.relatedCampaignNames || []),
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
    <div className="flex h-[calc(100dvh-3rem)] min-h-0 flex-col overflow-hidden bg-transparent p-1 font-sans">
      <header className="shrink-0 border-b border-zinc-200/70 pb-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Link
              href="/dashboard"
              className="inline-flex items-center text-sm font-medium text-zinc-500 transition-colors hover:text-zinc-900"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Link>

            <div className="mt-5">
              <h1 className="text-4xl font-semibold leading-none tracking-tight text-zinc-950">
                Events
              </h1>
              <p className="mt-3 max-w-xl text-base text-zinc-500">
                Pick an event and open its lead sheet.
              </p>
            </div>
          </div>

          <div className="grid max-w-md grid-cols-2 gap-8 border-t border-zinc-200/70 pt-4 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
            <div>
              <p className="text-sm font-medium text-zinc-400">Events</p>
              <p className="mt-1 text-3xl font-semibold tracking-tight text-zinc-950">
                {items.length}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-400">Leads</p>
              <p className="mt-1 text-3xl font-semibold tracking-tight text-zinc-950">
                {totalLeadCount}
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col pt-7">
        <main className="flex min-h-0 flex-col">
          <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:px-3">
            <div className="relative w-full sm:max-w-md">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search events"
                className="h-12 rounded-md border-zinc-200 bg-white/45 pl-11 text-base shadow-[0_8px_18px_-18px_rgba(2,10,27,0.58),inset_0_1px_0_rgba(255,255,255,0.9)] placeholder:text-zinc-400 focus-visible:ring-blue-500/15 md:text-sm"
              />
            </div>

            <Button
              type="button"
              variant="outline"
              className="h-12 rounded-md border-zinc-200 bg-white/45 px-4 text-sm font-semibold text-zinc-700 shadow-[0_8px_18px_-18px_rgba(2,10,27,0.58),inset_0_1px_0_rgba(255,255,255,0.9)] hover:bg-white/70 hover:text-zinc-950"
              onClick={() => setRefreshTick((value) => value + 1)}
            >
              <RefreshCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>

          <div className="mt-7 min-h-0 flex-1 overflow-y-auto border-t border-zinc-200/70">
            {loading ? (
              <div className="py-12 text-sm text-zinc-500">Loading events...</div>
            ) : filteredItems.length === 0 ? (
              <div className="py-12 text-sm text-zinc-500">
                {searchQuery.trim() ? "No events match this search." : "No events found."}
              </div>
            ) : (
              <div className="divide-y divide-zinc-200/70">
                {filteredItems.map((item, index) => (
                  <motion.div
                    key={item.canonicalEventKey}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.025 }}
                  >
                    <Link
                      href={`/leads?event=${encodeURIComponent(item.canonicalEventKey)}`}
                      className="group grid gap-5 py-6 transition-colors hover:bg-white/28 sm:grid-cols-[minmax(0,1fr)_7rem_7rem_auto] sm:items-center sm:px-3"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-3">
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-white/25 bg-[linear-gradient(148deg,#2d71df_0%,#145acc_54%,#0f4697_100%)] text-white shadow-[0_14px_24px_-15px_rgba(8,28,70,0.9),inset_0_1px_0_rgba(255,255,255,0.28)]">
                            <CalendarDays className="h-5 w-5" />
                          </span>
                          <div className="min-w-0">
                            <h2 className="truncate text-lg font-semibold tracking-tight text-zinc-950">
                              {item.canonicalEventName}
                            </h2>
                            <p className="mt-1 truncate text-sm text-zinc-400">
                              {item.canonicalEventKey}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="text-sm font-medium text-zinc-400">Lists</p>
                        <p className="mt-1 text-xl font-semibold tracking-tight text-zinc-900">
                          {item.campaignCount}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-sm font-medium text-zinc-400">Leads</p>
                        <p className="mt-1 text-xl font-semibold tracking-tight text-zinc-900">
                          {item.leadCount}
                        </p>
                      </div>

                      <div className="flex justify-end">
                        <span className="inline-flex h-12 items-center justify-center rounded-md border border-zinc-200 bg-white/45 px-4 text-sm font-semibold text-zinc-800 shadow-[0_10px_18px_-18px_rgba(2,10,27,0.58),inset_0_1px_0_rgba(255,255,255,0.9)] transition-colors group-hover:border-blue-200 group-hover:bg-blue-50/70 group-hover:text-blue-700">
                          Open leads
                          <ChevronRight className="ml-1.5 h-4 w-4" />
                        </span>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
