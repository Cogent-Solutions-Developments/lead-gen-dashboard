"use client";

import { type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { listEvents, type EventSummaryItem } from "@/lib/apiRouter";
import { listActiveEventRegistry, type AdminEventItem } from "@/lib/auth";
import { ProtectedImage } from "@/components/storage/ProtectedImage";
import { CanvasRevealEffect } from "@/components/ui/canvas-reveal-effect";
import {
  ArrowLeft,
  LayoutGrid,
  List,
  Search,
  X,
} from "lucide-react";
import { toast } from "sonner";

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong.";
}

function normalizeDateLabel(value?: string | null) {
  const input = String(value || "").trim();
  if (!input) return "Date TBD";
  const dateOnly = input.split("T")[0];
  const match = dateOnly.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) return `${match[1]}.${match[2]}.${match[3]}`;
  return input.replaceAll("-", ".");
}

function shortenEventName(value: string) {
  const words = value
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (words.length <= 4) return value.trim() || "Untitled Event";
  return `${words.slice(0, 4).join(" ")}...`;
}

function getEventDisplayTitle(item: EventSummaryItem, registryItem?: AdminEventItem) {
  const anyItem = item as EventSummaryItem & {
    eventDate?: string | null;
    date?: string | null;
    startDate?: string | null;
    location?: string | null;
    city?: string | null;
    venue?: string | null;
  };

  const rawName = String(item.canonicalEventName || "").trim();
  const segments = rawName.split(/\s+(?:-|[|•·])\s+/).filter(Boolean);
  const baseName = segments[0] || rawName || "Untitled Event";
  const shortName = shortenEventName(baseName);
  const dateLabel = normalizeDateLabel(
    registryItem?.date || anyItem.eventDate || anyItem.date || anyItem.startDate
  );
  const locationLabel =
    String(registryItem?.location || anyItem.location || anyItem.city || anyItem.venue || "").trim() ||
    "Location TBD";
  return `${shortName} - ${dateLabel} - ${locationLabel}`;
}

function HeaderMetricSkeleton() {
  return (
    <div className="space-y-2">
      <div className="h-3 w-32 animate-pulse bg-zinc-100" />
      <div className="h-10 w-20 animate-pulse bg-zinc-100" />
    </div>
  );
}

function EventRowsSkeleton() {
  return (
    <div className="grid grid-cols-1">
      {[0, 1, 2].map((index) => (
        <div
          key={index}
          className="animate-pulse border-b border-zinc-300 p-7 2xl:p-8"
        >
          <div className="flex flex-col justify-between gap-8 2xl:gap-10">
            <div className="space-y-4">
              <div className="h-8 w-full max-w-4xl bg-zinc-100" />
              <div className="h-8 w-3/5 bg-zinc-100" />
            </div>

            <div className="flex items-end justify-between">
              <div className="space-y-2">
                <div className="h-3 w-24 bg-zinc-100" />
                <div className="flex items-baseline gap-2">
                  <div className="h-9 w-28 bg-zinc-100" />
                  <div className="h-4 w-10 bg-zinc-100" />
                </div>
              </div>

              <div className="h-11 w-11 border border-zinc-200 bg-zinc-100 2xl:h-12 2xl:w-12" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function EventLogoMark({
  item,
  registryItem,
  className = "h-16 w-16",
}: {
  item: EventSummaryItem;
  registryItem?: AdminEventItem;
  className?: string;
}) {
  const logoUrl = item.logoUrl || registryItem?.logoUrl || "";

  return (
    <div className={`flex shrink-0 items-center justify-center overflow-hidden border border-[rgba(255,255,255,0.2)] bg-[rgba(255,255,255,0.95)] text-sm font-semibold text-zinc-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.55),0_18px_34px_-26px_rgba(0,0,0,0.9)] ${className}`}>
      <ProtectedImage
        src={logoUrl}
        directUrlPath={logoUrl ? `${logoUrl}/download-url` : undefined}
        alt=""
        className="h-full w-full object-cover"
        fallback={item.canonicalEventName.slice(0, 2).toUpperCase()}
      />
    </div>
  );
}

function CardCorner({ className = "" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth="1.5"
      stroke="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m6-6H6" />
    </svg>
  );
}

function LuminousCardFrame() {
  const cornerBase = "absolute h-10 w-10 border-[rgba(255,255,255,0.16)]";

  return (
    <>
      <div className={`${cornerBase} left-3 top-3 rounded-tl-[1.05rem] border-l border-t`} />
      <div className={`${cornerBase} right-3 top-3 rounded-tr-[1.05rem] border-r border-t`} />
      <div className={`${cornerBase} bottom-3 left-3 rounded-bl-[1.05rem] border-b border-l`} />
      <div className={`${cornerBase} bottom-3 right-3 rounded-br-[1.05rem] border-b border-r`} />
    </>
  );
}

function LuminousCardLightLayer() {
  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-[1.4rem]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(125,211,252,0.16)_0%,rgba(59,130,246,0.055)_23%,transparent_56%),radial-gradient(circle_at_50%_105%,rgba(0,0,0,0.42)_0%,transparent_50%)]" />
      <div className="absolute left-1/2 top-[42%] h-20 w-[48%] -translate-x-1/2 -translate-y-10 rounded-[100%] bg-[radial-gradient(ellipse_at_top,rgba(125,211,252,0.13),rgba(59,130,246,0.045)_34%,transparent_72%)] blur-xl opacity-60" />
      <div className="absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-[rgba(255,255,255,0.38)] to-transparent" />
      <div className="absolute inset-x-6 bottom-0 h-px bg-gradient-to-r from-transparent via-[rgba(255,255,255,0.12)] to-transparent" />
    </div>
  );
}

function EventCanvasCard({
  children,
  className,
  delay,
  y = 0,
  variant,
  luminous = false,
}: {
  children: ReactNode;
  className?: string;
  delay: number;
  y?: number;
  variant: number;
  luminous?: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const revealOptions = [
    {
      containerClassName: "bg-transparent",
      colors: [
        [14, 165, 233],
        [34, 211, 238],
        [255, 255, 255],
      ],
      dotSize: 2,
    },
    {
      containerClassName: "bg-transparent",
      colors: [
        [16, 185, 129],
        [250, 204, 21],
        [255, 255, 255],
      ],
      dotSize: 2,
    },
    {
      containerClassName: "bg-transparent",
      colors: [
        [236, 72, 153],
        [251, 146, 60],
        [255, 255, 255],
      ],
      dotSize: 2,
    },
    {
      containerClassName: "bg-transparent",
      colors: [
        [129, 140, 248],
        [45, 212, 191],
        [255, 255, 255],
      ],
      dotSize: 2,
    },
  ];
  const reveal = revealOptions[variant % revealOptions.length];
  const surfaceClassName = luminous
    ? "isolate rounded-[1.4rem] border border-[rgba(255,255,255,0.16)] bg-[radial-gradient(circle_at_50%_0%,#2a2b2d_0%,#151619_48%,#06070a_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.14),inset_0_-4rem_3rem_-3.2rem_rgba(0,0,0,0.72),0_0_0_1px_rgba(255,255,255,0.07),0_0_34px_-18px_rgba(255,255,255,0.42),0_22px_52px_-34px_rgba(0,0,0,0.95)] backdrop-blur-xl transition-[border-color,box-shadow,transform] duration-300 hover:-translate-y-0.5 hover:border-[rgba(255,255,255,0.26)]"
    : "border border-[rgba(255,255,255,0.14)] bg-[#101113]/88 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_0_22px_-12px_rgba(125,211,252,0.46),0_18px_60px_-42px_rgba(0,0,0,0.9)] backdrop-blur-xl transition-colors duration-200 hover:border-[rgba(255,255,255,0.35)]";

  return (
    <motion.div
      initial={{ opacity: 0, y }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`group/canvas-card relative overflow-hidden ${surfaceClassName} ${className || ""}`}
    >
      {luminous ? (
        <>
          <LuminousCardLightLayer />
          <div className="pointer-events-none absolute inset-0 z-[2] rounded-[1.4rem]">
            <LuminousCardFrame />
          </div>
        </>
      ) : (
        <>
          <CardCorner className="absolute -left-3 -top-3 z-20 h-6 w-6 text-[rgba(255,255,255,0.35)]" />
          <CardCorner className="absolute -bottom-3 -left-3 z-20 h-6 w-6 text-[rgba(255,255,255,0.35)]" />
          <CardCorner className="absolute -right-3 -top-3 z-20 h-6 w-6 text-[rgba(255,255,255,0.35)]" />
          <CardCorner className="absolute -bottom-3 -right-3 z-20 h-6 w-6 text-[rgba(255,255,255,0.35)]" />
        </>
      )}

      <AnimatePresence>
        {hovered ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 z-[1]"
          >
            <CanvasRevealEffect
              animationSpeed={3.2}
              containerClassName={reveal.containerClassName}
              colors={reveal.colors}
              dotSize={reveal.dotSize}
              opacities={luminous ? [0.14, 0.17, 0.2, 0.24, 0.28, 0.32, 0.38, 0.44, 0.5, 0.58] : [0.12, 0.15, 0.18, 0.22, 0.26, 0.3, 0.34, 0.38, 0.42, 0.48]}
              showGradient={false}
            />
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div className="relative z-[20] h-full">{children}</div>
    </motion.div>
  );
}

export function NormalUserEventsPage() {
  const [items, setItems] = useState<EventSummaryItem[]>([]);
  const [eventRegistry, setEventRegistry] = useState<AdminEventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const hasSearch = searchQuery.trim().length > 0;

  const registryByEvent = useMemo(() => {
    const byId = new Map<string, AdminEventItem>();
    const byKey = new Map<string, AdminEventItem>();

    for (const item of eventRegistry) {
      if (item.id) byId.set(item.id, item);
      if (item.eventKey) byKey.set(item.eventKey, item);
    }

    return { byId, byKey };
  }, [eventRegistry]);

  const getRegistryItem = useCallback(
    (item: EventSummaryItem) =>
      (item.eventRegistryId ? registryByEvent.byId.get(item.eventRegistryId) : undefined) ||
      registryByEvent.byKey.get(item.canonicalEventKey),
    [registryByEvent]
  );

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const [response, registry] = await Promise.all([
          listEvents(),
          listActiveEventRegistry().catch(() => []),
        ]);
        if (!cancelled) {
          setItems(response.events || []);
          setEventRegistry(registry);
        }
      } catch (error: unknown) {
        if (!cancelled) {
          toast.error("Failed to load events", {
            description: getErrorMessage(error),
          });
          setItems([]);
          setEventRegistry([]);
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
      const registryItem = getRegistryItem(item);
      const haystack = [
        item.canonicalEventName,
        item.canonicalEventKey,
        registryItem?.date,
        registryItem?.location,
        ...(item.relatedCampaignNames || []),
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [getRegistryItem, items, searchQuery]);

  const totalLeadCount = useMemo(
    () => items.reduce((sum, item) => sum + Number(item.leadCount || 0), 0),
    [items]
  );

  return (
    <div className="flex h-[calc(100dvh-3rem)] min-h-0 flex-col overflow-hidden bg-transparent p-1 font-sans">
      <header className="shrink-0 border-b border-zinc-300 pb-12">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div>
              <h1 className="text-3xl font-light leading-[1.12] tracking-[-0.025em] text-zinc-950 sm:text-4xl 2xl:text-5xl">
                Events
              </h1>
            </div>
          </div>

          <div className="border-zinc-300 lg:min-w-[23rem] lg:border-l lg:pl-10">
            <div className="flex items-end justify-between gap-6">
              {loading ? (
                <HeaderMetricSkeleton />
              ) : (
                <div className="space-y-1">
                  <p className="text-sm font-medium text-zinc-400">Leads To Cover</p>
                  <p className="text-4xl font-light tabular-nums tracking-tight text-zinc-950">
                    {totalLeadCount.toLocaleString()}
                  </p>
                </div>
              )}
              <div className="inline-flex h-11 items-center rounded-2xl border border-zinc-300 bg-zinc-900/95 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_4px_14px_rgba(0,0,0,0.18)]">
                <button
                  type="button"
                  aria-label="Grid view"
                  aria-pressed={viewMode === "grid"}
                  onClick={() => setViewMode("grid")}
                  className={`inline-flex h-9 w-11 items-center justify-center rounded-xl transition ${
                    viewMode === "grid"
                      ? "bg-blue-600 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.24)]"
                      : "text-zinc-400 hover:text-zinc-100"
                  }`}
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  aria-label="List view"
                  aria-pressed={viewMode === "list"}
                  onClick={() => setViewMode("list")}
                  className={`inline-flex h-9 w-11 items-center justify-center rounded-xl transition ${
                    viewMode === "list"
                      ? "bg-blue-600 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.24)]"
                      : "text-zinc-400 hover:text-zinc-100"
                  }`}
                >
                  <List className="h-4 w-4" />
                </button>
              </div>
            </div>
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
              <EventRowsSkeleton />
            ) : filteredItems.length === 0 ? (
              <div className="py-12 text-sm text-zinc-500">
                {searchQuery.trim() ? "No events match this search." : "No events found."}
              </div>
            ) : viewMode === "list" ? (
              <div className="grid grid-cols-1 gap-3 pt-4">
                {filteredItems.map((item, index) => {
                  const registryItem = getRegistryItem(item);
                  const displayTitle = getEventDisplayTitle(item, registryItem);
                  return (
                    <EventCanvasCard
                      key={item.canonicalEventKey}
                      delay={index * 0.02}
                      variant={index}
                      className="min-h-[14rem]"
                      luminous
                    >
                      <Link
                        href={`/leads?event=${encodeURIComponent(item.canonicalEventKey)}`}
                        className="flex h-full flex-col p-7 outline-none 2xl:p-8"
                      >
                        <div className="flex flex-1 flex-col justify-between gap-9 2xl:gap-11">
                          <div className="flex items-start gap-6">
                            <EventLogoMark item={item} registryItem={registryItem} className="h-20 w-20" />
                            <div className="min-w-0 pt-1.5">
                              <h2 className="text-[1.7rem] font-light leading-[1.12] tracking-[-0.015em] !text-[rgb(255,255,255)] [text-shadow:0_1px_20px_rgba(255,255,255,0.28),0_8px_24px_rgba(0,0,0,0.65)] 2xl:text-[2rem]">
                                {displayTitle}
                              </h2>
                            </div>
                          </div>

                          <div className="flex items-end justify-between">
                            <div className="space-y-1.5">
                              <span className="text-xs font-medium uppercase tracking-[0.14em] !text-[rgba(255,255,255,0.72)]">Total prospects</span>
                              <div className="flex items-baseline gap-2">
                                <span className="text-4xl font-light tabular-nums tracking-tight !text-[rgb(255,255,255)] [text-shadow:0_1px_18px_rgba(255,255,255,0.22),0_8px_24px_rgba(0,0,0,0.62)] 2xl:text-5xl">
                                  {Number(item.leadCount).toLocaleString()}
                                </span>
                                <span className="text-sm font-normal !text-[rgba(255,255,255,0.76)]">leads</span>
                              </div>
                            </div>

                            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[rgba(255,255,255,0.28)] bg-[rgba(255,255,255,0.08)] text-[rgb(255,255,255)] shadow-[inset_0_1px_0_rgba(255,255,255,0.2),inset_0_-10px_18px_rgba(0,0,0,0.22),0_0_24px_-12px_rgba(255,255,255,0.7)] backdrop-blur-md transition-colors group-hover/canvas-card:border-[rgba(255,255,255,0.4)] group-hover/canvas-card:bg-[rgba(255,255,255,0.12)] 2xl:h-[3.25rem] 2xl:w-[3.25rem]">
                              <ArrowLeft className="h-4 w-4 rotate-180 2xl:h-5 2xl:w-5" />
                            </div>
                          </div>
                        </div>
                      </Link>
                    </EventCanvasCard>
                  );
                })}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-5 pt-4 sm:grid-cols-2 xl:grid-cols-3">
                {filteredItems.map((item, index) => {
                  const registryItem = getRegistryItem(item);
                  const displayTitle = getEventDisplayTitle(item, registryItem);
                  return (
                    <EventCanvasCard
                      key={item.canonicalEventKey}
                      delay={index * 0.02}
                      y={8}
                      variant={index}
                      className="min-h-[15rem]"
                      luminous
                    >
                      <Link
                        href={`/leads?event=${encodeURIComponent(item.canonicalEventKey)}`}
                        className="flex h-full min-h-[15rem] flex-col justify-between p-6"
                      >
                        <div className="space-y-4">
                          <div className="flex items-start gap-4">
                            <EventLogoMark item={item} registryItem={registryItem} />
                            <h2 className="line-clamp-3 pt-1 text-xl font-light leading-[1.15] tracking-[-0.015em] !text-[rgb(255,255,255)] [text-shadow:0_1px_18px_rgba(255,255,255,0.24),0_8px_24px_rgba(0,0,0,0.62)]">
                              {displayTitle}
                            </h2>
                          </div>
                        </div>

                        <div className="mt-5 flex items-end justify-between">
                          <div className="space-y-1">
                            <span className="text-[11px] font-medium uppercase tracking-[0.14em] !text-[rgba(255,255,255,0.72)]">Total prospects</span>
                            <div className="flex items-baseline gap-2">
                              <span className="text-3xl font-light tabular-nums tracking-tight !text-[rgb(255,255,255)] [text-shadow:0_1px_18px_rgba(255,255,255,0.22),0_8px_24px_rgba(0,0,0,0.62)]">
                                {Number(item.leadCount).toLocaleString()}
                              </span>
                              <span className="text-sm font-normal !text-[rgba(255,255,255,0.76)]">leads</span>
                            </div>
                          </div>
                          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[rgba(255,255,255,0.28)] bg-[rgba(255,255,255,0.08)] !text-[rgb(255,255,255)] shadow-[inset_0_1px_0_rgba(255,255,255,0.2),inset_0_-10px_18px_rgba(0,0,0,0.22),0_0_24px_-12px_rgba(255,255,255,0.7)] backdrop-blur-md transition-colors group-hover/canvas-card:border-[rgba(255,255,255,0.4)] group-hover/canvas-card:bg-[rgba(255,255,255,0.12)]">
                            <ArrowLeft className="h-4 w-4 rotate-180" />
                          </div>
                        </div>
                      </Link>
                    </EventCanvasCard>
                  );
                })}
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

          <div className="relative z-[1] w-full max-w-2xl overflow-hidden rounded-full border border-zinc-300 bg-white/48 shadow-[inset_0_1px_0_rgba(255,255,255,0.95),inset_0_-1px_0_rgba(255,255,255,0.35),0_34px_100px_-48px_rgba(2,10,27,0.85),0_10px_32px_-24px_rgba(2,10,27,0.5)] ring-1 ring-white/45 backdrop-blur-[34px]">
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.88)_0%,rgba(255,255,255,0.34)_38%,rgba(255,255,255,0.18)_100%)]" />
            <div className="pointer-events-none absolute -left-20 -top-24 h-56 w-56 rounded-full bg-white/65 blur-3xl" />
            <div className="pointer-events-none absolute -right-24 bottom-0 h-56 w-56 rounded-full bg-blue-200/22 blur-3xl" />

            <div className="relative flex items-center gap-6 px-6 py-4">
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
                className="h-12 min-w-0 flex-1 bg-transparent text-3xl font-light tracking-[-0.03em] text-zinc-950 placeholder:text-zinc-400/86 focus:outline-none"
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
