"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { usePersona } from "@/hooks/usePersona";
import { getAuthHeader, getCachedAuthUserDisplayName } from "@/lib/auth";

type SalesMarathonRunner = {
  id: string;
  name: string;
  initials: string;
  proposalCount: number;
  lane: number;
};

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
  const response = await fetch("/api/sales-marathon/leaderboard", {
    headers: getAuthHeader(),
  });
  if (!response.ok) throw new Error("Failed to load sales marathon.");
  const data = await response.json() as { runners?: SalesMarathonRunner[] };
  return Array.isArray(data.runners) ? data.runners : [];
}

// Disabled for now. Flip this back to true when the dashboard mascot intro is ready to use.
const ENABLE_DASHBOARD_MASCOT_INTRO = false;

function SalesMarathon({
  runners,
  loading,
}: {
  runners: SalesMarathonRunner[];
  loading: boolean;
}) {
  const dailyTarget = 5;
  const laneStyles = [
    {
      rail: "bg-[#2977e7]",
      glow: "shadow-[0_0_24px_rgba(41,119,231,0.28)]",
      token: "bg-[#2977e7] text-white",
    },
    {
      rail: "bg-[#00c7d9]",
      glow: "shadow-[0_0_24px_rgba(0,199,217,0.28)]",
      token: "bg-[#00c7d9] text-zinc-950",
    },
    {
      rail: "bg-[#7c6df2]",
      glow: "shadow-[0_0_24px_rgba(124,109,242,0.28)]",
      token: "bg-[#7c6df2] text-white",
    },
  ];

  return (
    <section className="relative min-h-[31rem] overflow-hidden border border-zinc-300 bg-white px-7 py-6 shadow-[0_32px_90px_-66px_rgba(2,10,27,0.75)]">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(2,10,27,0.035)_1px,transparent_1px),linear-gradient(180deg,rgba(2,10,27,0.035)_1px,transparent_1px)] bg-[size:26px_26px]" />
      <div className="relative flex items-start justify-between gap-6 border-b border-zinc-200 pb-5">
        <div>
          <p className="text-sm font-medium text-zinc-400">Daily KPI Leaderboard</p>
          <h2
            className="mt-2 text-6xl leading-none tracking-normal text-zinc-950 drop-shadow-[3px_3px_0_rgba(41,119,231,0.16)]"
            style={{ fontFamily: "var(--font-jersey-10)" }}
          >
            Sales Marathon
          </h2>
        </div>
      </div>

      <div className="relative mt-7 h-[23rem] overflow-hidden border border-zinc-200 bg-[#f7f7f7]">
        <div className="absolute inset-x-5 top-5 flex items-center justify-between">
          <span className="border border-zinc-300 bg-white px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
            Start
          </span>
          <span className="border border-zinc-950 bg-zinc-950 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white">
            Finish
          </span>
        </div>

        <div className="absolute left-5 top-1/2 -translate-y-1/2 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
          Target {dailyTarget}
        </div>

        <div className="absolute inset-x-7 bottom-16 top-14">
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center text-sm font-light text-zinc-400">
              Loading marathon...
            </div>
          ) : runners.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center text-center text-sm font-light leading-6 text-zinc-400">
              No sales runners found yet.
            </div>
          ) : (
            <div
              className="relative grid h-full gap-6"
              style={{ gridTemplateColumns: `repeat(${runners.length}, minmax(4.75rem, 1fr))` }}
            >
              {runners.map((runner, index) => {
                const progress = Math.min(runner.proposalCount / dailyTarget, 1);
                const top = 88 - progress * 78;
                const laneStyle = laneStyles[index % laneStyles.length];

                return (
                  <div key={runner.id} className="relative flex justify-center">
                    <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-zinc-300/70" />
                    <div className={`h-full w-4 rounded-full ${laneStyle.rail} ${laneStyle.glow} opacity-85`} />
                    <div className="absolute inset-x-0 top-[20%] border-t border-dashed border-white/80" />
                    <div className="absolute inset-x-0 top-[40%] border-t border-dashed border-white/80" />
                    <div className="absolute inset-x-0 top-[60%] border-t border-dashed border-white/80" />
                    <div className="absolute inset-x-0 top-[80%] border-t border-dashed border-white/80" />

                    <motion.div
                      initial={{ opacity: 0, scale: 0.82, y: 18 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      transition={{ delay: index * 0.05, duration: 0.35 }}
                      className="absolute z-10 flex -translate-x-1/2 flex-col items-center gap-2"
                      style={{ left: "50%", top: `${top}%` }}
                    >
                      <div className={`flex h-14 w-14 items-center justify-center rounded-full border-2 border-zinc-950 text-xl font-black tabular-nums shadow-[0_16px_30px_-18px_rgba(2,10,27,0.9)] ${laneStyle.token}`}>
                        {runner.proposalCount}
                      </div>
                      <div className="min-w-24 border border-zinc-200 bg-white/95 px-2 py-1.5 text-center shadow-[0_10px_22px_-20px_rgba(2,10,27,0.8)]">
                        <p className="truncate text-xs font-semibold text-zinc-800">{firstName(runner.name)}</p>
                        <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
                          {runner.proposalCount}/{dailyTarget}
                        </p>
                      </div>
                    </motion.div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="absolute inset-x-7 bottom-5 border-t-2 border-zinc-950" />
      </div>
    </section>
  );
}

function DashboardMascotIntro() {
  return (
    <motion.div
      className="pointer-events-none absolute inset-x-0 bottom-0 z-0 overflow-hidden"
      style={{ height: "100%" }}
      initial={{ opacity: 0, y: 70, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 80, scale: 0.985 }}
      transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
      aria-hidden="true"
    >
      {/* Outer halo */}
      <div
        className="absolute bottom-0 rounded-full"
        style={{
          width: "74vw",
          aspectRatio: "1",
          left: "50%",
          transform: "translate(-50%, 58%)",
        }}
      >
        <div className="dashboard-mascot-halo h-full w-full rounded-full bg-[rgba(41,119,231,0.16)]" />
      </div>
      {/* Middle halo */}
      <div
        className="absolute bottom-0 rounded-full"
        style={{
          width: "58vw",
          aspectRatio: "1",
          left: "50%",
          transform: "translate(-50%, 58%)",
        }}
      >
        <div className="dashboard-mascot-halo dashboard-mascot-halo-secondary h-full w-full rounded-full bg-[rgba(41,119,231,0.28)]" />
      </div>
      {/* Inner face */}
      <div
        className="absolute bottom-0 rounded-full"
        style={{
          width: "47vw",
          aspectRatio: "1",
          left: "50%",
          transform: "translate(-50%, 58%)",
        }}
      >
        <div className="dashboard-mascot-face h-full w-full rounded-full bg-[#2977e7]" />
      </div>

      {/* Face features (eyes + smile) */}
      <svg
        viewBox="-80 -42 160 105"
        className="dashboard-mascot absolute"
        style={{
          bottom: "12%",
          left: "50%",
          transform: "translateX(-50%)",
          width: "clamp(140px, 13vw, 220px)",
        }}
        role="img"
      >
        <g className="dashboard-mascot-expression">
          <g>
            {/* Left eye */}
            <g transform="translate(-30 0)">
              <g className="dashboard-mascot-eye">
                <circle cx="0" cy="0" r="29" fill="#ffffff" stroke="#050505" strokeWidth="3" />
                <g className="dashboard-mascot-pupil">
                  <circle cx="6" cy="0" r="17" fill="#050505" />
                  <circle cx="0" cy="-7" r="4.5" fill="#ffffff" opacity="0.92" />
                </g>
              </g>
            </g>
            {/* Right eye */}
            <g transform="translate(30 0)">
              <g className="dashboard-mascot-eye dashboard-mascot-eye-right">
                <circle cx="0" cy="0" r="29" fill="#ffffff" stroke="#050505" strokeWidth="3" />
                <g className="dashboard-mascot-pupil dashboard-mascot-pupil-right">
                  <circle cx="6" cy="0" r="17" fill="#050505" />
                  <circle cx="0" cy="-7" r="4.5" fill="#ffffff" opacity="0.92" />
                </g>
              </g>
            </g>
          </g>
          {/* Smile */}
          <motion.path
            className="dashboard-mascot-smile"
            d="M-22 42C-8 56 8 56 22 42"
            animate={{
              d: [
                "M-20 43C-8 52 8 52 20 43",
                "M-26 40C-10 62 10 62 26 40",
                "M-22 42C-8 56 8 56 22 42",
              ],
            }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
            fill="none"
            stroke="#050505"
            strokeLinecap="round"
            strokeWidth="5"
          />
        </g>
      </svg>
    </motion.div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { persona } = usePersona();
  const [salesRunners, setSalesRunners] = useState<SalesMarathonRunner[]>([]);
  const [loadingSalesMarathon, setLoadingSalesMarathon] = useState(true);
  const [showMascotIntro, setShowMascotIntro] = useState(false);
  const displayName = firstName(getDisplayName(user));
  const greeting = getTimeGreeting();
  const workspaceLabel = persona === "delegates" ? "Delegates" : persona === "production" ? "Production" : "Sales";
  const workLabel = persona === "delegates" ? "delegate" : persona === "production" ? "production" : "sales";

  useEffect(() => {
    let alive = true;

    async function loadDashboard() {
      setLoadingSalesMarathon(true);
      try {
        const runners = await listSalesMarathonLeaderboard();

        if (!alive) return;
        setSalesRunners(runners);
      } catch (error) {
        if (!alive) return;
        toast.error("Dashboard sync failed", { description: getErrorMessage(error) });
        setSalesRunners([]);
      } finally {
        if (alive) setLoadingSalesMarathon(false);
      }
    }

    void loadDashboard();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!ENABLE_DASHBOARD_MASCOT_INTRO) return;

    const revealTimeout = window.setTimeout(() => setShowMascotIntro(true), 0);
    const hideTimeout = window.setTimeout(() => setShowMascotIntro(false), 5000);
    return () => {
      window.clearTimeout(revealTimeout);
      window.clearTimeout(hideTimeout);
    };
  }, []);

  return (
    <div className="flex min-h-screen flex-1 flex-col overflow-hidden bg-[#f7f7f7] font-sans text-zinc-950">
      <header className="relative isolate min-h-screen w-full overflow-hidden px-8 py-7 lg:px-12">
        <AnimatePresence>
          {ENABLE_DASHBOARD_MASCOT_INTRO && showMascotIntro ? <DashboardMascotIntro /> : null}
        </AnimatePresence>

        <div className="relative z-10 flex w-full justify-end">
          <span className="inline-flex h-9 items-center rounded-full border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-500">
            {getDateLabel()}
          </span>
        </div>

        <div className="relative z-10 mt-16 grid items-start gap-10 text-left xl:grid-cols-[minmax(0,1fr)_32rem]">
          <motion.div
            initial={false}
            animate={showMascotIntro ? { opacity: 0, y: 18 } : { opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-4xl"
          >
            <p className="mb-4 text-lg font-normal text-zinc-500">
              {workspaceLabel} Workspace
            </p>

            <h1 className="text-5xl font-light leading-[1.08] tracking-[-0.04em] text-zinc-950 sm:text-6xl">
              {greeting}, {displayName}. Here is where {workLabel} work starts.
            </h1>

            <p className="mt-6 max-w-3xl text-xl font-light leading-relaxed text-zinc-500">
              Choose an event, run NizoAI, upload leads, or move directly into the lead sheet.
            </p>
          </motion.div>

          <SalesMarathon runners={salesRunners} loading={loadingSalesMarathon} />
        </div>
      </header>
    </div>
  );
}
