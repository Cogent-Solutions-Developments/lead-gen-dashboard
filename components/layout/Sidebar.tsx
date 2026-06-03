"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  Brain,
  LayoutDashboard,
  Rocket,
  Plus,
  Upload,
  TrainFront,
  UserRound,
  LogOut,
  ShieldCheck,
  BellRing,
  Loader2,
  X
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { clearPersona } from "@/lib/persona";
import { usePersona } from "@/hooks/usePersona";
import { clearAuthSession } from "@/lib/auth";
import { useAuth } from "@/hooks/useAuth";
import { UserAvatar } from "@/components/profile/UserAvatar";
import { toast } from "sonner";
import { getDailyDealBellMedia } from "@/lib/dealBellMedia";

const navItems = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Campaigns", normalLabel: "Conferences", href: "/campaigns", icon: Rocket },
  { name: "New Campaign", href: "/campaigns/new", icon: Plus, superOnly: true },
  { name: "Upload Campaign", href: "/campaigns/upload", icon: Upload, superOnly: true },
  // { name: "Completed", href: "/completed", icon: CheckCircle },
  { name: "Nizo Finder", normalLabel: "Lead Sheet", href: "/leads", icon: TrainFront },
  { name: "My Leads", href: "/my-leads", icon: UserRound, normalOnly: true },
  { name: "Nizo AI", href: "/nizo-ai", icon: Brain, normalOnly: true },
  { name: "Admin Panel", href: "/admin", icon: ShieldCheck, superOnly: true },
];
const APP_VERSION_LABEL = "v0.1.0";

type SidebarProps = {
  isExpanded: boolean;
  onHoverChange: (next: boolean) => void;
};

export function Sidebar({ isExpanded, onHoverChange }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { persona } = usePersona();
  const { isSuperAdmin, user } = useAuth();
  const [ringingBell, setRingingBell] = useState(false);
  const [ringBellModalOpen, setRingBellModalOpen] = useState(false);
  const personaLabel = persona === "delegates" ? "Delegates" : persona === "production" ? "Production" : "Sales";
  const dealBellMedia = useMemo(
    () => getDailyDealBellMedia(user?.id || user?.username),
    [user?.id, user?.username]
  );

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
      setRingBellModalOpen(false);
    } catch (error) {
      toast.error("Bell failed", {
        description: error instanceof Error ? error.message : "Could not send the bell email.",
      });
    } finally {
      setRingingBell(false);
    }
  };

  return (
    <>
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

      <div className={`mb-10 min-h-8 px-1 transition-all duration-300 ${isExpanded ? "opacity-100" : "opacity-0"}`}>
        <div className="flex items-baseline gap-2 whitespace-nowrap">
          <span className="text-2xl font-normal tracking-wide text-white">
            supernizo
          </span>
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

      {/* 1. Navigation Items (Scrollable if needed) */}
      <nav className={`flex-1 overflow-y-auto pt-4 transition-[margin] duration-300 ${isExpanded ? "-mx-10" : "-mx-6"}`}>
        {navItems
          .filter((item) => (isSuperAdmin ? !item.normalOnly : !item.superOnly))
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
                  } ${isExpanded ? "gap-8 px-10" : "justify-center px-0"}`}
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

      {!isSuperAdmin && persona === "sales" ? (
        <div className={`${isExpanded ? "-mx-2" : "mx-0"} pb-6 transition-all duration-300`}>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 * navItems.length }}
            className="flex justify-center"
          >
            <motion.button
              type="button"
              onClick={() => setRingBellModalOpen(true)}
              disabled={ringingBell}
              initial={false}
              animate={{
                width: isExpanded ? 196 : 44,
                height: isExpanded ? 56 : 44,
              }}
              transition={{ type: "spring", stiffness: 360, damping: 34, mass: 0.75 }}
              className={`group relative overflow-hidden rounded-full border border-white/18 bg-white/12 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_18px_34px_-30px_rgba(2,10,27,0.72)] backdrop-blur-xl transition-[background-color,border-color,box-shadow] duration-300 hover:border-white/32 hover:bg-white/18 disabled:cursor-not-allowed disabled:opacity-60 ${
                isExpanded
                  ? "flex items-center gap-4 px-3.5 text-left"
                  : "mx-auto flex items-center justify-center gap-0 px-0"
              }`}
            >
              <span className="pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(circle_at_28%_18%,rgba(255,255,255,0.24),transparent_38%)] opacity-70" />
              <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/28 bg-[#071f68]/92 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_16px_26px_-18px_rgba(1,10,45,0.95)] backdrop-blur-xl">
                <BellRing className={`h-[18px] w-[18px] ${ringingBell ? "animate-pulse" : ""}`} />
              </span>
              <AnimatePresence initial={false}>
                {isExpanded ? (
                  <motion.span
                    key="bell-label"
                    initial={{ opacity: 0, x: -8, width: 0 }}
                    animate={{ opacity: 1, x: 0, width: 124 }}
                    exit={{ opacity: 0, x: -8, width: 0 }}
                    transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
                    className="relative min-w-0 overflow-hidden whitespace-nowrap"
                  >
                    <span className="block text-sm font-medium tracking-tight">Ring the deal bell</span>
                    <span className="mt-0 block text-[11px] font-light text-white/58">Let the team know</span>
                  </motion.span>
                ) : null}
              </AnimatePresence>
            </motion.button>
          </motion.div>
        </div>
      ) : null}

      {/* 3. Bottom Section */}
      <div className="mt-auto pt-8 flex flex-col gap-4 border-t border-white/10">
        {isSuperAdmin ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className={isExpanded ? "" : "flex justify-center"}
          >
            <Link href="/">
              <button
                className={`flex items-center text-sm font-light tracking-tight text-white/40 transition-all hover:text-white group ${
                  isExpanded ? "gap-5 px-2" : "justify-center px-0"
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
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className={isExpanded ? "" : "flex justify-center"}
          >
            <Link href="/profile">
              <button
                className={`flex items-center text-sm font-light tracking-tight text-white/40 transition-all hover:text-white group ${
                  isExpanded ? "gap-5 px-2" : "h-8 w-8 justify-center px-0"
                }`}
              >
                <UserAvatar
                  user={user}
                  size="sm"
                  className="border-white/10 bg-white/8 text-white/70 transition-colors group-hover:bg-white/12"
                  showIconFallback
                />
                <span className={`whitespace-nowrap transition-all duration-200 ${isExpanded ? "w-auto opacity-100" : "w-0 overflow-hidden opacity-0"}`}>
                  {user?.fullName?.trim() || user?.username || "Profile"}
                </span>
              </button>
            </Link>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className={isExpanded ? "" : "flex justify-center"}
        >
          <button
            onClick={handleSignOut}
            className={`flex items-center text-sm font-light tracking-tight text-white/40 transition-all hover:text-white group ${
              isExpanded ? "gap-5 px-2" : "h-8 w-8 justify-center px-0"
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
    {ringBellModalOpen ? (
      <div className="fixed inset-0 z-[90] flex items-center justify-center p-6 font-sans">
        <button
          type="button"
          aria-label="Close ring bell dialog"
          className="absolute inset-0 bg-zinc-950/30 backdrop-blur-[3px]"
          onClick={() => {
            if (!ringingBell) setRingBellModalOpen(false);
          }}
        />

        <div className="relative z-[1] flex max-h-[calc(100dvh-3rem)] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-zinc-300 bg-white shadow-[0_32px_90px_-54px_rgba(2,10,27,0.82)]">
          <button
            type="button"
            disabled={ringingBell}
            aria-label="Close ring bell dialog"
            className="absolute right-5 top-5 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-zinc-300 bg-white p-0 text-zinc-500 shadow-none transition-colors hover:border-zinc-900 hover:text-zinc-950 disabled:cursor-not-allowed disabled:opacity-60"
            onClick={() => setRingBellModalOpen(false)}
          >
            <X className="h-4 w-4" />
          </button>

          <div className="shrink-0 px-7 pb-4 pt-7 sm:px-8 sm:pt-8">
            <div className="max-w-xl pr-12">
              <h2 className="text-4xl font-light leading-none tracking-tighter text-zinc-950">
                Ring the deal bell
              </h2>
              <p className="mt-3 text-sm font-light leading-6 text-zinc-500">
                Celebrate the closed deal and notify the team.
              </p>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 sm:px-8 sm:pb-8 scrollbar-modern">
            <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-[0_18px_38px_-34px_rgba(15,23,42,0.6)]">
              <div className="relative h-[min(27rem,calc(100dvh-18rem))] w-full overflow-hidden bg-zinc-950">
                <img
                  src={dealBellMedia.src}
                  alt=""
                  aria-hidden="true"
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-zinc-950/30 via-zinc-950/5 to-transparent" />
              </div>

              <div className="grid gap-5 border-t border-zinc-100 p-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-zinc-400">Deal bell</p>
                  <p className="mt-3 text-2xl font-light tracking-tight text-zinc-950">
                    Let the whole team know.
                  </p>
                  <p className="mt-2 text-sm font-light leading-6 text-zinc-500">
                    This sends the bell notification using your profile.
                  </p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
                  <button
                    type="button"
                    disabled={ringingBell}
                    onClick={() => setRingBellModalOpen(false)}
                    className="h-11 rounded-full border border-zinc-300 bg-white px-5 text-sm font-semibold text-zinc-600 shadow-none transition-colors hover:border-zinc-900 hover:text-zinc-950 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={ringingBell}
                    onClick={() => void handleRingBell()}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-emerald-500/20 bg-[#22c55e] px-5 text-sm font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_10px_22px_-14px_rgba(34,197,94,0.85)] transition-colors hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {ringingBell ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <BellRing className="h-4 w-4" />
                    )}
                    Ring bell
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    ) : null}
    </>
  );
}
