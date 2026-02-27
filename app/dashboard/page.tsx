"use client";

import { motion } from "framer-motion";
import { Plus, User } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

import { StatsCards } from "@/components/dashboard/StatsCards";
import { RecentCampaigns } from "@/components/dashboard/RecentCampaigns";
import { LeadsBreakdown } from "@/components/dashboard/LeadsBreakdown";
import { RepliesOverviewCard } from "@/components/dashboard/RepliesOverviewCard";
import { usePersona } from "@/hooks/usePersona";

export default function DashboardPage() {
  const { persona } = usePersona();
  const personaLabel = persona === "delegates" ? "Delegates" : "Sales";

  return (
    <div className="font-sans flex h-[calc(100dvh-3rem)] flex-col overflow-y-auto bg-transparent p-1 lg:overflow-hidden">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-5 flex shrink-0 flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
      >
        <div>
          <p className="text-lg font-normal text-zinc-900">Hi! Welcome to</p>
          <h1 className="mt-0 text-2xl font-semibold tracking-tight text-zinc-900">
           supernizo {personaLabel} Dashboard
          </h1>
        </div>
        
        <div className="flex items-center gap-2">
          <Link href="/">
            <Button
              aria-label="Change user role"
              className="analytics-frost-btn h-10 w-10 p-0 shadow-[0_0_12px_-6px_rgba(2,10,27,0.62)] hover:shadow-[0_0_14px_-6px_rgba(2,10,27,0.72)]"
            >
              <User className="h-4 w-4" />
            </Button>
          </Link>

          <Link href="/campaigns/new">
            <Button className="btn-sidebar-noise h-10">
              <Plus className="h-4 w-4" />
              New Campaign
            </Button>
          </Link>
        </div>
      </motion.div>

      {/* Main layout */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mt-5 grid min-h-0 flex-1 gap-5 lg:grid-cols-[minmax(0,2.8fr)_minmax(0,1fr)]"
      >
        {/* Left column: compact stats + recent campaigns */}
        <div className="flex h-full min-h-0 flex-col gap-5">
          <div className="shrink-0 lg:h-32">
            <StatsCards />
          </div>
          <div className="min-h-0 flex-1">
            <RecentCampaigns />
          </div>
        </div>

        {/* Right column: reserved slots + lead breakdown */}
        <div className="flex h-full min-h-0 flex-col gap-5">
          <div className="shrink-0 lg:h-32">
            <RepliesOverviewCard />
          </div>
          <div className="min-h-0 flex-1">
            <LeadsBreakdown />
          </div>
        </div>
      </motion.div>
    </div>
  );
}
