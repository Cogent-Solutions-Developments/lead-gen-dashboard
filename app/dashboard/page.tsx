"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
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
const DASHBOARD_PERIOD_OPTIONS: Array<{ value: DashboardPeriod; label: string }> = [
  { value: "daily", label: "Daily" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
];

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
  return DASHBOARD_PERIOD_OPTIONS.find((option) => option.value === period)?.label || "Daily";
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

function runnerMatchesUser(runner: SalesMarathonRunner, user: ReturnType<typeof useAuth>["user"]) {
  if (!user) return false;
  const values = [runner.id, runner.username, runner.name, runner.fullName]
    .map((value) => String(value || "").trim().toLowerCase())
    .filter(Boolean);
  const userValues = [user.id, user.username, user.fullName]
    .map((value) => String(value || "").trim().toLowerCase())
    .filter(Boolean);

  return values.some((value) => userValues.includes(value));
}

function runnerToAvatarUser(runner: SalesMarathonRunner, currentUser: ReturnType<typeof useAuth>["user"]) {
  if (runnerMatchesUser(runner, currentUser)) {
    return {
      fullName: currentUser?.fullName || runner.fullName || runner.name,
      username: currentUser?.username || runner.username || runner.name,
      avatarUrl: currentUser?.avatarUrl || runner.avatarUrl || null,
    };
  }

  return {
    fullName: runner.fullName || runner.name,
    username: runner.username || runner.name,
    avatarUrl: runner.avatarUrl || null,
  };
}

function getPinnedRunners(runners: SalesMarathonRunner[], user: ReturnType<typeof useAuth>["user"]) {
  if (!user) return runners;

  const currentRunnerIndex = runners.findIndex((runner) => runnerMatchesUser(runner, user));
  if (currentRunnerIndex >= 0) {
    const currentRunner = runners[currentRunnerIndex];
    return [currentRunner, ...runners.filter((_, index) => index !== currentRunnerIndex)];
  }

  return [
    {
      id: user.id,
      name: user.fullName?.trim() || user.username || "You",
      initials: (user.fullName || user.username || "Y")
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join("") || "Y",
      username: user.username,
      fullName: user.fullName,
      avatarUrl: user.avatarUrl || null,
      avatarStorageObjectId: user.avatarStorageObjectId || null,
      proposalCount: 0,
    },
    ...runners,
  ];
}

function SalesMarathon({
  runners,
  currentUser,
  loading,
  title,
  subtitle,
  target,
  footnote,
}: {
  runners: SalesMarathonRunner[];
  currentUser: ReturnType<typeof useAuth>["user"];
  loading: boolean;
  title: string;
  subtitle: string;
  target: number;
  footnote: string;
}) {
  const loadingBars = [68, 44, 82, 56, 72, 36, 62];
  const barPalette = [
    { bg: "bg-[#2977e7]" },
    { bg: "bg-emerald-500" },
    { bg: "bg-amber-500" },
    { bg: "bg-rose-500" },
    { bg: "bg-indigo-500" },
    { bg: "bg-teal-500" },
    { bg: "bg-orange-500" },
  ];
  const displayRunners = getPinnedRunners(runners, currentUser);

  return (
    <section className="relative min-h-[35rem] overflow-hidden border border-zinc-200 bg-white px-8 py-8 shadow-sm">
      <div className="relative flex items-baseline justify-between gap-6 border-b border-zinc-100 pb-6">
        <div>
          <h2 className="text-4xl font-extralight tracking-tight text-zinc-950">
            {title}
          </h2>
          <p className="mt-3 text-sm font-light text-zinc-500">
            {subtitle}
          </p>
        </div>
      </div>

      <div className="relative mt-12 flex h-80 items-end justify-between gap-4">
        {loading ? (
          loadingBars.map((height, index) => (
            <div key={index} className="flex h-full flex-1 animate-pulse flex-col items-center justify-end">
              <div className="mb-4 h-8 w-7 bg-zinc-100" />

              <div className="relative h-full w-8 overflow-hidden bg-zinc-100">
                <div
                  className="absolute bottom-0 w-full bg-zinc-200"
                  style={{ height: `${height}%` }}
                />
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-[1px] w-full bg-white/60" />
                  ))}
                </div>
              </div>

              <div className="mt-6 flex flex-col items-center gap-3">
                <div className="h-6 w-6 bg-zinc-100" />
                <div className="h-2 w-12 bg-zinc-100" />
              </div>
            </div>
          ))
        ) : displayRunners.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center text-sm font-light text-zinc-400 italic">
            No active records for the current period.
          </div>
        ) : (
          displayRunners.map((runner, index) => {
            const rawProgress = Math.min(runner.proposalCount / target, 1);
            const progress = runner.proposalCount > 0 ? Math.max(rawProgress, 0.08) : 0;
            const colorItem = barPalette[index % barPalette.length];
            const isCurrentUser = runnerMatchesUser(runner, currentUser);
            return (
              <div key={runner.id} className="group relative flex h-full flex-1 flex-col items-center justify-end">
                <div className="mb-4 flex flex-col items-center gap-1">
                  <span className="text-2xl font-extralight text-zinc-950">
                    {runner.proposalCount}
                  </span>
                </div>

                <div className="kpi-glass-bar relative h-full w-10 overflow-hidden rounded-full">
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${progress * 100}%` }}
                    transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
                    className={`kpi-glass-fill absolute bottom-1 left-1 right-1 z-[3] ${colorItem.bg}`}
                  />
                  {/* Grid markers */}
                  <div className="pointer-events-none absolute inset-0 z-[4] flex flex-col justify-between">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="w-full h-[1px] bg-white/20" />
                    ))}
                  </div>
                </div>

                <div className="mt-6 flex flex-col items-center gap-3">
                  <UserAvatar
                    user={runnerToAvatarUser(runner, currentUser)}
                    size="sm"
                    className={`h-7 w-7 border-white/70 bg-white/60 shadow-[0_8px_16px_-12px_rgba(15,23,42,0.5)] ${
                      isCurrentUser ? "ring-2 ring-[#2977e7]/30 ring-offset-2 ring-offset-white" : ""
                    }`}
                    imageClassName="scale-105"
                  />
                  <h3 className="max-w-[4.5rem] truncate text-[10px] font-medium tracking-wide text-zinc-950 text-center">
                    {runner.name.split(' ')[0]}
                  </h3>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="mt-12 border-t border-zinc-100 pt-6">
        <p className="text-[10px] leading-relaxed text-zinc-400">
          {footnote}
        </p>
      </div>
    </section>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { persona } = usePersona();
  const [period, setPeriod] = useState<DashboardPeriod>("daily");
  const [salesRunners, setSalesRunners] = useState<SalesMarathonRunner[]>([]);
  const [loadingSalesMarathon, setLoadingSalesMarathon] = useState(true);
  const [eventHeadsUp, setEventHeadsUp] = useState<EventHeadsUpItem[]>([]);
  const [workflowStatuses, setWorkflowStatuses] = useState<WorkflowStatusDefinitionItem[]>(FALLBACK_WORKFLOW_STATUSES);
  const [loadingEventHeadsUp, setLoadingEventHeadsUp] = useState(true);
  const userId = user?.id;
  const displayName = firstName(getDisplayName(user));
  const greeting = getTimeGreeting();
  const manifesto = getDailyManifesto(user?.id || "");
  const periodName = periodLabel(period);
  const periodText = periodPhrase(period);
  const kpiCopy = persona === "delegates"
    ? {
        title: `${periodName} KPI Tracker`,
        subtitle: `Track delegate confirmations recorded ${periodText}.`,
        target: periodTarget(3, period),
        footnote: `* This data reflects delegate confirmations recorded ${periodText}.`,
      }
    : persona === "production"
      ? {
          title: `${periodName} KPI Tracker`,
          subtitle: `Track speaker confirmations recorded ${periodText}.`,
          target: periodTarget(3, period),
          footnote: `* This data reflects speaker confirmations recorded ${periodText}.`,
        }
    : {
        title: `${periodName} KPI Tracker`,
        subtitle: `Track proposals sent ${periodText}.`,
        target: periodTarget(5, period),
        footnote: `* This data reflects proposals sent ${periodText}.`,
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

  return (
    <div className="flex h-screen flex-1 flex-col overflow-hidden bg-[#f7f7f7] font-sans text-zinc-950">
      <header className="relative isolate h-full min-h-0 w-full overflow-y-auto px-8 py-7 lg:px-12">
        <div className="relative z-10 flex w-full flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <UserAvatar user={user} size="lg" className="bg-white shadow-sm" />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-zinc-950">
                {getDisplayName(user) || "Profile"}
              </p>
              {user?.bio ? (
                <p className="max-w-sm truncate text-xs text-zinc-500">{user.bio}</p>
              ) : null}
            </div>
          </div>
          <div className="ml-auto flex flex-wrap items-center justify-end gap-3">
            <div className="inline-flex h-10 overflow-hidden rounded-full border border-zinc-200 bg-white p-1 shadow-sm">
              {DASHBOARD_PERIOD_OPTIONS.map((option) => {
                const active = option.value === period;
                return (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setPeriod(option.value)}
                    className={`h-8 rounded-full px-3 text-xs font-medium transition-colors ${
                      active
                        ? "bg-zinc-950 text-white"
                        : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-950"
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
            <span className="inline-flex h-10 items-center rounded-full border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-800">
              {getDateLabel()}
            </span>
          </div>
        </div>

        <div className="relative z-10 mt-10 grid items-stretch gap-10 text-left xl:grid-cols-[minmax(0,1fr)_26rem]">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col"
          >
            <h1 className="max-w-5xl text-zinc-950">
              <span className="block text-[1.95rem] font-medium leading-[1.08] tracking-[-0.04em] sm:text-[2.45rem]">
                {greeting}, {displayName}.
              </span>
              <span className="mt-4 block max-w-4xl text-[1.55rem] font-light leading-[1.16] tracking-[-0.025em] text-zinc-500 sm:text-[2rem]">
                “{manifesto}”
              </span>
            </h1>

            <CampaignHeadsUp
              items={eventHeadsUp}
              statuses={workflowStatuses}
              loading={loadingEventHeadsUp}
              period={period}
            />
          </motion.div>

          <div>
            <SalesMarathon
              runners={salesRunners}
              currentUser={user}
              loading={loadingSalesMarathon}
              title={kpiCopy.title}
              subtitle={kpiCopy.subtitle}
              target={kpiCopy.target}
              footnote={kpiCopy.footnote}
            />
          </div>
        </div>
      </header>
    </div>
  );
}
