"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Plus,
  Loader2,
  Filter,
  Square,
  ChevronRight,
  Clock,
  Search,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { listCampaigns, stopCampaign, type CampaignListItem } from "@/lib/apiRouter";
import { usePersona } from "@/hooks/usePersona";

const statusConfig: Record<
  string,
  { label: string; style: string; icon?: LucideIcon; spin?: boolean }
> = {
  processing: {
    label: "Processing",
    style: "border-blue-200/80 bg-blue-50/85 text-blue-700",
    icon: Loader2,
    spin: true,
  },
  needs_review: {
    label: "Needs Review",
    style: "border-amber-200/80 bg-amber-50/85 text-amber-700",
  },
  active_outreach: {
    label: "Active Outreach",
    style: "border-indigo-200/80 bg-indigo-50/85 text-indigo-700",
  },
  completed: {
    label: "Completed",
    style: "border-emerald-200/80 bg-emerald-50/85 text-emerald-700",
  },
  cancelled: {
    label: "Cancelled",
    style: "border-zinc-200/80 bg-zinc-100/85 text-zinc-600",
  },
  failed: {
    label: "Failed",
    style: "border-rose-200/80 bg-rose-50/85 text-rose-700",
  },
};

const filterOnlyStatuses = ["completed", "failed", "cancelled"] as const;

function statusUI(status: string) {
  return statusConfig[status] || {
    label: status.replaceAll("_", " "),
    style: "border-zinc-200/80 bg-zinc-100/85 text-zinc-700",
  };
}

function formatCreatedAt(iso: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong.";
}

export default function CampaignsPage() {
  const [items, setItems] = useState<CampaignListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const { persona } = usePersona();
  const filterPanelRef = useRef<HTMLDivElement | null>(null);

  const fetchData = async () => {
    try {
      const res = await listCampaigns({ status: "all", limit: 50, offset: 0 });
      setItems(res.campaigns || []);
    } catch (err: unknown) {
      toast.error("Failed to load campaigns", { description: getErrorMessage(err) });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let alive = true;

    (async () => {
      await fetchData();
    })();

    const t = setInterval(() => {
      if (!alive) return;
      fetchData();
    }, 5000);

    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [persona]);

  useEffect(() => {
    if (!isFilterOpen) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!filterPanelRef.current) return;
      if (!filterPanelRef.current.contains(event.target as Node)) {
        setIsFilterOpen(false);
      }
    };

    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [isFilterOpen]);

  const statusFilters = useMemo(() => {
    return [
      { value: "all", label: "All statuses" },
      ...filterOnlyStatuses.map((value) => ({
        value,
        label: statusConfig[value]?.label || value.replaceAll("_", " "),
      })),
    ];
  }, []);

  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const asSearchText = (value: unknown) => String(value ?? "").toLowerCase();

    return items.filter((campaign) => {
      const statusMatch = statusFilter === "all" || campaign.status === statusFilter;
      const searchMatch =
        !query ||
        asSearchText(campaign.name).includes(query) ||
        asSearchText(campaign.icpPreview).includes(query) ||
        asSearchText(campaign.id).includes(query);

      return statusMatch && searchMatch;
    });
  }, [items, statusFilter, searchQuery]);

  const activeFilters = statusFilter !== "all" || searchQuery.trim().length > 0;

  const handleStop = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    setItems((prev) => prev.map((c) => (c.id === id ? { ...c, status: "cancelled" } : c)));

    try {
      const res = await stopCampaign(id);
      toast.success("Stop requested", { description: res.message || "Campaign stopping..." });
    } catch (err: unknown) {
      toast.error("Stop failed", { description: getErrorMessage(err) });
      fetchData();
    }
  };

  const isStopAllowed = (status: string) => ["processing", "active_outreach"].includes(status);

  const premiumShell =
    "relative isolate overflow-hidden rounded-2xl border border-[rgb(255_255_255_/_0.82)] " +
    "bg-[linear-gradient(160deg,rgba(255,255,255,0.9)_0%,rgba(248,251,255,0.74)_56%,rgba(240,246,253,0.62)_100%)] " +
    "backdrop-blur-[14px] [backdrop-filter:saturate(168%)_blur(14px)] " +
    "shadow-[0_0_0_1px_rgba(255,255,255,0.76),0_0_12px_-9px_rgba(2,10,27,0.52),0_0_6px_-5px_rgba(15,23,42,0.3),inset_0_1px_0_rgba(255,255,255,0.98),inset_0_-1px_0_rgba(221,230,244,0.72)] " +
    "transition-[border-color,box-shadow,transform] duration-200 hover:border-[rgb(255_255_255_/_0.94)] hover:shadow-[0_0_0_1px_rgba(255,255,255,0.9),0_0_14px_-8px_rgba(2,10,27,0.6),0_0_7px_-4px_rgba(15,23,42,0.34),inset_0_1px_0_rgba(255,255,255,1),inset_0_-1px_0_rgba(223,233,248,0.8)]";

  return (
    <div className="font-sans min-h-screen bg-transparent p-1">
      <div className="mb-8 flex flex-col gap-4 border-b border-zinc-100 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Campaigns</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Manage and track your lead generation workflows
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div ref={filterPanelRef} className="relative">
            <Button
              type="button"
              className="analytics-frost-btn h-10 px-4"
              onClick={() => setIsFilterOpen((prev) => !prev)}
            >
              <Filter className="h-4 w-4" />
              Filter
              {activeFilters && (
                <span className="rounded-full bg-zinc-900/12 px-2 py-0.5 text-[10px] font-semibold text-zinc-700">
                  {filteredItems.length}
                </span>
              )}
            </Button>

            {isFilterOpen && (
              <div className="absolute right-0 top-12 z-30 w-80 rounded-2xl border border-[rgb(255_255_255_/_0.82)] bg-[linear-gradient(160deg,rgba(255,255,255,0.94)_0%,rgba(248,251,255,0.8)_56%,rgba(240,246,253,0.72)_100%)] p-4 shadow-[0_0_0_1px_rgba(255,255,255,0.82),0_0_14px_-8px_rgba(2,10,27,0.5),0_0_8px_-5px_rgba(15,23,42,0.28),inset_0_1px_0_rgba(255,255,255,0.98)] backdrop-blur-[14px] [backdrop-filter:saturate(165%)_blur(14px)]">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-semibold text-zinc-800">Filter Campaigns</p>
                  {activeFilters && (
                    <button
                      type="button"
                      onClick={() => {
                        setStatusFilter("all");
                        setSearchQuery("");
                      }}
                      className="inline-flex items-center gap-1 text-xs font-medium text-zinc-500 transition-colors hover:text-zinc-800"
                    >
                      <X className="h-3.5 w-3.5" />
                      Clear
                    </button>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                    Search
                  </label>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
                    <Input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Name, ICP, or campaign ID"
                      className="h-9 border-zinc-200/80 bg-white/80 pl-9 text-sm"
                    />
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  <label className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                    Status
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {statusFilters.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setStatusFilter(option.value)}
                        className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                          statusFilter === option.value
                            ? "border-zinc-300 bg-zinc-900 text-white"
                            : "border-zinc-200 bg-white/82 text-zinc-600 hover:border-zinc-300 hover:text-zinc-900"
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-zinc-200/70 pt-3 text-xs text-zinc-500">
                  <span>{filteredItems.length} campaigns match</span>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setIsFilterOpen(false)}
                    className="h-7 rounded-md border border-zinc-200/80 bg-white/80 px-2.5 text-xs font-medium text-zinc-700 hover:bg-white"
                  >
                    Done
                  </Button>
                </div>
              </div>
            )}
          </div>

          <Link href="/campaigns/new">
            <Button className="btn-sidebar-noise h-10">
              <Plus className="h-4 w-4" />
              New Campaign
            </Button>
          </Link>
        </div>
      </div>

      <div className="space-y-5">
        {loading && (
          <Card className={`${premiumShell} p-6 text-zinc-500`}>
            <div className="relative z-[1]">Loading campaigns...</div>
          </Card>
        )}

        {!loading && filteredItems.length === 0 && (
          <Card className={`${premiumShell} p-6 text-zinc-500`}>
            <div className="relative z-[1]">
              {activeFilters ? "No campaigns match the current filters." : "No campaigns found."}
            </div>
          </Card>
        )}

        {filteredItems.map((campaign, index) => {
          const s = statusUI(campaign.status);
          const StatusIcon = s.icon;

          return (
            <motion.div
              key={campaign.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className={`${premiumShell} p-0`}>
                <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-gradient-to-br from-sky-300/26 via-blue-500/12 to-transparent blur-3xl" />
                <div className="relative z-[1] flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-3">
                      <Badge
                        className={`rounded-full border px-3 py-1 text-[11px] font-medium uppercase tracking-wide shadow-none ${s.style}`}
                      >
                        {StatusIcon && (
                          <StatusIcon className={`mr-1.5 h-3 w-3 ${s.spin ? "animate-spin" : ""}`} />
                        )}
                        {s.label}
                      </Badge>
                    </div>

                    <div>
                      <Link href={`/campaigns/${campaign.id}`} className="block">
                        <h3 className="text-lg font-semibold text-zinc-900 transition-colors hover:text-zinc-600">
                          {campaign.name}
                        </h3>
                      </Link>

                      <p className="mt-1 line-clamp-1 max-w-xl text-sm text-zinc-500">
                        {campaign.icpPreview}
                      </p>
                    </div>

                    {campaign.status === "processing" && (
                      <div className="mt-4 max-w-xs">
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-100">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${campaign.progress || 0}%` }}
                            className="h-full rounded-full bg-sidebar-primary"
                          />
                        </div>
                        <div className="mt-1.5 flex items-center justify-between">
                          <span className="text-[10px] font-medium text-zinc-400">Progress</span>
                          <span className="text-[10px] font-bold text-zinc-900">
                            {campaign.progress || 0}%
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex h-20 items-center gap-8 rounded-xl border border-white/55 bg-white/44 px-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.96),inset_0_-1px_0_rgba(221,230,244,0.68)] sm:pl-6">
                    <div className="flex flex-col items-start">
                      <span className="mb-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                        Total Leads
                      </span>
                      <span className="text-2xl font-bold tracking-tight text-zinc-900">
                        {campaign.totalLeads}
                      </span>
                    </div>

                    <div className="min-w-24 flex-col items-start">
                      <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                        To Approve
                      </span>
                      <span
                        className={`text-2xl font-bold tracking-tight ${
                          campaign.toApprove > 0 ? "text-zinc-900" : "text-zinc-300"
                        }`}
                      >
                        {campaign.toApprove}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="relative z-[1] flex items-center justify-between border-t border-zinc-100/70 bg-white/36 px-6 py-3">
                  <div className="flex items-center gap-2 text-xs text-zinc-400">
                    <Clock className="h-3.5 w-3.5" />
                    <span>Created {formatCreatedAt(campaign.createdAt)}</span>
                  </div>

                  <div className="flex items-center gap-3">
                    {isStopAllowed(campaign.status) && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => handleStop(e, campaign.id)}
                          className="h-8 px-2 text-xs font-medium text-red-600 hover:bg-red-50 hover:text-red-600"
                        >
                          <Square className="mr-1.5 h-3 w-3 fill-current" />
                          Stop
                        </Button>
                        <div className="mx-1 h-4 w-px bg-zinc-200" />
                      </>
                    )}

                    <Link href={`/campaigns/${campaign.id}`}>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs font-medium text-zinc-500 hover:bg-zinc-100/75 hover:text-zinc-900"
                      >
                        View Details
                        <ChevronRight className="ml-1 h-3 w-3" />
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
