"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { usePersona } from "@/hooks/usePersona";
import { getCachedAuthUserDisplayName } from "@/lib/auth";
import { listEvents, type EventSummaryItem } from "@/lib/apiRouter";

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

export default function DashboardPage() {
  const { user } = useAuth();
  const { persona } = usePersona();
  const [events, setEvents] = useState<EventSummaryItem[]>([]);
  const displayName = firstName(getDisplayName(user));
  const greeting = getTimeGreeting();
  const workspaceLabel = persona === "delegates" ? "Delegates" : persona === "production" ? "Production" : "Sales";
  const workLabel = persona === "delegates" ? "delegate" : persona === "production" ? "production" : "sales";

  useEffect(() => {
    let alive = true;

    async function loadDashboard() {
      try {
        const eventResponse = await listEvents();

        if (!alive) return;
        setEvents(eventResponse.events || []);
      } catch (error) {
        if (!alive) return;
        toast.error("Dashboard sync failed", { description: getErrorMessage(error) });
        setEvents([]);
      }
    }

    void loadDashboard();
    return () => {
      alive = false;
    };
  }, []);

  const totalProspects = useMemo(
    () => events.reduce((sum, event) => sum + Number(event.leadCount || 0), 0),
    [events]
  );

  return (
    <div className="flex min-h-[calc(100dvh-3rem)] flex-1 flex-col overflow-hidden bg-[#f7f7f7] p-1 font-sans text-zinc-950">
      <header className="grid min-h-[calc(100dvh-4.5rem)] w-full grid-rows-[auto_1fr]">
        <div className="flex w-full justify-center">
          <span className="inline-flex h-9 items-center rounded-full border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-500">
            {getDateLabel()}
          </span>
        </div>

        <div className="flex items-center justify-center pb-12 text-center">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-5xl"
          >
            <p className="mb-4 text-xl font-normal text-zinc-500">
              {workspaceLabel} Workspace
            </p>

            <h1 className="text-5xl font-light leading-[1.08] tracking-[-0.04em] text-zinc-950 sm:text-6xl 2xl:text-7xl">
              {greeting}, {displayName}. Here is where {workLabel} work starts.
            </h1>

            <p className="mt-6 text-xl font-light leading-relaxed text-zinc-500">
              Choose an event, run NizoAI, upload leads, or move directly into the lead sheet.
            </p>
          </motion.div>
        </div>
      </header>
    </div>
  );
}
