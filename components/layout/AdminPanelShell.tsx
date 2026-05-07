"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Activity,
  CalendarDays,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  Settings,
  ShieldCheck,
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
        className="sidebar-modern fixed left-0 top-0 z-40 flex h-screen w-72 flex-col p-5 font-sans text-sidebar-foreground"
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

      <main className="ml-72 min-h-screen bg-transparent p-6">{children}</main>
    </>
  );
}
