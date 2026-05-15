"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { usePersona } from "@/hooks/usePersona";
import { getAuthHeader, getCachedAuthUserDisplayName } from "@/lib/auth";
import {
  listEvents,
  listEventLeads,
  listWorkflowStatuses,
  type EventLeadListItem,
  type EventSummaryItem,
  type WorkflowStatusDefinitionItem,
} from "@/lib/apiRouter";


import { getDailyManifesto } from "@/lib/manifesto";
import { CampaignHeadsUp } from "@/components/dashboard/CampaignHeadsUp";

type SalesMarathonRunner = {
  id: string;
  name: string;
  initials: string;
  proposalCount: number;
};

type EventHeadsUpItem = {
  event: EventSummaryItem;
  statusCounts: Record<string, number>;
};

const FALLBACK_WORKFLOW_STATUSES: WorkflowStatusDefinitionItem[] = [
  {
    id: "dashboard-follow-up",
    statusKey: "follow-up",
    label: "Follow Up",
    isSystemDefault: true,
    sortOrder: 10,
    isActive: true,
  },
  {
    id: "dashboard-proposal-sent",
    statusKey: "proposal-sent",
    label: "Proposal Sent",
    isSystemDefault: true,
    sortOrder: 20,
    isActive: true,
  },
  {
    id: "dashboard-deal-closed",
    statusKey: "deal-closed",
    label: "Deal Closed",
    isSystemDefault: true,
    sortOrder: 30,
    isActive: true,
  },
];

function getDisplayName(user: ReturnType<typeof useAuth>["user"]) {
  const values = [user?.fullName, getCachedAuthUserDisplayName(user), user?.username]
    .map((value) => value?.trim())
    .filter(Boolean) as string[];
  const rolePlaceholders = new Set([
    "sales_user",
    "sales user",
    "delegate_user",
    "delegate user",
    "production_user",
    "production user",
    "super_admin_user",
    "super admin user",
  ]);

  return values.find((value) => !rolePlaceholders.has(value.toLowerCase())) || "there";
}

function firstName(value: string) {
  return value.split(/\s+/)[0] || value;
}

function getDateLabel() {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  }).format(new Date());
}

function getTimeGreeting() {
  const hour = new Date().getHours();

  if (hour < 5) return "Hey Night Owl";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  if (hour < 21) return "Good evening";
  return "Good night";
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Could not load dashboard data.";
}

async function listSalesMarathonLeaderboard() {
  const response = await fetch("/api/sales-marathon/leaderboard", {
    headers: getAuthHeader(),
  });
  if (!response.ok) throw new Error("Failed to load sales marathon.");
  const data = await response.json() as { runners?: SalesMarathonRunner[] };
  return Array.isArray(data.runners) ? data.runners : [];
}

function PixelAvatar({ colorHex, seed }: { colorHex: string; seed: string }) {
  const url = `https://api.dicebear.com/9.x/identicon/svg?seed=${encodeURIComponent(seed)}&rowColor=${colorHex.replace('#', '')}&backgroundColor=transparent`;
  return (
    <div className="w-6 h-6 overflow-hidden">
      <img 
        src={url} 
        alt="Identicon" 
        className="w-full h-full object-contain"
      />
    </div>
  );
}

function SalesMarathon({
  runners,
  loading,
}: {
  runners: SalesMarathonRunner[];
  loading: boolean;
}) {
  const dailyTarget = 5;
  const barPalette = [
    { bg: "bg-[#2977e7]", hex: "2977e7" },
    { bg: "bg-emerald-500", hex: "10b981" },
    { bg: "bg-amber-500", hex: "f59e0b" },
    { bg: "bg-rose-500", hex: "f43f5e" },
    { bg: "bg-indigo-500", hex: "6366f1" },
    { bg: "bg-teal-500", hex: "14b8a6" },
    { bg: "bg-orange-500", hex: "f97316" },
  ];

  return (
    <section className="relative min-h-[35rem] overflow-hidden border border-zinc-200 bg-white px-8 py-8 shadow-sm">
      <div className="relative flex items-baseline justify-between gap-6 border-b border-zinc-100 pb-6">
        <div>
          <h2 className="text-4xl font-extralight tracking-tight text-zinc-950">
            Daily KPI Tracker
          </h2>
          <p className="mt-3 text-sm font-light text-zinc-500">
            5 proposals a day keeps the sales stress far away.
          </p>
        </div>
      </div>

      <div className="relative mt-12 flex h-80 items-end justify-between gap-4">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center text-sm font-light text-zinc-400 italic">
            Synchronizing records...
          </div>
        ) : runners.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center text-sm font-light text-zinc-400 italic">
            No active records for the current period.
          </div>
        ) : (
          runners.map((runner, index) => {
            const progress = Math.min(runner.proposalCount / dailyTarget, 1);
            const colorItem = barPalette[index % barPalette.length];
            return (
              <div key={runner.id} className="group relative flex h-full flex-1 flex-col items-center justify-end">
                <div className="mb-4 flex flex-col items-center gap-1">
                  <span className="text-2xl font-extralight text-zinc-950">
                    {runner.proposalCount}
                  </span>
                </div>

                <div className="relative h-full w-8 bg-zinc-100 overflow-hidden">
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${progress * 100}%` }}
                    transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
                    className={`absolute bottom-0 w-full ${colorItem.bg}`}
                  />
                  {/* Grid markers */}
                  <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="w-full h-[1px] bg-white/20" />
                    ))}
                  </div>
                </div>

                <div className="mt-6 flex flex-col items-center gap-3">
                  <PixelAvatar colorHex={colorItem.hex} seed={runner.id} />
                  <h3 className="max-w-[4.5rem] truncate text-[10px] font-medium tracking-wide text-zinc-950 text-center">
                    {runner.name.split(' ')[0]}
                  </h3>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="mt-12 border-t border-zinc-100 pt-6">
        <p className="text-[10px] leading-relaxed text-zinc-400">
          * This data reflects the total number of proposals sent within the last 24-hour cycle.
        </p>
      </div>
    </section>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { persona } = usePersona();
  const [salesRunners, setSalesRunners] = useState<SalesMarathonRunner[]>([]);
  const [loadingSalesMarathon, setLoadingSalesMarathon] = useState(true);
  const [eventHeadsUp, setEventHeadsUp] = useState<EventHeadsUpItem[]>([]);
  const [workflowStatuses, setWorkflowStatuses] = useState<WorkflowStatusDefinitionItem[]>(FALLBACK_WORKFLOW_STATUSES);
  const [loadingEventHeadsUp, setLoadingEventHeadsUp] = useState(true);
  const displayName = firstName(getDisplayName(user));
  const greeting = getTimeGreeting();
  const manifesto = getDailyManifesto(user?.id || "");
  const workspaceLabel = persona === "delegates" ? "Delegates" : persona === "production" ? "Production" : "Sales";

  useEffect(() => {
    let alive = true;

    async function loadDashboard() {
      setLoadingSalesMarathon(true);
      try {
        const runners = await listSalesMarathonLeaderboard();
        if (!alive) return;
        setSalesRunners(runners);
      } catch (error) {
        if (!alive) return;
        toast.error("Dashboard sync failed", { description: getErrorMessage(error) });
        setSalesRunners([]);
      } finally {
        if (alive) setLoadingSalesMarathon(false);
      }
    }

    void loadDashboard();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;

    async function loadPersonalStats() {
      if (!user?.id) return;
      setLoadingEventHeadsUp(true);
      try {
        // 1. Fetch workflow statuses
        let activeStatuses = FALLBACK_WORKFLOW_STATUSES;
        try {
          const statusResponse = await listWorkflowStatuses();
          activeStatuses = (statusResponse.statuses || FALLBACK_WORKFLOW_STATUSES)
             .filter((status) =>
              ["follow-up", "proposal-sent", "deal-closed"].includes(status.statusKey)
            )
            .sort((a, b) => {
              const order = { "follow-up": 1, "proposal-sent": 2, "deal-closed": 3 };
              return (order[a.statusKey as keyof typeof order] || 99) - (order[b.statusKey as keyof typeof order] || 99);
            });
        } catch (e) {
          console.warn("[Dashboard] listWorkflowStatuses failed, using fallback", e);
        }
        setWorkflowStatuses(activeStatuses);
        if (!alive) return;

        // 2. Fetch events then leads per event (same API the lead sheet uses)
        let events: EventSummaryItem[] = [];
        try {
          const eventsResponse = await listEvents();
          events = eventsResponse.events || [];
        } catch (e) {
          console.error("[Dashboard] listEvents FAILED", e);
        }
        if (!alive) return;

        let allLeads: EventLeadListItem[] = [];
        for (const event of events) {
          if (!alive) return;
          try {
            const response = await listEventLeads(event.canonicalEventKey);
            allLeads = allLeads.concat(response.items || []);
          } catch (e) {
            console.error(`[Dashboard] listEventLeads FAILED for "${event.canonicalEventKey}"`, e);
          }
        }
        if (!alive) return;

        // 3. Filter to leads this user has worked on
        const userId = user.id;
        const username = user.username?.toLowerCase();
        const userDisplayName = (user.fullName || getCachedAuthUserDisplayName(user))?.toLowerCase();

        const myLeads = allLeads.filter((lead) => {
          if (lead.workflowCommentUpdatedByUserId === userId) return true;
          if (lead.manualLeadAddedByUserId === userId) return true;
          if (username && lead.workflowCommentUpdatedByUsername?.toLowerCase() === username) return true;
          if (userDisplayName && lead.workflowCommentUpdatedByUserDisplayName?.toLowerCase() === userDisplayName) return true;
          return false;
        });

        console.log("[Dashboard] myLeads (filtered for user):", myLeads.length);

        // 4. Build status counts
        const statusCounts: Record<string, number> = {};
        activeStatuses.forEach((s) => {
          statusCounts[s.statusKey] = myLeads.filter(
            (l) => l.workflowStatus === s.statusKey
          ).length;
        });

        setEventHeadsUp([{
          event: {
            canonicalEventKey: "personal",
            canonicalEventName: "Personal Stats",
            leadCount: myLeads.length,
            campaignCount: 0,
            relatedCampaignNames: [],
          },
          statusCounts,
        }]);
      } catch (error) {
        if (!alive) return;
        console.error("[Dashboard] loadPersonalStats CRASHED", error);
        setEventHeadsUp([]);
      } finally {
        if (alive) setLoadingEventHeadsUp(false);
      }
    }

    void loadPersonalStats();
    return () => {
      alive = false;
    };
  }, [persona, user?.id]);

  return (
    <div className="flex h-screen flex-1 flex-col overflow-hidden bg-[#f7f7f7] font-sans text-zinc-950">
      <header className="relative isolate h-full min-h-0 w-full overflow-y-auto px-8 py-7 lg:px-12">
        <div className="relative z-10 flex w-full justify-end">
          <span className="inline-flex h-9 items-center rounded-full border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-500">
            {getDateLabel()}
          </span>
        </div>

        <div className="relative z-10 mt-10 grid gap-10 text-left xl:grid-cols-[minmax(0,1fr)_26rem]">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col"
          >
            <p className="mb-4 text-lg font-normal text-zinc-500">
              {workspaceLabel} Workspace
            </p>

            <h1 className="text-[2.125rem] leading-[1.1] tracking-[-0.04em] text-zinc-950 sm:text-[2.75rem]">
              <span className="font-medium">{greeting}, {displayName}.</span> <span className="font-light">“{manifesto}”</span>
            </h1>

            <p className="mt-6 max-w-3xl text-xl font-light leading-relaxed text-zinc-500">
              Your performance summary across all outreach efforts.
            </p>

            <CampaignHeadsUp
              items={eventHeadsUp}
              statuses={workflowStatuses}
              loading={loadingEventHeadsUp}
            />
          </motion.div>

          <div className="h-fit">
            <SalesMarathon runners={salesRunners} loading={loadingSalesMarathon} />
          </div>
        </div>
      </header>
    </div>
  );
}
