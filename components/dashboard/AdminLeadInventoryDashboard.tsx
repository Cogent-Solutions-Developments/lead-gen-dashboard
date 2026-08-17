"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import { UserAvatar } from "@/components/profile/UserAvatar";
import { useAuth } from "@/hooks/useAuth";
import { getDashboardLeadInventory, type DashboardLeadInventory } from "@/lib/api";

const LeadInventoryOverview = dynamic(
  () => import("@/components/dashboard/LeadInventoryOverview").then((module) => module.LeadInventoryOverview),
  {
    ssr: false,
    loading: () => <div className="mt-8 h-[36rem] animate-pulse border border-zinc-200 bg-white" />,
  }
);

const DASHBOARD_AUTO_REFRESH_MS = 60_000;

function getDateLabel() {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  }).format(new Date());
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "An unexpected error occurred.";
}

export function AdminLeadInventoryDashboard() {
  const { user } = useAuth();
  const [leadInventory, setLeadInventory] = useState<DashboardLeadInventory | null>(null);
  const [loadingLeadInventory, setLoadingLeadInventory] = useState(true);
  const [leadInventoryError, setLeadInventoryError] = useState<string | null>(null);

  const loadLeadInventory = useCallback(async () => {
    setLoadingLeadInventory(true);
    try {
      setLeadInventory(await getDashboardLeadInventory());
      setLeadInventoryError(null);
    } catch (error) {
      setLeadInventoryError(getErrorMessage(error));
    } finally {
      setLoadingLeadInventory(false);
    }
  }, []);

  useEffect(() => {
    void loadLeadInventory();
  }, [loadLeadInventory]);

  useEffect(() => {
    const refreshDashboard = () => {
      if (document.visibilityState === "hidden") return;
      void loadLeadInventory();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") refreshDashboard();
    };

    window.addEventListener("focus", refreshDashboard);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    const intervalId = window.setInterval(refreshDashboard, DASHBOARD_AUTO_REFRESH_MS);

    return () => {
      window.removeEventListener("focus", refreshDashboard);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.clearInterval(intervalId);
    };
  }, [loadLeadInventory]);

  return (
    <div className="flex min-h-[calc(100dvh-3rem)] flex-1 flex-col bg-[#f7f7f7] font-sans text-zinc-950">
      <div className="w-full px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
        <div className="flex w-full flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <UserAvatar user={user} size="lg" className="bg-white shadow-sm" />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-zinc-950">
                {user?.fullName || user?.username || "Profile"}
              </p>
              {user?.bio ? <p className="max-w-sm truncate text-xs text-zinc-500">{user.bio}</p> : null}
            </div>
          </div>
          <span className="ml-auto inline-flex h-10 items-center rounded-full border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-800">
            {getDateLabel()}
          </span>
        </div>

        <LeadInventoryOverview
          data={leadInventory}
          loading={loadingLeadInventory}
          error={leadInventoryError}
        />
      </div>
    </div>
  );
}
