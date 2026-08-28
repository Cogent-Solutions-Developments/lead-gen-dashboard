"use client";

import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import { Activity, ChevronRight, ShieldOff, Webhook } from "lucide-react";
import { AdminPanelShell } from "@/components/layout/AdminPanelShell";
import { MarketingOptOutSettings } from "@/components/settings/MarketingOptOutSettings";
import { OutreachMailWebhookSettings } from "@/components/settings/OutreachMailWebhookSettings";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type SettingsSection = "outreach" | "opt-out" | null;

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState<SettingsSection>(null);

  return (
    <AdminPanelShell>
      <div>
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"
        >
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
            <p className="text-slate-500">Manage admin settings</p>
          </div>
          <Link href="/settings/system-monitor">
            <Button type="button" variant="outline" className="h-10 border-slate-300 bg-white/90 text-slate-700 hover:bg-slate-50">
              <Activity className="mr-2 h-4 w-4" />
              System Monitor
            </Button>
          </Link>
        </motion.div>

        {activeSection === "outreach" ? (
          <OutreachMailWebhookSettings onBack={() => setActiveSection(null)} />
        ) : activeSection === "opt-out" ? (
          <MarketingOptOutSettings onBack={() => setActiveSection(null)} />
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            <motion.button
              type="button"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              onClick={() => setActiveSection("outreach")}
              aria-label="Open Outreach Configuration"
              className="group text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            >
              <Card className="h-full p-6 transition-colors group-hover:border-blue-200 group-hover:bg-blue-50/30">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100">
                      <Webhook className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h2 className="font-semibold text-slate-900">Outreach Configuration</h2>
                      <p className="mt-1 text-sm leading-6 text-slate-500">Manage department-wise mail delivery webhooks and active routing.</p>
                    </div>
                  </div>
                  <ChevronRight className="mt-2 h-5 w-5 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-blue-600" />
                </div>
                <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50/70 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Available configuration</p>
                  <p className="mt-2 text-sm font-medium text-slate-700">Mail webhook</p>
                  <p className="mt-1 text-xs text-slate-500">Sales, Delegate, and Production departments</p>
                </div>
              </Card>
            </motion.button>

            <motion.button
              type="button"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.18 }}
              onClick={() => setActiveSection("opt-out")}
              aria-label="Open Marketing Opt-out"
              className="group text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2"
            >
              <Card className="h-full p-6 transition-colors group-hover:border-rose-200 group-hover:bg-rose-50/30">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-rose-100">
                      <ShieldOff className="h-5 w-5 text-rose-600" />
                    </div>
                    <div>
                      <h2 className="font-semibold text-slate-900">Marketing Opt-out</h2>
                      <p className="mt-1 text-sm leading-6 text-slate-500">Add suppressions, upload CSV files, and review all-channel opt-outs.</p>
                    </div>
                  </div>
                  <ChevronRight className="mt-2 h-5 w-5 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-rose-600" />
                </div>
                <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50/70 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Existing tools</p>
                  <p className="mt-2 text-sm font-medium text-slate-700">Manual and CSV suppression</p>
                  <p className="mt-1 text-xs text-slate-500">Existing behavior and data flow are unchanged</p>
                </div>
              </Card>
            </motion.button>
          </div>
        )}
      </div>
    </AdminPanelShell>
  );
}
