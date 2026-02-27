"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { 
  LayoutDashboard, 
  Rocket, 
  Webhook, 
  Plus, 
  TrainFront,
  MessageSquare,
  UserRound,
  LogOut
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useMemo, useState } from "react";
import { usePersona } from "@/hooks/usePersona";
import { clearPersona } from "@/lib/persona";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { toast } from "sonner";

const navItems = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Campaigns", href: "/campaigns", icon: Rocket },
  { name: "New Campaign", href: "/campaigns/new", icon: Plus },
  // { name: "Completed", href: "/completed", icon: CheckCircle },
  { name: "Nizo Finder", href: "/leads", icon: TrainFront },
  { name: "Replies", href: "/replies", icon: MessageSquare },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [rotation, setRotation] = useState(0);
  const { persona } = usePersona();
  const personaLabel = useMemo(
    () => (persona === "delegates" ? "Delegates" : "Sales"),
    [persona]
  );

  const handleSignOut = async () => {
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
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
      className="sidebar-modern fixed left-0 top-0 z-40 flex h-screen w-72 flex-col p-5 font-sans text-sidebar-foreground"
    >
      <div className="pointer-events-none !absolute -right-40 top-[50%] !z-0 -translate-y-1/2 opacity-40 rotate-12">
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
      <div className="mb-10 flex items-center gap-3 px-2 flex-shrink-0">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1, rotate: rotation }}
          transition={{ 
            scale: { type: "spring", stiffness: 260, damping: 20 },
            rotate: { duration: 2, ease: "easeInOut" }
          }}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-sidebar-secondary text-sidebar-primary-foreground"
        >
          <Webhook className="h-5 w-5" />
        </motion.div>
        <motion.span
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="text-2xl font-medium tracking-wide text-sidebar-foreground drop-shadow-sm "
        >
          supernizo
        </motion.span>
      </div>

      {/* 2. Navigation Items (Scrollable if needed) */}
      <nav className="flex-1  space-y-2 overflow-y-auto pr-1">
        {navItems.map((item, index) => {
          const isActive = pathname === item.href;
          return (
            <motion.div
              key={item.name}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 * index }}
            >
              <Link href={item.href}>
                <Button
                  variant="ghost"
                  className={`w-full justify-start gap-3 rounded-lg border px-4 py-6 text-[15px] font-medium transition-all duration-200 ${
                    isActive
                      ? "sidebar-chip-active"
                      : "border-transparent bg-transparent text-sidebar-foreground/90 shadow-none hover:border-white/25 hover:bg-white/12 hover:text-sidebar-accent-foreground hover:shadow-[0_8px_18px_-16px_rgba(0,0,0,0.55)]"
                  }`}
                >
                  <item.icon className="h-5 w-5" />
                  {item.name}
                </Button>
              </Link>
            </motion.div>
          );
        })}
      </nav>

      {/* 3. Bottom Section: Analytics Card + Settings */}
      <div className="mt-auto pt-6 flex flex-col gap-2">
        
        {/* --- Nizo Analytics Card --- */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="relative mb-4 overflow-hidden rounded-2xl border border-white/25 bg-[linear-gradient(150deg,rgba(255,255,255,0.34)_0%,rgba(255,255,255,0.06)_45%,rgba(0,0,0,0.16)_100%)] p-5 text-white shadow-[0_20px_34px_-20px_rgba(0,0,0,0.85)] backdrop-blur-md"
        >
          {/* 1. THE WATERMARK IMAGE */}
          <div className="absolute -bottom-45 h-[500px] w-[500px] -right-45 z-0 opacity-40 pointer-events-none">
             <img 
               src="analytics.png" 
               alt="" 
               className="h-[550px] w-[550px] object-contain rotate-12"
             />
          </div>

          {/* 2. Subtle Glow Effect */}
          <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/5 blur-2xl z-0" />
          
          {/* 3. The Content */}
          <div className="relative z-10 flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <span className="font-medium text-lg tracking-tight">Nizo Analyzer</span>
            </div>
            
            <p className="text-xs font-regular text-white-700 leading-relaxed">
              Unlock deep insights into your campaign performance and ROI.
            </p>

            <Link href="/analytics">
              <Button 
                size="sm"
                variant="ghost"
                className="analytics-frost-btn mt-1 w-full font-medium"
              >
                View Analytics
              </Button>
            </Link>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Link href="/">
            <Button 
              variant="ghost" 
              className="w-full justify-start gap-3 rounded-full bg-transparent px-4 py-2 text-[15px] text-sidebar-foreground/70 hover:bg-white/10 hover:text-sidebar-accent-foreground"
            >
              <UserRound className="h-5 w-5" />
              <span className="flex items-center gap-2">
                <span>User Role</span>
                <span className="text-sidebar-foreground/30">-</span>
                <span className="text-sidebar-foreground/80">{personaLabel}</span>
              </span>
            </Button>
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Button
            variant="ghost"
            onClick={handleSignOut}
            className="w-full justify-start gap-3 rounded-full bg-transparent px-4 py-2 text-[15px] text-sidebar-foreground/70 hover:bg-white/10 hover:text-sidebar-accent-foreground"
          >
            <LogOut className="h-5 w-5" />
            Sign out
          </Button>
        </motion.div>
      </div>
    </motion.aside>
  );
}
