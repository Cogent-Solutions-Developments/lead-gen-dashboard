"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import Image from "next/image";
import Link from "next/link";
import { Bungee_Hairline } from "next/font/google";
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
import { EncryptedText } from "@/components/ui/encrypted-text";
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

function PixelAvatar({ colorHex, seed }: { colorHex: string; seed: string }) {
  const url = `https://api.dicebear.com/9.x/identicon/svg?seed=${encodeURIComponent(seed)}&rowColor=${colorHex.replace('#', '')}&backgroundColor=transparent`;
  return (
    <div className="w-6 h-6 overflow-hidden">
      <img 
        src={url} 
        alt="Identicon" 
        className="w-full h-full object-contain"
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
}: {
  runners: SalesMarathonRunner[];
  loading: boolean;
  title: string;
  subtitle: string;
  target: number;
  footnote: string;
}) {
  const loadingBars = [68, 44, 82, 56, 72, 36, 62];
  const barPalette = [
    { bg: "bg-[#2977e7]", hex: "2977e7" },
    { bg: "bg-emerald-500", hex: "10b981" },
    { bg: "bg-amber-500", hex: "f59e0b" },
    { bg: "bg-rose-500", hex: "f43f5e" },
    { bg: "bg-indigo-500", hex: "6366f1" },
    { bg: "bg-teal-500", hex: "14b8a6" },
    { bg: "bg-orange-500", hex: "f97316" },
  ];

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
        ) : runners.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center text-sm font-light text-zinc-400 italic">
            No active records for the current period.
          </div>
        ) : (
          runners.map((runner, index) => {
            const progress = Math.min(runner.proposalCount / target, 1);
            const colorItem = barPalette[index % barPalette.length];
            return (
              <div key={runner.id} className="group relative flex h-full flex-1 flex-col items-center justify-end">
                <div className="mb-4 flex flex-col items-center gap-1">
                  <span className="text-2xl font-extralight text-zinc-950">
                    {runner.proposalCount}
                  </span>
                </div>

                <div className="relative h-full w-8 bg-zinc-100 overflow-hidden">
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${progress * 100}%` }}
                    transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
                    className={`absolute bottom-0 w-full ${colorItem.bg}`}
                  />
                  {/* Grid markers */}
                  <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="w-full h-[1px] bg-white/20" />
                    ))}
                  </div>
                </div>

                <div className="mt-6 flex flex-col items-center gap-3">
                  <PixelAvatar colorHex={colorItem.hex} seed={runner.id} />
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
  const quoteContainerRef = useRef<HTMLDivElement>(null);
  const [salesRunners, setSalesRunners] = useState<SalesMarathonRunner[]>([]);
  const [loadingSalesMarathon, setLoadingSalesMarathon] = useState(true);
  const [eventHeadsUp, setEventHeadsUp] = useState<EventHeadsUpItem[]>([]);
  const [workflowStatuses, setWorkflowStatuses] = useState<WorkflowStatusDefinitionItem[]>(FALLBACK_WORKFLOW_STATUSES);
  const [loadingEventHeadsUp, setLoadingEventHeadsUp] = useState(true);
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

  return (
    <div className="relative h-[100dvh] max-h-[100dvh] overflow-hidden bg-transparent font-sans text-zinc-950">
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex justify-center">
        <div
          className="absolute bottom-0 h-[52dvh] w-[54rem] max-w-[88vw] rounded-full opacity-65 blur-[84px]"
          style={{
            background: "radial-gradient(ellipse at center, var(--dashboard-hero-glow) 0%, transparent 72%)",
          }}
        />
        <Image
          src="/humnoid.webp"
          alt="Humanoid"
          width={1223}
          height={1536}
          priority
          className="h-[68dvh] w-auto max-w-[88vw] object-contain object-bottom opacity-85"
        />
      </div>

      <div className="relative z-20 flex h-full min-h-0 flex-col px-6 py-6 lg:px-10 lg:py-7 xl:px-12">
        <div className="flex shrink-0 items-center justify-between gap-4">
          <div className="inline-flex items-center">
            <div className="h-12 w-12">
              <Image
                src="/logoh-v2.webp"
                alt="supernizo HEAVY"
                width={48}
                height={48}
                className="h-full w-full object-contain"
                priority
              />
            </div>
            <p className="ml-0.5 text-base tracking-[-0.015em]" style={{ color: "oklch(0.9 0.01 250)" }}>
              <span className="font-normal">supernizo </span>
              <span className={`${bungeeHairline.className} text-[1.08em]`}>HEAVY</span>
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

        <div className="mt-8 grid min-h-0 flex-1 items-stretch gap-6 text-left">
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
                  <EncryptedText
                    text={manifesto}
                    revealDelayMs={68}
                    flipDelayMs={90}
                    encryptedClassName="dashboard-quote-encrypted"
                    revealedClassName="dashboard-quote-revealed"
                    revealedContent={
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
