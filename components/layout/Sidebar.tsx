"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { LayoutDashboard, Rocket, Plus, Clock, CheckCircle, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";

const navItems = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Campaigns", href: "/campaigns", icon: Rocket },
  { name: "New Campaign", href: "/campaigns/new", icon: Plus },
  { name: "Queue", href: "/queue", icon: Clock },
  { name: "Completed", href: "/completed", icon: CheckCircle },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <motion.aside
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
      // Changed: Using sidebar-specific vars for the Deep Black background
      className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-sidebar-border bg-sidebar p-5 text-sidebar-foreground font-sans"
    >
      {/* Logo */}
      <div className="mb-10 flex items-center gap-3 px-2">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring" }}
          // Changed: Green logo icon background
          className="flex h-10 w-10 items-center justify-center rounded-full bg-sidebar-primary text-sidebar-primary-foreground"
        >
          <Rocket className="h-5 w-5" />
        </motion.div>
        <motion.span
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="text-xl font-semibold tracking-wide text-sidebar-foreground"
        >
          SuperNizo
        </motion.span>
      </div>

      <nav className="space-y-1.5">
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
                  // Changed: 
                  // 1. Active: Neon Green BG (sidebar-primary) with Black Text (sidebar-primary-foreground)
                  // 2. Inactive: Grey text, light hover
                  // 3. Rounded-full for the pill shape seen in the inspiration
                  className={`w-full justify-start gap-3 rounded-full px-4 py-6 text-[15px] font-medium transition-all duration-200 ${
                    isActive
                      ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md hover:bg-sidebar-primary/90"
                      : "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
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

      {/* Bottom section */}
      <div className="absolute bottom-6 left-5 right-5">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Link href="/settings">
            <Button 
              variant="ghost" 
              className="w-full justify-start gap-3 rounded-full px-4 py-6 text-[15px] text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
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