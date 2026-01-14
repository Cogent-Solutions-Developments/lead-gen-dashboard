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
    <div className="font-sans min-h-screen bg-transparent p-1">
      
      {/* 1. Header Section */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
      >
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Dashboard</h1>
          <p className="mt-1 text-md text-zinc-500">
            Welcome to supernizo campaigns
          </p>
        </div>
        
        <Link href="/campaigns/new">
          <Button className="h-10 bg-sidebar text-white shadow-sm hover:bg-sidebar/80">
            <Plus className="mr-2 h-4 w-4" />
            New Campaign
          </Button>
        </Link>
      </motion.div>

      {/* 2. Key Metrics */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <StatsCards />
      </motion.div>

      {/* 3. Main Content Grid */}
      {/* Items in this grid will now stretch to equal height */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mt-8 grid gap-8 lg:grid-cols-3"
      >
        {/* Left Column */}
        <div className="lg:col-span-2 h-full">
           <RecentCampaigns />
        </div>

        {/* Right Column */}
        <div className="lg:col-span-1 h-full">
           <LeadsBreakdown />
        </div>
      </motion.div>
    </div>
  );
}