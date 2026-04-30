"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Clock3, Plus, User } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

import { StatsCards } from "@/components/dashboard/StatsCards";
import { RecentCampaigns } from "@/components/dashboard/RecentCampaigns";
import { RecentEvents } from "@/components/dashboard/RecentEvents";
import { LeadsBreakdown } from "@/components/dashboard/LeadsBreakdown";
import { RepliesOverviewCard } from "@/components/dashboard/RepliesOverviewCard";
import { usePersona } from "@/hooks/usePersona";
import { useAuth } from "@/hooks/useAuth";
import { getCachedAuthUserDisplayName } from "@/lib/auth";

function CalendarLineIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth="1.5"
      stroke="currentColor"
      className={className}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6.75 2.994v2.25m10.5-2.25v2.25m-14.252 13.5V7.491a2.25 2.25 0 0 1 2.25-2.25h13.5a2.25 2.25 0 0 1 2.25 2.25v11.251m-18 0a2.25 2.25 0 0 0 2.25 2.25h13.5a2.25 2.25 0 0 0 2.25-2.25m-18 0v-7.5a2.25 2.25 0 0 1 2.25-2.25h13.5a2.25 2.25 0 0 1 2.25 2.25v7.5m-6.75-6h2.25m-9 2.25h4.5m.002-2.25h.005v.006H12v-.006Zm-.001 4.5h.006v.006h-.006v-.005Zm-2.25.001h.005v.006H9.75v-.006Zm-2.25 0h.005v.005h-.006v-.005Zm6.75-2.247h.005v.005h-.005v-.005Zm0 2.247h.006v.006h-.006v-.006Zm2.25-2.248h.006V15H16.5v-.005Z"
      />
    </svg>
  );
}

function TodayBadge() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const update = () => setNow(new Date());

    update();
    const timer = window.setInterval(update, 60_000);

    return () => window.clearInterval(timer);
  }, []);

  const date = now
    ? now.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
    : "...";
  const time = now
    ? now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
    : "...";

  return (
    <div className="inline-flex h-11 max-w-full items-center gap-2.5 rounded-full border border-white/85 bg-[linear-gradient(135deg,rgba(255,255,255,0.96)_0%,rgba(248,251,255,0.88)_52%,rgba(239,246,255,0.82)_100%)] px-2.5 pr-3 text-sm font-semibold text-zinc-800 shadow-[0_18px_34px_-28px_rgba(15,23,42,0.72),0_3px_8px_-7px_rgba(37,99,235,0.48),inset_0_1px_0_rgba(255,255,255,1),inset_0_-1px_0_rgba(214,226,244,0.68)] backdrop-blur-[14px]">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200/90 bg-white text-slate-700 shadow-[inset_0_1px_0_rgba(255,255,255,1),0_6px_14px_-12px_rgba(15,23,42,0.8)]">
        <CalendarLineIcon className="h-4.5 w-4.5" />
      </span>
      <span className="flex min-w-0 flex-col leading-none">
        <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400">Today</span>
        <span className="mt-1 truncate text-[13px] font-semibold text-slate-800">{date}</span>
      </span>
      <span className="ml-0.5 flex h-7 shrink-0 items-center gap-1.5 rounded-full bg-[linear-gradient(135deg,#60a5fa_0%,#2563eb_52%,#174fc7_100%)] px-2.5 text-[11px] font-semibold text-white shadow-[0_8px_16px_-13px_rgba(37,99,235,0.72),inset_0_1px_0_rgba(255,255,255,0.24)]">
        <Clock3 className="h-3 w-3 text-white/82" />
        {time}
      </span>
    </div>
  );
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

export default function DashboardPage() {
  const { persona } = usePersona();
  const { isSuperAdmin, user } = useAuth();
  const personaText = persona === "delegates" ? "delegates" : persona === "production" ? "production" : "sales";
  const displayName = getDisplayName(user);
  const isSalesDashboard = persona === "sales";
  const mainGridClass = isSalesDashboard
    ? isSuperAdmin
      ? "mt-5 grid min-h-0 flex-1 gap-5 lg:grid-cols-[minmax(0,2.8fr)_minmax(16rem,0.9fr)]"
      : "mt-5 grid min-h-0 flex-1 gap-5 lg:grid-cols-1"
    : "mt-5 grid min-h-0 flex-1 gap-5 lg:grid-cols-[minmax(0,2.8fr)_minmax(0,1fr)]";

  return (
    <div className="font-sans flex h-[calc(100dvh-3rem)] flex-col overflow-y-auto bg-transparent p-1 lg:overflow-hidden">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-5 flex shrink-0 flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
      >
        <div>
          <p className="text-lg font-normal text-zinc-900">Hi {displayName}!</p>
          <h1 className="mt-0 text-2xl font-semibold tracking-tight text-zinc-900">
           Welcome to supernizo for {personaText}
          </h1>
        </div>
        
        <div className="flex flex-wrap items-center justify-start gap-2 sm:justify-end">
          <TodayBadge />

          {isSuperAdmin ? (
            <Link href="/">
              <Button
                aria-label="Change user role"
                className="analytics-frost-btn h-10 w-10 p-0 shadow-[0_0_12px_-6px_rgba(2,10,27,0.62)] hover:shadow-[0_0_14px_-6px_rgba(2,10,27,0.72)]"
              >
                <User className="h-4 w-4" />
              </Button>
            </Link>
          ) : null}

          {isSuperAdmin ? (
            <Link href="/campaigns/new">
              <Button className="btn-sidebar-noise h-10">
                <Plus className="h-4 w-4" />
                New Campaign
              </Button>
            </Link>
          ) : null}
        </div>
      </motion.div>

      {/* Main layout */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className={mainGridClass}
      >
        {/* Left column: compact stats + recent campaigns */}
        <div className="flex h-full min-h-0 flex-col gap-5">
          {!isSalesDashboard ? (
            <div className="shrink-0 lg:h-32">
              <StatsCards />
            </div>
          ) : null}
          <div className="min-h-0 flex-1">
            {isSuperAdmin ? <RecentCampaigns /> : <RecentEvents />}
          </div>
        </div>

        {isSuperAdmin || !isSalesDashboard ? (
          <div className="flex h-full min-h-0 flex-col gap-5 lg:self-start">
            {isSuperAdmin ? (
              <div className={isSalesDashboard ? "shrink-0" : "shrink-0 lg:h-32"}>
                <RepliesOverviewCard />
              </div>
            ) : null}
            {!isSalesDashboard ? (
              <div className="min-h-0 flex-1">
                <LeadsBreakdown />
              </div>
            ) : null}
          </div>
        ) : null}
      </motion.div>
    </div>
  );
}
