"use client";

import { motion } from "framer-motion";

import { AdminPanelShell } from "@/components/layout/AdminPanelShell";
import { ContentGenerationControlCenter } from "@/components/settings/ContentGenerationControlCenter";
import { SettingsBackButton } from "@/components/settings/SettingsBackButton";

export default function ContentGenerationSettingsPage() {
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
          <ContentGenerationControlCenter />
        </motion.div>
      </div>
    </AdminPanelShell>
  );
}
