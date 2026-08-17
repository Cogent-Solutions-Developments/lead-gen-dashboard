import type { LeadTemplateValidationResponse } from "@/lib/apiRouter";
import { cn } from "@/lib/utils";
import { AlertTriangle } from "lucide-react";

export function LeadUploadDuplicateSummary({
  validation,
  className,
}: {
  validation?: LeadTemplateValidationResponse | null;
  className?: string;
}) {
  const duplicates = validation?.duplicates || [];
  const duplicateCount = Number(validation?.duplicateLeads || duplicates.length || 0);
  if (!duplicateCount) return null;

  return (
    <section
      className={cn("rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-950", className)}
      aria-labelledby="duplicate-upload-title"
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
        <div className="min-w-0 flex-1">
          <h3 id="duplicate-upload-title" className="text-sm font-semibold">
            {duplicateCount.toLocaleString()} duplicate lead{duplicateCount === 1 ? "" : "s"} found in this event
          </h3>
          <p className="mt-1 text-xs leading-5 text-amber-800">
            These leads stay on one CS Database card. Your upload is recorded as the next source.
          </p>
        </div>
      </div>

      {duplicates.length ? (
        <div className="mt-3 max-h-56 space-y-2 overflow-y-auto border-t border-amber-200 pt-3">
          {duplicates.map((item) => {
            const owner = item.uploadOwner?.ownerFirstName || item.uploadOwner?.ownerDisplayName || "You";
            const existingOwners = item.owners.map((entry) => entry.label).filter(Boolean);
            return (
              <article
                key={`${item.rowNumber}:${item.leadIdentityKey}`}
                className="rounded-lg border border-amber-100 bg-white px-3 py-2"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">
                      {item.employeeName || item.email || item.phone || "Unnamed lead"}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-amber-700">
                      {item.company || "Company unavailable"} · row {item.rowNumber}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-amber-100 px-2 py-1 text-[11px] font-semibold text-amber-800">
                    Source {item.nextOwnerSequence} · {owner}
                  </span>
                </div>
                {existingOwners.length ? (
                  <p className="mt-2 text-xs text-amber-800">
                    Existing owner{existingOwners.length === 1 ? "" : "s"}: {existingOwners.join(", ")}
                  </p>
                ) : null}
              </article>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
