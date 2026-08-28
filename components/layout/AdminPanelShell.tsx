"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useState, type CSSProperties } from "react";
import {
  Activity,
  CalendarDays,
  ClipboardCheck,
  BrainCircuit,
  ClipboardList,
  FileText,
  HardDrive,
  LayoutDashboard,
  LogOut,
  ServerCog,
  Settings,
  ShieldCheck,
  Tags,
  UserRound,
  UsersRound,
  Webhook,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { clearAuthSession, isCeoRole, isManagerRole } from "@/lib/auth";
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

const APP_VERSION_LABEL = "v0.3.0";

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
    : adminTabs;

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
        onMouseEnter={() => setSidebarHovered(true)}
        onMouseLeave={() => setSidebarHovered(false)}
        className={`sidebar-modern fixed left-0 top-0 z-40 hidden h-screen min-w-0 flex-col overflow-hidden font-sans text-white shadow-[22px_0_45px_-34px_rgba(2,10,27,0.65)] transition-[width,padding] duration-300 ease-out lg:flex ${
          sidebarExpanded ? "w-72 px-6 py-8" : "w-24 p-6"
        }`}
      >
        <div
          className={`pointer-events-none !absolute top-1/2 !z-0 -translate-y-1/2 rotate-12 opacity-40 transition-all duration-300 ${
            sidebarExpanded ? "-right-40" : "-right-72"
          }`}
        >
          <Webhook aria-hidden="true" className="h-[46rem] w-[46rem] text-white/14" strokeWidth={2} />
        </div>

        <div
          className={`mb-8 min-h-8 min-w-0 px-1 transition-all duration-300 ${
            sidebarExpanded ? "opacity-100" : "opacity-0"
          }`}
        >
          <div className="flex min-w-0 items-baseline gap-2 whitespace-nowrap">
            <span className="text-2xl font-normal tracking-wide text-white">supernizo</span>
            <span
              className="text-[1.35rem] font-normal leading-none tracking-wide text-white/78"
              style={{ fontFamily: '"Bungee Hairline", sans-serif' }}
            >
              Lite
            </span>
          </div>
          <span className="mt-1 block text-[10px] font-light tracking-[0.22em] text-white/40">
            {APP_VERSION_LABEL}
          </span>
        </div>

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
                <Link
                  href={item.href}
                  className="group block min-w-0"
                  aria-label={sidebarExpanded ? undefined : item.name}
                  title={sidebarExpanded ? undefined : item.name}
                >
                  <div
                    className={`relative flex min-w-0 items-center py-2 transition-all duration-300 ${
                      isActive
                        ? "bg-white/10 text-white"
                        : "text-white/40 hover:bg-white/5 hover:text-white/80"
                    } ${sidebarExpanded ? "gap-4 px-5" : "justify-center px-0"}`}
                  >
                    {isActive ? (
                      <motion.span
                        layoutId="admin-sidebar-active-bar"
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
                      <item.icon className="h-5 w-5" />
                    </span>

                    <span
                      className={`min-w-0 truncate whitespace-nowrap text-base tracking-tight transition-all duration-200 ${
                        isActive ? "font-medium" : "font-light"
                      } ${sidebarExpanded ? "flex-1 opacity-100" : "w-0 overflow-hidden opacity-0"}`}
                    >
                      {item.name}
                    </span>
                  </div>
                </Link>
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

      <div className="sidebar-modern fixed inset-x-0 top-0 z-40 border-b border-white/10 px-3 py-3 text-sidebar-foreground lg:hidden">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sidebar-secondary text-sidebar-primary-foreground">
              <Webhook className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-lg font-medium tracking-wide text-sidebar-foreground">supernizo</p>
              <p className="text-xs text-sidebar-foreground/70">{isManager ? "Manager Panel" : isCeo ? "CEO Panel" : "Admin Panel"}</p>
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

        <nav className="scrollbar-hide mt-3 flex gap-2 overflow-x-auto pb-1">
          {visibleTabs.map((item) => {
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

      <main
        className={`min-h-screen overflow-x-hidden bg-transparent p-4 pt-32 transition-[margin] duration-300 ease-out sm:p-5 sm:pt-32 lg:p-6 ${
          sidebarExpanded ? "lg:ml-72" : "lg:ml-24"
        }`}
        style={{ "--app-sidebar-width": sidebarExpanded ? "18rem" : "6rem" } as CSSProperties}
      >
        {children}
      </main>
    </>
  );
}
