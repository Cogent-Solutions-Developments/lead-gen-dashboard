export type LeadType = "event_lead" | "media_partner";

export const LEAD_TYPE_OPTIONS: ReadonlyArray<{ value: LeadType; label: string }> = [
  { value: "event_lead", label: "Event leads" },
  { value: "media_partner", label: "Media Partner" },
];

export type LeadGroup = "sales" | "delegate" | "production" | "media_partner";

export const LEAD_GROUP_OPTIONS: ReadonlyArray<{ value: LeadGroup; label: string }> = [
  { value: "sales", label: "Sales" },
  { value: "delegate", label: "Delegate" },
  { value: "production", label: "Production" },
  { value: "media_partner", label: "Media Partner" },
];
