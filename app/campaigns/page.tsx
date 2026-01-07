"use client";

import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Loader2, ArrowUpRight, Filter } from "lucide-react";
import Link from "next/link";

const campaigns = [
  {
    id: "1",
    name: "Oil & Gas Vendors - Nigeria",
    icpPreview: "Targeting procurement managers in Lagos, Port Harcourt...",
    status: "scraping",
    progress: 67,
    leads: 45,
    toApprove: 0, // Still scraping, none ready yet
    createdAt: "2h ago",
  },
  {
    id: "2",
    name: "Tech Startups - UAE",
    icpPreview: "SaaS founders attending Dubai Tech Summit...",
    status: "pending_approval",
    progress: 100,
    leads: 78,
    toApprove: 32, // Action item
    createdAt: "5h ago",
  },
  {
    id: "3",
    name: "Manufacturing - GCC",
    icpPreview: "Industrial equipment suppliers in Saudi & Qatar...",
    status: "outreach",
    progress: 100,
    leads: 156,
    toApprove: 0, // All approved
    createdAt: "1d ago",
  },
  {
    id: "4",
    name: "Healthcare Summit - MENA",
    icpPreview: "Medical equipment vendors and hospital admins...",
    status: "completed",
    progress: 100,
    leads: 234,
    toApprove: 0, // Completed
    createdAt: "3d ago",
  },
];

const statusConfig: Record<string, { label: string; style: string; icon?: any; spin?: boolean }> = {
  queued: {
    label: "Queued",
    style: "bg-zinc-100 text-zinc-500",
  },
  scraping: {
    label: "Processing",
    style: "bg-zinc-900 text-sidebar-primary", 
    icon: Loader2,
    spin: true,
  },
  pending_approval: {
    label: "Needs Review",
    style: "bg-zinc-100 text-zinc-900",
  },
  outreach: {
    label: "Active Outreach",
    style: "bg-zinc-50 text-zinc-900",
  },
  completed: {
    label: "Completed",
    style: "text-zinc-400 bg-transparent px-0",
  },
};

export default function CampaignsPage() {
  return (
    <div className="font-sans min-h-screen bg-transparent p-1">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between border-b border-zinc-100 pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Campaigns</h1>
          <p className="text-sm text-zinc-500 mt-1">Manage and track your lead generation workflows</p>
        </div>
        <div className="flex gap-3">
           <Button variant="outline" className="h-10 border-zinc-200 text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900">
            <Filter className="mr-2 h-4 w-4" /> Filter
          </Button>
          <Link href="/campaigns/new">
            <Button className="h-10 bg-zinc-900 text-white shadow-lg shadow-zinc-900/10 hover:bg-zinc-800">
              <Plus className="mr-2 h-4 w-4" />
              New Campaign
            </Button>
          </Link>
        </div>
      </div>

      {/* Campaign List */}
      <div className="space-y-4">
        {campaigns.map((campaign, index) => {
          const status = statusConfig[campaign.status as keyof typeof statusConfig];
          const StatusIcon = status.icon;

          return (
            <motion.div
              key={campaign.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Link href={`/campaigns/${campaign.id}`}>
                <Card className="group relative flex flex-col gap-6 rounded-xl border border-transparent bg-white p-6 shadow-sm transition-all hover:shadow-md hover:border-zinc-200 sm:flex-row sm:items-center sm:justify-between">
                  
                  {/* Left: Info */}
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-3">
                      <Badge className={`rounded-full px-3 py-1 text-[11px] font-medium uppercase tracking-wide shadow-none border-0 ${status.style}`}>
                        {StatusIcon && <StatusIcon className={`mr-1.5 h-3 w-3 ${status.spin ? "animate-spin" : ""}`} />}
                        {status.label}
                      </Badge>
                      <span className="text-xs text-zinc-400 font-medium">{campaign.createdAt}</span>
                    </div>
                    
                    <div>
                      <h3 className="text-lg font-semibold text-zinc-900 group-hover:text-zinc-700 transition-colors">
                        {campaign.name}
                      </h3>
                      <p className="mt-1 line-clamp-1 max-w-md text-sm text-zinc-500">
                        {campaign.icpPreview}
                      </p>
                    </div>

                    {/* Progress Bar (Scraping) */}
                    {campaign.status === "scraping" && (
                      <div className="mt-5 max-w-xs">
                        <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-zinc-500 mb-2">
                          <span>Scraping profiles...</span>
                          <span className="text-zinc-900 font-bold">{campaign.progress}%</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-zinc-100 overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${campaign.progress}%` }}
                            className="h-full rounded-full bg-sidebar-primary"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right: Metrics - Standardized */}
                  <div className="flex items-center gap-16 border-t border-zinc-50 pt-6 sm:border-0 sm:pt-0 sm:pl-10">
                    
                    {/* Metric 1: Total Leads */}
                    <div className="flex flex-col items-start sm:items-end">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                        Total Leads
                      </span>
                      <span className="text-2xl font-bold text-zinc-900 tracking-tight">
                        {campaign.leads}
                      </span>
                    </div>

                    {/* Metric 2: To Approve */}
                    <div className="flex flex-col items-start sm:items-end min-w-20">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                        To Approve
                      </span>
                      <span className={`text-2xl font-bold tracking-tight ${
                          // Highlight count if there are items waiting
                          campaign.toApprove > 0 ? "text-zinc-900" : "text-zinc-300"
                        }`}>
                        {campaign.toApprove}
                      </span>
                    </div>

                    {/* Arrow Action */}
                    <div className="hidden sm:block p-2 rounded-full text-zinc-300 transition-colors group-hover:text-zinc-900 group-hover:bg-zinc-50">
                        <ArrowUpRight className="h-5 w-5" />
                    </div>
                  </div>

                </Card>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}