"use client";

import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Rocket, Clock, FileCheck, Users } from "lucide-react";

const stats = [
  {
    name: "Total Leads",
    value: "1,429",
    icon: Users,
  },
  {
    name: "Active Campaigns",
    value: "12",
    icon: Rocket,
  },
  {
    name: "Pending Approval",
    value: "28",
    icon: FileCheck,
  },
  {
    name: "Queue Depth",
    value: "5",
    icon: Clock,
  },
];

export function StatsCards() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat, index) => (
        <motion.div
          key={stat.name}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1, duration: 0.4 }}
        >
          <Card className="flex flex-col justify-between rounded-xl border border-zinc-200 bg-white p-6 shadow-none transition-all hover:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                {stat.name}
              </span>
              <stat.icon className="h-4 w-4 text-zinc-400" />
            </div>
            <div className="mt-4">
              <span className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                {stat.value}
              </span>
            </div>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}