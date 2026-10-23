"use client";

import type { ComponentType } from "react";
import Link from "next/link";
import { motion } from "framer-motion";

/** Shared navigation treatment for department and admin workspaces. */
export function SidebarNavItem({ href, label, icon: Icon, isActive, expanded, compact = false, activeIndicatorId }: {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  isActive: boolean;
  expanded: boolean;
  compact?: boolean;
  activeIndicatorId: string;
}) {
  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      className="group block min-w-0"
      aria-label={expanded ? undefined : label}
      title={expanded ? undefined : label}
    >
      <div
        className={`relative flex min-w-0 items-center transition-all duration-300 ${compact ? "py-2" : "py-3.5"} ${
          isActive
            ? "bg-white/10 text-white"
            : "text-white/40 hover:bg-white/5 hover:text-white/80"
        } ${expanded ? "gap-4 px-5" : "justify-center px-0"}`}
      >
        {isActive ? (
          <motion.span
            layoutId={activeIndicatorId}
            className="absolute left-0 top-1/2 h-8 w-1.5 -translate-y-1/2 rounded-r-full bg-white shadow-[0_0_15px_rgba(255,255,255,0.5)]"
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          />
        ) : null}

        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-all duration-300 ${
            isActive
              ? "bg-white/12 text-white"
              : "text-white/35 group-hover:bg-white/6 group-hover:text-white/70"
          }`}
        >
          <Icon className="h-5 w-5" />
        </span>

        <span
          className={`min-w-0 truncate whitespace-nowrap text-base tracking-tight transition-all duration-200 ${
            isActive ? "font-medium" : "font-light"
          } ${expanded ? "flex-1 opacity-100" : "w-0 overflow-hidden opacity-0"}`}
        >
          {label}
        </span>
      </div>
    </Link>
  );
}
