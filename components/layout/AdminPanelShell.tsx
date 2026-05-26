"use client";

import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  Activity,
  CalendarDays,
  BrainCircuit,
  FileText,
  HardDrive,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  Moon,
  ServerCog,
  Settings,
  ShieldCheck,
  Sun,
  Tags,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { FloatingDock, type FloatingDockItem } from "@/components/ui/floating-dock";
import { clearAuthSession } from "@/lib/auth";
import { clearPersona } from "@/lib/persona";
import { useAuth } from "@/hooks/useAuth";

const adminTabs = [
  {
    name: "Admin Dashboard",
    href: "/admin",
    icon: LayoutDashboard,
    match: (pathname: string) => pathname === "/admin",
  },
  {
    name: "Users",
    href: "/admin/users",
    icon: ShieldCheck,
    match: (pathname: string) => pathname === "/admin/users",
  },
  {
    name: "Events",
    href: "/admin/events",
    icon: CalendarDays,
    match: (pathname: string) => pathname === "/admin/events",
  },
  {
    name: "Categories",
    href: "/admin/categories",
    icon: Tags,
    match: (pathname: string) => pathname === "/admin/categories",
  },
  {
    name: "Agendas",
    href: "/admin/agendas",
    icon: FileText,
    match: (pathname: string) => pathname === "/admin/agendas",
  },
  {
    name: "Knowledge",
    href: "/admin/knowledge",
    icon: BrainCircuit,
    match: (pathname: string) => pathname === "/admin/knowledge",
  },
  {
    name: "Storage",
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
    name: "Monitor",
    href: "/settings/system-monitor",
    icon: Activity,
    match: (pathname: string) => pathname === "/settings/system-monitor",
  },
  {
    name: "Operations",
    href: "/admin/system-operations",
    icon: ServerCog,
    match: (pathname: string) => pathname === "/admin/system-operations",
  },
];

function dockIcon(Icon: React.ComponentType<{ className?: string }>) {
  return <Icon className="h-full w-full" />;
}

export function AdminPanelShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";

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

  const items: FloatingDockItem[] = adminTabs.map((item) => ({
    title: item.name,
    href: item.href,
    active: item.match(pathname),
    icon: dockIcon(item.icon),
  }));

  items.push(
    {
      title: isDark ? "Light mode" : "Dark mode",
      icon: isDark ? dockIcon(Sun) : dockIcon(Moon),
      onClick: () => setTheme(isDark ? "light" : "dark"),
    },
    {
      title: user?.username || "Workspaces",
      href: "/choose-persona",
      icon: dockIcon(UserRound),
    },
    {
      title: "Sign out",
      icon: dockIcon(LogOut),
      onClick: handleSignOut,
    }
  );

  return (
    <>
      <main className="min-h-screen overflow-x-hidden bg-transparent p-4 pb-28 sm:p-5 sm:pb-28 lg:p-6 lg:pb-28">
        {children}
      </main>
      <div className="fixed inset-x-0 bottom-4 z-50 flex justify-center px-4 md:bottom-6">
        <FloatingDock
          items={items}
          desktopClassName="max-w-[calc(100vw-3rem)]"
          mobileClassName="ml-auto"
        />
      </div>
    </>
  );
}
