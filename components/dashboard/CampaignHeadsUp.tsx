"use client";

import { motion } from "framer-motion";
import { type DashboardPeriod, type EventSummaryItem, type WorkflowStatusDefinitionItem } from "@/lib/apiRouter";

type EventHeadsUpItem = {
  event: EventSummaryItem;
  statusCounts: Record<string, number>;
};

interface CampaignHeadsUpProps {
  items: EventHeadsUpItem[];
  statuses: WorkflowStatusDefinitionItem[];
  loading: boolean;
  period?: DashboardPeriod;
}

const STATUS_CONFIG: Record<string, { label: string; subtitle: string }> = {
  new: {
    label: "New",
    subtitle: "Fresh delegate records",
  },
  "first-call": {
    label: "First Call",
    subtitle: "Initial calls completed",
  },
  "follow-up": {
    label: "Followups",
    subtitle: "Leads awaiting your next touchpoint",
  },
  contacted: {
    label: "Contacted",
    subtitle: "Email and WhatsApp outreach completed",
  },
  confirmed: {
    label: "Confirmed",
    subtitle: "Delegate confirmations completed",
  },
  "proposal-sent": {
    label: "Proposals Sent",
    subtitle: "Proposals delivered and pending review",
  },
  "deal-closed": {
    label: "Closed Deals",
    subtitle: "Successfully converted deals",
  },
};

function IsometricCardBackground({ statusKey }: { statusKey: string }) {
  const grid = (
    <path
      d="M198 176h190M248 144h162M308 112h112"
      stroke="currentColor"
      strokeOpacity="0.035"
      strokeWidth="1"
    />
  );

  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full text-blue-600"
      viewBox="0 0 420 176"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <g fill="none" strokeLinecap="round" strokeLinejoin="round">
        {grid}
        {statusKey === "follow-up" ? (
          <>
            <g stroke="#d5dbe3" strokeOpacity="0.34" strokeWidth="1">
              <path d="M276 34h86v54h-86z" />
              <path d="M276 39l43 30 43-30" />
              <path d="M276 88l31-26M362 88l-31-26" />
              <path d="M314 110h72v45h-72z" />
              <path d="M314 114l36 25 36-25" />
              <path d="M314 155l26-22M386 155l-26-22" />
            </g>
            <g stroke="currentColor" strokeOpacity="0.07" strokeWidth="1.2">
              <path d="M70 88h82v52H70z" />
              <path d="M70 93l41 29 41-29" />
              <path d="M70 140l30-25M152 140l-30-25" />
              <path d="M128 55h62v39h-62z" />
              <path d="M128 59l31 22 31-22" />
            </g>
          </>
        ) : statusKey === "proposal-sent" ? (
          <>
            <g stroke="#d5dbe3" strokeOpacity="0.34" strokeWidth="1">
              <path d="M282 16h70l22 22v90h-92V16z" />
              <path d="M352 16v22h22" />
              <path d="M302 64h52M302 84h42M302 104h50" />
            </g>
            <g stroke="currentColor" strokeOpacity="0.07" strokeWidth="1.2">
              <path d="M74 65h76l24 24v72H74V65z" />
              <path d="M150 65v24h24" />
              <path d="M94 103h58M94 124h42M94 145h54" />
              <path d="M96 48h70" strokeOpacity="0.045" />
              <path d="M112 31h70" strokeOpacity="0.035" />
            </g>
          </>
        ) : (
          <>
            <g stroke="#d5dbe3" strokeOpacity="0.34" strokeWidth="1">
              <path d="M284 52h92v78h-92z" />
              <path d="M304 78l12 12 24-29" />
              <path d="M352 75h12" />
              <path d="M304 108l12 12 24-29" />
              <path d="M352 105h12" />
            </g>
            <g stroke="currentColor" strokeOpacity="0.07" strokeWidth="1.2">
              <path d="M78 78h112v84H78z" />
              <path d="M101 106l14 14 28-34" />
              <path d="M155 101h18" />
              <path d="M101 139l14 14 28-34" />
              <path d="M155 134h18" />
            </g>
          </>
        )}
      </g>
    </svg>
  );
}

function achievedHeading(period: DashboardPeriod = "daily") {
  if (period === "monthly") return "Here's what you've achieved this month";
  if (period === "yearly") return "Here's what you've achieved this year";
  return "Here's what you've achieved today";
}

export function CampaignHeadsUp({
  items,
  statuses,
  loading,
  period = "daily",
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

  return (
    <section className="relative mt-10 flex flex-1 flex-col justify-end">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-normal tracking-tight text-zinc-950">
            {achievedHeading(period)}
          </h2>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {statuses.map((status, index) => {
          const count = totals[status.statusKey] || 0;
          const config = STATUS_CONFIG[status.statusKey] || {
            label: status.label,
            subtitle: "Pipeline status",
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
              className="group relative min-h-44 border border-zinc-200 bg-white p-6 shadow-[0_1px_2px_rgba(60,64,67,0.08),0_1px_3px_1px_rgba(60,64,67,0.06)] transition-all duration-200 hover:border-blue-200 hover:shadow-[0_1px_3px_rgba(60,64,67,0.16),0_4px_8px_3px_rgba(60,64,67,0.08)]"
            >
              <IsometricCardBackground statusKey={status.statusKey} />

              <motion.p
                className="relative z-10 text-6xl font-normal tabular-nums tracking-tight text-zinc-950"
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

              <p className="relative z-10 mt-3">
                <span className="inline-flex bg-blue-600 px-1.5 py-0.5 text-sm font-medium leading-5 text-white">
                {config.label}
                </span>
              </p>
              <p className="relative z-10 mt-1 text-xs font-normal leading-5 text-zinc-500">
                {config.subtitle}
              </p>
            </motion.div>
          );
        })}
      </div>

     
    </section>
  );
}
