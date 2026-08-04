"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const pathname = usePathname();
  const supportsDarkMode = pathname.startsWith("/campaigns");

  useEffect(() => {
    if (supportsDarkMode) return;
    const resetTheme = window.requestAnimationFrame(() => setTheme("light"));
    return () => window.cancelAnimationFrame(resetTheme);
  }, [setTheme, supportsDarkMode]);

  if (!supportsDarkMode || !resolvedTheme) return null;
  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="fixed right-5 top-5 z-[100] inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white/95 text-slate-700 shadow-lg shadow-slate-950/10 backdrop-blur transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 dark:border-zinc-600 dark:bg-zinc-800/95 dark:text-zinc-100 dark:shadow-black/30 dark:hover:bg-zinc-700 dark:focus:ring-zinc-100 dark:focus:ring-offset-zinc-900"
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
