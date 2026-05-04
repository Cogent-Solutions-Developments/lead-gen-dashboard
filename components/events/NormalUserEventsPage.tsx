"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { listEvents, type EventSummaryItem } from "@/lib/apiRouter";
import {
  ArrowLeft,
  RefreshCcw,
  Search,
  X,
} from "lucide-react";
import { toast } from "sonner";

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong.";
}

export function NormalUserEventsPage() {
  const [items, setItems] = useState<EventSummaryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);
  const hasSearch = searchQuery.trim().length > 0;

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
              <h1 className="text-3xl font-light leading-[1.12] tracking-[-0.025em] text-zinc-950 sm:text-4xl 2xl:text-5xl">
                Events
              </h1>
              <p className="mt-4 max-w-xl text-lg font-light leading-relaxed text-zinc-500">
                Browse our curated event registry and access real-time prospect intelligence.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-5 border-zinc-200 lg:min-w-[23rem] lg:border-l lg:pl-10">
            <div className="grid grid-cols-2 gap-10">
              <div className="space-y-1">
                <p className="text-xs font-medium text-zinc-400">Active events</p>
                <p className="text-3xl font-light tabular-nums tracking-tight text-zinc-950">
                  {items.length}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-zinc-400">Total prospect reach</p>
                <p className="text-3xl font-light tabular-nums tracking-tight text-zinc-950">
                  {totalLeadCount.toLocaleString()}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-10 border-t border-zinc-200 pt-4">
              <button
                type="button"
                className={`inline-flex h-10 w-fit items-center gap-2 border-b border-transparent text-sm font-medium transition-all ${
                  hasSearch
                    ? "border-zinc-950 text-zinc-950"
                    : "text-zinc-500 hover:border-zinc-900 hover:text-zinc-950"
                }`}
                onClick={() => setSearchOpen(true)}
              >
                <Search className="h-4 w-4" />
                Search
              </button>

              <button
                type="button"
                className="inline-flex h-10 w-fit items-center gap-2 border-b border-transparent text-sm font-medium text-zinc-500 transition-all hover:border-zinc-900 hover:text-zinc-900"
                onClick={() => setRefreshTick((value) => value + 1)}
              >
                <RefreshCcw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col pt-10">
        <main className="flex min-h-0 flex-col">
          {hasSearch ? (
            <div className="mb-6 flex shrink-0 items-center justify-between border-y border-zinc-100 py-4">
              <p className="text-sm font-light text-zinc-500">
                Searching for <span className="font-medium text-zinc-950">{searchQuery.trim()}</span>
              </p>
              <button
                type="button"
                className="text-sm font-medium text-zinc-400 transition-colors hover:text-zinc-950"
                onClick={() => setSearchQuery("")}
              >
                Clear
              </button>
            </div>
          ) : null}

          <div className="min-h-0 flex-1 overflow-y-auto">
            {loading ? (
              <div className="py-12 text-sm text-zinc-500">Loading events...</div>
            ) : filteredItems.length === 0 ? (
              <div className="py-12 text-sm text-zinc-500">
                {searchQuery.trim() ? "No events match this search." : "No events found."}
              </div>
            ) : (
              <div className="grid lg:grid-cols-2">
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
                      className="flex h-full flex-col p-7 2xl:p-8"
                    >
                      <div className="flex flex-1 flex-col justify-between gap-8 2xl:gap-10">
                        <div className="space-y-4">
                          <h2 className="text-2xl font-light leading-[1.22] tracking-[-0.02em] text-zinc-950 group-hover:text-blue-700 2xl:text-3xl">
                            {item.canonicalEventName}
                          </h2>
                        </div>

                        <div className="flex items-end justify-between">
                          <div className="space-y-1">
                            <span className="text-xs font-medium text-zinc-400">Total prospects</span>
                            <div className="flex items-baseline gap-2">
                              <span className="text-3xl font-medium tabular-nums tracking-tight text-zinc-900 2xl:text-4xl">
                                {Number(item.leadCount).toLocaleString()}
                              </span>
                              <span className="text-sm font-medium text-zinc-500">leads</span>
                            </div>
                          </div>

                          <div className="flex h-11 w-11 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-400 transition-all group-hover:border-blue-600 group-hover:bg-blue-600 group-hover:text-white 2xl:h-12 2xl:w-12">
                            <ArrowLeft className="h-4 w-4 rotate-180 2xl:h-5 2xl:w-5" />
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

      {searchOpen ? (
        <div className="fixed inset-0 z-[90] flex items-start justify-center px-6 pt-24">
          <button
            type="button"
            aria-label="Close search"
            className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(255,255,255,0.34),rgba(9,9,11,0.18)_42%,rgba(9,9,11,0.28))] backdrop-blur-[10px]"
            onClick={() => setSearchOpen(false)}
          />

          <div className="relative z-[1] w-full max-w-2xl overflow-hidden rounded-full border border-white/70 bg-white/48 shadow-[inset_0_1px_0_rgba(255,255,255,0.95),inset_0_-1px_0_rgba(255,255,255,0.35),0_34px_100px_-48px_rgba(2,10,27,0.85),0_10px_32px_-24px_rgba(2,10,27,0.5)] ring-1 ring-white/45 backdrop-blur-[34px]">
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.88)_0%,rgba(255,255,255,0.34)_38%,rgba(255,255,255,0.18)_100%)]" />
            <div className="pointer-events-none absolute -left-20 -top-24 h-56 w-56 rounded-full bg-white/65 blur-3xl" />
            <div className="pointer-events-none absolute -right-24 bottom-0 h-56 w-56 rounded-full bg-blue-200/22 blur-3xl" />

            <div className="relative flex items-center gap-4 px-6 py-4">
              <Search className="h-5 w-5 shrink-0 text-zinc-400/90" />
              <input
                autoFocus
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Escape") setSearchOpen(false);
                  if (event.key === "Enter") setSearchOpen(false);
                }}
                placeholder="Search events, regions, or campaign names"
                className="h-12 min-w-0 flex-1 bg-transparent text-2xl font-light tracking-[-0.03em] text-zinc-950 placeholder:text-zinc-400/86 focus:outline-none"
              />
              {hasSearch ? (
                <button
                  type="button"
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-white/55 bg-white/36 text-zinc-400 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] transition-colors hover:bg-white/70 hover:text-zinc-950"
                  onClick={() => setSearchQuery("")}
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null}
            </div>

          </div>
        </div>
      ) : null}
    </div>
  );
}
