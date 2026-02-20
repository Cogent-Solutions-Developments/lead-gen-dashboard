"use client";

import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

import { StatsCards } from "@/components/dashboard/StatsCards";
import { RecentCampaigns } from "@/components/dashboard/RecentCampaigns";
import { LeadsBreakdown } from "@/components/dashboard/LeadsBreakdown";

export default function DashboardPage() {
  return (
    <div className="font-sans flex h-[calc(100dvh-3rem)] flex-col overflow-y-auto bg-transparent p-1 lg:overflow-hidden">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-5 flex shrink-0 flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
      >
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Dashboard</h1>
          <p className="mt-1 text-md text-zinc-500">
            Welcome to supernizo campaigns
          </p>
        </div>
        
        <Link href="/campaigns/new">
          <Button className="btn-sidebar-noise h-10">
            <Plus className="h-4 w-4" />
            New Campaign
          </Button>
        </Link>
      </motion.div>

      {/* Main layout */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mt-5 grid min-h-0 flex-1 gap-5 lg:grid-cols-3"
      >
        {/* Left column: compact stats + recent campaigns */}
        <div className="flex h-full min-h-0 flex-col gap-5 lg:col-span-2">
          <div className="shrink-0 lg:h-32">
            <StatsCards />
          </div>
          <div className="min-h-0 flex-1">
            <RecentCampaigns />
          </div>
        </div>

        {/* Right column: reserved slots + lead breakdown */}
        <div className="flex h-full min-h-0 flex-col gap-5 lg:col-span-1">
          <div className="grid shrink-0 grid-cols-1 gap-4 lg:h-32 lg:grid-rows-2">
            <div className="h-20 rounded-2xl border border-dashed border-slate-200/70 bg-white/30 lg:h-auto" />
            <div className="h-20 rounded-2xl border border-dashed border-slate-200/70 bg-white/30 lg:h-auto" />
          </div>
          <div className="min-h-0 flex-1">
            <LeadsBreakdown />
          </div>
        </div>
      </motion.div>
    </div>
  );
}
