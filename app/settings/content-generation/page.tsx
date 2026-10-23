"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { BarChart3, ListChecks, Send } from "lucide-react";

import { AdminPanelShell } from "@/components/layout/AdminPanelShell";
import { ContentGenerationControlCenter } from "@/components/settings/ContentGenerationControlCenter";
import { StatusOutreachControlCenter } from "@/components/automated-outreach/StatusOutreachControlCenter";
import { SettingsBackButton } from "@/components/settings/SettingsBackButton";

const statusOutreachSections = [
  { view: "overview", label: "Overview", description: "Usage, leads & spend", icon: BarChart3 },
  { view: "runs", label: "Runs & recovery", description: "Agent runs and issues", icon: ListChecks },
  { view: "delivery", label: "Delivery tracking", description: "Emails and history", icon: Send },
] as const;

function ContentGenerationSettingsContent() {
  const searchParams = useSearchParams();
  const statusOutreach = searchParams.get("tab") === "status-outreach";
  const requestedView = searchParams.get("view");
  const statusView = requestedView === "runs" || requestedView === "delivery" ? requestedView : "overview";
  return (
    <AdminPanelShell>
      <div>
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
        >
          <div>
            <SettingsBackButton href="/settings" />
            <h1 className="text-2xl font-bold text-slate-900">Content Generation</h1>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <nav aria-label="Content generation" className="mb-4 grid gap-1 rounded-xl border border-slate-200 bg-white p-1 sm:grid-cols-2">
            {([{key: 'control-center', label: 'Control Center'}, {key: 'status-outreach', label: 'Status Outreach'}] as const).map(({key, label}) => <Link key={key} href={`/settings/content-generation?tab=${key}`} aria-current={(statusOutreach ? 'status-outreach' : 'control-center') === key ? 'page' : undefined} className={`flex h-11 items-center justify-center rounded-lg px-3 text-sm font-semibold transition-colors ${(statusOutreach ? 'status-outreach' : 'control-center') === key ? 'bg-blue-600 text-white shadow-sm shadow-blue-200' : 'text-slate-600 hover:bg-blue-50 hover:text-blue-700'}`}>{label}</Link>)}
          </nav>
          {statusOutreach ? (
            <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm lg:grid lg:grid-cols-[16rem_minmax(0,1fr)]">
              <aside className="min-w-0 border-b border-zinc-200 bg-zinc-50/70 p-3 lg:border-b-0 lg:border-r">
                <p className="hidden px-3 pb-3 pt-1 text-xs font-semibold uppercase tracking-wider text-zinc-500 lg:block">Status Outreach</p>
                <nav aria-label="Status Outreach sections" className="flex gap-2 overflow-x-auto [scrollbar-width:none] lg:flex-col lg:overflow-visible [&::-webkit-scrollbar]:hidden">
                  {statusOutreachSections.map(({ view, label, description, icon: Icon }) => {
                    const selected = statusView === view;
                    return (
                      <Link
                        key={view}
                        href={`/settings/content-generation?tab=status-outreach&view=${view}`}
                        aria-current={selected ? "page" : undefined}
                        className={`flex min-w-52 items-center gap-3 rounded-md border px-3 py-3 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 lg:min-w-0 ${
                          selected
                            ? "border-blue-200 bg-blue-50 text-blue-800 shadow-sm"
                            : "border-transparent text-zinc-600 hover:border-blue-100 hover:bg-white hover:text-blue-700"
                        }`}
                      >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-white/70 bg-white text-blue-700">
                          <Icon aria-hidden="true" className="h-4 w-4" />
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold">{label}</span>
                          <span className="mt-0.5 block text-xs text-zinc-500">{description}</span>
                        </span>
                      </Link>
                    );
                  })}
                </nav>
              </aside>
              <section className="min-w-0 bg-zinc-50/30 p-3 sm:p-5 lg:p-6" aria-label={`${statusOutreachSections.find(section => section.view === statusView)?.label} content`}>
                <StatusOutreachControlCenter view={statusView} />
              </section>
            </div>
          ) : <ContentGenerationControlCenter />}
        </motion.div>
      </div>
    </AdminPanelShell>
  );
}

export default function ContentGenerationSettingsPage() { return <Suspense fallback={<p className="p-6">Loading content generation…</p>}><ContentGenerationSettingsContent /></Suspense>; }
