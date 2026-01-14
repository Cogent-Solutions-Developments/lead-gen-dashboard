"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Users, FileCheck, Rocket, Send } from "lucide-react";
import { getDashboardStats, type DashboardStats } from "@/lib/api";
import { toast } from "sonner";

type StatItem = {
  name: string;
  value: string;
  icon: any;
  label: string;
};

export function StatsCards() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const data = await getDashboardStats();
        if (!alive) return;
        setStats(data);
      } catch (err: any) {
        if (!alive) return;
        toast.error("Failed to load dashboard stats", { description: err.message });
        setStats(null);
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  const cards: StatItem[] = [
    {
      name: "Active Campaigns",
      value: loading ? "…" : String(stats?.activeCampaigns ?? 0),
      icon: Rocket,
      label: "Running now",
    },
    {
      name: "Total Leads",
      value: loading ? "…" : String(stats?.totalLeads ?? 0),
      icon: Users,
      label: "Scraped so far",
    },
    {
      name: "Pending Review",
      value: loading ? "…" : String(stats?.pendingReview ?? 0),
      icon: FileCheck,
      label: "Needs approval",
    },
    {
      name: "Leads Contacted",
      value: loading ? "…" : String(stats?.leadsContacted ?? 0),
      icon: Send,
      label: "Emails sent",
    },
  ];

  return (
    <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((stat, index) => (
        <motion.div
          key={stat.name}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1, duration: 0.4 }}
        >
          <Card className="group relative overflow-hidden rounded-xl border border-zinc-200 bg-white p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:border-zinc-300">
            <div className="flex justify-between items-start">
              <div className="space-y-4">
                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                  {stat.name}
                </span>

                <div className="space-y-1">
                  <span className="text-3xl font-bold tracking-tight text-zinc-900 block">
                    {stat.value}
                  </span>

                  <p className="text-xs font-medium text-zinc-400">{stat.label}</p>
                </div>
              </div>

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
