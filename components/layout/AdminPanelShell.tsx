"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Activity,
  CalendarDays,
  BrainCircuit,
  FileText,
  HardDrive,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  ServerCog,
  Settings,
  ShieldCheck,
  Tags,
  UserRound,
  Webhook,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { clearAuthSession } from "@/lib/auth";
import { clearPersona } from "@/lib/persona";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const adminTabs = [
  {
    name: "Admin Dashboard",
    href: "/admin",
    icon: LayoutDashboard,
    match: (pathname: string) => pathname === "/admin",
  },
  {
    name: "User & Role Management",
    href: "/admin/users",
    icon: ShieldCheck,
    match: (pathname: string) => pathname === "/admin/users",
  },
  {
    name: "Event Registry",
    href: "/admin/events",
    icon: CalendarDays,
    match: (pathname: string) => pathname === "/admin/events",
  },
  {
    name: "Category Registry",
    href: "/admin/categories",
    icon: Tags,
    match: (pathname: string) => pathname === "/admin/categories",
  },
  {
    name: "Agenda Library",
    href: "/admin/agendas",
    icon: FileText,
    match: (pathname: string) => pathname === "/admin/agendas",
  },
  {
    name: "Knowledge Library",
    href: "/admin/knowledge",
    icon: BrainCircuit,
    match: (pathname: string) => pathname === "/admin/knowledge",
  },
  {
    name: "Storage Control",
    href: "/admin/storage",
    icon: HardDrive,
    match: (pathname: string) => pathname === "/admin/storage",
  },
  {
    name: "Replies",
    href: "/replies",
    icon: MessageSquare,
    match: (pathname: string) => pathname === "/replies",
  },
  {
    name: "Settings",
    href: "/settings",
    icon: Settings,
    match: (pathname: string) => pathname === "/settings",
  },
  {
    name: "System Monitor",
    href: "/settings/system-monitor",
    icon: Activity,
    match: (pathname: string) => pathname === "/settings/system-monitor",
  },
  {
    name: "System Operations",
    href: "/admin/system-operations",
    icon: ServerCog,
    match: (pathname: string) => pathname === "/admin/system-operations",
  },
];

export function AdminPanelShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();

  const handleSignOut = async () => {
    try {
      clearAuthSession();
      clearPersona();
      router.replace("/sign-in");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to sign out.";
      toast.error("Sign out failed", { description: message });
    }
  };

  return (
    <>
      <motion.aside
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="sidebar-modern fixed left-0 top-0 z-40 hidden h-screen w-72 flex-col p-5 font-sans text-sidebar-foreground lg:flex"
      >
        <div className="mb-8 flex shrink-0 items-center gap-3 px-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sidebar-secondary text-sidebar-primary-foreground">
            <Webhook className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xl font-medium tracking-wide text-sidebar-foreground drop-shadow-sm">supernizo</p>
            <p className="text-xs text-sidebar-foreground/70">Admin Panel</p>
          </div>
        </div>

        <nav className="flex-1 space-y-2 overflow-y-auto pr-1">
          {adminTabs.map((item, index) => {
            const isActive = item.match(pathname);
            return (
              <motion.div
                key={item.name}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.05 * index }}
              >
                <Link href={item.href}>
                  <Button
                    variant="ghost"
                    className={`h-auto min-h-12 w-full justify-start gap-3 rounded-lg border px-4 py-3 text-left text-[15px] font-medium leading-snug transition-all duration-200 ${
                      isActive
                        ? "sidebar-chip-active"
                        : "border-transparent bg-transparent text-sidebar-foreground/90 shadow-none hover:border-white/25 hover:bg-white/12 hover:text-sidebar-accent-foreground"
                    }`}
                  >
                    <item.icon className="h-5 w-5" />
                    <span className="whitespace-normal">{item.name}</span>
                  </Button>
                </Link>
              </motion.div>
            );
          })}
        </nav>

        <div className="mt-auto space-y-2 pt-6">
          <Link href="/choose-persona">
            <Button
              variant="ghost"
              className="h-auto min-h-10 w-full justify-start gap-3 rounded-full bg-transparent px-4 py-2 text-[15px] text-sidebar-foreground/70 hover:bg-white/10 hover:text-sidebar-accent-foreground"
            >
              <UserRound className="h-5 w-5" />
              <span className="truncate">{user?.username || "Workspaces"}</span>
            </Button>
          </Link>
          <Button
            variant="ghost"
            onClick={handleSignOut}
            className="h-auto min-h-10 w-full justify-start gap-3 rounded-full bg-transparent px-4 py-2 text-[15px] text-sidebar-foreground/70 hover:bg-white/10 hover:text-sidebar-accent-foreground"
          >
            <LogOut className="h-5 w-5" />
            Sign out
          </Button>
        </div>
      </motion.aside>

      <div className="sidebar-modern fixed inset-x-0 top-0 z-40 border-b border-white/10 px-3 py-3 text-sidebar-foreground lg:hidden">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sidebar-secondary text-sidebar-primary-foreground">
              <Webhook className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-lg font-medium tracking-wide text-sidebar-foreground">supernizo</p>
              <p className="text-xs text-sidebar-foreground/70">Admin Panel</p>
            </div>
          </div>

          <Button
            variant="ghost"
            onClick={handleSignOut}
            className="h-10 shrink-0 rounded-full bg-white/10 px-3 text-sidebar-foreground/80 hover:bg-white/15 hover:text-sidebar-accent-foreground"
          >
            <LogOut className="h-4 w-4" />
            <span className="sr-only">Sign out</span>
          </Button>
        </div>

        <nav className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {adminTabs.map((item) => {
            const isActive = item.match(pathname);
            return (
              <Link key={item.name} href={item.href} className="shrink-0">
                <Button
                  variant="ghost"
                  className={`h-10 gap-2 rounded-full border px-3 text-sm ${
                    isActive
                      ? "border-white/70 bg-white text-zinc-950"
                      : "border-white/20 bg-white/10 text-sidebar-foreground/85 hover:bg-white/15 hover:text-sidebar-accent-foreground"
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.name}</span>
                </Button>
              </Link>
            );
          })}
        </nav>
      </div>

      <main className="min-h-screen overflow-x-hidden bg-transparent p-4 pt-32 sm:p-5 sm:pt-32 lg:ml-72 lg:p-6">{children}</main>
    </>
  );
}
