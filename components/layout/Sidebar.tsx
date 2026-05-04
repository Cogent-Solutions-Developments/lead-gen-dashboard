"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Brain,
  LayoutDashboard,
  Rocket,
  Webhook,
  Plus,
  Upload,
  TrainFront,
  UserRound,
  LogOut,
  ShieldCheck
} from "lucide-react";
import { useEffect, useState } from "react";
import { clearPersona } from "@/lib/persona";
import { usePersona } from "@/hooks/usePersona";
import { clearAuthSession } from "@/lib/auth";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const navItems = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Campaigns", normalLabel: "Events", href: "/campaigns", icon: Rocket },
  { name: "New Campaign", href: "/campaigns/new", icon: Plus, superOnly: true },
  { name: "Upload Leads", href: "/campaigns/upload", icon: Upload },
  // { name: "Completed", href: "/completed", icon: CheckCircle },
  { name: "Nizo Finder", normalLabel: "Lead Sheet", href: "/leads", icon: TrainFront },
  { name: "Admin Panel", href: "/admin", icon: ShieldCheck, superOnly: true },
  { name: "NizoAI", href: "/nizo-ai", icon: Brain, salesOnly: true },
];

type SidebarProps = {
  isExpanded: boolean;
  isPinned: boolean;
  onHoverChange: (next: boolean) => void;
  onPinnedChange: (next: boolean) => void;
};

export function Sidebar({ isExpanded, isPinned, onHoverChange, onPinnedChange }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { persona } = usePersona();
  const { isSuperAdmin } = useAuth();
  const [rotation, setRotation] = useState(0);
  const personaLabel = persona === "delegates" ? "Delegates" : persona === "production" ? "Production" : "Sales";

  const handleSignOut = async () => {
    try {
      clearAuthSession();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to sign out.";
      toast.error("Sign out failed", { description: message });
      return;
    }

    clearPersona();
    router.replace("/sign-in");
  };

  // Logic for random rotation intervals
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const rotateIcon = () => {
      setRotation((prev) => prev + 360);
      const randomDelay = Math.floor(Math.random() * 7000) + 3000;
      timeoutId = setTimeout(rotateIcon, randomDelay);
    };

    timeoutId = setTimeout(rotateIcon, 2000);
    return () => clearTimeout(timeoutId);
  }, []);

  return (
    <motion.aside
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
      onMouseEnter={() => onHoverChange(true)}
      onMouseLeave={() => onHoverChange(false)}
      className={`sidebar-modern fixed left-0 top-0 z-40 flex h-screen flex-col font-sans text-white shadow-[22px_0_45px_-34px_rgba(2,10,27,0.65)] transition-[width,padding] duration-300 ease-out ${
        isExpanded ? "w-72 p-10" : "w-24 p-6"
      }`}
    >
      <div
        className={`pointer-events-none !absolute top-[50%] !z-0 -translate-y-1/2 rotate-12 opacity-40 transition-all duration-300 ${
          isExpanded ? "-right-40" : "-right-72"
        }`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-[46rem] w-[46rem] text-white/14"
        >
          <path d="M18 16.98h-5.99c-1.1 0-1.95.94-2.48 1.9A4 4 0 0 1 2 17c.01-.7.2-1.4.57-2" />
          <path d="m6 17 3.13-5.78c.53-.97.1-2.18-.5-3.1a4 4 0 1 1 6.89-4.06" />
          <path d="m12 6 3.13 5.73C15.66 12.7 16.9 13 18 13a4 4 0 0 1 0 8" />
        </svg>
      </div>

      {/* 1. Logo Section */}
      <button
        type="button"
        aria-label={isPinned ? "Collapse sidebar" : "Pin expanded sidebar"}
        onClick={() => onPinnedChange(!isPinned)}
        className={`mb-16 grid w-full flex-shrink-0 items-center text-left transition-all ${
          isExpanded ? "grid-cols-[2.75rem_minmax(0,1fr)] gap-4 px-1" : "grid-cols-1 justify-items-center px-0"
        }`}
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1, rotate: rotation }}
          transition={{ 
            scale: { type: "spring", stiffness: 260, damping: 20 },
            rotate: { duration: 2, ease: "easeInOut" }
          }}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-xl ring-1 ring-white/10 shadow-lg"
        >
          <Webhook className="h-6 w-6" />
        </motion.div>
        <motion.span
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: isExpanded ? 1 : 0, x: isExpanded ? 0 : -8 }}
          transition={{ delay: 0.3 }}
          className={`whitespace-nowrap text-2xl font-normal tracking-wide text-white transition-[width] duration-300 ${
            isExpanded ? "w-auto" : "w-0 overflow-hidden"
          }`}
        >
          supernizo
        </motion.span>
      </button>

      {/* 2. Navigation Items (Scrollable if needed) */}
      <nav className={`flex-1 overflow-y-auto transition-[margin] duration-300 ${isExpanded ? "-mx-10" : "-mx-6"}`}>
        {navItems
          .filter((item) => (isSuperAdmin || !item.superOnly) && (!item.salesOnly || persona === "sales"))
          .map((item, index) => {
          const isActive = pathname === item.href;
          return (
            <motion.div
              key={item.name}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 * index }}
            >
              <Link href={item.href} className="block group">
                <div
                  className={`relative flex items-center py-5 transition-all duration-300 ${
                    isActive
                      ? "bg-white/10 text-white"
                      : "text-white/40 hover:bg-white/5 hover:text-white/80"
                  } ${isExpanded ? "gap-5 px-10" : "justify-center px-0"}`}
                >
                  {/* Active Indicator Bar */}
                  {isActive && (
                    <motion.div
                      layoutId="sidebar-active-bar"
                      className="absolute left-0 top-1/2 -translate-y-1/2 h-8 w-1.5 bg-white rounded-r-full shadow-[0_0_15px_rgba(255,255,255,0.5)]"
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}
                  
                  <item.icon className={`h-6 w-6 transition-all duration-300 ${
                    isActive ? "text-white scale-110" : "text-white/30 group-hover:text-white/60"
                  }`} />
                  
                  <span className={`whitespace-nowrap text-xl tracking-tight transition-all duration-200 ${
                    isActive ? "font-medium" : "font-light"
                  } ${isExpanded ? "w-auto opacity-100" : "w-0 overflow-hidden opacity-0"
                  }`}>
                    {isSuperAdmin ? item.name : item.normalLabel ?? item.name}
                  </span>
                </div>
              </Link>
            </motion.div>
          );
        })}
      </nav>

      {/* 3. Bottom Section */}
      <div className="mt-auto pt-8 flex flex-col gap-4 border-t border-white/10">
        {isSuperAdmin ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Link href="/">
              <button
                className={`flex items-center text-sm font-light tracking-tight text-white/40 transition-all hover:text-white group ${
                  isExpanded ? "gap-3 px-2" : "justify-center px-0"
                }`}
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 group-hover:bg-white/10 transition-colors">
                  <UserRound className="h-4 w-4 opacity-50" />
                </div>
                <span className={`whitespace-nowrap transition-all duration-200 ${isExpanded ? "w-auto opacity-100" : "w-0 overflow-hidden opacity-0"}`}>
                  {`Account - ${personaLabel}`}
                </span>
              </button>
            </Link>
          </motion.div>
        ) : null}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <button
            onClick={handleSignOut}
            className={`flex items-center text-sm font-light tracking-tight text-white/40 transition-all hover:text-white group ${
              isExpanded ? "gap-3 px-2" : "justify-center px-0"
            }`}
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 group-hover:bg-white/10 transition-colors">
              <LogOut className="h-4 w-4 opacity-50" />
            </div>
            <span className={`whitespace-nowrap transition-all duration-200 ${isExpanded ? "w-auto opacity-100" : "w-0 overflow-hidden opacity-0"}`}>
              Sign out
            </span>
          </button>
        </motion.div>
      </div>
    </motion.aside>
  );
}
