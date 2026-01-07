"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, LayoutTemplate, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const campaigns = [
  { id: "1", name: "12th MICT Forum Qatar", status: "active", leads: 156 },
  { id: "2", name: "AIM Nigeria - Oil & Gas", status: "completed", leads: 234 },
  { id: "3", name: "Global Stadiums Congress", status: "active", leads: 89 },
  { id: "4", name: "Saudi Health Expo", status: "draft", leads: 0 },
  { id: "5", name: "Dubai Fintech Summit", status: "completed", leads: 412 },
  { id: "6", name: "Hidden Campaign", status: "draft", leads: 0 },
  { id: "7", name: "Another Campaign", status: "draft", leads: 0 },
];

const statusStyles = {
  active: "bg-sidebar-primary/15 text-emerald-900 border-sidebar-primary/20",
  completed: "bg-zinc-100 text-zinc-700 border-zinc-200",
  draft: "bg-zinc-50 text-zinc-500 border-zinc-100 dashed border-zinc-200",
};

export function RecentCampaigns() {
  return (
    // Fixed Height to match neighbor
    <Card className="flex flex-col h-[450px] rounded-xl border border-zinc-200 bg-white shadow-none">
      
      {/* Header (Fixed at Top) */}
      <div className="flex shrink-0 items-center justify-between border-b border-zinc-100 p-6 py-5">
        <div>
          <h3 className="text-lg font-semibold text-zinc-900">Recent Campaigns</h3>
          <p className="text-sm text-zinc-500">Your latest outreach campaigns</p>
        </div>
      </div>

      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto min-h-0 scrollbar-thin scrollbar-thumb-zinc-200 scrollbar-track-transparent">
        <div className="divide-y divide-zinc-100">
          {campaigns.map((campaign) => (
            <button
              key={campaign.id}
              className="group flex w-full items-center justify-between p-5 text-left transition-all hover:bg-zinc-50"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 text-zinc-500 transition-colors group-hover:border-sidebar-primary group-hover:text-sidebar-primary group-hover:bg-sidebar-primary/5">
                  <LayoutTemplate className="h-5 w-5" />
                </div>

                <div className="space-y-0.5 min-w-0">
                  <h4 className="font-medium text-zinc-900 truncate pr-4">
                    {campaign.name}
                  </h4>
                  <p className="text-xs text-zinc-500">
                    <span className="font-medium text-zinc-700">{campaign.leads}</span> leads generated
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 shrink-0">
                <Badge
                  className={`rounded-full px-2.5 font-normal shadow-none border ${statusStyles[campaign.status as keyof typeof statusStyles]}`}
                >
                  {campaign.status}
                </Badge>
                <ChevronRight className="h-4 w-4 text-zinc-300 transition-transform group-hover:translate-x-0.5 group-hover:text-zinc-500" />
              </div>
            </button>
          ))}
          
          {/* View More Button (Inside the scrollable area, at the bottom) */}
          <div className="p-3">
            <Link href="/campaigns" className="w-full">
              <Button 
                variant="ghost" 
                className="w-full justify-between h-12 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50 border border-transparent hover:border-zinc-200"
              >
                <span className="text-sm font-medium ml-2">View all campaigns</span>
                <ArrowRight className="h-4 w-4 mr-2" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </Card>
  );
}