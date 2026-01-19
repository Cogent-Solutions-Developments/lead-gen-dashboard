"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LayoutTemplate, ChevronRight, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getRecentCampaigns, type RecentCampaign } from "@/lib/api";
import { toast } from "sonner";

const statusStyles: Record<string, string> = {
  active: "bg-sidebar-primary/15 text-emerald-900 border-sidebar-primary/20",
  completed: "bg-zinc-100 text-zinc-700 border-zinc-200",
  processing: "bg-sidebar text-sidebar-foreground border-sidebar/50",
  needs_review: "bg-zinc-100 text-zinc-900 border-zinc-200",
  active_outreach: "bg-zinc-50 text-zinc-900 border-zinc-200",
  paused: "bg-amber-100 text-amber-700 border-amber-200",
  queued: "bg-zinc-100 text-zinc-500 border-zinc-200",
};

function safeStyle(status: string) {
  return statusStyles[status] || "bg-zinc-100 text-zinc-700 border-zinc-200";
}

export function RecentCampaigns() {
  const [campaigns, setCampaigns] = useState<RecentCampaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const res = await getRecentCampaigns(5);
        if (!alive) return;
        setCampaigns(res.campaigns || []);
      } catch (err: any) {
        if (!alive) return;
        toast.error("Failed to load recent campaigns", { description: err.message });
        setCampaigns([]);
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  return (
    <Card className="flex flex-col h-112.5 rounded-xl border border-zinc-200 bg-white shadow-none">
      <div className="flex shrink-0 items-center justify-between border-b border-zinc-100 p-6 py-5">
        <div>
          <h3 className="text-lg font-semibold text-zinc-900">Recent Campaigns</h3>
          <p className="text-sm text-zinc-500">Your latest outreach campaigns</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 scrollbar-thin scrollbar-thumb-zinc-200 scrollbar-track-transparent">
        <div className="divide-y divide-zinc-100">
          {loading && (
            <div className="p-6 text-sm text-zinc-400">Loading…</div>
          )}

          {!loading && campaigns.length === 0 && (
            <div className="p-6 text-sm text-zinc-400">No campaigns yet</div>
          )}

          {!loading &&
            campaigns.map((c) => (
              <Link
                key={c.id}
                href={`/campaigns/${c.id}`}
                className="group flex w-full items-center justify-between p-5 text-left transition-all hover:bg-zinc-50"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 text-zinc-500 transition-colors group-hover:border-sidebar-primary group-hover:text-sidebar-primary group-hover:bg-sidebar-primary/5">
                    <LayoutTemplate className="h-5 w-5" />
                  </div>

                  <div className="space-y-0.5 min-w-0">
                    <h4 className="font-medium text-zinc-900 truncate pr-4">{c.name}</h4>
                    <p className="text-xs text-zinc-500">
                      <span className="font-medium text-zinc-700">{c.leadsCount}</span>{" "}
                      leads generated
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  <Badge className={`rounded-full px-2.5 font-normal shadow-none border ${safeStyle(c.status)}`}>
                    {c.status}
                  </Badge>
                  <ChevronRight className="h-4 w-4 text-zinc-300 transition-transform group-hover:translate-x-0.5 group-hover:text-zinc-500" />
                </div>
              </Link>
            ))}

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
