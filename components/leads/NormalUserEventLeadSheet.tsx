"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
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
  createWorkflowStatus,
  getLeadWorkflowStatusHistory,
  listEventLeads,
  listEvents,
  listWorkflowStatuses,
  updateLeadWorkflowStatus,
  type EventLeadCreateRequest,
  type EventLeadListItem,
  type EventLeadListResponse,
  type EventSummaryItem,
  type WorkflowStatus,
  type WorkflowStatusDefinitionItem,
  type WorkflowStatusHistoryItem,
} from "@/lib/apiRouter";
import { getCachedAuthUserDisplayName } from "@/lib/auth";
import { useAuth } from "@/hooks/useAuth";
import { usePersona } from "@/hooks/usePersona";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  BellRing,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Copy,
  Headset,
  History,
  Loader2,
  MessageSquare,
  Plus,
  RefreshCcw,
  Search,
  SlidersHorizontal,
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
  workflowStatus: WorkflowStatus;
  workflowStatusLabel: string;
  workflowComment: string;
  workflowCommentUpdatedAt: string;
  workflowCommentUpdatedByUsername: string;
  workflowCommentUpdatedByUserDisplayName: string;
  workflowCommentHistoryCount: number;
  isManualLead: boolean;
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
  source: "all" | "manual" | "imported";
};

type PendingStatusChange = {
  item: LeadSheetRow;
  nextStatus: WorkflowStatus;
};

type PhoneChoiceLead = {
  name: string;
  phone: string;
  telHref: string;
  whatsappHref: string;
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
const DEAL_CLOSED_ANIMATION_SRC = "https://lottie.host/e872d848-c226-4c29-8108-9111e8bd8c9c/npFGm1Le6t.lottie";

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
  source: "all",
};

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong.";
}

function asText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
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

function buildWhatsAppHref(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 8 ? `https://wa.me/${digits}` : "";
}

function firstName(value: string) {
  return value.trim().split(/\s+/)[0] || "";
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
    workflowStatus,
    workflowStatusLabel,
    workflowComment: asText(item.workflowComment),
    workflowCommentUpdatedAt: asText(item.workflowCommentUpdatedAt),
    workflowCommentUpdatedByUsername: asText(item.workflowCommentUpdatedByUsername),
    workflowCommentUpdatedByUserDisplayName: asText(item.workflowCommentUpdatedByUserDisplayName),
    workflowCommentHistoryCount: Number(item.workflowCommentHistoryCount || 0),
    isManualLead: Boolean(item.isManualLead),
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
}: {
  open: boolean;
  title: string;
  description: string;
  onClose: () => void;
  children: ReactNode;
  sidebarContent?: ReactNode;
}) {
  if (!open) return null;

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
                Lead Sheet Updates
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

  const [events, setEvents] = useState<EventSummaryItem[]>([]);
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
  const [pendingStatusChange, setPendingStatusChange] = useState<PendingStatusChange | null>(null);
  const [statusComment, setStatusComment] = useState("");
  const [ringBellConfirmOpen, setRingBellConfirmOpen] = useState(false);
  const [ringingDealBell, setRingingDealBell] = useState(false);
  const [phoneChoiceLead, setPhoneChoiceLead] = useState<PhoneChoiceLead | null>(null);
  const [historyLead, setHistoryLead] = useState<LeadSheetRow | null>(null);
  const [historyItems, setHistoryItems] = useState<WorkflowStatusHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const targetLeadRowRef = useRef<HTMLDivElement | null>(null);

  const workflowStatusLabelLookup = useMemo(() => {
    const lookup = new Map<string, string>();
    for (const item of workflowStatuses) {
      lookup.set(item.statusKey, item.label);
    }
    return lookup;
  }, [workflowStatuses]);

  const fixedWorkflowStatuses = useMemo(
    () => persona === "delegates" ? DELEGATE_WORKFLOW_STATUSES : FIXED_WORKFLOW_STATUSES,
    [persona]
  );

  const statusOptions = useMemo(() => {
    return workflowStatuses.length > 0 ? workflowStatuses : fixedWorkflowStatuses;
  }, [fixedWorkflowStatuses, workflowStatuses]);
  const canUseDealBellFlow = role === "sales_user";
  const signedInFirstName = firstName(getUserDisplayName(user)) || "there";

  const loadInitialData = useCallback(async () => {
    setLoadingEvents(true);
    try {
      const [eventsResponse, initialStatusResponse] = await Promise.all([
        listEvents(),
        listWorkflowStatuses(),
      ]);
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
      setWorkflowStatuses(buildFixedWorkflowStatuses(finalStatuses, fixedWorkflowStatuses));
    } catch (error: unknown) {
      toast.error("Failed to load lead sheet", {
        description: getErrorMessage(error),
      });
      setEvents([]);
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
  }, [filters.status, filters.contact, filters.source]);

  useEffect(() => {
    const nextSearch = searchParams.get("search") || "";
    if (!nextSearch || nextSearch === searchInput) return;
    setSearchInput(nextSearch);
    setSearchQuery(nextSearch);
    setPageOffset(0);
  }, [searchInput, searchParams]);

  const selectedEventKey = useMemo(() => {
    if (eventParam && events.some((item) => item.canonicalEventKey === eventParam)) {
      return eventParam;
    }
    return events[0]?.canonicalEventKey || "";
  }, [eventParam, events]);

  useEffect(() => {
    if (!events.length || !selectedEventKey || eventParam === selectedEventKey) return;
    router.replace(
      updateSearchParam(pathname, new URLSearchParams(searchParams.toString()), "event", selectedEventKey)
    );
  }, [eventParam, events.length, pathname, router, searchParams, selectedEventKey]);

  const loadEventPage = useCallback(async (canonicalEventKey: string, nextOffset: number, query: string) => {
    setLoadingLeads(true);
    try {
      const response = await listEventLeads(canonicalEventKey, {
        limit: pageSize,
        offset: nextOffset,
        search: query || undefined,
        workflowStatus: filters.status === "all" ? undefined : filters.status,
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
  }, [filters.status, pageSize]);

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

  const eventLeads = useMemo(() => {
    return (leadPage?.items || [])
      .map((item) => mapLeadItem(item, workflowStatusLabelLookup))
      .filter((item): item is LeadSheetRow => Boolean(item));
  }, [leadPage, workflowStatusLabelLookup]);

  const visibleEventLeads = useMemo(() => {
    return eventLeads.filter((item) => {
      if (filters.source === "manual" && !item.isManualLead) return false;
      if (filters.source === "imported" && item.isManualLead) return false;

      if (filters.contact === "email" && !item.email) return false;
      if (filters.contact === "phone" && !item.phone) return false;
      if (filters.contact === "complete" && (!item.email || !item.phone)) return false;
      if (filters.contact === "missing-contact" && (item.email || item.phone)) return false;
      if (filters.contact === "linkedin" && !item.linkedinUrl) return false;
      if (filters.contact === "website" && !item.companyUrl) return false;

      return true;
    });
  }, [eventLeads, filters.contact, filters.source]);

  const activeFilterCount = useMemo(() => {
    return [
      filters.status !== EMPTY_FILTERS.status,
      filters.contact !== EMPTY_FILTERS.contact,
      filters.source !== EMPTY_FILTERS.source,
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

  const refreshData = useCallback(async () => {
    await loadInitialData();
    if (selectedEventKey) {
      await loadEventPage(selectedEventKey, pageOffset, searchQuery);
    }
  }, [loadEventPage, loadInitialData, pageOffset, searchQuery, selectedEventKey]);

  const handleEventChange = (value: string) => {
    setPageOffset(0);
    router.replace(updateSearchParam(pathname, new URLSearchParams(searchParams.toString()), "event", value));
  };

  const handlePageSizeChange = (value: number) => {
    setPageOffset(0);
    setPageSize(value);
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

  return (
    <>
      <div className="flex h-[calc(100dvh-3rem)] min-h-0 flex-col overflow-hidden bg-transparent p-1 font-sans">
        <header className="shrink-0 border-b border-zinc-300 pb-12">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <Link
                href="/campaigns"
                className="inline-flex items-center text-xs font-medium text-zinc-400 transition-colors hover:text-zinc-950"
              >
                <ArrowLeft className="mr-2 h-3 w-3" />
                Return to events
              </Link>

              <div className="mt-8">
                <h1 className="max-w-5xl text-3xl font-light leading-[1.12] tracking-[-0.025em] text-zinc-950 sm:text-4xl 2xl:text-5xl">
                  {selectedEvent?.canonicalEventName || "Intelligence Registry"}
                </h1>
                <p className="mt-4 max-w-2xl text-lg font-light leading-relaxed text-zinc-500">
                  Review, search, and progress event prospects through a clean lead sheet.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-5 lg:min-w-[19rem] lg:items-stretch">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-zinc-400">Total records</p>
                  <p className="text-3xl font-light tabular-nums tracking-tight text-zinc-950">
                    {pageTotal.toLocaleString()}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-zinc-400">Visible now</p>
                  <p className="text-3xl font-light tabular-nums tracking-tight text-zinc-950">
                    {visibleEventLeads.length.toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6 border-t border-zinc-300 pt-4">
                <button
                  type="button"
                  className="inline-flex h-10 w-fit items-center justify-start gap-4 border-b border-transparent text-sm font-medium text-zinc-500 transition-all hover:border-zinc-900 hover:text-zinc-950 active:scale-[0.98] disabled:opacity-50"
                  onClick={() => void refreshData()}
                  disabled={loadingEvents || loadingLeads}
                >
                  {loadingEvents || loadingLeads ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <RefreshCcw className="h-3.5 w-3.5" />
                  )}
                  Refresh
                </button>

                <button
                  type="button"
                  onClick={() => setAddLeadOpen(true)}
                  disabled={!selectedEvent}
                  className="inline-flex h-10 w-fit items-center justify-center gap-4 rounded-full bg-zinc-950 px-5 text-sm font-semibold text-white transition-all hover:bg-blue-600 active:scale-[0.98] disabled:opacity-50"
                >
                  <Plus className="h-4 w-4" />
                  Add entry
                </button>
              </div>
            </div>
          </div>
        </header>

        <div className="mt-12 grid min-h-0 flex-1 gap-12 overflow-hidden xl:grid-cols-[19rem_minmax(0,1fr)]">
          <aside className="shrink-0 space-y-10 overflow-y-auto pr-2 scrollbar-hide">
            <div className="space-y-8">
              <div className="space-y-5">
                <label className="text-xs font-medium text-zinc-400">Context registry</label>
                <Select value={selectedEventKey} onValueChange={handleEventChange}>
                  <SelectTrigger className="!h-14 w-full rounded-none border-0 border-b border-zinc-300 bg-transparent px-0 text-lg font-light shadow-none transition-colors focus:border-blue-600 focus:ring-0">
                    <SelectValue placeholder="Select context" />
                  </SelectTrigger>
                  <SelectContent className="rounded-none border-zinc-300 shadow-xl">
                    {events.map((item) => (
                      <SelectItem key={item.canonicalEventKey} value={item.canonicalEventKey}>
                        {item.canonicalEventName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="mb-6 block text-xs font-medium text-zinc-400">Search intelligence</label>
                <div className="relative w-full rounded-full border border-zinc-300 bg-white px-4 py-2 shadow-[0_22px_60px_-52px_rgba(2,10,27,0.42)] transition-colors focus-within:border-zinc-400">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                  <input
                    value={searchInput}
                    onChange={(event) => setSearchInput(event.target.value)}
                    placeholder="Find in sheet..."
                    className="h-9 w-full border-0 bg-transparent pl-7 pr-1 text-base font-light tracking-tight text-zinc-950 placeholder:text-zinc-400 focus:outline-none"
                  />
                </div>
              </div>

              <div className="border-t border-zinc-100 pt-8">
                <label className="mb-6 block text-xs font-medium text-zinc-400">Intelligent filters</label>
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
                    onClick={() => setFilters(EMPTY_FILTERS)}
                    className="border-b border-transparent pb-1 text-xs font-medium text-zinc-400 transition-colors hover:border-zinc-900 hover:text-zinc-950"
                  >
                    Clear filter model
                  </button>
                ) : null}
              </div>

              {selectedEvent && (
                <div className="space-y-4 border-t border-zinc-100 pt-10">
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
                      const telHref = item.phone ? buildTelHref(item.phone) : "";
                      const whatsappHref = item.phone ? buildWhatsAppHref(item.phone) : "";

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
                                  <>
                                    <EmailIcon className="h-3.5 w-3.5 text-[#EF4444]" />
                                    <a
                                      href={`mailto:${item.email}`}
                                      className="text-sm font-light tracking-tight text-zinc-700 transition-colors hover:text-zinc-950"
                                      title="Open in email app"
                                    >
                                      {item.email}
                                    </a>
                                  </>
                                ) : (
                                  <span className="text-sm font-light tracking-tight text-zinc-700">-</span>
                                )}
                              </div>
                              <div className="flex items-center gap-4">
                                {item.phone ? (
                                  <>
                                    <PhoneIcon className="h-3.5 w-3.5 text-[#22C55E]" />
                                    {telHref || whatsappHref ? (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setPhoneChoiceLead({
                                            name: item.employeeName,
                                            phone: item.phone,
                                            telHref,
                                            whatsappHref,
                                          })
                                        }
                                        className="text-sm font-light text-zinc-500 transition-colors hover:text-zinc-950"
                                        title="Choose call method"
                                      >
                                        {item.phone}
                                      </button>
                                    ) : (
                                      <span className="text-sm font-light text-zinc-500">{item.phone}</span>
                                    )}
                                  </>
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
                              </div>
                            </div>
                          </div>

                          <div>
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
                            <div className="mt-4 space-y-2">
                              {item.workflowComment ? (
                                <button
                                  type="button"
                                  onClick={() => void openHistory(item)}
                                  className="block w-full border-l border-zinc-300 pl-3 text-left transition-colors hover:border-zinc-900"
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
          title="Status Note"
          description="Add a short comment for this state change so the next person can understand the context."
          onClose={closeStatusCommentDialog}
          sidebarContent={
            canUseDealBellFlow && pendingStatusChange.nextStatus === "deal-closed" ? (
              <div className="absolute inset-0">
                <div className="absolute inset-0 z-10 bg-zinc-950/40" />
                <video
                  src="/videos/magnific_recreate-the-scene-with-t_2982250313.mp4"
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="h-full w-full object-cover"
                />
              </div>
            ) : null
          }
        >
          <div className="space-y-8">
            <div className="border-b border-zinc-100 pb-6">
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">Selected profile</p>
              <h3 className="mt-2 text-2xl font-light tracking-tight text-zinc-950">
                {pendingStatusChange.item.employeeName || "-"}
              </h3>
              <p className="mt-1 text-sm font-light text-zinc-500">
                {pendingStatusChange.item.company || "-"}
              </p>
            </div>

            {canUseDealBellFlow && pendingStatusChange.nextStatus === "deal-closed" ? (
              <div className="text-center">
                <DotLottieReact
                  src={DEAL_CLOSED_ANIMATION_SRC}
                  loop
                  autoplay
                  className="mx-auto h-36 w-full max-w-sm"
                />
                <p className="mt-1 text-lg font-medium tracking-tight text-zinc-950">
                  Congrats on closing the deal with {pendingStatusChange.item.employeeName || "this lead"}.
                </p>
                <p className="mt-1 text-sm font-light text-zinc-500">
                  Nice work, {signedInFirstName}. Add a final note so the team has the full context.
                </p>
              </div>
            ) : null}

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="border border-zinc-200 bg-zinc-50/70 p-4">
                <p className="text-xs font-medium text-zinc-400">Current status</p>
                <p className="mt-2 text-lg font-light text-zinc-950">
                  {pendingStatusChange.item.workflowStatusLabel}
                </p>
              </div>
              <div className="border border-zinc-950 bg-white p-4">
                <p className="text-xs font-medium text-zinc-400">New status</p>
                <p className="mt-2 text-lg font-light text-zinc-950">
                  {statusOptions.find((option) => option.statusKey === pendingStatusChange.nextStatus)?.label ||
                    humanizeStatusLabel(pendingStatusChange.nextStatus)}
                </p>
              </div>
            </div>

            <label className="block space-y-3">
              <span className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                Comment <span className="normal-case tracking-normal text-zinc-400">Optional</span>
              </span>
              <Textarea
                value={statusComment}
                onChange={(event) => setStatusComment(event.target.value.slice(0, 2000))}
                placeholder="Example: Follow up after first call. Asked to reconnect next week."
                className="min-h-36 rounded-none border-zinc-300 bg-white text-sm font-light shadow-none focus-visible:ring-1 focus-visible:ring-zinc-900"
              />
              <span className="block text-right text-xs font-light text-zinc-400">
                {statusComment.length}/2000
              </span>
            </label>

            <div className="flex justify-end gap-3 border-t border-zinc-100 pt-6">
              <Button
                type="button"
                variant="ghost"
                onClick={closeStatusCommentDialog}
                className="h-10 rounded-none border border-zinc-300 bg-white px-5 text-zinc-600 shadow-none hover:border-zinc-900 hover:bg-white hover:text-zinc-950"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleUpdateStatusClick}
                disabled={Boolean(updatingKeys[`${pendingStatusChange.item.canonicalEventKey}::${pendingStatusChange.item.leadIdentityKey}`]) || ringingDealBell}
                className="h-10 gap-2 rounded-none bg-zinc-950 px-5 text-white hover:bg-blue-600"
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
        </LeadSheetDialog>
      ) : null}

      {ringBellConfirmOpen && pendingStatusChange ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-6">
          <button
            type="button"
            aria-label="Close bell confirmation"
            className="absolute inset-0 bg-zinc-950/20 backdrop-blur-[2px]"
            onClick={() => {
              if (!ringingDealBell) setRingBellConfirmOpen(false);
            }}
          />

          <div className="relative z-[1] w-full max-w-md overflow-hidden border border-zinc-300 bg-white shadow-[0_32px_90px_-54px_rgba(2,10,27,0.82)]">
            <div className="border-b border-zinc-100 px-7 py-6">
              <h3 className="text-3xl font-light leading-none tracking-[-0.04em] text-zinc-950">
                Ring the deal bell?
              </h3>
              <p className="mt-1.5 max-w-sm text-sm font-light leading-6 text-zinc-500">
                Let the team know you closed the deal with{" "}
                <span className="font-medium text-zinc-700">{pendingStatusChange.item.employeeName || "this lead"}</span>.
              </p>
            </div>

            <div className="flex justify-end gap-3 bg-zinc-50/70 px-7 py-5">
              <Button
                type="button"
                variant="ghost"
                disabled={ringingDealBell}
                onClick={() => setRingBellConfirmOpen(false)}
                className="h-10 rounded-none border border-zinc-300 bg-white px-5 text-zinc-600 shadow-none hover:border-zinc-900 hover:bg-white hover:text-zinc-950"
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={ringingDealBell}
                onClick={() => void submitStatusComment({ ringBell: true })}
                className="h-10 gap-2 rounded-none bg-zinc-950 px-5 text-white hover:bg-blue-600"
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
      ) : null}

      {phoneChoiceLead ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-6">
          <button
            type="button"
            aria-label="Close phone method chooser"
            className="absolute inset-0 bg-zinc-950/20 backdrop-blur-[2px]"
            onClick={() => setPhoneChoiceLead(null)}
          />

          <div className="relative z-[1] w-full max-w-md overflow-hidden border border-zinc-300 bg-white shadow-[0_32px_90px_-54px_rgba(2,10,27,0.82)]">
            <div className="border-b border-zinc-100 px-7 py-6">
              <h3 className="text-3xl font-light leading-none tracking-[-0.04em] text-zinc-950">
                Choose how to reach them
              </h3>
              <p className="mt-2 max-w-sm text-sm font-light leading-6 text-zinc-500">
                Call {phoneChoiceLead.name || "this lead"} through Linkus or WhatsApp.
              </p>
              <p className="mt-4 text-lg font-light tabular-nums text-zinc-950">{phoneChoiceLead.phone}</p>
            </div>

            <div className="grid gap-3 bg-zinc-50/70 px-7 py-5 sm:grid-cols-2">
              <Button
                type="button"
                disabled={!phoneChoiceLead.telHref}
                onClick={() => {
                  window.location.href = phoneChoiceLead.telHref;
                  setPhoneChoiceLead(null);
                }}
                className="h-10 gap-1.5 rounded-none bg-[#0098f0] px-4 text-sm text-white hover:bg-[#0086d4] disabled:opacity-50"
              >
                <Headset className="h-3.5 w-3.5" />
                Linkus
              </Button>
              <Button
                type="button"
                variant="ghost"
                disabled={!phoneChoiceLead.whatsappHref}
                onClick={() => {
                  window.open(phoneChoiceLead.whatsappHref, "_blank", "noopener,noreferrer");
                  setPhoneChoiceLead(null);
                }}
                className="h-10 gap-1.5 rounded-none border border-[#22c55e] bg-[#22c55e] px-4 text-sm text-white shadow-none hover:border-[#16a34a] hover:bg-[#16a34a] hover:text-white disabled:opacity-50"
              >
                <WhatsAppIcon className="h-3.5 w-3.5" />
                WhatsApp
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {historyLead ? (
        <LeadSheetDialog
          open
          title="Comment History"
          description="Review the status timeline and notes saved for this record."
          onClose={closeHistory}
        >
          <div className="space-y-6">
            <div className="border-b border-zinc-100 pb-6">
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">Selected profile</p>
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
                    <span className="text-xs font-medium uppercase tracking-wide text-zinc-400">Timeline</span>
                  </div>
                  <span className="text-xs font-light text-zinc-400">
                    {historyItems.length} update{historyItems.length === 1 ? "" : "s"}
                  </span>
                </div>

                <div>
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

          <div className="relative z-[1] grid w-full max-w-4xl overflow-hidden border border-zinc-300 bg-white shadow-[0_32px_80px_-48px_rgba(2,10,27,0.65)] md:grid-cols-[18rem_minmax(0,1fr)]">
            <aside className="border-b border-zinc-300 bg-white p-8 md:border-b-0 md:border-r">
              <p className="text-sm font-medium text-zinc-400">Lead Sheet Updates</p>
              <h2 className="mt-8 text-4xl font-light leading-none tracking-tighter text-zinc-950">
                Intelligence Filters
              </h2>
              <p className="mt-5 max-w-[13rem] text-sm font-light leading-relaxed text-zinc-500">
                Build a focused view using status, contact readiness, and source quality signals.
              </p>
            </aside>

            <div className="relative min-h-[34rem] p-8">
              <Button
                type="button"
                variant="ghost"
                className="absolute right-5 top-5 h-10 w-10 rounded-full border border-zinc-300 bg-white p-0 text-zinc-500 shadow-none hover:border-zinc-900 hover:bg-white hover:text-zinc-950"
                onClick={() => setFilterOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>

              <div className="max-w-xl space-y-10 pr-12">
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
                  <label className="block text-sm font-semibold text-zinc-950">By source quality:</label>
                  <div className="flex flex-wrap gap-2.5">
                    {[
                      { value: "all", label: "All sources" },
                      { value: "imported", label: "Imported" },
                      { value: "manual", label: "Manual" },
                    ].map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() =>
                          setFilters((prev) => ({
                            ...prev,
                            source: option.value as LeadFilterState["source"],
                          }))
                        }
                        className={`inline-flex h-10 items-center rounded-full border px-4 text-sm font-semibold transition-all ${
                          filters.source === option.value
                            ? "border-blue-600 bg-white text-blue-600 shadow-[0_8px_18px_-16px_rgba(37,99,235,0.85)]"
                            : "border-zinc-300 bg-white text-zinc-950 shadow-[0_7px_18px_-18px_rgba(2,10,27,0.5)] hover:border-blue-500 hover:text-blue-600"
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="absolute bottom-8 left-8 right-8 flex items-center justify-between border-t border-zinc-100 pt-6">
                <button
                  type="button"
                  className="border-b border-transparent pb-1 text-sm font-medium text-zinc-400 transition-colors hover:border-zinc-900 hover:text-zinc-950"
                  onClick={() => setFilters(EMPTY_FILTERS)}
                >
                  Reset model
                </button>
                <Button
                  type="button"
                  className="h-11 rounded-full bg-zinc-950 px-7 text-sm font-semibold text-white shadow-none hover:bg-blue-600"
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
        open={addLeadOpen}
        title="Add Lead"
        description={
          selectedEvent
            ? `Add a lead directly into ${selectedEvent.canonicalEventName}.`
            : "Select an event first before adding a lead."
        }
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

        <div className="mt-8 border-y border-zinc-100 py-4 text-sm font-light leading-relaxed text-zinc-500">
          Add the strongest details you have now. Contact information helps the team follow up faster, but the profile can be updated later.
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
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-zinc-950 px-7 text-sm font-semibold text-white shadow-none hover:bg-blue-600"
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
                Add Lead
              </>
            )}
          </Button>
        </div>
      </LeadSheetDialog>
    </>
  );
}
