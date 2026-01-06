"use client";

import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Rocket, Clock, CheckCircle, Users } from "lucide-react";

const stats = [
  {
    name: "Total Campaigns",
    value: "12",
    icon: Rocket,
    color: "bg-blue-100 text-blue-600",
  },
  {
    name: "In Queue",
    value: "3",
    icon: Clock,
    color: "bg-amber-100 text-amber-600",
  },
  {
    name: "Completed",
    value: "8",
    icon: CheckCircle,
    color: "bg-emerald-100 text-emerald-600",
  },
  {
    name: "Total Leads",
    value: "1,429",
    icon: Users,
    color: "bg-violet-100 text-violet-600",
  },
];

export function StatsCards() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat, index) => (
        <motion.div
          key={stat.name}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          whileHover={{ scale: 1.02 }}
        >
          <Card className="p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">{stat.name}</p>
                <p className="mt-1 text-3xl font-bold text-slate-900">{stat.value}</p>
              </div>
              <div className={`rounded-lg p-3 ${stat.color}`}>
                <stat.icon className="h-6 w-6" />
              </div>
            </div>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}