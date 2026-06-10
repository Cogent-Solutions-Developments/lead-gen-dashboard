"use client";

import { type MouseEvent, useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import Link from "next/link";
import { Bungee_Hairline } from "next/font/google";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { usePersona } from "@/hooks/usePersona";
import { getCachedAuthUserDisplayName } from "@/lib/auth";
import {
  getDashboardKpiLeaderboard,
  getDashboardPersonalSummary,
  type DashboardPeriod,
  type DashboardKpiRunner,
  type DashboardPersonalStatsItem,
  type WorkflowStatusDefinitionItem,
} from "@/lib/apiRouter";


import { getDailyManifesto } from "@/lib/manifesto";
import { CampaignHeadsUp } from "@/components/dashboard/CampaignHeadsUp";
import { UserAvatar } from "@/components/profile/UserAvatar";
import {
  DASHBOARD_EXIT_DURATION_MS,
  DASHBOARD_EXIT_EVENT,
  DASHBOARD_EXIT_NAV_DELAY_MS,
  triggerDashboardExitTransition,
} from "@/lib/dashboard-transition";
import { TypingText } from "@/components/ui/typing-text";
import { VariableProximity } from "@/components/ui/variable-proximity";

type SalesMarathonRunner = DashboardKpiRunner;

type EventHeadsUpItem = DashboardPersonalStatsItem;

type PersonalStatsCache = {
  items: EventHeadsUpItem[];
  statuses: WorkflowStatusDefinitionItem[];
};

const SALES_MARATHON_CACHE_KEY = "dashboard:sales-marathon";
const DELEGATE_KPI_CACHE_KEY = "dashboard:delegate-kpi";
const PRODUCTION_KPI_CACHE_KEY = "dashboard:production-kpi";
const DASHBOARD_AUTO_REFRESH_MS = 60_000;
const bungeeHairline = Bungee_Hairline({ subsets: ["latin"], weight: "400" });

function readSessionCache<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeSessionCache<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Cache writes are best-effort only.
  }
}

function personalStatsCacheKey(persona: string, period: DashboardPeriod, userId?: string) {
  return `dashboard:personal-stats:v5:${persona}:${period}:${userId || "anonymous"}`;
}

const FALLBACK_WORKFLOW_STATUSES: WorkflowStatusDefinitionItem[] = [
  {
    id: "dashboard-follow-up",
    statusKey: "follow-up",
    label: "Follow Up",
    isSystemDefault: true,
    sortOrder: 10,
    isActive: true,
  },
  {
    id: "dashboard-proposal-sent",
    statusKey: "proposal-sent",
    label: "Proposal Sent",
    isSystemDefault: true,
    sortOrder: 20,
    isActive: true,
  },
  {
    id: "dashboard-deal-closed",
    statusKey: "deal-closed",
    label: "Deal Closed",
    isSystemDefault: true,
    sortOrder: 30,
    isActive: true,
  },
];

const DELEGATE_WORKFLOW_STATUSES: WorkflowStatusDefinitionItem[] = [
  {
    id: "dashboard-delegate-follow-up",
    statusKey: "follow-up",
    label: "Followups",
    isSystemDefault: true,
    sortOrder: 0,
    isActive: true,
  },
  {
    id: "dashboard-delegate-contacted",
    statusKey: "contacted",
    label: "Contacted",
    isSystemDefault: true,
    sortOrder: 1,
    isActive: true,
  },
  {
    id: "dashboard-delegate-confirmed",
    statusKey: "confirmed",
    label: "Confirmed",
    isSystemDefault: true,
    sortOrder: 2,
    isActive: true,
  },
];

function dashboardStatusesForPersona(persona: string) {
  return persona === "delegates" || persona === "production" ? DELEGATE_WORKFLOW_STATUSES : FALLBACK_WORKFLOW_STATUSES;
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

function getLocalDateParam() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function periodLabel(period: DashboardPeriod) {
  if (period === "monthly") return "Monthly";
  if (period === "yearly") return "Yearly";
  return "Daily";
}

function periodPhrase(period: DashboardPeriod) {
  if (period === "monthly") return "this month";
  if (period === "yearly") return "this year";
  return "today";
}

function daysInCurrentPeriod(period: DashboardPeriod) {
  const now = new Date();
  if (period === "yearly") {
    const start = new Date(now.getFullYear(), 0, 1);
    const end = new Date(now.getFullYear() + 1, 0, 1);
    return Math.round((end.getTime() - start.getTime()) / 86_400_000);
  }
  if (period === "monthly") {
    return new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  }
  return 1;
}

function periodTarget(dailyTarget: number, period: DashboardPeriod) {
  return Math.max(dailyTarget * daysInCurrentPeriod(period), dailyTarget);
}

function getTimeGreeting() {
  const hour = new Date().getHours();

  if (hour < 5) return "Hey Night Owl";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  if (hour < 21) return "Good evening";
  return "Good night";
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Could not load dashboard data.";
}

async function listSalesMarathonLeaderboard(period: DashboardPeriod) {
  const summary = await getDashboardKpiLeaderboard({ date: getLocalDateParam(), period });
  return summary.runners;
}

function PixelAvatar({ colorHex, seed }: { colorHex: string; seed: string }) {
  const url = `https://api.dicebear.com/9.x/identicon/svg?seed=${encodeURIComponent(seed)}&rowColor=${colorHex.replace("#", "")}&backgroundColor=transparent`;
  return (
    <div className="h-6 w-6 overflow-hidden">
      <img
        src={url}
        alt="Identicon"
        className="h-full w-full object-contain"
      />
    </div>
  );
}

function SalesMarathon({
  runners,
  loading,
  title,
  subtitle,
  target,
  footnote,
  period,
}: {
  runners: SalesMarathonRunner[];
  loading: boolean;
  title: string;
  subtitle: string;
  target: number;
  footnote: string;
  period: DashboardPeriod;
}) {
  const loadingRows = [76, 52, 88, 64, 43];
  const barPalette = [
    { bar: "bg-blue-500", hex: "2977e7" },
    { bar: "bg-sky-400", hex: "38bdf8" },
    { bar: "bg-blue-600", hex: "2563eb" },
    { bar: "bg-cyan-400", hex: "22d3ee" },
    { bar: "bg-slate-300", hex: "cbd5e1" },
  ];
  const maxCount = Math.max(target, ...runners.map((runner) => runner.proposalCount), 1);
  const totalCount = runners.reduce((sum, runner) => sum + runner.proposalCount, 0);
  const totalTarget = Math.max(target * Math.max(runners.length, 1), target);
  const totalProgress = Math.min(totalCount / totalTarget, 1);
  const leader = runners[0];

  return (
    <section className="relative overflow-hidden rounded-[2.25rem] border border-white/14 bg-[rgba(7,12,20,0.92)] p-5 ring-1 ring-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_34px_110px_-64px_rgba(0,0,0,0.95)] backdrop-blur-[30px] sm:p-6 lg:p-7">
      <div className="pointer-events-none absolute inset-0 bg-[rgba(255,255,255,0.025)]" />

      <div className="relative z-[1] flex flex-col gap-6">
        <div className="flex flex-col gap-5 border-b border-white/10 pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[rgba(191,219,254,0.72)]">Performance Command</p>
            <h2 className="mt-3 text-[clamp(2rem,4vw,4.25rem)] font-light leading-[0.92] tracking-[-0.06em] text-[rgb(248,250,252)]">
              {title}
            </h2>
            <p className="mt-3 max-w-2xl text-sm font-light leading-6 text-[rgba(203,213,225,0.82)]">
              {subtitle}
            </p>
          </div>

          <div className="grid min-w-[14rem] grid-cols-2 gap-2">
            <div className="rounded-[1.25rem] border border-white/12 bg-white/[0.045] px-4 py-3 ring-1 ring-white/8">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[rgba(148,163,184,0.72)]">Target</p>
              <p className="mt-2 text-2xl font-light tabular-nums text-[rgb(248,250,252)]">{target.toLocaleString()}</p>
            </div>
            <div className="rounded-[1.25rem] border border-white/12 bg-white/[0.045] px-4 py-3 ring-1 ring-white/8">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[rgba(148,163,184,0.72)]">Total</p>
              <p className="mt-2 text-2xl font-light tabular-nums text-[rgb(248,250,252)]">{loading ? "..." : totalCount.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="space-y-3">
            {loading ? (
              loadingRows.map((width, index) => (
                <div
                  key={index}
                  className="relative overflow-hidden rounded-[1.4rem] border border-white/10 bg-white/[0.035] p-4"
                >
                  <div className="flex animate-pulse items-center gap-4">
                    <div className="h-11 w-11 rounded-full bg-white/8" />
                    <div className="min-w-0 flex-1">
                      <div className="h-3 w-28 rounded-full bg-white/8" />
                      <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/8">
                        <div className="h-full rounded-full bg-white/16" style={{ width: `${width}%` }} />
                      </div>
                    </div>
                    <div className="h-7 w-12 rounded-full bg-white/8" />
                  </div>
                </div>
              ))
            ) : runners.length === 0 ? (
              <div className="flex min-h-[18rem] items-center justify-center rounded-[1.5rem] border border-dashed border-white/16 bg-white/[0.025] text-sm font-light text-[rgba(148,163,184,0.78)]">
                No active records for the current period.
              </div>
            ) : (
              runners.map((runner, index) => {
                const progress = Math.min(runner.proposalCount / maxCount, 1);
                const colorItem = barPalette[index % barPalette.length];
                return (
                  <motion.div
                    key={runner.id}
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.055, duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
                    className="group relative overflow-hidden rounded-[1.45rem] border border-white/10 bg-[rgba(255,255,255,0.038)] p-4 ring-1 ring-white/8 transition-[border-color,background-color,transform] hover:-translate-y-0.5 hover:border-white/18 hover:bg-white/[0.06]"
                  >
                    <div className="pointer-events-none absolute inset-y-3 left-0 w-px bg-[rgba(148,163,184,0.38)] opacity-0 transition-opacity group-hover:opacity-100" />
                    <div className="relative z-[1] flex items-center gap-4">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/12 bg-black/20 text-xs font-semibold tabular-nums text-[rgba(203,213,225,0.82)]">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/12 bg-white/[0.045] ring-1 ring-white/8">
                        <PixelAvatar colorHex={colorItem.hex} seed={runner.id} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-4">
                          <h3 className="truncate text-base font-medium tracking-tight text-[rgb(226,232,240)]">
                            {runner.name}
                          </h3>
                          <span className="text-2xl font-light tabular-nums tracking-tight text-[rgb(248,250,252)]">
                            {runner.proposalCount.toLocaleString()}
                          </span>
                        </div>
                        <div className="mt-3 h-2 overflow-hidden rounded-full border border-white/8 bg-black/30 shadow-[inset_0_1px_3px_rgba(0,0,0,0.75)]">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${progress * 100}%` }}
                            transition={{ duration: 0.9, delay: index * 0.05, ease: [0.22, 1, 0.36, 1] }}
                            className={`h-full rounded-full ${colorItem.bar} shadow-[0_0_18px_-8px_rgba(59,130,246,0.85)]`}
                          />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>

          <aside className="relative overflow-hidden rounded-[1.7rem] border border-white/12 bg-[rgba(3,7,14,0.56)] p-5 ring-1 ring-white/8">
            <div className="pointer-events-none absolute inset-0 bg-[rgba(255,255,255,0.02)]" />
            <div className="relative z-[1] flex h-full min-h-[18rem] flex-col justify-between gap-7">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[rgba(148,163,184,0.72)]">Current Leader</p>
                <div className="mt-5 flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full border border-blue-300/24 bg-blue-500/12 ring-1 ring-blue-300/14">
                    {leader ? <PixelAvatar colorHex="60a5fa" seed={leader.id} /> : <span className="h-2 w-2 rounded-full bg-[rgba(71,85,105,0.9)]" />}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-xl font-light tracking-tight text-[rgb(248,250,252)]">{leader?.name || "No leader yet"}</p>
                    <p className="mt-1 text-xs font-light text-[rgba(148,163,184,0.72)]">{periodPhrase(period)}</p>
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[rgba(148,163,184,0.72)]">Team Pressure</p>
                    <p className="mt-2 text-4xl font-light tabular-nums tracking-[-0.04em] text-[rgb(248,250,252)]">{Math.round(totalProgress * 100)}%</p>
                  </div>
                  <p className="text-right text-xs font-light leading-5 text-[rgba(148,163,184,0.72)]">
                    against {totalTarget.toLocaleString()} total target
                  </p>
                </div>
                <div className="mt-4 h-2.5 overflow-hidden rounded-full border border-white/10 bg-black/35">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${totalProgress * 100}%` }}
                    transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                    className="h-full rounded-full bg-blue-500 shadow-[0_0_18px_-8px_rgba(59,130,246,0.85)]"
                  />
                </div>
              </div>

              <p className="border-t border-white/10 pt-5 text-xs font-light leading-6 text-[rgba(148,163,184,0.72)]">
                {footnote}
              </p>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { persona } = usePersona();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const quoteContainerRef = useRef<HTMLDivElement>(null);
  const period: DashboardPeriod = "daily";
  const [salesRunners, setSalesRunners] = useState<SalesMarathonRunner[]>([]);
  const [loadingSalesMarathon, setLoadingSalesMarathon] = useState(true);
  const [eventHeadsUp, setEventHeadsUp] = useState<EventHeadsUpItem[]>([]);
  const [workflowStatuses, setWorkflowStatuses] = useState<WorkflowStatusDefinitionItem[]>(FALLBACK_WORKFLOW_STATUSES);
  const [loadingEventHeadsUp, setLoadingEventHeadsUp] = useState(true);
  const [statsOpen, setStatsOpen] = useState(false);
  const [dashboardLeaving, setDashboardLeaving] = useState(false);
  const userId = user?.id;
  const displayName = firstName(getDisplayName(user));
  const greeting = getTimeGreeting();
  const manifesto = getDailyManifesto(user?.id || "");
  const periodName = periodLabel(period);
  const periodText = periodPhrase(period);
  const kpiCopy = persona === "delegates"
    ? {
        title: `${periodName} KPI Tracker`,
        subtitle: "3 delegate confirmations a day keeps the event worries away.",
        target: periodTarget(3, period),
        footnote: `* This data reflects delegate confirmations recorded ${periodText}.`,
      }
    : persona === "production"
      ? {
          title: `${periodName} KPI Tracker`,
          subtitle: "3 speaker confirmations a day keeps the event worries away.",
          target: periodTarget(3, period),
          footnote: `* This data reflects speaker confirmations recorded ${periodText}.`,
        }
    : {
        title: `${periodName} KPI Tracker`,
        subtitle: "5 proposals a day keeps the sales stress far away.",
        target: periodTarget(5, period),
        footnote: "* This data reflects the total number of proposals sent within the last 24-hour cycle.",
      };

  const loadSalesMarathon = useCallback(async (mode: "initial" | "refresh") => {
    const cacheKey =
      persona === "delegates"
        ? `${DELEGATE_KPI_CACHE_KEY}:${period}`
        : persona === "production"
          ? `${PRODUCTION_KPI_CACHE_KEY}:${period}`
          : `${SALES_MARATHON_CACHE_KEY}:${period}`;
      if (mode === "initial") {
        const cached = readSessionCache<SalesMarathonRunner[]>(cacheKey);
        if (cached) {
          setSalesRunners(cached);
          setLoadingSalesMarathon(false);
        } else {
          setLoadingSalesMarathon(true);
        }
      }

      try {
        const runners = await listSalesMarathonLeaderboard(period);
        setSalesRunners(runners);
        writeSessionCache(cacheKey, runners);
      } catch (error) {
        toast.error("Dashboard sync failed", { description: getErrorMessage(error) });
        if (mode === "initial") setSalesRunners([]);
      } finally {
        setLoadingSalesMarathon(false);
      }
    }, [period, persona]);

  const loadPersonalStats = useCallback(async (mode: "initial" | "refresh") => {
    if (!userId) {
      setLoadingEventHeadsUp(false);
      return;
    }

    const cacheKey = personalStatsCacheKey(persona, period, userId);
    if (mode === "initial") {
      const cached = readSessionCache<PersonalStatsCache>(cacheKey);
      if (cached) {
        setWorkflowStatuses(cached.statuses.length ? cached.statuses : dashboardStatusesForPersona(persona));
        setEventHeadsUp(cached.items);
        setLoadingEventHeadsUp(false);
      } else {
        setLoadingEventHeadsUp(true);
      }
    }

    try {
      const summary = await getDashboardPersonalSummary({ date: getLocalDateParam(), period });
      const activeStatuses = summary.statuses.length ? summary.statuses : dashboardStatusesForPersona(persona);
      const nextItems = summary.items || [];
      setWorkflowStatuses(activeStatuses);
      setEventHeadsUp(nextItems);
      writeSessionCache(cacheKey, {
        items: nextItems,
        statuses: activeStatuses,
      });
    } catch (error) {
      toast.error("Dashboard sync failed", { description: getErrorMessage(error) });
      if (mode === "initial") setEventHeadsUp([]);
    } finally {
      setLoadingEventHeadsUp(false);
    }
  }, [period, persona, userId]);

  useEffect(() => {
    void loadSalesMarathon("initial");
  }, [loadSalesMarathon]);

  useEffect(() => {
    void loadPersonalStats("initial");
  }, [loadPersonalStats]);

  useEffect(() => {
    const refreshDashboard = () => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
      void loadSalesMarathon("refresh");
      void loadPersonalStats("refresh");
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") refreshDashboard();
    };

    window.addEventListener("focus", refreshDashboard);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    const intervalId = window.setInterval(refreshDashboard, DASHBOARD_AUTO_REFRESH_MS);

    return () => {
      window.removeEventListener("focus", refreshDashboard);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.clearInterval(intervalId);
    };
  }, [loadPersonalStats, loadSalesMarathon]);

  useEffect(() => {
    setStatsOpen(searchParams.get("stats") === "1");
  }, [searchParams]);

  const closeStatsModal = useCallback(() => {
    setStatsOpen(false);
    const next = new URLSearchParams(searchParams.toString());
    next.delete("stats");
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [pathname, router, searchParams]);

  useEffect(() => {
    if (!statsOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeStatsModal();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [closeStatsModal, statsOpen]);

  useEffect(() => {
    const handleDashboardExit = () => {
      setDashboardLeaving(true);
      window.setTimeout(() => {
        setDashboardLeaving(false);
      }, DASHBOARD_EXIT_DURATION_MS + 160);
    };

    window.addEventListener(DASHBOARD_EXIT_EVENT, handleDashboardExit);
    return () => {
      window.removeEventListener(DASHBOARD_EXIT_EVENT, handleDashboardExit);
    };
  }, []);

  const handleProfileNavigation = useCallback(
    (event: MouseEvent<HTMLAnchorElement>) => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
        return;
      }

      event.preventDefault();
      triggerDashboardExitTransition();
      window.setTimeout(() => {
        router.push("/profile");
      }, DASHBOARD_EXIT_NAV_DELAY_MS);
    },
    [router]
  );

  return (
    <div className="relative h-[100dvh] max-h-[100dvh] overflow-hidden bg-transparent font-sans text-zinc-950">
      <AnimatePresence>
        {statsOpen ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] flex items-center justify-center bg-zinc-950/72 p-4 backdrop-blur-sm sm:p-6"
          >
            <button
              type="button"
              className="absolute inset-0"
              aria-label="Close stats modal"
              onClick={closeStatsModal}
            />
            <motion.div
              initial={{ opacity: 0, y: 22, scale: 0.985 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.99 }}
              transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
              className="relative z-10 h-[min(90dvh,60rem)] w-full max-w-[96rem] overflow-visible"
            >
              <button
                type="button"
                onClick={closeStatsModal}
                className="absolute -top-12 right-0 z-20 inline-flex h-10 items-center rounded-full border border-white/18 bg-white/[0.055] px-4 text-sm font-medium text-[rgb(226,232,240)] ring-1 ring-white/8 shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_16px_34px_-24px_rgba(0,0,0,0.95)] backdrop-blur-[26px] transition hover:border-white/28 hover:bg-white/[0.09] hover:text-[rgb(248,250,252)]"
              >
                Close
              </button>

              <div className="h-full min-h-0 overflow-y-auto scrollbar-modern">
                <div className="space-y-8">
                  <SalesMarathon
                    runners={salesRunners}
                    loading={loadingSalesMarathon}
                    title={kpiCopy.title}
                    subtitle={kpiCopy.subtitle}
                    target={kpiCopy.target}
                    footnote={kpiCopy.footnote}
                    period={period}
                  />
                  <CampaignHeadsUp
                    items={eventHeadsUp}
                    statuses={workflowStatuses}
                    loading={loadingEventHeadsUp}
                    period={period}
                  />
                </div>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex justify-center">
        <motion.div
          className="absolute bottom-0 h-[52dvh] w-[54rem] max-w-[88vw] rounded-full opacity-65 blur-[84px]"
          style={{
            background: "radial-gradient(ellipse at center, var(--dashboard-hero-glow) 0%, transparent 72%)",
          }}
          animate={{
            opacity: dashboardLeaving ? 0.82 : [0.58, 0.67, 0.58],
            scale: dashboardLeaving ? 1.15 : [0.98, 1.02, 0.98],
          }}
          transition={
            dashboardLeaving
              ? { duration: DASHBOARD_EXIT_DURATION_MS / 1000, ease: [0.22, 1, 0.36, 1] }
              : { duration: 6.8, repeat: Infinity, ease: "easeInOut" }
          }
        />
        <motion.img
          src="/videos/BlockchainEventPromoconverted_1-ezgif.com-optimize%20(1).gif"
          alt="Animated dashboard visual"
          className="h-[74dvh] w-auto max-w-[92vw] origin-bottom object-contain object-bottom opacity-85"
          animate={{
            scale: dashboardLeaving ? 0.94 : 1,
            opacity: dashboardLeaving ? 0.52 : 0.85,
          }}
          transition={{ duration: (DASHBOARD_EXIT_DURATION_MS + 180) / 1000, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>

      <div className="relative z-20 flex h-full min-h-0 flex-col px-6 py-6 lg:px-10 lg:py-7 xl:px-12">
        <div className="flex shrink-0 items-center justify-between gap-4">
          <div className="inline-flex items-baseline">
            <p className="flex items-baseline gap-1 text-[1.18rem] leading-none" style={{ color: "oklch(0.9 0.01 250)" }}>
              <span className="relative -top-[3px] font-normal">supernizo</span>
              <span className={`${bungeeHairline.className} text-[1.08em] leading-none`}>HEAVY</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 items-center rounded-full border border-white/85 bg-white/68 px-4 text-sm font-medium text-zinc-900 ring-1 ring-white/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.96),inset_0_-1px_0_rgba(255,255,255,0.38),0_12px_28px_-18px_rgba(2,10,27,0.58),0_4px_12px_-8px_rgba(2,10,27,0.42)] backdrop-blur-[30px]">
              {getDateLabel()}
            </span>
            <Link
              href="/profile"
              className="group inline-flex items-center rounded-full transition"
              aria-label="Go to profile"
              onClick={handleProfileNavigation}
            >
              <UserAvatar user={user} size="md" className="border-0 bg-transparent shadow-none" />
            </Link>
          </div>
        </div>

        <div className="mt-14 grid min-h-0 flex-1 items-stretch gap-6 text-left">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className="min-h-0 overflow-y-auto pr-1 scrollbar-modern"
          >
            <motion.div
              className="mx-auto w-full max-w-5xl text-center"
              animate={{
                opacity: dashboardLeaving ? 0.72 : 1,
                y: dashboardLeaving ? -3 : 0,
                filter: dashboardLeaving ? "blur(2px)" : "blur(0px)",
              }}
              transition={{ duration: DASHBOARD_EXIT_DURATION_MS / 1000, ease: [0.22, 1, 0.36, 1] }}
            >
              <motion.h1
                initial={{ opacity: 0, y: 16, filter: "blur(8px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                className="text-[2rem] leading-[1.05] tracking-[-0.035em] text-zinc-950 sm:text-[2.5rem] xl:text-[2.75rem]"
              >
                <span className="font-medium">{greeting}, {displayName}.</span>
              </motion.h1>
              <blockquote className="mt-5 text-[1.42rem] font-extralight leading-[1.16] tracking-[-0.019em] sm:text-[1.7rem] xl:text-[1.88rem]">
                <div ref={quoteContainerRef} className="relative">
                  <TypingText
                    text={manifesto}
                    characterDelayMs={115}
                    textClassName="dashboard-quote-revealed"
                    completedContent={
                      <VariableProximity
                        label={manifesto}
                        containerRef={quoteContainerRef}
                        radius={110}
                        falloff="gaussian"
                        fromFontVariationSettings="'wght' 220, 'opsz' 16"
                        toFontVariationSettings="'wght' 620, 'opsz' 34"
                        className="dashboard-quote-revealed"
                      />
                    }
                  />
                </div>
              </blockquote>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
