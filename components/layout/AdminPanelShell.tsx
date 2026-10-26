"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useState } from "react";
import {
  CalendarDays,
  ClipboardCheck,
  BrainCircuit,
  ClipboardList,
  FileText,
  HardDrive,
  LayoutDashboard,
  LogOut,
  Phone,
  Settings,
  ShieldCheck,
  Tags,
  UserRound,
  UsersRound,
  Factory,
  Handshake,
  BarChart3,
} from "lucide-react";
import { SidebarNavItem } from "@/components/layout/SidebarNavItem";
import { MobileNavigation } from "@/components/layout/MobileNavigation";
import { SupernizoMark } from "@/components/brand/SupernizoMark";
import { SupernizoWordmark } from "@/components/brand/SupernizoWordmark";
import { revokeAutocallSession, clearAuthSession, isCeoRole, isManagerRole } from "@/lib/auth";
import { clearPersona } from "@/lib/persona";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const adminTabs = [
  {
    name: "Dashboard",
    href: "/admin",
    icon: LayoutDashboard,
    match: (pathname: string) => pathname === "/admin",
  },
  { name: "Autocall", href: "/autocall", icon: Phone, match: (pathname: string) => pathname === "/autocall" },
  {
    name: "User & Role Management",
    href: "/admin/users",
    icon: ShieldCheck,
    match: (pathname: string) => pathname === "/admin/users",
  },
  {
    name: "User Performance",
    href: "/admin/user-performance",
    icon: UsersRound,
    match: (pathname: string) => pathname === "/admin/user-performance",
  },
  {
    name: "Event Registry",
    href: "/admin/events",
    icon: CalendarDays,
    match: (pathname: string) => pathname === "/admin/events",
  },
  {
    name: "Event Inquiries",
    href: "/admin/event-submissions",
    icon: ClipboardList,
    match: (pathname: string) => pathname === "/admin/event-submissions",
  },
  {
    name: "Category Registry",
    href: "/admin/categories",
    icon: Tags,
    match: (pathname: string) => pathname === "/admin/categories",
  },
  {
    name: "Event Documents",
    href: "/admin/event-documents",
    icon: FileText,
    match: (pathname: string) => pathname === "/admin/event-documents" || pathname === "/admin/agendas",
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
    name: "Lead Requests",
    href: "/admin/lead-requests",
    icon: ClipboardCheck,
    match: (pathname: string) => pathname === "/admin/lead-requests",
  },
  {
    name: "Settings",
    href: "/settings",
    icon: Settings,
    match: (pathname: string) => pathname === "/settings" || pathname.startsWith("/settings/") || pathname === "/admin/system-operations",
  },
];

const intelligenceTabs = [
  { name: "Dashboard", href: "/admin/lead-intelligence", icon: LayoutDashboard, match: (path: string) => path === "/admin/lead-intelligence" },
  { name: "Sales", href: "/admin/lead-intelligence/sales", icon: BarChart3, match: (path: string) => path.startsWith("/admin/lead-intelligence/sales") },
  { name: "Delegate", href: "/admin/lead-intelligence/delegate", icon: Handshake, match: (path: string) => path.startsWith("/admin/lead-intelligence/delegate") },
  { name: "Production", href: "/admin/lead-intelligence/production", icon: Factory, match: (path: string) => path.startsWith("/admin/lead-intelligence/production") },
  { name: "Admin Panel", href: "/admin", icon: ShieldCheck, match: () => false },
];

export function AdminPanelShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const isManager = isManagerRole(user?.role);
  const isCeo = isCeoRole(user?.role);
  const [sidebarHovered, setSidebarHovered] = useState(false);
  const sidebarExpanded = sidebarHovered;

  if (isCeo) {
    return <>{children}</>;
  }

  const visibleTabs = isManager
    ? adminTabs.filter((item) => item.href === "/admin/user-performance")
    : pathname.startsWith("/admin/lead-intelligence") ? intelligenceTabs : adminTabs;

  const handleSignOut = async () => {
    try {
      await revokeAutocallSession();
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
        onMouseEnter={() => setSidebarHovered(true)}
        onMouseLeave={() => setSidebarHovered(false)}
        className={`sidebar-modern fixed left-0 top-0 z-40 hidden h-screen min-w-0 flex-col overflow-hidden font-sans text-white shadow-[22px_0_45px_-34px_rgba(2,10,27,0.65)] transition-[width,padding] duration-300 ease-out lg:flex ${
          sidebarExpanded ? "w-72 px-6 py-8" : "w-24 p-6"
        }`}
      >
        <div
          aria-hidden="true"
          className={`pointer-events-none !absolute top-1/2 !z-0 -translate-y-1/2 opacity-40 transition-all duration-300 ${
            sidebarExpanded ? "-right-40" : "-right-72"
          }`}
        >
          <SupernizoMark className="h-[46rem] w-[46rem] text-white/14" />
        </div>

        <SupernizoWordmark
          className={`mb-8 min-h-8 px-1 transition-all duration-300 ${
            sidebarExpanded ? "opacity-100" : "opacity-0"
          }`}
        />

        <nav
          className={`scrollbar-hide min-w-0 flex-1 overflow-y-auto overflow-x-hidden pt-2 transition-[margin] duration-300 ${
            sidebarExpanded ? "-mx-4" : "-mx-6"
          }`}
        >
          {visibleTabs.map((item, index) => {
            const isActive = item.match(pathname);
            return (
              <motion.div
                key={item.name}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.05 * index }}
              >
                <SidebarNavItem href={item.href} label={item.name} icon={item.icon} isActive={isActive} expanded={sidebarExpanded} compact={!pathname.startsWith("/admin/lead-intelligence")} activeIndicatorId="admin-sidebar-active-bar" />
              </motion.div>
            );
          })}
        </nav>

        <div className="mt-auto flex min-w-0 flex-col gap-3 border-t border-white/10 pt-5">
          <div className={sidebarExpanded ? "" : "flex justify-center"}>
            <Link href="/choose-persona">
              <button
                type="button"
                className={`group flex min-w-0 items-center text-sm font-light tracking-tight text-white/40 transition-all hover:text-white ${
                  sidebarExpanded ? "gap-5 px-2" : "h-8 w-8 justify-center px-0"
                }`}
                aria-label={sidebarExpanded ? undefined : user?.username || "Workspaces"}
                title={sidebarExpanded ? undefined : user?.username || "Workspaces"}
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/5 transition-colors group-hover:bg-white/10">
                  <UserRound className="h-4 w-4 opacity-50" />
                </span>
                <span
                  className={`min-w-0 truncate whitespace-nowrap transition-all duration-200 ${
                    sidebarExpanded ? "flex-1 opacity-100" : "w-0 overflow-hidden opacity-0"
                  }`}
                >
                  {user?.username || "Workspaces"}
                </span>
              </button>
            </Link>
          </div>

          <div className={sidebarExpanded ? "" : "flex justify-center"}>
            <button
              type="button"
              onClick={handleSignOut}
              className={`group flex min-w-0 items-center text-sm font-light tracking-tight text-white/40 transition-all hover:text-white ${
                sidebarExpanded ? "gap-5 px-2" : "h-8 w-8 justify-center px-0"
              }`}
              aria-label={sidebarExpanded ? undefined : "Sign out"}
              title={sidebarExpanded ? undefined : "Sign out"}
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/5 transition-colors group-hover:bg-white/10">
                <LogOut className="h-4 w-4 opacity-50" />
              </span>
              <span
                className={`min-w-0 truncate whitespace-nowrap transition-all duration-200 ${
                  sidebarExpanded ? "flex-1 opacity-100" : "w-0 overflow-hidden opacity-0"
                }`}
              >
                Sign out
              </span>
            </button>
          </div>
        </div>
      </motion.aside>

      <MobileNavigation
        title={isManager ? "Manager Panel" : pathname.startsWith("/admin/lead-intelligence") ? "Status Outreach" : "Admin Panel"}
        items={visibleTabs.map((item) => ({ ...item, isActive: item.match(pathname) }))}
        accountHref="/choose-persona"
        accountLabel={user?.username || "Workspaces"}
        onSignOut={handleSignOut}
      />

      <main
        className={`min-h-screen min-w-0 overflow-x-hidden bg-transparent p-4 pt-24 [--app-sidebar-width:0rem] transition-[margin] duration-300 ease-out sm:p-5 sm:pt-24 lg:p-6 ${
          sidebarExpanded ? "lg:ml-72 lg:[--app-sidebar-width:18rem]" : "lg:ml-24 lg:[--app-sidebar-width:6rem]"
        }`}
      >
        {children}
      </main>
    </>
  );
}
