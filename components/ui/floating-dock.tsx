"use client";

import Link from "next/link";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { ChevronUp } from "lucide-react";
import { useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export type FloatingDockItem = {
  title: string;
  icon: ReactNode;
  href?: string;
  onClick?: () => void;
  active?: boolean;
  disabled?: boolean;
};

export function FloatingDock({
  items,
  desktopClassName,
  mobileClassName,
}: {
  items: FloatingDockItem[];
  desktopClassName?: string;
  mobileClassName?: string;
}) {
  return (
    <>
      <FloatingDockDesktop items={items} className={desktopClassName} />
      <FloatingDockMobile items={items} className={mobileClassName} />
    </>
  );
}

function FloatingDockMobile({
  items,
  className,
}: {
  items: FloatingDockItem[];
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className={cn("relative block md:hidden", className)}>
      <AnimatePresence>
        {open ? (
          <motion.div
            layoutId="mobile-floating-dock"
            className="absolute bottom-full right-0 mb-3 flex flex-col items-end gap-2"
          >
            {items.map((item, index) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 10, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.96 }}
                transition={{ delay: (items.length - 1 - index) * 0.025 }}
              >
                <DockAction item={item} compact />
              </motion.div>
            ))}
          </motion.div>
        ) : null}
      </AnimatePresence>
      <button
        type="button"
        onClick={() => setOpen((next) => !next)}
        className="flex h-12 w-12 items-center justify-center rounded-full border border-zinc-300/80 bg-white/90 text-zinc-700 shadow-[0_18px_40px_-24px_rgba(2,10,27,0.65)] backdrop-blur-xl transition hover:bg-white dark:border-white/15 dark:bg-zinc-900/58 dark:text-zinc-200 dark:backdrop-saturate-150 dark:hover:bg-zinc-900/70"
        aria-label={open ? "Close navigation dock" : "Open navigation dock"}
      >
        <ChevronUp className={cn("h-5 w-5 transition-transform", open && "rotate-180")} />
      </button>
    </div>
  );
}

function FloatingDockDesktop({
  items,
  className,
}: {
  items: FloatingDockItem[];
  className?: string;
}) {
  const mouseX = useMotionValue(Infinity);

  return (
    <motion.nav
      onMouseMove={(event) => mouseX.set(event.clientX)}
      onMouseLeave={() => mouseX.set(Infinity)}
      className={cn(
        "mx-auto hidden h-16 items-end gap-3 rounded-2xl border border-zinc-300/80 bg-white/82 px-4 pb-3 shadow-[0_26px_70px_-38px_rgba(2,10,27,0.7)] backdrop-blur-2xl md:flex dark:border-white/15 dark:bg-zinc-900/52 dark:backdrop-saturate-150",
        className
      )}
      aria-label="Primary navigation"
    >
      {items.map((item) => (
        <IconContainer key={item.title} mouseX={mouseX} item={item} />
      ))}
    </motion.nav>
  );
}

function IconContainer({
  mouseX,
  item,
}: {
  mouseX: MotionValue<number>;
  item: FloatingDockItem;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState(false);

  const distance = useTransform(mouseX, (value) => {
    const bounds = ref.current?.getBoundingClientRect() ?? { left: 0, width: 0 };
    return value - bounds.left - bounds.width / 2;
  });

  const size = useSpring(useTransform(distance, [-150, 0, 150], [40, 72, 40]), {
    mass: 0.12,
    stiffness: 170,
    damping: 14,
  });
  const iconSize = useSpring(useTransform(distance, [-150, 0, 150], [20, 34, 20]), {
    mass: 0.12,
    stiffness: 170,
    damping: 14,
  });

  return (
    <DockAction item={item}>
      <motion.div
        ref={ref}
        style={{ width: size, height: size }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className={cn(
          "relative flex aspect-square items-center justify-center rounded-full border transition-colors",
          item.active
            ? "border-blue-500/70 bg-blue-600 text-white shadow-[0_14px_28px_-18px_rgba(37,99,235,0.8)]"
            : "border-zinc-300/70 bg-zinc-100 text-zinc-500 hover:border-zinc-400 hover:text-zinc-900 dark:border-white/15 dark:bg-zinc-800/58 dark:text-zinc-200 dark:backdrop-blur-xl dark:hover:bg-zinc-800/72 dark:hover:text-white",
          item.disabled && "cursor-not-allowed opacity-55"
        )}
      >
        <AnimatePresence>
          {hovered ? (
            <motion.div
              initial={{ opacity: 0, y: 8, x: "-50%" }}
              animate={{ opacity: 1, y: 0, x: "-50%" }}
              exit={{ opacity: 0, y: 4, x: "-50%" }}
              className="absolute -top-9 left-1/2 w-max rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-800 shadow-sm dark:border-white/15 dark:bg-zinc-900/78 dark:text-zinc-100 dark:backdrop-blur-xl"
            >
              {item.title}
            </motion.div>
          ) : null}
        </AnimatePresence>
        <motion.div style={{ width: iconSize, height: iconSize }} className="flex items-center justify-center">
          {item.icon}
        </motion.div>
      </motion.div>
    </DockAction>
  );
}

function DockAction({
  item,
  compact = false,
  children,
}: {
  item: FloatingDockItem;
  compact?: boolean;
  children?: ReactNode;
}) {
  if (children) {
    if (item.href) {
      return (
        <Link href={item.href} aria-label={item.title} className={cn(item.disabled && "pointer-events-none")}>
          {children}
        </Link>
      );
    }

    return (
      <button type="button" onClick={item.onClick} disabled={item.disabled} aria-label={item.title}>
        {children}
      </button>
    );
  }

  const className = cn(
    "flex h-11 w-11 items-center justify-center rounded-full border shadow-[0_16px_34px_-24px_rgba(2,10,27,0.72)] backdrop-blur-xl transition",
    item.active
      ? "border-blue-500/70 bg-blue-600 text-white"
      : "border-zinc-300/80 bg-white/92 text-zinc-600 hover:text-zinc-950 dark:border-white/15 dark:bg-zinc-900/60 dark:text-zinc-200 dark:backdrop-blur-xl dark:backdrop-saturate-150 dark:hover:bg-zinc-900/72 dark:hover:text-white",
    compact && "h-10 w-10",
    item.disabled && "cursor-not-allowed opacity-55"
  );

  if (item.href) {
    return (
      <Link href={item.href} aria-label={item.title} className={className}>
        <span className="h-5 w-5">{item.icon}</span>
      </Link>
    );
  }

  return (
    <button type="button" onClick={item.onClick} disabled={item.disabled} aria-label={item.title} className={className}>
      <span className="h-5 w-5">{item.icon}</span>
    </button>
  );
}
