"use client";

import { useRef, useState } from "react";
import { AlertTriangle, Loader2, Play, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  continueContentGenerationRun, getContentGenerationRunDetails,
  type ContentGenerationRunDetails, type ContentGenerationRecovery,
  type ContentGenerationRecoveryLimits,
} from "@/lib/contentGenerationAdmin";
import { RECOVERY_REASON_LABELS, validateRecoveryLimits } from "@/lib/contentGenerationRecovery";

export function ContentGenerationRecoveryPanel({ details, onContinued }: {
  details: ContentGenerationRunDetails & { recovery: ContentGenerationRecovery };
  onContinued: () => void;
}) {
  // Keep the reviewed snapshot stable while the parent polls; a changed run requires review again.
  const [review, setReview] = useState(details);
  const [limits, setLimits] = useState<ContentGenerationRecoveryLimits>(details.recovery.suggestedLimits);
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [needsRefresh, setNeedsRefresh] = useState(false);
  const recovery = review.recovery;
  const stale = needsRefresh || Date.parse(details.recovery.expectedUpdatedAt) > Date.parse(recovery.expectedUpdatedAt);
  const invalid = validateRecoveryLimits(limits, recovery, review.run.usage);
  const refresh = async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    try {
      const latest = await getContentGenerationRunDetails(details.run.id);
      if (!latest.recovery) throw new Error("Recovery options are currently unavailable. Refresh and try again.");
      setReview({ ...latest, recovery: latest.recovery });
      setLimits(latest.recovery.suggestedLimits);
      setNeedsRefresh(false);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not reload this run.");
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };
  const submit = async () => {
    if (inFlight.current || stale || invalid) return;
    inFlight.current = true;
    setBusy(true);
    setError(null);
    try {
      const result = await continueContentGenerationRun(review.run.id, {
        ...limits, expectedUpdatedAt: recovery.expectedUpdatedAt,
      });
      if (result.status === "recovery_pending") toast.warning(result.message);
      else toast.success("Run continuation queued", { description: "Completed leads remain saved." });
      onContinued();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Continuation could not be confirmed.");
      setNeedsRefresh(true);
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };
  const fields = [
    { key: "tokenLimit", label: "Total token allowance", used: review.run.usage.totalTokens, step: 1 },
    { key: "requestLimit", label: "Total request allowance", used: review.run.usage.requests, step: 1 },
    { key: "costLimitUsd", label: "Total cost allowance (USD)", used: review.run.usage.estimatedCostUsd, step: 0.000001 },
  ] as const;
  return (
    <div className="rounded-xl border border-amber-200 bg-white p-4" data-testid="content-generation-recovery">
      <h4 className="text-sm font-semibold text-slate-900">Resolve and continue</h4>
      <p className="mt-1 text-sm text-amber-800">{recovery.reasons.map((reason) => RECOVERY_REASON_LABELS[reason] || reason).join(" · ")}</p>
      <p className="mt-2 text-xs leading-5 text-slate-600">
        {recovery.successfulLeads.toLocaleString()} successful leads are saved. Continue {recovery.remainingLeads.toLocaleString()} unfinished leads in this run.
        {recovery.failedLeads > 0 ? ` ${recovery.failedLeads.toLocaleString()} failed leads stay excluded and can be reviewed separately.` : ""}
      </p>
      <p className="mt-1 text-xs leading-5 text-slate-500">These are total allowances, including recorded usage. Changes apply only to this run. Saved work is reused when its inputs match.</p>
      <form className="mt-4 space-y-4" onSubmit={(event) => { event.preventDefault(); void submit(); }}>
        <div className="grid gap-4 md:grid-cols-3">
          {fields.map(({ key, label, used, step }) => (
            <div key={key}>
              <label htmlFor={`${review.run.id}-${key}`} className="text-xs font-medium text-slate-700">{label}</label>
              <Input id={`${review.run.id}-${key}`} type="number" required step={step}
                min={Math.max(recovery.currentLimits[key], used + step)} max={recovery.maximumLimits[key]}
                value={Number.isFinite(limits[key]) ? limits[key] : ""} disabled={busy || !recovery.canContinue}
                className="mt-1 bg-white" onChange={(event) => setLimits((current) => ({ ...current, [key]: event.target.value === "" ? NaN : Number(event.target.value) }))} />
              <p className="mt-1 text-[11px] text-slate-500">Used {used.toLocaleString()} · Current {recovery.currentLimits[key].toLocaleString()}</p>
            </div>
          ))}
        </div>
        {limits.costLimitUsd > recovery.currentLimits.costLimitUsd ? <p className="text-xs text-amber-800">This increases the allowed spend for this run from ${recovery.currentLimits.costLimitUsd.toFixed(2)} to ${limits.costLimitUsd.toFixed(2)}.</p> : null}
        {error || stale || invalid ? <p role="alert" className="flex items-start gap-2 text-xs text-amber-900"><AlertTriangle className="h-4 w-4 shrink-0" />{error || (stale ? "Refresh the latest run state before continuing." : invalid)}</p> : null}
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={busy || stale || Boolean(invalid)} className="bg-blue-600 text-white hover:bg-blue-700">
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}Apply limits and continue
          </Button>
          <Button type="button" variant="outline" disabled={busy} onClick={() => void refresh()}><RefreshCw className="mr-2 h-4 w-4" />Reload recovery options</Button>
        </div>
      </form>
    </div>
  );
}
