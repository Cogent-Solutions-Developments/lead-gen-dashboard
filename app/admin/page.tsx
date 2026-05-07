"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Activity,
  ArrowRight,
  CalendarDays,
  MessageSquare,
  Settings,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

const adminTasks = [
  {
    title: "User & Role Management",
    description: "Create users, rotate passwords, and assign pipeline access.",
    href: "/admin/users",
    icon: UsersRound,
    metric: "Access",
  },
  {
    title: "Event Registry",
    description: "Register events and control whether they are available for campaign workflows.",
    href: "/admin/events",
    icon: CalendarDays,
    metric: "Events",
  },
  {
    title: "Replies",
    description: "Review inbound WhatsApp conversations and unread activity.",
    href: "/replies",
    icon: MessageSquare,
    metric: "Inbox",
  },
  {
    title: "Settings",
    description: "Manage opt-outs, account settings, and admin-only service surfaces.",
    href: "/settings",
    icon: Settings,
    metric: "Controls",
  },
  {
    title: "System Monitor",
    description: "Inspect service health, jobs, queues, provider failures, logs, and warnings.",
    href: "/settings/system-monitor",
    icon: Activity,
    metric: "Health",
  },
];

export default function AdminDashboardPage() {
  const { user } = useAuth();

  return (
    <div className="font-sans flex min-h-[calc(100dvh-3rem)] flex-col overflow-y-auto bg-transparent p-1">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
      >
        <div>
          <p className="text-lg font-normal text-zinc-900">Admin Control</p>
          <h1 className="mt-0 text-2xl font-semibold tracking-tight text-zinc-900">Admin Dashboard</h1>
          <p className="mt-1 max-w-2xl text-sm text-zinc-500">
            Summary of super-admin tasks for {user?.fullName || user?.username || "this workspace"}.
          </p>
        </div>

        <Link href="/choose-persona">
          <Button
            type="button"
            variant="outline"
            className="h-10 border-zinc-200 bg-white/90 px-4 text-zinc-700 hover:bg-zinc-50"
          >
            <ShieldCheck className="mr-2 h-4 w-4" />
            Workspaces
          </Button>
        </Link>
      </motion.div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {adminTasks.map((task) => (
          <Link key={task.title} href={task.href}>
            <div className="h-full rounded-2xl border border-zinc-200 bg-white/88 p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-zinc-300 hover:bg-white">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">{task.metric}</p>
                  <h2 className="mt-2 text-base font-semibold tracking-tight text-zinc-900">{task.title}</h2>
                </div>
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 text-zinc-700">
                  <task.icon className="h-5 w-5" />
                </div>
              </div>
              <p className="mt-4 min-h-12 text-sm leading-relaxed text-zinc-500">{task.description}</p>
              <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-zinc-800">
                Open
                <ArrowRight className="h-3.5 w-3.5" />
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-5 rounded-2xl border border-zinc-200/85 bg-white/84 p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-zinc-900">Admin Task Flow</h2>
            <p className="mt-1 text-sm text-zinc-500">
              Start with users and event registry, then use replies, settings, and system monitor for operations.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {adminTasks.slice(0, 3).map((task) => (
              <Link key={task.title} href={task.href}>
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 border-zinc-200 bg-white px-3 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                >
                  <task.icon className="mr-1.5 h-3.5 w-3.5" />
                  {task.metric}
                </Button>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
