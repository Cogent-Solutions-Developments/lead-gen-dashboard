"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState, type ComponentType, type ReactNode } from "react";
import { LogOut, Menu, UserRound, X } from "lucide-react";
import { SupernizoWordmark } from "@/components/brand/SupernizoWordmark";

type MobileNavigationItem = {
  name: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
  isActive: boolean;
};

/** Shared phone/tablet navigation; the native dialog manages focus and Escape. */
export function MobileNavigation({ title, items, accountHref, accountLabel, onSignOut, children }: {
  title: string;
  items: MobileNavigationItem[];
  accountHref: string;
  accountLabel: string;
  onSignOut: () => void;
  children?: ReactNode;
}) {
  const pathname = usePathname();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const id = useId();

  useEffect(() => {
    dialogRef.current?.close();
  }, [pathname]);

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 1024px)");
    const closeOnDesktop = () => {
      if (desktop.matches) dialogRef.current?.close();
    };
    desktop.addEventListener("change", closeOnDesktop);
    return () => desktop.removeEventListener("change", closeOnDesktop);
  }, []);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, [open]);

  const close = () => dialogRef.current?.close();

  return (
    <>
      <header className="sidebar-modern fixed inset-x-0 top-0 z-40 flex h-20 items-center justify-between gap-3 border-b border-white/10 px-4 text-white lg:hidden">
        <div className="min-w-0">
          <SupernizoWordmark size="sm" />
          <p className="mt-1 truncate text-xs text-white/80">{title}</p>
        </div>
        <button
          type="button"
          aria-label="Open navigation menu"
          aria-expanded={open}
          aria-controls={id}
          aria-haspopup="dialog"
          onClick={() => { dialogRef.current?.showModal(); setOpen(true); }}
          className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-white transition-colors hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          <Menu className="size-6" />
        </button>
      </header>

      <dialog
        ref={dialogRef}
        id={id}
        aria-labelledby={`${id}-title`}
        onClose={() => setOpen(false)}
        onClick={(event) => {
          if (event.target !== event.currentTarget) return;
          const bounds = event.currentTarget.getBoundingClientRect();
          if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) close();
        }}
        className="sidebar-modern fixed inset-y-0 left-0 m-0 h-dvh max-h-none w-[min(22rem,calc(100%-2rem))] max-w-none border-0 p-0 text-white shadow-2xl backdrop:bg-slate-950/50 backdrop:backdrop-blur-sm open:flex open:flex-col lg:hidden"
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/15 px-4 py-4">
          <div className="min-w-0">
            <SupernizoWordmark size="sm" />
            <h2 id={`${id}-title`} className="mt-2 text-sm font-medium text-white/85">{title}</h2>
          </div>
          <button type="button" aria-label="Close navigation menu" onClick={close} className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-white">
            <X className="size-6" />
          </button>
        </div>

        <nav aria-label="Main navigation" className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4" onClick={(event) => {
          if ((event.target as HTMLElement).closest("a, button")) close();
        }}>
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/60">Navigation</p>
          <div className="space-y-1">
            {items.map(({ name, href, icon: Icon, isActive }) => (
              <Link key={href} href={href} aria-current={isActive ? "page" : undefined} className={`flex min-h-11 items-center gap-3 rounded-xl px-3 py-3 text-sm leading-5 transition-colors focus-visible:outline-2 focus-visible:outline-white ${isActive ? "bg-white font-semibold text-blue-900 shadow-sm" : "text-white/90 hover:bg-white/10"}`}>
                <Icon className="size-5 shrink-0" />
                <span className="min-w-0 break-words">{name}</span>
              </Link>
            ))}
          </div>
          {children}
        </nav>

        <div className="shrink-0 space-y-1 border-t border-white/15 px-3 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <Link href={accountHref} onClick={close} className="flex min-h-11 items-center gap-3 rounded-xl px-3 py-3 text-sm text-white/90 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-white">
            <UserRound className="size-5 shrink-0" /><span className="min-w-0 break-words">{accountLabel}</span>
          </Link>
          <button type="button" onClick={() => { close(); onSignOut(); }} className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm text-white/90 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-white">
            <LogOut className="size-5 shrink-0" />Sign out
          </button>
        </div>
      </dialog>
    </>
  );
}
