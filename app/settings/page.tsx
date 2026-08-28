"use client";

import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRightIcon } from "@phosphor-icons/react/dist/csr/ArrowRight";
import { MagicWandIcon } from "@phosphor-icons/react/dist/csr/MagicWand";
import { PulseIcon } from "@phosphor-icons/react/dist/csr/Pulse";
import { ShieldSlashIcon } from "@phosphor-icons/react/dist/csr/ShieldSlash";
import { ChevronRight, Webhook } from "lucide-react";

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
            <Button
              type="button"
              variant="outline"
              className="h-10 border-slate-300 bg-white/90 text-slate-700 hover:bg-slate-50"
            >
              <PulseIcon className="mr-2 h-4 w-4" weight="duotone" aria-hidden="true" />
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
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Link
                href="/settings/content-generation"
                aria-label="Open Content Generation settings"
                className="group block h-full rounded-xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
              >
                <Card className="h-full border-slate-200 p-6 shadow-sm transition-all duration-200 group-hover:-translate-y-0.5 group-hover:border-blue-200 group-hover:bg-blue-50/30 group-hover:shadow-md">
                  <div className="flex items-start justify-between gap-5">
                    <div className="flex min-w-0 items-start gap-4">
                      <MagicWandIcon
                        size={36}
                        weight="duotone"
                        className="mt-0.5 shrink-0 text-blue-600"
                        aria-hidden="true"
                      />
                      <div>
                        <h2 className="font-semibold text-slate-900">Content Generation</h2>
                        <p className="mt-1 text-sm leading-6 text-slate-500">
                          Configure cost guardrails and inspect live workflow activity.
                        </p>
                      </div>
                    </div>
                    <ArrowRightIcon
                      className="mt-2 h-5 w-5 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-blue-600"
                      weight="bold"
                      aria-hidden="true"
                    />
                  </div>
                  <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50/70 p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Control center</p>
                    <p className="mt-2 text-sm font-medium text-slate-700">Limits and live monitoring</p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      Usage, checkpoints, pause and resume state, and configuration history
                    </p>
                  </div>
                </Card>
              </Link>
            </motion.div>

            <motion.button
              type="button"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.14 }}
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
              className="group h-full w-full rounded-xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2"
            >
              <Card className="h-full border-slate-200 p-6 shadow-sm transition-all duration-200 group-hover:-translate-y-0.5 group-hover:border-rose-200 group-hover:bg-rose-50/30 group-hover:shadow-md">
                <div className="flex items-start justify-between gap-5">
                  <div className="flex min-w-0 items-start gap-4">
                    <ShieldSlashIcon
                      size={36}
                      weight="duotone"
                      className="mt-0.5 shrink-0 text-rose-600"
                      aria-hidden="true"
                    />
                    <div>
                      <h2 className="font-semibold text-slate-900">Marketing Opt-out</h2>
                      <p className="mt-1 text-sm leading-6 text-slate-500">
                        Add suppressions, upload CSV files, and review all-channel opt-outs.
                      </p>
                    </div>
                  </div>
                  <ArrowRightIcon
                    className="mt-2 h-5 w-5 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-rose-600"
                    weight="bold"
                    aria-hidden="true"
                  />
                </div>
                <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50/70 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Suppression tools</p>
                  <p className="mt-2 text-sm font-medium text-slate-700">Manual and CSV management</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Existing validation, upload, filtering, and data behavior remain unchanged
                  </p>
                </div>
              </Card>
            </motion.button>
          </div>
        )}
      </div>
    </AdminPanelShell>
  );
}
