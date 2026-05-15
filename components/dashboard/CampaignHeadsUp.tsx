"use client";

import { motion } from "framer-motion";
import { type EventSummaryItem, type WorkflowStatusDefinitionItem } from "@/lib/apiRouter";
import { cn } from "@/lib/utils";

type EventHeadsUpItem = {
  event: EventSummaryItem;
  statusCounts: Record<string, number>;
};

interface CampaignHeadsUpProps {
  items: EventHeadsUpItem[];
  statuses: WorkflowStatusDefinitionItem[];
  loading: boolean;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; textColor: string }> = {
  new: { label: "New Leads", color: "bg-zinc-100", textColor: "text-zinc-600" },
  "first-call": { label: "First Call", color: "bg-blue-50", textColor: "text-blue-600" },
  "follow-up": { label: "Follow Up", color: "bg-orange-50", textColor: "text-orange-600" },
  "proposal-sent": { label: "Proposals", color: "bg-purple-50", textColor: "text-purple-600" },
  "deal-closed": { label: "Closed", color: "bg-emerald-50", textColor: "text-emerald-600" },
  "deal-dead": { label: "Dead", color: "bg-rose-50", textColor: "text-rose-600" },
};

export function CampaignHeadsUp({
  items,
  statuses,
  loading,
}: CampaignHeadsUpProps) {
  if (loading) {
    return (
      <div className="mt-8 flex h-32 items-center justify-center border-t border-zinc-100 text-[11px] font-medium text-zinc-400">
        Aggregating metrics...
      </div>
    );
  }

  if (items.length === 0) return null;

  // Aggregate totals across all items
  const totals = statuses.reduce((acc, status) => {
    acc[status.statusKey] = items.reduce((sum, item) => sum + (item.statusCounts[status.statusKey] || 0), 0);
    return acc;
  }, {} as Record<string, number>);

  const totalLeads = items.reduce((sum, item) => sum + (item.event.leadCount || 0), 0);

  return (
    <div className="mt-8 border-t border-zinc-100 pt-6">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-[11px] font-bold text-zinc-400">Your Stats</h2>
        <span className="text-[11px] font-medium text-zinc-400">
          {totalLeads.toLocaleString()} Total Leads
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        {statuses.map((status, index) => {
          const count = totals[status.statusKey] || 0;
          const config = STATUS_CONFIG[status.statusKey] || { label: status.label, color: "bg-zinc-50", textColor: "text-zinc-600" };

          return (
            <motion.div
              key={status.statusKey}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={cn(
                "relative overflow-hidden rounded-xl border border-zinc-100/80 p-4 transition-all hover:shadow-sm",
                config.color
              )}
            >
              <div className="flex flex-col gap-1">
                <span className="whitespace-nowrap text-[11px] font-bold text-zinc-500">
                  {config.label}
                </span>
                <span className={cn(
                  "text-3xl font-light tracking-tight tabular-nums",
                  count > 0 ? config.textColor : "text-zinc-300"
                )}>
                  {count.toLocaleString()}
                </span>
              </div>

              <div className="pointer-events-none absolute -bottom-2 -right-2 select-none opacity-[0.03]">
                <span className="text-6xl font-bold">{index + 1}</span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
