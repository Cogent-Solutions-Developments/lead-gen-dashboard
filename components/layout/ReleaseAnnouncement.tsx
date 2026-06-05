"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import type { AuthSession } from "@/lib/auth";

const RELEASE_VERSION = "v0.3.0";
const RELEASE_STORAGE_PREFIX = "supernizo.release.v0.3.0.login-dismissed";
const RELEASE_STORAGE_EVENT = "supernizo-release-dismissed";
const RELEASE_EXPIRES_AT = new Date(2026, 5, 10).getTime();

const releaseFeatures = [
  {
    title: "My Leads workspace",
    description: "Personal lead uploads now live in My Leads, isolated by sales, delegate, and production users.",
  },
  {
    title: "Database separation",
    description: "The shared Lead Sheet area is now Database, keeping admin/shared records separate from personal uploads.",
  },
  {
    title: "Cleaner upload flow",
    description: "Upload templates now use persona-specific columns, validation, and a calmer error state.",
  },
  {
    title: "Multi-contact channels",
    description: "Delegate and production records can show multiple emails and phone numbers without crowding the sheet.",
  },
  {
    title: "Daily dashboard focus",
    description: "KPI tracker and summary cards now open directly on the daily view.",
  },
  {
    title: "Profile refresh",
    description: "Profile details, completion progress, avatar controls, theme preview, and custom date picker are updated.",
  },
];

function releaseStorageKey(session: AuthSession) {
  const userKey = session.user.id || session.user.username || "user";
  const loginKey = session.expiresAt || session.accessToken.slice(-12) || "session";
  return `${RELEASE_STORAGE_PREFIX}.${userKey}.${loginKey}`;
}

function releaseIsActive() {
  return Date.now() < RELEASE_EXPIRES_AT;
}

export function ReleaseAnnouncement({ session }: { session: AuthSession }) {
  const storageKey = releaseStorageKey(session);
  const canOpenMyLeads = session.user.role !== "super_admin_user";
  const [activeIndex, setActiveIndex] = useState(0);
  const activeFeature = releaseFeatures[activeIndex];

  const dismiss = useCallback(() => {
    window.sessionStorage.setItem(storageKey, "true");
    window.dispatchEvent(new CustomEvent(RELEASE_STORAGE_EVENT));
  }, [storageKey]);

  const showPreviousFeature = useCallback(() => {
    setActiveIndex((current) => (current === 0 ? releaseFeatures.length - 1 : current - 1));
  }, []);

  const showNextFeature = useCallback(() => {
    setActiveIndex((current) => (current + 1) % releaseFeatures.length);
  }, []);

  const dismissed = useSyncExternalStore(
    useCallback(
      (onStoreChange) => {
        const onStorage = (event: StorageEvent) => {
          if (event.key === storageKey) onStoreChange();
        };
        const onReleaseStorage = () => onStoreChange();

        window.addEventListener("storage", onStorage);
        window.addEventListener(RELEASE_STORAGE_EVENT, onReleaseStorage);
        return () => {
          window.removeEventListener("storage", onStorage);
          window.removeEventListener(RELEASE_STORAGE_EVENT, onReleaseStorage);
        };
      },
      [storageKey],
    ),
    useCallback(() => {
      if (!releaseIsActive()) return "true";
      return window.sessionStorage.getItem(storageKey) || "false";
    }, [storageKey]),
    () => "true",
  );

  const open = dismissed !== "true";

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") dismiss();
      if (event.key === "ArrowLeft") showPreviousFeature();
      if (event.key === "ArrowRight") showNextFeature();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [dismiss, open, showNextFeature, showPreviousFeature]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-zinc-950/28 p-4 backdrop-blur-[4px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          <button
            type="button"
            aria-label="Dismiss release announcement"
            className="absolute inset-0 cursor-default"
            onClick={dismiss}
          />

          <motion.section
            role="dialog"
            aria-modal="true"
            aria-labelledby="release-announcement-title"
            className="relative h-[min(36rem,88dvh)] w-full max-w-4xl overflow-hidden rounded-[2rem] border border-zinc-200 bg-white text-zinc-950 shadow-[0_34px_110px_-58px_rgba(2,6,23,0.92)]"
            initial={{ opacity: 0, y: 18, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.985 }}
            transition={{ duration: 0.24, ease: "easeOut" }}
          >
            <button
              type="button"
              onClick={dismiss}
              aria-label="Close release announcement"
              className="absolute right-5 top-5 z-10 flex h-11 w-11 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-500 transition-colors hover:border-zinc-900 hover:text-zinc-950"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="grid h-full overflow-y-auto lg:grid-cols-[0.9fr_1.1fr] lg:overflow-hidden">
              <div className="flex min-h-[26rem] flex-col justify-between border-b border-zinc-200 bg-[linear-gradient(180deg,#ffffff_0%,#f7f9ff_100%)] p-8 lg:min-h-0 lg:border-b-0 lg:border-r lg:p-10">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/15 bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_12px_26px_-18px_rgba(37,99,235,0.95)]">
                    {RELEASE_VERSION}
                  </div>

                  <h2
                    id="release-announcement-title"
                    className="mt-8 max-w-sm text-5xl font-light leading-[0.94] tracking-tighter text-zinc-950"
                  >
                    What&apos;s new in
                    <span className="mt-3 flex items-baseline gap-2 whitespace-nowrap">
                      <span className="font-normal tracking-normal text-zinc-950">
                        supernizo
                      </span>
                      <span
                        className="translate-y-0.5 text-[0.9em] font-normal leading-none tracking-normal text-zinc-700"
                        style={{ fontFamily: '"Bungee Hairline", sans-serif' }}
                      >
                        Lite
                      </span>
                    </span>
                  </h2>

                  <p className="mt-5 max-w-sm text-base font-light leading-7 text-zinc-500">
                    A focused CRM update for cleaner personal leads, sharper daily tracking, and a better profile setup.
                  </p>
                </div>

                <div className="mt-8 border-t border-zinc-200 pt-5">
                  <p className="text-sm font-light leading-6 text-zinc-500">
                    Built for faster daily execution across every pipeline team.
                  </p>
                </div>
              </div>

              <div className="relative flex min-h-[26rem] flex-col p-6 sm:p-8 lg:min-h-0 lg:p-9">
                <div className="h-9 shrink-0 border-b border-zinc-200 pr-14">
                  <p className="text-sm font-light text-zinc-400">Release highlights</p>
                </div>

                <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden px-0 py-6 sm:px-14">
                  <button
                    type="button"
                    onClick={showPreviousFeature}
                    aria-label="Previous release item"
                    className="absolute left-0 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-500 transition-colors hover:border-zinc-900 hover:text-zinc-950 sm:flex"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>

                  <AnimatePresence mode="wait">
                    <motion.div
                      key={activeFeature.title}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2, ease: "easeOut" }}
                      className="mx-auto flex h-full max-w-md flex-col items-center justify-center text-center"
                    >
                      <p className="text-sm font-medium tabular-nums text-zinc-400">
                        {String(activeIndex + 1).padStart(2, "0")} / {String(releaseFeatures.length).padStart(2, "0")}
                      </p>
                      <h3 className="mt-4 text-[clamp(1.65rem,2.25vw,2.45rem)] font-light leading-[1.06] tracking-tighter text-zinc-950">
                        {activeFeature.title}
                      </h3>
                      <p className="mx-auto mt-5 max-w-sm text-base font-light leading-7 text-zinc-500">
                        {activeFeature.description}
                      </p>
                    </motion.div>
                  </AnimatePresence>

                  <button
                    type="button"
                    onClick={showNextFeature}
                    aria-label="Next release item"
                    className="absolute right-0 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-500 transition-colors hover:border-zinc-900 hover:text-zinc-950 sm:flex"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>

                <div className="flex h-7 shrink-0 items-center justify-center gap-2">
                  {releaseFeatures.map((feature, index) => (
                    <button
                      key={feature.title}
                      type="button"
                      aria-label={`Show ${feature.title}`}
                      onClick={() => setActiveIndex(index)}
                      className={[
                        "h-1.5 rounded-full transition-all",
                        index === activeIndex ? "w-9 bg-blue-600" : "w-1.5 bg-zinc-200 hover:bg-zinc-300",
                      ].join(" ")}
                    />
                  ))}
                </div>

                <div className="mt-4 flex shrink-0 flex-col gap-3 border-t border-zinc-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
                  <button
                    type="button"
                    onClick={dismiss}
                    className="inline-flex h-12 items-center justify-center rounded-full border border-zinc-200 bg-white px-7 text-sm font-semibold text-zinc-600 transition-colors hover:border-zinc-900 hover:text-zinc-950"
                  >
                    Continue
                  </button>

                  {canOpenMyLeads ? (
                    <Link
                      href="/my-leads"
                      onClick={dismiss}
                      className="inline-flex h-12 items-center justify-center rounded-full border border-blue-500/20 bg-blue-600 px-7 text-sm font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_12px_26px_-18px_rgba(37,99,235,0.95)] transition-colors hover:bg-blue-700"
                    >
                      Open My Leads
                    </Link>
                  ) : null}
                </div>
              </div>
            </div>
          </motion.section>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
