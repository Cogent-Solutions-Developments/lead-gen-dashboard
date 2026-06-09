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
      className="pointer-events-none absolute inset-0 h-full w-full text-[rgba(148,163,184,0.24)] opacity-45"
      viewBox="0 0 420 176"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <g fill="none" strokeLinecap="round" strokeLinejoin="round">
        {grid}
        {statusKey === "follow-up" ? (
          <>
            <g stroke="currentColor" strokeOpacity="0.24" strokeWidth="1">
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
            <g stroke="currentColor" strokeOpacity="0.24" strokeWidth="1">
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
            <g stroke="currentColor" strokeOpacity="0.24" strokeWidth="1">
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
  if (period === "monthly") return "Monthly pipeline movement";
  if (period === "yearly") return "Yearly pipeline movement";
  return "Today's pipeline movement";
}

export function CampaignHeadsUp({
  items,
  statuses,
  loading,
  period = "daily",
}: CampaignHeadsUpProps) {
  if (loading) {
    return (
      <section className="relative mt-8">
        <div className="mb-5 h-7 w-72 animate-pulse rounded-full bg-white/8" />
        <div className="grid gap-4 md:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="animate-pulse rounded-[1.8rem] border border-white/10 bg-white/[0.035] p-6 ring-1 ring-white/8"
              style={{ minHeight: "11rem" }}
            >
              <div className="h-3 w-16 rounded bg-white/8" />
              <div className="mt-6 h-10 w-16 rounded bg-white/10" />
              <div className="mt-5 h-2 w-full rounded bg-white/8" />
              <div className="mt-4 h-2 w-24 rounded bg-white/8" />
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
  const maxTotal = Math.max(...statuses.map((status) => totals[status.statusKey] || 0), 1);

  return (
    <section className="relative mt-8">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[rgba(191,219,254,0.70)]">Status telemetry</p>
          <h2 className="mt-2 text-3xl font-light tracking-[-0.04em] text-[rgb(248,250,252)]">
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
          const progress = Math.min(count / maxTotal, 1);

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
              className="group relative min-h-52 overflow-hidden rounded-[1.85rem] border border-white/12 bg-[rgba(7,12,20,0.76)] p-6 ring-1 ring-white/8 shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_22px_70px_-50px_rgba(0,0,0,0.9)] transition-[border-color,background-color,transform] hover:-translate-y-1 hover:border-white/20 hover:bg-[rgba(11,18,29,0.82)]"
            >
              <div className="pointer-events-none absolute inset-0 bg-[rgba(255,255,255,0.02)]" />
              <IsometricCardBackground statusKey={status.statusKey} />

              <div className="relative z-10 flex min-h-40 flex-col justify-between">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="inline-flex rounded-full border border-white/12 bg-black/20 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[rgba(203,213,225,0.76)]">
                      {config.label}
                    </p>
                    <motion.p
                      className="mt-6 text-6xl font-light tabular-nums tracking-[-0.07em] text-[rgb(248,250,252)]"
                      initial={{ opacity: 0, scale: 0.86 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{
                        delay: index * 0.1 + 0.2,
                        duration: 0.5,
                        ease: [0.22, 1, 0.36, 1],
                      }}
                    >
                      {count.toLocaleString()}
                    </motion.p>
                  </div>
                  <span className="text-xs font-light tabular-nums text-[rgba(148,163,184,0.72)]">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </div>

                <div>
                  <div className="h-2 overflow-hidden rounded-full border border-white/8 bg-black/30 shadow-[inset_0_1px_3px_rgba(0,0,0,0.75)]">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${progress * 100}%` }}
                      transition={{ delay: index * 0.08 + 0.18, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                      className="h-full rounded-full bg-blue-500 shadow-[0_0_18px_-8px_rgba(59,130,246,0.85)]"
                    />
                  </div>
                  <p className="mt-4 text-xs font-light leading-5 text-[rgba(203,213,225,0.72)]">
                    {config.subtitle}
                  </p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
