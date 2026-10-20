"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";

import { AdminPanelShell } from "@/components/layout/AdminPanelShell";
import { ContentGenerationControlCenter } from "@/components/settings/ContentGenerationControlCenter";
import { StatusOutreachControlCenter } from "@/components/automated-outreach/StatusOutreachControlCenter";
import { SettingsBackButton } from "@/components/settings/SettingsBackButton";

function ContentGenerationSettingsContent() {
  const searchParams = useSearchParams();
  const statusOutreach = searchParams.get("tab") === "status-outreach";
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
          {statusOutreach ? <StatusOutreachControlCenter /> : <ContentGenerationControlCenter />}
        </motion.div>
      </div>
    </AdminPanelShell>
  );
}

export default function ContentGenerationSettingsPage() { return <Suspense fallback={<p className="p-6">Loading content generation…</p>}><ContentGenerationSettingsContent /></Suspense>; }
