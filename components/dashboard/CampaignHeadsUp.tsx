"use client";

import { motion } from "framer-motion";
import { type EventSummaryItem, type WorkflowStatusDefinitionItem } from "@/lib/apiRouter";

type EventHeadsUpItem = {
  event: EventSummaryItem;
  statusCounts: Record<string, number>;
};

interface CampaignHeadsUpProps {
  items: EventHeadsUpItem[];
  statuses: WorkflowStatusDefinitionItem[];
  loading: boolean;
}

const STATUS_CONFIG: Record<string, { label: string; barColor: string; hex: string }> = {
  "follow-up":     { label: "Follow Up",   barColor: "bg-amber-500",   hex: "#f59e0b" },
  "proposal-sent": { label: "Proposals",   barColor: "bg-indigo-500",  hex: "#6366f1" },
  "deal-closed":   { label: "Closed",      barColor: "bg-emerald-500", hex: "#10b981" },
};

export function CampaignHeadsUp({
  items,
  statuses,
  loading,
}: CampaignHeadsUpProps) {
  if (loading) {
    return (
      <section className="relative mt-10 overflow-hidden border border-zinc-200 bg-white px-8 py-8 shadow-sm">
        <div className="flex h-48 items-center justify-center">
          <p className="text-sm font-light italic text-zinc-400">
            Aggregating your pipeline...
          </p>
        </div>
      </section>
    );
  }

  if (items.length === 0) return null;

  // Aggregate totals across all items
  const totals = statuses.reduce((acc, status) => {
    acc[status.statusKey] = items.reduce((sum, item) => sum + (item.statusCounts[status.statusKey] || 0), 0);
    return acc;
  }, {} as Record<string, number>);

  const totalLeads = items.reduce((sum, item) => sum + (item.event.leadCount || 0), 0);
  const maxCount = Math.max(...Object.values(totals), 1);

  return (
    <section className="relative mt-10 overflow-hidden border border-zinc-200 bg-white px-8 py-8 shadow-sm">
      {/* Header — matches Daily KPI Tracker style */}
      <div className="relative flex items-baseline justify-between gap-6 border-b border-zinc-100 pb-6">
        <div>
          <h2 className="text-4xl font-extralight tracking-tight text-zinc-950">
            Your Pipeline
          </h2>
          <p className="mt-3 text-sm font-light text-zinc-500">
            Lead status breakdown across all active events.
          </p>
        </div>
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="shrink-0 text-3xl font-extralight tabular-nums tracking-tight text-zinc-950"
        >
          {totalLeads.toLocaleString()}
          <span className="ml-2 text-sm font-light text-zinc-400">total</span>
        </motion.span>
      </div>

      {/* Status rows — horizontal bar chart style */}
      <div className="mt-10 space-y-0">
        {statuses.map((status, index) => {
          const count = totals[status.statusKey] || 0;
          const config = STATUS_CONFIG[status.statusKey] || {
            label: status.label,
            barColor: "bg-zinc-400",
            hex: "#a1a1aa",
          };
          const fillPercent = maxCount > 0 ? (count / maxCount) * 100 : 0;

          return (
            <motion.div
              key={status.statusKey}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.06, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="group grid grid-cols-[8rem_minmax(0,1fr)_4rem] items-center gap-6 border-b border-zinc-100 py-5 last:border-b-0"
            >
              {/* Label */}
              <span className="text-sm font-light text-zinc-500 transition-colors group-hover:text-zinc-950">
                {config.label}
              </span>

              {/* Bar */}
              <div className="relative h-7 w-full overflow-hidden bg-zinc-100">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${fillPercent}%` }}
                  transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1], delay: index * 0.06 + 0.2 }}
                  className={`absolute inset-y-0 left-0 ${config.barColor}`}
                />
                {/* Grid markers */}
                <div className="absolute inset-0 flex justify-between pointer-events-none">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-full w-[1px] bg-white/20" />
                  ))}
                </div>
              </div>

              {/* Count */}
              <span className="text-right text-2xl font-extralight tabular-nums tracking-tight text-zinc-950">
                {count.toLocaleString()}
              </span>
            </motion.div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="mt-8 border-t border-zinc-100 pt-6">
        <p className="text-[10px] leading-relaxed text-zinc-400">
          * Showing leads where you are the last workflow contributor or manually added the record.
        </p>
      </div>
    </section>
  );
}
