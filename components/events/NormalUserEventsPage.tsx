"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { listEvents, type EventSummaryItem } from "@/lib/apiRouter";
import { listActiveEventRegistry, type AdminEventItem } from "@/lib/auth";
import { ProtectedImage } from "@/components/storage/ProtectedImage";
import {
  ArrowRight,
  CalendarDays,
  LayoutGrid,
  List,
  MapPin,
  Search,
  X,
} from "lucide-react";
import { toast } from "sonner";

type EventViewMode = "list" | "grid";

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong.";
}

function getDisplayEventName(name: string) {
  const cleanName = name.trim();
  const [shortName] = cleanName.split(/\s(?:-|\u2013|\u2014)\s/);
  return shortName?.trim() || cleanName;
}

function formatEventDate(value?: string | null) {
  if (!value) return "";

  const raw = String(value).trim();
  const dateOnly = raw.split("T")[0];
  const m = dateOnly.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (m) {
    const [, y, mo, d] = m;
    const parsed = new Date(Number(y), Number(mo) - 1, Number(d));
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    }
  }

  const fallback = new Date(raw);
  if (!Number.isNaN(fallback.getTime())) {
    return fallback.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  return raw;
}

function mergeEventRegistryMetadata(
  events: EventSummaryItem[],
  registryRows: AdminEventItem[]
) {
  const registryById = new Map(registryRows.map((item) => [item.id, item]));
  const registryByKey = new Map(registryRows.map((item) => [item.eventKey, item]));
  const registryByName = new Map(registryRows.map((item) => [item.eventName, item]));

  return events.map((event) => {
    const registryEvent =
      registryById.get(event.eventRegistryId || "") ||
      registryByKey.get(event.canonicalEventKey) ||
      registryByName.get(event.canonicalEventName);

    if (!registryEvent) return event;

    return {
      ...event,
      date: event.date ?? registryEvent.date ?? null,
      location: event.location ?? registryEvent.location ?? null,
      logoStorageObjectId: event.logoStorageObjectId ?? registryEvent.logoStorageObjectId ?? null,
      logoUrl: event.logoUrl ?? registryEvent.logoUrl ?? null,
    };
  });
}

function HeaderMetricSkeleton() {
  return (
    <div className="space-y-2">
      <div className="h-3 w-24 animate-pulse bg-zinc-100" />
      <div className="h-10 w-20 animate-pulse bg-zinc-100" />
    </div>
  );
}

function EventRowsSkeleton({ viewMode }: { viewMode: EventViewMode }) {
  if (viewMode === "grid") {
    return (
      <div className="grid grid-cols-1 gap-5 pr-1 md:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((index) => (
          <div
            key={index}
            className="flex min-h-[15rem] animate-pulse flex-col overflow-hidden rounded-lg border border-zinc-200 bg-white/70 p-5 2xl:p-6"
          >
            <div className="grid min-h-[8.25rem] grid-cols-[7.75rem_minmax(0,1fr)] gap-4 2xl:grid-cols-[8.5rem_minmax(0,1fr)]">
              <div className="bg-zinc-100" />
              <div>
                <div className="h-8 w-44 bg-zinc-100" />
                <div className="mt-4 flex gap-2">
                  <div className="h-8 w-28 bg-zinc-100" />
                  <div className="h-8 w-32 bg-zinc-100" />
                </div>
              </div>
            </div>

            <div className="mt-auto flex items-end justify-between gap-4 pt-5">
              <div className="space-y-2">
                <div className="h-3 w-24 bg-zinc-100" />
                <div className="h-9 w-28 bg-zinc-100" />
              </div>
              <div className="h-11 w-28 bg-zinc-100" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-5 pr-1">
      {[0, 1, 2].map((index) => (
        <div
          key={index}
            className="grid min-h-[11rem] animate-pulse overflow-hidden rounded-lg border border-zinc-200 bg-white/70 sm:h-[11rem] sm:min-h-0 sm:grid-cols-[10.25rem_minmax(0,1fr)] 2xl:h-[12rem] 2xl:grid-cols-[11rem_minmax(0,1fr)]"
          >
          <div className="min-h-[11rem] bg-zinc-100 p-4 sm:min-h-0 2xl:min-h-0">
            <div className="h-full w-full bg-zinc-200/70" />
          </div>

          <div className="grid min-w-0 gap-6 p-6 sm:grid-cols-[minmax(12rem,1fr)_minmax(12rem,16rem)_auto] sm:items-center 2xl:p-7">
            <div>
              <div className="h-8 w-full max-w-sm bg-zinc-100" />
              <div className="mt-4 flex gap-2">
                <div className="h-8 w-28 bg-zinc-100" />
                <div className="h-8 w-36 bg-zinc-100" />
              </div>
            </div>

            <div className="space-y-2 sm:justify-self-center">
              <div className="h-3 w-24 bg-zinc-100 sm:mx-auto" />
              <div className="h-9 w-36 bg-zinc-100 sm:mx-auto" />
            </div>

            <div className="h-11 w-32 bg-zinc-100 sm:justify-self-end" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EventImagePanel({
  item,
  viewMode = "list",
}: {
  item: EventSummaryItem;
  viewMode?: EventViewMode;
}) {
  return (
    <div
      className={
        viewMode === "grid"
          ? "relative flex h-full min-h-[8.25rem] items-center justify-center overflow-hidden text-2xl font-semibold text-zinc-400"
          : "relative flex min-h-[11rem] items-center justify-center overflow-hidden p-4 text-2xl font-semibold text-zinc-400 sm:h-full sm:min-h-0"
      }
    >
      <ProtectedImage
        src={item.logoUrl}
        directUrlPath={item.logoUrl ? `${item.logoUrl}/download-url` : undefined}
        alt=""
        className={`h-full w-full transition-transform duration-500 group-hover:scale-[1.03] ${
          viewMode === "grid" ? "object-contain p-3" : "object-contain"
        }`}
        fallback={item.canonicalEventName.slice(0, 2).toUpperCase()}
      />
    </div>
  );
}

function EventMetaChips({
  item,
  compact = false,
}: {
  item: EventSummaryItem;
  compact?: boolean;
}) {
  if (!item.date && !item.location) return null;

  return (
    <div className={`${compact ? "mt-3 gap-1.5" : "mt-4 gap-2"} flex min-w-0 flex-wrap`}>
      {item.date ? (
        <span
          className={`inline-flex max-w-full items-center rounded-full border border-zinc-200 bg-zinc-50 font-medium text-zinc-500 ${
            compact ? "h-7 gap-1.5 px-2.5 text-[11px]" : "h-8 gap-2 px-3 text-xs"
          }`}
        >
          <CalendarDays className={`${compact ? "h-3 w-3" : "h-3.5 w-3.5"} text-blue-600`} />
          <span className="truncate">{formatEventDate(item.date)}</span>
        </span>
      ) : null}
      {item.location ? (
        <span
          className={`inline-flex max-w-full items-center rounded-full border border-zinc-200 bg-zinc-50 font-medium text-zinc-500 ${
            compact ? "h-7 gap-1.5 px-2.5 text-[11px]" : "h-8 gap-2 px-3 text-xs"
          }`}
        >
          <MapPin className={`${compact ? "h-3 w-3" : "h-3.5 w-3.5"} text-blue-600`} />
          <span className={`${compact ? "max-w-[9.5rem]" : "max-w-[13rem]"} truncate`}>{item.location}</span>
        </span>
      ) : null}
    </div>
  );
}

export function NormalUserEventsPage() {
  const [items, setItems] = useState<EventSummaryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<EventViewMode>("list");
  const hasSearch = searchQuery.trim().length > 0;

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const [response, registryRows] = await Promise.all([
          listEvents(),
          listActiveEventRegistry().catch(() => []),
        ]);
        if (!cancelled) {
          setItems(mergeEventRegistryMetadata(response.events || [], registryRows));
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
  }, []);

  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return items;

    return items.filter((item) => {
      const haystack = [
        item.canonicalEventName,
        item.canonicalEventKey,
        item.location,
        item.date,
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
      <header className="min-h-[5.875rem] shrink-0 border-b border-zinc-300 pb-10">
        <div className="flex min-w-0 items-center gap-7 whitespace-nowrap overflow-hidden">
          <h1 className="shrink-0 text-3xl font-light leading-[1.12] tracking-[-0.025em] text-zinc-950 sm:text-4xl 2xl:text-5xl">
            Conferences
          </h1>

          <div className="ml-auto flex shrink-0 items-center gap-8">
            <div className="relative h-12 w-[18rem] shrink-0 rounded-full border border-zinc-200 bg-white sm:w-[20rem] xl:w-[22rem]">
              <div className="pointer-events-none absolute left-2 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-blue-500/20 bg-blue-600 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_10px_22px_-14px_rgba(37,99,235,0.95)]">
                <Search className="h-[1.05rem] w-[1.05rem]" strokeWidth={2.4} />
              </div>
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search conferences"
                className="relative z-10 h-full w-full bg-transparent pl-[3.65rem] pr-11 text-base font-medium text-zinc-950 outline-none placeholder:text-zinc-400"
              />
              {hasSearch ? (
                <button
                  type="button"
                  className="absolute right-3 top-1/2 z-10 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-950"
                  onClick={() => setSearchQuery("")}
                  aria-label="Clear search"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </div>

            <div
              className="inline-flex h-12 shrink-0 items-center rounded-full border border-zinc-200 bg-white p-1.5"
              aria-label="Conference view mode"
            >
              <button
                type="button"
                className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors ${
                  viewMode === "list"
                    ? "border border-blue-500/20 bg-blue-600 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_10px_22px_-14px_rgba(37,99,235,0.95)]"
                    : "text-zinc-400 hover:bg-zinc-100 hover:text-zinc-950"
                }`}
                onClick={() => setViewMode("list")}
                aria-label="List view"
                aria-pressed={viewMode === "list"}
                title="List view"
              >
                <List className="h-4 w-4" />
              </button>
              <button
                type="button"
                className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors ${
                  viewMode === "grid"
                    ? "border border-blue-500/20 bg-blue-600 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_10px_22px_-14px_rgba(37,99,235,0.95)]"
                    : "text-zinc-400 hover:bg-zinc-100 hover:text-zinc-950"
                }`}
                onClick={() => setViewMode("grid")}
                aria-label="Grid view"
                aria-pressed={viewMode === "grid"}
                title="Grid view"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
            </div>

            {loading ? (
              <HeaderMetricSkeleton />
            ) : (
              <div className="flex items-baseline gap-4">
                <p className="text-sm font-medium text-zinc-400">Leads To Cover</p>
                <p className="text-4xl font-light tabular-nums tracking-tight text-zinc-950">
                  {totalLeadCount.toLocaleString()}
                </p>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col pt-10">
        <main className="flex min-h-0 flex-col">
          {hasSearch ? (
            <div className="mb-6 flex shrink-0 items-center justify-between border-y border-zinc-100 py-4">
              <p className="text-base font-light text-zinc-500">
                Searching for <span className="font-medium text-zinc-950">{searchQuery.trim()}</span>
              </p>
              <button
                type="button"
                className="text-base font-medium text-zinc-400 transition-colors hover:text-zinc-950"
                onClick={() => setSearchQuery("")}
              >
                Clear
              </button>
            </div>
          ) : null}

          <div className="min-h-0 flex-1 overflow-y-auto scrollbar-modern">
            {loading ? (
              <EventRowsSkeleton viewMode={viewMode} />
            ) : filteredItems.length === 0 ? (
              <div className="py-12 text-sm text-zinc-500">
                {searchQuery.trim() ? "No conferences match this search." : "No conferences found."}
              </div>
            ) : viewMode === "list" ? (
              <div className="grid grid-cols-1 gap-5 pr-1">
                {filteredItems.map((item, index) => (
                  <motion.div
                    key={item.canonicalEventKey}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.02 }}
                    className="group overflow-hidden rounded-lg border border-zinc-200 bg-white/78 shadow-[0_18px_55px_-46px_rgba(15,23,42,0.72)] transition-all hover:border-blue-200 hover:bg-white hover:shadow-[0_24px_70px_-48px_rgba(37,99,235,0.42)]"
                  >
                    <Link
                      href={`/leads?event=${encodeURIComponent(item.canonicalEventKey)}`}
                      className="grid min-h-[11rem] h-full sm:h-[11rem] sm:min-h-0 sm:grid-cols-[10.25rem_minmax(0,1fr)] 2xl:h-[12rem] 2xl:grid-cols-[11rem_minmax(0,1fr)]"
                    >
                      <EventImagePanel item={item} />

                      <div className="grid min-w-0 gap-6 p-6 sm:grid-cols-[minmax(13rem,1fr)_minmax(12rem,16rem)_auto] sm:items-center 2xl:p-7">
                        <div className="min-w-0">
                          <h2 className="min-w-0 max-w-5xl text-[2rem] font-normal leading-[1.08] tracking-[-0.018em] text-zinc-950 transition-colors group-hover:text-blue-700 2xl:text-[2.65rem]">
                            {getDisplayEventName(item.canonicalEventName)}
                          </h2>
                          <EventMetaChips item={item} />
                        </div>

                        <div className="shrink-0 sm:justify-self-center">
                          <span className="text-sm font-medium text-zinc-400">To Cover</span>
                          <div className="mt-1 flex items-baseline gap-2">
                            <span className="text-3xl font-light tabular-nums tracking-tight text-zinc-900 2xl:text-4xl">
                              {Number(item.leadCount).toLocaleString()}
                            </span>
                            <span className="text-base font-light text-zinc-500">leads</span>
                          </div>
                        </div>

                        <div className="inline-flex h-11 shrink-0 items-center justify-center gap-3 rounded-full border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-500 transition-all group-hover:border-blue-600 group-hover:bg-blue-600 group-hover:text-white sm:justify-self-end 2xl:h-12">
                          Open leads
                          <ArrowRight className="h-4 w-4 2xl:h-5 2xl:w-5" />
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-5 pr-1 md:grid-cols-2 xl:grid-cols-3">
                {filteredItems.map((item, index) => (
                  <motion.div
                    key={item.canonicalEventKey}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.02 }}
                    className="group overflow-hidden rounded-lg border border-zinc-200 bg-white/78 shadow-[0_18px_55px_-46px_rgba(15,23,42,0.72)] transition-all hover:border-blue-200 hover:bg-white hover:shadow-[0_24px_70px_-48px_rgba(37,99,235,0.42)]"
                  >
                    <Link
                      href={`/leads?event=${encodeURIComponent(item.canonicalEventKey)}`}
                      className="flex h-full min-h-[15rem] flex-col p-5 2xl:p-6"
                    >
                      <div className="grid min-h-[8.25rem] grid-cols-[7.75rem_minmax(0,1fr)] gap-4 2xl:grid-cols-[8.5rem_minmax(0,1fr)]">
                        <EventImagePanel item={item} viewMode="grid" />

                        <div className="min-w-0 self-center">
                          <h2 className="text-[1.7rem] font-normal leading-[1.06] tracking-[-0.018em] text-zinc-950 transition-colors group-hover:text-blue-700 2xl:text-[1.95rem]">
                            {getDisplayEventName(item.canonicalEventName)}
                          </h2>
                          <EventMetaChips item={item} compact />
                        </div>
                      </div>

                      <div className="mt-auto flex items-end justify-between gap-4 pt-5">
                        <div>
                          <span className="text-sm font-medium text-zinc-400">To Cover</span>
                          <div className="mt-1 flex items-baseline gap-2">
                            <span className="text-2xl font-light tabular-nums tracking-tight text-zinc-900 2xl:text-3xl">
                              {Number(item.leadCount).toLocaleString()}
                            </span>
                            <span className="text-base font-light text-zinc-500">leads</span>
                          </div>
                        </div>

                        <div className="inline-flex h-11 shrink-0 items-center justify-center gap-3 rounded-full border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-500 transition-all group-hover:border-blue-600 group-hover:bg-blue-600 group-hover:text-white">
                          Open
                          <ArrowRight className="h-4 w-4" />
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
