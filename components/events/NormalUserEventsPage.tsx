"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { listEvents, type EventSummaryItem } from "@/lib/apiRouter";
import {
  ArrowLeft,
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
      <header className="shrink-0 border-b border-zinc-200 pb-12">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Link
              href="/dashboard"
              className="inline-flex items-center text-xs font-medium text-zinc-400 transition-colors hover:text-zinc-950"
            >
              <ArrowLeft className="mr-2 h-3 w-3" />
              Return to dashboard
            </Link>

            <div className="mt-8">
              <h1 className="text-5xl font-light leading-none tracking-tighter text-zinc-950 sm:text-6xl">
                Events
              </h1>
              <p className="mt-4 max-w-xl text-lg font-light leading-relaxed text-zinc-500">
                Browse our curated event registry and access real-time prospect intelligence.
              </p>
            </div>
          </div>

          <div className="flex gap-16 border-zinc-200 lg:border-l lg:pl-16">
            <div className="space-y-1">
              <p className="text-xs font-medium text-zinc-400">Active events</p>
              <p className="text-4xl font-light tabular-nums tracking-tighter text-zinc-950">
                {items.length}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-zinc-400">Total prospect reach</p>
              <p className="text-4xl font-light tabular-nums tracking-tighter text-zinc-950">
                {totalLeadCount.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col pt-12">
        <main className="flex min-h-0 flex-col">
          <div className="flex shrink-0 flex-col gap-8 sm:flex-row sm:items-end sm:justify-between">
            <div className="relative w-full sm:max-w-xl">
              <Search className="absolute bottom-4 left-0 h-4 w-4 text-zinc-400" />
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search index"
                className="h-12 w-full border-b border-zinc-200 bg-transparent pl-8 text-lg font-light tracking-tight text-zinc-950 placeholder:text-zinc-400 focus:border-blue-600 focus:outline-none md:text-xl"
              />
            </div>

            <button
              type="button"
              className="flex items-center gap-2 border-b border-transparent pb-4 text-sm font-medium text-zinc-500 transition-all hover:border-zinc-900 hover:text-zinc-900"
              onClick={() => setRefreshTick((value) => value + 1)}
            >
              <RefreshCcw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>

          <div className="mt-16 min-h-0 flex-1 overflow-y-auto">
            {loading ? (
              <div className="py-12 text-sm text-zinc-500">Loading events...</div>
            ) : filteredItems.length === 0 ? (
              <div className="py-12 text-sm text-zinc-500">
                {searchQuery.trim() ? "No events match this search." : "No events found."}
              </div>
            ) : (
              <div className="grid border-t border-zinc-200 lg:grid-cols-2">
                {filteredItems.map((item, index) => (
                  <motion.div
                    key={item.canonicalEventKey}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.02 }}
                    className={`group border-zinc-200 transition-colors hover:bg-zinc-50/50 ${
                      index % 2 === 0 ? "border-b lg:border-r" : "border-b"
                    }`}
                  >
                    <Link
                      href={`/leads?event=${encodeURIComponent(item.canonicalEventKey)}`}
                      className="flex h-full flex-col p-8"
                    >
                      <div className="flex flex-1 flex-col justify-between gap-10">
                        <div className="space-y-4">
                          <h2 className="text-2xl font-light leading-[1.2] tracking-tight text-zinc-950 group-hover:text-blue-700 sm:text-3xl">
                            {item.canonicalEventName}
                          </h2>
                        </div>

                        <div className="flex items-end justify-between">
                          <div className="space-y-1">
                            <span className="text-xs font-medium text-zinc-400">Total prospects</span>
                            <div className="flex items-baseline gap-2">
                              <span className="text-4xl font-medium tabular-nums tracking-tighter text-zinc-900">
                                {Number(item.leadCount).toLocaleString()}
                              </span>
                              <span className="text-sm font-medium text-zinc-500">leads</span>
                            </div>
                          </div>

                          <div className="flex h-12 w-12 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-400 transition-all group-hover:border-blue-600 group-hover:bg-blue-600 group-hover:text-white">
                            <ArrowLeft className="h-5 w-5 rotate-180" />
                          </div>
                        </div>
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
