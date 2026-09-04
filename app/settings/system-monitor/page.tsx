"use client";

import dynamic from "next/dynamic";
import { AdminPanelShell } from "@/components/layout/AdminPanelShell";
import { useAuth } from "@/hooks/useAuth";

function LoadingMonitor() {
  return <div className="p-6 text-sm text-muted-foreground" role="status">Loading System Monitor…</div>;
}

// Load only the dashboard for the current role, keeping the existing CEO view.
const LiveSystemMonitor = dynamic(() => import("@/components/settings/LiveSystemMonitor"), { loading: LoadingMonitor });
const LegacySystemMonitorPage = dynamic(() => import("@/components/settings/LegacySystemMonitor"), { loading: LoadingMonitor });

export default function SystemMonitorPage() {
  const { isSuperAdmin } = useAuth();
  return isSuperAdmin
    ? <AdminPanelShell><LiveSystemMonitor /></AdminPanelShell>
    : <LegacySystemMonitorPage />;
}
