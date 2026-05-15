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

const STATUS_CONFIG: Record<string, { label: string; subtitle: string; accentColor: string; bgGradient: string; iconPath: string }> = {
  "follow-up": {
    label: "Follow Ups",
    subtitle: "Leads awaiting your next touchpoint",
    accentColor: "#f59e0b",
    bgGradient: "linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)",
    iconPath: "M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z",
  },
  "proposal-sent": {
    label: "Proposals Sent",
    subtitle: "Proposals delivered and pending review",
    accentColor: "#6366f1",
    bgGradient: "linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%)",
    iconPath: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
  },
  "deal-closed": {
    label: "Closed Deals",
    subtitle: "Successfully converted deals",
    accentColor: "#10b981",
    bgGradient: "linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)",
    iconPath: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
  },
};

export function CampaignHeadsUp({
  items,
  statuses,
  loading,
}: CampaignHeadsUpProps) {
  if (loading) {
    return (
      <section className="relative mt-10 flex flex-1 flex-col justify-end">
        <div className="grid grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="animate-pulse  border border-zinc-200 bg-white p-6"
              style={{ minHeight: "11rem" }}
            >
              <div className="h-3 w-16 rounded bg-zinc-100" />
              <div className="mt-6 h-10 w-12 rounded bg-zinc-100" />
              <div className="mt-4 h-2 w-24 rounded bg-zinc-100" />
            </div>
          ))}
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

  return (
    <section className="relative mt-10 flex flex-1 flex-col justify-end">
      {/* Header */}
      <div className="mb-6 flex items-baseline justify-between">
        <div>
          <h2 className="text-2xl font-extralight tracking-tight text-zinc-950">
            Your Stats
          </h2>
          <p className="mt-1 text-sm font-light text-zinc-400">
            Lead status breakdown across all active events.
          </p>
        </div>
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="shrink-0 text-2xl font-extralight tabular-nums tracking-tight text-zinc-950"
        >
          {totalLeads.toLocaleString()}
          <span className="ml-1.5 text-xs font-light text-zinc-400">total</span>
        </motion.span>
      </div>

      {/* Cards grid */}
      <div className="grid grid-cols-3 gap-4">
        {statuses.map((status, index) => {
          const count = totals[status.statusKey] || 0;
          const config = STATUS_CONFIG[status.statusKey] || {
            label: status.label,
            subtitle: "Pipeline status",
            accentColor: "#a1a1aa",
            bgGradient: "linear-gradient(135deg, #fafafa 0%, #f4f4f5 100%)",
            iconPath: "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
          };

          return (
            <motion.div
              key={status.statusKey}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: index * 0.1,
                duration: 0.55,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="group relative overflow-hidden border border-zinc-200 bg-white p-6 shadow-sm transition-all duration-300 hover:shadow-md hover:border-zinc-300"
            >
              {/* Subtle accent bar at top */}
              <div
                className="absolute inset-x-0 top-0 h-[3px] opacity-80 transition-opacity group-hover:opacity-100"
                style={{ backgroundColor: config.accentColor }}
              />

              {/* Icon */}
              <div
                className="flex h-9 w-9 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110"
                style={{ background: config.bgGradient }}
              >
                <svg
                  className="h-4 w-4"
                  style={{ color: config.accentColor }}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.75}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d={config.iconPath}
                  />
                </svg>
              </div>

              {/* Count */}
              <motion.p
                className="mt-5 text-4xl font-extralight tabular-nums tracking-tight text-zinc-950"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{
                  delay: index * 0.1 + 0.25,
                  duration: 0.5,
                  ease: [0.22, 1, 0.36, 1],
                }}
              >
                {count.toLocaleString()}
              </motion.p>

              {/* Label + subtitle */}
              <p className="mt-2 text-sm font-medium text-zinc-950">
                {config.label}
              </p>
              <p className="mt-0.5 text-[11px] font-light leading-snug text-zinc-400">
                {config.subtitle}
              </p>
            </motion.div>
          );
        })}
      </div>

     
    </section>
  );
}