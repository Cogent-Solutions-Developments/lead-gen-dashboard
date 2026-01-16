"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Loader2, Filter, Square, ChevronRight, Clock } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { listCampaigns, stopCampaign, type CampaignListItem } from "@/lib/api";

const statusConfig: Record<
  string,
  { label: string; style: string; icon?: any; spin?: boolean }
> = {
  processing: {
    label: "Processing",
    style: "bg-zinc-900 text-sidebar-primary border-zinc-900",
    icon: Loader2,
    spin: true,
  },
  needs_review: {
    label: "Needs Review",
    style: "bg-zinc-100 text-zinc-900 border-zinc-200",
  },
  active_outreach: {
    label: "Active Outreach",
    style: "bg-zinc-50 text-zinc-900 border-zinc-200",
  },
  completed: {
    label: "Completed",
    style: "text-zinc-400 bg-transparent px-0 border-transparent",
  },
  cancelled: {
    label: "Cancelled",
    style: "bg-zinc-100 text-zinc-500 border-zinc-200",
  },
  failed: {
    label: "Failed",
    style: "bg-red-50 text-red-700 border-red-200",
  },
};

function statusUI(status: string) {
  return statusConfig[status] || {
    label: status,
    style: "bg-zinc-100 text-zinc-700 border-zinc-200",
  };
}

function formatCreatedAt(iso: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

export default function CampaignsPage() {
  const [items, setItems] = useState<CampaignListItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const res = await listCampaigns({ status: "all", limit: 50, offset: 0 });
      setItems(res.campaigns || []);
    } catch (err: any) {
      toast.error("Failed to load campaigns", { description: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let alive = true;

    (async () => {
      await fetchData();
    })();

    // poll for progress updates
    const t = setInterval(() => {
      if (!alive) return;
      fetchData();
    }, 5000);

    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  const handleStop = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();

    // optimistic UI: mark as cancelled immediately
    setItems((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: "cancelled" } : c))
    );

    try {
      const res = await stopCampaign(id);
      toast.success("Stop requested", { description: res.message || "Campaign stopping..." });
    } catch (err: any) {
      toast.error("Stop failed", { description: err.message });
      // revert if needed by refetch
      fetchData();
    }
  };

  const isStopAllowed = (status: string) => {
    return ["processing", "active_outreach"].includes(status);
  };

  return (
    <div className="font-sans min-h-screen bg-transparent p-1">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between border-b border-zinc-100 pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Campaigns</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Manage and track your lead generation workflows
          </p>
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            className="h-10 border-zinc-200 text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
            onClick={() => toast.info("Filter UI can be added later")}
          >
            <Filter className="mr-2 h-4 w-4" /> Filter
          </Button>

          <Link href="/campaigns/new">
            <Button className="h-10 bg-sidebar text-white shadow-lg shadow-zinc-900/10 hover:bg-sidebar/80">
              <Plus className="mr-2 h-4 w-4" />
              New Campaign
            </Button>
          </Link>
        </div>
      </div>

      {/* List */}
      <div className="space-y-6">
        {loading && (
          <Card className="p-6 border border-zinc-200 bg-white text-zinc-500">
            Loading campaigns…
          </Card>
        )}

        {!loading && items.length === 0 && (
          <Card className="p-6 border border-zinc-200 bg-white text-zinc-500">
            No campaigns found.
          </Card>
        )}

        {items.map((campaign, index) => {
          const s = statusUI(campaign.status);
          const StatusIcon = s.icon;

          return (
            <motion.div
              key={campaign.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm transition-all hover:shadow-md hover:border-zinc-300">
                {/* Body */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-6 gap-6">
                  {/* Left */}
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-3">
                      <Badge
                        className={`rounded-full px-3 py-1 text-[11px] font-medium uppercase tracking-wide shadow-none border ${s.style}`}
                      >
                        {StatusIcon && (
                          <StatusIcon className={`mr-1.5 h-3 w-3 ${s.spin ? "animate-spin" : ""}`} />
                        )}
                        {s.label}
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

                    {/* Progress bar when processing */}
                    {campaign.status === "processing" && (
                      <div className="mt-4 max-w-xs">
                        <div className="h-1.5 w-full rounded-full bg-zinc-100 overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${campaign.progress || 0}%` }}
                            className="h-full rounded-full bg-sidebar-primary"
                          />
                        </div>
                        <div className="flex items-center justify-between mt-1.5">
                          <span className="text-[10px] text-zinc-400 font-medium">Progress</span>
                          <span className="text-[10px] font-bold text-zinc-900">
                            {campaign.progress || 0}%
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right metrics */}
                  <div className="flex items-center gap-8 sm:border-l sm:border-zinc-100 sm:pl-8 sm:h-20">
                    <div className="flex flex-col items-start">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                        Total Leads
                      </span>
                      <span className="text-2xl font-bold text-zinc-900 tracking-tight">
                        {campaign.totalLeads}
                      </span>
                    </div>

                    <div className="flex flex-col items-start min-w-24">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                        To Approve
                      </span>
                      <span
                        className={`text-2xl font-bold tracking-tight ${campaign.toApprove > 0 ? "text-zinc-900" : "text-zinc-300"
                          }`}
                      >
                        {campaign.toApprove}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-6 py-3 bg-zinc-50/50 border-t border-zinc-100">
                  <div className="flex items-center gap-2 text-xs text-zinc-400">
                    <Clock className="h-3.5 w-3.5" />
                    <span>Created {formatCreatedAt(campaign.createdAt)}</span>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* STOP only */}
                    {isStopAllowed(campaign.status) && (
                      <>
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
