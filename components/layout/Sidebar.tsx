"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTheme } from "next-themes";
import {
  ChartNoAxesColumn,
  BellRing,
  Brain,
  LayoutDashboard,
  LogOut,
  Moon,
  Plus,
  Rocket,
  ShieldCheck,
  Sun,
  TrainFront,
  Upload,
  UserRound,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { FloatingDock, type FloatingDockItem } from "@/components/ui/floating-dock";
import { clearAuthSession } from "@/lib/auth";
import {
  DASHBOARD_EXIT_NAV_DELAY_MS,
  triggerDashboardExitTransition,
} from "@/lib/dashboard-transition";
import { clearPersona } from "@/lib/persona";
import { useAuth } from "@/hooks/useAuth";
import { usePersona } from "@/hooks/usePersona";

const navItems = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Campaigns", normalLabel: "Conferences", href: "/campaigns", icon: Rocket },
  { name: "New Campaign", href: "/campaigns/new", icon: Plus, superOnly: true },
  { name: "Upload Campaign", href: "/campaigns/upload", icon: Upload, superOnly: true },
  { name: "Nizo Finder", normalLabel: "Lead Sheet", href: "/leads", icon: TrainFront },
  { name: "My Leads", href: "/my-leads", icon: UserRound, normalOnly: true },
  { name: "NizoAI", href: "/nizo-ai", icon: Brain, normalOnly: true },
  { name: "Admin Panel", href: "/admin", icon: ShieldCheck, superOnly: true },
];

function dockIcon(Icon: React.ComponentType<{ className?: string }>) {
  return <Icon className="h-full w-full" />;
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { persona } = usePersona();
  const { isSuperAdmin, user } = useAuth();
  const { theme, setTheme } = useTheme();
  const [ringingBell, setRingingBell] = useState(false);
  const isDark = theme === "dark";
  const isDenseTableRoute = pathname === "/leads" || pathname === "/my-leads";
  const personaLabel = persona === "delegates" ? "Delegates" : persona === "production" ? "Production" : "Sales";

  const navigateWithDashboardTransition = (href: string) => {
    if (pathname === "/dashboard" && !href.startsWith("/dashboard")) {
      triggerDashboardExitTransition();
      window.setTimeout(() => {
        router.push(href);
      }, DASHBOARD_EXIT_NAV_DELAY_MS);
      return;
    }

    router.push(href);
  };

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

  const handleRingBell = async () => {
    if (ringingBell) return;

    const userName = user?.fullName?.trim() || user?.username?.trim() || "A sales user";
    setRingingBell(true);
    try {
      const response = await fetch("/api/ring-bell", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userName,
          userId: user?.id || "",
          username: user?.username || "",
        }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const detail = typeof data?.detail === "string" ? data.detail : "Could not send the bell email.";
        throw new Error(detail);
      }

      toast.success("Bell rung", {
        description: `${userName} successfully closed a deal.`,
      });
    } catch (error) {
      toast.error("Bell failed", {
        description: error instanceof Error ? error.message : "Could not send the bell email.",
      });
    } finally {
      setRingingBell(false);
    }
  };

  const items: FloatingDockItem[] = navItems
    .filter((item) => (isSuperAdmin ? !item.normalOnly : !item.superOnly))
    .map((item) => ({
      title: isSuperAdmin ? item.name : item.normalLabel ?? item.name,
      onClick: () => navigateWithDashboardTransition(item.href),
      active: pathname === item.href,
      icon: dockIcon(item.icon),
    }));

  items.push({
    title: "Stats",
    onClick: () => navigateWithDashboardTransition("/dashboard?stats=1"),
    icon: dockIcon(ChartNoAxesColumn),
    active: pathname === "/dashboard" && searchParams.get("stats") === "1",
  });

  if (!isSuperAdmin && persona === "sales") {
    items.push({
      title: ringingBell ? "Ringing deal bell" : "Ring the deal bell",
      icon: <BellRing className={ringingBell ? "h-full w-full animate-pulse" : "h-full w-full"} />,
      onClick: handleRingBell,
      disabled: ringingBell,
    });
  }

  items.push({
    title: isDark ? "Light mode" : "Dark mode",
    icon: isDark ? dockIcon(Sun) : dockIcon(Moon),
    onClick: () => setTheme(isDark ? "light" : "dark"),
  });

  if (isSuperAdmin) {
    items.push({
      title: `Workspaces - ${personaLabel}`,
      onClick: () => navigateWithDashboardTransition("/choose-persona"),
      icon: dockIcon(UserRound),
    });
  }

  items.push({
    title: "Sign out",
    icon: dockIcon(LogOut),
    onClick: handleSignOut,
  });

  const dock = (
    <FloatingDock
      items={items}
      desktopClassName={isDenseTableRoute ? "max-w-[calc(100vw-3rem)] origin-bottom scale-[1.02]" : "max-w-[calc(100vw-3rem)]"}
      mobileClassName="ml-auto"
    />
  );

  if (isDenseTableRoute) {
    return (
      <div className="fixed inset-x-0 bottom-0 z-50 flex justify-center px-4">
        <div className="group/nav-dock relative h-28 w-[min(44rem,calc(100vw-2rem))]">
          <div className="absolute bottom-0 left-1/2 h-6 w-52 -translate-x-1/2 rounded-t-full bg-transparent" aria-hidden />
          <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 translate-y-[5.75rem] opacity-0 transition duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/nav-dock:pointer-events-auto group-hover/nav-dock:translate-y-0 group-hover/nav-dock:opacity-100 group-focus-within/nav-dock:pointer-events-auto group-focus-within/nav-dock:translate-y-0 group-focus-within/nav-dock:opacity-100 md:bottom-6">
            {dock}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-x-0 bottom-4 z-50 flex justify-center px-4 md:bottom-6">
      {dock}
    </div>
  );
}
