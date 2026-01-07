"use client";

import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Users, FileCheck, Rocket, Send } from "lucide-react";

const stats = [
  {
    name: "Active Campaigns",
    value: "4",
    icon: Rocket,
    description: "Engines running",
  },
  {
    name: "Total Leads",
    value: "1,429",
    icon: Users,
    description: "Scraped candidates",
  },
  {
    name: "Pending Review",
    value: "28",
    icon: FileCheck,
    description: "Requires approval",
    action: true, // Highlights this card as a "To-Do"
  },
  {
    name: "Leads Contacted",
    value: "842",
    icon: Send,
    description: "Outreach sent",
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
          <Card className={`flex flex-col justify-between rounded-xl border bg-white p-6 shadow-sm transition-all hover:border-zinc-300 ${
            stat.action 
              ? "border-zinc-300 ring-1 ring-zinc-100" // Subtle highlight for Action Item
              : "border-zinc-200"
          }`}>
            
            {/* Header: Label + Icon */}
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                {stat.name}
              </span>
              <stat.icon className={`h-4 w-4 ${
                  stat.action ? "text-zinc-900" : "text-zinc-400"
              }`} />
            </div>

            {/* Value + Description */}
            <div className="mt-4">
              <span className="text-3xl font-bold tracking-tight text-zinc-900">
                {stat.value}
              </span>
              <p className="mt-1 text-xs font-medium text-zinc-400">
                {stat.description}
              </p>
            </div>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}