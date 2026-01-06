"use client";

import { motion } from "framer-motion";
import { StatsCards } from "@/components/dashboard/StatsCards";
import { QueueStatus } from "@/components/dashboard/QueueStatus";
import { RecentCampaigns } from "@/components/dashboard/RecentCampaigns";

export default function DashboardPage() {
  return (
    <div>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="mb-6 text-slate-500">Welcome to SuperNizor</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <StatsCards />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mt-6 grid gap-6 lg:grid-cols-2"
      >
        <QueueStatus />
        <RecentCampaigns />
      </motion.div>
    </div>
  );
}