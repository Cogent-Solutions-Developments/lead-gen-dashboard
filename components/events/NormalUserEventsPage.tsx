"use client";

import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { listEvents, type EventSummaryItem } from "@/lib/apiRouter";
import { getCachedAuthUserDisplayName, listActiveEventRegistry, type AdminEventItem } from "@/lib/auth";
import { useAuth } from "@/hooks/useAuth";
import { ProtectedImage } from "@/components/storage/ProtectedImage";
import { CanvasRevealEffect } from "@/components/ui/canvas-reveal-effect";
import { ConferenceGestureController } from "@/components/events/ConferenceGestureController";
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

function getDisplayName(user: ReturnType<typeof useAuth>["user"]) {
  const values = [user?.fullName, getCachedAuthUserDisplayName(user), user?.username]
    .map((value) => value?.trim())
    .filter(Boolean) as string[];
  const rolePlaceholders = new Set([
    "sales_user",
    "sales user",
    "delegate_user",
    "delegate user",
    "production_user",
    "production user",
    "super_admin_user",
    "super admin user",
  ]);

  return values.find((value) => !rolePlaceholders.has(value.toLowerCase())) || "there";
}

function getFirstName(value: string) {
  return value.split(/\s+/)[0] || value;
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
    <div className={`flex shrink-0 items-center justify-center overflow-hidden rounded-md text-sm font-semibold text-zinc-400 ${className}`}>
      <ProtectedImage
        src={logoUrl}
        directUrlPath={logoUrl ? `${logoUrl}/download-url` : undefined}
        alt=""
        className="h-full w-full object-contain"
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

function LuminousCardLightLayer() {
  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-md">
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,22,32,0.92)_0%,rgba(7,10,15,0.98)_54%,rgba(3,5,8,0.99)_100%)]" />
      <div className="absolute left-1/2 top-0 h-20 w-[36%] -translate-x-1/2 bg-[radial-gradient(ellipse_at_top,rgba(125,211,252,0.075),rgba(59,130,246,0.025)_40%,transparent_74%)] blur-2xl opacity-70" />
      <div className="absolute left-1/2 top-1/2 h-[72%] w-[58%] -translate-x-1/2 -translate-y-1/2 bg-[radial-gradient(ellipse_at_center,rgba(125,211,252,0.055),rgba(59,130,246,0.026)_38%,transparent_72%)] blur-2xl opacity-70" />
      <div className="absolute bottom-0 left-1/2 h-16 w-[46%] -translate-x-1/2 bg-[radial-gradient(ellipse_at_bottom,rgba(56,189,248,0.055),transparent_68%)] blur-2xl opacity-60" />
      <div className="absolute inset-y-0 left-0 w-24 bg-[radial-gradient(ellipse_at_left,rgba(125,211,252,0.04),transparent_70%)]" />
      <div className="absolute inset-y-0 right-0 w-24 bg-[radial-gradient(ellipse_at_right,rgba(125,211,252,0.04),transparent_70%)]" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[rgba(255,255,255,0.28)] to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-8 border-t border-[rgba(125,211,252,0.13)] bg-[linear-gradient(180deg,rgba(4,8,14,0.16),rgba(4,8,14,0.6)),linear-gradient(90deg,rgba(125,211,252,0.018)_0%,rgba(125,211,252,0.11)_50%,rgba(125,211,252,0.018)_100%),repeating-linear-gradient(135deg,rgba(125,211,252,0.16)_0_1px,transparent_1px_8px)] opacity-80 [mask-image:linear-gradient(90deg,transparent_0%,rgba(0,0,0,0.1)_16%,rgba(0,0,0,0.76)_48%,rgba(0,0,0,0.76)_56%,rgba(0,0,0,0.1)_86%,transparent_100%)]" />
      <div className="absolute bottom-8 left-0 right-0 h-8 bg-gradient-to-t from-[rgba(4,8,14,0.22)] to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[rgba(125,211,252,0.12)] to-transparent" />
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
  gestureHoverId,
  forceHovered = false,
}: {
  children: ReactNode;
  className?: string;
  delay: number;
  y?: number;
  variant: number;
  luminous?: boolean;
  gestureHoverId?: string;
  forceHovered?: boolean;
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
    ? "isolate rounded-md border border-[rgba(255,255,255,0.14)] bg-[#05080d] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),inset_0_-32px_42px_-36px_rgba(0,0,0,0.95),0_0_0_1px_rgba(125,211,252,0.05),0_16px_42px_-34px_rgba(0,0,0,0.95)] transition-[border-color,box-shadow,transform] duration-300 hover:-translate-y-px hover:border-[rgba(125,211,252,0.28)] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_0_0_1px_rgba(125,211,252,0.12),0_18px_44px_-34px_rgba(0,0,0,0.95)]"
    : "border border-[rgba(255,255,255,0.14)] bg-[#101113]/88 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_0_22px_-12px_rgba(125,211,252,0.46),0_18px_60px_-42px_rgba(0,0,0,0.9)] backdrop-blur-xl transition-colors duration-200 hover:border-[rgba(255,255,255,0.35)]";

  return (
    <motion.div
      initial={{ opacity: 0, y }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      data-gesture-hover-id={gestureHoverId}
      className={`group/canvas-card relative overflow-hidden ${surfaceClassName} ${className || ""}`}
    >
      {luminous ? (
        <>
          <LuminousCardLightLayer />
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
        {forceHovered && !hovered ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="pointer-events-none absolute inset-0 z-[1] bg-[radial-gradient(circle_at_20%_18%,rgba(125,211,252,0.2)_0_1px,transparent_1px),radial-gradient(circle_at_62%_34%,rgba(34,211,238,0.18)_0_1px,transparent_1px),radial-gradient(circle_at_82%_72%,rgba(255,255,255,0.2)_0_1px,transparent_1px)] bg-[length:10px_10px,14px_14px,18px_18px]"
          />
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {hovered ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="pointer-events-none absolute inset-0 z-[1]"
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
  const { user } = useAuth();
  const [items, setItems] = useState<EventSummaryItem[]>([]);
  const [eventRegistry, setEventRegistry] = useState<AdminEventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [gestureHoverKey, setGestureHoverKey] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
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
  const firstName = useMemo(() => getFirstName(getDisplayName(user)), [user]);

  return (
    <div className="relative flex h-[100dvh] min-h-0 flex-col overflow-hidden bg-transparent px-6 pb-28 pt-6 font-sans">
      <div className="pointer-events-none absolute bottom-0 left-0 z-40 hidden h-[66dvh] w-[36rem] overflow-visible xl:block 2xl:w-[40rem]">
        <motion.div
          className="absolute bottom-0 left-0 h-[70%] w-full rounded-full opacity-42 blur-[58px]"
          style={{
            background: "radial-gradient(ellipse at center, rgba(56,189,248,0.34) 0%, transparent 70%)",
          }}
          animate={{ opacity: [0.32, 0.46, 0.32], scale: [0.98, 1.04, 0.98] }}
          transition={{ duration: 6.8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute -top-16 right-8 z-[2] max-w-[22rem] rounded-lg border-[2.4px] border-[rgba(186,230,253,0.52)] bg-[rgba(3,7,12,0.22)] px-5 py-4 text-right shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_0_0_1px_rgba(186,230,253,0.16),0_0_18px_rgba(103,232,249,0.16),0_18px_44px_-28px_rgba(56,189,248,0.2)] backdrop-blur-[2px] 2xl:right-10 2xl:max-w-[24rem]"
          initial={{ opacity: 0, y: 14, filter: "blur(8px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ delay: 1.3, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <motion.div
            className="pointer-events-none absolute -inset-5 rounded-[1.4rem] bg-[radial-gradient(circle_at_48%_50%,rgba(103,232,249,0.18),rgba(56,189,248,0.08)_34%,transparent_72%)] blur-3xl"
            animate={{ opacity: [0.3, 0.58, 0.34], scale: [0.98, 1.03, 1] }}
            transition={{ duration: 4.6, repeat: Infinity, ease: "easeInOut" }}
            aria-hidden="true"
          />
          <motion.div
            className="pointer-events-none absolute inset-0 rounded-[inherit] bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.08),transparent_52%),radial-gradient(circle_at_50%_100%,rgba(103,232,249,0.05),transparent_58%)]"
            animate={{ opacity: [0.72, 0.92, 0.76] }}
            transition={{ duration: 4.2, repeat: Infinity, ease: "easeInOut" }}
            aria-hidden="true"
          />
          <motion.svg
            className="absolute right-[-3.8rem] top-[-0.5rem] h-[18rem] w-[12rem] overflow-visible text-cyan-100 [filter:drop-shadow(0_0_8px_rgba(103,232,249,0.8))] 2xl:right-[-3.5rem]"
            viewBox="0 0 220 210"
            fill="none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.76, duration: 0.35 }}
            aria-hidden="true"
          >
            <motion.path
              d="M 151 12 H 211 V 240 H 10"              
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ delay: 1.76, duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
            />
            <motion.circle
              cx="12"
              cy="240"
              r="7.5"
              fill="currentColor"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 2.34, duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            />
          </motion.svg>

          <p className="relative z-[2] text-[1.3rem] font-medium leading-[1.14] tracking-[-0.028em] text-zinc-950 2xl:text-[1.5rem]">
            Hey {firstName}. I’m supernizo agent, ready to help you cover every lead. Lets get started!</p>
        </motion.div>
        <motion.img
          src="/videos/BlockchainEventPromoconverted_1-ezgif.com-optimize%20(1).gif"
          alt=""
          className="absolute bottom-0 left-0 h-full w-full origin-bottom-left object-cover object-bottom opacity-70 mix-blend-screen"
          initial={{ opacity: 0, x: -28 }}
          animate={{ opacity: 0.7, x: 0 }}
          transition={{ duration: 1.15, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>

      <header className="relative z-10 shrink-0 border-b border-zinc-300 pb-12">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div>
              <h1 className="text-3xl font-light leading-[1.12] tracking-[-0.025em] text-zinc-950 sm:text-4xl 2xl:text-5xl">
                Conferences
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
              <div className="flex items-center gap-2">
                <ConferenceGestureController
                  scrollContainerRef={scrollContainerRef}
                  viewMode={viewMode}
                  onViewModeChange={setViewMode}
                  onHoverTargetChange={setGestureHoverKey}
                />
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
        </div>
      </header>

      <div className="relative z-10 flex min-h-0 flex-1 flex-col pt-8 xl:pl-[39rem] 2xl:pl-[43rem]">
        <main className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
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

          <div ref={scrollContainerRef} className="scrollbar-conferences min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
            {loading ? (
              <EventRowsSkeleton />
            ) : filteredItems.length === 0 ? (
              <div className="py-12 text-sm text-zinc-500">
                {searchQuery.trim() ? "No events match this search." : "No events found."}
              </div>
            ) : viewMode === "list" ? (
              <div className="ml-auto grid max-w-full grid-cols-1 gap-3 pb-36 pt-3 xl:max-w-[68rem] 2xl:max-w-[74rem]">
                {filteredItems.map((item, index) => {
                  const registryItem = getRegistryItem(item);
                  const displayTitle = getEventDisplayTitle(item, registryItem);
                  return (
                    <EventCanvasCard
                      key={item.canonicalEventKey}
                      delay={index * 0.02}
                      variant={index}
                      className="min-h-[11.2rem]"
                      luminous
                      gestureHoverId={item.canonicalEventKey}
                      forceHovered={gestureHoverKey === item.canonicalEventKey}
                    >
                      <Link
                        href={`/leads?event=${encodeURIComponent(item.canonicalEventKey)}`}
                        className="flex h-full items-stretch justify-between gap-6 p-5 outline-none 2xl:gap-8 2xl:p-6"
                      >
                        <div className="flex min-w-0 flex-1 flex-col justify-between">
                          <div className="min-w-0 space-y-4">
                            <h2 className="line-clamp-2 text-[1.42rem] font-light leading-[1.12] tracking-[-0.015em] !text-[rgb(255,255,255)] [text-shadow:0_1px_20px_rgba(255,255,255,0.28),0_8px_24px_rgba(0,0,0,0.65)] 2xl:text-[1.58rem]">
                              {displayTitle}
                            </h2>

                            <div className="flex items-baseline gap-3">
                              <span className="text-2xl font-light tabular-nums tracking-tight !text-[rgb(255,255,255)] [text-shadow:0_1px_18px_rgba(255,255,255,0.22),0_8px_24px_rgba(0,0,0,0.62)] 2xl:text-3xl">
                                {Number(item.leadCount).toLocaleString()}
                              </span>
                              <span className="text-sm font-medium tracking-[0.02em] !text-[rgba(255,255,255,0.72)]">Leads To Cover</span>
                            </div>
                          </div>

                          <div className="relative flex h-10 w-10 items-center justify-center rounded-md border border-[rgba(125,211,252,0.28)] bg-[linear-gradient(180deg,rgba(10,16,26,0.96),rgba(5,9,15,0.96))] text-[rgb(255,255,255)] shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_0_0_1px_rgba(34,211,238,0.08),0_0_22px_-14px_rgba(34,211,238,0.55)] transition-[border-color,box-shadow,transform] group-hover/canvas-card:border-[rgba(103,232,249,0.52)] group-hover/canvas-card:shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_0_0_1px_rgba(34,211,238,0.18),0_0_26px_-10px_rgba(34,211,238,0.72)] 2xl:h-11 2xl:w-11">
                            <div className="pointer-events-none absolute inset-x-1.5 top-0 h-px bg-gradient-to-r from-transparent via-[rgba(103,232,249,0.72)] to-transparent" />
                            <ArrowLeft className="h-[0.95rem] w-[0.95rem] rotate-180 2xl:h-[1.05rem] 2xl:w-[1.05rem]" />
                          </div>
                        </div>

                        <div className="flex shrink-0 items-center">
                          <EventLogoMark item={item} registryItem={registryItem} className="h-[8rem] w-[8rem] 2xl:h-[8.5rem] 2xl:w-[8.5rem]" />
                        </div>
                      </Link>
                    </EventCanvasCard>
                  );
                })}
              </div>
            ) : (
              <div className="ml-auto grid max-w-full grid-cols-1 gap-4 pb-36 pt-3 sm:grid-cols-2 xl:max-w-[72rem] xl:grid-cols-2 2xl:max-w-[78rem] 2xl:grid-cols-3">
                {filteredItems.map((item, index) => {
                  const registryItem = getRegistryItem(item);
                  const displayTitle = getEventDisplayTitle(item, registryItem);
                  return (
                    <EventCanvasCard
                      key={item.canonicalEventKey}
                      delay={index * 0.02}
                      y={8}
                      variant={index}
                      className="min-h-[12rem]"
                      luminous
                      gestureHoverId={item.canonicalEventKey}
                      forceHovered={gestureHoverKey === item.canonicalEventKey}
                    >
                      <Link
                        href={`/leads?event=${encodeURIComponent(item.canonicalEventKey)}`}
                        className="flex h-full min-h-[12rem] flex-col justify-between p-5"
                      >
                        <div className="space-y-4">
                          <div className="flex items-start gap-4">
                            <EventLogoMark
                              item={item}
                              registryItem={registryItem}
                              className="h-[4.5rem] w-[4.5rem]"
                            />
                            <h2 className="line-clamp-3 pt-1 text-lg font-light leading-[1.15] tracking-[-0.015em] !text-[rgb(255,255,255)] [text-shadow:0_1px_18px_rgba(255,255,255,0.24),0_8px_24px_rgba(0,0,0,0.62)]">
                              {displayTitle}
                            </h2>
                          </div>
                        </div>

                        <div className="mt-5 flex items-end justify-between">
                          <div className="space-y-1">
                            <span className="text-sm font-medium tracking-[0.02em] !text-[rgba(255,255,255,0.72)]">Leads To Cover</span>
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
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-24 bg-gradient-to-t from-[#03070b] via-[#03070b]/86 to-transparent" />
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
