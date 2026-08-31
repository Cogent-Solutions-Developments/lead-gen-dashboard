"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, ChevronRight } from "lucide-react";

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
          <div>
            <nav aria-label="Breadcrumb" className="mb-1 flex items-center gap-1.5 text-sm text-slate-500">
              <Link href="/settings" className="transition-colors hover:text-blue-700">
                Settings
              </Link>
              <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
              <span aria-current="page" className="font-medium text-slate-700">
                Content Generation
              </span>
            </nav>
            <h1 className="text-2xl font-bold text-slate-900">Content Generation</h1>
            <p className="mt-1 max-w-2xl text-slate-500">
              Manage durable generation limits and monitor every workflow checkpoint from one place.
            </p>
          </div>
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
