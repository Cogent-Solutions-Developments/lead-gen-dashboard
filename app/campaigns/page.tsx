"use client";

import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Users, Clock, CheckCircle, Loader2, FileCheck } from "lucide-react";
import Link from "next/link";

const campaigns = [
  {
    id: "1",
    icpPreview: "Oil & Gas Vendors - Nigeria, 12th MICT Forum Qatar...",
    status: "scraping",
    progress: 67,
    leads: 45,
    approved: 0,
    createdAt: "2 hours ago",
  },
  {
    id: "2",
    icpPreview: "Tech Startups - UAE, Dubai Tech Summit, SaaS companies...",
    status: "pending_approval",
    progress: 100,
    leads: 78,
    approved: 32,
    createdAt: "5 hours ago",
  },
  {
    id: "3",
    icpPreview: "Manufacturing - GCC, Industrial equipment suppliers...",
    status: "outreach",
    progress: 100,
    leads: 156,
    approved: 156,
    contacted: 89,
    createdAt: "1 day ago",
  },
  {
    id: "4",
    icpPreview: "Healthcare Summit - MENA, Medical equipment vendors...",
    status: "completed",
    progress: 100,
    leads: 234,
    approved: 234,
    contacted: 234,
    replied: 45,
    createdAt: "3 days ago",
  },
];

const statusConfig: Record<string, { label: string; color: string; icon: any; iconClass?: string }> = {
  queued: {
    label: "Queued",
    color: "bg-slate-100 text-slate-700",
    icon: Clock,
  },
  scraping: {
    label: "Scraping",
    color: "bg-blue-100 text-blue-700",
    icon: Loader2,
    iconClass: "animate-spin",
  },
  pending_approval: {
    label: "Pending Approval",
    color: "bg-amber-100 text-amber-700",
    icon: FileCheck,
  },
  outreach: {
    label: "Outreach",
    color: "bg-violet-100 text-violet-700",
    icon: Users,
  },
  completed: {
    label: "Completed",
    color: "bg-emerald-100 text-emerald-700",
    icon: CheckCircle,
  },
};

export default function CampaignsPage() {
  return (
    <div>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-6"
      >
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Campaigns</h1>
          <p className="text-slate-500">Manage your lead generation campaigns</p>
        </div>
        <Link href="/campaigns/new">
          <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
            <Plus className="mr-2 h-4 w-4" />
            New Campaign
          </Button>
        </Link>
      </motion.div>

      <div className="space-y-4">
        {campaigns.map((campaign, index) => {
          const status = statusConfig[campaign.status as keyof typeof statusConfig];
          const StatusIcon = status.icon;

          return (
            <motion.div
              key={campaign.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Link href={`/campaigns/${campaign.id}`}>
                <Card className="p-5 hover:shadow-md transition-all cursor-pointer">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Badge className={status.color}>
                          <StatusIcon className={`mr-1 h-3 w-3 ${status.iconClass || ""}`} />
                          {status.label}
                        </Badge>
                        <span className="text-sm text-slate-400">{campaign.createdAt}</span>
                      </div>
                      <p className="text-slate-900 font-medium line-clamp-1">
                        {campaign.icpPreview}
                      </p>
                    </div>
                  </div>

                  {/* Progress bar for scraping */}
                  {campaign.status === "scraping" && (
                    <div className="mt-4">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-slate-500">Scraping progress</span>
                        <span className="font-medium">{campaign.progress}%</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${campaign.progress}%` }}
                          className="h-full bg-blue-600 rounded-full"
                        />
                      </div>
                    </div>
                  )}

                  {/* Stats */}
                  <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-6 text-sm">
                    <div className="flex items-center gap-1 text-slate-500">
                      <Users className="h-4 w-4" />
                      <span className="font-medium text-slate-700">{campaign.leads}</span> leads
                    </div>
                    
                    {campaign.status !== "scraping" && campaign.status !== "queued" && (
                      <div className="flex items-center gap-1 text-slate-500">
                        <FileCheck className="h-4 w-4" />
                        <span className="font-medium text-slate-700">{campaign.approved}</span> approved
                      </div>
                    )}

                    {(campaign.status === "outreach" || campaign.status === "completed") && (
                      <div className="flex items-center gap-1 text-slate-500">
                        <CheckCircle className="h-4 w-4" />
                        <span className="font-medium text-slate-700">{campaign.contacted}</span> contacted
                      </div>
                    )}

                    {campaign.status === "completed" && campaign.replied && (
                      <div className="flex items-center gap-1 text-emerald-600">
                        <span className="font-medium">{campaign.replied}</span> replied
                      </div>
                    )}
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