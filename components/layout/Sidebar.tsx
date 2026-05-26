"use client";

import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
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
import { clearPersona } from "@/lib/persona";
import { useAuth } from "@/hooks/useAuth";
import { usePersona } from "@/hooks/usePersona";

const navItems = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Campaigns", normalLabel: "Events", href: "/campaigns", icon: Rocket },
  { name: "New Campaign", href: "/campaigns/new", icon: Plus, superOnly: true },
  { name: "Upload Campaign", href: "/campaigns/upload", icon: Upload, superOnly: true },
  { name: "Nizo Finder", normalLabel: "Lead Sheet", href: "/leads", icon: TrainFront },
  { name: "NizoAI", href: "/nizo-ai", icon: Brain, normalOnly: true },
  { name: "Admin Panel", href: "/admin", icon: ShieldCheck, superOnly: true },
];

function dockIcon(Icon: React.ComponentType<{ className?: string }>) {
  return <Icon className="h-full w-full" />;
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { persona } = usePersona();
  const { isSuperAdmin, user } = useAuth();
  const { theme, setTheme } = useTheme();
  const [ringingBell, setRingingBell] = useState(false);
  const isDark = theme === "dark";
  const personaLabel = persona === "delegates" ? "Delegates" : persona === "production" ? "Production" : "Sales";

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
      href: item.href,
      active: pathname === item.href,
      icon: dockIcon(item.icon),
    }));

  if (!isSuperAdmin && persona === "sales") {
    items.push({
      title: ringingBell ? "Ringing deal bell" : "Ring the deal bell",
      icon: <BellRing className={ringingBell ? "h-full w-full animate-pulse" : "h-full w-full"} />,
      onClick: handleRingBell,
      disabled: ringingBell,
    });
  }

  items.push(
    {
      title: isDark ? "Light mode" : "Dark mode",
      icon: isDark ? dockIcon(Sun) : dockIcon(Moon),
      onClick: () => setTheme(isDark ? "light" : "dark"),
    },
    {
      title: isSuperAdmin ? `Workspaces - ${personaLabel}` : user?.fullName?.trim() || user?.username || "Profile",
      href: isSuperAdmin ? "/choose-persona" : "/profile",
      icon: dockIcon(UserRound),
    },
    {
      title: "Sign out",
      icon: dockIcon(LogOut),
      onClick: handleSignOut,
    }
  );

  return (
    <div className="fixed inset-x-0 bottom-4 z-50 flex justify-center px-4 md:bottom-6">
      <FloatingDock
        items={items}
        desktopClassName="max-w-[calc(100vw-3rem)]"
        mobileClassName="ml-auto"
      />
    </div>
  );
}
