import { cn } from "@/lib/utils";

type LeadOrigin = {
  isManualLead?: boolean | null;
  manualLeadAddedByUsername?: string | null;
};

export function getLeadOriginLabel(lead: LeadOrigin, fallback = "CS Database") {
  const owner = lead.manualLeadAddedByUsername?.trim();
  if (owner) return `${owner}'s My Leads`;
  if (lead.isManualLead) return "My Leads";
  return fallback;
}

export function LeadOriginTag({ label, className }: { label: string; className?: string }) {
  return (
    <span
      aria-label={`Source: ${label}`}
      title={`Source: ${label}`}
      className={cn(
        "inline-flex w-fit shrink-0 rounded-full border border-zinc-300 bg-zinc-50 px-2 py-0.5 text-[10px] font-medium text-zinc-600",
        className
      )}
    >
      {label}
    </span>
  );
}
