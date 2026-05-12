"use client";

import { motion } from "framer-motion";
import { Plus, UploadCloud, Globe, Users, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";

const ACTIONS = [
  {
    label: "New Campaign",
    description: "Launch targeted outreach",
    icon: Plus,
    href: "/campaigns/new",
    adminOnly: true,
  },
  {
    label: "Upload Dataset",
    description: "Import lead sheets",
    icon: UploadCloud,
    href: "/campaigns/upload",
    adminOnly: false,
  },
  {
    label: "Global Registry",
    description: "Browse all intelligence",
    icon: Globe,
    href: "/leads",
    adminOnly: false,
  },
  {
    label: "Team Management",
    description: "Access control & roles",
    icon: Users,
    href: "/admin/users",
    adminOnly: true,
  },
];

export function QuickActions() {
  const { isSuperAdmin } = useAuth();

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {ACTIONS.filter((action) => !action.adminOnly || isSuperAdmin).map((action, index) => (
        <motion.div
          key={action.label}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
        >
          <Link
            href={action.href}
            className="group relative flex items-center gap-6 rounded-none border-b border-zinc-100 bg-transparent py-4 transition-all hover:border-zinc-950"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-zinc-100 bg-white text-zinc-400 transition-all group-hover:border-zinc-900 group-hover:bg-zinc-950 group-hover:text-white">
              <action.icon className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="block text-sm font-semibold text-zinc-950 group-hover:text-blue-700">
                {action.label}
              </span>
              <span className="block truncate text-[11px] font-light text-zinc-400">
                {action.description}
              </span>
            </div>
            <ArrowUpRight className="h-4 w-4 shrink-0 text-zinc-200 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-zinc-950" />
          </Link>
        </motion.div>
      ))}
    </div>
  );
}
