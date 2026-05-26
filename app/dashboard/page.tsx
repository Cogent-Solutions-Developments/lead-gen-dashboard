"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import Link from "next/link";
import { Bungee_Hairline } from "next/font/google";
import { Activity, Target, Trophy } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { usePersona } from "@/hooks/usePersona";
import { getCachedAuthUserDisplayName } from "@/lib/auth";
import {
  getDashboardKpiLeaderboard,
  getDashboardPersonalSummary,
  type DashboardKpiRunner,
  type DashboardPersonalStatsItem,
  type WorkflowStatusDefinitionItem,
} from "@/lib/apiRouter";


import { getDailyManifesto } from "@/lib/manifesto";
import { CampaignHeadsUp } from "@/components/dashboard/CampaignHeadsUp";
import { UserAvatar } from "@/components/profile/UserAvatar";
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

function personalStatsCacheKey(persona: string, userId?: string) {
  return `dashboard:personal-stats:v4:${persona}:${userId || "anonymous"}`;
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
    id: "dashboard-delegate-pending",
    statusKey: "pending",
    label: "Pending",
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

async function listSalesMarathonLeaderboard() {
  const summary = await getDashboardKpiLeaderboard({ date: getLocalDateParam() });
  return summary.runners;
}

function PixelAvatar({ seed }: { seed: string }) {
  const initials = seed
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "NA";

  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-[10px] font-medium text-zinc-300">
      {initials}
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
}: {
  runners: SalesMarathonRunner[];
  loading: boolean;
  title: string;
  subtitle: string;
  target: number;
  footnote: string;
}) {
  const loadingBars = [68, 44, 82, 56, 72];
  const displayedRunners = runners.slice(0, 5);
  const totalClosed = runners.reduce((sum, runner) => sum + runner.proposalCount, 0);
  const leadRunner = runners[0];
  const averageClosed = runners.length ? (totalClosed / runners.length).toFixed(1) : "0.0";
  const targetGap = Math.max(target - totalClosed, 0);

  return (
    <section className="overflow-hidden rounded-2xl border border-white/8 bg-[linear-gradient(180deg,rgba(17,19,24,0.98),rgba(12,14,18,0.98))] shadow-[0_30px_70px_-40px_rgba(0,0,0,0.9)]">
      <div className="border-b border-white/8 px-8 py-7">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl">
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-500">
              Daily operations
            </p>
            <h2 className="mt-3 text-[2rem] font-medium text-zinc-50">
              {title}
            </h2>
            <p className="mt-3 text-sm leading-6 text-zinc-400">
              {subtitle}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-white/8 bg-white/[0.02] px-4 py-4">
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.14em] text-zinc-500">
                <Target className="h-3.5 w-3.5" />
                Daily target
              </div>
              <div className="mt-3 text-2xl font-medium text-zinc-50">{target}</div>
            </div>
            <div className="rounded-xl border border-white/8 bg-white/[0.02] px-4 py-4">
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.14em] text-zinc-500">
                <Activity className="h-3.5 w-3.5" />
                Closed today
              </div>
              <div className="mt-3 text-2xl font-medium text-zinc-50">{totalClosed}</div>
            </div>
            <div className="rounded-xl border border-white/8 bg-white/[0.02] px-4 py-4">
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.14em] text-zinc-500">
                <Trophy className="h-3.5 w-3.5" />
                Current lead
              </div>
              <div className="mt-3 text-2xl font-medium text-zinc-50">{leadRunner ? leadRunner.proposalCount : 0}</div>
            </div>
            <div className="rounded-xl border border-white/8 bg-white/[0.02] px-4 py-4">
              <div className="text-[11px] uppercase tracking-[0.14em] text-zinc-500">
                Remaining gap
              </div>
              <div className="mt-3 text-2xl font-medium text-zinc-50">{targetGap}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-8 py-8">
        <div className="mb-5 flex items-center justify-between gap-4 border-b border-white/8 pb-4">
          <div className="text-[11px] uppercase tracking-[0.14em] text-zinc-500">
            Leaderboard
          </div>
          <div className="text-xs text-zinc-500">
            Team average: {averageClosed}
          </div>
        </div>

        <div className="grid gap-4">
          {loading ? (
            loadingBars.map((width, index) => (
              <div key={index} className="grid animate-pulse grid-cols-[2.5rem_2.5rem_minmax(0,1.3fr)_minmax(0,1fr)_5rem_5rem] items-center gap-4 rounded-xl border border-white/8 bg-white/[0.02] px-4 py-4">
                <div className="h-3 w-8 rounded-full bg-white/[0.06]" />
                <div className="h-8 w-8 rounded-full bg-white/[0.06]" />
                <div className="h-3 w-24 rounded-full bg-white/[0.06]" />
                <div className="h-2.5 rounded-full bg-white/[0.04]">
                  <div className="h-full rounded-full bg-white/[0.08]" style={{ width: `${width}%` }} />
                </div>
                <div className="h-3 w-10 rounded-full bg-white/[0.06]" />
                <div className="h-3 w-10 rounded-full bg-white/[0.06]" />
              </div>
            ))
          ) : displayedRunners.length === 0 ? (
            <div className="flex min-h-72 items-center justify-center rounded-xl border border-dashed border-white/10 bg-white/[0.02] text-sm text-zinc-500">
              No active records for the current period.
            </div>
          ) : (
            <>
              <div className="grid grid-cols-[2.5rem_2.5rem_minmax(0,1.3fr)_minmax(0,1fr)_5rem_5rem] items-center gap-4 px-4 text-[11px] uppercase tracking-[0.14em] text-zinc-500">
                <span>Rank</span>
                <span />
                <span>Name</span>
                <span>Completion</span>
                <span className="text-right">Closed</span>
                <span className="text-right">Gap</span>
              </div>

              {displayedRunners.map((runner, index) => {
                const progress = target > 0 ? Math.min(runner.proposalCount / target, 1) : 0;
                const gap = Math.max(target - runner.proposalCount, 0);

                return (
                  <div key={runner.id} className="grid grid-cols-[2.5rem_2.5rem_minmax(0,1.3fr)_minmax(0,1fr)_5rem_5rem] items-center gap-4 rounded-xl border border-white/8 bg-white/[0.025] px-4 py-4">
                    <div className="text-sm font-medium text-zinc-300">
                      {String(index + 1).padStart(2, "0")}
                    </div>
                    <PixelAvatar seed={runner.name} />
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-zinc-100">
                        {runner.name}
                      </div>
                      <div className="mt-1 text-[11px] uppercase tracking-[0.14em] text-zinc-500">
                        {runner.name.split(" ")[0]}
                      </div>
                    </div>

                    <div>
                      <div className="mb-2 flex items-center justify-between text-[11px] uppercase tracking-[0.14em] text-zinc-500">
                        <span>{Math.round(progress * 100)}%</span>
                        <span>{runner.proposalCount}/{target}</span>
                      </div>
                      <div className="h-3 overflow-hidden rounded-full bg-white/[0.05]">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${progress * 100}%` }}
                          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                          className="h-full rounded-full bg-gradient-to-r from-cyan-300 via-sky-400 to-blue-500"
                        />
                      </div>
                    </div>

                    <div className="text-right text-2xl font-medium text-zinc-50">
                      {runner.proposalCount}
                    </div>

                    <div className="text-right text-lg font-medium text-zinc-300">
                      {gap}
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      </div>

      <div className="border-t border-white/8 px-8 py-5">
        <p className="text-[11px] leading-relaxed text-zinc-500">
          {footnote}
        </p>
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
  const [salesRunners, setSalesRunners] = useState<SalesMarathonRunner[]>([]);
  const [loadingSalesMarathon, setLoadingSalesMarathon] = useState(true);
  const [eventHeadsUp, setEventHeadsUp] = useState<EventHeadsUpItem[]>([]);
  const [workflowStatuses, setWorkflowStatuses] = useState<WorkflowStatusDefinitionItem[]>(FALLBACK_WORKFLOW_STATUSES);
  const [loadingEventHeadsUp, setLoadingEventHeadsUp] = useState(true);
  const [statsOpen, setStatsOpen] = useState(false);
  const userId = user?.id;
  const displayName = firstName(getDisplayName(user));
  const greeting = getTimeGreeting();
  const manifesto = getDailyManifesto(user?.id || "");
  const kpiCopy = persona === "delegates"
    ? {
        title: "Daily KPI Tracker",
        subtitle: "3 delegate confirmations a day keeps the event worries away.",
        target: 3,
        footnote: "* This data reflects delegate confirmations recorded today.",
      }
    : persona === "production"
      ? {
          title: "Daily KPI Tracker",
          subtitle: "3 speaker confirmations a day keeps the event worries away.",
          target: 3,
          footnote: "* This data reflects speaker confirmations recorded today.",
        }
    : {
        title: "Daily KPI Tracker",
        subtitle: "5 proposals a day keeps the sales stress far away.",
        target: 5,
        footnote: "* This data reflects the total number of proposals sent within the last 24-hour cycle.",
      };

  const loadSalesMarathon = useCallback(async (mode: "initial" | "refresh") => {
    const cacheKey =
      persona === "delegates"
        ? DELEGATE_KPI_CACHE_KEY
        : persona === "production"
          ? PRODUCTION_KPI_CACHE_KEY
          : SALES_MARATHON_CACHE_KEY;
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
        const runners = await listSalesMarathonLeaderboard();
        setSalesRunners(runners);
        writeSessionCache(cacheKey, runners);
      } catch (error) {
        toast.error("Dashboard sync failed", { description: getErrorMessage(error) });
        if (mode === "initial") setSalesRunners([]);
      } finally {
        setLoadingSalesMarathon(false);
      }
    }, [persona]);

  const loadPersonalStats = useCallback(async (mode: "initial" | "refresh") => {
    if (!userId) {
      setLoadingEventHeadsUp(false);
      return;
    }

    const cacheKey = personalStatsCacheKey(persona, userId);
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
      const summary = await getDashboardPersonalSummary();
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
  }, [persona, userId]);

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
              className="relative z-10 h-[min(88dvh,58rem)] w-full max-w-[94rem] overflow-hidden rounded-3xl border border-white/18 bg-[oklch(0.17_0.02_246)] shadow-[0_36px_90px_-32px_rgba(0,0,0,0.9)]"
            >
              <div className="flex h-full min-h-0 flex-col">
                <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-6 py-4 sm:px-8">
                  <div>
                    <h2 className="text-xl font-medium tracking-[-0.02em] text-zinc-100">Stats</h2>
                    <p className="mt-1 text-sm text-zinc-400">Daily KPI tracker and your performance summary</p>
                  </div>
                  <button
                    type="button"
                    onClick={closeStatsModal}
                    className="inline-flex h-10 items-center rounded-full border border-white/14 bg-white/5 px-4 text-sm font-medium text-zinc-200 transition hover:bg-white/10"
                  >
                    Close
                  </button>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
                  <div className="space-y-8">
                    <SalesMarathon
                      runners={salesRunners}
                      loading={loadingSalesMarathon}
                      title={kpiCopy.title}
                      subtitle={kpiCopy.subtitle}
                      target={kpiCopy.target}
                      footnote={kpiCopy.footnote}
                    />
                    <CampaignHeadsUp
                      items={eventHeadsUp}
                      statuses={workflowStatuses}
                      loading={loadingEventHeadsUp}
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex justify-center">
        <div
          className="absolute bottom-0 h-[52dvh] w-[54rem] max-w-[88vw] rounded-full opacity-65 blur-[84px]"
          style={{
            background: "radial-gradient(ellipse at center, var(--dashboard-hero-glow) 0%, transparent 72%)",
          }}
        />
        <img
          src="/videos/BlockchainEventPromoconverted_1-ezgif.com-optimize%20(1).gif"
          alt="Animated dashboard visual"
          className="h-[74dvh] w-auto max-w-[92vw] object-contain object-bottom opacity-85"
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
            <span className="inline-flex h-10 items-center rounded-full border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-500">
              {getDateLabel()}
            </span>
            <Link
              href="/profile"
              className="group inline-flex items-center rounded-full transition"
              aria-label="Go to profile"
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
            <div className="mx-auto w-full max-w-5xl text-center">
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
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
