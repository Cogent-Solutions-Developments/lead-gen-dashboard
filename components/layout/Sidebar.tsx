"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { 
  LayoutDashboard, 
  Rocket, 
  Webhook, 
  Plus, 
  CheckCircle, 
  Settings, 
  BarChart3, 
  Sparkles 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

const navItems = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Campaigns", href: "/campaigns", icon: Rocket },
  { name: "New Campaign", href: "/campaigns/new", icon: Plus },
  // { name: "Completed", href: "/completed", icon: CheckCircle },
];

export function Sidebar() {
  const pathname = usePathname();
  const [rotation, setRotation] = useState(0);

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
      className="fixed left-0 top-0 z-40 h-screen w-64 bg-sidebar p-5 text-sidebar-foreground font-sans border-r border-zinc-100 flex flex-col"
    >
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
          className="text-2xl font-medium tracking-wide text-sidebar-foreground"
        >
          supernizo
        </motion.span>
      </div>

      {/* 2. Navigation Items (Scrollable if needed) */}
      <nav className="space-y-2 flex-1 overflow-y-auto">
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
                  className={`w-full justify-start gap-3 rounded-full px-4 py-6 text-[15px] font-medium transition-all duration-200 ${
                    isActive
                      ? "bg-sidebar-secondary text-sidebar-primary-foreground shadow-md hover:bg-sidebar-secondary/60"
                      : "text-sidebar-foreground hover:bg-sidebar-primary/50 hover:text-sidebar-accent-foreground"
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
      <div className="mt-auto pt-6 space-y-4">
        
        {/* --- Nizo Analytics Card --- */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="relative overflow-hidden rounded-2xl bg-[#5984C8] p-5 text-white shadow-lg"
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
                className="mt-1 w-full bg-white text-zinc-900 hover:bg-zinc-200 font-semibold shadow-sm"
              >
                View Analytics
              </Button>
            </Link>
          </div>
        </motion.div>

        {/* --- Settings Link --- */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Link href="/settings">
            <Button 
              variant="ghost" 
              className="w-full justify-start gap-3 rounded-full px-4 py-6 text-[15px] text-sidebar-foreground/60 hover:bg-sidebar-primary/50 hover:text-sidebar-accent-foreground"
            >
              <Settings className="h-5 w-5" />
              Settings
            </Button>
          </Link>
        </motion.div>
      </div>
    </motion.aside>
  );
}