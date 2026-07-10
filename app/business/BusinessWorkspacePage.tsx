"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, RefreshCw, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  getBusinessWorkspaceDashboard,
  type BusinessWorkspaceDashboard,
  type BusinessWorkspaceSlug,
} from "@/lib/auth";

type BusinessWorkspacePageProps = {
  workspace: BusinessWorkspaceSlug;
  fallbackTitle: string;
};

function statusMessage(error: unknown) {
  const status = typeof error === "object" && error && "status" in error ? Number(error.status) : 0;
  if (status === 403) return "You do not have permission to access this workspace.";
  if (status === 401) return "Session expired. Please sign in again.";
  return error instanceof Error ? error.message : "Could not load this workspace.";
}

export function BusinessWorkspacePage({ workspace, fallbackTitle }: BusinessWorkspacePageProps) {
  const [dashboard, setDashboard] = useState<BusinessWorkspaceDashboard | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setDashboard(await getBusinessWorkspaceDashboard(workspace));
    } catch (err) {
      setDashboard(null);
      setError(statusMessage(err));
    } finally {
      setLoading(false);
    }
  }, [workspace]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const title = dashboard?.title || fallbackTitle;

  return (
    <div className="min-h-[calc(100vh-3rem)] bg-zinc-50 text-zinc-950">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-5 border-b border-zinc-200 pb-7 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <Badge variant="outline" className="border-zinc-300 bg-white text-zinc-600">
              Foundation ready
            </Badge>
            <h1 className="mt-4 text-3xl font-semibold tracking-normal text-zinc-950 sm:text-4xl">{title}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-500">
              Features will be added after workflow finalization.
            </p>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" className="border-zinc-300 bg-white" asChild>
              <Link href="/profile">
                <UserRound className="h-4 w-4" />
                Profile
              </Link>
            </Button>
            <Button
              type="button"
              variant="outline"
              className="border-zinc-300 bg-white"
              onClick={() => void loadDashboard()}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </header>

        {error ? (
          <section className="flex items-start gap-3 border border-rose-200 bg-rose-50 p-5 text-rose-900">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            <p className="text-sm font-medium">{error}</p>
          </section>
        ) : (
          <section className="grid gap-4 md:grid-cols-3">
            <div className="border border-zinc-200 bg-white p-5">
              <p className="text-xs font-semibold uppercase tracking-normal text-zinc-400">Workspace</p>
              <p className="mt-3 text-lg font-medium capitalize text-zinc-950">{dashboard?.workspace || workspace}</p>
            </div>
            <div className="border border-zinc-200 bg-white p-5">
              <p className="text-xs font-semibold uppercase tracking-normal text-zinc-400">Status</p>
              <div className="mt-3 flex items-center gap-2 text-lg font-medium text-emerald-700">
                <CheckCircle2 className="h-5 w-5" />
                Foundation ready
              </div>
            </div>
            <div className="border border-zinc-200 bg-white p-5">
              <p className="text-xs font-semibold uppercase tracking-normal text-zinc-400">Capabilities</p>
              <p className="mt-3 break-words text-sm font-medium text-zinc-700">
                {dashboard?.capabilities?.join(", ") || "Loading"}
              </p>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
