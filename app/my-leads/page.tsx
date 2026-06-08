"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  BellRing,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Copy,
  Download,
  FileUp,
  Headset,
  History,
  Loader2,
  Mail,
  MessageSquare,
  Plus,
  RefreshCcw,
  Search,
  SlidersHorizontal,
  UploadCloud,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { usePersona } from "@/hooks/usePersona";
import { getCachedAuthUserDisplayName, listActiveEventRegistry, personaForRole, type AdminEventItem } from "@/lib/auth";
import { cn } from "@/lib/utils";
import {
  addMyEventLead,
  createMyCampaignFromUpload,
  downloadMyLeadTemplateFile,
  generateLeadContent,
  getLeadWorkflowStatusHistory,
  listMyAllLeads,
  listMyEventLeads,
  listMyEvents,
  searchMyLeads,
  updateLeadWorkflowStatus,
  validateMyLeadTemplateUpload,
  type EventLeadCreateRequest,
  type EventLeadListItem,
  type EventSummaryItem,
  type LeadContentGenerationResponse,
  type LeadContentPlatform,
  type LeadTemplateValidationResponse,
  type LeadItem,
  type WorkflowStatus,
  type WorkflowStatusHistoryItem,
} from "@/lib/apiRouter";

type MyLeadStatus = {
  statusKey: string;
  label: string;
};

type MyLeadFilterState = {
  status: string;
  contact: "all" | "email" | "phone" | "complete" | "missing-contact" | "linkedin" | "website";
};

type MyLeadRow = {
  id: string;
  employeeName: string;
  title: string;
  company: string;
  email: string;
  phone: string;
  emails: string[];
  phones: string[];
  linkedinUrl: string;
  companyUrl: string;
  workflowStatus: string;
  workflowStatusLabel: string;
  workflowComment: string;
  workflowCommentUpdatedAt: string;
  workflowCommentHistoryCount: number;
  canonicalEventName: string;
  isManualLead: boolean;
};

type TemplateUploadState = {
  file: File | null;
  validating: boolean;
  validation: LeadTemplateValidationResponse | null;
  error: string;
  submitting: boolean;
  selectedEventId: string;
};

type AddLeadFormState = {
  fullName: string;
  title: string;
  companyName: string;
  companyUrl: string;
  email: string;
  phone: string;
  linkedinUrl: string;
};

type EmailGenerationDialogState = {
  requestId: number;
  lead: MyLeadRow;
  platform: LeadContentPlatform | null;
  loading: boolean;
  subject: string;
  body: string;
  feedback: string;
  generatedAt: string;
  model: string;
  error: string;
  copiedAction: "subject" | "body" | "full" | null;
};

type PendingStatusChange = {
  item: MyLeadRow;
  nextStatus: string;
};

type ContactChoiceLead = {
  name: string;
  emails: string[];
  phones: string[];
};

type ContactDropdownState = {
  leadId: string;
  kind: "email" | "phone";
};

const PAGE_SIZE_OPTIONS = [15, 25, 50, 100] as const;

const SALES_STATUSES: MyLeadStatus[] = [
  { statusKey: "new", label: "New" },
  { statusKey: "first-call", label: "First Call" },
  { statusKey: "follow-up", label: "Follow Up" },
  { statusKey: "proposal-sent", label: "Proposal Sent" },
  { statusKey: "deal-closed", label: "Deal Closed" },
  { statusKey: "deal-dead", label: "Deal Dead" },
];

const DELEGATE_STATUSES: MyLeadStatus[] = [
  { statusKey: "first-call", label: "First Call" },
  { statusKey: "email-sent", label: "Email Sent" },
  { statusKey: "whatsapp-sent", label: "Whatsapp Sent" },
  { statusKey: "1st-follow-up", label: "1st Follow up" },
  { statusKey: "2nd-follow-up", label: "2nd Follow up" },
  { statusKey: "3rd-follow-up", label: "3rd Follow up" },
  { statusKey: "declined", label: "Declined" },
  { statusKey: "confirmed", label: "Confirmed" },
];

const PRODUCTION_STATUSES: MyLeadStatus[] = [
  { statusKey: "first-call", label: "First Call" },
  { statusKey: "email-sent", label: "Email Sent" },
  { statusKey: "whatsapp-sent", label: "Whatsapp Sent" },
  { statusKey: "1st-follow-up", label: "1st Follow up" },
  { statusKey: "2nd-follow-up", label: "2nd Follow up" },
  { statusKey: "3rd-follow-up", label: "3rd Follow up" },
  { statusKey: "pending", label: "Pending" },
  { statusKey: "declined", label: "Declined" },
  { statusKey: "confirmed", label: "Confirmed" },
];

const EMPTY_FILTERS: MyLeadFilterState = {
  status: "all",
  contact: "all",
};

const EMPTY_TEMPLATE_UPLOAD: TemplateUploadState = {
  file: null,
  validating: false,
  validation: null,
  error: "",
  submitting: false,
  selectedEventId: "",
};
const EMPTY_ADD_LEAD_FORM: AddLeadFormState = {
  fullName: "",
  title: "",
  companyName: "",
  companyUrl: "",
  email: "",
  phone: "",
  linkedinUrl: "",
};
const LEAD_TEMPLATE_ACCEPT = ".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const EVENT_SELECT_CONTENT_CLASS =
  "z-[120] max-h-[18rem] w-[22rem] max-w-[calc(100vw-2rem)] rounded-2xl border border-white/16 bg-[#070b12]/95 p-2 text-zinc-100 shadow-[0_24px_70px_-46px_rgba(0,0,0,0.85)] backdrop-blur-[24px]";
const EVENT_SELECT_ITEM_CLASS =
  "rounded-xl py-2.5 pl-3 pr-9 text-sm font-medium text-zinc-200 transition-colors focus:bg-[rgba(255,255,255,0.06)] focus:text-white data-[highlighted]:bg-[rgba(255,255,255,0.06)] data-[highlighted]:text-white data-[state=checked]:border data-[state=checked]:border-blue-500/30 data-[state=checked]:bg-blue-600 data-[state=checked]:text-white data-[state=checked]:shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_10px_22px_-16px_rgba(37,99,235,0.8)] data-[state=checked]:[&_svg]:!text-white [&_[data-slot=select-item-indicator]]:right-3 [&_[data-slot=select-item-indicator]_svg]:h-4 [&_[data-slot=select-item-indicator]_svg]:w-4 [&_[data-slot=select-item-indicator]_svg]:stroke-[2.25]";
const UPLOAD_EVENT_SELECT_CONTENT_CLASS =
  "z-[120] max-h-[18rem] w-[var(--radix-select-trigger-width)] max-w-[calc(100vw-5rem)] rounded-2xl border border-white/16 bg-[#070b12]/95 p-0 text-zinc-100 shadow-[0_24px_70px_-46px_rgba(0,0,0,0.85)] backdrop-blur-[24px]";
const UPLOAD_EVENT_SELECT_ITEM_CLASS =
  "w-full rounded-xl py-2.5 pl-3 pr-9 text-sm font-medium text-zinc-200 transition-colors focus:bg-[rgba(255,255,255,0.06)] focus:text-white data-[highlighted]:bg-[rgba(255,255,255,0.06)] data-[highlighted]:text-white data-[state=checked]:border data-[state=checked]:border-blue-500/30 data-[state=checked]:bg-blue-600 data-[state=checked]:text-white data-[state=checked]:shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_10px_22px_-16px_rgba(37,99,235,0.8)] data-[state=checked]:[&_svg]:!text-white [&_[data-slot=select-item-indicator]]:right-3 [&_[data-slot=select-item-indicator]_svg]:h-3.5 [&_[data-slot=select-item-indicator]_svg]:w-3.5 [&_[data-slot=select-item-indicator]_svg]:stroke-[2.25]";

const LinkedInIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M20.5 2h-17A1.5 1.5 0 002 3.5v17A1.5 1.5 0 003.5 22h17a1.5 1.5 0 001.5-1.5v-17A1.5 1.5 0 0020.5 2zM8 19H5v-9h3zM6.5 8.25A1.75 1.75 0 118.3 6.5a1.78 1.78 0 01-1.8 1.75zM19 19h-3v-4.74c0-1.22-.44-2.12-1.54-2.12a1.6 1.6 0 00-1.58 1.14 2.17 2.17 0 00-.1 1.08V19h-3v-9h2.9v1.3a3.11 3.11 0 012.7-1.4c1.95 0 3.52 1.27 3.52 4z" />
  </svg>
);

const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className={className}>
    <path d="M13.601 2.326A7.85 7.85 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.9 7.9 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.9 7.9 0 0 0 13.6 2.326zM7.994 14.521a6.6 6.6 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.56 6.56 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592m3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.73.73 0 0 0-.529.247c-.182.198-.691.677-.691 1.654s.71 1.916.81 2.049c.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232" />
  </svg>
);

const WebsiteIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 0 1 3 12c0-1.605.42-3.113 1.157-4.418" />
  </svg>
);

const PhoneIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M20.5 2h-17A1.5 1.5 0 002 3.5v17A1.5 1.5 0 003.5 22h17a1.5 1.5 0 001.5-1.5v-17A1.5 1.5 0 0020.5 2z" />
    <path fill="white" transform="translate(6, 6) scale(0.5)" d="M13.832 16.568a1 1 0 0 0 1.213-.303l.355-.465A2 2 0 0 1 17 15h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2A18 18 0 0 1 2 4a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-.8 1.6l-.468.351a1 1 0 0 0-.292 1.233 14 14 0 0 0 6.392 6.384" />
  </svg>
);

const EmailIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M20.5 2h-17A1.5 1.5 0 002 3.5v17A1.5 1.5 0 003.5 22h17a1.5 1.5 0 001.5-1.5v-17A1.5 1.5 0 0020.5 2z" />
    <g transform="translate(6, 6) scale(0.5)">
      <rect x="2" y="4" width="20" height="16" rx="2" fill="white" />
      <path d="m22 7-8.991 5.727a2 2 0 0 1-2.009 0L2 7" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </g>
  </svg>
);

function getStatusDotClass(status: string) {
  const statusDotClass: Record<string, string> = {
    new: "bg-[#0aefff] shadow-[0_0_0_3px_rgba(10,239,255,0.20)]",
    "first-call": "bg-[#147df5] shadow-[0_0_0_3px_rgba(20,125,245,0.20)]",
    "follow-up": "bg-[#ff8700] shadow-[0_0_0_3px_rgba(255,135,0,0.20)]",
    "proposal-sent": "bg-[#a855f7] shadow-[0_0_0_3px_rgba(168,85,247,0.20)]",
    "deal-closed": "bg-[#22c55e] shadow-[0_0_0_3px_rgba(34,197,94,0.25)]",
    "deal-dead": "bg-[#ff0000] shadow-[0_0_0_3px_rgba(255,0,0,0.16)]",
    "email-sent": "bg-[#2563eb] shadow-[0_0_0_3px_rgba(37,99,235,0.20)]",
    "whatsapp-sent": "bg-[#22c55e] shadow-[0_0_0_3px_rgba(34,197,94,0.22)]",
    "1st-follow-up": "bg-[#ff8700] shadow-[0_0_0_3px_rgba(255,135,0,0.20)]",
    "2nd-follow-up": "bg-[#f59e0b] shadow-[0_0_0_3px_rgba(245,158,11,0.20)]",
    "3rd-follow-up": "bg-[#f97316] shadow-[0_0_0_3px_rgba(249,115,22,0.20)]",
    pending: "bg-[#a855f7] shadow-[0_0_0_3px_rgba(168,85,247,0.20)]",
    declined: "bg-[#ff0000] shadow-[0_0_0_3px_rgba(255,0,0,0.16)]",
    confirmed: "bg-[#22c55e] shadow-[0_0_0_3px_rgba(34,197,94,0.25)]",
  };
  return statusDotClass[status] ?? "bg-zinc-400";
}

function getTemplateUploadErrorCopy(message: string) {
  const text = asText(message);
  const normalized = text.toLowerCase();

  if (normalized.includes("header") || normalized.includes("sheet")) {
    return {
      title: "Template layout needs attention",
      body: "This workbook does not match the upload template for this persona.",
      hint: "Download the template again, keep the header row unchanged, and paste the leads into that file.",
    };
  }

  if (normalized.includes(".xlsx") || normalized.includes("excel")) {
    return {
      title: "Use the Excel template",
      body: "This upload accepts the official .xlsx template only.",
      hint: "Download the template, fill it in, and upload that file.",
    };
  }

  return {
    title: "Template needs a quick check",
    body: "We could not validate this file yet.",
    hint: "Review the file format and try again.",
  };
}

function humanizeStatusLabel(value: string) {
  const cleaned = asText(value);
  if (!cleaned) return "New";
  return cleaned
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatDateTime(value?: string | null) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
}

function normalizeDialPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 8 ? `900${digits}` : "";
}

function buildTelHref(value: string) {
  const phone = normalizeDialPhone(value);
  return phone ? `tel:${phone}` : "";
}

function buildEmailHref(value: string) {
  const email = asText(value);
  return email ? `mailto:${email}` : "";
}

function buildWhatsAppHref(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 8 ? `https://wa.me/${digits}` : "";
}

function normalizeSearch(value: string) {
  return value.trim().toLowerCase();
}

function asText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function errorValueToText(value: unknown): string {
  if (typeof value === "string") return value;
  if (value == null) return "";
  if (Array.isArray(value)) {
    return value
      .map(errorValueToText)
      .map((item) => item.trim())
      .filter(Boolean)
      .join("\n");
  }
  if (typeof value === "object") {
    const source = value as Record<string, unknown>;
    const nested = source.detail ?? source.message ?? source.msg;
    if (nested != null) return errorValueToText(nested);

    try {
      return JSON.stringify(value);
    } catch {
      return "Request failed.";
    }
  }
  return String(value);
}

function getApiErrorMessage(error: unknown) {
  const data = error && typeof error === "object" && "data" in error
    ? (error as { data?: unknown }).data
    : null;
  const dataMessage = errorValueToText(data).trim();
  if (dataMessage) return dataMessage;

  if (!(error instanceof Error)) return errorValueToText(error).trim() || "An unexpected error occurred.";
  const trimmed = error.message.trim();
  if (!trimmed) return "An unexpected error occurred.";
  if (!trimmed.startsWith("{")) return trimmed;

  try {
    return errorValueToText(JSON.parse(trimmed)).trim() || trimmed;
  } catch {
    return trimmed;
  }
}

function getDisplayEventName(value: string | null | undefined) {
  const cleanName = (value || "").trim();
  const [shortName] = cleanName.split(/\s(?:-|\u2013|\u2014)\s/);
  return shortName?.trim() || cleanName;
}

function readRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function textValues(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(textValues);
  const text = asText(value);
  if (text) return [text];
  const record = readRecord(value);
  if (!record) return [];
  return ["value", "text", "address", "email", "emails", "emailAddress", "emailAddresses", "phone", "phones", "number", "phoneNumber", "phoneNumbers"]
    .flatMap((key) => textValues(record[key]));
}

function uniqText(values: string[], kind: "email" | "phone") {
  const seen = new Set<string>();
  const result: string[] = [];

  values
    .map((value) => value.trim())
    .filter(Boolean)
    .forEach((value) => {
      const key = kind === "email" ? value.toLowerCase() : value.replace(/\D/g, "") || value.toLowerCase();
      if (!key || seen.has(key)) return;
      seen.add(key);
      result.push(value);
    });

  return result;
}

function collectContactChannelValues(value: unknown, kind: "email" | "phone"): string[] {
  if (Array.isArray(value)) return value.flatMap((item) => collectContactChannelValues(item, kind));

  const record = readRecord(value);
  if (!record) {
    return textValues(value).filter((text) =>
      kind === "email" ? text.includes("@") : text.replace(/\D/g, "").length >= 8 && !text.includes("@")
    );
  }

  const channelType = [record.type, record.channel, record.kind, record.label, record.name]
    .map(asText)
    .join(" ")
    .toLowerCase();
  const candidates = textValues(record);

  return candidates.filter((candidate) => {
    const digits = candidate.replace(/\D/g, "");
    if (kind === "email") return candidate.includes("@") || channelType.includes("email");
    return (
      !candidate.includes("@") &&
      digits.length >= 8 &&
      (channelType.includes("phone") ||
        channelType.includes("mobile") ||
        channelType.includes("telephone") ||
        channelType.includes("whatsapp") ||
        !channelType.includes("email"))
    );
  });
}

function getNestedRecord(source: Record<string, unknown>, key: string) {
  return readRecord(source[key]) ?? {};
}

function collectLeadContacts(item: LeadItem | EventLeadListItem, kind: "email" | "phone") {
  const source = item as unknown as Record<string, unknown>;
  const directKeys = kind === "email"
    ? [
        "email",
        "emails",
        "emailAddress",
        "emailAddresses",
        "email1",
        "email2",
        "email3",
        "email_1",
        "email_2",
        "email_3",
        "primaryEmail",
        "secondaryEmail",
        "tertiaryEmail",
      ]
    : [
        "phone",
        "phones",
        "phoneNumber",
        "phoneNumbers",
        "phoneNumber1",
        "phoneNumber2",
        "phoneNumber3",
        "phone1",
        "phone2",
        "phone3",
        "phone_1",
        "phone_2",
        "phone_3",
        "mobile",
        "mobile1",
        "mobile2",
        "mobile3",
        "telephone",
        "telephoneNumber",
      ];
  const directValues = directKeys.flatMap((key) => textValues(source[key]));
  const linkedinInsights = getNestedRecord(source, "linkedinInsights");
  const linkedinInsightsSnake = getNestedRecord(source, "linkedin_insights");
  const channelValues = [
    source.contactChannels,
    source.contact_channels,
    linkedinInsights.contactChannels,
    linkedinInsights.contact_channels,
    linkedinInsightsSnake.contactChannels,
    linkedinInsightsSnake.contact_channels,
  ].flatMap((value) => collectContactChannelValues(value, kind));

  return uniqText([...directValues, ...channelValues], kind);
}

async function writeClipboardText(text: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  textarea.style.top = "0";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}

function mapLeadItemToRow(item: LeadItem | EventLeadListItem): MyLeadRow {
  const workflowStatus = item.workflowStatus || "new";
  const emails = collectLeadContacts(item, "email");
  const phones = collectLeadContacts(item, "phone");
  return {
    id: item.id,
    employeeName: item.employeeName || "",
    title: item.title || "",
    company: item.company || "",
    email: emails[0] || "",
    phone: phones[0] || "",
    emails,
    phones,
    linkedinUrl: item.linkedinUrl || "",
    companyUrl: item.companyUrl || "",
    workflowStatus,
    workflowStatusLabel: item.workflowStatusLabel || workflowStatus,
    workflowComment: item.workflowComment || "",
    workflowCommentUpdatedAt: item.workflowCommentUpdatedAt || "",
    workflowCommentHistoryCount: Number(item.workflowCommentHistoryCount || 0),
    canonicalEventName: item.canonicalEventName || item.eventName || "",
    isManualLead: Boolean(item.isManualLead),
  };
}

function myLeadSearchParams(
  query: string,
  filters: MyLeadFilterState,
  limit: number,
  offset: number,
  canonicalEventKey?: string
) {
  return {
    limit,
    offset,
    search: query.trim() || undefined,
    workflowStatus: filters.status === "all" ? undefined : filters.status,
    canonicalEventKey,
    hasEmail:
      filters.contact === "email" || filters.contact === "complete"
        ? true
        : filters.contact === "missing-contact"
          ? false
          : undefined,
    hasPhone:
      filters.contact === "phone" || filters.contact === "complete"
        ? true
        : filters.contact === "missing-contact"
          ? false
          : undefined,
    hasLinkedin: filters.contact === "linkedin" ? true : undefined,
    hasWebsite: filters.contact === "website" ? true : undefined,
    sortBy: "createdAt",
    sortDir: "desc" as const,
  };
}

function filterRows(rows: MyLeadRow[], query: string, filters: MyLeadFilterState) {
  const search = normalizeSearch(query);
  return rows.filter((row) => {
    if (filters.status !== "all" && row.workflowStatus !== filters.status) return false;
    if (filters.contact === "email" && row.emails.length === 0) return false;
    if (filters.contact === "phone" && row.phones.length === 0) return false;
    if (filters.contact === "complete" && (row.emails.length === 0 || row.phones.length === 0)) return false;
    if (filters.contact === "missing-contact" && (row.emails.length > 0 || row.phones.length > 0)) return false;
    if (filters.contact === "linkedin" && !row.linkedinUrl) return false;
    if (filters.contact === "website" && !row.companyUrl) return false;
    if (!search) return true;

    return [
      row.employeeName,
      row.title,
      row.company,
      row.emails.join(" "),
      row.phones.join(" "),
      row.linkedinUrl,
      row.companyUrl,
      row.workflowStatusLabel,
    ]
      .join(" ")
      .toLowerCase()
      .includes(search);
  });
}

function getUserDisplayName(user: ReturnType<typeof useAuth>["user"]) {
  return [user?.fullName, getCachedAuthUserDisplayName(user), user?.username]
    .map((value) => value?.trim())
    .find(Boolean) || "";
}

function LeadSheetDialog({
  open,
  title,
  description,
  onClose,
  children,
  eyebrow = "Lead Sheet Updates",
  compactSize = "default",
}: {
  open: boolean;
  title: string;
  description: string;
  onClose: () => void;
  children: ReactNode;
  eyebrow?: string;
  compactSize?: "default" | "wide";
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-6">
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0 bg-black/70 backdrop-blur-[7px]"
        onClick={onClose}
      />

      <div
        className={cn(
          "relative z-[1] flex max-h-[calc(100dvh-3rem)] w-full flex-col overflow-hidden rounded-3xl border border-white/42 bg-[#151a22]/62 text-zinc-100 ring-1 ring-white/32 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.14),0_32px_80px_-48px_rgba(2,10,27,0.82),0_12px_28px_-20px_rgba(2,10,27,0.72)] backdrop-blur-[38px]",
          compactSize === "wide" ? "max-w-5xl" : "max-w-2xl"
        )}
      >
        <Button
          type="button"
          variant="ghost"
          className="absolute right-5 top-5 z-20 h-10 w-10 rounded-full border border-white/18 bg-transparent p-0 text-zinc-300 shadow-none hover:border-white/35 hover:bg-[rgba(255,255,255,0.06)] hover:text-white"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>

        <div className={cn("shrink-0 px-8", compactSize === "wide" ? "pb-4 pt-8" : "pb-5 pt-8")}>
          <div className="max-w-md pr-12">
            {eyebrow ? <p className="text-sm font-medium text-zinc-400">{eyebrow}</p> : null}
            <h2 className={cn("text-4xl font-light leading-none tracking-tighter text-zinc-950", eyebrow && "mt-4")}>
              {title}
            </h2>
            {description ? (
              <p className="mt-3 text-sm font-light leading-relaxed text-zinc-500">
                {description}
              </p>
            ) : null}
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-8 pb-8 scrollbar-modern">
          {children}
        </div>
      </div>
    </div>
  );
}

export default function MyLeadsPage() {
  const router = useRouter();
  const { persona } = usePersona();
  const { isSuperAdmin, role, user } = useAuth();
  const expectedPersona = personaForRole(role);
  const hasPersonaMismatch = Boolean(expectedPersona && expectedPersona !== persona);
  const emailGenerationRequestRef = useRef(0);
  const rowsRequestRef = useRef(0);
  const [events, setEvents] = useState<EventSummaryItem[]>([]);
  const [registryEvents, setRegistryEvents] = useState<AdminEventItem[]>([]);
  const [selectedEventKey, setSelectedEventKey] = useState("");
  const [rows, setRows] = useState<MyLeadRow[]>([]);
  const [leadListMeta, setLeadListMeta] = useState({ total: 0, hasMore: false });
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [loadingRegistryEvents, setLoadingRegistryEvents] = useState(true);
  const [templateUploadOpen, setTemplateUploadOpen] = useState(false);
  const [templateUpload, setTemplateUpload] = useState<TemplateUploadState>(EMPTY_TEMPLATE_UPLOAD);
  const [addLeadOpen, setAddLeadOpen] = useState(false);
  const [addLeadForm, setAddLeadForm] = useState<AddLeadFormState>(EMPTY_ADD_LEAD_FORM);
  const [addingLead, setAddingLead] = useState(false);
  const [copiedLeadId, setCopiedLeadId] = useState<string | null>(null);
  const [contactChoiceLead, setContactChoiceLead] = useState<ContactChoiceLead | null>(null);
  const [contactDropdown, setContactDropdown] = useState<ContactDropdownState | null>(null);
  const [emailDialog, setEmailDialog] = useState<EmailGenerationDialogState | null>(null);
  const [updatingLeadIds, setUpdatingLeadIds] = useState<Record<string, boolean>>({});
  const [pendingStatusChange, setPendingStatusChange] = useState<PendingStatusChange | null>(null);
  const [statusComment, setStatusComment] = useState("");
  const [historyLead, setHistoryLead] = useState<MyLeadRow | null>(null);
  const [historyItems, setHistoryItems] = useState<WorkflowStatusHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [ringBellConfirmOpen, setRingBellConfirmOpen] = useState(false);
  const [ringingDealBell, setRingingDealBell] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [filters, setFilters] = useState<MyLeadFilterState>(EMPTY_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);
  const [pageOffset, setPageOffset] = useState(0);
  const [pageSize, setPageSize] = useState<number>(100);

  useEffect(() => {
    if (isSuperAdmin) {
      router.replace("/leads");
      return;
    }
    if (hasPersonaMismatch) router.replace("/dashboard");
  }, [hasPersonaMismatch, isSuperAdmin, router]);

  useEffect(() => {
    if (!contactDropdown) return;

    const closeDropdown = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Element && target.closest("[data-contact-dropdown-root]")) return;
      setContactDropdown(null);
    };

    document.addEventListener("pointerdown", closeDropdown);
    return () => document.removeEventListener("pointerdown", closeDropdown);
  }, [contactDropdown]);

  const statusOptions = useMemo(
    () =>
      persona === "production"
        ? PRODUCTION_STATUSES
        : persona === "delegates"
          ? DELEGATE_STATUSES
          : SALES_STATUSES,
    [persona]
  );
  const selectedEvent = useMemo(
    () => events.find((item) => item.canonicalEventKey === selectedEventKey) ?? null,
    [events, selectedEventKey]
  );
  const selectedEventLabel = getDisplayEventName(selectedEvent?.canonicalEventName) || "My Leads";
  const activeRegistryEvents = useMemo(
    () => registryEvents.filter((event) => event.isActive),
    [registryEvents]
  );
  const hasActiveRegistryEvents = activeRegistryEvents.length > 0;
  const selectedTemplateUploadEvent = useMemo(
    () => registryEvents.find((item) => item.id === templateUpload.selectedEventId) ?? null,
    [registryEvents, templateUpload.selectedEventId]
  );
  const templateUploadEventId = selectedTemplateUploadEvent?.id || templateUpload.selectedEventId;
  const templateUploadEventOptions = useMemo(() => {
    if (!templateUploadEventId) return activeRegistryEvents;
    const selectedUploadEvent = activeRegistryEvents.find((event) => event.id === templateUploadEventId);
    if (!selectedUploadEvent) return activeRegistryEvents;
    return [
      selectedUploadEvent,
      ...activeRegistryEvents.filter((event) => event.id !== templateUploadEventId),
    ];
  }, [activeRegistryEvents, templateUploadEventId]);
  const templateValidation = templateUpload.validation;
  const templateUploadErrorCopy = useMemo(
    () => getTemplateUploadErrorCopy(templateUpload.error),
    [templateUpload.error]
  );
  const templateUploadReady = Boolean(
    templateUpload.file && templateValidation && selectedTemplateUploadEvent?.isActive
  );
  const canUseDealBellFlow = role === "sales_user";
  const isDealClosedStatusChange = Boolean(
    pendingStatusChange && canUseDealBellFlow && pendingStatusChange.nextStatus === "deal-closed"
  );

  const loadEvents = useCallback(async () => {
    if (!role || isSuperAdmin || hasPersonaMismatch) {
      setLoadingEvents(false);
      return;
    }

    setLoadingEvents(true);
    try {
      const response = await listMyEvents();
      const nextEvents = Array.isArray(response.events) ? response.events : [];
      setEvents(nextEvents);
      setSelectedEventKey((current) => {
        if (current && nextEvents.some((event) => event.canonicalEventKey === current)) return current;
        return nextEvents[0]?.canonicalEventKey || "";
      });
    } catch (error: unknown) {
      setEvents([]);
      setSelectedEventKey("");
      toast.error("Failed to load My Leads events", { description: getApiErrorMessage(error) });
    } finally {
      setLoadingEvents(false);
    }
  }, [hasPersonaMismatch, isSuperAdmin, role]);

  useEffect(() => {
    void loadEvents();
  }, [loadEvents]);

  const loadRegistryEvents = useCallback(async () => {
    if (!role || isSuperAdmin || hasPersonaMismatch) return;
    setLoadingRegistryEvents(true);
    try {
      const registryRows = await listActiveEventRegistry();
      setRegistryEvents(registryRows);
    } catch (error: unknown) {
      setRegistryEvents([]);
      toast.error("Failed to load upload events", { description: getApiErrorMessage(error) });
    } finally {
      setLoadingRegistryEvents(false);
    }
  }, [hasPersonaMismatch, isSuperAdmin, role]);

  useEffect(() => {
    void loadRegistryEvents();
  }, [loadRegistryEvents]);

  useEffect(() => {
    rowsRequestRef.current += 1;
  }, [filters, loadingEvents, pageOffset, pageSize, searchInput, selectedEventKey]);

  const loadRows = useCallback(async () => {
    if (!role || isSuperAdmin || hasPersonaMismatch || loadingEvents) return;
    if (events.length > 0 && !selectedEventKey) return;

    const requestId = ++rowsRequestRef.current;

    try {
      const shouldSearchOrFilter =
        searchInput.trim().length > 0 || filters.status !== "all" || filters.contact !== "all";
      const shouldUseScopedSearch = Boolean(selectedEventKey && filters.contact !== "all");
      const response = shouldUseScopedSearch
        ? await searchMyLeads(myLeadSearchParams(searchInput, filters, pageSize, pageOffset, selectedEventKey))
        : selectedEventKey
        ? await listMyEventLeads(selectedEventKey, {
            limit: pageSize,
            offset: pageOffset,
            search: searchInput.trim() || undefined,
            workflowStatus: filters.status === "all" ? undefined : filters.status,
            sort: "createdAt:desc",
          })
        : shouldSearchOrFilter
          ? await searchMyLeads(myLeadSearchParams(searchInput, filters, pageSize, pageOffset))
          : await listMyAllLeads();
      if (requestId !== rowsRequestRef.current) return;

      const items = "items" in response ? response.items : "leads" in response ? response.leads : [];
      const safeItems = Array.isArray(items) ? items : [];
      const total = Number("total" in response ? response.total : safeItems.length);
      setRows(safeItems.map(mapLeadItemToRow));
      setLeadListMeta({
        total: Number.isFinite(total) ? total : safeItems.length,
        hasMore: Boolean("hasMore" in response ? response.hasMore : pageOffset + pageSize < total),
      });
    } catch (error: unknown) {
      if (requestId !== rowsRequestRef.current) return;
      setRows([]);
      setLeadListMeta({ total: 0, hasMore: false });
      toast.error("Failed to load My Leads", { description: getApiErrorMessage(error) });
    }
  }, [events.length, filters, hasPersonaMismatch, isSuperAdmin, loadingEvents, pageOffset, pageSize, role, searchInput, selectedEventKey]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      void loadRows();
    }, 300);

    return () => window.clearTimeout(handle);
  }, [loadRows]);

  const usesServerPagination = Boolean(
    selectedEventKey || searchInput.trim().length > 0 || filters.status !== "all" || filters.contact !== "all"
  );
  const visibleRows = useMemo(() => filterRows(rows, searchInput, filters), [filters, rows, searchInput]);
  const pagedRows = usesServerPagination ? visibleRows : visibleRows.slice(pageOffset, pageOffset + pageSize);
  const activeFilterCount = [filters.status !== "all", filters.contact !== "all"].filter(Boolean).length;
  const pageTotal = usesServerPagination ? leadListMeta.total : visibleRows.length;
  const pageRangeStart = pagedRows.length > 0 ? pageOffset + 1 : 0;
  const pageRangeEnd = pageOffset + pagedRows.length;
  const hasMore = usesServerPagination ? leadListMeta.hasMore : pageOffset + pageSize < pageTotal;

  if (!role || isSuperAdmin || hasPersonaMismatch) return null;

  const openTemplateUploadDialog = () => {
    const currentEventKey = selectedEvent?.canonicalEventKey || selectedEventKey || events[0]?.canonicalEventKey || "";
    const selectedRegistryEvent =
      activeRegistryEvents.find((event) => event.id === selectedEvent?.eventRegistryId) ??
      activeRegistryEvents.find((event) => event.eventKey === currentEventKey) ??
      activeRegistryEvents[0] ??
      null;

    setTemplateUpload({
      ...EMPTY_TEMPLATE_UPLOAD,
      selectedEventId: selectedRegistryEvent?.id || "",
    });
    setTemplateUploadOpen(true);
  };

  const closeTemplateUploadDialog = () => {
    if (templateUpload.submitting) return;
    setTemplateUploadOpen(false);
    setTemplateUpload({
      ...EMPTY_TEMPLATE_UPLOAD,
    });
  };

  const handleTemplateDownload = async () => {
    try {
      await downloadMyLeadTemplateFile();
      toast.success("Template download started");
    } catch (error: unknown) {
      toast.error("Template download failed", { description: getApiErrorMessage(error) });
    }
  };

  const handleTemplateFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    if (!file) return;
    if (!templateUpload.selectedEventId) {
      event.target.value = "";
      toast.error("Select the event before uploading the Excel file.");
      return;
    }

    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      setTemplateUpload((prev) => ({
        ...prev,
        file,
        validation: null,
        validating: false,
        error: "Use the Excel template file (.xlsx) for this upload.",
      }));
      return;
    }

    setTemplateUpload((prev) => ({
      ...prev,
      file,
      validation: null,
      validating: true,
      error: "",
    }));

    try {
      const validation = await validateMyLeadTemplateUpload(file);
      setTemplateUpload((prev) => ({
        ...prev,
        validation,
        validating: false,
        error: "",
      }));
      toast.success("Template checked", {
        description: `${validation.importRows.toLocaleString()} leads ready across ${validation.sheetCount.toLocaleString()} categories.`,
      });
    } catch (error: unknown) {
      setTemplateUpload((prev) => ({
        ...prev,
        validation: null,
        validating: false,
        error: getApiErrorMessage(error),
      }));
    }
  };

  const handleTemplateUploadSubmit = async () => {
    if (!templateUpload.file || !templateUpload.validation) {
      toast.error("Choose a valid template first.");
      return;
    }

    const uploadEvent = selectedTemplateUploadEvent;
    const eventRegistryId = asText(uploadEvent?.id);
    if (!uploadEvent || !eventRegistryId) {
      toast.error("Select a registered event before submitting.");
      return;
    }
    if (!uploadEvent.isActive) {
      toast.error("Select an active registered event before submitting.");
      return;
    }

    setTemplateUpload((prev) => ({ ...prev, submitting: true, error: "" }));
    try {
      const response = await createMyCampaignFromUpload({
        name: uploadEvent.eventName,
        location: uploadEvent.location || "",
        category: uploadEvent.category || "",
        date: uploadEvent.date || "",
        eventRegistryId,
        icp: `Template upload for ${uploadEvent.eventName}`,
        leadSheet: templateUpload.file,
      });
      const createdCampaigns = response.createdCampaigns?.length ? response.createdCampaigns : [response];

      toast.success("Leads uploaded", {
        description:
          createdCampaigns.length > 1
            ? `${response.importSummary.importedLeads.toLocaleString()} leads created across ${createdCampaigns.length.toLocaleString()} category campaigns.`
            : `${response.importSummary.importedLeads.toLocaleString()} leads added to ${uploadEvent.eventName}.`,
      });
      setTemplateUploadOpen(false);
      setTemplateUpload({
        ...EMPTY_TEMPLATE_UPLOAD,
        selectedEventId: uploadEvent.id,
      });
      setSelectedEventKey(response.canonicalEventKey || uploadEvent.eventKey);
      setSearchInput("");
      setFilters(EMPTY_FILTERS);
      setPageOffset(0);
      await loadEvents();
      if ((response.canonicalEventKey || uploadEvent.eventKey) === selectedEventKey) {
        await loadRows();
      }
    } catch (error: unknown) {
      setTemplateUpload((prev) => ({
        ...prev,
        submitting: false,
        error: getApiErrorMessage(error),
      }));
    }
  };

  const resetFilters = () => {
    setFilters(EMPTY_FILTERS);
    setPageOffset(0);
  };

  const handleEventChange = (value: string) => {
    setSelectedEventKey(value === "my-leads" ? "" : value);
    setSearchInput("");
    setFilters(EMPTY_FILTERS);
    setPageOffset(0);
  };

  const closeAddLeadDialog = (force = false) => {
    if (addingLead && !force) return;
    setAddLeadOpen(false);
    setAddLeadForm(EMPTY_ADD_LEAD_FORM);
  };

  const updateAddLeadField = (field: keyof AddLeadFormState, value: string) => {
    setAddLeadForm((prev) => ({ ...prev, [field]: value }));
  };

  const submitAddLead = async () => {
    if (!selectedEvent) {
      toast.error("Select an event first");
      return;
    }

    const payload: EventLeadCreateRequest = {
      fullName: addLeadForm.fullName.trim(),
      title: addLeadForm.title.trim() || undefined,
      companyName: addLeadForm.companyName.trim() || undefined,
      companyUrl: addLeadForm.companyUrl.trim() || undefined,
      email: addLeadForm.email.trim() || undefined,
      phone: addLeadForm.phone.trim() || undefined,
      linkedinUrl: addLeadForm.linkedinUrl.trim() || undefined,
    };

    if (!payload.fullName) {
      toast.error("Full name is required");
      return;
    }

    setAddingLead(true);
    try {
      const created = await addMyEventLead(selectedEvent.canonicalEventKey, payload);
      closeAddLeadDialog(true);
      toast.success("Lead added", {
        description: `${created.employeeName} is now part of ${created.canonicalEventName}.`,
      });
      await loadRows();
    } catch (error: unknown) {
      toast.error("Failed to add lead", { description: getApiErrorMessage(error) });
    } finally {
      setAddingLead(false);
    }
  };

  const handleWorkflowStatusChange = async (item: MyLeadRow, nextStatus: string, comment?: string) => {
    if (nextStatus === item.workflowStatus || updatingLeadIds[item.id]) return false;

    setUpdatingLeadIds((prev) => ({ ...prev, [item.id]: true }));
    try {
      const response = await updateLeadWorkflowStatus(item.id, nextStatus as WorkflowStatus, comment);
      const nextLabel =
        asText(response.workflowStatusLabel) ||
        statusOptions.find((option) => option.statusKey === response.workflowStatus)?.label ||
        humanizeStatusLabel(response.workflowStatus);

      setRows((current) =>
        current.map((row) =>
          row.id === item.id
            ? {
                ...row,
                workflowStatus: response.workflowStatus,
                workflowStatusLabel: nextLabel,
                workflowComment: asText(response.workflowComment),
                workflowCommentUpdatedAt: asText(response.workflowCommentUpdatedAt),
                workflowCommentHistoryCount: Number(response.workflowCommentHistoryCount || 0),
              }
            : row
        )
      );
      return true;
    } catch (error: unknown) {
      toast.error("Failed to update status", { description: getApiErrorMessage(error) });
      return false;
    } finally {
      setUpdatingLeadIds((prev) => {
        const next = { ...prev };
        delete next[item.id];
        return next;
      });
    }
  };

  const handleStatusSelection = (item: MyLeadRow, value: string) => {
    if (value === item.workflowStatus) return;
    setPendingStatusChange({ item, nextStatus: value });
    setStatusComment("");
  };

  const closeStatusCommentDialog = () => {
    if (pendingStatusChange && (updatingLeadIds[pendingStatusChange.item.id] || ringingDealBell)) return;
    setRingBellConfirmOpen(false);
    setPendingStatusChange(null);
    setStatusComment("");
  };

  const ringDealBell = async () => {
    const userName = getUserDisplayName(user) || user?.username?.trim() || "A sales user";
    const response = await fetch("/api/ring-bell", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userName,
        userId: user?.id || "",
        username: user?.username || "",
      }),
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const detail = typeof data?.detail === "string" ? data.detail : "Could not send the bell email.";
      throw new Error(detail);
    }

    toast.success("Bell rung", {
      description: `${userName} successfully closed a deal.`,
    });
  };

  const submitStatusComment = async (options: { ringBell?: boolean } = {}) => {
    if (!pendingStatusChange) return;
    const shouldRingBell = Boolean(options.ringBell);
    if (shouldRingBell) setRingingDealBell(true);

    try {
      const updated = await handleWorkflowStatusChange(
        pendingStatusChange.item,
        pendingStatusChange.nextStatus,
        statusComment.trim() || undefined
      );
      if (!updated) return;

      if (shouldRingBell) {
        try {
          await ringDealBell();
        } catch (error: unknown) {
          toast.error("Bell failed", {
            description: error instanceof Error ? error.message : "Could not send the bell email.",
          });
        }
      }
      setRingBellConfirmOpen(false);
      setPendingStatusChange(null);
      setStatusComment("");
    } finally {
      if (shouldRingBell) setRingingDealBell(false);
    }
  };

  const handleUpdateStatusClick = () => {
    if (!pendingStatusChange) return;
    if (isDealClosedStatusChange) {
      setRingBellConfirmOpen(true);
      return;
    }
    void submitStatusComment();
  };

  const copyLeadDetails = async (item: MyLeadRow) => {
    const copiedAt = new Date().toLocaleString();
    const lines = [
      `Name: ${item.employeeName || "-"}`,
      `Title: ${item.title || "-"}`,
      `Company: ${item.company || "-"}`,
      `Status: ${item.workflowStatusLabel || item.workflowStatus}`,
      "",
      `Email: ${item.emails.length ? item.emails.join(", ") : "-"}`,
      `Phone: ${item.phones.length ? item.phones.join(", ") : "-"}`,
      `LinkedIn: ${item.linkedinUrl || "-"}`,
      `Website: ${item.companyUrl || "-"}`,
      "",
      `Event: ${item.canonicalEventName || selectedEvent?.canonicalEventName || "-"}`,
      "",
      `Generated by supernizo on ${copiedAt}. Confidential intended solely for authorized Cogent Solutions Event Management LLC internal use.`,
    ];

    try {
      await writeClipboardText(lines.join("\n"));
      setCopiedLeadId(item.id);
      window.setTimeout(() => setCopiedLeadId((current) => (current === item.id ? null : current)), 1600);
      toast.success("Lead copied");
    } catch (error: unknown) {
      toast.error("Failed to copy lead", { description: getApiErrorMessage(error) });
    }
  };

  const closeEmailDialog = () => {
    setEmailDialog(null);
  };

  const openEmailGenerator = (item: MyLeadRow) => {
    const requestId = emailGenerationRequestRef.current + 1;
    emailGenerationRequestRef.current = requestId;
    setEmailDialog({
      requestId,
      lead: item,
      platform: null,
      loading: false,
      subject: "",
      body: "",
      feedback: "",
      generatedAt: "",
      model: "",
      error: "",
      copiedAction: null,
    });
  };

  const generateContentForPlatform = async (
    item: MyLeadRow,
    platform: LeadContentPlatform,
    options: { feedback?: string } = {}
  ) => {
    const feedback = asText(options.feedback).slice(0, 1200);
    const requestId = emailGenerationRequestRef.current + 1;
    emailGenerationRequestRef.current = requestId;
    setEmailDialog({
      requestId,
      lead: item,
      platform,
      loading: true,
      subject: "",
      body: "",
      feedback,
      generatedAt: "",
      model: "",
      error: "",
      copiedAction: null,
    });

    try {
      const response: LeadContentGenerationResponse = await generateLeadContent(item.id, {
        platform,
        ...(feedback.trim() ? { feedback: feedback.trim() } : {}),
      });
      const subject = asText(response.contentEmailSubject);
      const body = platform === "whatsapp" ? asText(response.contentWhatsapp) : asText(response.contentEmail);
      if ((platform === "email" && !subject) || !body) {
        throw new Error("Generated content was empty.");
      }
      setEmailDialog((current) =>
        current?.requestId === requestId
          ? {
              ...current,
              loading: false,
              platform,
              subject,
              body,
              generatedAt: asText(response.generatedAt),
              model: asText(response.model),
              error: "",
              copiedAction: null,
            }
          : current
      );
    } catch (error: unknown) {
      const message = getApiErrorMessage(error);
      setEmailDialog((current) =>
        current?.requestId === requestId
          ? {
              ...current,
              loading: false,
              error: message,
            }
          : current
      );
      toast.error("Draft was not ready", { description: message });
    }
  };

  const updateEmailDraftField = (field: "subject" | "body", value: string) => {
    setEmailDialog((current) => (current ? { ...current, [field]: value } : current));
  };

  const updateEmailFeedback = (value: string) => {
    setEmailDialog((current) => (current ? { ...current, feedback: value.slice(0, 1200) } : current));
  };

  const copyEmailDraft = async (mode: "subject" | "body" | "full") => {
    if (!emailDialog || emailDialog.loading || emailDialog.error) return;
    const subject = emailDialog.subject.trim();
    const body = emailDialog.body.trim();
    const text =
      emailDialog.platform === "whatsapp"
        ? body
        : mode === "subject"
          ? subject
          : mode === "body"
            ? body
            : [`Subject: ${subject}`, "", body].join("\n");
    if (!text.trim()) {
      toast.error("Nothing to copy");
      return;
    }

    try {
      await writeClipboardText(text);
      setEmailDialog((current) => (current ? { ...current, copiedAction: mode } : current));
      window.setTimeout(() => {
        setEmailDialog((current) =>
          current?.copiedAction === mode ? { ...current, copiedAction: null } : current
        );
      }, 1500);
      toast.success(emailDialog.platform === "whatsapp" ? "WhatsApp content copied" : mode === "full" ? "Email copied" : "Content copied");
    } catch (error: unknown) {
      toast.error("Failed to copy", { description: getApiErrorMessage(error) });
    }
  };

  const openHistory = async (item: MyLeadRow) => {
    setHistoryLead(item);
    setHistoryItems([]);
    setHistoryError(null);
    setHistoryLoading(true);
    try {
      const response = await getLeadWorkflowStatusHistory(item.id);
      setHistoryItems(Array.isArray(response.history) ? response.history : []);
    } catch (error: unknown) {
      const message = getApiErrorMessage(error);
      setHistoryError(message);
      toast.error("Failed to load comment history", { description: message });
    } finally {
      setHistoryLoading(false);
    }
  };

  const closeHistory = () => {
    setHistoryLead(null);
    setHistoryItems([]);
    setHistoryError(null);
  };

  return (
    <div className="my-leads-heavy h-[100dvh] min-h-0 overflow-hidden">
      <div className="flex h-full min-h-0 flex-col overflow-hidden bg-transparent p-6 pb-28 font-sans">
        <header className="min-h-[6.25rem] shrink-0 border-b border-zinc-300 pb-11">
          <div className="flex min-w-0 items-center gap-7 whitespace-nowrap overflow-hidden">
            <div className="min-w-0 flex-1">
              <Select value={selectedEventKey || "my-leads"} onValueChange={handleEventChange}>
                <SelectTrigger
                  aria-label="Select lead source"
                  className="group !h-auto w-fit max-w-full justify-start gap-4 whitespace-normal rounded-none border-0 !bg-transparent p-0 text-left text-zinc-950 shadow-none transition-colors hover:text-blue-700 dark:!bg-transparent dark:hover:!bg-transparent focus:ring-0 focus-visible:ring-0 [&>svg]:mt-1 [&>svg]:h-7 [&>svg]:w-7 [&>svg]:opacity-40 [&>svg]:transition-colors [&>svg]:group-hover:opacity-70"
                >
                  <span className="line-clamp-2 min-w-0 text-3xl font-light leading-[1.12] tracking-[-0.025em] sm:text-4xl 2xl:text-5xl">
                    {selectedEventLabel}
                  </span>
                </SelectTrigger>
                <SelectContent
                  align="start"
                  position="popper"
                  className={EVENT_SELECT_CONTENT_CLASS}
                  viewportClassName="h-auto min-w-0 p-1"
                >
                  {events.length === 0 ? (
                    <SelectItem value="my-leads" className={EVENT_SELECT_ITEM_CLASS}>
                      My Leads
                    </SelectItem>
                  ) : (
                    events.map((event) => (
                      <SelectItem key={event.canonicalEventKey} value={event.canonicalEventKey} className={EVENT_SELECT_ITEM_CLASS}>
                        {getDisplayEventName(event.canonicalEventName)}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="ml-auto flex min-w-max flex-nowrap items-center justify-end gap-8">
              <div className="inline-flex h-12 shrink-0 items-center gap-1.5 rounded-full border border-white/18 bg-transparent p-1.5" aria-label="My leads actions">
                <button
                  type="button"
                  onClick={openTemplateUploadDialog}
                  disabled={loadingRegistryEvents || !hasActiveRegistryEvents}
                  className="inline-flex h-9 w-40 items-center justify-center gap-2.5 rounded-full text-sm font-semibold text-zinc-400 transition-colors hover:bg-[rgba(255,255,255,0.04)] hover:text-zinc-100 disabled:opacity-50"
                >
                  <FileUp className="h-4 w-4" />
                  Upload leads
                </button>

                <button
                  type="button"
                  onClick={() => setAddLeadOpen(true)}
                  disabled={!selectedEvent}
                  className="inline-flex h-9 w-40 items-center justify-center gap-2.5 rounded-full border border-blue-500/20 bg-blue-600 text-sm font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_10px_22px_-14px_rgba(37,99,235,0.95)] transition-colors hover:bg-blue-700 disabled:opacity-50"
                >
                  <Plus className="h-4 w-4" />
                  Add a lead
                </button>
              </div>

              <div className="flex shrink-0 items-baseline gap-3">
                <span className="text-sm font-medium text-zinc-400">Leads To Cover</span>
                <span className="text-4xl font-light tabular-nums tracking-tight text-zinc-950">
                  {pageTotal.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </header>

        <div className="grid min-h-0 flex-1 gap-12 overflow-hidden pt-10 xl:grid-cols-[19rem_minmax(0,1fr)]">
          <aside className="relative min-h-0 shrink-0 overflow-hidden pr-2">
            <div className="relative z-20 space-y-6 bg-transparent pb-6 pr-1">
              <div>
                <div className="relative h-11 w-full rounded-full border border-white/18 bg-transparent px-4 shadow-none transition-colors focus-within:border-white/35">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                  <input
                    value={searchInput}
                    onChange={(event) => {
                      setSearchInput(event.target.value);
                      setPageOffset(0);
                    }}
                    placeholder="Find in sheet..."
                    className="h-full w-full border-0 bg-transparent pl-7 pr-1 text-sm font-light tracking-tight text-zinc-950 placeholder:text-zinc-400 focus:outline-none"
                  />
                </div>
              </div>

              <div className="mt-4 border-t border-zinc-100 pt-4">
                <label className="mb-3 block text-xs font-medium text-zinc-400">Intelligent filters</label>
                <button
                  type="button"
                  onClick={() => setFilterOpen(true)}
                  className="flex h-11 w-full items-center justify-between rounded-full border border-white/18 bg-transparent px-4 text-left shadow-none transition-colors hover:border-white/35"
                >
                  <span className="inline-flex items-center gap-4 text-sm font-light text-zinc-500">
                    <SlidersHorizontal className="h-4 w-4" />
                    Advanced filters
                  </span>
                  <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full border border-white/12 bg-transparent px-1.5 text-xs font-medium tabular-nums text-zinc-500">
                    {activeFilterCount}
                  </span>
                </button>
                {activeFilterCount > 0 ? (
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="mt-3 border-b border-transparent pb-1 text-xs font-medium text-zinc-400 transition-colors hover:border-zinc-900 hover:text-zinc-950"
                  >
                    Clear filter model
                  </button>
                ) : null}
              </div>

              <div className="mt-5 space-y-4 border-t border-zinc-100 pt-5">
                <label className="text-xs font-medium text-zinc-400">Data coverage</label>
                <div className="space-y-0">
                  <div className="flex items-center justify-between border-b border-zinc-100 py-4">
                    <span className="text-sm font-light text-zinc-500">Total profile count</span>
                    <span className="text-xl font-light tabular-nums tracking-tight text-zinc-950">
                      {pageTotal.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-b border-zinc-100 py-4">
                    <span className="text-sm font-light text-zinc-500">Visible range</span>
                    <Select
                      value={String(pageSize)}
                      onValueChange={(value) => {
                        setPageSize(Number(value));
                        setPageOffset(0);
                      }}
                    >
                      <SelectTrigger className="h-9 w-16 justify-end gap-1 rounded-none border-0 border-b border-zinc-300 !bg-transparent px-0 text-xl font-light tabular-nums tracking-tight text-zinc-950 shadow-none transition-colors dark:!bg-transparent dark:hover:!bg-transparent focus:border-blue-600 focus:ring-0 [&>svg]:ml-0">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent align="end" className="rounded-xl border-white/16 bg-[#070b12]/95 text-zinc-100 shadow-xl backdrop-blur-[24px]">
                        {PAGE_SIZE_OPTIONS.map((option) => (
                          <SelectItem key={option} value={String(option)} className="rounded-lg py-2.5 text-sm focus:bg-[rgba(255,255,255,0.06)] focus:text-white data-[highlighted]:bg-[rgba(255,255,255,0.06)]">
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>
          </aside>

          <main className="flex min-h-0 flex-col overflow-hidden xl:border-l xl:border-zinc-300 xl:pl-16">
            <div className="min-h-0 flex-1 overflow-auto pr-4 scrollbar-modern">
              {pagedRows.length === 0 ? (
                <div className="w-full">
                  <div className="sticky top-0 z-20 grid grid-cols-[minmax(0,0.75fr)_minmax(14rem,0.95fr)_10rem] border-b border-zinc-300 bg-[#05070b]/95 py-3 text-sm font-light text-zinc-500 backdrop-blur">
                    <div>Identity details</div>
                    <div>Contact channels</div>
                    <div>Status</div>
                  </div>
                  <div className="flex h-40 items-center justify-center border-b border-zinc-100 text-zinc-400 font-light">
                    {searchInput || activeFilterCount > 0 ? "No matching records found." : "Workspace is currently empty."}
                  </div>
                </div>
              ) : (
                <div className="w-full">
                  <div className="sticky top-0 z-20 grid grid-cols-[minmax(0,0.75fr)_minmax(14rem,0.95fr)_10rem] border-b border-zinc-300 bg-[#05070b]/95 py-3 text-sm font-light text-zinc-500 backdrop-blur">
                    <div>Identity details</div>
                    <div>Contact channels</div>
                    <div>Status</div>
                  </div>
                  {pagedRows.map((item) => {
                    const primaryEmail = item.emails[0] || "";
                    const primaryPhone = item.phones[0] || "";
                    const emailDropdownOpen = contactDropdown?.leadId === item.id && contactDropdown.kind === "email";
                    const phoneDropdownOpen = contactDropdown?.leadId === item.id && contactDropdown.kind === "phone";
                    const selectedStatusValue = statusOptions.some((option) => option.statusKey === item.workflowStatus)
                      ? item.workflowStatus
                      : undefined;
                    const openContactChoice = () =>
                      setContactChoiceLead({
                        name: item.employeeName,
                        emails: item.emails,
                        phones: item.phones,
                      });
                    const toggleContactDropdown = (kind: "email" | "phone") => {
                      setContactDropdown((current) =>
                        current?.leadId === item.id && current.kind === kind ? null : { leadId: item.id, kind }
                      );
                    };

                    return (
                      <div key={item.id} className="group grid grid-cols-[minmax(0,0.75fr)_minmax(14rem,0.95fr)_10rem] border-b border-zinc-300 py-6 transition-all duration-300 hover:bg-transparent">
                      <div className="pr-8">
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center gap-5">
                            <span className="text-xl font-light tracking-tight text-zinc-950">{item.employeeName || "-"}</span>
                            {item.isManualLead ? (
                              <span className="rounded-full border border-white/18 bg-transparent px-2 py-0.5 text-xs font-medium text-zinc-500">Manual</span>
                            ) : null}
                          </div>
                          <span className="max-w-sm text-base font-light leading-relaxed text-zinc-700">{item.title || "-"}</span>
                          <span className="text-xs font-medium text-zinc-400">{item.company || "-"}</span>
                        </div>
                      </div>

                      <div className="pr-8">
                        <div className="flex flex-col gap-2">
                          <div className="space-y-1.5">
                            {primaryEmail ? (
                              <div className="relative flex min-w-0 items-center gap-2" data-contact-dropdown-root>
                              <button
                                type="button"
                                  onClick={() => {
                                    setContactDropdown(null);
                                    openContactChoice();
                                  }}
                                  className={cn(
                                    "inline-flex min-w-0 items-center gap-4 text-left",
                                    item.emails.length > 1 ? "max-w-[calc(100%-2.25rem)]" : "max-w-full"
                                  )}
                                title="Choose contact method"
                              >
                                <EmailIcon className="h-3.5 w-3.5 shrink-0 text-[#EF4444]" />
                                  <span className="truncate text-sm font-light tracking-tight text-zinc-700 transition-colors hover:text-zinc-950">{primaryEmail}</span>
                              </button>
                                {item.emails.length > 1 ? (
                                  <div className="relative shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => toggleContactDropdown("email")}
                                      className="inline-flex h-6 w-7 items-center justify-center rounded-lg border border-white/10 bg-zinc-800 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_10px_18px_-15px_rgba(2,10,27,0.9)] transition-colors hover:bg-zinc-700"
                                      aria-label="Show all email addresses"
                                      aria-expanded={emailDropdownOpen}
                                    >
                                      <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", emailDropdownOpen ? "rotate-180" : "")} />
                                    </button>
                                    {emailDropdownOpen ? (
                                      <div className="absolute left-0 top-full z-50 mt-1.5 w-64 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-white/16 bg-[#070b12]/95 shadow-[0_18px_42px_-28px_rgba(0,0,0,0.7)] backdrop-blur-[24px]">
                                        <div className="border-b border-white/10 px-2.5 py-1.5 text-[10px] font-semibold tracking-normal text-zinc-400">
                                          Emails
                                        </div>
                                        <div className="max-h-40 overflow-y-auto p-1">
                                          {item.emails.map((email, index) => (
                                            <button
                                              key={`${item.id}-email-option-${email}`}
                                              type="button"
                                              onClick={() => {
                                                setContactDropdown(null);
                                                openContactChoice();
                                              }}
                                              className="flex w-full min-w-0 items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left text-xs font-light text-zinc-300 transition-colors hover:bg-[rgba(255,255,255,0.06)] hover:text-white"
                                            >
                                              <EmailIcon className="h-3.5 w-3.5 shrink-0 text-[#EF4444]" />
                                              <span className="min-w-0 flex-1 truncate">{email}</span>
                                              <span className="shrink-0 text-[10px] font-medium text-zinc-400">{index + 1}</span>
                                            </button>
                                          ))}
                                        </div>
                                      </div>
                                    ) : null}
                                  </div>
                                ) : null}
                              </div>
                            ) : (
                              <span className="text-sm font-light tracking-tight text-zinc-700">-</span>
                            )}
                          </div>
                          <div className="space-y-1.5">
                            {primaryPhone ? (
                              <div className="relative flex min-w-0 items-center gap-2" data-contact-dropdown-root>
                              <button
                                type="button"
                                  onClick={() => {
                                    setContactDropdown(null);
                                    openContactChoice();
                                  }}
                                  className={cn(
                                    "inline-flex min-w-0 items-center gap-4 text-left",
                                    item.phones.length > 1 ? "max-w-[calc(100%-2.25rem)]" : "max-w-full"
                                  )}
                                title="Choose contact method"
                              >
                                <PhoneIcon className="h-3.5 w-3.5 shrink-0 text-[#22C55E]" />
                                  <span className="truncate text-sm font-light text-zinc-500 transition-colors hover:text-zinc-950">{primaryPhone}</span>
                              </button>
                                {item.phones.length > 1 ? (
                                  <div className="relative shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => toggleContactDropdown("phone")}
                                      className="inline-flex h-6 w-7 items-center justify-center rounded-lg border border-white/10 bg-zinc-800 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_10px_18px_-15px_rgba(2,10,27,0.9)] transition-colors hover:bg-zinc-700"
                                      aria-label="Show all phone numbers"
                                      aria-expanded={phoneDropdownOpen}
                                    >
                                      <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", phoneDropdownOpen ? "rotate-180" : "")} />
                                    </button>
                                    {phoneDropdownOpen ? (
                                      <div className="absolute left-0 top-full z-50 mt-1.5 w-52 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-white/16 bg-[#070b12]/95 shadow-[0_18px_42px_-28px_rgba(0,0,0,0.7)] backdrop-blur-[24px]">
                                        <div className="border-b border-white/10 px-2.5 py-1.5 text-[10px] font-semibold tracking-normal text-zinc-400">
                                          Phones
                                        </div>
                                        <div className="max-h-40 overflow-y-auto p-1">
                                          {item.phones.map((phone, index) => (
                                            <button
                                              key={`${item.id}-phone-option-${phone}`}
                                              type="button"
                                              onClick={() => {
                                                setContactDropdown(null);
                                                openContactChoice();
                                              }}
                                              className="flex w-full min-w-0 items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left text-xs font-light tabular-nums text-zinc-300 transition-colors hover:bg-[rgba(255,255,255,0.06)] hover:text-white"
                                            >
                                              <PhoneIcon className="h-3.5 w-3.5 shrink-0 text-[#22C55E]" />
                                              <span className="min-w-0 flex-1 truncate">{phone}</span>
                                              <span className="shrink-0 text-[10px] font-medium text-zinc-400">{index + 1}</span>
                                            </button>
                                          ))}
                                        </div>
                                      </div>
                                    ) : null}
                                  </div>
                                ) : null}
                              </div>
                            ) : (
                              <span className="text-sm font-light text-zinc-500">-</span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-3">
                            {item.linkedinUrl ? (
                              <a href={item.linkedinUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 border-b border-transparent pb-0.5 text-zinc-400 transition-colors hover:border-zinc-900 hover:text-zinc-950">
                                <LinkedInIcon className="h-3.5 w-3.5 text-[#0A66C2]" />
                                <span className="text-xs font-medium">LinkedIn</span>
                              </a>
                            ) : null}
                            {item.companyUrl ? (
                              <a href={item.companyUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 border-b border-transparent pb-0.5 text-zinc-400 transition-colors hover:border-zinc-900 hover:text-zinc-950">
                                <WebsiteIcon className="h-3.5 w-3.5 text-zinc-950" />
                                <span className="text-xs font-medium">Website</span>
                              </a>
                            ) : null}
                            <button type="button" onClick={() => void copyLeadDetails(item)} className="inline-flex items-center gap-1.5 border-b border-transparent pb-0.5 text-zinc-400 transition-colors hover:border-zinc-900 hover:text-zinc-950">
                              <Copy className="h-3.5 w-3.5" />
                              <span className="text-xs font-medium">{copiedLeadId === item.id ? "Copied" : "Copy lead"}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => openEmailGenerator(item)}
                              disabled={emailDialog?.loading && emailDialog.lead.id === item.id}
                              className="inline-flex items-center gap-1.5 border-b border-transparent pb-0.5 text-zinc-400 transition-colors hover:border-blue-600 hover:text-zinc-950 disabled:pointer-events-none disabled:opacity-40"
                            >
                              {emailDialog?.loading && emailDialog.lead.id === item.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Mail className="h-3.5 w-3.5" />
                              )}
                              <span className="text-xs font-medium">
                                {emailDialog?.loading && emailDialog.lead.id === item.id ? "Generating" : "Generate content"}
                              </span>
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="flex h-full flex-col">
                        <Select
                          value={selectedStatusValue}
                          onValueChange={(value) => handleStatusSelection(item, value)}
                          disabled={Boolean(updatingLeadIds[item.id])}
                        >
                          <SelectTrigger className="h-10 w-full rounded-none border-0 border-b border-zinc-300 !bg-transparent px-0 text-base font-light shadow-none transition-colors dark:!bg-transparent dark:hover:!bg-transparent focus:border-blue-600 focus:ring-0 disabled:opacity-50">
                            <SelectValue placeholder={item.workflowStatusLabel} />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl border-white/16 bg-[#070b12]/95 text-zinc-100 shadow-2xl backdrop-blur-[24px]">
                            {statusOptions.map((option) => (
                              <SelectItem key={option.statusKey} value={option.statusKey} className="rounded-lg py-2.5 text-xs focus:bg-[rgba(255,255,255,0.06)] focus:text-white data-[highlighted]:bg-[rgba(255,255,255,0.06)]">
                                <span className="flex items-center gap-3">
                                  <span className={`ml-1 h-2.5 w-2.5 shrink-0 rounded-full ${getStatusDotClass(option.statusKey)}`} />
                                  {option.label}
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {updatingLeadIds[item.id] ? (
                          <span className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-zinc-400">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Updating status
                          </span>
                        ) : null}
                        <div className="mt-auto pt-3">
                          {item.workflowComment ? (
                            <button type="button" onClick={() => void openHistory(item)} className="mb-2 block w-full border-l border-zinc-300 pl-3 text-left transition-colors hover:border-zinc-900">
                              <span className="line-clamp-2 text-xs font-light leading-relaxed text-zinc-500">
                                {item.workflowComment}
                              </span>
                              {item.workflowCommentUpdatedAt ? (
                                <span className="mt-1 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-zinc-400">
                                  <Clock3 className="h-3 w-3" />
                                  {item.workflowCommentUpdatedAt}
                                </span>
                              ) : null}
                            </button>
                          ) : null}
                          <button type="button" onClick={() => void openHistory(item)} className="inline-flex items-center gap-1.5 border-b border-transparent pb-0.5 text-xs font-medium text-zinc-400 transition-colors hover:border-zinc-900 hover:text-zinc-950">
                            <History className="h-3.5 w-3.5" />
                            {item.workflowCommentHistoryCount > 0
                              ? `${item.workflowCommentHistoryCount} comment${item.workflowCommentHistoryCount === 1 ? "" : "s"}`
                              : "Comment history"}
                          </button>
                        </div>
                      </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <footer className="mt-6 flex shrink-0 flex-col gap-5 border-t border-zinc-100 pb-4 pt-8 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-zinc-400">Lead sheet range</p>
                <p className="text-lg font-light tabular-nums tracking-tight text-zinc-950">
                  {pageRangeStart}-{pageRangeEnd}
                  <span className="ml-2 text-sm text-zinc-400">of {pageTotal.toLocaleString()} records</span>
                </p>
              </div>

              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  aria-label="Previous page"
                  className="h-11 w-11 rounded-full border border-white/18 bg-transparent p-0 text-zinc-500 shadow-none transition-all hover:border-white/35 hover:bg-[rgba(255,255,255,0.04)] hover:text-zinc-100 disabled:opacity-30"
                  onClick={() => setPageOffset((prev) => Math.max(0, prev - pageSize))}
                  disabled={pageOffset === 0}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  aria-label="Next page"
                  className="h-11 w-11 rounded-full border border-zinc-950 bg-transparent p-0 text-zinc-950 shadow-none transition-all hover:border-blue-600 hover:bg-blue-600 hover:text-white disabled:border-zinc-300 disabled:text-zinc-300 disabled:opacity-100"
                  onClick={() => setPageOffset((prev) => prev + pageSize)}
                  disabled={!hasMore}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </footer>
          </main>
        </div>
      </div>

      {filterOpen ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-6">
          <button
            type="button"
            aria-label="Close filters"
            className="absolute inset-0 bg-black/70 backdrop-blur-[7px]"
            onClick={() => setFilterOpen(false)}
          />

          <div className="relative z-[1] w-full max-w-xl overflow-hidden rounded-3xl border border-white/42 bg-[#151a22]/62 text-zinc-100 ring-1 ring-white/32 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.14),0_32px_80px_-48px_rgba(2,10,27,0.82),0_12px_28px_-20px_rgba(2,10,27,0.72)] backdrop-blur-[38px]">
            <div className="relative p-8 pb-28">
              <Button
                type="button"
                variant="ghost"
                className="absolute right-5 top-5 h-10 w-10 rounded-full border border-white/18 bg-transparent p-0 text-zinc-300 shadow-none hover:border-white/35 hover:bg-[rgba(255,255,255,0.06)] hover:text-white"
                onClick={() => setFilterOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>

              <div className="space-y-10">
                <div>
                  <label className="mb-3 block text-xs font-medium text-zinc-400">Status model</label>
                  <Select
                    value={filters.status}
                    onValueChange={(value) => {
                      setFilters((prev) => ({ ...prev, status: value }));
                      setPageOffset(0);
                    }}
                  >
                    <SelectTrigger className="!h-12 w-full rounded-none border-0 border-b border-zinc-300 !bg-transparent px-0 text-lg font-light shadow-none transition-colors dark:!bg-transparent dark:hover:!bg-transparent focus:border-blue-600 focus:ring-0">
                      <SelectValue placeholder="All statuses" />
                    </SelectTrigger>
                    <SelectContent position="popper" className="z-[120] rounded-2xl border-white/16 bg-[#070b12]/95 p-1 text-zinc-100 shadow-2xl backdrop-blur-[24px]">
                      <SelectItem value="all" className="rounded-xl py-2.5 text-sm focus:bg-[rgba(255,255,255,0.06)] focus:text-white data-[highlighted]:bg-[rgba(255,255,255,0.06)]">
                        <span className="flex items-center gap-3">
                          <span className="ml-1 h-2.5 w-2.5 shrink-0 rounded-full bg-zinc-300" />
                          All statuses
                        </span>
                      </SelectItem>
                      {statusOptions.map((option) => (
                        <SelectItem key={option.statusKey} value={option.statusKey} className="rounded-xl py-2.5 text-sm focus:bg-[rgba(255,255,255,0.06)] focus:text-white data-[highlighted]:bg-[rgba(255,255,255,0.06)]">
                          <span className="flex items-center gap-3">
                            <span className={`ml-1 h-2.5 w-2.5 shrink-0 rounded-full ${getStatusDotClass(option.statusKey)}`} />
                            {option.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-4">
                  <label className="block text-sm font-semibold text-zinc-100">By contact intelligence:</label>
                  <div className="flex flex-wrap gap-2.5">
                    {[
                      { value: "all", label: "All profiles" },
                      { value: "complete", label: "Email + phone" },
                      { value: "email", label: "Has email" },
                      { value: "phone", label: "Has phone" },
                      { value: "linkedin", label: "Has LinkedIn" },
                      { value: "website", label: "Has website" },
                      { value: "missing-contact", label: "Needs contact data" },
                    ].map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => {
                          setFilters((prev) => ({
                            ...prev,
                            contact: option.value as MyLeadFilterState["contact"],
                          }));
                          setPageOffset(0);
                        }}
                        className={`inline-flex h-10 items-center rounded-full border px-4 text-sm font-semibold transition-all ${
                          filters.contact === option.value
                            ? "border-blue-500 bg-blue-600/15 text-blue-300 shadow-[0_8px_18px_-16px_rgba(37,99,235,0.85)]"
                            : "border-white/18 bg-transparent text-zinc-100 shadow-none hover:border-blue-500/60 hover:text-blue-300"
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="absolute bottom-8 left-8 right-8 flex items-center justify-between border-t border-white/12 pt-6">
                <button
                  type="button"
                  className="border-b border-transparent pb-1 text-sm font-medium text-zinc-400 transition-colors hover:border-white/45 hover:text-white"
                  onClick={resetFilters}
                >
                  Reset model
                </button>
                <Button
                  type="button"
                  onClick={() => setFilterOpen(false)}
                  className="h-11 rounded-full border border-blue-500/20 bg-blue-600 px-7 text-sm font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_10px_22px_-14px_rgba(37,99,235,0.95)] hover:bg-blue-700"
                >
                  Apply filters
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {pendingStatusChange ? (
        <LeadSheetDialog
          open
          eyebrow=""
          title="Status Note"
          description=""
          onClose={closeStatusCommentDialog}
          compactSize={isDealClosedStatusChange ? "wide" : "default"}
        >
          <div className={cn(isDealClosedStatusChange ? "space-y-5" : "space-y-7")}>
            <div className={cn("border-b border-zinc-100", isDealClosedStatusChange ? "pb-4" : "pb-6")}>
              <h3 className="text-2xl font-light tracking-tight text-zinc-950">
                {pendingStatusChange.item.employeeName || "-"}
              </h3>
              <p className="mt-1 text-sm font-light text-zinc-500">
                {pendingStatusChange.item.company || "-"}
              </p>
            </div>

            {isDealClosedStatusChange ? (
              <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-[0_18px_38px_-34px_rgba(15,23,42,0.6)]">
                <div className="relative h-[clamp(19rem,40vw,30rem)] w-full overflow-hidden bg-zinc-950">
                  <div
                    aria-hidden="true"
                    className="h-full w-full bg-[radial-gradient(circle_at_50%_35%,rgba(34,197,94,0.22),rgba(37,99,235,0.12)_34%,rgba(3,7,18,0.94)_72%)]"
                  />
                  <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-zinc-950/35 via-zinc-950/8 to-transparent" />
                </div>

                <div className="grid items-stretch gap-4 border-t border-zinc-100 p-3 sm:p-4 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
                  <div className="grid h-full min-h-44 grid-rows-[1fr_auto_1fr] gap-2 rounded-2xl bg-zinc-50/70 p-2 lg:min-h-48">
                    <div className="flex min-h-0 items-center rounded-xl bg-white px-4 py-2">
                      <p className="truncate text-base font-light text-zinc-950">
                        {pendingStatusChange.item.workflowStatusLabel || humanizeStatusLabel(pendingStatusChange.item.workflowStatus)}
                      </p>
                    </div>
                    <div className="flex items-center justify-center text-zinc-300">
                      <ChevronRight className="h-3.5 w-3.5 rotate-90" />
                    </div>
                    <div className="flex min-h-0 items-center rounded-xl border border-emerald-500/20 bg-[#22c55e] px-4 py-2 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_10px_22px_-14px_rgba(34,197,94,0.85)]">
                      <p className="truncate text-base font-semibold">
                        {statusOptions.find((option) => option.statusKey === pendingStatusChange.nextStatus)?.label ||
                          humanizeStatusLabel(pendingStatusChange.nextStatus)}
                      </p>
                    </div>
                  </div>

                  <label className="flex min-h-44 flex-col gap-3 lg:min-h-48">
                    <span className="text-xs font-medium text-zinc-400">Comment optional</span>
                    <Textarea
                      value={statusComment}
                      onChange={(event) => setStatusComment(event.target.value.slice(0, 2000))}
                      placeholder="Example: Follow up after first call. Asked to reconnect next week."
                      className="min-h-0 flex-1 resize-none rounded-2xl border-zinc-200 bg-white px-4 py-3 text-sm font-light leading-6 shadow-none focus-visible:border-emerald-500 focus-visible:ring-1 focus-visible:ring-emerald-500"
                    />
                    <span className="block text-right text-xs font-light text-zinc-400">
                      {statusComment.length}/2000
                    </span>
                  </label>
                </div>

                <div className="flex flex-col gap-3 border-t border-zinc-100 px-4 pb-4 pt-4 sm:flex-row sm:items-center sm:justify-end sm:px-5 sm:pb-5">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={closeStatusCommentDialog}
                    className="h-11 rounded-full border border-zinc-300 bg-white px-5 text-sm font-semibold text-zinc-600 shadow-none hover:border-zinc-900 hover:bg-white hover:text-zinc-950"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={handleUpdateStatusClick}
                    disabled={Boolean(updatingLeadIds[pendingStatusChange.item.id]) || ringingDealBell}
                    className="h-11 gap-2 rounded-full border border-emerald-500/20 bg-[#22c55e] px-5 text-sm font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_10px_22px_-14px_rgba(34,197,94,0.85)] hover:bg-emerald-600"
                  >
                    {updatingLeadIds[pendingStatusChange.item.id] || ringingDealBell ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <MessageSquare className="h-4 w-4" />
                    )}
                    Update Status
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="rounded-2xl border border-zinc-200 bg-white p-1.5">
                  <div className="grid gap-1.5 sm:grid-cols-[minmax(0,1fr)_2.5rem_minmax(0,1fr)] sm:items-stretch">
                    <div className="rounded-xl bg-zinc-50/80 px-4 py-3">
                      <p className="truncate text-base font-light text-zinc-950">
                        {pendingStatusChange.item.workflowStatusLabel || humanizeStatusLabel(pendingStatusChange.item.workflowStatus)}
                      </p>
                    </div>
                    <div className="hidden items-center justify-center text-zinc-300 sm:flex">
                      <ChevronRight className="h-4 w-4" />
                    </div>
                    <div className="rounded-xl border border-blue-500/20 bg-blue-600 px-4 py-3 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_10px_22px_-14px_rgba(37,99,235,0.95)]">
                      <p className="truncate text-base font-semibold">
                        {statusOptions.find((option) => option.statusKey === pendingStatusChange.nextStatus)?.label ||
                          humanizeStatusLabel(pendingStatusChange.nextStatus)}
                      </p>
                    </div>
                  </div>
                </div>

                <label className="block space-y-3">
                  <span className="text-xs font-medium text-zinc-400">Comment optional</span>
                  <Textarea
                    value={statusComment}
                    onChange={(event) => setStatusComment(event.target.value.slice(0, 2000))}
                    placeholder="Example: Follow up after first call. Asked to reconnect next week."
                    className="min-h-32 rounded-2xl border-zinc-200 bg-white px-4 py-3 text-sm font-light leading-6 shadow-none focus-visible:border-blue-500 focus-visible:ring-1 focus-visible:ring-blue-500"
                  />
                  <span className="block text-right text-xs font-light text-zinc-400">
                    {statusComment.length}/2000
                  </span>
                </label>

                <div className="flex flex-col gap-3 border-t border-zinc-100 pt-6 sm:flex-row sm:items-center sm:justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={closeStatusCommentDialog}
                    disabled={Boolean(updatingLeadIds[pendingStatusChange.item.id])}
                    className="h-11 rounded-full border border-zinc-300 bg-white px-5 text-sm font-semibold text-zinc-600 shadow-none hover:border-zinc-900 hover:bg-white hover:text-zinc-950"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={handleUpdateStatusClick}
                    disabled={Boolean(updatingLeadIds[pendingStatusChange.item.id])}
                    className="h-11 gap-2 rounded-full border border-blue-500/20 bg-blue-600 px-5 text-sm font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_10px_22px_-14px_rgba(37,99,235,0.95)] hover:bg-blue-700"
                  >
                    {updatingLeadIds[pendingStatusChange.item.id] ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <MessageSquare className="h-4 w-4" />
                    )}
                    Update Status
                  </Button>
                </div>
              </>
            )}
          </div>
        </LeadSheetDialog>
      ) : null}

      {ringBellConfirmOpen && pendingStatusChange ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-6">
          <button
            type="button"
            aria-label="Close bell confirmation"
            className="absolute inset-0 bg-zinc-950/30 backdrop-blur-[3px]"
            onClick={() => {
              if (!ringingDealBell) setRingBellConfirmOpen(false);
            }}
          />

          <div className="relative z-[1] w-full max-w-lg overflow-hidden rounded-2xl border border-zinc-300 bg-white shadow-[0_32px_90px_-54px_rgba(2,10,27,0.82)]">
            <Button
              type="button"
              variant="ghost"
              disabled={ringingDealBell}
              className="absolute right-5 top-5 z-20 h-10 w-10 rounded-full border border-zinc-300 bg-white p-0 text-zinc-500 shadow-none hover:border-zinc-900 hover:bg-white hover:text-zinc-950"
              onClick={() => setRingBellConfirmOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>

            <div className="px-8 pb-8 pt-8">
              <div className="pr-12">
                <h3 className="text-4xl font-light leading-none tracking-tighter text-zinc-950">
                  Ring the deal bell?
                </h3>
                <p className="mt-3 text-sm font-light leading-6 text-zinc-500">
                  Let the team know you closed the deal with{" "}
                  <span className="font-medium text-zinc-700">
                    {pendingStatusChange.item.employeeName || "this lead"}
                  </span>.
                </p>
              </div>

              <div className="mt-7 rounded-2xl border border-zinc-200 bg-white p-1.5">
                <div className="grid gap-1.5 sm:grid-cols-[minmax(0,1fr)_2.5rem_minmax(0,1fr)] sm:items-stretch">
                  <div className="rounded-xl bg-zinc-50/80 px-4 py-3">
                    <p className="truncate text-base font-light text-zinc-950">
                      {pendingStatusChange.item.workflowStatusLabel || humanizeStatusLabel(pendingStatusChange.item.workflowStatus)}
                    </p>
                  </div>
                  <div className="hidden items-center justify-center text-zinc-300 sm:flex">
                    <ChevronRight className="h-4 w-4" />
                  </div>
                  <div className="rounded-xl border border-emerald-500/20 bg-[#22c55e] px-4 py-3 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_10px_22px_-14px_rgba(34,197,94,0.85)]">
                    <p className="truncate text-base font-semibold">
                      {statusOptions.find((option) => option.statusKey === pendingStatusChange.nextStatus)?.label ||
                        humanizeStatusLabel(pendingStatusChange.nextStatus)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-7 flex flex-col gap-3 border-t border-zinc-100 pt-6 sm:flex-row sm:items-center sm:justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  disabled={ringingDealBell}
                  onClick={() => setRingBellConfirmOpen(false)}
                  className="h-11 rounded-full border border-zinc-300 bg-white px-5 text-sm font-semibold text-zinc-600 shadow-none hover:border-zinc-900 hover:bg-white hover:text-zinc-950"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  disabled={ringingDealBell}
                  onClick={() => void submitStatusComment({ ringBell: true })}
                  className="h-11 gap-2 rounded-full border border-emerald-500/20 bg-[#22c55e] px-5 text-sm font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_10px_22px_-14px_rgba(34,197,94,0.85)] hover:bg-emerald-600"
                >
                  {ringingDealBell ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <BellRing className="h-4 w-4" />
                  )}
                  Ring bell
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {contactChoiceLead ? (
        <LeadSheetDialog
          open
          title="Contact channel"
          description=""
          eyebrow=""
          onClose={() => setContactChoiceLead(null)}
        >
          <div className="space-y-6">
            <div className="border-b border-zinc-100 pb-5">
              <h3 className="text-2xl font-light tracking-tight text-zinc-950">
                {contactChoiceLead.name || "This lead"}
              </h3>
            </div>

            <div className="space-y-3">
              {contactChoiceLead.emails.map((email, index) => (
                <div key={`contact-email-${email}`} className="grid gap-3 border-b border-zinc-100 px-1 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium tracking-normal text-zinc-400">email {index + 1}</p>
                    <p className="mt-1 truncate text-sm font-light text-zinc-700">{email}</p>
                  </div>
                  <Button
                    type="button"
                    disabled={!buildEmailHref(email)}
                    onClick={() => {
                      window.location.href = buildEmailHref(email);
                      setContactChoiceLead(null);
                    }}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-red-500/20 bg-[#EF4444] px-4 text-sm font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_10px_22px_-14px_rgba(239,68,68,0.95)] hover:bg-red-600 disabled:border-red-400/20 disabled:bg-red-500/55 disabled:text-white/80 disabled:opacity-100 disabled:shadow-none"
                  >
                    <Mail className="h-3.5 w-3.5 stroke-[2.4]" />
                    Email
                  </Button>
                </div>
              ))}

              {contactChoiceLead.phones.map((phone, index) => (
                <div key={`contact-phone-${phone}`} className="grid gap-3 border-b border-zinc-100 px-1 py-4 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center">
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium tracking-normal text-zinc-400">phone {index + 1}</p>
                    <p className="mt-1 truncate text-sm font-light tabular-nums text-zinc-700">{phone}</p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={!buildTelHref(phone)}
                    onClick={() => {
                      window.location.href = buildTelHref(phone);
                      setContactChoiceLead(null);
                    }}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-950 shadow-none transition-colors hover:border-blue-600 hover:bg-white hover:text-blue-600 disabled:opacity-50"
                  >
                    <Headset className="h-3.5 w-3.5" />
                    Linkus
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={!buildWhatsAppHref(phone)}
                    onClick={() => {
                      window.open(buildWhatsAppHref(phone), "_blank", "noopener,noreferrer");
                      setContactChoiceLead(null);
                    }}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-[#22c55e]/30 bg-[#22c55e] px-4 text-sm font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_10px_22px_-16px_rgba(34,197,94,0.85)] transition-colors hover:bg-[#16a34a] hover:text-white disabled:opacity-50"
                  >
                    <WhatsAppIcon className="h-3.5 w-3.5" />
                    WhatsApp
                  </Button>
                </div>
              ))}

              {contactChoiceLead.emails.length === 0 && contactChoiceLead.phones.length === 0 ? (
                <div className="rounded-2xl border border-zinc-200 bg-zinc-50/70 p-5 text-sm font-light text-zinc-500">
                  No contact channels are available for this lead.
                </div>
              ) : null}
            </div>
          </div>
        </LeadSheetDialog>
      ) : null}

      {historyLead ? (
        <LeadSheetDialog
          open
          title="Comment History"
          description=""
          eyebrow=""
          onClose={closeHistory}
        >
          <div className="space-y-6">
            <div className="border-b border-zinc-100 pb-6">
              <p className="text-xs font-medium normal-case tracking-normal text-zinc-400">Selected profile</p>
              <h3 className="mt-2 text-2xl font-light tracking-tight text-zinc-950">
                {historyLead.employeeName || "-"}
              </h3>
              <p className="mt-1 text-sm font-light text-zinc-500">{historyLead.company || "-"}</p>
            </div>

            {historyLoading ? (
              <div className="flex h-32 items-center justify-center text-sm font-light text-zinc-400">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading history...
              </div>
            ) : historyError ? (
              <div className="border border-red-200 bg-red-50 p-4 text-sm font-light text-red-700">
                {historyError}
              </div>
            ) : historyItems.length === 0 ? (
              <div className="border border-zinc-200 bg-zinc-50/70 p-6 text-sm font-light text-zinc-500">
                No comments have been recorded for this lead yet.
              </div>
            ) : (
              <div className="border-y border-zinc-300">
                <div className="flex items-center justify-between border-b border-zinc-200 py-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-zinc-400">Timeline</span>
                  </div>
                  <span className="text-xs font-light text-zinc-400">
                    {historyItems.length} update{historyItems.length === 1 ? "" : "s"}
                  </span>
                </div>

                <div className="max-h-[26rem] overflow-y-auto pr-1 scrollbar-modern">
                  {historyItems.map((entry) => {
                    const statusLabel = entry.workflowStatusLabel || humanizeStatusLabel(entry.workflowStatus);
                    const actorName =
                      asText(entry.updatedByUserDisplayName) ||
                      asText(entry.updatedByUsername) ||
                      "Unknown user";

                    return (
                      <article
                        key={entry.id}
                        className="group grid grid-cols-[2.75rem_minmax(0,1fr)] border-b border-zinc-100 last:border-b-0"
                      >
                        <div className="relative flex justify-center">
                          <span className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-blue-500/35" />
                          <span className="relative mt-5 flex h-4.5 w-4.5 items-center justify-center rounded-full border border-blue-500 bg-white shadow-[0_0_0_3px_rgba(37,99,235,0.08)]">
                            <span className={`h-2.5 w-2.5 rounded-full ${getStatusDotClass(entry.workflowStatus)}`} />
                          </span>
                        </div>

                        <div className="min-w-0 py-5 transition-colors group-hover:bg-zinc-50/40">
                          <div className="flex flex-wrap items-start justify-between gap-3 pr-1">
                            <div className="min-w-0">
                              <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                                <h4 className="text-base font-medium tracking-tight text-zinc-950">{statusLabel}</h4>
                              </div>
                              <p className="mt-1 text-xs font-light text-zinc-400">Updated by {actorName}</p>
                            </div>

                            <time className="shrink-0 text-right text-xs font-light leading-5 text-zinc-400">
                              {formatDateTime(entry.createdAt) || "Time unavailable"}
                            </time>
                          </div>

                          <div className="mt-3 max-w-xl border-l border-zinc-200 pl-3">
                            <p className="whitespace-pre-wrap text-sm font-light leading-6 text-zinc-600">
                              {entry.comment || "No comment added."}
                            </p>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </LeadSheetDialog>
      ) : null}

      {emailDialog ? (
        <LeadSheetDialog
          open
          eyebrow=""
          title={
            emailDialog.platform === "whatsapp"
              ? "WhatsApp Draft"
              : emailDialog.platform === "email"
                ? "Email Draft"
                : "Generate Content"
          }
          description=""
          onClose={closeEmailDialog}
        >
          {!emailDialog.platform && !emailDialog.loading && !emailDialog.error ? (
            <div className="space-y-7">
              <div className="border-b border-zinc-100 pb-6">
                <h3 className="text-2xl font-light tracking-tight text-zinc-950">
                  {emailDialog.lead.employeeName || "-"}
                </h3>
                <p className="mt-1 text-sm font-light leading-6 text-zinc-500">
                  {[emailDialog.lead.title, emailDialog.lead.company].filter(Boolean).join(" at ") || "-"}
                </p>
              </div>

              <div>
                <div className="flex flex-col gap-3 rounded-full border border-zinc-200 bg-white p-1.5 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => void generateContentForPlatform(emailDialog.lead, "email")}
                    className="inline-flex h-12 flex-1 items-center justify-center gap-2.5 rounded-full border border-red-500/20 bg-[#EF4444] px-5 text-sm font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_10px_22px_-14px_rgba(239,68,68,0.85)] transition-colors hover:bg-red-600"
                  >
                    <Mail className="h-[18px] w-[18px] stroke-[2.4]" />
                    Email
                  </button>
                  <button
                    type="button"
                    onClick={() => void generateContentForPlatform(emailDialog.lead, "whatsapp")}
                    className="inline-flex h-12 flex-1 items-center justify-center gap-2.5 rounded-full border border-[#22c55e]/30 bg-[#22c55e] px-5 text-sm font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_10px_22px_-14px_rgba(34,197,94,0.85)] transition-colors hover:bg-emerald-600"
                  >
                    <WhatsAppIcon className="h-[18px] w-[18px]" />
                    WhatsApp
                  </button>
                </div>
              </div>
            </div>
          ) : emailDialog.loading ? (
            <div className="flex min-h-[24rem] flex-col items-center justify-center text-center">
              <div className="relative flex h-16 w-16 items-center justify-center rounded-full border border-zinc-200 bg-white">
                <Loader2
                  className={cn(
                    "h-7 w-7 animate-spin",
                    emailDialog.platform === "email"
                      ? "text-red-500"
                      : emailDialog.platform === "whatsapp"
                        ? "text-emerald-500"
                        : "text-blue-600"
                  )}
                />
              </div>
              <h3 className="mt-6 text-2xl font-light tracking-tight text-zinc-950">Generating content</h3>
              <p className="mt-2 max-w-sm text-sm font-light leading-6 text-zinc-500">
                Building a sales narrative from the lead, company, and event context.
              </p>
              <div className="mt-8 w-full max-w-md space-y-3">
                {[0, 1, 2].map((item) => (
                  <div key={item} className="h-3 overflow-hidden bg-zinc-100">
                    <div
                      className={cn(
                        "h-full w-1/2 animate-pulse",
                        emailDialog.platform === "email"
                          ? "bg-red-500/70"
                          : emailDialog.platform === "whatsapp"
                            ? "bg-emerald-500/70"
                            : "bg-blue-600/70"
                      )}
                      style={{ marginLeft: `${item * 16}%` }}
                    />
                  </div>
                ))}
              </div>
            </div>
          ) : emailDialog.error ? (
            <div className="space-y-6">
              <div className="border border-red-200 bg-red-50 p-5">
                <p className="text-sm font-medium text-red-700">Draft was not ready</p>
                <p className="mt-2 text-sm font-light leading-6 text-red-700">{emailDialog.error}</p>
              </div>
              <div className="flex justify-end gap-3 border-t border-zinc-100 pt-6">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={closeEmailDialog}
                  className="h-11 rounded-full border border-zinc-300 bg-white px-5 text-sm font-semibold text-zinc-600 shadow-none hover:border-zinc-900 hover:bg-white hover:text-zinc-950"
                >
                  Close
                </Button>
                <Button
                  type="button"
                  onClick={() =>
                    void generateContentForPlatform(emailDialog.lead, emailDialog.platform || "email", {
                      feedback: emailDialog.feedback,
                    })
                  }
                  className="h-11 gap-2 rounded-full border border-blue-500/20 bg-blue-600 px-5 text-sm font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_10px_22px_-14px_rgba(37,99,235,0.95)] hover:bg-blue-700"
                >
                  <RefreshCcw className="h-4 w-4" />
                  Try Again
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-7">
              <div className="border-b border-zinc-100 pb-6">
                <h3 className="text-2xl font-light tracking-tight text-zinc-950">
                  {emailDialog.lead.employeeName || "-"}
                </h3>
                <p className="mt-1 text-sm font-light leading-6 text-zinc-500">
                  {[emailDialog.lead.title, emailDialog.lead.company].filter(Boolean).join(" at ") || "-"}
                </p>
              </div>

              {emailDialog.platform === "email" ? (
                <label className="block space-y-3">
                  <span className="text-xs font-medium text-zinc-400">Subject</span>
                  <Input
                    value={emailDialog.subject}
                    onChange={(event) => updateEmailDraftField("subject", event.target.value.slice(0, 180))}
                    className="h-12 rounded-2xl border-zinc-200 bg-white px-4 text-base font-light shadow-none focus-visible:border-blue-500 focus-visible:ring-1 focus-visible:ring-blue-500"
                  />
                </label>
              ) : null}

              <label className="block space-y-3">
                <span className="text-xs font-medium text-zinc-400">
                  {emailDialog.platform === "whatsapp" ? "WhatsApp message" : "Mail body"}
                </span>
                <Textarea
                  value={emailDialog.body}
                  onChange={(event) => updateEmailDraftField("body", event.target.value.slice(0, 5000))}
                  className={cn(
                    "rounded-2xl border-zinc-200 bg-white px-4 py-3 text-sm font-light leading-7 shadow-none focus-visible:border-blue-500 focus-visible:ring-1 focus-visible:ring-blue-500",
                    emailDialog.platform === "whatsapp" ? "min-h-36" : "min-h-56"
                  )}
                />
                <span className="block text-right text-xs font-light text-zinc-400">
                  {emailDialog.body.length}/5000
                </span>
              </label>

              <label className="block space-y-3 border-t border-zinc-100 pt-6">
                <span className="text-xs font-medium text-zinc-400">Feedback for regenerate</span>
                <Textarea
                  value={emailDialog.feedback}
                  onChange={(event) => updateEmailFeedback(event.target.value)}
                  placeholder="Example: Make it shorter, stronger, and focus on sponsor ROI."
                  className="min-h-24 rounded-2xl border-zinc-200 bg-white px-4 py-3 text-sm font-light leading-6 shadow-none focus-visible:border-blue-500 focus-visible:ring-1 focus-visible:ring-blue-500"
                />
                <span className="block text-right text-xs font-light text-zinc-400">
                  {emailDialog.feedback.length}/1200
                </span>
              </label>

              <div className="flex flex-col gap-3 border-t border-zinc-100 pt-6 sm:flex-row sm:items-center sm:justify-between">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() =>
                    void generateContentForPlatform(emailDialog.lead, emailDialog.platform || "email", {
                      feedback: emailDialog.feedback,
                    })
                  }
                  className="h-11 gap-2 rounded-full border border-zinc-900/10 bg-zinc-950 px-5 text-sm font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_12px_26px_-18px_rgba(24,24,27,0.95)] hover:bg-zinc-800"
                >
                  <RefreshCcw className="h-4 w-4" />
                  {emailDialog.feedback.trim() ? "Regenerate with Feedback" : "Regenerate"}
                </Button>
                <div className="flex flex-wrap justify-end gap-3">
                  {emailDialog.platform === "email" ? (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => void copyEmailDraft("subject")}
                      className="h-11 gap-2 rounded-full border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-600 shadow-none hover:border-zinc-900 hover:bg-white hover:text-zinc-950"
                    >
                      <Copy className="h-4 w-4" />
                      {emailDialog.copiedAction === "subject" ? "Copied" : "Subject"}
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => void copyEmailDraft("body")}
                    className="h-11 gap-2 rounded-full border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-600 shadow-none hover:border-zinc-900 hover:bg-white hover:text-zinc-950"
                  >
                    <Copy className="h-4 w-4" />
                    {emailDialog.copiedAction === "body"
                      ? "Copied"
                      : emailDialog.platform === "whatsapp"
                        ? "Message"
                        : "Body"}
                  </Button>
                  <Button
                    type="button"
                    onClick={() => void copyEmailDraft("full")}
                    className="h-11 gap-2 rounded-full border border-blue-500/20 bg-blue-600 px-5 text-sm font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_10px_22px_-14px_rgba(37,99,235,0.95)] hover:bg-blue-700"
                  >
                    <Copy className="h-4 w-4" />
                    {emailDialog.copiedAction === "full"
                      ? "Copied"
                      : emailDialog.platform === "whatsapp"
                        ? "Copy WhatsApp"
                        : "Copy Email"}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </LeadSheetDialog>
      ) : null}

      <LeadSheetDialog
        open={templateUploadOpen}
        title="Upload Leads"
        description=""
        eyebrow=""
        onClose={closeTemplateUploadDialog}
      >
        <div className="space-y-7">
          <div>
            <Select
              value={templateUploadEventId}
              onValueChange={(value) =>
                setTemplateUpload((prev) => ({
                  ...prev,
                  selectedEventId: value,
                  file: null,
                  validation: null,
                  error: "",
                }))
              }
              disabled={loadingRegistryEvents || templateUpload.validating || templateUpload.submitting}
            >
              <SelectTrigger
                aria-label="Select upload event"
                className="group !h-12 w-full justify-start gap-3 rounded-none border-0 border-b border-zinc-300 bg-transparent px-0 text-left text-lg font-light text-zinc-950 shadow-none transition-colors hover:border-blue-600 hover:text-blue-700 focus:ring-0 focus-visible:ring-0 [&>svg]:h-5 [&>svg]:w-5 [&>svg]:opacity-40"
              >
                <SelectValue placeholder={loadingRegistryEvents ? "Loading events..." : "Select event"} />
              </SelectTrigger>
              <SelectContent
                align="start"
                position="popper"
                className={UPLOAD_EVENT_SELECT_CONTENT_CLASS}
                viewportClassName="w-auto min-w-0 p-4"
              >
                {templateUploadEventOptions.map((event) => (
                  <SelectItem
                    key={event.id}
                    value={event.id}
                    className={UPLOAD_EVENT_SELECT_ITEM_CLASS}
                  >
                    {getDisplayEventName(event.eventName)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div
            className={cn(
              "group flex min-h-16 items-center gap-3 py-1 transition-opacity",
              !selectedTemplateUploadEvent ? "opacity-60" : ""
            )}
          >
            <label
              htmlFor="my-lead-template-upload"
              className={cn(
                "flex min-w-0 flex-1 items-center gap-4",
                !selectedTemplateUploadEvent || templateUpload.validating || templateUpload.submitting
                  ? "cursor-not-allowed"
                  : "cursor-pointer"
              )}
            >
              <span className="min-w-0 flex-1 text-left">
                <span className="block truncate text-sm font-semibold text-zinc-950">
                  {!selectedTemplateUploadEvent
                    ? "Select event first"
                    : templateUpload.file?.name || "Choose Excel template"}
                </span>
                <span className="mt-1 block truncate text-xs font-light text-zinc-500">
                  {!selectedTemplateUploadEvent
                    ? "Only .xlsx files are accepted"
                    : templateUpload.validating
                      ? "Checking workbook"
                      : templateValidation
                        ? "Template is ready"
                        : "Only .xlsx files are accepted"}
                </span>
              </span>
              <span className="inline-flex h-10 w-28 shrink-0 items-center justify-center rounded-full border border-zinc-300 bg-white px-4 text-xs font-semibold text-zinc-700 transition-colors group-hover:border-zinc-400 group-hover:text-zinc-950">
                Choose
              </span>
              <input
                id="my-lead-template-upload"
                type="file"
                accept={LEAD_TEMPLATE_ACCEPT}
                className="sr-only"
                disabled={!selectedTemplateUploadEvent || templateUpload.validating || templateUpload.submitting}
                onChange={(event) => void handleTemplateFileChange(event)}
              />
            </label>

            <button
              type="button"
              onClick={() => void handleTemplateDownload()}
              className="inline-flex h-10 w-28 shrink-0 items-center justify-center gap-2 rounded-full border border-blue-500/20 bg-blue-600 px-4 text-xs font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_10px_22px_-14px_rgba(37,99,235,0.95)] transition-colors hover:bg-blue-700"
            >
              <Download className="h-3.5 w-3.5" />
              Template
            </button>
          </div>

          {templateUpload.error ? (
            <div className="border-y border-red-200 bg-transparent py-4 text-sm">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-600 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_10px_20px_-14px_rgba(220,38,38,0.9)]">
                  <AlertTriangle className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="font-medium text-red-700">{templateUploadErrorCopy.title}</p>
                  <p className="mt-2 text-xs font-medium leading-5 text-red-600">{templateUploadErrorCopy.hint}</p>
                </div>
              </div>
            </div>
          ) : null}

          {templateValidation ? (
            <div className="space-y-5">
              <div className="border-y border-blue-100 py-5">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-center gap-4">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.32),0_16px_30px_-18px_rgba(37,99,235,0.95)]">
                      <span className="h-2.5 w-2.5 rounded-full bg-white" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-base font-medium text-zinc-950">Ready to add</p>
                      <p className="mt-1 truncate text-sm font-light text-zinc-500">
                        {getDisplayEventName(selectedTemplateUploadEvent?.eventName)}
                      </p>
                    </div>
                  </div>
                  <div className="shrink-0 text-left sm:text-right">
                    <p className="text-5xl font-light tabular-nums tracking-tight text-zinc-950">
                      {templateValidation.importRows.toLocaleString()}
                    </p>
                    <p className="mt-1 text-xs font-medium text-zinc-400">leads prepared</p>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3 border-t border-zinc-100 pt-4 text-sm">
                  <div className="flex items-baseline gap-2">
                    <span className="text-zinc-400">Sheets</span>
                    <span className="text-xl font-light tabular-nums text-zinc-950">
                      {templateValidation.sheetCount.toLocaleString()}
                    </span>
                  </div>
                  <span className="hidden h-5 w-px bg-zinc-200 sm:block" />
                  <div className="flex items-baseline gap-2">
                    <span className="text-zinc-400">Rows checked</span>
                    <span className="text-xl font-light tabular-nums text-zinc-950">
                      {templateValidation.rawRows.toLocaleString()}
                    </span>
                  </div>
                  <span className="hidden h-5 w-px bg-zinc-200 sm:block" />
                  <div className="flex items-baseline gap-2">
                    <span className="text-zinc-400">Skipped</span>
                    <span className="text-xl font-light tabular-nums text-zinc-950">
                      {templateValidation.invalidRows.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-4">
                  <p className="text-sm font-medium text-zinc-500">Detected categories</p>
                  <p className="text-xs font-medium text-zinc-400">
                    {templateValidation.categories.length.toLocaleString()} found
                  </p>
                </div>
                <div className="max-h-32 overflow-y-auto border-y border-zinc-100 scrollbar-modern">
                  {templateValidation.categories.map((category) => (
                    <div
                      key={category.name}
                      className="flex items-center justify-between gap-4 border-b border-zinc-100 py-3 last:border-b-0"
                    >
                      <span className="min-w-0 truncate text-sm font-semibold text-zinc-950">
                        {category.name}
                      </span>
                      <span className="shrink-0 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600">
                        {category.validRows.toLocaleString()} leads
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {templateValidation.invalidReasons.length > 0 ? (
                <div className="flex items-start gap-3 border-t border-zinc-100 pt-4 text-sm">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                  <div>
                    <p className="font-medium text-zinc-700">Some rows were skipped</p>
                    <p className="mt-1 font-light leading-6 text-zinc-500">
                      {templateValidation.invalidReasons[0]}
                    </p>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="flex items-center justify-between border-t border-zinc-100 pt-5">
            <Button
              type="button"
              variant="ghost"
              className="h-11 rounded-none border-b border-transparent px-0 text-sm font-medium text-zinc-500 shadow-none hover:border-zinc-900 hover:bg-transparent hover:text-zinc-950"
              onClick={closeTemplateUploadDialog}
              disabled={templateUpload.submitting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-blue-500/20 bg-blue-600 px-7 text-sm font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_10px_22px_-14px_rgba(37,99,235,0.95)] hover:bg-blue-700 disabled:border-blue-400/20 disabled:bg-blue-600/55 disabled:text-white/80 disabled:opacity-100 disabled:shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_10px_22px_-18px_rgba(37,99,235,0.75)]"
              onClick={() => void handleTemplateUploadSubmit()}
              disabled={!templateUploadReady || templateUpload.validating || templateUpload.submitting}
            >
              {templateUpload.submitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <UploadCloud className="h-3.5 w-3.5" />
                  Add leads
                </>
              )}
            </Button>
          </div>
        </div>
      </LeadSheetDialog>

      <LeadSheetDialog
        open={addLeadOpen}
        title="Add Lead"
        description=""
        eyebrow=""
        onClose={closeAddLeadDialog}
      >
        <div className="grid gap-x-8 gap-y-8 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-3 block text-xs font-medium text-zinc-400">
              Full Name
            </label>
            <Input
              value={addLeadForm.fullName}
              onChange={(event) => updateAddLeadField("fullName", event.target.value)}
              placeholder="Lead name"
              className="h-12 rounded-none border-0 border-b border-zinc-300 bg-transparent px-0 text-lg font-light tracking-tight text-zinc-950 shadow-none placeholder:text-zinc-300 focus:border-blue-600 focus:ring-0"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="mb-3 block text-xs font-medium text-zinc-400">
              Title
            </label>
            <Input
              value={addLeadForm.title}
              onChange={(event) => updateAddLeadField("title", event.target.value)}
              placeholder="Job title"
              className="h-12 rounded-none border-0 border-b border-zinc-300 bg-transparent px-0 text-lg font-light tracking-tight text-zinc-950 shadow-none placeholder:text-zinc-300 focus:border-blue-600 focus:ring-0"
            />
          </div>

          <div>
            <label className="mb-3 block text-xs font-medium text-zinc-400">
              Company Name
            </label>
            <Input
              value={addLeadForm.companyName}
              onChange={(event) => updateAddLeadField("companyName", event.target.value)}
              placeholder="Company"
              className="h-12 rounded-none border-0 border-b border-zinc-300 bg-transparent px-0 text-lg font-light tracking-tight text-zinc-950 shadow-none placeholder:text-zinc-300 focus:border-blue-600 focus:ring-0"
            />
          </div>

          <div>
            <label className="mb-3 block text-xs font-medium text-zinc-400">
              Company URL
            </label>
            <Input
              value={addLeadForm.companyUrl}
              onChange={(event) => updateAddLeadField("companyUrl", event.target.value)}
              placeholder="https://company.com"
              className="h-12 rounded-none border-0 border-b border-zinc-300 bg-transparent px-0 text-lg font-light tracking-tight text-zinc-950 shadow-none placeholder:text-zinc-300 focus:border-blue-600 focus:ring-0"
            />
          </div>

          <div>
            <label className="mb-3 block text-xs font-medium text-zinc-400">
              Email
            </label>
            <Input
              value={addLeadForm.email}
              onChange={(event) => updateAddLeadField("email", event.target.value)}
              placeholder="name@company.com"
              className="h-12 rounded-none border-0 border-b border-zinc-300 bg-transparent px-0 text-lg font-light tracking-tight text-zinc-950 shadow-none placeholder:text-zinc-300 focus:border-blue-600 focus:ring-0"
            />
          </div>

          <div>
            <label className="mb-3 block text-xs font-medium text-zinc-400">
              Phone
            </label>
            <Input
              value={addLeadForm.phone}
              onChange={(event) => updateAddLeadField("phone", event.target.value)}
              placeholder="+60 ..."
              className="h-12 rounded-none border-0 border-b border-zinc-300 bg-transparent px-0 text-lg font-light tracking-tight text-zinc-950 shadow-none placeholder:text-zinc-300 focus:border-blue-600 focus:ring-0"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="mb-3 block text-xs font-medium text-zinc-400">
              LinkedIn URL
            </label>
            <Input
              value={addLeadForm.linkedinUrl}
              onChange={(event) => updateAddLeadField("linkedinUrl", event.target.value)}
              placeholder="https://linkedin.com/in/..."
              className="h-12 rounded-none border-0 border-b border-zinc-300 bg-transparent px-0 text-lg font-light tracking-tight text-zinc-950 shadow-none placeholder:text-zinc-300 focus:border-blue-600 focus:ring-0"
            />
          </div>
        </div>

        <div className="mt-8 flex items-center justify-between">
          <Button
            type="button"
            variant="ghost"
            className="h-11 rounded-none border-b border-transparent px-0 text-sm font-medium text-zinc-500 shadow-none hover:border-zinc-900 hover:bg-transparent hover:text-zinc-950"
            onClick={() => closeAddLeadDialog()}
            disabled={addingLead}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-blue-500/20 bg-blue-600 px-7 text-sm font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_10px_22px_-14px_rgba(37,99,235,0.95)] hover:bg-blue-700 disabled:border-blue-400/20 disabled:bg-blue-600/55 disabled:text-white/80 disabled:opacity-100 disabled:shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_10px_22px_-18px_rgba(37,99,235,0.75)]"
            onClick={() => void submitAddLead()}
            disabled={addingLead || !selectedEvent}
          >
            {addingLead ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Adding...
              </>
            ) : (
              <>
                <Plus className="h-3.5 w-3.5" />
                Add a lead
              </>
            )}
          </Button>
        </div>
      </LeadSheetDialog>
    </div>
  );
}
