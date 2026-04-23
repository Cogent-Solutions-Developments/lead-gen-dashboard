"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, Loader2, Square, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DeleteBlockedDetail } from "@/lib/apiRouter";

type CampaignActionDialogProps = {
  open: boolean;
  mode: "stop" | "delete";
  campaignName: string;
  isBusy?: boolean;
  blockedDetail?: DeleteBlockedDetail | null;
  onClose: () => void;
  onConfirmStop?: () => void;
  onConfirmDelete?: () => void;
  onReviewStop?: () => void;
};

function hasCampaignNotTerminalBlocker(detail?: DeleteBlockedDetail | null) {
  return detail?.blockers.some((blocker) => blocker.code === "campaign_not_terminal") ?? false;
}

export function CampaignActionDialog({
  open,
  mode,
  campaignName,
  isBusy = false,
  blockedDetail = null,
  onClose,
  onConfirmStop,
  onConfirmDelete,
  onReviewStop,
}: CampaignActionDialogProps) {
  useEffect(() => {
    if (!open || isBusy) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isBusy, onClose, open]);

  const closeSafely = () => {
    if (!isBusy) onClose();
  };

  const isDeleteBlocked = mode === "delete" && Boolean(blockedDetail);
  const needsStopFirst = hasCampaignNotTerminalBlocker(blockedDetail);
  const primaryLabel = isDeleteBlocked
    ? needsStopFirst
      ? "Review Stop Campaign"
      : "Try Delete Again"
    : mode === "stop"
      ? "Stop Campaign"
      : "Delete Campaign";

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[70] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button
            type="button"
            aria-label="Close confirmation"
            className="absolute inset-0 bg-zinc-950/35 backdrop-blur-[2px]"
            onClick={closeSafely}
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={mode === "stop" ? "Stop campaign confirmation" : "Delete campaign confirmation"}
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="relative z-[1] w-full max-w-md overflow-hidden rounded-2xl border border-zinc-200/85 bg-white/96 shadow-[0_0_0_1px_rgba(255,255,255,0.9),0_24px_40px_-24px_rgba(2,10,27,0.6),0_12px_22px_-16px_rgba(15,23,42,0.34)] backdrop-blur-[10px]"
          >
            <div className="pointer-events-none absolute -right-14 -top-16 h-44 w-44 rounded-full bg-gradient-to-br from-sky-200/50 via-blue-300/25 to-transparent blur-3xl" />
            <div className="pointer-events-none absolute -left-14 bottom-0 h-32 w-32 rounded-full bg-gradient-to-tr from-zinc-100/70 to-transparent blur-2xl" />

            <div className="relative space-y-5 p-6">
              {isDeleteBlocked ? (
                <>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
                      Delete Campaign
                    </p>
                    <h2 className="mt-2 text-xl font-semibold tracking-tight text-zinc-900">
                      Campaign not ready to delete
                    </h2>
                    <p className="mt-2 text-sm leading-relaxed text-zinc-600">{blockedDetail?.message}</p>
                  </div>

                  {blockedDetail?.blockers?.length ? (
                    <div className="rounded-xl border border-amber-200/85 bg-amber-50/80 p-4">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-600" />
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-800">
                            Active Blockers
                          </p>
                          <ul className="mt-2 space-y-2 text-sm text-amber-950/80">
                            {blockedDetail.blockers.map((blocker) => (
                              <li key={`${blocker.code}-${blocker.message}`} className="flex gap-2">
                                <span className="mt-[0.45rem] h-1.5 w-1.5 rounded-full bg-amber-500" />
                                <span>{blocker.message}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {blockedDetail?.nextAction ? (
                    <div className="rounded-xl border border-zinc-200/80 bg-white/85 p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                        Next Action
                      </p>
                      <p className="mt-2 text-sm leading-relaxed text-zinc-600">{blockedDetail.nextAction}</p>
                    </div>
                  ) : null}
                </>
              ) : (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
                    {mode === "stop" ? "Stop Campaign" : "Delete Campaign"}
                  </p>
                  <h2 className="mt-2 text-xl font-semibold tracking-tight text-zinc-900">
                    {mode === "stop" ? "Confirm cancellation" : "Confirm deletion"}
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-600">
                    {mode === "stop" ? (
                      <>
                        Stop
                        <span className="mx-1 font-semibold text-zinc-800">{campaignName}</span>
                        now? This action cannot be undone.
                      </>
                    ) : (
                      <>
                        Delete
                        <span className="mx-1 font-semibold text-zinc-800">{campaignName}</span>
                        now? The backend will verify readiness first and will return any active blockers before anything is removed.
                      </>
                    )}
                  </p>
                </div>
              )}

              <div className="flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  disabled={isBusy}
                  onClick={closeSafely}
                  className="h-9 rounded-md border border-zinc-200/80 bg-white/90 px-3 text-xs font-semibold text-zinc-700 hover:border-zinc-300 hover:bg-white hover:text-zinc-900 disabled:opacity-60"
                >
                  {isDeleteBlocked ? "Close" : "Cancel"}
                </Button>

                {mode === "stop" ? (
                  <Button
                    type="button"
                    disabled={isBusy}
                    onClick={onConfirmStop}
                    className="h-9 rounded-md border border-red-700 bg-red-600 px-3.5 text-xs font-semibold text-white shadow-[0_8px_14px_-10px_rgba(185,28,28,0.68)] hover:border-red-800 hover:bg-red-700 disabled:opacity-70"
                  >
                    {isBusy ? (
                      <>
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                        Stopping...
                      </>
                    ) : (
                      <>
                        <Square className="mr-1.5 h-3 w-3 fill-current" />
                        {primaryLabel}
                      </>
                    )}
                  </Button>
                ) : isDeleteBlocked ? (
                  needsStopFirst ? (
                    <Button
                      type="button"
                      disabled={isBusy}
                      onClick={onReviewStop}
                      className="h-9 rounded-md border border-red-700 bg-red-600 px-3.5 text-xs font-semibold text-white shadow-[0_8px_14px_-10px_rgba(185,28,28,0.68)] hover:border-red-800 hover:bg-red-700 disabled:opacity-70"
                    >
                      <Square className="mr-1.5 h-3 w-3 fill-current" />
                      {primaryLabel}
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      disabled={isBusy}
                      onClick={onConfirmDelete}
                      className="h-9 rounded-md border border-red-700 bg-red-600 px-3.5 text-xs font-semibold text-white shadow-[0_8px_14px_-10px_rgba(185,28,28,0.68)] hover:border-red-800 hover:bg-red-700 disabled:opacity-70"
                    >
                      {isBusy ? (
                        <>
                          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                          Checking...
                        </>
                      ) : (
                        <>
                          <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                          {primaryLabel}
                        </>
                      )}
                    </Button>
                  )
                ) : (
                  <Button
                    type="button"
                    disabled={isBusy}
                    onClick={onConfirmDelete}
                    className="h-9 rounded-md border border-red-700 bg-red-600 px-3.5 text-xs font-semibold text-white shadow-[0_8px_14px_-10px_rgba(185,28,28,0.68)] hover:border-red-800 hover:bg-red-700 disabled:opacity-70"
                  >
                    {isBusy ? (
                      <>
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      <>
                        <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                        {primaryLabel}
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
