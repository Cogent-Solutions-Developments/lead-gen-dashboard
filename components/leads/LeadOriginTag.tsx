import { cn } from "@/lib/utils";
import type {
  LeadDepartmentTag,
  LeadOriginHistoryItem,
  LeadOriginSource,
  LeadOwnerSummary,
} from "@/lib/apiRouter";

const CS_DATABASE_LABEL = "CS Database";
const LEADS_LABEL = "Leads";

function normalizeLegacyLabel(value: string) {
  const label = value.trim();
  if (label === "My Leads") return LEADS_LABEL;
  return label.replace(/'s My Leads$/i, "'s Leads");
}

function sourceLabel(source: LeadOriginSource) {
  const sourceType = String(source.sourceType || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
  const providedLabel = normalizeLegacyLabel(String(source.label || ""));
  const owner = String(source.ownerDisplayName || source.ownerUsername || "").trim();

  if (["cs_database", "database", "generated"].includes(sourceType)) return CS_DATABASE_LABEL;
  if (["user_leads", "user_upload", "manual", "manual_lead"].includes(sourceType)) {
    return providedLabel || (owner ? `${owner}'s ${LEADS_LABEL}` : "");
  }
  return providedLabel;
}

export function getLeadOriginLabels({ originSources }: { originSources?: LeadOriginSource[] | null }) {
  const uniqueLabels = new Map<string, string>();
  for (const source of originSources || []) {
    const label = sourceLabel(source);
    if (label) uniqueLabels.set(label.toLocaleLowerCase(), label);
  }

  return [...uniqueLabels.values()].sort((left, right) => {
    if (left === CS_DATABASE_LABEL) return right === CS_DATABASE_LABEL ? 0 : -1;
    if (right === CS_DATABASE_LABEL) return 1;
    return left.localeCompare(right);
  });
}

/** @deprecated Prefer LeadOriginTags so every verified source is shown. */
export function getLeadOriginLabel(
  lead: { originSources?: LeadOriginSource[] | null },
  fallback = ""
) {
  return getLeadOriginLabels(lead)[0] || fallback;
}

export function LeadOriginTag({ label, className }: { label: string; className?: string }) {
  return (
    <span
      aria-label={`Source: ${label}`}
      title={`Source: ${label}`}
      className={cn(
        "inline-flex max-w-52 shrink-0 items-center truncate rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[10px] font-medium text-sky-700",
        className
      )}
    >
      {label}
    </span>
  );
}

export function LeadOriginTags({
  originSources,
  className,
  tagClassName,
}: {
  originSources?: LeadOriginSource[] | null;
  className?: string;
  tagClassName?: string;
}) {
  const labels = getLeadOriginLabels({ originSources });
  if (!labels.length) return null;

  return (
    <span className={cn("inline-flex min-w-0 flex-wrap items-center gap-1.5", className)}>
      {labels.map((label) => <LeadOriginTag key={label} label={label} className={tagClassName} />)}
    </span>
  );
}

export function LeadDepartmentTags({
  departments,
  className,
  tagClassName,
}: {
  departments?: LeadDepartmentTag[] | null;
  className?: string;
  tagClassName?: string;
}) {
  const uniqueDepartments = new Map<string, LeadDepartmentTag>();
  for (const item of departments || []) {
    const department = String(item.department || "").trim().toLowerCase();
    const label = String(item.label || department).trim();
    if (department && label) uniqueDepartments.set(department, { department, label });
  }

  if (!uniqueDepartments.size) return null;
  return (
    <span className={cn("inline-flex min-w-0 flex-wrap items-center gap-1.5", className)}>
      {[...uniqueDepartments.values()].map((item) => (
        <span
          key={item.department}
          className={cn(
            "inline-flex max-w-40 shrink-0 items-center truncate rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[10px] font-medium text-violet-700",
            tagClassName
          )}
          title={`${item.label} department`}
        >
          {item.label}
        </span>
      ))}
    </span>
  );
}

export function LeadOwnerTags({
  owners,
  className,
  tagClassName,
}: {
  owners?: LeadOwnerSummary[] | null;
  className?: string;
  tagClassName?: string;
}) {
  const uniqueOwners = new Map<string, string>();
  for (const owner of owners || []) {
    const label = String(owner.label || owner.ownerFirstName || owner.ownerDisplayName || "").trim();
    const key = String(owner.ownerUserId || `${owner.ownerType}:${label}`).trim().toLowerCase();
    if (key && label) uniqueOwners.set(key, label);
  }

  if (!uniqueOwners.size) return null;
  return (
    <span className={cn("inline-flex min-w-0 flex-wrap items-center gap-1.5", className)}>
      {[...uniqueOwners].map(([key, label]) => (
        <LeadOriginTag key={key} label={label} className={tagClassName} />
      ))}
    </span>
  );
}

function formatDateTime(value?: string | null) {
  if (!value) return "Time unavailable";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Time unavailable";
  return parsed.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export function LeadOwnershipHistory({
  items,
  className,
}: {
  items?: LeadOriginHistoryItem[] | null;
  className?: string;
}) {
  const history = [...(items || [])].sort((left, right) => left.sequence - right.sequence);

  if (!history.length) {
    return (
      <div className={cn("rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-xs leading-5 text-zinc-600", className)}>
        No source history is available for this lead yet.
      </div>
    );
  }

  return (
    <ol className={cn("space-y-3", className)} aria-label="Lead source history">
      {history.map((entry) => {
        const sourceType = String(entry.sourceType || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
        const isUserUpload = ["user_leads", "user_upload", "manual", "manual_lead"].includes(sourceType);
        const isLeadRequest = sourceType === "lead_request" || Boolean(entry.leadRequestId);
        const owner = String(
          entry.ownerLabel
          || entry.ownerFirstName
          || entry.ownerDisplayName
          || (sourceType === "cs_database" ? CS_DATABASE_LABEL : "Source unavailable")
        );
        const department = String(entry.departmentLabel || entry.department || "Department unavailable");
        return (
          <li
            key={`${entry.sequence}:${entry.personId || entry.occurredAt || owner}`}
            className="grid grid-cols-[1.5rem_minmax(0,1fr)] gap-2 border-b border-zinc-200 pb-3 last:border-b-0 last:pb-0"
          >
            <div className="relative flex justify-center pt-1">
              <span className="absolute inset-y-1 left-1/2 w-px -translate-x-1/2 bg-zinc-200" />
              <span className="relative flex h-5 w-5 items-center justify-center rounded-full border border-sky-200 bg-sky-50 text-[10px] font-semibold text-sky-700 ring-2 ring-white">
                {entry.sequence}
              </span>
            </div>
            <div className="min-w-0">
              <div className="flex min-w-0 items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-zinc-900">Source {entry.sequence}</p>
                  <p className="mt-0.5 truncate text-xs text-zinc-500">{owner} · {department}</p>
                </div>
                <time className="shrink-0 text-right text-[11px] leading-4 text-zinc-400">
                  {formatDateTime(entry.occurredAt)}
                </time>
              </div>
              <p className="mt-2 text-xs leading-5 text-zinc-600">
                {isLeadRequest && sourceType === "lead_request"
                  ? `${owner} requested this lead for ${entry.leadRequestEventName || department}. ${entry.leadRequestUploadedByDisplayName || "An administrator"} fulfilled the request.`
                  : isLeadRequest && sourceType === "cs_database"
                    ? `${entry.leadRequestUploadedByDisplayName || "An administrator"} added this requested lead to CS Database for ${department}.`
                  : isUserUpload
                  ? `${owner} uploaded this lead to ${department}.`
                  : sourceType === "cs_database"
                    ? `Generated by CS Database for ${department}.`
                    : `Recorded from ${owner} for ${department}.`}
              </p>
              {entry.sourceEmail || entry.sourcePhone || entry.sourceLinkedinUrl || entry.sourceCompanyUrl ? (
                <div className="mt-2 grid gap-1 rounded-md border border-zinc-200 bg-zinc-50 px-2.5 py-2 text-[11px] leading-4 text-zinc-500">
                  {entry.sourceEmail ? <span className="truncate">Email: {entry.sourceEmail}</span> : null}
                  {entry.sourcePhone ? <span className="truncate">Phone: {entry.sourcePhone}</span> : null}
                  {entry.sourceLinkedinUrl ? <span className="truncate">LinkedIn: {entry.sourceLinkedinUrl}</span> : null}
                  {entry.sourceCompanyUrl ? <span className="truncate">Website: {entry.sourceCompanyUrl}</span> : null}
                </div>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
