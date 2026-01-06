"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, LayoutTemplate } from "lucide-react";

const campaigns = [
  {
    id: "1",
    name: "12th MICT Forum Qatar",
    status: "active",
    leads: 156,
  },
  {
    id: "2",
    name: "AIM Nigeria - Oil & Gas",
    status: "completed",
    leads: 234,
  },
  {
    id: "3",
    name: "Global Stadiums Congress",
    status: "active", // Changed to active
    leads: 89,
  },
];

const statusStyles = {
  // Uses your 'sidebar-primary' neon green for the Active state
  active: "bg-sidebar-primary/15 text-emerald-900 border-sidebar-primary/20 dark:text-white dark:border-sidebar-primary/50",
  completed: "bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700",
};

export function RecentCampaigns() {
  return (
    <Card className="flex flex-col rounded-xl border border-zinc-200 bg-white shadow-none dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex items-center justify-between border-b border-zinc-100 p-6 py-5 dark:border-zinc-900">
        <div>
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Recent Campaigns</h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Your latest outreach campaigns</p>
        </div>
      </div>

      <div className="divide-y divide-zinc-100 dark:divide-zinc-900">
        {campaigns.map((campaign) => (
          <button
            key={campaign.id}
            className="group flex w-full items-center justify-between p-5 text-left transition-all hover:bg-zinc-50/80 dark:hover:bg-zinc-900/80"
          >
            <div className="flex items-center gap-4">
              {/* Icon Container: Lights up Neon Green on hover */}
              <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 text-zinc-500 transition-colors group-hover:border-sidebar-primary group-hover:text-sidebar-primary group-hover:bg-sidebar-primary/5 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
                <LayoutTemplate className="h-5 w-5" />
              </div>

              <div className="space-y-0.5">
                <h4 className="font-medium text-zinc-900 dark:text-zinc-50">
                  {campaign.name}
                </h4>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  <span className="font-medium text-zinc-700 dark:text-zinc-300">{campaign.leads}</span> leads generated
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <Badge
                className={`rounded-full px-2.5 font-normal shadow-none border ${statusStyles[campaign.status as keyof typeof statusStyles]}`}
              >
                {campaign.status}
              </Badge>
              <ChevronRight className="h-4 w-4 text-zinc-300 transition-transform group-hover:translate-x-0.5 group-hover:text-zinc-500 dark:text-zinc-700" />
            </div>
          </button>
        ))}
      </div>
    </Card>
  );
}