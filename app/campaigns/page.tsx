"use client";

import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Plus, 
  Loader2, 
  Filter, 
  Pause, 
  Square, 
  Play,
  ChevronRight,
  Clock
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

const campaigns = [
  {
    id: "1",
    name: "Oil & Gas Vendors - Nigeria",
    icpPreview: "Targeting procurement managers in Lagos, Port Harcourt...",
    status: "scraping",
    progress: 67,
    leads: 45,
    toApprove: 0,
    createdAt: "2h ago",
  },
  {
    id: "2",
    name: "Tech Startups - UAE",
    icpPreview: "SaaS founders attending Dubai Tech Summit...",
    status: "pending_approval",
    progress: 100,
    leads: 78,
    toApprove: 32,
    createdAt: "5h ago",
  },
  {
    id: "3",
    name: "Manufacturing - GCC",
    icpPreview: "Industrial equipment suppliers in Saudi & Qatar...",
    status: "paused", 
    progress: 45,
    leads: 156,
    toApprove: 0,
    createdAt: "1d ago",
  },
  {
    id: "4",
    name: "Healthcare Summit - MENA",
    icpPreview: "Medical equipment vendors and hospital admins...",
    status: "completed",
    progress: 100,
    leads: 234,
    toApprove: 0,
    createdAt: "3d ago",
  },
];

const statusConfig: Record<string, { label: string; style: string; icon?: any; spin?: boolean }> = {
  queued: { label: "Queued", style: "bg-zinc-100 text-zinc-500" },
  scraping: { label: "Processing", style: "bg-zinc-900 text-sidebar-primary", icon: Loader2, spin: true },
  paused: { label: "Paused", style: "bg-amber-100 text-amber-700 border-amber-200", icon: Pause },
  pending_approval: { label: "Needs Review", style: "bg-zinc-100 text-zinc-900" },
  outreach: { label: "Active Outreach", style: "bg-zinc-50 text-zinc-900" },
  completed: { label: "Completed", style: "text-zinc-400 bg-transparent px-0" },
};

export default function CampaignsPage() {

  const handleToggle = (e: React.MouseEvent, currentStatus: string, id: string) => {
    e.preventDefault();
    if (currentStatus === 'paused') {
      toast.success("Resuming campaign...");
    } else {
      toast.info("Pausing campaign...");
    }
  };

  const handleStop = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    toast.error("Stopping campaign...");
  };

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
      <div className="space-y-6">
        {campaigns.map((campaign, index) => {
          const status = statusConfig[campaign.status as keyof typeof statusConfig];
          const StatusIcon = status.icon;

          const isActive = ["scraping", "outreach", "queued", "paused"].includes(campaign.status);
          const isPaused = campaign.status === "paused";

          return (
            <motion.div
              key={campaign.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm transition-all hover:shadow-md hover:border-zinc-300">
                
                {/* 1. BODY SECTION (Info + Metrics) */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-6 gap-6">
                  
                  {/* Left: Info */}
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-3">
                      <Badge className={`rounded-full px-3 py-1 text-[11px] font-medium uppercase tracking-wide shadow-none border-0 ${status.style}`}>
                        {StatusIcon && <StatusIcon className={`mr-1.5 h-3 w-3 ${status.spin ? "animate-spin" : ""}`} />}
                        {status.label}
                      </Badge>
                    </div>
                    
                    <div>
                      <Link href={`/campaigns/${campaign.id}`} className="block">
                         <h3 className="text-lg font-semibold text-zinc-900 hover:text-zinc-600 transition-colors">
                            {campaign.name}
                         </h3>
                      </Link>
                      <p className="mt-1 line-clamp-1 max-w-xl text-sm text-zinc-500">
                        {campaign.icpPreview}
                      </p>
                    </div>

                    {/* Progress Bar (Inline) */}
                    {(campaign.status === "scraping" || campaign.status === "paused") && (
                      <div className="mt-4 max-w-xs">
                        <div className="h-1.5 w-full rounded-full bg-zinc-100 overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${campaign.progress}%` }}
                            className={`h-full rounded-full ${isPaused ? "bg-amber-400" : "bg-sidebar-primary"}`}
                          />
                        </div>
                        <div className="flex items-center justify-between mt-1.5">
                            <span className="text-[10px] text-zinc-400 font-medium">Progress</span>
                            <span className="text-[10px] font-bold text-zinc-900">{campaign.progress}%</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right: Metrics */}
                  <div className="flex items-center gap-8 sm:border-l sm:border-zinc-100 sm:pl-8 sm:h-20">
                    <div className="flex flex-col items-start">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                        Total Leads
                      </span>
                      <span className="text-2xl font-bold text-zinc-900 tracking-tight">
                        {campaign.leads}
                      </span>
                    </div>

                    <div className="flex flex-col items-start min-w-24">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                        To Approve
                      </span>
                      <span className={`text-2xl font-bold tracking-tight ${
                          campaign.toApprove > 0 ? "text-zinc-900" : "text-zinc-300"
                        }`}>
                        {campaign.toApprove}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2. FOOTER SECTION (The Control Deck) */}
                <div className="flex items-center justify-between px-6 py-3 bg-zinc-50/50 border-t border-zinc-100">
                    
                    {/* Footer Left: Metadata */}
                    <div className="flex items-center gap-2 text-xs text-zinc-400">
                        <Clock className="h-3.5 w-3.5" />
                        <span>Created {campaign.createdAt}</span>
                    </div>

                    {/* Footer Right: Actions */}
                    <div className="flex items-center gap-3">
                        {isActive && (
                            <>
                                {/* Play/Pause */}
                                {isPaused ? (
                                    <Button 
                                        size="sm" 
                                        onClick={(e) => handleToggle(e, campaign.status, campaign.id)}
                                        className="h-8 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 shadow-sm text-xs font-medium"
                                    >
                                        <Play className="h-3 w-3 mr-1.5 fill-current" />
                                        Resume
                                    </Button>
                                ) : (
                                    <Button 
                                        variant="outline"
                                        size="sm" 
                                        onClick={(e) => handleToggle(e, campaign.status, campaign.id)}
                                        className="h-8 border-zinc-200 text-zinc-600 hover:text-zinc-900 bg-white shadow-sm text-xs font-medium"
                                    >
                                        <Pause className="h-3 w-3 mr-1.5 fill-current" />
                                        Pause
                                    </Button>
                                )}

                                {/* Stop */}
                                <Button 
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => handleStop(e, campaign.id)}
                                    className="h-8 text-zinc-400 hover:text-red-600 hover:bg-red-50 text-xs font-medium px-2"
                                >
                                    <Square className="h-3 w-3 mr-1.5 fill-current" />
                                    Stop
                                </Button>
                                
                                <div className="w-px h-4 bg-zinc-200 mx-1" />
                            </>
                        )}

                        {/* View Details Link */}
                        <Link href={`/campaigns/${campaign.id}`}>
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-8 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 text-xs font-medium"
                            >
                                View Details
                                <ChevronRight className="h-3 w-3 ml-1" />
                            </Button>
                        </Link>
                    </div>
                </div>

              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}