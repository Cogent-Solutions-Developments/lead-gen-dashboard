"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";

import { AdminPanelShell } from "@/components/layout/AdminPanelShell";
import { ContentGenerationControlCenter } from "@/components/settings/ContentGenerationControlCenter";
import { Button } from "@/components/ui/button";

export default function ContentGenerationSettingsPage() {
  return (
    <AdminPanelShell>
      <div>
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
        >
          <h1 className="text-2xl font-bold text-slate-900">Content Generation</h1>
          <Link href="/settings">
            <Button
              type="button"
              variant="outline"
              className="h-10 border-slate-300 bg-white/90 text-slate-700 hover:bg-slate-50"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Settings
            </Button>
          </Link>
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
