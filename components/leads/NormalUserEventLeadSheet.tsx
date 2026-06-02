"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
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
import {
  addEventLead,
  createCampaignFromUpload,
  downloadLeadTemplateFile,
  createWorkflowStatus,
  downloadEventAgendaFile,
  generateLeadContent,
  getLeadWorkflowStatusHistory,
  listEventAgendas,
  listEventLeads,
  listEvents,
  listWorkflowStatuses,
  updateLeadWorkflowStatus,
  validateLeadTemplateUpload,
  type EventLeadCreateRequest,
  type EventLeadListItem,
  type EventLeadListResponse,
  type EventSummaryItem,
  type EventAgendaItem,
  type LeadContentGenerationResponse,
  type LeadContentPlatform,
  type LeadTemplateValidationResponse,
  type WorkflowStatus,
  type WorkflowStatusDefinitionItem,
  type WorkflowStatusHistoryItem,
} from "@/lib/apiRouter";
import { createProtectedObjectUrl, getCachedAuthUserDisplayName, listActiveEventRegistry, type AdminEventItem } from "@/lib/auth";
import { persistCampaignUploadSummary } from "@/lib/campaignUploadSummary";
import { useAuth } from "@/hooks/useAuth";
import { usePersona } from "@/hooks/usePersona";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  BellRing,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Clock3,
  Copy,
  Download,
  Eye,
  FileSpreadsheet,
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
  Sparkles,
  UploadCloud,
  X,
} from "lucide-react";
import { toast } from "sonner";

type LeadSheetRow = {
  id: string;
  canonicalEventKey: string;
  canonicalEventName: string;
  leadIdentityKey: string;
  employeeName: string;
  title: string;
  company: string;
  email: string;
  phone: string;
  linkedinUrl: string;
  companyUrl: string;
  category: string;
  workflowStatus: WorkflowStatus;
  workflowStatusLabel: string;
  workflowComment: string;
  workflowCommentUpdatedAt: string;
  workflowCommentUpdatedByUsername: string;
  workflowCommentUpdatedByUserDisplayName: string;
  workflowCommentHistoryCount: number;
  isManualLead: boolean;
  isSuppressed: boolean;
  contactReadOnly: boolean;
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

type LeadFilterState = {
  status: string;
  contact: "all" | "email" | "phone" | "complete" | "missing-contact" | "linkedin" | "website";
  category: string;
};

type LeadCategoryOption = {
  value: string;
  label: string;
  count: number;
};

type PendingStatusChange = {
  item: LeadSheetRow;
  nextStatus: WorkflowStatus;
};

type ContactChoiceLead = {
  name: string;
  email: string;
  phone: string;
  emailHref: string;
  telHref: string;
  whatsappHref: string;
};

type EmailGenerationDialogState = {
  requestId: number;
  lead: LeadSheetRow;
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

type TemplateUploadState = {
  file: File | null;
  validating: boolean;
  validation: LeadTemplateValidationResponse | null;
  error: string;
  submitting: boolean;
  selectedEventId: string;
};

const LinkedInIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M20.5 2h-17A1.5 1.5 0 002 3.5v17A1.5 1.5 0 003.5 22h17a1.5 1.5 0 001.5-1.5v-17A1.5 1.5 0 0020.5 2zM8 19H5v-9h3zM6.5 8.25A1.75 1.75 0 118.3 6.5a1.78 1.78 0 01-1.8 1.75zM19 19h-3v-4.74c0-1.22-.44-2.12-1.54-2.12a1.6 1.6 0 00-1.58 1.14 2.17 2.17 0 00-.1 1.08V19h-3v-9h2.9v1.3a3.11 3.11 0 012.7-1.4c1.95 0 3.52 1.27 3.52 4z" />
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
    <path
      fill="white"
      transform="translate(6, 6) scale(0.5)"
      d="M13.832 16.568a1 1 0 0 0 1.213-.303l.355-.465A2 2 0 0 1 17 15h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2A18 18 0 0 1 2 4a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-.8 1.6l-.468.351a1 1 0 0 0-.292 1.233 14 14 0 0 0 6.392 6.384"
    />
  </svg>
);

const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className={className}>
    <path d="M13.601 2.326A7.85 7.85 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.9 7.9 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.9 7.9 0 0 0 13.6 2.326zM7.994 14.521a6.6 6.6 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.56 6.56 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592m3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.73.73 0 0 0-.529.247c-.182.198-.691.677-.691 1.654s.71 1.916.81 2.049c.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232" />
  </svg>
);

const EmailIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M20.5 2h-17A1.5 1.5 0 002 3.5v17A1.5 1.5 0 003.5 22h17a1.5 1.5 0 001.5-1.5v-17A1.5 1.5 0 0020.5 2z" />
    <g transform="translate(6, 6) scale(0.5)">
      <rect x="2" y="4" width="20" height="16" rx="2" fill="white" />
      <path
        d="m22 7-8.991 5.727a2 2 0 0 1-2.009 0L2 7"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </g>
  </svg>
);

function LeadSheetRowsSkeleton() {
  return (
    <div className="w-full animate-pulse">
      <div className="grid grid-cols-[minmax(0,0.75fr)_minmax(14rem,0.95fr)_10rem] border-b border-zinc-300 py-3">
        <div className="h-4 w-28 bg-zinc-100" />
        <div className="h-4 w-32 bg-zinc-100" />
        <div className="h-4 w-20 bg-zinc-100" />
      </div>

      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className="grid grid-cols-[minmax(0,0.75fr)_minmax(14rem,0.95fr)_10rem] border-b border-zinc-300 py-6"
        >
          <div className="space-y-3 pr-8">
            <div className="h-6 w-56 bg-zinc-100" />
            <div className="h-4 w-72 max-w-full bg-zinc-100" />
            <div className="h-3 w-40 bg-zinc-100" />
          </div>

          <div className="space-y-3 pr-8">
            <div className="flex items-center gap-4">
              <div className="h-3.5 w-3.5 bg-zinc-100" />
              <div className="h-4 w-52 bg-zinc-100" />
            </div>
            <div className="flex items-center gap-4">
              <div className="h-3.5 w-3.5 bg-zinc-100" />
              <div className="h-4 w-36 bg-zinc-100" />
            </div>
            <div className="flex gap-5 pt-3">
              <div className="h-4 w-16 bg-zinc-100" />
              <div className="h-4 w-16 bg-zinc-100" />
              <div className="h-4 w-20 bg-zinc-100" />
            </div>
          </div>

          <div className="space-y-4">
            <div className="h-10 w-full border-b border-zinc-200 bg-zinc-100" />
            <div className="h-10 w-full border-l border-zinc-200 bg-zinc-100" />
            <div className="h-4 w-28 bg-zinc-100" />
          </div>
        </div>
      ))}
    </div>
  );
}

const FIXED_WORKFLOW_STATUSES: WorkflowStatusDefinitionItem[] = [
  {
    id: "workflow-default-new",
    statusKey: "new",
    label: "New",
    isSystemDefault: true,
    sortOrder: 0,
    isActive: true,
  },
  {
    id: "workflow-default-first-call",
    statusKey: "first-call",
    label: "First Call",
    isSystemDefault: true,
    sortOrder: 1,
    isActive: true,
  },
  {
    id: "workflow-default-follow-up",
    statusKey: "follow-up",
    label: "Follow Up",
    isSystemDefault: true,
    sortOrder: 2,
    isActive: true,
  },
  {
    id: "workflow-default-proposal-sent",
    statusKey: "proposal-sent",
    label: "Proposal Sent",
    isSystemDefault: true,
    sortOrder: 3,
    isActive: true,
  },
  {
    id: "workflow-default-deal-closed",
    statusKey: "deal-closed",
    label: "Deal Closed",
    isSystemDefault: true,
    sortOrder: 4,
    isActive: true,
  },
  {
    id: "workflow-default-deal-dead",
    statusKey: "deal-dead",
    label: "Deal Dead",
    isSystemDefault: true,
    sortOrder: 5,
    isActive: true,
  },
];

const DELEGATE_WORKFLOW_STATUSES: WorkflowStatusDefinitionItem[] = [
  {
    id: "workflow-delegate-new",
    statusKey: "new",
    label: "New",
    isSystemDefault: true,
    sortOrder: 0,
    isActive: true,
  },
  {
    id: "workflow-delegate-first-call",
    statusKey: "first-call",
    label: "First Call",
    isSystemDefault: true,
    sortOrder: 1,
    isActive: true,
  },
  {
    id: "workflow-delegate-follow-up",
    statusKey: "follow-up",
    label: "Followup",
    isSystemDefault: true,
    sortOrder: 2,
    isActive: true,
  },
  {
    id: "workflow-delegate-pending",
    statusKey: "pending",
    label: "Pending",
    isSystemDefault: true,
    sortOrder: 3,
    isActive: true,
  },
  {
    id: "workflow-delegate-confirmed",
    statusKey: "confirmed",
    label: "Confirmed",
    isSystemDefault: true,
    sortOrder: 4,
    isActive: true,
  },
];

const STATUS_DOT_CLASS: Record<string, string> = {
  new: "bg-[#0aefff] shadow-[0_0_0_3px_rgba(10,239,255,0.20)]",
  "first-call": "bg-[#147df5] shadow-[0_0_0_3px_rgba(20,125,245,0.20)]",
  "follow-up": "bg-[#ff8700] shadow-[0_0_0_3px_rgba(255,135,0,0.20)]",
  "proposal-sent": "bg-[#a855f7] shadow-[0_0_0_3px_rgba(168,85,247,0.20)]",
  "deal-closed": "bg-[#22c55e] shadow-[0_0_0_3px_rgba(34,197,94,0.25)]",
  "deal-dead": "bg-[#ff0000] shadow-[0_0_0_3px_rgba(255,0,0,0.16)]",
  pending: "bg-[#a855f7] shadow-[0_0_0_3px_rgba(168,85,247,0.20)]",
  confirmed: "bg-[#22c55e] shadow-[0_0_0_3px_rgba(34,197,94,0.25)]",
};
const DEFAULT_PAGE_SIZE = 100;
const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;
const SEARCH_DEBOUNCE_MS = 300;
const DEAL_CLOSED_VIDEO_SRC = "/videos/magnific_recreate-the-scene-with-t_2982250313.mp4";

const EMPTY_ADD_LEAD_FORM: AddLeadFormState = {
  fullName: "",
  title: "",
  companyName: "",
  companyUrl: "",
  email: "",
  phone: "",
  linkedinUrl: "",
};

const EMPTY_FILTERS: LeadFilterState = {
  status: "all",
  contact: "all",
  category: "all",
};
const EMPTY_TEMPLATE_UPLOAD: TemplateUploadState = {
  file: null,
  validating: false,
  validation: null,
  error: "",
  submitting: false,
  selectedEventId: "",
};
const LEAD_TEMPLATE_ACCEPT = ".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const LEAD_TEMPLATE_HEADERS = "Company | Full Name | Job Title | Telephone Number | Mobile | Email | comments";
const UNCATEGORIZED_CATEGORY_LABEL = "Competing Events";

function getErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message.trim() : "";
  if (!message) return "Something went wrong.";
  if (/timeout of \d+ms exceeded/i.test(message) || /ECONNABORTED/i.test(message)) {
    return "The draft is taking longer than usual. Please try again in a moment.";
  }
  if (message.startsWith("{")) {
    try {
      return normalizeApiErrorDetail(JSON.parse(message));
    } catch {
      return message;
    }
  }
  return message;
}

function normalizeApiErrorDetail(value: unknown): string {
  if (typeof value === "string") return value.trim() || "Something went wrong.";
  if (!value || typeof value !== "object") return "Something went wrong.";

  const record = value as Record<string, unknown>;
  const detail = record.detail;
  if (typeof detail === "string") return detail.trim() || "Something went wrong.";
  if (detail && typeof detail === "object") {
    const detailRecord = detail as Record<string, unknown>;
    if (detailRecord.generationMode || detailRecord.missingInputs || detailRecord.qualityNotes) {
      return "The draft was not ready on this attempt. Please try again and the system will prepare a simpler version.";
    }
    return asText(detailRecord.message) || "Something went wrong.";
  }

  return asText(record.message) || "Something went wrong.";
}

function asText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeLeadCategory(value: unknown) {
  const label = asText(value);
  if (!label || label.toLowerCase() === "other") return UNCATEGORIZED_CATEGORY_LABEL;
  return label;
}

function getDisplayEventName(name?: string | null) {
  const cleanName = asText(name);
  const [shortName] = cleanName.split(/\s(?:-|\u2013|\u2014)\s/);
  return shortName?.trim() || cleanName;
}

const EVENT_SELECT_CONTENT_CLASS =
  "z-[120] max-h-[18rem] w-[22rem] max-w-[calc(100vw-2rem)] rounded-2xl border border-zinc-200 bg-white/98 p-2 shadow-[0_24px_70px_-46px_rgba(15,23,42,0.78)] backdrop-blur-[10px]";

const EVENT_SELECT_ITEM_CLASS =
  "rounded-xl py-2.5 pl-3 pr-9 text-sm font-medium text-zinc-800 transition-colors focus:bg-zinc-100/80 focus:text-zinc-950 focus:shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_8px_20px_-20px_rgba(15,23,42,0.45)] focus:[&_svg]:!text-zinc-500 data-[highlighted]:bg-zinc-100/80 data-[highlighted]:text-zinc-950 data-[highlighted]:shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_8px_20px_-20px_rgba(15,23,42,0.45)] data-[highlighted]:[&_svg]:!text-zinc-500 data-[state=checked]:border data-[state=checked]:border-blue-500/20 data-[state=checked]:bg-blue-600 data-[state=checked]:text-white data-[state=checked]:shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_10px_22px_-16px_rgba(37,99,235,0.8)] data-[state=checked]:[&_svg]:!text-white [&_[data-slot=select-item-indicator]]:right-3 [&_[data-slot=select-item-indicator]_svg]:h-4 [&_[data-slot=select-item-indicator]_svg]:w-4 [&_[data-slot=select-item-indicator]_svg]:stroke-[2.25]";

const UPLOAD_EVENT_SELECT_CONTENT_CLASS =
  "z-[120] max-h-[18rem] w-[var(--radix-select-trigger-width)] max-w-[calc(100vw-5rem)] rounded-2xl border border-zinc-200 bg-white/98 p-0 shadow-[0_24px_70px_-46px_rgba(15,23,42,0.78)] backdrop-blur-[10px]";

const UPLOAD_EVENT_SELECT_ITEM_CLASS =
  "w-full rounded-xl py-2.5 pl-3 pr-9 text-sm font-medium text-zinc-800 transition-colors focus:bg-zinc-100/80 focus:text-zinc-950 focus:shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_8px_20px_-20px_rgba(15,23,42,0.45)] focus:[&_svg]:!text-zinc-500 data-[highlighted]:bg-zinc-100/80 data-[highlighted]:text-zinc-950 data-[highlighted]:shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_8px_20px_-20px_rgba(15,23,42,0.45)] data-[highlighted]:[&_svg]:!text-zinc-500 data-[state=checked]:border data-[state=checked]:border-blue-500/20 data-[state=checked]:bg-blue-600 data-[state=checked]:text-white data-[state=checked]:shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_10px_22px_-16px_rgba(37,99,235,0.8)] data-[state=checked]:[&_svg]:!text-white [&_[data-slot=select-item-indicator]]:right-3 [&_[data-slot=select-item-indicator]_svg]:h-3.5 [&_[data-slot=select-item-indicator]_svg]:w-3.5 [&_[data-slot=select-item-indicator]_svg]:stroke-[2.25]";

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

function formatBytes(value?: number | null) {
  const bytes = Number(value || 0);
  if (!Number.isFinite(bytes) || bytes <= 0) return "-";
  const units = [
    { label: "MB", value: 1024 * 1024 },
    { label: "KB", value: 1024 },
  ];
  for (const unit of units) {
    if (bytes >= unit.value) {
      const precision = bytes >= unit.value * 10 ? 0 : 1;
      return (bytes / unit.value).toFixed(precision) + " " + unit.label;
    }
  }
  return bytes + " B";
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

function getUserDisplayName(user: ReturnType<typeof useAuth>["user"]) {
  return [user?.fullName, getCachedAuthUserDisplayName(user), user?.username]
    .map((value) => value?.trim())
    .find(Boolean) || "";
}

function sortWorkflowStatuses(items: WorkflowStatusDefinitionItem[]) {
  return [...items]
    .filter((item) => item.isActive !== false && asText(item.statusKey))
    .sort((a, b) => {
      if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
      if (a.isSystemDefault !== b.isSystemDefault) return a.isSystemDefault ? -1 : 1;
      return a.label.localeCompare(b.label);
    });
}

function mergeWorkflowStatuses(items: WorkflowStatusDefinitionItem[]) {
  const byKey = new Map<string, WorkflowStatusDefinitionItem>();
  for (const item of items) {
    const key = asText(item.statusKey);
    if (!key) continue;
    byKey.set(key, item);
  }
  return sortWorkflowStatuses(Array.from(byKey.values()));
}

function buildFixedWorkflowStatuses(
  items: WorkflowStatusDefinitionItem[],
  fixedStatuses: WorkflowStatusDefinitionItem[]
) {
  const merged = mergeWorkflowStatuses([...items, ...fixedStatuses]);
  const byKey = new Map<string, WorkflowStatusDefinitionItem>();
  for (const item of merged) {
    byKey.set(item.statusKey, item);
  }
  return fixedStatuses.map((item) => byKey.get(item.statusKey) ?? item);
}

function getStatusDotClass(status: string) {
  return STATUS_DOT_CLASS[status] ?? "bg-zinc-400";
}

function mapLeadItem(item: EventLeadListItem, labelLookup: Map<string, string>): LeadSheetRow | null {
  const canonicalEventKey = asText(item.canonicalEventKey);
  const leadIdentityKey = asText(item.leadIdentityKey);
  if (!canonicalEventKey || !leadIdentityKey) return null;

  const workflowStatus = asText(item.workflowStatus) || "new";
  const workflowStatusLabel =
    asText(item.workflowStatusLabel) ||
    labelLookup.get(workflowStatus) ||
    humanizeStatusLabel(workflowStatus);

  return {
    id: item.id,
    canonicalEventKey,
    canonicalEventName: asText(item.canonicalEventName) || asText(item.eventName) || "Unknown Event",
    leadIdentityKey,
    employeeName: asText(item.employeeName),
    title: asText(item.title),
    company: asText(item.company),
    email: asText(item.email),
    phone: asText(item.phone),
    linkedinUrl: asText(item.linkedinUrl),
    companyUrl: asText(item.companyUrl),
    category: normalizeLeadCategory(item.category),
    workflowStatus,
    workflowStatusLabel,
    workflowComment: asText(item.workflowComment),
    workflowCommentUpdatedAt: asText(item.workflowCommentUpdatedAt),
    workflowCommentUpdatedByUsername: asText(item.workflowCommentUpdatedByUsername),
    workflowCommentUpdatedByUserDisplayName: asText(item.workflowCommentUpdatedByUserDisplayName),
    workflowCommentHistoryCount: Number(item.workflowCommentHistoryCount || 0),
    isManualLead: Boolean(item.isManualLead),
    isSuppressed: Boolean(item.isSuppressed),
    contactReadOnly: Boolean(item.contactReadOnly || item.isSuppressed),
  };
}

function updateSearchParam(pathname: string, searchParams: URLSearchParams, key: string, value: string) {
  const next = new URLSearchParams(searchParams.toString());
  if (value) next.set(key, value);
  else next.delete(key);
  const query = next.toString();
  return query ? `${pathname}?${query}` : pathname;
}

function LeadSheetDialog({
  open,
  title,
  description,
  onClose,
  children,
  sidebarContent,
  eyebrow = "Lead Sheet Updates",
  compact = false,
  compactSize = "default",
}: {
  open: boolean;
  title: string;
  description: string;
  onClose: () => void;
  children: ReactNode;
  sidebarContent?: ReactNode;
  eyebrow?: string;
  compact?: boolean;
  compactSize?: "default" | "wide";
}) {
  if (!open) return null;

  if (compact) {
    return (
      <div className="fixed inset-0 z-[80] flex items-center justify-center p-6">
        <button
          type="button"
          aria-label="Close dialog"
          className="absolute inset-0 bg-zinc-950/30 backdrop-blur-[3px]"
          onClick={onClose}
        />

        <div
          className={cn(
            "relative z-[1] flex max-h-[calc(100dvh-3rem)] w-full flex-col overflow-hidden rounded-2xl border border-zinc-300 bg-white shadow-[0_32px_80px_-48px_rgba(2,10,27,0.65)]",
            compactSize === "wide" ? "max-w-5xl" : "max-w-2xl"
          )}
        >
          <Button
            type="button"
            variant="ghost"
            className="absolute right-5 top-5 z-20 h-10 w-10 rounded-full border border-zinc-300 bg-white p-0 text-zinc-500 shadow-none hover:border-zinc-900 hover:bg-white hover:text-zinc-950"
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
          <div
            className={cn(
              "min-h-0 flex-1 px-8",
              compactSize === "wide" ? "overflow-hidden pb-8" : "overflow-y-auto pb-8 scrollbar-modern"
            )}
          >
            {children}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-6">
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0 bg-zinc-950/30 backdrop-blur-[3px]"
        onClick={onClose}
      />

      <div className="relative z-[1] h-[min(42rem,calc(100dvh-3rem))] w-full max-w-3xl overflow-hidden border border-zinc-300 bg-white shadow-[0_32px_80px_-48px_rgba(2,10,27,0.65)]">
        <div className="relative grid h-full min-h-0 md:grid-cols-[17rem_minmax(0,1fr)]">
          <aside className="relative flex flex-col justify-end overflow-hidden border-b border-zinc-300 bg-zinc-50/70 p-8 md:border-b-0 md:border-r">
            <div className={cn("relative z-10 mt-auto", sidebarContent && "text-zinc-50")}>
              <p className={cn("text-sm font-medium", sidebarContent ? "text-zinc-300" : "text-zinc-400")}>
                {eyebrow}
              </p>
              <h2 className="mt-8 text-4xl font-light leading-none tracking-tighter">
                {title}
              </h2>
              <p className={cn("mt-5 text-sm font-light leading-relaxed", sidebarContent ? "text-zinc-200" : "text-zinc-500")}>
                {description}
              </p>
            </div>

            {sidebarContent && <div className="absolute inset-0 z-0">{sidebarContent}</div>}

            <Button
              type="button"
              variant="ghost"
              className="absolute right-5 top-5 z-20 h-10 w-10 rounded-full border border-zinc-300 bg-white p-0 text-zinc-500 shadow-none hover:border-zinc-900 hover:bg-white hover:text-zinc-950"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </aside>

          <div className="min-h-0 overflow-y-auto p-8 scrollbar-modern">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

export function NormalUserEventLeadSheet() {
  const { persona } = usePersona();
  const { role, user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const eventParam = searchParams.get("event") || "";
  const targetLeadId = searchParams.get("lead") || "";
  const initialSearch = searchParams.get("search") || "";
  const uploadParam = searchParams.get("upload") || "";

  const [events, setEvents] = useState<EventSummaryItem[]>([]);
  const [registryEvents, setRegistryEvents] = useState<AdminEventItem[]>([]);
  const [leadPage, setLeadPage] = useState<EventLeadListResponse | null>(null);
  const [workflowStatuses, setWorkflowStatuses] = useState<WorkflowStatusDefinitionItem[]>(
    FIXED_WORKFLOW_STATUSES
  );
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [loadingLeads, setLoadingLeads] = useState(false);
  const [searchInput, setSearchInput] = useState(initialSearch);
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [pageOffset, setPageOffset] = useState(0);
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);
  const [updatingKeys, setUpdatingKeys] = useState<Record<string, boolean>>({});
  const [addLeadOpen, setAddLeadOpen] = useState(false);
  const [addLeadForm, setAddLeadForm] = useState<AddLeadFormState>(EMPTY_ADD_LEAD_FORM);
  const [addingLead, setAddingLead] = useState(false);
  const [copiedLeadId, setCopiedLeadId] = useState<string | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState<LeadFilterState>(EMPTY_FILTERS);
  const [categorySearch, setCategorySearch] = useState("");
  const [templateUploadOpen, setTemplateUploadOpen] = useState(false);
  const [templateUpload, setTemplateUpload] = useState<TemplateUploadState>(EMPTY_TEMPLATE_UPLOAD);
  const [pendingStatusChange, setPendingStatusChange] = useState<PendingStatusChange | null>(null);
  const [statusComment, setStatusComment] = useState("");
  const [ringBellConfirmOpen, setRingBellConfirmOpen] = useState(false);
  const [ringingDealBell, setRingingDealBell] = useState(false);
  const [contactChoiceLead, setContactChoiceLead] = useState<ContactChoiceLead | null>(null);
  const [historyLead, setHistoryLead] = useState<LeadSheetRow | null>(null);
  const [historyItems, setHistoryItems] = useState<WorkflowStatusHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [emailDialog, setEmailDialog] = useState<EmailGenerationDialogState | null>(null);
  const [agendaState, setAgendaState] = useState<{
    loading: boolean;
    agendas: EventAgendaItem[];
    error: string;
    downloadingId: string;
    viewingId: string;
  }>({ loading: false, agendas: [], error: "", downloadingId: "", viewingId: "" });
  const targetLeadRowRef = useRef<HTMLDivElement | null>(null);
  const emailGenerationRequestRef = useRef(0);
  const previousSelectedEventKeyRef = useRef("");

  const resetFilters = useCallback(() => {
    setFilters(EMPTY_FILTERS);
    setCategorySearch("");
  }, []);

  const workflowStatusLabelLookup = useMemo(() => {
    const lookup = new Map<string, string>();
    for (const item of workflowStatuses) {
      lookup.set(item.statusKey, item.label);
    }
    return lookup;
  }, [workflowStatuses]);

  const fixedWorkflowStatuses = useMemo(
    () => persona === "delegates" || persona === "production" ? DELEGATE_WORKFLOW_STATUSES : FIXED_WORKFLOW_STATUSES,
    [persona]
  );

  const statusOptions = useMemo(() => {
    return workflowStatuses.length > 0 ? workflowStatuses : fixedWorkflowStatuses;
  }, [fixedWorkflowStatuses, workflowStatuses]);
  const canUseDealBellFlow = role === "sales_user";
  const canUseTemplateUpload = role === "sales_user" || role === "delegate_user" || role === "production_user";
  const isDealClosedStatusChange = Boolean(
    pendingStatusChange && canUseDealBellFlow && pendingStatusChange.nextStatus === "deal-closed"
  );

  const loadInitialData = useCallback(async () => {
    setLoadingEvents(true);
    try {
      const [eventsResponse, initialStatusResponse] = await Promise.all([
        listEvents(),
        listWorkflowStatuses(),
      ]);
      const registryRows = await listActiveEventRegistry();
      let finalStatuses = Array.isArray(initialStatusResponse.statuses)
        ? initialStatusResponse.statuses
        : [];
      const missingFixedStatuses = fixedWorkflowStatuses.filter(
        (item) => !finalStatuses.some((status) => status.statusKey === item.statusKey)
      );

      if (missingFixedStatuses.length > 0) {
        await Promise.all(
          missingFixedStatuses.map(async (item) => {
            try {
              await createWorkflowStatus(item.label);
            } catch {
              return null;
            }
            return null;
          })
        );

        const refreshedStatusResponse = await listWorkflowStatuses();
        finalStatuses = Array.isArray(refreshedStatusResponse.statuses)
          ? refreshedStatusResponse.statuses
          : [];
      }

      setEvents(eventsResponse.events || []);
      setRegistryEvents(registryRows);
      setWorkflowStatuses(buildFixedWorkflowStatuses(finalStatuses, fixedWorkflowStatuses));
    } catch (error: unknown) {
      toast.error("Failed to load lead sheet", {
        description: getErrorMessage(error),
      });
      setEvents([]);
      setRegistryEvents([]);
      setLeadPage(null);
      setWorkflowStatuses(fixedWorkflowStatuses);
    } finally {
      setLoadingEvents(false);
    }
  }, [fixedWorkflowStatuses]);

  useEffect(() => {
    void loadInitialData();
  }, [loadInitialData]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setPageOffset(0);
      setSearchQuery(searchInput.trim());
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(handle);
  }, [searchInput]);

  useEffect(() => {
    setPageOffset(0);
  }, [filters.status, filters.contact, filters.category]);

  useEffect(() => {
    const nextSearch = searchParams.get("search") || "";
    if (!nextSearch || nextSearch === searchInput) return;
    setSearchInput(nextSearch);
    setSearchQuery(nextSearch);
    setPageOffset(0);
  }, [searchInput, searchParams]);

  const eventSummaryKeySet = useMemo(() => {
    return new Set(events.map((item) => asText(item.canonicalEventKey)).filter(Boolean));
  }, [events]);

  const activeRegistryEvents = useMemo(
    () => registryEvents.filter((event) => event.isActive),
    [registryEvents]
  );
  const hasActiveRegistryEvents = activeRegistryEvents.length > 0;

  const selectedEventKey = useMemo(() => {
    if (eventParam && eventSummaryKeySet.has(eventParam)) {
      return eventParam;
    }
    return events[0]?.canonicalEventKey || "";
  }, [eventParam, eventSummaryKeySet, events]);

  useEffect(() => {
    if (!events.length || !selectedEventKey || eventParam === selectedEventKey) return;
    router.replace(
      updateSearchParam(pathname, new URLSearchParams(searchParams.toString()), "event", selectedEventKey)
    );
  }, [eventParam, events.length, pathname, router, searchParams, selectedEventKey]);

  useEffect(() => {
    if (!selectedEventKey) {
      previousSelectedEventKeyRef.current = "";
      return;
    }

    if (!previousSelectedEventKeyRef.current) {
      previousSelectedEventKeyRef.current = selectedEventKey;
      return;
    }

    if (previousSelectedEventKeyRef.current !== selectedEventKey) {
      previousSelectedEventKeyRef.current = selectedEventKey;
      resetFilters();
      setSearchInput("");
      setSearchQuery("");
      setPageOffset(0);
      const nextParams = new URLSearchParams(searchParams.toString());
      if (nextParams.has("search")) {
        nextParams.delete("search");
        const nextQuery = nextParams.toString();
        router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname);
      }
    }
  }, [pathname, resetFilters, router, searchParams, selectedEventKey]);

  useEffect(() => {
    if (uploadParam !== "1" || !canUseTemplateUpload) return;
    const selectedRegistryEvent =
      activeRegistryEvents.find((event) => event.eventKey === selectedEventKey) ?? activeRegistryEvents[0] ?? null;
    setTemplateUploadOpen(true);
    setTemplateUpload((prev) => ({
      ...prev,
      selectedEventId: prev.selectedEventId || selectedRegistryEvent?.id || "",
    }));
  }, [activeRegistryEvents, canUseTemplateUpload, selectedEventKey, uploadParam]);

  const loadEventPage = useCallback(async (canonicalEventKey: string, nextOffset: number, query: string) => {
    setLoadingLeads(true);
    try {
      const response = await listEventLeads(canonicalEventKey, {
        limit: pageSize,
        offset: nextOffset,
        search: query || undefined,
        workflowStatus: filters.status === "all" ? undefined : filters.status,
        category: filters.category === "all" ? undefined : filters.category,
        includeManual: true,
        sort: "createdAt:desc",
      });
      setLeadPage(response);
      setEvents((prev) =>
        prev.map((item) =>
          item.canonicalEventKey === response.event.canonicalEventKey
            ? { ...item, ...response.event }
            : item
        )
      );
    } catch (error: unknown) {
      toast.error("Failed to load lead sheet", {
        description: getErrorMessage(error),
      });
      setLeadPage((prev) => (prev?.event.canonicalEventKey === canonicalEventKey ? prev : null));
    } finally {
      setLoadingLeads(false);
    }
  }, [filters.category, filters.status, pageSize]);

  useEffect(() => {
    if (!selectedEventKey) {
      setLeadPage(null);
      return;
    }
    setLeadPage((prev) => (prev?.event.canonicalEventKey === selectedEventKey ? prev : null));
    void loadEventPage(selectedEventKey, pageOffset, searchQuery);
  }, [loadEventPage, pageOffset, searchQuery, selectedEventKey]);

  const selectedEvent = useMemo(
    () =>
      leadPage?.event?.canonicalEventKey === selectedEventKey
        ? leadPage.event
        : events.find((item) => item.canonicalEventKey === selectedEventKey) ?? null,
    [events, leadPage, selectedEventKey]
  );

  const selectedTemplateUploadEvent = useMemo(
    () =>
      registryEvents.find((item) => item.id === templateUpload.selectedEventId) ?? null,
    [registryEvents, templateUpload.selectedEventId]
  );
  const templateUploadEventId =
    selectedTemplateUploadEvent?.id || templateUpload.selectedEventId;

  const templateUploadEventOptions = useMemo(() => {
    if (!templateUploadEventId) return activeRegistryEvents;
    const selectedUploadEvent = activeRegistryEvents.find((event) => event.id === templateUploadEventId);
    if (!selectedUploadEvent) return activeRegistryEvents;
    return [
      selectedUploadEvent,
      ...activeRegistryEvents.filter((event) => event.id !== templateUploadEventId),
    ];
  }, [activeRegistryEvents, templateUploadEventId]);

  const selectedAgendaEventId = asText(selectedEvent?.eventRegistryId);
  const selectedAgendaEventKey = asText(selectedEvent?.canonicalEventKey || selectedEventKey);

  const loadSelectedEventAgendas = useCallback(async () => {
    if (!selectedAgendaEventId && !selectedAgendaEventKey) {
      setAgendaState((current) => ({ ...current, loading: false, agendas: [], error: "" }));
      return;
    }

    setAgendaState((current) => ({ ...current, loading: true, error: "" }));
    try {
      const response = await listEventAgendas({
        eventId: selectedAgendaEventId || undefined,
        eventKey: selectedAgendaEventId ? undefined : selectedAgendaEventKey,
      });
      setAgendaState((current) => ({
        ...current,
        loading: false,
        agendas: Array.isArray(response.agendas) ? response.agendas : [],
        error: "",
      }));
    } catch (error: unknown) {
      setAgendaState((current) => ({
        ...current,
        loading: false,
        agendas: [],
        error: getErrorMessage(error),
      }));
    }
  }, [selectedAgendaEventId, selectedAgendaEventKey]);

  useEffect(() => {
    void loadSelectedEventAgendas();
  }, [loadSelectedEventAgendas]);

  const eventLeads = useMemo(() => {
    return (leadPage?.items || [])
      .map((item) => mapLeadItem(item, workflowStatusLabelLookup))
      .filter((item): item is LeadSheetRow => Boolean(item));
  }, [leadPage, workflowStatusLabelLookup]);

  const categoryOptions = useMemo<LeadCategoryOption[]>(() => {
    const byKey = new Map<string, LeadCategoryOption>();
    const counts = Array.isArray(selectedEvent?.categoryCounts) ? selectedEvent.categoryCounts : [];

    for (const item of counts) {
      const label = normalizeLeadCategory(item.category);
      const key = label.toLowerCase();
      const count = Number(item.count || 0);
      const existing = byKey.get(key);
      if (existing) existing.count += count;
      else byKey.set(key, { value: label, label, count });
    }

    if (byKey.size === 0) {
      for (const lead of eventLeads) {
        const label = normalizeLeadCategory(lead.category);
        const key = label.toLowerCase();
        const existing = byKey.get(key);
        if (existing) existing.count += 1;
        else byKey.set(key, { value: label, label, count: 1 });
      }
    }

    if (filters.category !== "all") {
      const label = normalizeLeadCategory(filters.category);
      const key = label.toLowerCase();
      if (!byKey.has(key)) byKey.set(key, { value: label, label, count: 0 });
    }

    return Array.from(byKey.values()).sort((a, b) => {
      if (a.label === UNCATEGORIZED_CATEGORY_LABEL) return 1;
      if (b.label === UNCATEGORIZED_CATEGORY_LABEL) return -1;
      return a.label.localeCompare(b.label);
    });
  }, [eventLeads, filters.category, selectedEvent]);

  const filteredCategoryOptions = useMemo(() => {
    const query = categorySearch.trim().toLowerCase();
    if (!query) return categoryOptions;
    return categoryOptions.filter((option) => option.label.toLowerCase().includes(query));
  }, [categoryOptions, categorySearch]);

  const allCategoryCount = useMemo(
    () => categoryOptions.reduce((total, option) => total + option.count, 0),
    [categoryOptions]
  );

  const visibleEventLeads = useMemo(() => {
    return eventLeads.filter((item) => {
      if (filters.contact === "email" && !item.email) return false;
      if (filters.contact === "phone" && !item.phone) return false;
      if (filters.contact === "complete" && (!item.email || !item.phone)) return false;
      if (filters.contact === "missing-contact" && (item.email || item.phone)) return false;
      if (filters.contact === "linkedin" && !item.linkedinUrl) return false;
      if (filters.contact === "website" && !item.companyUrl) return false;

      return true;
    });
  }, [eventLeads, filters.contact]);

  const activeFilterCount = useMemo(() => {
    return [
      filters.status !== EMPTY_FILTERS.status,
      filters.contact !== EMPTY_FILTERS.contact,
      filters.category !== EMPTY_FILTERS.category,
    ].filter(Boolean).length;
  }, [filters]);

  useEffect(() => {
    if (!targetLeadId) return;
    const targetOnPage = visibleEventLeads.some((lead) => lead.id === targetLeadId);
    if (!targetOnPage) return;

    const timer = window.setTimeout(() => {
      targetLeadRowRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 120);

    return () => window.clearTimeout(timer);
  }, [visibleEventLeads, targetLeadId]);

  const pageRangeStart = visibleEventLeads.length > 0 ? pageOffset + 1 : 0;
  const pageRangeEnd = pageOffset + visibleEventLeads.length;
  const pageTotal = leadPage?.total ?? 0;
  const hasMore = Boolean(leadPage?.hasMore);
  const isLoading = loadingEvents || (loadingLeads && !leadPage && Boolean(selectedEventKey));
  const latestAgenda = agendaState.agendas[0] ?? null;

  const refreshData = useCallback(async () => {
    await loadInitialData();
    if (selectedEventKey) {
      await loadEventPage(selectedEventKey, pageOffset, searchQuery);
      await loadSelectedEventAgendas();
    }
  }, [loadEventPage, loadInitialData, loadSelectedEventAgendas, pageOffset, searchQuery, selectedEventKey]);

  const clearUploadRouteFlag = useCallback(() => {
    if (uploadParam !== "1") return;
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete("upload");
    const nextQuery = nextParams.toString();
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname);
  }, [pathname, router, searchParams, uploadParam]);

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
    clearUploadRouteFlag();
  };

  const handleTemplateDownload = async () => {
    try {
      await downloadLeadTemplateFile();
      toast.success("Template download started");
    } catch (error: unknown) {
      toast.error("Template download failed", { description: getErrorMessage(error) });
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
      const validation = await validateLeadTemplateUpload(file);
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
        error: getErrorMessage(error),
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
      const response = await createCampaignFromUpload({
        name: uploadEvent.eventName,
        eventRegistryId,
        icp: `Template upload for ${uploadEvent.eventName}`,
        leadSheet: templateUpload.file,
      });
      const createdCampaigns = response.createdCampaigns?.length ? response.createdCampaigns : [response];
      createdCampaigns.forEach((campaign) => {
        persistCampaignUploadSummary(campaign.id, campaign.importSummary ?? response.importSummary);
      });
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

      const nextParams = new URLSearchParams(searchParams.toString());
      nextParams.set("event", response.canonicalEventKey || uploadEvent.eventKey);
      nextParams.delete("upload");
      nextParams.delete("search");
      const nextQuery = nextParams.toString();
      router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname);
      resetFilters();
      setSearchInput("");
      setSearchQuery("");
      setPageOffset(0);
      await refreshData();
    } catch (error: unknown) {
      setTemplateUpload((prev) => ({
        ...prev,
        submitting: false,
        error: getErrorMessage(error),
      }));
      toast.error("Upload failed", { description: getErrorMessage(error) });
    }
  };

  const handleEventChange = (value: string) => {
    resetFilters();
    setSearchInput("");
    setSearchQuery("");
    setPageOffset(0);
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set("event", value);
    nextParams.delete("search");
    const nextQuery = nextParams.toString();
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname);
  };

  const handlePageSizeChange = (value: number) => {
    setPageOffset(0);
    setPageSize(value);
  };

  const handleAgendaDownload = async (agenda: EventAgendaItem) => {
    if (!agenda.id) return;
    setAgendaState((current) => ({ ...current, downloadingId: agenda.id }));
    try {
      await downloadEventAgendaFile(agenda.id, agenda.name || "agenda.pdf");
      toast.success("Agenda download started");
    } catch (error: unknown) {
      toast.error("Failed to download agenda", { description: getErrorMessage(error) });
    } finally {
      setAgendaState((current) => ({ ...current, downloadingId: "" }));
    }
  };

  const handleAgendaView = async (agenda: EventAgendaItem) => {
    if (!agenda.id) return;
    setAgendaState((current) => ({ ...current, viewingId: agenda.id }));
    try {
      const objectUrl = await createProtectedObjectUrl(
        "/api/event-agendas/" + encodeURIComponent(agenda.id) + "/download",
        "/api/event-agendas/" + encodeURIComponent(agenda.id) + "/download-url"
      );
      window.open(objectUrl.url, "_blank", "noopener,noreferrer");
      if (!objectUrl.direct) {
        window.setTimeout(() => objectUrl.revoke(), 60_000);
      }
    } catch (error: unknown) {
      toast.error("Failed to open agenda", { description: getErrorMessage(error) });
    } finally {
      setAgendaState((current) => ({ ...current, viewingId: "" }));
    }
  };

  const handleWorkflowStatusChange = useCallback(
    async (item: LeadSheetRow, nextStatus: WorkflowStatus, comment?: string) => {
      const updateKey = `${item.canonicalEventKey}::${item.leadIdentityKey}`;

      setUpdatingKeys((prev) => ({ ...prev, [updateKey]: true }));
      try {
        const response = await updateLeadWorkflowStatus(item.id, nextStatus, comment);

        const nextLabel =
          asText(response.workflowStatusLabel) ||
          workflowStatusLabelLookup.get(response.workflowStatus) ||
          humanizeStatusLabel(response.workflowStatus);

        setLeadPage((prev) =>
          prev
            ? {
                ...prev,
                items: prev.items.map((lead) => {
                  if (
                    asText(lead.canonicalEventKey) === response.canonicalEventKey &&
                    asText(lead.leadIdentityKey) === response.leadIdentityKey
                  ) {
                    return {
                      ...lead,
                      workflowStatus: response.workflowStatus,
                      workflowStatusLabel: nextLabel,
                      workflowComment: response.workflowComment,
                      workflowCommentUpdatedAt: response.workflowCommentUpdatedAt,
                      workflowCommentUpdatedByUserId: response.workflowCommentUpdatedByUserId,
                      workflowCommentUpdatedByUsername: response.workflowCommentUpdatedByUsername,
                      workflowCommentUpdatedByUserDisplayName: response.workflowCommentUpdatedByUserDisplayName,
                      workflowCommentHistoryCount: response.workflowCommentHistoryCount,
                    };
                  }
                  return lead;
                }),
              }
            : prev
        );
        return true;
      } catch (error: unknown) {
        toast.error("Failed to update status", {
          description: getErrorMessage(error),
        });
        return false;
      } finally {
        setUpdatingKeys((prev) => {
          const next = { ...prev };
          delete next[updateKey];
          return next;
        });
      }
    },
    [workflowStatusLabelLookup]
  );

  const handleStatusSelection = (item: LeadSheetRow, value: string) => {
    if (value === item.workflowStatus) return;
    setPendingStatusChange({ item, nextStatus: value });
    setStatusComment("");
  };

  const closeStatusCommentDialog = () => {
    if (!pendingStatusChange) return;
    const updateKey = `${pendingStatusChange.item.canonicalEventKey}::${pendingStatusChange.item.leadIdentityKey}`;
    if (updatingKeys[updateKey] || ringingDealBell) return;
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
    const comment = statusComment.trim();
    const shouldRingBell = Boolean(options.ringBell);

    if (shouldRingBell) setRingingDealBell(true);

    try {
      const updated = await handleWorkflowStatusChange(
        pendingStatusChange.item,
        pendingStatusChange.nextStatus,
        comment || undefined
      );
      if (!updated) return;

      if (shouldRingBell) {
        try {
          await ringDealBell();
        } catch (error) {
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
    if (canUseDealBellFlow && pendingStatusChange.nextStatus === "deal-closed") {
      setRingBellConfirmOpen(true);
      return;
    }
    void submitStatusComment();
  };

  const openHistory = async (item: LeadSheetRow) => {
    setHistoryLead(item);
    setHistoryItems([]);
    setHistoryError(null);
    setHistoryLoading(true);
    try {
      const response = await getLeadWorkflowStatusHistory(item.id);
      setHistoryItems(Array.isArray(response.history) ? response.history : []);
    } catch (error: unknown) {
      const message = getErrorMessage(error);
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

  const copyLeadDetails = async (item: LeadSheetRow) => {
    const copiedAt = new Date().toLocaleString();
    const lines = [
      `Name: ${item.employeeName || "-"}`,
      `Title: ${item.title || "-"}`,
      `Company: ${item.company || "-"}`,
      `Status: ${item.workflowStatusLabel || humanizeStatusLabel(item.workflowStatus)}`,
      "",
      `Email: ${item.email || "-"}`,
      `Phone: ${item.phone || "-"}`,
      `LinkedIn: ${item.linkedinUrl || "-"}`,
      `Website: ${item.companyUrl || "-"}`,
      "",
      `Event: ${item.canonicalEventName || selectedEvent?.canonicalEventName || "-"}`,
      "",
      `Generated by supernizo on ${copiedAt}. Confidential intended solely for authorized Cogent Solutions Event Management LLC internal use.`,
    ];

    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setCopiedLeadId(item.id);
      window.setTimeout(() => setCopiedLeadId((current) => (current === item.id ? null : current)), 1600);
      toast.success("Lead copied");
    } catch (error: unknown) {
      toast.error("Failed to copy lead", {
        description: getErrorMessage(error),
      });
    }
  };

  const closeEmailDialog = () => {
    setEmailDialog(null);
  };

  const openEmailGenerator = (item: LeadSheetRow) => {
    if (item.contactReadOnly) {
      toast.error("Lead is read-only");
      return;
    }

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
    item: LeadSheetRow,
    platform: LeadContentPlatform,
    options: { feedback?: string } = {}
  ) => {
    if (item.contactReadOnly) {
      toast.error("Lead is read-only");
      return;
    }

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
      const response: LeadContentGenerationResponse = await generateLeadContent(
        item.id,
        {
          platform,
          ...(feedback.trim() ? { feedback: feedback.trim() } : {}),
        }
      );
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
      const message = getErrorMessage(error);
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
      await navigator.clipboard.writeText(text);
      setEmailDialog((current) => (current ? { ...current, copiedAction: mode } : current));
      window.setTimeout(() => {
        setEmailDialog((current) =>
          current?.copiedAction === mode ? { ...current, copiedAction: null } : current
        );
      }, 1500);
      toast.success(emailDialog.platform === "whatsapp" ? "WhatsApp content copied" : mode === "full" ? "Email copied" : "Content copied");
    } catch (error: unknown) {
      toast.error("Failed to copy", { description: getErrorMessage(error) });
    }
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
      const created = await addEventLead(selectedEvent.canonicalEventKey, payload);
      closeAddLeadDialog(true);
      toast.success("Lead added", {
        description: `${created.employeeName} is now part of ${created.canonicalEventName}.`,
      });
      await loadEventPage(selectedEvent.canonicalEventKey, pageOffset, searchQuery);
    } catch (error: unknown) {
      toast.error("Failed to add lead", {
        description: getErrorMessage(error),
      });
    } finally {
      setAddingLead(false);
    }
  };

  const templateValidation = templateUpload.validation;
  const templateUploadReady = Boolean(
    templateUpload.file && templateValidation && selectedTemplateUploadEvent?.isActive
  );

  return (
    <>
      <div className="flex h-[calc(100dvh-3rem)] min-h-0 flex-col overflow-hidden bg-transparent p-1 font-sans">
        <header className="min-h-[6.25rem] shrink-0 border-b border-zinc-300 pb-11">
          <div className="flex min-w-0 items-center gap-7 whitespace-nowrap overflow-hidden">
            <div className="min-w-0 flex-1">
              <Select value={selectedEventKey} onValueChange={handleEventChange}>
                <SelectTrigger
                  aria-label="Select event"
                  className="group !h-auto w-fit max-w-full justify-start gap-4 whitespace-normal rounded-none border-0 bg-transparent p-0 text-left text-zinc-950 shadow-none transition-colors hover:text-blue-700 focus:ring-0 focus-visible:ring-0 [&>svg]:mt-1 [&>svg]:h-7 [&>svg]:w-7 [&>svg]:opacity-40 [&>svg]:transition-colors [&>svg]:group-hover:opacity-70"
                >
                  <span className="line-clamp-2 min-w-0 text-3xl font-light leading-[1.12] tracking-[-0.025em] sm:text-4xl 2xl:text-5xl">
                    {getDisplayEventName(selectedEvent?.canonicalEventName) || "Intelligence Registry"}
                  </span>
                </SelectTrigger>
                <SelectContent
                  align="start"
                  position="popper"
                  className={EVENT_SELECT_CONTENT_CLASS}
                >
                  {events.map((item) => (
                    <SelectItem
                      key={item.canonicalEventKey}
                      value={item.canonicalEventKey}
                      className={EVENT_SELECT_ITEM_CLASS}
                    >
                      {getDisplayEventName(item.canonicalEventName)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="ml-auto flex min-w-max flex-nowrap items-center justify-end gap-8">
              <div
                className="inline-flex h-12 shrink-0 items-center gap-1.5 rounded-full border border-zinc-200 bg-white p-1.5"
                aria-label="Lead sheet actions"
              >
                {canUseTemplateUpload ? (
                  <button
                    type="button"
                    onClick={openTemplateUploadDialog}
                    disabled={!hasActiveRegistryEvents}
                    className="inline-flex h-9 w-40 items-center justify-center gap-2.5 rounded-full text-sm font-semibold text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-950 disabled:opacity-50"
                  >
                    <FileUp className="h-4 w-4" />
                    Upload leads
                  </button>
                ) : null}

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
          <aside className="shrink-0 space-y-10 overflow-y-auto pr-2 scrollbar-hide">
            <div className="space-y-6">
              <div>
                <label className="text-xs font-medium text-zinc-400">Event agenda</label>
                <div className="mt-5">
                  {agendaState.loading ? (
                    <div className="animate-pulse space-y-3">
                      <div className="h-4 w-44 bg-zinc-100" />
                      <div className="h-3 w-36 bg-zinc-100" />
                      <div className="h-9 w-40 bg-zinc-100" />
                    </div>
                  ) : agendaState.error ? (
                    <div className="text-sm font-light leading-6 text-zinc-400">
                      No agenda found for this event.
                    </div>
                  ) : latestAgenda ? (
                    <div className="space-y-3">
                      <div className="min-w-0">
                        <div className="flex min-w-0 items-start">
                          <p className="min-w-0 text-base font-medium leading-5 text-zinc-950">
                            {latestAgenda.name}
                          </p>
                        </div>
                        <div className="mt-2 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs font-medium text-zinc-400">
                          <span>{formatBytes(latestAgenda.sizeBytes)}</span>
                          <span className="h-1 w-1 rounded-full bg-zinc-300" />
                          <span className="min-w-0 truncate">{formatDateTime(latestAgenda.createdAt) || "Time unavailable"}</span>
                        </div>
                      </div>
                      <div className="flex flex-nowrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => void handleAgendaView(latestAgenda)}
                          disabled={agendaState.viewingId === latestAgenda.id}
                          className="inline-flex h-9 min-w-24 items-center justify-center gap-2 rounded-full border border-blue-500/20 bg-blue-600 px-4 text-xs font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_10px_22px_-14px_rgba(37,99,235,0.95)] transition-colors hover:bg-blue-700 disabled:opacity-60"
                        >
                          {agendaState.viewingId === latestAgenda.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Eye className="h-3.5 w-3.5" />
                          )}
                          View
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleAgendaDownload(latestAgenda)}
                          disabled={agendaState.downloadingId === latestAgenda.id}
                          className="inline-flex h-9 min-w-36 items-center justify-center gap-2 rounded-full border border-zinc-300 bg-white px-4 text-xs font-medium text-zinc-700 transition-colors hover:border-zinc-900 hover:text-zinc-950 disabled:opacity-60"
                        >
                          {agendaState.downloadingId === latestAgenda.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Download className="h-3.5 w-3.5" />
                          )}
                          Download latest
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm font-light leading-6 text-zinc-400">
                      No agenda has been uploaded for this event yet.
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-8">
                <label className="mb-4 block text-xs font-medium text-zinc-400">Search intelligence</label>
                <div className="relative h-11 w-full rounded-full border border-zinc-300 bg-white px-4 shadow-[0_22px_60px_-52px_rgba(2,10,27,0.42)] transition-colors focus-within:border-zinc-400">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                  <input
                    value={searchInput}
                    onChange={(event) => setSearchInput(event.target.value)}
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
                  className="flex h-11 w-full items-center justify-between rounded-full border border-zinc-300 bg-white px-4 text-left shadow-[0_18px_46px_-42px_rgba(2,10,27,0.42)] transition-colors hover:border-zinc-400"
                >
                  <span className="inline-flex items-center gap-4 text-sm font-light text-zinc-500">
                    <SlidersHorizontal className="h-4 w-4" />
                    Advanced filters
                  </span>
                  <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-zinc-100 px-1.5 text-xs font-medium tabular-nums text-zinc-500">
                    {activeFilterCount}
                  </span>
                </button>
                {activeFilterCount > 0 ? (
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="border-b border-transparent pb-1 text-xs font-medium text-zinc-400 transition-colors hover:border-zinc-900 hover:text-zinc-950"
                  >
                    Clear filter model
                  </button>
                ) : null}
              </div>

              {selectedEvent && (
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
                      <Select value={String(pageSize)} onValueChange={(value) => handlePageSizeChange(Number(value))}>
                        <SelectTrigger className="h-9 w-16 justify-end gap-1 rounded-none border-0 border-b border-zinc-300 bg-transparent px-0 text-xl font-light tabular-nums tracking-tight text-zinc-950 shadow-none transition-colors focus:border-blue-600 focus:ring-0 [&>svg]:ml-0">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent align="end" className="rounded-none border-zinc-300 shadow-xl">
                          {PAGE_SIZE_OPTIONS.map((option) => (
                            <SelectItem key={option} value={String(option)} className="py-2.5 text-sm">
                              {option}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </aside>

          <main className="flex min-h-0 flex-col overflow-hidden xl:border-l xl:border-zinc-300 xl:pl-16">
            <div className="min-h-0 flex-1 overflow-auto pr-4 scrollbar-modern">
              {isLoading ? (
                <LeadSheetRowsSkeleton />
              ) : visibleEventLeads.length === 0 ? (
                <div className="flex h-40 items-center justify-center border-y border-zinc-100 text-zinc-400 font-light">
                  {searchQuery || activeFilterCount > 0 ? "No matching records found." : "Workspace is currently empty."}
                </div>
              ) : (
                <div className="w-full">
                  <div className="grid grid-cols-[minmax(0,0.75fr)_minmax(14rem,0.95fr)_10rem] border-b border-zinc-300 py-3 text-sm font-light text-zinc-500">
                    <div>Identity details</div>
                    <div>Contact channels</div>
                    <div>Status</div>
                  </div>

                  <div>
                    {visibleEventLeads.map((item) => {
                      const updateKey = `${item.canonicalEventKey}::${item.leadIdentityKey}`;
                      const isTargetLead = targetLeadId === item.id;
                      const isUpdating = Boolean(updatingKeys[updateKey]);
                      const selectedStatusValue = statusOptions.some((option) => option.statusKey === item.workflowStatus)
                        ? item.workflowStatus
                        : undefined;
                      const historyCount = item.workflowCommentHistoryCount || 0;
                      const emailHref = item.email ? buildEmailHref(item.email) : "";
                      const telHref = item.phone ? buildTelHref(item.phone) : "";
                      const whatsappHref = item.phone ? buildWhatsAppHref(item.phone) : "";
                      const openContactChoice = () =>
                        setContactChoiceLead({
                          name: item.employeeName,
                          email: item.email,
                          phone: item.phone,
                          emailHref,
                          telHref,
                          whatsappHref,
                        });

                      return (
                        <div
                          key={updateKey}
                          ref={isTargetLead ? targetLeadRowRef : undefined}
                          id={`lead-${item.id}`}
                          className={`group grid grid-cols-[minmax(0,0.75fr)_minmax(14rem,0.95fr)_10rem] border-b border-zinc-300 py-6 transition-all duration-300 ${
                            isTargetLead ? "bg-blue-50/35" : "hover:bg-zinc-50/60"
                          }`}
                        >
                          <div className="pr-8">
                            <div className="flex flex-col gap-1.5">
                              <div className="flex items-center gap-5">
                                <span className="text-xl font-light tracking-tight text-zinc-950">{item.employeeName || "-"}</span>
                                {item.isManualLead && (
                                  <span className="rounded-full border border-zinc-300 bg-white px-2 py-0.5 text-xs font-medium text-zinc-500">Manual</span>
                                )}
                              </div>
                              <span className="max-w-sm text-base font-light leading-relaxed text-zinc-700">{item.title || "-"}</span>
                              <span className="text-xs font-medium text-zinc-400">{item.company || "-"}</span>
                            </div>
                          </div>

                          <div className="pr-8">
                            <div className="flex flex-col gap-2">
                              <div className="flex items-center gap-4">
                                {item.email ? (
                                  <button
                                    type="button"
                                    onClick={openContactChoice}
                                    className="inline-flex min-w-0 items-center gap-4 text-left"
                                    title="Choose contact method"
                                  >
                                    <EmailIcon className="h-3.5 w-3.5 text-[#EF4444]" />
                                    <span className="truncate text-sm font-light tracking-tight text-zinc-700 transition-colors hover:text-zinc-950">
                                      {item.email}
                                    </span>
                                  </button>
                                ) : (
                                  <span className="text-sm font-light tracking-tight text-zinc-700">-</span>
                                )}
                              </div>
                              <div className="flex items-center gap-4">
                                {item.phone ? (
                                  <button
                                    type="button"
                                    onClick={openContactChoice}
                                    className="inline-flex min-w-0 items-center gap-4 text-left"
                                    title="Choose contact method"
                                  >
                                    <PhoneIcon className="h-3.5 w-3.5 text-[#22C55E]" />
                                    <span className="truncate text-sm font-light text-zinc-500 transition-colors hover:text-zinc-950">
                                      {item.phone}
                                    </span>
                                  </button>
                                ) : (
                                  <span className="text-sm font-light text-zinc-500">-</span>
                                )}
                              </div>
                              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-3">
                                {item.linkedinUrl && (
                                  <a href={item.linkedinUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 border-b border-transparent pb-0.5 text-zinc-400 transition-colors hover:border-zinc-900 hover:text-zinc-950">
                                    <LinkedInIcon className="h-3.5 w-3.5 text-[#0A66C2]" />
                                    <span className="text-xs font-medium">LinkedIn</span>
                                  </a>
                                )}
                                {item.companyUrl && (
                                  <a href={item.companyUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 border-b border-transparent pb-0.5 text-zinc-400 transition-colors hover:border-zinc-900 hover:text-zinc-950">
                                    <WebsiteIcon className="h-3.5 w-3.5 text-zinc-950" />
                                    <span className="text-xs font-medium">Website</span>
                                  </a>
                                )}
                                <button
                                  type="button"
                                  className="inline-flex items-center gap-1.5 border-b border-transparent pb-0.5 text-zinc-400 transition-colors hover:border-zinc-900 hover:text-zinc-950"
                                  onClick={() => void copyLeadDetails(item)}
                                >
                                  <Copy className="h-3.5 w-3.5" />
                                  <span className="text-xs font-medium">
                                    {copiedLeadId === item.id ? "Copied" : "Copy lead"}
                                  </span>
                                </button>
                                <button
                                  type="button"
                                  className="inline-flex items-center gap-1.5 border-b border-transparent pb-0.5 text-zinc-400 transition-colors hover:border-blue-600 hover:text-zinc-950 disabled:pointer-events-none disabled:opacity-40"
                                  onClick={() => void openEmailGenerator(item)}
                                  disabled={item.contactReadOnly || (emailDialog?.loading && emailDialog.lead.id === item.id)}
                                  title={item.contactReadOnly ? "Lead is read-only" : "Generate outreach content"}
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
                            <div className="flex items-center gap-4">
                              <div className="relative w-full">
                                <Select
                                  value={selectedStatusValue}
                                  onValueChange={(value) => handleStatusSelection(item, value)}
                                    disabled={isUpdating}
                                  >
                                    <SelectTrigger className="h-10 w-full rounded-none border-0 border-b border-zinc-300 bg-transparent px-0 text-base font-light shadow-none transition-colors focus:border-blue-600 focus:ring-0">
                                      <SelectValue placeholder={item.workflowStatusLabel} />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-none border-zinc-300 shadow-2xl">
                                      {statusOptions.map((option) => (
                                        <SelectItem key={option.statusKey} value={option.statusKey} className="text-xs py-2.5">
                                          <span className="flex items-center gap-3">
                                            <span className={`ml-1 h-2.5 w-2.5 shrink-0 rounded-full ${getStatusDotClass(option.statusKey)}`} />
                                            {option.label}
                                          </span>
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                </Select>
                              </div>
                              {isUpdating && <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />}
                            </div>
                            <div className="mt-auto pt-3">
                              {item.workflowComment ? (
                                <button
                                  type="button"
                                  onClick={() => void openHistory(item)}
                                  className="mb-2 block w-full border-l border-zinc-300 pl-3 text-left transition-colors hover:border-zinc-900"
                                >
                                  <span className="line-clamp-2 text-xs font-light leading-relaxed text-zinc-500">
                                    {item.workflowComment}
                                  </span>
                                  {item.workflowCommentUpdatedAt ? (
                                    <span className="mt-1 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-zinc-400">
                                      <Clock3 className="h-3 w-3" />
                                      {formatDateTime(item.workflowCommentUpdatedAt)}
                                    </span>
                                  ) : null}
                                </button>
                              ) : null}
                              <button
                                type="button"
                                onClick={() => void openHistory(item)}
                                className="inline-flex items-center gap-1.5 border-b border-transparent pb-0.5 text-xs font-medium text-zinc-400 transition-colors hover:border-zinc-900 hover:text-zinc-950"
                              >
                                <History className="h-3.5 w-3.5" />
                                {historyCount > 0 ? `${historyCount} comment${historyCount === 1 ? "" : "s"}` : "Comment history"}
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <footer className="mt-6 flex shrink-0 flex-col gap-5 border-t border-zinc-100 pb-4 pt-8 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-zinc-400">Lead sheet range</p>
                <p className="text-lg font-light tabular-nums tracking-tight text-zinc-950">
                  {pageRangeStart}—{pageRangeEnd}
                  <span className="ml-2 text-sm text-zinc-400">of {pageTotal.toLocaleString()} records</span>
                </p>
              </div>

              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  aria-label="Previous page"
                  className="h-11 w-11 rounded-full border border-zinc-300 bg-white p-0 text-zinc-500 shadow-none transition-all hover:border-zinc-900 hover:bg-white hover:text-zinc-950 disabled:opacity-30"
                  onClick={() => setPageOffset((prev) => Math.max(0, prev - pageSize))}
                  disabled={pageOffset === 0 || loadingLeads}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  aria-label="Next page"
                  className="h-11 w-11 rounded-full border border-zinc-950 bg-transparent p-0 text-zinc-950 shadow-none transition-all hover:border-blue-600 hover:bg-blue-600 hover:text-white disabled:border-zinc-300 disabled:text-zinc-300 disabled:opacity-100"
                  onClick={() => setPageOffset((prev) => prev + pageSize)}
                  disabled={!hasMore || loadingLeads}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </footer>
          </main>
        </div>
      </div>

      {pendingStatusChange ? (
        <LeadSheetDialog
          open
          eyebrow=""
          title="Status Note"
          description=""
          onClose={closeStatusCommentDialog}
          compact
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
              <div className="rounded-2xl border border-zinc-200 bg-white p-2 shadow-[0_18px_38px_-34px_rgba(15,23,42,0.6)]">
                <div className="grid gap-2 sm:grid-cols-[20rem_minmax(0,1fr)] sm:items-stretch">
                  <div className="relative mx-auto h-[min(34rem,calc(100dvh-17rem))] w-full max-w-[20rem] overflow-hidden rounded-xl bg-zinc-950 sm:mx-0 sm:max-w-none">
                    <video
                      src={DEAL_CLOSED_VIDEO_SRC}
                      autoPlay
                      loop
                      muted
                      playsInline
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/30 via-transparent to-transparent" />
                  </div>
                  <div className="flex min-w-0 flex-col gap-4 p-3 sm:p-4">
                    <div className="grid gap-3">
                      <div className="flex min-h-14 items-center rounded-xl bg-zinc-50/80 px-4 py-3">
                        <p className="truncate text-base font-light text-zinc-950">
                          {pendingStatusChange.item.workflowStatusLabel}
                        </p>
                      </div>
                      <div className="hidden items-center justify-center text-zinc-300 sm:flex">
                        <ChevronRight className="h-4 w-4 rotate-90" />
                      </div>
                      <div className="flex min-h-14 items-center rounded-xl border border-emerald-500/20 bg-[#22c55e] px-4 py-3 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_10px_22px_-14px_rgba(34,197,94,0.85)]">
                        <p className="truncate text-base font-semibold">
                          {statusOptions.find((option) => option.statusKey === pendingStatusChange.nextStatus)?.label ||
                            humanizeStatusLabel(pendingStatusChange.nextStatus)}
                        </p>
                      </div>
                    </div>
                    <label className="flex min-h-0 flex-1 flex-col gap-3">
                      <span className="text-xs font-medium text-zinc-400">Comment optional</span>
                      <Textarea
                        value={statusComment}
                        onChange={(event) => setStatusComment(event.target.value.slice(0, 2000))}
                        placeholder="Example: Follow up after first call. Asked to reconnect next week."
                        className="min-h-32 flex-1 resize-none rounded-2xl border-zinc-200 bg-white px-4 py-3 text-sm font-light leading-6 shadow-none focus-visible:border-emerald-500 focus-visible:ring-1 focus-visible:ring-emerald-500"
                      />
                      <span className="block text-right text-xs font-light text-zinc-400">
                        {statusComment.length}/2000
                      </span>
                    </label>
                    <div className="mt-auto flex flex-col gap-3 border-t border-zinc-100 pt-4 sm:flex-row sm:items-center sm:justify-end">
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
                        disabled={Boolean(updatingKeys[`${pendingStatusChange.item.canonicalEventKey}::${pendingStatusChange.item.leadIdentityKey}`]) || ringingDealBell}
                        className="h-11 gap-2 rounded-full border border-emerald-500/20 bg-[#22c55e] px-5 text-sm font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_10px_22px_-14px_rgba(34,197,94,0.85)] hover:bg-emerald-600"
                      >
                        {updatingKeys[`${pendingStatusChange.item.canonicalEventKey}::${pendingStatusChange.item.leadIdentityKey}`] || ringingDealBell ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <MessageSquare className="h-4 w-4" />
                        )}
                        Update Status
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-zinc-200 bg-white p-1.5">
                <div className="grid gap-1.5 sm:grid-cols-[minmax(0,1fr)_2.5rem_minmax(0,1fr)] sm:items-stretch">
                  <div className="rounded-xl bg-zinc-50/80 px-4 py-3">
                    <p className="truncate text-base font-light text-zinc-950">
                      {pendingStatusChange.item.workflowStatusLabel}
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
            )}

            {!isDealClosedStatusChange ? (
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
            ) : null}

            {!isDealClosedStatusChange ? (
              <div className="flex flex-col gap-3 border-t border-zinc-100 pt-6 sm:flex-row sm:items-center sm:justify-end">
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
                  disabled={Boolean(updatingKeys[`${pendingStatusChange.item.canonicalEventKey}::${pendingStatusChange.item.leadIdentityKey}`]) || ringingDealBell}
                  className="h-11 gap-2 rounded-full border border-blue-500/20 bg-blue-600 px-5 text-sm font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_10px_22px_-14px_rgba(37,99,235,0.95)] hover:bg-blue-700"
                >
                  {updatingKeys[`${pendingStatusChange.item.canonicalEventKey}::${pendingStatusChange.item.leadIdentityKey}`] || ringingDealBell ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <MessageSquare className="h-4 w-4" />
                  )}
                  Update Status
                </Button>
              </div>
            ) : null}
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
          compact
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
                  className="h-11 gap-2 rounded-full border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-600 shadow-none hover:border-zinc-900 hover:bg-white hover:text-zinc-950"
                >
                  <Sparkles className="h-4 w-4" />
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

          <div className="relative z-[1] flex max-h-[calc(100dvh-3rem)] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-zinc-300 bg-white shadow-[0_32px_90px_-54px_rgba(2,10,27,0.82)]">
            <Button
              type="button"
              variant="ghost"
              disabled={ringingDealBell}
              className="absolute right-5 top-5 z-20 h-10 w-10 rounded-full border border-zinc-300 bg-white p-0 text-zinc-500 shadow-none hover:border-zinc-900 hover:bg-white hover:text-zinc-950"
              onClick={() => setRingBellConfirmOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>

            <div className="shrink-0 px-8 pb-4 pt-8">
              <div className="max-w-xl pr-12">
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
            </div>

            <div className="min-h-0 flex-1 overflow-hidden px-8 pb-8">
              <div className="grid rounded-2xl border border-zinc-200 bg-white p-2 shadow-[0_18px_38px_-34px_rgba(15,23,42,0.6)] sm:grid-cols-[18rem_minmax(0,1fr)]">
                <div className="relative mx-auto h-[min(30rem,calc(100dvh-15rem))] w-full max-w-[18rem] overflow-hidden rounded-xl bg-zinc-950 sm:mx-0 sm:max-w-none">
                  <video
                    src={DEAL_CLOSED_VIDEO_SRC}
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/30 via-transparent to-transparent" />
                </div>

                <div className="flex min-w-0 flex-col justify-between gap-6 p-4">
                  <div>
                    <div className="rounded-xl bg-zinc-50/80 px-4 py-3">
                      <p className="truncate text-base font-light text-zinc-950">
                        {pendingStatusChange.item.workflowStatusLabel}
                      </p>
                    </div>
                    <div className="flex justify-center py-3 text-zinc-300">
                      <ChevronRight className="h-4 w-4 rotate-90" />
                    </div>
                    <div className="rounded-xl border border-emerald-500/20 bg-[#22c55e] px-4 py-3 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_10px_22px_-14px_rgba(34,197,94,0.85)]">
                      <p className="truncate text-base font-semibold">
                        {statusOptions.find((option) => option.statusKey === pendingStatusChange.nextStatus)?.label ||
                          humanizeStatusLabel(pendingStatusChange.nextStatus)}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 border-t border-zinc-100 pt-4 sm:flex-row sm:items-center sm:justify-end">
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
          compact
        >
          <div className="space-y-6">
            <div className="border-b border-zinc-100 pb-5">
              <h3 className="text-2xl font-light tracking-tight text-zinc-950">
                {contactChoiceLead.name || "This lead"}
              </h3>
              <div className="mt-3 space-y-1.5 text-sm font-light text-zinc-500">
                {contactChoiceLead.email ? (
                  <p className="truncate">{contactChoiceLead.email}</p>
                ) : null}
                {contactChoiceLead.phone ? (
                  <p className="tabular-nums">{contactChoiceLead.phone}</p>
                ) : null}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <Button
                type="button"
                disabled={!contactChoiceLead.emailHref}
                onClick={() => {
                  window.location.href = contactChoiceLead.emailHref;
                  setContactChoiceLead(null);
                }}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-red-500/20 bg-[#EF4444] px-5 text-sm font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_10px_22px_-14px_rgba(239,68,68,0.95)] hover:bg-red-600 disabled:border-red-400/20 disabled:bg-red-500/55 disabled:text-white/80 disabled:opacity-100 disabled:shadow-none"
              >
                <Mail className="h-3.5 w-3.5 stroke-[2.4]" />
                Email
              </Button>
              <Button
                type="button"
                variant="ghost"
                disabled={!contactChoiceLead.telHref}
                onClick={() => {
                  window.location.href = contactChoiceLead.telHref;
                  setContactChoiceLead(null);
                }}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-zinc-300 bg-white px-5 text-sm font-semibold text-zinc-950 shadow-none transition-colors hover:border-blue-600 hover:bg-white hover:text-blue-600 disabled:opacity-50"
              >
                <Headset className="h-3.5 w-3.5" />
                Linkus
              </Button>
              <Button
                type="button"
                variant="ghost"
                disabled={!contactChoiceLead.whatsappHref}
                onClick={() => {
                  window.open(contactChoiceLead.whatsappHref, "_blank", "noopener,noreferrer");
                  setContactChoiceLead(null);
                }}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-[#22c55e]/30 bg-[#22c55e] px-5 text-sm font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_10px_22px_-16px_rgba(34,197,94,0.85)] transition-colors hover:bg-[#16a34a] hover:text-white disabled:opacity-50"
              >
                <WhatsAppIcon className="h-3.5 w-3.5" />
                WhatsApp
              </Button>
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
          compact
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

      {filterOpen ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-6">
          <button
            type="button"
            aria-label="Close filters"
            className="absolute inset-0 bg-zinc-950/30 backdrop-blur-[3px]"
            onClick={() => setFilterOpen(false)}
          />

          <div className="relative z-[1] w-full max-w-xl overflow-hidden rounded-2xl border border-zinc-300 bg-white shadow-[0_32px_80px_-48px_rgba(2,10,27,0.65)]">
            <div className="relative p-8 pb-28">
              <Button
                type="button"
                variant="ghost"
                className="absolute right-5 top-5 h-10 w-10 rounded-full border border-zinc-300 bg-white p-0 text-zinc-500 shadow-none hover:border-zinc-900 hover:bg-white hover:text-zinc-950"
                onClick={() => setFilterOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>

              <div className="space-y-10">
                <div>
                  <label className="mb-3 block text-xs font-medium text-zinc-400">Status model</label>
                  <Select
                    value={filters.status}
                    onValueChange={(value) => setFilters((prev) => ({ ...prev, status: value }))}
                  >
                    <SelectTrigger className="!h-12 w-full rounded-none border-0 border-b border-zinc-300 bg-transparent px-0 text-lg font-light shadow-none transition-colors focus:border-blue-600 focus:ring-0">
                      <SelectValue placeholder="All statuses" />
                    </SelectTrigger>
                    <SelectContent position="popper" className="z-[120] rounded-none border-zinc-300 bg-white shadow-2xl">
                      <SelectItem value="all">
                        <span className="flex items-center gap-3">
                          <span className="ml-1 h-2.5 w-2.5 shrink-0 rounded-full bg-zinc-300" />
                          All statuses
                        </span>
                      </SelectItem>
                      {statusOptions.map((option) => (
                        <SelectItem key={option.statusKey} value={option.statusKey}>
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
                  <label className="block text-sm font-semibold text-zinc-950">By contact intelligence:</label>
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
                        onClick={() =>
                          setFilters((prev) => ({
                            ...prev,
                            contact: option.value as LeadFilterState["contact"],
                          }))
                        }
                        className={`inline-flex h-10 items-center rounded-full border px-4 text-sm font-semibold transition-all ${
                          filters.contact === option.value
                            ? "border-blue-600 bg-white text-blue-600 shadow-[0_8px_18px_-16px_rgba(37,99,235,0.85)]"
                            : "border-zinc-300 bg-white text-zinc-950 shadow-[0_7px_18px_-18px_rgba(2,10,27,0.5)] hover:border-blue-500 hover:text-blue-600"
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="block text-sm font-semibold text-zinc-950">By campaign category:</label>
                  <div className="rounded-2xl border border-zinc-200 bg-white p-3">
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                      <Input
                        value={categorySearch}
                        onChange={(event) => setCategorySearch(event.target.value)}
                        placeholder="Search categories..."
                        className="h-10 rounded-full border-zinc-300 bg-white pl-9 text-sm shadow-none focus-visible:ring-blue-600"
                      />
                    </div>

                    <div className="mt-3 pr-1">
                      <div className="flex flex-wrap gap-2.5">
                        <button
                          type="button"
                          onClick={() => setFilters((prev) => ({ ...prev, category: "all" }))}
                          className={`inline-flex h-10 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-all ${
                            filters.category === "all"
                              ? "border-blue-600 bg-white text-blue-600 shadow-[0_8px_18px_-16px_rgba(37,99,235,0.85)]"
                              : "border-zinc-300 bg-white text-zinc-950 shadow-[0_7px_18px_-18px_rgba(2,10,27,0.5)] hover:border-blue-500 hover:text-blue-600"
                          }`}
                        >
                          <span>All categories</span>
                          {allCategoryCount > 0 ? (
                            <span className="text-xs font-medium tabular-nums text-zinc-400">
                              {allCategoryCount.toLocaleString()}
                            </span>
                          ) : null}
                        </button>

                        {filteredCategoryOptions.map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            title={option.label}
                            onClick={() => setFilters((prev) => ({ ...prev, category: option.value }))}
                            className={`inline-flex h-10 max-w-full items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-all ${
                              filters.category === option.value
                                ? "border-blue-600 bg-white text-blue-600 shadow-[0_8px_18px_-16px_rgba(37,99,235,0.85)]"
                                : "border-zinc-300 bg-white text-zinc-950 shadow-[0_7px_18px_-18px_rgba(2,10,27,0.5)] hover:border-blue-500 hover:text-blue-600"
                            }`}
                          >
                            <span className="max-w-[13rem] truncate">{option.label}</span>
                            <span className="text-xs font-medium tabular-nums text-zinc-400">
                              {option.count.toLocaleString()}
                            </span>
                          </button>
                        ))}
                      </div>

                      {filteredCategoryOptions.length === 0 ? (
                        <p className="py-3 text-sm font-light text-zinc-400">No matching categories.</p>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>

              <div className="absolute bottom-8 left-8 right-8 flex items-center justify-between border-t border-zinc-100 pt-6">
                <button
                  type="button"
                  className="border-b border-transparent pb-1 text-sm font-medium text-zinc-400 transition-colors hover:border-zinc-900 hover:text-zinc-950"
                  onClick={resetFilters}
                >
                  Reset model
                </button>
                <Button
                  type="button"
                  className="h-11 rounded-full border border-blue-500/20 bg-blue-600 px-7 text-sm font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_10px_22px_-14px_rgba(37,99,235,0.95)] hover:bg-blue-700"
                  onClick={() => setFilterOpen(false)}
                >
                  Apply filters
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <LeadSheetDialog
        open={templateUploadOpen}
        title="Upload Leads"
        description=""
        eyebrow=""
        onClose={closeTemplateUploadDialog}
        compact
      >
        <div className="space-y-7">
          <div>
            <label className="mb-3 block text-xs font-medium text-zinc-400">Related event</label>
            <Select
              value={templateUploadEventId}
              onValueChange={(value) =>
                setTemplateUpload((prev) => ({ ...prev, selectedEventId: value }))
              }
              disabled={loadingEvents || templateUpload.validating || templateUpload.submitting}
            >
              <SelectTrigger
                aria-label="Select upload event"
                className="group !h-12 w-full justify-start gap-3 rounded-none border-0 border-b border-zinc-300 bg-transparent px-0 text-left text-lg font-light text-zinc-950 shadow-none transition-colors hover:border-blue-600 hover:text-blue-700 focus:ring-0 focus-visible:ring-0 [&>svg]:h-5 [&>svg]:w-5 [&>svg]:opacity-40"
              >
                <SelectValue placeholder={loadingEvents ? "Loading events..." : "Select event"} />
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
              "group flex min-h-20 items-center gap-3 rounded-2xl border px-4 py-3 transition-all",
              !selectedTemplateUploadEvent
                ? "border-zinc-200 bg-zinc-50/80"
                : templateUpload.error
                  ? "border-red-300 bg-red-50/40"
                  : "border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50/70"
            )}
          >
            <label
              htmlFor="normal-lead-template-upload"
              className={cn(
                "flex min-w-0 flex-1 items-center gap-4",
                !selectedTemplateUploadEvent || templateUpload.validating || templateUpload.submitting
                  ? "cursor-not-allowed"
                  : "cursor-pointer"
              )}
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-400 transition-colors group-hover:border-zinc-300 group-hover:text-zinc-500">
                {templateUpload.validating ? (
                  <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                ) : templateValidation ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                ) : (
                  <FileSpreadsheet className="h-5 w-5" />
                )}
              </span>
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
                id="normal-lead-template-upload"
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
            <div className="flex gap-3 border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="font-semibold">Template check failed</p>
                <p className="mt-1 font-light leading-6">{templateUpload.error}</p>
                <p className="mt-2 text-xs font-medium text-red-500">Expected headers: {LEAD_TEMPLATE_HEADERS}</p>
              </div>
            </div>
          ) : null}

          {templateValidation ? (
            <div className="space-y-5">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="border border-zinc-200 p-4">
                  <p className="text-xs font-medium text-zinc-400">Sheets</p>
                  <p className="mt-2 text-2xl font-light tabular-nums text-zinc-950">
                    {templateValidation.sheetCount.toLocaleString()}
                  </p>
                </div>
                <div className="border border-zinc-200 p-4">
                  <p className="text-xs font-medium text-zinc-400">Leads ready</p>
                  <p className="mt-2 text-2xl font-light tabular-nums text-zinc-950">
                    {templateValidation.importRows.toLocaleString()}
                  </p>
                </div>
                <div className="border border-zinc-200 p-4">
                  <p className="text-xs font-medium text-zinc-400">Skipped rows</p>
                  <p className="mt-2 text-2xl font-light tabular-nums text-zinc-950">
                    {templateValidation.invalidRows.toLocaleString()}
                  </p>
                </div>
              </div>

              <div>
                <label className="mb-3 block text-xs font-medium text-zinc-400">Detected categories</label>
                <div className="max-h-36 space-y-2 overflow-y-auto pr-1 scrollbar-modern">
                  {templateValidation.categories.map((category) => (
                    <div
                      key={category.name}
                      className="flex items-center justify-between gap-4 border border-zinc-200 px-4 py-3"
                    >
                      <span className="min-w-0 truncate text-sm font-semibold text-zinc-950">
                        {category.name}
                      </span>
                      <span className="shrink-0 text-xs font-medium text-zinc-400">
                        {category.validRows.toLocaleString()} leads
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {templateValidation.invalidReasons.length > 0 ? (
                <div className="border-l border-amber-300 pl-4 text-sm font-light leading-6 text-amber-700">
                  {templateValidation.invalidReasons[0]}
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
        compact
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
    </>
  );
}
