"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Brain,
  CalendarDays,
  ChevronRight,
  Loader2,
  Rocket,
  TrainFront,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { usePersona } from "@/hooks/usePersona";
import { getCachedAuthUserDisplayName } from "@/lib/auth";
import { listEventLeads, listEvents, type EventSummaryItem } from "@/lib/apiRouter";

const STATUS_ORDER = [
  { key: "new", label: "New", dot: "bg-[#0aefff] shadow-[0_0_0_3px_rgba(10,239,255,0.20)]", bar: "bg-[#0aefff]" },
  { key: "contacted", label: "Contacted", dot: "bg-[#be0aff] shadow-[0_0_0_3px_rgba(190,10,255,0.18)]", bar: "bg-[#be0aff]" },
  { key: "first-call", label: "First Call", dot: "bg-[#147df5] shadow-[0_0_0_3px_rgba(20,125,245,0.20)]", bar: "bg-[#147df5]" },
  { key: "follow-up", label: "Follow Up", dot: "bg-[#ff8700] shadow-[0_0_0_3px_rgba(255,135,0,0.20)]", bar: "bg-[#ff8700]" },
  { key: "qualified", label: "Qualified", dot: "bg-[#0aff99] shadow-[0_0_0_3px_rgba(10,255,153,0.20)]", bar: "bg-[#0aff99]" },
  { key: "not-interested", label: "Not Interested", dot: "bg-[#ff0000] shadow-[0_0_0_3px_rgba(255,0,0,0.16)]", bar: "bg-[#ff0000]" },
];

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

function firstName(value: string) {
  return value.split(/\s+/)[0] || value;
}

function getDateLabel() {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  }).format(new Date());
}

function eventHref(event: EventSummaryItem) {
  return `/leads?event=${encodeURIComponent(event.canonicalEventKey)}`;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Could not load dashboard data.";
}

export default function DashboardPage() {
  const { persona } = usePersona();
  const { isSuperAdmin, user } = useAuth();
  const [events, setEvents] = useState<EventSummaryItem[]>([]);
  const [selectedEventKey, setSelectedEventKey] = useState("");
  const [statusCounts, setStatusCounts] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const displayName = firstName(getDisplayName(user));

  useEffect(() => {
    let alive = true;

    async function loadDashboard() {
      setLoading(true);
      try {
        const eventResponse = await listEvents();

        if (!alive) return;
        setEvents(eventResponse.events || []);
      } catch (error) {
        if (!alive) return;
        toast.error("Dashboard sync failed", { description: getErrorMessage(error) });
        setEvents([]);
      } finally {
        if (alive) setLoading(false);
      }
    }

    void loadDashboard();
    return () => {
      alive = false;
    };
  }, [persona]);

  const totalProspects = useMemo(
    () => events.reduce((sum, event) => sum + Number(event.leadCount || 0), 0),
    [events]
  );
  const priorityEvents = useMemo(
    () => [...events].sort((a, b) => Number(b.leadCount || 0) - Number(a.leadCount || 0)).slice(0, 4),
    [events]
  );
  const topReach = Number(priorityEvents[0]?.leadCount || 1);
  const selectedEvent = useMemo(
    () => priorityEvents.find((event) => event.canonicalEventKey === selectedEventKey) || priorityEvents[0],
    [priorityEvents, selectedEventKey]
  );
  const leadSheetEvent = selectedEvent?.canonicalEventKey || priorityEvents[0]?.canonicalEventKey || "";
  const statusTotal = Number(selectedEvent?.leadCount || 0);
  const visibleStatuses = useMemo(
    () => STATUS_ORDER.filter((status) => (statusCounts.get(status.key) || 0) > 0),
    [statusCounts]
  );

  useEffect(() => {
    if (!priorityEvents.length) {
      setSelectedEventKey("");
      return;
    }

    if (!selectedEventKey || !priorityEvents.some((event) => event.canonicalEventKey === selectedEventKey)) {
      setSelectedEventKey(priorityEvents[0].canonicalEventKey);
    }
  }, [priorityEvents, selectedEventKey]);

  useEffect(() => {
    if (!selectedEvent?.canonicalEventKey) {
      setStatusCounts(new Map());
      return;
    }

    let alive = true;

    async function loadStatusCounts() {
      setLoadingStatus(true);
      try {
        const results = await Promise.all(
          STATUS_ORDER.map(async (status) => {
            const response = await listEventLeads(selectedEvent.canonicalEventKey, {
              limit: 1,
              offset: 0,
              workflowStatus: status.key,
              includeManual: true,
            });
            return [status.key, Number(response.total || 0)] as const;
          })
        );

        if (!alive) return;
        setStatusCounts(new Map(results));
      } catch (error) {
        if (!alive) return;
        toast.error("Status sync failed", { description: getErrorMessage(error) });
        setStatusCounts(new Map());
      } finally {
        if (alive) setLoadingStatus(false);
      }
    }

    void loadStatusCounts();
    return () => {
      alive = false;
    };
  }, [selectedEvent]);

  const quickActions = [
    {
      title: "Open events",
      href: "/campaigns",
      icon: Rocket,
    },
    {
      title: "Upload leads",
      href: "/campaigns/upload",
      icon: Upload,
    },
    {
      title: "Lead sheet",
      href: leadSheetEvent ? `/leads?event=${encodeURIComponent(leadSheetEvent)}` : "/leads",
      icon: TrainFront,
    },
    {
      title: "NizoAI",
      href: "/nizo-ai",
      icon: Brain,
    },
  ];

  return (
    <div className="scrollbar-hide flex h-[calc(100dvh-3rem)] min-h-0 flex-col overflow-y-auto bg-[#f7f7f7] p-1 font-sans text-zinc-950">
      <header className="shrink-0 border-b border-zinc-200 pb-10">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-center gap-3 text-xs font-medium text-zinc-400">
              <CalendarDays className="h-3.5 w-3.5" />
              <span>{getDateLabel()}</span>
              <span className="h-4 w-px bg-zinc-200" />
              <span>Sales Workspace</span>
            </div>
            <h1 className="mt-8 max-w-4xl text-3xl font-light leading-[1.1] tracking-[-0.035em] text-zinc-950 sm:text-4xl 2xl:text-5xl">
              Good to see you, {displayName}. Here is where sales work starts.
            </h1>
            <p className="mt-4 max-w-2xl text-lg font-light leading-relaxed text-zinc-500">
              Choose an event, inspect fresh prospects, run NizoAI, or move directly into the lead sheet.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="grid min-w-[18rem] grid-cols-2 gap-8 border-zinc-200 lg:border-l lg:pl-10"
          >
            <div>
              <p className="text-xs font-medium text-zinc-400">Events</p>
              <p className="mt-1 text-3xl font-light tabular-nums tracking-tight">{events.length}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-zinc-400">Prospects</p>
              <p className="mt-1 text-3xl font-light tabular-nums tracking-tight">{totalProspects.toLocaleString()}</p>
            </div>
          </motion.div>
        </div>
      </header>

      <main className="scrollbar-hide min-h-0 flex-1 overflow-y-auto pb-16 pt-7">
        <section className="grid overflow-hidden border-y border-zinc-200 lg:grid-cols-4">
          {quickActions.map((action, index) => (
            <motion.div
              key={action.title}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04 }}
            >
              <Link
                href={action.href}
                className="group grid min-h-32 grid-rows-[2.25rem_1fr] border-b border-zinc-200 bg-[#f7f7f7] p-6 transition-colors hover:bg-zinc-100/55 lg:border-b-0 lg:border-r last:lg:border-r-0"
              >
                <div className="flex items-center justify-between">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full border border-zinc-200 bg-[#f7f7f7] text-zinc-500 transition-all group-hover:border-blue-600 group-hover:bg-blue-600 group-hover:text-white">
                    <action.icon className="h-4 w-4" />
                  </span>
                  <ChevronRight className="h-4 w-4 text-zinc-300 transition-transform group-hover:translate-x-1 group-hover:text-zinc-950" />
                </div>
                <div className="self-end">
                  <h2 className="text-xl font-light tracking-[-0.035em] text-zinc-950">{action.title}</h2>
                </div>
              </Link>
            </motion.div>
          ))}
        </section>

        <section className="mt-12 grid min-h-0 gap-14 xl:grid-cols-[minmax(0,1.15fr)_minmax(22rem,0.85fr)]">
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <div className="mb-7 flex items-end justify-between gap-6">
              <div>
                <p className="text-sm font-medium text-zinc-400">Today&apos;s focus</p>
                <h2 className="mt-2 text-3xl font-light tracking-[-0.04em] text-zinc-950">Primary event room</h2>
              </div>
              <Link
                href="/campaigns"
                className="hidden items-center gap-2 text-sm font-medium text-zinc-500 transition-colors hover:text-zinc-950 sm:inline-flex"
              >
                View events
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="border-y border-zinc-200">
              {loading ? (
                <div className="flex items-center gap-3 py-16 text-zinc-400">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm font-light">Syncing sales workspace...</span>
                </div>
              ) : priorityEvents.length ? (
                <div className="divide-y divide-zinc-200">
                  {priorityEvents.map((event, index) => {
                    const progress = Math.max(8, Math.min(100, (Number(event.leadCount || 0) / topReach) * 100));
                    const selected = event.canonicalEventKey === selectedEvent?.canonicalEventKey;

                    return (
                      <div
                        key={event.canonicalEventKey}
                        className={`group grid gap-8 py-8 transition-colors sm:grid-cols-[minmax(0,1fr)_15rem_3rem] ${
                          selected ? "bg-zinc-100/70" : "hover:bg-zinc-100/55"
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => setSelectedEventKey(event.canonicalEventKey)}
                          className="min-w-0 text-left"
                        >
                          <p className="mb-4 text-xs font-medium text-zinc-400">
                            {index === 0 ? "Nearest focus" : `Priority ${index + 1}`}
                          </p>
                          <h3 className="max-w-3xl text-2xl font-normal leading-tight tracking-[-0.035em] text-zinc-950">
                            {event.canonicalEventName}
                          </h3>
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedEventKey(event.canonicalEventKey)}
                          className="self-center text-left"
                        >
                          <div className="mb-3 flex items-end justify-between">
                            <span className="text-xs font-medium text-zinc-400">Prospect reach</span>
                            <span className="text-2xl font-light tabular-nums tracking-tight">
                              {Number(event.leadCount || 0).toLocaleString()}
                            </span>
                          </div>
                          <div className="h-1.5 overflow-hidden rounded-full bg-zinc-200">
                            <div className="h-full rounded-full bg-blue-600" style={{ width: `${progress}%` }} />
                          </div>
                        </button>
                        <Link
                          href={eventHref(event)}
                          className="flex h-11 w-11 items-center justify-center self-center rounded-full border border-zinc-200 bg-white text-zinc-400 transition-all hover:border-zinc-950 hover:text-zinc-950"
                          aria-label={`Open ${event.canonicalEventName}`}
                        >
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-16 text-sm font-light text-zinc-400">No event rooms are indexed yet.</div>
              )}
            </div>
          </motion.div>

          <motion.aside initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }}>
            <div className="mb-7 flex items-end justify-between gap-6">
              <div>
                <p className="text-sm font-medium text-zinc-400">Status command</p>
                <h2 className="mt-2 text-3xl font-light tracking-[-0.04em] text-zinc-950">Pipeline movement</h2>
              </div>
              <Link
                href={leadSheetEvent ? `/leads?event=${encodeURIComponent(leadSheetEvent)}` : "/leads"}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-500 transition-all hover:border-blue-600 hover:bg-blue-600 hover:text-white"
                aria-label="Open Lead Sheet"
              >
                <TrainFront className="h-4 w-4" />
              </Link>
            </div>

            <div className="border-y border-zinc-200">
              {loading ? (
                <div className="flex items-center gap-3 py-12 text-zinc-400">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm font-light">Reading lead status...</span>
                </div>
              ) : loadingStatus ? (
                <div className="flex items-center gap-3 py-12 text-zinc-400">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm font-light">Reading selected event status...</span>
                </div>
              ) : statusTotal && visibleStatuses.length ? (
                <div className="divide-y divide-zinc-200">
                  {visibleStatuses.map((status) => {
                    const count = statusCounts.get(status.key) || 0;
                    const width = statusTotal ? Math.max(count > 0 ? 6 : 0, (count / statusTotal) * 100) : 0;

                    return (
                      <Link
                        key={status.key}
                        href={`/leads?status=${encodeURIComponent(status.key)}`}
                        className="group block py-5 transition-colors hover:bg-zinc-100/55"
                      >
                        <div className="mb-3 flex items-center justify-between gap-6">
                          <div className="flex items-center gap-3">
                            <span className={`h-2.5 w-2.5 rounded-full ${status.dot}`} />
                            <span className="text-base font-light tracking-tight text-zinc-950">{status.label}</span>
                          </div>
                          <span className="text-xl font-light tabular-nums tracking-tight text-zinc-950">
                            {count.toLocaleString()}
                          </span>
                        </div>
                        <div className="h-1 overflow-hidden rounded-full bg-zinc-200">
                          <div className={`h-full rounded-full ${status.bar}`} style={{ width: `${width}%` }} />
                        </div>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <div className="py-12 text-sm font-light text-zinc-400">No status data available yet.</div>
              )}
            </div>

            {isSuperAdmin ? (
              <div className="mt-8 rounded-full border border-zinc-200 bg-white/60 p-1">
                <Link href="/campaigns/new">
                  <Button className="h-11 w-full rounded-full bg-zinc-950 text-sm font-medium text-white shadow-none hover:bg-blue-600">
                    Create campaign
                  </Button>
                </Link>
              </div>
            ) : null}
          </motion.aside>
        </section>
      </main>
    </div>
  );
}
