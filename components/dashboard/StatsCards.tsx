"use client";

import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Users, FileCheck, Rocket, Send } from "lucide-react";

const stats = [
  {
    name: "Active Campaigns",
    value: "4",
    icon: Rocket,
    label: "Running now",
  },
  {
    name: "Total Leads",
    value: "1,429",
    icon: Users,
    label: "Scraped so far",
  },
  {
    name: "Pending Review",
    value: "28",
    icon: FileCheck,
    label: "Needs approval",
    // Removed "highlight: true" - keeping it standard
  },
  {
    name: "Leads Contacted",
    value: "842",
    icon: Send,
    label: "Emails sent",
  },
];

export function StatsCards() {
  return (
    <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat, index) => (
        <motion.div
          key={stat.name}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1, duration: 0.4 }}
        >
          {/* Uniform Card Design for all items */}
          <Card className="group relative overflow-hidden rounded-xl border border-zinc-200 bg-white p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:border-zinc-300">
            
            <div className="flex justify-between items-start">
              {/* Data Section */}
              <div className="space-y-4">
                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                  {stat.name}
                </span>
                
                <div className="space-y-1">
                  <span className="text-3xl font-bold tracking-tight text-zinc-900 block">
                    {stat.value}
                  </span>
                  
                  <p className="text-xs font-medium text-zinc-400">
                    {stat.label}
                  </p>
                </div>
              </div>

              {/* Icon Container - Uniform Style */}
              <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-100 bg-zinc-50 text-zinc-400 transition-colors group-hover:border-zinc-200 group-hover:text-zinc-600">
                <stat.icon className="h-5 w-5" />
              </div>
            </div>

          </Card>
        </motion.div>
      ))}
    </div>
  );
}