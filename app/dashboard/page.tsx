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
}: {
  runners: SalesMarathonRunner[];
  loading: boolean;
}) {
  const dailyTarget = 5;
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
          <h2 className="text-4xl font-light tracking-tight text-zinc-950">
            Daily KPI Tracker
          </h2>
          <p className="mt-3 text-sm font-light text-zinc-500">
            5 proposals a day keeps the sales stress far away.
          </p>
        </div>
      </div>

      <div className="relative mt-12 flex h-80 items-end justify-between gap-4">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center text-sm font-light text-zinc-400 italic">
            Synchronizing records...
          </div>
        ) : runners.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center text-sm font-light text-zinc-400 italic">
            No active records for the current period.
          </div>
        ) : (
          runners.map((runner, index) => {
            const progress = Math.min(runner.proposalCount / dailyTarget, 1);
            const colorItem = barPalette[index % barPalette.length];
            return (
              <div key={runner.id} className="group relative flex h-full flex-1 flex-col items-center justify-end">
                <div className="mb-4 flex flex-col items-center gap-1">
                  <span className="text-2xl font-extralight text-zinc-950">
                    {runner.proposalCount}
                  </span>
                </div>

                <div className="relative w-full flex-1 bg-zinc-100">
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
          * This data reflects the total number of proposals sent within the last 24-hour cycle.
        </p>
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
