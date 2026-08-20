import { cn } from "@/lib/utils";
import type {
  LeadDepartmentTag,
  LeadOriginHistoryItem,
  LeadOriginSource,
  LeadOwnerSummary,
} from "@/lib/apiRouter";

const CS_DATABASE_LABEL = "CS Database";
const LEADS_LABEL = "Leads";
const MEDIA_PARTNER_LABEL = "Media Partner";
const EDIT_FIELD_LABELS: Record<string, string> = {
  fullName: "Full name",
  title: "Job title",
  companyName: "Company",
  companyUrl: "Company website",
  email: "Email",
  phone: "Mobile number 1",
  phone2: "Mobile number 2",
  linkedinUrl: "LinkedIn",
  category: "Category",
};

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
    if (source.isMediaPartner || source.leadType === "media_partner") {
      uniqueLabels.set(MEDIA_PARTNER_LABEL.toLocaleLowerCase(), MEDIA_PARTNER_LABEL);
    }
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
  const isMediaPartner = label === MEDIA_PARTNER_LABEL;
  return (
    <span
      aria-label={`${isMediaPartner ? "Lead type" : "Source"}: ${label}`}
      title={`${isMediaPartner ? "Lead type" : "Source"}: ${label}`}
      className={cn(
        "inline-flex max-w-52 shrink-0 items-center truncate rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[10px] font-medium text-sky-700",
        isMediaPartner && "border-violet-200 bg-violet-50 text-violet-700",
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

type TimelineFieldChange = {
  field: string;
  label: string;
  oldValue?: string | null;
  newValue?: string | null;
  recorded: boolean;
};

function timelineFieldChanges(entry: LeadOriginHistoryItem): TimelineFieldChange[] {
  const changes = new Map<string, TimelineFieldChange>();
  for (const change of entry.fieldChanges || []) {
    const field = String(change.field || "").trim();
    if (!field || changes.has(field)) continue;
    changes.set(field, {
      field,
      label: EDIT_FIELD_LABELS[field] || field,
      oldValue: change.oldValue,
      newValue: change.newValue,
      recorded: true,
    });
  }
  for (const rawField of entry.changedFields || []) {
    const field = String(rawField || "").trim();
    if (!field || changes.has(field)) continue;
    changes.set(field, {
      field,
      label: EDIT_FIELD_LABELS[field] || field,
      recorded: false,
    });
  }
  return [...changes.values()];
}

function timelineChangeValue(value: string | null | undefined, recorded: boolean) {
  if (!recorded) return "Not recorded";
  return String(value || "").trim() || "Empty";
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
    <ol className={cn("space-y-3", className)} aria-label="Lead source and edit history">
      {history.map((entry) => {
        const isProfileEdit = entry.eventType === "lead_profile_updated";
        const sourceType = String(entry.sourceType || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
        const isUserUpload = ["user_leads", "user_upload", "manual", "manual_lead"].includes(sourceType);
        const owner = String(
          entry.ownerLabel
          || entry.ownerFirstName
          || entry.ownerDisplayName
          || (sourceType === "cs_database" ? CS_DATABASE_LABEL : "Source unavailable")
        );
        const department = String(entry.departmentLabel || entry.department || "Department unavailable");
        const actor = String(
          entry.actorLabel
          || entry.actorFirstName
          || entry.actorDisplayName
          || entry.actorUsername
          || owner
          || "User"
        );
        const fieldChanges = timelineFieldChanges(entry);
        const sourceSequence = entry.sourceSequence || entry.sequence;
        return (
          <li
            key={entry.eventId || `${entry.sequence}:${entry.personId || entry.occurredAt || owner}`}
            className="grid grid-cols-[1.5rem_minmax(0,1fr)] gap-2 border-b border-zinc-200 pb-3 last:border-b-0 last:pb-0"
          >
            <div className="relative flex justify-center pt-1">
              <span className="absolute inset-y-1 left-1/2 w-px -translate-x-1/2 bg-zinc-200" />
              <span
                aria-label={isProfileEdit ? `Edit version ${entry.editVersion || entry.sequence}` : `Source ${sourceSequence}`}
                className="relative flex h-5 w-5 items-center justify-center rounded-full border border-sky-200 bg-sky-50 text-[10px] font-semibold text-sky-700 ring-2 ring-white"
              >
                {isProfileEdit ? "E" : sourceSequence}
              </span>
            </div>
            <div className="min-w-0">
              <div className="flex min-w-0 items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-zinc-900">
                    {isProfileEdit ? "Lead profile updated" : `Source: ${sourceSequence}`}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-zinc-500">
                    {isProfileEdit ? `Edited by ${actor}` : owner} · {department}
                  </p>
                </div>
                <time className="shrink-0 text-right text-[11px] leading-4 text-zinc-400">
                  {formatDateTime(entry.occurredAt)}
                </time>
              </div>
              <p className="mt-2 text-xs leading-5 text-zinc-600">
                {isProfileEdit
                  ? fieldChanges.length
                    ? `${actor} updated ${fieldChanges.length} lead field${fieldChanges.length === 1 ? "" : "s"}.`
                    : `${actor} updated this lead profile.`
                  : isUserUpload
                  ? `${owner} uploaded this lead to ${department}.`
                  : sourceType === "cs_database"
                    ? `Generated by CS Database for ${department}.`
                    : `Recorded from ${owner} for ${department}.`}
              </p>
              {isProfileEdit && fieldChanges.length ? (
                <div className="mt-2 space-y-1.5" aria-label="Edited field changes">
                  {fieldChanges.map((change) => {
                    const oldValue = timelineChangeValue(change.oldValue, change.recorded);
                    const newValue = timelineChangeValue(change.newValue, change.recorded);
                    return (
                      <p
                        key={change.field}
                        aria-label={`${change.label}: ${oldValue} changed to ${newValue}`}
                        className="min-w-0 break-words rounded-md border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 text-[11px] leading-4 text-zinc-600"
                      >
                        <span className="font-semibold text-zinc-800">[{change.label}]</span>{" "}
                        <span>{oldValue}</span>{" "}
                        <span className="font-medium text-zinc-400">→</span>{" "}
                        <span>{newValue}</span>
                      </p>
                    );
                  })}
                </div>
              ) : null}
              {!isProfileEdit && (entry.sourceEmail || entry.sourcePhone || entry.sourceLinkedinUrl || entry.sourceCompanyUrl) ? (
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
