"use client";

import { useCallback, useEffect, useMemo, useState, type ChangeEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Clock3,
  Copy,
  Download,
  FileSpreadsheet,
  FileUp,
  History,
  Loader2,
  Mail,
  Plus,
  Search,
  SlidersHorizontal,
  UploadCloud,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { usePersona } from "@/hooks/usePersona";
import { listActiveEventRegistry, personaForRole, type AdminEventItem } from "@/lib/auth";
import { cn } from "@/lib/utils";
import {
  createMyCampaignFromUpload,
  downloadMyLeadTemplateFile,
  listMyAllLeads,
  listMyEventLeads,
  listMyEvents,
  searchMyLeads,
  validateMyLeadTemplateUpload,
  type EventLeadListItem,
  type EventSummaryItem,
  type LeadTemplateValidationResponse,
  type LeadItem,
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
  linkedinUrl: string;
  companyUrl: string;
  workflowStatus: string;
  workflowStatusLabel: string;
  workflowComment: string;
  workflowCommentUpdatedAt: string;
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
  { statusKey: "new", label: "New" },
  { statusKey: "first-call", label: "First Call" },
  { statusKey: "follow-up", label: "Followups" },
  { statusKey: "pending", label: "Pending" },
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
const LEAD_TEMPLATE_ACCEPT = ".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const LEAD_TEMPLATE_HEADERS = "Company | Full Name | Job Title | Telephone Number | Mobile | Email | comments";
const EVENT_SELECT_CONTENT_CLASS =
  "z-[120] max-h-[18rem] w-[22rem] max-w-[calc(100vw-2rem)] rounded-2xl border border-zinc-200 bg-white/98 p-2 shadow-[0_24px_70px_-46px_rgba(15,23,42,0.78)] backdrop-blur-[10px]";
const EVENT_SELECT_ITEM_CLASS =
  "rounded-xl py-2.5 pl-3 pr-9 text-sm font-medium text-zinc-800 transition-colors focus:bg-zinc-100/80 focus:text-zinc-950 focus:shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_8px_20px_-20px_rgba(15,23,42,0.45)] focus:[&_svg]:!text-zinc-500 data-[highlighted]:bg-zinc-100/80 data-[highlighted]:text-zinc-950 data-[highlighted]:shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_8px_20px_-20px_rgba(15,23,42,0.45)] data-[highlighted]:[&_svg]:!text-zinc-500 data-[state=checked]:border data-[state=checked]:border-blue-500/20 data-[state=checked]:bg-blue-600 data-[state=checked]:text-white data-[state=checked]:shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_10px_22px_-16px_rgba(37,99,235,0.8)] data-[state=checked]:[&_svg]:!text-white [&_[data-slot=select-item-indicator]]:right-3 [&_[data-slot=select-item-indicator]_svg]:h-4 [&_[data-slot=select-item-indicator]_svg]:w-4 [&_[data-slot=select-item-indicator]_svg]:stroke-[2.25]";
const UPLOAD_EVENT_SELECT_CONTENT_CLASS =
  "z-[120] max-h-[18rem] w-[var(--radix-select-trigger-width)] max-w-[calc(100vw-5rem)] rounded-2xl border border-zinc-200 bg-white/98 p-0 shadow-[0_24px_70px_-46px_rgba(15,23,42,0.78)] backdrop-blur-[10px]";
const UPLOAD_EVENT_SELECT_ITEM_CLASS =
  "w-full rounded-xl py-2.5 pl-3 pr-9 text-sm font-medium text-zinc-800 transition-colors focus:bg-zinc-100/80 focus:text-zinc-950 focus:shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_8px_20px_-20px_rgba(15,23,42,0.45)] focus:[&_svg]:!text-zinc-500 data-[highlighted]:bg-zinc-100/80 data-[highlighted]:text-zinc-950 data-[highlighted]:shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_8px_20px_-20px_rgba(15,23,42,0.45)] data-[highlighted]:[&_svg]:!text-zinc-500 data-[state=checked]:border data-[state=checked]:border-blue-500/20 data-[state=checked]:bg-blue-600 data-[state=checked]:text-white data-[state=checked]:shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_10px_22px_-16px_rgba(37,99,235,0.8)] data-[state=checked]:[&_svg]:!text-white [&_[data-slot=select-item-indicator]]:right-3 [&_[data-slot=select-item-indicator]_svg]:h-3.5 [&_[data-slot=select-item-indicator]_svg]:w-3.5 [&_[data-slot=select-item-indicator]_svg]:stroke-[2.25]";

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
  if (status === "deal-closed" || status === "confirmed") return "bg-emerald-500";
  if (status === "proposal-sent" || status === "pending") return "bg-blue-500";
  if (status === "follow-up" || status === "first-call") return "bg-amber-500";
  if (status === "deal-dead") return "bg-rose-500";
  return "bg-zinc-300";
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
  return {
    id: item.id,
    employeeName: item.employeeName || "",
    title: item.title || "",
    company: item.company || "",
    email: item.email || "",
    phone: item.phone || "",
    linkedinUrl: item.linkedinUrl || "",
    companyUrl: item.companyUrl || "",
    workflowStatus,
    workflowStatusLabel: item.workflowStatusLabel || workflowStatus,
    workflowComment: item.workflowComment || "",
    workflowCommentUpdatedAt: item.workflowCommentUpdatedAt || "",
    canonicalEventName: item.canonicalEventName || item.eventName || "",
    isManualLead: Boolean(item.isManualLead),
  };
}

function myLeadSearchParams(query: string, filters: MyLeadFilterState) {
  return {
    limit: 200,
    offset: 0,
    search: query.trim() || undefined,
    workflowStatus: filters.status === "all" ? undefined : filters.status,
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
    if (filters.contact === "email" && !row.email) return false;
    if (filters.contact === "phone" && !row.phone) return false;
    if (filters.contact === "complete" && (!row.email || !row.phone)) return false;
    if (filters.contact === "missing-contact" && (row.email || row.phone)) return false;
    if (filters.contact === "linkedin" && !row.linkedinUrl) return false;
    if (filters.contact === "website" && !row.companyUrl) return false;
    if (!search) return true;

    return [
      row.employeeName,
      row.title,
      row.company,
      row.email,
      row.phone,
      row.linkedinUrl,
      row.companyUrl,
      row.workflowStatusLabel,
    ]
      .join(" ")
      .toLowerCase()
      .includes(search);
  });
}

function LeadSheetDialog({
  open,
  title,
  description,
  onClose,
  children,
  eyebrow = "Lead Sheet Updates",
}: {
  open: boolean;
  title: string;
  description: string;
  onClose: () => void;
  children: ReactNode;
  eyebrow?: string;
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

      <div className="relative z-[1] flex max-h-[calc(100dvh-3rem)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-zinc-300 bg-white shadow-[0_32px_80px_-48px_rgba(2,10,27,0.65)]">
        <Button
          type="button"
          variant="ghost"
          className="absolute right-5 top-5 z-20 h-10 w-10 rounded-full border border-zinc-300 bg-white p-0 text-zinc-500 shadow-none hover:border-zinc-900 hover:bg-white hover:text-zinc-950"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>

        <div className="shrink-0 px-8 pb-5 pt-8">
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
  const { isSuperAdmin, role } = useAuth();
  const expectedPersona = personaForRole(role);
  const hasPersonaMismatch = Boolean(expectedPersona && expectedPersona !== persona);
  const [events, setEvents] = useState<EventSummaryItem[]>([]);
  const [registryEvents, setRegistryEvents] = useState<AdminEventItem[]>([]);
  const [selectedEventKey, setSelectedEventKey] = useState("");
  const [rows, setRows] = useState<MyLeadRow[]>([]);
  const [loadingRegistryEvents, setLoadingRegistryEvents] = useState(true);
  const [templateUploadOpen, setTemplateUploadOpen] = useState(false);
  const [templateUpload, setTemplateUpload] = useState<TemplateUploadState>(EMPTY_TEMPLATE_UPLOAD);
  const [copiedLeadId, setCopiedLeadId] = useState<string | null>(null);
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

  const statusOptions = useMemo(
    () => (persona === "delegates" || persona === "production" ? DELEGATE_STATUSES : SALES_STATUSES),
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
  const templateUploadReady = Boolean(
    templateUpload.file && templateValidation && selectedTemplateUploadEvent?.isActive
  );

  const loadEvents = useCallback(async () => {
    if (!role || isSuperAdmin || hasPersonaMismatch) return;

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

  const loadRows = useCallback(async () => {
    if (!role || isSuperAdmin || hasPersonaMismatch) return;

    try {
      const shouldSearchOrFilter =
        searchInput.trim().length > 0 || filters.status !== "all" || filters.contact !== "all";
      const response = selectedEventKey
        ? await listMyEventLeads(selectedEventKey, {
            limit: 200,
            offset: 0,
            search: searchInput.trim() || undefined,
            workflowStatus: filters.status === "all" ? undefined : filters.status,
            sort: "createdAt:desc",
          })
        : shouldSearchOrFilter
          ? await searchMyLeads(myLeadSearchParams(searchInput, filters))
          : await listMyAllLeads();
      const items = "items" in response ? response.items : "leads" in response ? response.leads : [];
      setRows((Array.isArray(items) ? items : []).map(mapLeadItemToRow));
    } catch (error: unknown) {
      setRows([]);
      toast.error("Failed to load My Leads", { description: getApiErrorMessage(error) });
    }
  }, [filters, hasPersonaMismatch, isSuperAdmin, role, searchInput, selectedEventKey]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      void loadRows();
    }, 300);

    return () => window.clearTimeout(handle);
  }, [loadRows]);

  const visibleRows = useMemo(() => filterRows(rows, searchInput, filters), [filters, rows, searchInput]);
  const pagedRows = visibleRows.slice(pageOffset, pageOffset + pageSize);
  const activeFilterCount = [filters.status !== "all", filters.contact !== "all"].filter(Boolean).length;
  const pageTotal = visibleRows.length;
  const pageRangeStart = pagedRows.length > 0 ? pageOffset + 1 : 0;
  const pageRangeEnd = pageOffset + pagedRows.length;
  const hasMore = pageOffset + pageSize < pageTotal;

  if (!role || isSuperAdmin || hasPersonaMismatch) return null;

  const showBackendPendingToast = () => {
    toast.info("My Leads backend is not connected yet.");
  };

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

  const copyLeadDetails = async (item: MyLeadRow) => {
    const copiedAt = new Date().toLocaleString();
    const lines = [
      `Name: ${item.employeeName || "-"}`,
      `Title: ${item.title || "-"}`,
      `Company: ${item.company || "-"}`,
      `Status: ${item.workflowStatusLabel || item.workflowStatus}`,
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
      await writeClipboardText(lines.join("\n"));
      setCopiedLeadId(item.id);
      window.setTimeout(() => setCopiedLeadId((current) => (current === item.id ? null : current)), 1600);
      toast.success("Lead copied");
    } catch (error: unknown) {
      toast.error("Failed to copy lead", { description: getApiErrorMessage(error) });
    }
  };

  return (
    <>
      <div className="flex h-[calc(100dvh-3rem)] min-h-0 flex-col overflow-hidden bg-transparent p-1 font-sans">
        <header className="min-h-[6.25rem] shrink-0 border-b border-zinc-300 pb-11">
          <div className="flex min-w-0 items-center gap-7 whitespace-nowrap overflow-hidden">
            <div className="min-w-0 flex-1">
              <Select value={selectedEventKey || "my-leads"} onValueChange={handleEventChange}>
                <SelectTrigger
                  aria-label="Select lead source"
                  className="group !h-auto w-fit max-w-full justify-start gap-4 whitespace-normal rounded-none border-0 bg-transparent p-0 text-left text-zinc-950 shadow-none transition-colors hover:text-blue-700 focus:ring-0 focus-visible:ring-0 [&>svg]:mt-1 [&>svg]:h-7 [&>svg]:w-7 [&>svg]:opacity-40 [&>svg]:transition-colors [&>svg]:group-hover:opacity-70"
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
              <div className="inline-flex h-12 shrink-0 items-center gap-1.5 rounded-full border border-zinc-200 bg-white p-1.5" aria-label="My leads actions">
                <button
                  type="button"
                  onClick={openTemplateUploadDialog}
                  disabled={loadingRegistryEvents || !hasActiveRegistryEvents}
                  className="inline-flex h-9 w-40 items-center justify-center gap-2.5 rounded-full text-sm font-semibold text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-950 disabled:opacity-50"
                >
                  <FileUp className="h-4 w-4" />
                  Upload leads
                </button>

                <button
                  type="button"
                  onClick={showBackendPendingToast}
                  className="inline-flex h-9 w-40 items-center justify-center gap-2.5 rounded-full border border-blue-500/20 bg-blue-600 text-sm font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_10px_22px_-14px_rgba(37,99,235,0.95)] transition-colors hover:bg-blue-700"
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
              <div className="mt-8">
                <label className="mb-4 block text-xs font-medium text-zinc-400">Search intelligence</label>
                <div className="relative h-11 w-full rounded-full border border-zinc-300 bg-white px-4 shadow-[0_22px_60px_-52px_rgba(2,10,27,0.42)] transition-colors focus-within:border-zinc-400">
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
            </div>
          </aside>

          <main className="flex min-h-0 flex-col overflow-hidden xl:border-l xl:border-zinc-300 xl:pl-16">
            <div className="min-h-0 flex-1 overflow-auto pr-4 scrollbar-modern">
              {pagedRows.length === 0 ? (
                <div className="w-full">
                  <div className="sticky top-0 z-20 grid grid-cols-[minmax(0,0.75fr)_minmax(14rem,0.95fr)_10rem] border-b border-zinc-300 bg-[#f7f7f7]/95 py-3 text-sm font-light text-zinc-500 backdrop-blur">
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
                  <div className="sticky top-0 z-20 grid grid-cols-[minmax(0,0.75fr)_minmax(14rem,0.95fr)_10rem] border-b border-zinc-300 bg-[#f7f7f7]/95 py-3 text-sm font-light text-zinc-500 backdrop-blur">
                    <div>Identity details</div>
                    <div>Contact channels</div>
                    <div>Status</div>
                  </div>
                  {pagedRows.map((item) => (
                    <div key={item.id} className="group grid grid-cols-[minmax(0,0.75fr)_minmax(14rem,0.95fr)_10rem] border-b border-zinc-300 py-6 transition-all duration-300 hover:bg-zinc-50/60">
                      <div className="pr-8">
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center gap-5">
                            <span className="text-xl font-light tracking-tight text-zinc-950">{item.employeeName || "-"}</span>
                            {item.isManualLead ? (
                              <span className="rounded-full border border-zinc-300 bg-white px-2 py-0.5 text-xs font-medium text-zinc-500">Manual</span>
                            ) : null}
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
                                <span className="truncate text-sm font-light tracking-tight text-zinc-700">{item.email}</span>
                              </>
                            ) : (
                              <span className="text-sm font-light tracking-tight text-zinc-700">-</span>
                            )}
                          </div>
                          <div className="flex items-center gap-4">
                            {item.phone ? (
                              <>
                                <PhoneIcon className="h-3.5 w-3.5 text-[#22C55E]" />
                                <span className="truncate text-sm font-light text-zinc-500">{item.phone}</span>
                              </>
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
                            <button type="button" onClick={showBackendPendingToast} className="inline-flex items-center gap-1.5 border-b border-transparent pb-0.5 text-zinc-400 transition-colors hover:border-blue-600 hover:text-zinc-950">
                              <Mail className="h-3.5 w-3.5" />
                              <span className="text-xs font-medium">Generate content</span>
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="flex h-full flex-col">
                        <Select value={item.workflowStatus} onValueChange={showBackendPendingToast}>
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
                        <div className="mt-auto pt-3">
                          {item.workflowComment ? (
                            <button type="button" onClick={showBackendPendingToast} className="mb-2 block w-full border-l border-zinc-300 pl-3 text-left transition-colors hover:border-zinc-900">
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
                          <button type="button" onClick={showBackendPendingToast} className="inline-flex items-center gap-1.5 border-b border-transparent pb-0.5 text-xs font-medium text-zinc-400 transition-colors hover:border-zinc-900 hover:text-zinc-950">
                            <History className="h-3.5 w-3.5" />
                            Comment history
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
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
                  className="h-11 w-11 rounded-full border border-zinc-300 bg-white p-0 text-zinc-500 shadow-none transition-all hover:border-zinc-900 hover:bg-white hover:text-zinc-950 disabled:opacity-30"
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
                    onValueChange={(value) => {
                      setFilters((prev) => ({ ...prev, status: value }));
                      setPageOffset(0);
                    }}
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
                        onClick={() => {
                          setFilters((prev) => ({
                            ...prev,
                            contact: option.value as MyLeadFilterState["contact"],
                          }));
                          setPageOffset(0);
                        }}
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

      <LeadSheetDialog
        open={templateUploadOpen}
        title="Upload Leads"
        description=""
        eyebrow=""
        onClose={closeTemplateUploadDialog}
      >
        <div className="space-y-7">
          <div>
            <label className="mb-3 block text-xs font-medium text-zinc-400">Related event</label>
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
              "group flex min-h-20 items-center gap-3 rounded-2xl border px-4 py-3 transition-all",
              !selectedTemplateUploadEvent
                ? "border-zinc-200 bg-zinc-50/80"
                : templateUpload.error
                  ? "border-red-300 bg-red-50/40"
                  : "border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50/70"
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
    </>
  );
}
