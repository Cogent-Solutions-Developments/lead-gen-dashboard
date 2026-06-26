"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  Search,
  FileUp,
  X,
  Copy,
  ExternalLink,
  UploadCloud,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  RefreshCcw,
  PhoneOff,
  MessageSquare,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import {
  disableLeadWhatsApp,
  generateSelectedCampaignLeadContent,
  listEvents,
  searchLeads,
  sendAdminLeadSms,
  type EventSummaryItem,
  type LeadItem,
} from "@/lib/apiRouter";
import { usePersona } from "@/hooks/usePersona";
import { useAuth } from "@/hooks/useAuth";
import { NormalUserEventLeadSheet } from "@/components/leads/NormalUserEventLeadSheet";

const PAGE_SIZE_OPTIONS = [15, 25, 50, 100] as const;
const SELECTED_CONTENT_GENERATION_LIMIT = 25;
const POSITION_OPTIONS = [
  "CEO",
  "CTO",
  "CIO",
  "COO",
  "CFO",
  "CMO",
  "CRO",
  "CISO",
  "CSO",
  "CPO",
  "CCO",
  "CDO",
  "CHRO",
  "Chief",
  "VP",
  "Director",
  "Head",
  "Manager",
  "Lead",
  "Other",
  "Unknown",
] as const;

type PresenceFilter = "all" | "yes" | "no";
type SortBy =
  | "relevance"
  | "name_asc"
  | "name_desc"
  | "company_asc"
  | "company_desc"
  | "event_asc"
  | "position_asc";
type ContactState = "whatsapp" | "email" | "both" | "in_progress" | "not_contacted" | "unknown";
type DeliverySignal = "sent" | "in_progress" | "not_contacted";
type ApprovalStatus = "pending" | "approved" | "rejected" | "suppressed";

type SuppressionInfo = {
  active?: boolean;
  matchedBy?: string | null;
  source?: string | null;
  reason?: string | null;
  phoneE164?: string | null;
  email?: string | null;
};

interface Lead {
  id: string;
  campaignId: string;
  eventName: string;
  canonicalEventKey: string;
  canonicalEventName: string;
  employeeName: string;
  title: string;
  company: string;
  email: string;
  phone: string;
  linkedinUrl: string;
  companyUrl: string;
  contentEmailSubject: string;
  contentEmail: string;
  contentSource: string;
  contactState: ContactState;
  approvalStatus: ApprovalStatus;
  isSuppressed: boolean;
  contactReadOnly: boolean;
  suppression: SuppressionInfo | null;
  isManualLead: boolean;
  manualLeadAddedByUsername: string;
  manualLeadAddedAt: string;
}

const LinkedInIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M20.5 2h-17A1.5 1.5 0 002 3.5v17A1.5 1.5 0 003.5 22h17a1.5 1.5 0 001.5-1.5v-17A1.5 1.5 0 0020.5 2zM8 19H5v-9h3zM6.5 8.25A1.75 1.75 0 118.3 6.5a1.78 1.78 0 01-1.8 1.75zM19 19h-3v-4.74c0-1.22-.44-2.12-1.54-2.12a1.6 1.6 0 00-1.58 1.14 2.17 2.17 0 00-.1 1.08V19h-3v-9h2.9v1.3a3.11 3.11 0 012.7-1.4c1.95 0 3.52 1.27 3.52 4z" />
  </svg>
);

function LeadFinderSkeleton() {
  return (
    <div className="min-h-screen bg-transparent p-1 font-sans">
      <div className="relative overflow-hidden rounded-2xl border border-[rgb(255_255_255_/_0.82)] bg-white/70 px-4 pb-4 pt-3 shadow-[0_0_0_1px_rgba(255,255,255,0.82)]">
        <div className="animate-pulse">
          <div className="h-11 w-56 bg-zinc-100" />
          <div className="mt-4 h-5 w-full max-w-xl bg-zinc-100" />
        </div>
      </div>

      <Card className="mt-3 rounded-2xl border border-[rgb(255_255_255_/_0.82)] bg-white/70 p-4 shadow-none">
        <div className="flex animate-pulse flex-wrap items-center gap-2">
          <div className="h-9 min-w-64 flex-1 bg-zinc-100" />
          <div className="h-9 w-40 bg-zinc-100" />
          <div className="h-9 w-32 bg-zinc-100" />
          <div className="h-9 w-36 bg-zinc-100" />
          <div className="h-9 w-24 bg-zinc-100" />
        </div>
      </Card>

      <Card className="mt-3 overflow-hidden rounded-2xl border border-[rgb(255_255_255_/_0.82)] bg-white/70 shadow-none">
        <div className="flex animate-pulse items-center justify-between border-b border-zinc-100 px-4 py-3">
          <div className="h-4 w-28 bg-zinc-100" />
          <div className="flex gap-2">
            <div className="h-6 w-20 bg-zinc-100" />
            <div className="h-6 w-20 bg-zinc-100" />
          </div>
        </div>

        <div className="overflow-x-auto px-4 pb-2 pt-2">
          <div className="min-w-[1180px] animate-pulse">
            <div className="grid grid-cols-[1.1fr_1fr_1fr_1.1fr_1.2fr_0.8fr_0.45fr_0.45fr_0.6fr] gap-4 border-b border-zinc-100 py-3">
              {Array.from({ length: 9 }).map((_, index) => (
                <div key={index} className="h-3 bg-zinc-100" />
              ))}
            </div>
            {Array.from({ length: 8 }).map((_, rowIndex) => (
              <div
                key={rowIndex}
                className="grid grid-cols-[1.1fr_1fr_1fr_1.1fr_1.2fr_0.8fr_0.45fr_0.45fr_0.6fr] gap-4 border-b border-zinc-100 py-4"
              >
                {Array.from({ length: 9 }).map((_, cellIndex) => (
                  <div key={cellIndex} className="space-y-2">
                    <div className="h-4 bg-zinc-100" />
                    {cellIndex < 4 ? <div className="h-3 w-2/3 bg-zinc-100" /> : null}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}

function asText(value: unknown) {
  if (typeof value === "string") return value;
  if (value == null) return "";
  return String(value);
}

function hasValue(value: string) {
  return value.trim().length > 0;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function normalizeApprovalStatus(value: unknown): ApprovalStatus {
  const v = String(value || "").toLowerCase();
  if (v === "approved") return "approved";
  if (v === "rejected") return "rejected";
  if (v === "suppressed") return "suppressed";
  if (v === "content_generated" || v === "needs_review") return "pending";
  return "pending";
}

function parseBoolean(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value > 0;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return ["1", "true", "yes", "y"].includes(normalized);
  }
  return false;
}

function normalizeSuppression(value: unknown): SuppressionInfo | null {
  const source = asRecord(value);
  if (!source) return null;
  return {
    active: parseBoolean(source.active),
    matchedBy: source.matchedBy ? String(source.matchedBy) : null,
    source: source.source ? String(source.source) : null,
    reason: source.reason ? String(source.reason) : null,
    phoneE164: source.phoneE164 ? String(source.phoneE164) : null,
    email: source.email ? String(source.email) : null,
  };
}

function isLeadSuppressed(lead: Lead): boolean {
  return (
    lead.contactReadOnly ||
    lead.isSuppressed ||
    lead.approvalStatus === "suppressed" ||
    Boolean(lead.suppression?.active)
  );
}

function hasGeneratedEmailContent(lead: Lead): boolean {
  return hasValue(lead.contentEmailSubject) && hasValue(lead.contentEmail) && lead.contentSource !== "template";
}

function isLeadSelectableForGeneration(lead: Lead): boolean {
  return hasValue(lead.campaignId) && !isLeadSuppressed(lead);
}

function parseBooleanFlag(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (value === 1) return true;
    if (value === 0) return false;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (!normalized) return null;
    if (["1", "true", "yes", "y"].includes(normalized)) return true;
    if (["0", "false", "no", "n"].includes(normalized)) return false;
  }
  return null;
}

function normalizePhone(value: string) {
  return value.toLowerCase().replaceAll(/\s+/g, "").replaceAll(/[()-]/g, "");
}

function classifyDeliverySignalText(value: unknown): DeliverySignal | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase().replaceAll(/[\s-]+/g, "_");
  if (!normalized) return null;

  if (/\b(uncontacted|not_contacted|failed|error|bounced|rejected|draft|needs_review|pending|new)\b/.test(normalized)) {
    return "not_contacted";
  }
  if (/\b(queued|sending|in_progress|processing|dispatching|retrying)\b/.test(normalized)) {
    return "in_progress";
  }
  if (/\b(sent|delivered|replied|contacted|connected|responded|opened)\b/.test(normalized)) {
    return "sent";
  }

  return null;
}

function strongestSignal(values: Array<DeliverySignal | null>): DeliverySignal | null {
  if (values.includes("sent")) return "sent";
  if (values.includes("in_progress")) return "in_progress";
  if (values.includes("not_contacted")) return "not_contacted";
  return null;
}

function signalFromUnknown(value: unknown): DeliverySignal | null {
  const obj = asRecord(value);
  if (!obj) return classifyDeliverySignalText(value);

  const signals: Array<DeliverySignal | null> = [classifyDeliverySignalText(value), classifyDeliverySignalText(obj.status)];
  for (const inner of Object.values(obj)) {
    signals.push(classifyDeliverySignalText(inner));
    const innerObj = asRecord(inner);
    if (innerObj) signals.push(classifyDeliverySignalText(innerObj.status));
  }
  return strongestSignal(signals);
}

function deriveContactState(source: Record<string, unknown>): ContactState {
  let emailSignal: DeliverySignal | null = null;
  let whatsappSignal: DeliverySignal | null = null;

  const markEmail = (value: unknown) => {
    emailSignal = strongestSignal([emailSignal, signalFromUnknown(value)]);
  };
  

  const markWhatsapp = (value: unknown) => {
    whatsappSignal = strongestSignal([whatsappSignal, signalFromUnknown(value)]);
  };

  const ingestOutreachLike = (value: unknown) => {
    const obj = asRecord(value);
    if (!obj) return;

    markEmail(obj.email);
    markEmail(obj.emailStatus);
    markEmail(obj.email_status);

    markWhatsapp(obj.whatsapp);
    markWhatsapp(obj.whatsappStatus);
    markWhatsapp(obj.whatsapp_status);
    markWhatsapp(obj.wa);
  };

  ingestOutreachLike(source.outreachStatus);
  ingestOutreachLike(source.outreach_status);

  const draft = asRecord(source.draft);
  const draftMeta = asRecord(draft?.meta);
  const draftMetaLegacy = asRecord(source.draft_meta);
  const draftMetaCamel = asRecord(source.draftMeta);
  ingestOutreachLike(draftMeta?.outreach);
  ingestOutreachLike(draftMetaLegacy?.outreach);
  ingestOutreachLike(draftMetaCamel?.outreach);

  markEmail(source.emailStatus);
  markEmail(source.email_status);
  markWhatsapp(source.whatsappStatus);
  markWhatsapp(source.whatsapp_status);
  markWhatsapp(source.waStatus);
  markWhatsapp(source.wa_status);

  if (whatsappSignal === "sent" && emailSignal === "sent") return "both";
  if (whatsappSignal === "sent") return "whatsapp";
  if (emailSignal === "sent") return "email";
  if (whatsappSignal === "in_progress" || emailSignal === "in_progress") return "in_progress";

  const boolKeys = [
    "contacted",
    "isContacted",
    "is_contacted",
    "alreadyContacted",
    "already_contacted",
    "connected",
    "isConnected",
    "is_connected",
    "wasContacted",
    "was_contacted",
    "hasBeenContacted",
    "has_been_contacted",
  ] as const;
  for (const key of boolKeys) {
    if (!(key in source)) continue;
    const parsed = parseBooleanFlag(source[key]);
    if (parsed === true) return "both";
    if (parsed === false) return "not_contacted";
  }

  const emailTimestampKeys = [
    "emailSentAt",
    "email_sent_at",
    "lastEmailSentAt",
    "last_email_sent_at",
  ] as const;
  const whatsappTimestampKeys = [
    "whatsappSentAt",
    "whatsapp_sent_at",
    "waSentAt",
    "wa_sent_at",
    "lastWhatsappMessageAt",
    "last_whatsapp_message_at",
  ] as const;
  const hasEmailTimestamp = emailTimestampKeys.some((key) => hasValue(asText(source[key])));
  const hasWhatsappTimestamp = whatsappTimestampKeys.some((key) => hasValue(asText(source[key])));
  if (hasEmailTimestamp && hasWhatsappTimestamp) return "both";
  if (hasWhatsappTimestamp) return "whatsapp";
  if (hasEmailTimestamp) return "email";

  const directStatusKeys = [
    "contactStatus",
    "contact_status",
    "connectionStatus",
    "connection_status",
    "leadStatus",
    "lead_status",
    "deliveryStatus",
    "delivery_status",
    "messageStatus",
    "message_status",
    "draftStatus",
    "draft_status",
  ] as const;
  const genericSignal = strongestSignal(directStatusKeys.map((key) => signalFromUnknown(source[key])));
  if (genericSignal === "sent") return "both";
  if (genericSignal === "in_progress") return "in_progress";
  if (genericSignal === "not_contacted") return "not_contacted";
  return "unknown";
}

function getSentChannelState(state: ContactState) {
  return {
    whatsapp: state === "whatsapp" || state === "both",
    email: state === "email" || state === "both",
  };
}

function formatEventLabel(raw: string) {
  const cleaned = raw.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
  if (!cleaned) return "Unknown Event";

  const acronyms = new Set(["aim", "aimct", "mict", "gcc", "ksa", "uae", "uk", "us", "api", "icp"]);

  return cleaned
    .split(" ")
    .map((token) => {
      const lower = token.toLowerCase();

      if (/^\d+$/.test(token) || /^\d+(st|nd|rd|th)$/i.test(token)) return token;
      if (acronyms.has(lower)) return lower.toUpperCase();
      if (/^[A-Z0-9]+$/.test(token)) return token;
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(" ");
}

function positionBucket(titleRaw: string): string {
  const t = (titleRaw || "").toLowerCase();

  if (/\bchief executive(?: officer)?\b|\bceo\b/.test(t)) return "CEO";
  if (/\bchief technology(?: officer)?\b|\bcto\b/.test(t)) return "CTO";
  if (/\bchief information(?: officer)?\b|\bcio\b/.test(t)) return "CIO";
  if (/\bchief operating(?: officer)?\b|\bcoo\b/.test(t)) return "COO";
  if (/\bchief financial(?: officer)?\b|\bcfo\b/.test(t)) return "CFO";
  if (/\bchief marketing(?: officer)?\b|\bcmo\b/.test(t)) return "CMO";
  if (/\bchief revenue(?: officer)?\b|\bcro\b/.test(t)) return "CRO";
  if (/\bchief information security(?: officer)?\b|\bciso\b/.test(t)) return "CISO";
  if (/\bchief security(?: officer)?\b|\bcso\b/.test(t)) return "CSO";
  if (/\bchief product(?: officer)?\b|\bcpo\b/.test(t)) return "CPO";
  if (/\bchief commercial(?: officer)?\b|\bcco\b/.test(t)) return "CCO";
  if (/\bchief digital(?: officer)?\b|\bcdo\b/.test(t)) return "CDO";
  if (/\bchief people(?: officer)?\b|\bchief human resources(?: officer)?\b|\bchro\b/.test(t))
    return "CHRO";
  if (/\bchief\b/.test(t)) return "Chief";

  if (/\bvp\b|\bvice president\b/.test(t)) return "VP";
  if (/\bmanaging director\b/.test(t)) return "Director";
  if (/\bdirector\b/.test(t)) return "Director";
  if (/\bhead of\b/.test(t)) return "Head";
  if (/\bmanager\b/.test(t)) return "Manager";
  if (/\blead\b/.test(t)) return "Lead";

  if (!t.trim()) return "Unknown";
  return "Other";
}

function scoreLead(lead: Lead, query: string): number {
  const q = query.trim().toLowerCase();
  if (!q) return 0;

  const name = lead.employeeName.toLowerCase();
  const title = lead.title.toLowerCase();
  const company = lead.company.toLowerCase();
  const email = lead.email.toLowerCase();
  const phone = lead.phone.toLowerCase();
  const eventName = lead.eventName.toLowerCase();
  const linkedin = lead.linkedinUrl.toLowerCase();
  const website = lead.companyUrl.toLowerCase();
  const id = lead.id.toLowerCase();

  let score = 0;

  const addFieldScore = (field: string, base: number) => {
    if (!field) return;
    if (field === q) score += base + 120;
    else if (field.startsWith(q)) score += base + 80;
    else if (field.includes(q)) score += base + 30;

    const tokens = q.split(/\s+/).filter(Boolean);
    if (tokens.length > 1) {
      let hits = 0;
      for (const tok of tokens) if (field.includes(tok)) hits += 1;
      if (hits) score += base + hits * 12;
    }
  };

  addFieldScore(name, 140);
  addFieldScore(title, 120);
  addFieldScore(company, 100);
  addFieldScore(eventName, 90);
  addFieldScore(email, 80);
  addFieldScore(phone, 70);
  addFieldScore(linkedin, 40);
  addFieldScore(website, 40);
  addFieldScore(id, 25);

  return score;
}

function sortLeads(rows: Lead[], sortBy: SortBy) {
  const collator = new Intl.Collator(undefined, { sensitivity: "base", numeric: true });
  const sorted = [...rows];

  switch (sortBy) {
    case "name_asc":
      sorted.sort((a, b) => collator.compare(a.employeeName || "", b.employeeName || ""));
      break;
    case "name_desc":
      sorted.sort((a, b) => collator.compare(b.employeeName || "", a.employeeName || ""));
      break;
    case "company_asc":
      sorted.sort((a, b) => collator.compare(a.company || "", b.company || ""));
      break;
    case "company_desc":
      sorted.sort((a, b) => collator.compare(b.company || "", a.company || ""));
      break;
    case "event_asc":
      sorted.sort((a, b) => collator.compare(a.eventName || "", b.eventName || ""));
      break;
    case "position_asc":
      sorted.sort((a, b) => collator.compare(positionBucket(a.title), positionBucket(b.title)));
      break;
    default:
      sorted.sort((a, b) => collator.compare(a.employeeName || "", b.employeeName || ""));
      break;
  }

  return sorted;
}

function presenceFilterToBoolean(filter: PresenceFilter): boolean | undefined {
  if (filter === "yes") return true;
  if (filter === "no") return false;
  return undefined;
}

function resolveServerSort(sortBy: SortBy, hasSearch: boolean) {
  switch (sortBy) {
    case "name_asc":
      return { sortBy: "employeeName", sortDir: "asc" as const };
    case "name_desc":
      return { sortBy: "employeeName", sortDir: "desc" as const };
    case "company_asc":
      return { sortBy: "company", sortDir: "asc" as const };
    case "company_desc":
      return { sortBy: "company", sortDir: "desc" as const };
    case "event_asc":
      return { sortBy: "eventName", sortDir: "asc" as const };
    case "relevance":
      return hasSearch
        ? { sortBy: "createdAt", sortDir: "desc" as const }
        : { sortBy: "employeeName", sortDir: "asc" as const };
    case "position_asc":
    default:
      return { sortBy: "createdAt", sortDir: "desc" as const };
  }
}

function mapLeadItemToAdminLead(item: LeadItem): Lead {
  const normalizedEventName =
    asText(item.canonicalEventName) ||
    asText(item.eventName) ||
    asText(item.batchId) ||
    "Unknown Event";

  return {
    id: asText(item.id),
    campaignId: asText(item.campaignId),
    eventName: normalizedEventName,
    canonicalEventKey: asText(item.canonicalEventKey),
    canonicalEventName: asText(item.canonicalEventName) || normalizedEventName,
    employeeName: asText(item.employeeName),
    title: asText(item.title),
    company: asText(item.company),
    email: asText(item.email),
    phone: asText(item.phone),
    linkedinUrl: asText(item.linkedinUrl),
    companyUrl: asText(item.companyUrl),
    contentEmailSubject: asText(item.contentEmailSubject),
    contentEmail: asText(item.contentEmail),
    contentSource: asText(item.contentSource),
    contactState: deriveContactState(item as Record<string, unknown>),
    approvalStatus: normalizeApprovalStatus(item.approvalStatus),
    isSuppressed: parseBoolean(item.isSuppressed),
    contactReadOnly: parseBoolean(item.contactReadOnly),
    suppression: normalizeSuppression(item.suppression),
    isManualLead: parseBoolean(item.isManualLead),
    manualLeadAddedByUsername: asText(item.manualLeadAddedByUsername),
    manualLeadAddedAt: asText(item.manualLeadAddedAt),
  };
}

function SuperAdminTotalLeads() {
  const { persona } = usePersona();
  const searchParams = useSearchParams();
  const targetLeadId = searchParams.get("lead") || "";
  const initialSearch = searchParams.get("search") || "";
  const initialEventFilter = searchParams.get("event") || "all";

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [totalLeads, setTotalLeads] = useState(0);
  const [events, setEvents] = useState<EventSummaryItem[]>([]);

  const [q, setQ] = useState(initialSearch);
  const [debouncedQuery, setDebouncedQuery] = useState(initialSearch);
  const [eventFilter, setEventFilter] = useState<string>(initialEventFilter);
  const [positionFilter, setPositionFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortBy>("relevance");

  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [nameFilter, setNameFilter] = useState("");
  const [jobTitleFilter, setJobTitleFilter] = useState("");
  const [companyFilter, setCompanyFilter] = useState("");
  const [eventTextFilter, setEventTextFilter] = useState("");
  const [domainFilter, setDomainFilter] = useState("");
  const [phoneFilter, setPhoneFilter] = useState("");
  const [hasEmailFilter, setHasEmailFilter] = useState<PresenceFilter>("all");
  const [hasPhoneFilter, setHasPhoneFilter] = useState<PresenceFilter>("all");
  const [hasLinkedinFilter, setHasLinkedinFilter] = useState<PresenceFilter>("all");
  const [hasWebsiteFilter, setHasWebsiteFilter] = useState<PresenceFilter>("all");

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(targetLeadId ? 100 : 15);

  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [disableTargetLead, setDisableTargetLead] = useState<Lead | null>(null);
  const [disableReason, setDisableReason] = useState("");
  const [isDisablingLead, setIsDisablingLead] = useState(false);
  const [smsTargetLead, setSmsTargetLead] = useState<Lead | null>(null);
  const [smsMessage, setSmsMessage] = useState("");
  const [isSendingSms, setIsSendingSms] = useState(false);
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(() => new Set());
  const [generatingLeadIds, setGeneratingLeadIds] = useState<Set<string>>(() => new Set());
  const [isGeneratingSelectedContent, setIsGeneratingSelectedContent] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const requestSequenceRef = useRef(0);
  const targetLeadRowRef = useRef<HTMLTableRowElement | null>(null);
  const initialLeadLoadRef = useRef(true);
  const contentGenerationEnabled = persona === "sales" || persona === "delegates" || persona === "production";

  const clearAdvancedFilters = useCallback(() => {
    setNameFilter("");
    setJobTitleFilter("");
    setCompanyFilter("");
    setEventTextFilter("");
    setDomainFilter("");
    setPhoneFilter("");
    setHasEmailFilter("all");
    setHasPhoneFilter("all");
    setHasLinkedinFilter("all");
    setHasWebsiteFilter("all");
  }, []);

  const resetFilters = useCallback(() => {
    setQ("");
    setEventFilter("all");
    setPositionFilter("all");
    setSortBy("relevance");
    clearAdvancedFilters();
  }, [clearAdvancedFilters]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(q.trim());
    }, 250);
    return () => window.clearTimeout(timer);
  }, [q]);

  useEffect(() => {
    const nextSearch = searchParams.get("search") || "";
    if (!nextSearch || nextSearch === q) return;
    setQ(nextSearch);
    setDebouncedQuery(nextSearch);
    setCurrentPage(1);
  }, [q, searchParams]);

  useEffect(() => {
    const nextEvent = searchParams.get("event") || "all";
    if (nextEvent === eventFilter) return;
    setEventFilter(nextEvent);
    setCurrentPage(1);
  }, [eventFilter, searchParams]);

  const serverSort = useMemo(
    () => resolveServerSort(sortBy, debouncedQuery.length > 0),
    [sortBy, debouncedQuery]
  );

  const fetchLeadPage = useCallback(
    async (mode: "initial" | "refresh" = "refresh") => {
      const requestId = ++requestSequenceRef.current;
      if (mode === "initial") {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      try {
        const response = await searchLeads({
          limit: itemsPerPage,
          offset: (currentPage - 1) * itemsPerPage,
          search: debouncedQuery || undefined,
          canonicalEventKey: eventFilter !== "all" ? eventFilter : undefined,
          hasEmail: presenceFilterToBoolean(hasEmailFilter),
          hasPhone: presenceFilterToBoolean(hasPhoneFilter),
          hasLinkedin: presenceFilterToBoolean(hasLinkedinFilter),
          hasWebsite: presenceFilterToBoolean(hasWebsiteFilter),
          sortBy: serverSort.sortBy,
          sortDir: serverSort.sortDir,
        });

        if (requestId !== requestSequenceRef.current) return;

        setLeads((response.items || []).map((item) => mapLeadItemToAdminLead(item)));
        setTotalLeads(Number(response.total || 0));
      } catch (e: unknown) {
        if (requestId !== requestSequenceRef.current) return;
        toast.error("Failed to load leads", {
          description: e instanceof Error ? e.message : "Could not fetch leads.",
        });
      } finally {
        if (requestId !== requestSequenceRef.current) return;
        setLoading(false);
        setRefreshing(false);
      }
    },
    [
      currentPage,
      debouncedQuery,
      eventFilter,
      hasEmailFilter,
      hasLinkedinFilter,
      hasPhoneFilter,
      hasWebsiteFilter,
      itemsPerPage,
      serverSort.sortBy,
      serverSort.sortDir,
    ]
  );

  const fetchEventOptions = useCallback(async () => {
    try {
      const response = await listEvents();
      setEvents(Array.isArray(response.events) ? response.events : []);
    } catch {
      // Keep the current list if event summaries fail; lead browsing should still work.
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    await Promise.all([fetchEventOptions(), fetchLeadPage("refresh")]);
  }, [fetchEventOptions, fetchLeadPage]);

  useEffect(() => {
    void fetchEventOptions();
  }, [persona, fetchEventOptions]);

  useEffect(() => {
    const mode = initialLeadLoadRef.current ? "initial" : "refresh";
    initialLeadLoadRef.current = false;
    void fetchLeadPage(mode);
  }, [persona, fetchLeadPage]);

  const eventOptions = useMemo(() => {
    return events
      .filter((event) => event.canonicalEventKey?.trim())
      .map((event) => ({
        value: event.canonicalEventKey,
        label: event.canonicalEventName?.trim() || formatEventLabel(event.canonicalEventKey),
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [events]);

  const positionOptions = useMemo(() => Array.from(POSITION_OPTIONS), []);
  const advancedFilterCount = useMemo(() => {
    let count = 0;
    if (nameFilter.trim()) count += 1;
    if (jobTitleFilter.trim()) count += 1;
    if (companyFilter.trim()) count += 1;
    if (eventTextFilter.trim()) count += 1;
    if (domainFilter.trim()) count += 1;
    if (phoneFilter.trim()) count += 1;
    if (hasEmailFilter !== "all") count += 1;
    if (hasPhoneFilter !== "all") count += 1;
    if (hasLinkedinFilter !== "all") count += 1;
    if (hasWebsiteFilter !== "all") count += 1;
    return count;
  }, [
    nameFilter,
    jobTitleFilter,
    companyFilter,
    eventTextFilter,
    domainFilter,
    phoneFilter,
    hasEmailFilter,
    hasPhoneFilter,
    hasLinkedinFilter,
    hasWebsiteFilter,
  ]);

  const filteredLeads = useMemo(() => {
    const query = q.trim().toLowerCase();
    const nameNeedle = nameFilter.trim().toLowerCase();
    const jobTitleNeedle = jobTitleFilter.trim().toLowerCase();
    const companyNeedle = companyFilter.trim().toLowerCase();
    const eventNeedle = eventTextFilter.trim().toLowerCase();
    const domainNeedle = domainFilter.trim().toLowerCase();
    const phoneNeedle = normalizePhone(phoneFilter.trim());

    const scoped = leads.filter((lead) => {
      const eventName = lead.eventName.toLowerCase();
      const name = lead.employeeName.toLowerCase();
      const title = lead.title.toLowerCase();
      const company = lead.company.toLowerCase();
      const email = lead.email.toLowerCase();
      const phone = lead.phone.toLowerCase();
      const website = lead.companyUrl.toLowerCase();

      if (positionFilter !== "all" && positionBucket(lead.title) !== positionFilter) return false;

      if (nameNeedle && !name.includes(nameNeedle)) return false;
      if (jobTitleNeedle && !title.includes(jobTitleNeedle)) return false;
      if (companyNeedle && !company.includes(companyNeedle)) return false;
      if (eventNeedle && !eventName.includes(eventNeedle)) return false;

      if (domainNeedle && !`${email} ${website}`.includes(domainNeedle)) return false;
      if (phoneNeedle && !normalizePhone(phone).includes(phoneNeedle)) return false;
      return true;
    });

    if (sortBy === "position_asc") {
      return sortLeads(scoped, sortBy);
    }

    if (sortBy === "relevance" && query) {
      return scoped
        .map((lead) => ({ lead, score: scoreLead(lead, query) }))
        .sort((a, b) => b.score - a.score)
        .map((entry) => entry.lead);
    }

    return scoped;
  }, [
    leads,
    q,
    positionFilter,
    sortBy,
    nameFilter,
    jobTitleFilter,
    companyFilter,
    eventTextFilter,
    domainFilter,
    phoneFilter,
  ]);

  const totalPages = Math.max(1, Math.ceil(totalLeads / itemsPerPage));
  const paginatedLeads = filteredLeads;
  const selectablePageLeadIds = useMemo(
    () => (contentGenerationEnabled ? paginatedLeads.filter(isLeadSelectableForGeneration).map((lead) => lead.id) : []),
    [contentGenerationEnabled, paginatedLeads]
  );
  const selectedPageLeadCount = selectablePageLeadIds.filter((id) => selectedLeadIds.has(id)).length;
  const allSelectablePageLeadsSelected =
    selectablePageLeadIds.length > 0 && selectedPageLeadCount === selectablePageLeadIds.length;
  const selectedLeads = useMemo(
    () => leads.filter((lead) => selectedLeadIds.has(lead.id)),
    [leads, selectedLeadIds]
  );
  const eligibleSelectedLeads = useMemo(
    () => (contentGenerationEnabled ? selectedLeads.filter(isLeadSelectableForGeneration) : []),
    [contentGenerationEnabled, selectedLeads]
  );

  const visiblePageNumbers = useMemo(() => {
    const windowSize = 5;
    let start = Math.max(1, currentPage - Math.floor(windowSize / 2));
    const end = Math.min(totalPages, start + windowSize - 1);
    start = Math.max(1, end - windowSize + 1);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }, [currentPage, totalPages]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (eventFilter !== "all") count += 1;
    if (positionFilter !== "all") count += 1;
    if (q.trim()) count += 1;
    count += advancedFilterCount;
    return count;
  }, [eventFilter, positionFilter, q, advancedFilterCount]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  useEffect(() => {
    if (!targetLeadId) return;
    const targetOnPage = paginatedLeads.some((lead) => lead.id === targetLeadId);
    if (!targetOnPage) return;

    const timer = window.setTimeout(() => {
      targetLeadRowRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 120);

    return () => window.clearTimeout(timer);
  }, [paginatedLeads, targetLeadId]);

  useEffect(() => {
    const loadedIds = new Set(leads.map((lead) => lead.id));
    setSelectedLeadIds((prev) => {
      const next = new Set(Array.from(prev).filter((id) => loadedIds.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [leads]);

  useEffect(() => {
    setCurrentPage(1);
  }, [
    q,
    eventFilter,
    positionFilter,
    sortBy,
    nameFilter,
    jobTitleFilter,
    companyFilter,
    eventTextFilter,
    domainFilter,
    phoneFilter,
    hasEmailFilter,
    hasPhoneFilter,
    hasLinkedinFilter,
    hasWebsiteFilter,
    itemsPerPage,
  ]);

  const toggleLeadSelection = (lead: Lead) => {
    if (!contentGenerationEnabled) {
      toast.info("Content generation is available for campaign leads");
      return;
    }
    if (!isLeadSelectableForGeneration(lead)) {
      toast.info("This lead cannot be selected", {
        description: isLeadSuppressed(lead)
          ? "Suppressed leads are read-only."
          : "Campaign context is missing for this lead.",
      });
      return;
    }
    setSelectedLeadIds((prev) => {
      const next = new Set(prev);
      if (next.has(lead.id)) next.delete(lead.id);
      else next.add(lead.id);
      return next;
    });
  };

  const togglePageSelection = () => {
    if (selectablePageLeadIds.length === 0) return;
    setSelectedLeadIds((prev) => {
      const next = new Set(prev);
      if (allSelectablePageLeadsSelected) {
        selectablePageLeadIds.forEach((id) => next.delete(id));
      } else {
        selectablePageLeadIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const generateContentForLeads = async (targets: Lead[], source: "single" | "selected") => {
    if (!contentGenerationEnabled) {
      toast.info("Content generation is available for campaign leads");
      return;
    }
    const eligible = targets.filter(isLeadSelectableForGeneration);
    if (eligible.length === 0) {
      toast.info("No eligible leads selected", {
        description: "Choose leads with campaign context that are not suppressed.",
      });
      return;
    }
    if (eligible.length > SELECTED_CONTENT_GENERATION_LIMIT) {
      toast.error("Select fewer leads", {
        description: `Generate content for ${SELECTED_CONTENT_GENERATION_LIMIT} or fewer leads at a time.`,
      });
      return;
    }

    const ids = eligible.map((lead) => lead.id);
    const grouped = new Map<string, string[]>();
    eligible.forEach((lead) => {
      const current = grouped.get(lead.campaignId) || [];
      current.push(lead.id);
      grouped.set(lead.campaignId, current);
    });

    if (source === "selected") setIsGeneratingSelectedContent(true);
    setGeneratingLeadIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.add(id));
      return next;
    });

    try {
      let generatedCount = 0;
      let suppressedCount = 0;
      let failedCount = 0;
      const generatedIds: string[] = [];

      for (const [campaignId, leadIds] of grouped.entries()) {
        const response = await generateSelectedCampaignLeadContent({ campaignId, leadIds });
        generatedCount += Number(response.generatedCount || 0);
        suppressedCount += Number(response.suppressedCount || 0);
        failedCount += Number(response.failedCount || 0);
        generatedIds.push(...(response.generatedLeadIds || []));
      }

      if (generatedCount > 0) {
        toast.success(source === "single" ? "Content generated" : "Selected content generated", {
          description:
            failedCount || suppressedCount
              ? `${generatedCount} generated, ${suppressedCount} suppressed, ${failedCount} failed.`
              : `${generatedCount} lead${generatedCount === 1 ? "" : "s"} ready for review.`,
        });
      } else {
        toast.warning("No content generated", {
          description: `${suppressedCount} suppressed, ${failedCount} failed.`,
        });
      }

      if (generatedIds.length > 0) {
        setSelectedLeadIds((prev) => {
          const next = new Set(prev);
          generatedIds.forEach((id) => next.delete(id));
          return next;
        });
      }
      await fetchLeadPage("refresh");
    } catch (error: unknown) {
      const rawMessage = error instanceof Error ? error.message : "Please try again.";
      let description = rawMessage;
      try {
        const parsed = JSON.parse(rawMessage) as { detail?: unknown };
        if (typeof parsed.detail === "string") description = parsed.detail;
      } catch {
        // Keep normalized API error text.
      }
      toast.error("Content generation failed", { description });
    } finally {
      if (source === "selected") setIsGeneratingSelectedContent(false);
      setGeneratingLeadIds((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => next.delete(id));
        return next;
      });
    }
  };

  const addFiles = (files: FileList | File[]) => {
    const arr = Array.isArray(files) ? files : Array.from(files);
    if (!arr.length) return;

    setSelectedFiles((prev) => {
      const map = new Map<string, File>();
      for (const f of prev) map.set(`${f.name}-${f.size}`, f);
      for (const f of arr) map.set(`${f.name}-${f.size}`, f);
      return Array.from(map.values());
    });
  };

  const removeFile = (idx: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const openDisableLeadConfirm = (lead: Lead) => {
    if (!hasValue(lead.phone) && !hasValue(lead.email)) {
      toast.error("Lead has no phone or email");
      return;
    }
    if (isLeadSuppressed(lead)) {
      toast.info("Already opted out", {
        description: "This lead is already blocked for all marketing messages.",
      });
      return;
    }

    setDisableReason("");
    setDisableTargetLead(lead);
  };

  const closeDisableLeadConfirm = () => {
    if (isDisablingLead) return;
    setDisableTargetLead(null);
    setDisableReason("");
  };

  const handleConfirmDisableLead = async () => {
    if (!disableTargetLead || isDisablingLead) return;

    try {
      setIsDisablingLead(true);
      const response = await disableLeadWhatsApp(
        disableTargetLead.id,
        disableReason.trim() || undefined
      );
      const effectiveReason = disableReason.trim() || "disabled from Nizo Finder";

      setLeads((prev) =>
        prev.map((lead) =>
          lead.id === disableTargetLead.id
            ? {
                ...lead,
                approvalStatus: "suppressed",
                isSuppressed: true,
                contactReadOnly: true,
                contactState: "not_contacted",
                suppression: {
                  active: true,
                  matchedBy: response.phoneE164 ? "phone" : response.email ? "email" : null,
                  source: response.source || "manual_disable",
                  reason: response.reason || effectiveReason,
                  phoneE164: response.phoneE164 || lead.phone || null,
                  email: response.email || lead.email || null,
                },
              }
            : lead
        )
      );

      toast.success("Lead added to opt-out", {
        description: `${disableTargetLead.employeeName} will not receive any marketing messages.`,
      });

      setDisableTargetLead(null);
      setDisableReason("");
      await fetchLeadPage("refresh");
    } catch (error: unknown) {
      const err = error as { response?: { data?: { detail?: string } }; message?: string };
      toast.error("Failed to disable marketing", {
        description: err.response?.data?.detail || err.message || "Please try again.",
      });
    } finally {
      setIsDisablingLead(false);
    }
  };

  const openSmsDialog = (lead: Lead) => {
    if (!hasValue(lead.phone)) {
      toast.error("Lead has no phone number");
      return;
    }
    if (isLeadSuppressed(lead)) {
      toast.info("Lead is opted out", {
        description: "This lead is blocked for marketing messages.",
      });
      return;
    }

    setSmsTargetLead(lead);
    setSmsMessage("");
  };

  const closeSmsDialog = () => {
    if (isSendingSms) return;
    setSmsTargetLead(null);
    setSmsMessage("");
  };

  const handleSendAdminSms = async () => {
    if (!smsTargetLead || isSendingSms) return;
    const message = smsMessage.trim();
    if (!message) {
      toast.error("Enter a message");
      return;
    }

    try {
      setIsSendingSms(true);
      const result = await sendAdminLeadSms(smsTargetLead.id, message);
      toast.success("SMS sent", {
        description: `${smsTargetLead.employeeName || "Lead"} received the message at ${result.to || smsTargetLead.phone}.`,
      });
      setSmsTargetLead(null);
      setSmsMessage("");
    } catch (error: unknown) {
      const rawMessage = error instanceof Error ? error.message : "Please try again.";
      let description = rawMessage;
      try {
        const parsed = JSON.parse(rawMessage) as { detail?: unknown };
        if (typeof parsed.detail === "string") description = parsed.detail;
      } catch {
        // Keep the normalized API error string.
      }
      toast.error("Failed to send SMS", { description });
    } finally {
      setIsSendingSms(false);
    }
  };

  const handleCopyLeadDetails = async (lead: Lead) => {
    const detailText = [
      `Event: ${lead.eventName || "-"}`,
      `Name: ${lead.employeeName || "-"}`,
      `Title: ${lead.title || "-"}`,
      `Company: ${lead.company || "-"}`,
      `Email: ${lead.email || "-"}`,
      `Phone: ${lead.phone || "-"}`,
      `LinkedIn: ${lead.linkedinUrl || "-"}`,
      `Website: ${lead.companyUrl || "-"}`,
    ].join("\n");

    try {
      await navigator.clipboard.writeText(detailText);
      toast.success("Lead details copied");
    } catch {
      toast.error("Could not copy lead details");
    }
  };

  const uploadSelectedFiles = useCallback(async () => {
    if (!selectedFiles.length) {
      toast.info("Select files to upload");
      return;
    }

    setUploading(true);
    try {
      toast.error("Upload endpoint is not available in the current backend.");
    } finally {
      setUploading(false);
    }
  }, [selectedFiles]);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
  };

  const showingFrom = paginatedLeads.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const showingTo =
    paginatedLeads.length === 0
      ? 0
      : Math.min((currentPage - 1) * itemsPerPage + paginatedLeads.length, totalLeads);

  if (loading) {
    return <LeadFinderSkeleton />;
  }

  return (
    <div className="font-sans min-h-screen bg-transparent p-1">
      <div className="relative overflow-hidden rounded-2xl border border-[rgb(255_255_255_/_0.82)] bg-[linear-gradient(160deg,rgba(255,255,255,0.88)_0%,rgba(250,252,255,0.72)_56%,rgba(240,246,253,0.58)_100%)] px-4 pb-4 pt-3 shadow-[0_0_0_1px_rgba(255,255,255,0.82),0_0_12px_-9px_rgba(2,10,27,0.58),0_0_6px_-5px_rgba(15,23,42,0.36),inset_0_1px_0_rgba(255,255,255,1),inset_0_-2px_0_rgba(221,230,244,0.74)] backdrop-blur-[14px] [backdrop-filter:saturate(168%)_blur(14px)]">
        <div className="pointer-events-none absolute -right-16 -top-16 h-36 w-36 rounded-full bg-gradient-to-br from-sky-300/34 via-blue-500/16 to-transparent blur-3xl" />
        <div className="pointer-events-none absolute -left-20 -bottom-16 h-44 w-44 rounded-full bg-gradient-to-tr from-blue-300/20 via-sky-200/8 to-transparent blur-3xl" />

        <div className="relative z-[1] flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-light leading-[1.12] tracking-[-0.025em] text-zinc-950 sm:text-4xl 2xl:text-5xl">Nizo Finder</h1>
            <p className="mt-4 max-w-xl text-lg font-light leading-relaxed text-zinc-500">Professional lead discovery with precision filtering and clean data views.</p>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => void handleRefresh()} className="h-10 border-zinc-300/90 bg-white/82 text-zinc-700 shadow-none hover:border-zinc-300 hover:bg-white" disabled={refreshing}>
              <RefreshCcw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      <Card className="relative isolate mt-3 overflow-hidden rounded-2xl border border-[rgb(255_255_255_/_0.82)] bg-[linear-gradient(160deg,rgba(255,255,255,0.84)_0%,rgba(250,252,255,0.66)_56%,rgba(240,246,253,0.56)_100%)] backdrop-blur-[16px] [backdrop-filter:saturate(175%)_blur(16px)] shadow-[0_0_0_1px_rgba(255,255,255,0.82),0_0_12px_-9px_rgba(2,10,27,0.58),0_0_6px_-5px_rgba(15,23,42,0.36),inset_0_1px_0_rgba(255,255,255,1),inset_0_-2px_0_rgba(221,230,244,0.74),inset_0_0_22px_rgba(255,255,255,0.2)]">
        <div className="pointer-events-none absolute -right-20 -top-20 h-52 w-52 rounded-full bg-gradient-to-br from-sky-300/30 via-blue-500/10 to-transparent blur-3xl" />
        <div className="pointer-events-none absolute -left-20 -bottom-20 h-52 w-52 rounded-full bg-gradient-to-tr from-blue-300/16 via-sky-200/8 to-transparent blur-3xl" />

        <div className="relative z-[1] px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search anything: name, title, company, event, email, phone, domain..."
                className="h-9 border-zinc-300/85 bg-white/90 pl-8 text-sm"
              />
            </div>

            <Select value={eventFilter} onValueChange={setEventFilter}>
              <SelectTrigger size="sm" className="h-9 min-w-[10rem] border-zinc-300/80 bg-white/90 text-xs font-semibold shadow-none">
                <SelectValue placeholder="All Events" />
              </SelectTrigger>
              <SelectContent align="end" className="border-zinc-300 bg-white/96 backdrop-blur-[10px]">
                <SelectItem value="all">All Events</SelectItem>
                {eventOptions.map((eventOption) => (
                  <SelectItem key={eventOption.value} value={eventOption.value}>
                    {eventOption.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={positionFilter} onValueChange={setPositionFilter}>
              <SelectTrigger size="sm" className="h-9 min-w-[8rem] border-zinc-300/80 bg-white/90 text-xs font-semibold shadow-none">
                <SelectValue placeholder="All Positions" />
              </SelectTrigger>
              <SelectContent align="end" className="border-zinc-300 bg-white/96 backdrop-blur-[10px]">
                <SelectItem value="all">All Positions</SelectItem>
                {positionOptions.map((p) => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={(value: SortBy) => setSortBy(value)}>
              <SelectTrigger size="sm" className="h-9 min-w-[8.5rem] border-zinc-300/80 bg-white/90 text-xs font-semibold shadow-none">
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent align="end" className="border-zinc-300 bg-white/96 backdrop-blur-[10px]">
                <SelectItem value="relevance">Relevance</SelectItem>
                <SelectItem value="name_asc">Name A-Z</SelectItem>
                <SelectItem value="name_desc">Name Z-A</SelectItem>
                <SelectItem value="company_asc">Company A-Z</SelectItem>
                <SelectItem value="company_desc">Company Z-A</SelectItem>
                <SelectItem value="event_asc">Event A-Z</SelectItem>
                <SelectItem value="position_asc">Position</SelectItem>
              </SelectContent>
            </Select>

            <Button type="button" variant="outline" onClick={() => setIsAdvancedOpen((prev) => !prev)} className="h-9 border-zinc-300 text-zinc-700">
              <SlidersHorizontal className="mr-1.5 h-3.5 w-3.5" />
              Filters
              {advancedFilterCount > 0 ? <span className="ml-1 text-[10px]">({advancedFilterCount})</span> : null}
            </Button>

            <Button type="button" variant="outline" onClick={resetFilters} className="h-9 border-zinc-300 text-zinc-700">
              <X className="mr-1.5 h-3.5 w-3.5" />
              Reset
            </Button>
          </div>

          {isAdvancedOpen && (
            <div className="mt-3 rounded-xl border border-zinc-300/85 bg-white/92 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_8px_16px_-14px_rgba(2,10,27,0.34)] backdrop-blur-[6px]">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Name</label>
                  <Input value={nameFilter} onChange={(e) => setNameFilter(e.target.value)} placeholder="Contains..." className="h-8 text-xs" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Job Title</label>
                  <Input value={jobTitleFilter} onChange={(e) => setJobTitleFilter(e.target.value)} placeholder="Contains..." className="h-8 text-xs" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Company</label>
                  <Input value={companyFilter} onChange={(e) => setCompanyFilter(e.target.value)} placeholder="Contains..." className="h-8 text-xs" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Event</label>
                  <Input value={eventTextFilter} onChange={(e) => setEventTextFilter(e.target.value)} placeholder="Contains..." className="h-8 text-xs" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Domain</label>
                  <Input value={domainFilter} onChange={(e) => setDomainFilter(e.target.value)} placeholder=".ae, .sa, company.com" className="h-8 text-xs" />
                </div>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Phone Contains</label>
                  <Input value={phoneFilter} onChange={(e) => setPhoneFilter(e.target.value)} placeholder="+971, 555..." className="h-8 text-xs" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Has Email</label>
                  <Select value={hasEmailFilter} onValueChange={(v: PresenceFilter) => setHasEmailFilter(v)}>
                    <SelectTrigger size="sm" className="h-8 text-xs shadow-none"><SelectValue /></SelectTrigger>
                    <SelectContent align="end">
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="yes">Yes</SelectItem>
                      <SelectItem value="no">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Has Phone</label>
                  <Select value={hasPhoneFilter} onValueChange={(v: PresenceFilter) => setHasPhoneFilter(v)}>
                    <SelectTrigger size="sm" className="h-8 text-xs shadow-none"><SelectValue /></SelectTrigger>
                    <SelectContent align="end">
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="yes">Yes</SelectItem>
                      <SelectItem value="no">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Has LinkedIn</label>
                  <Select value={hasLinkedinFilter} onValueChange={(v: PresenceFilter) => setHasLinkedinFilter(v)}>
                    <SelectTrigger size="sm" className="h-8 text-xs shadow-none"><SelectValue /></SelectTrigger>
                    <SelectContent align="end">
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="yes">Yes</SelectItem>
                      <SelectItem value="no">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Has Website</label>
                  <Select value={hasWebsiteFilter} onValueChange={(v: PresenceFilter) => setHasWebsiteFilter(v)}>
                    <SelectTrigger size="sm" className="h-8 text-xs shadow-none"><SelectValue /></SelectTrigger>
                    <SelectContent align="end">
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="yes">Yes</SelectItem>
                      <SelectItem value="no">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between border-t border-zinc-300/80 pt-2.5">
                <p className="text-[11px] text-zinc-500">
                  {advancedFilterCount > 0 ? `${advancedFilterCount} advanced filters active` : "No advanced filters active"}
                </p>
                <div className="flex items-center gap-1.5">
                  <Button type="button" variant="outline" onClick={clearAdvancedFilters} className="h-7 text-[11px]">Clear advanced</Button>
                  <Button type="button" variant="outline" onClick={() => setIsAdvancedOpen(false)} className="h-7 text-[11px]">Done</Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>

      <Card className="relative isolate mt-3 flex flex-col overflow-hidden rounded-2xl border border-[rgb(255_255_255_/_0.82)] bg-[linear-gradient(160deg,rgba(255,255,255,0.84)_0%,rgba(250,252,255,0.66)_56%,rgba(240,246,253,0.56)_100%)] backdrop-blur-[16px] [backdrop-filter:saturate(175%)_blur(16px)] shadow-[0_0_0_1px_rgba(255,255,255,0.82),0_0_12px_-9px_rgba(2,10,27,0.58),0_0_6px_-5px_rgba(15,23,42,0.36),inset_0_1px_0_rgba(255,255,255,1),inset_0_-2px_0_rgba(221,230,244,0.74),inset_0_0_22px_rgba(255,255,255,0.2)]">
        <div className="pointer-events-none absolute -right-24 -top-24 h-60 w-60 rounded-full bg-gradient-to-br from-sky-300/28 via-blue-500/12 to-transparent blur-3xl" />
        <div className="pointer-events-none absolute -left-24 -bottom-24 h-60 w-60 rounded-full bg-gradient-to-tr from-blue-300/18 via-sky-200/8 to-transparent blur-3xl" />

        <div className="relative z-[1] flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100/85 bg-white/45 px-4 py-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-zinc-900">Lead Explorer</h2>
            {activeFilterCount > 0 ? (
              <Badge className="rounded-full border border-zinc-300/80 bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-600 shadow-none">
                {activeFilterCount} active
              </Badge>
            ) : null}
          </div>
          <div className="flex items-center gap-1.5">
            {selectedLeadIds.size > 0 ? (
              <Badge className="rounded-md border border-zinc-300/80 bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-zinc-500 shadow-none">
                Selected {selectedLeadIds.size}
              </Badge>
            ) : null}
            <Button
              type="button"
              variant="outline"
              onClick={() => void generateContentForLeads(eligibleSelectedLeads, "selected")}
              className="h-8 border-zinc-300/80 bg-white/82 px-2.5 text-xs font-semibold text-zinc-700 shadow-none hover:border-zinc-400 hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!contentGenerationEnabled || eligibleSelectedLeads.length === 0 || isGeneratingSelectedContent}
              title={
                !contentGenerationEnabled
                  ? "Content generation is available for campaign leads"
                  : eligibleSelectedLeads.length === 0
                  ? "Select leads to generate outreach content"
                  : "Generate outreach content for selected leads"
              }
            >
              {isGeneratingSelectedContent ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="mr-1.5 h-3.5 w-3.5" />
              )}
              Generate selected
            </Button>
            <Badge className="rounded-md border border-zinc-300/80 bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-zinc-500 shadow-none">
              Total {totalLeads}
            </Badge>
            <Badge className="rounded-md border border-zinc-300/80 bg-zinc-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-zinc-500 shadow-none">
              On Page {filteredLeads.length}
            </Badge>
          </div>
        </div>

        <div className="relative z-[1] overflow-x-auto px-4 pb-2 pt-2">
          <table className="min-w-[1320px] w-full">
            <thead className="border-b border-zinc-100/85 bg-white/70">
              <tr>
                <th className="w-10 px-3 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={allSelectablePageLeadsSelected}
                    onChange={togglePageSelection}
                    disabled={selectablePageLeadIds.length === 0}
                    aria-label="Select leads on this page"
                    className="h-4 w-4 rounded border-zinc-300 text-zinc-900 accent-zinc-900 disabled:cursor-not-allowed disabled:opacity-40"
                  />
                </th>
                <th className="px-3 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-zinc-400">Event</th>
                <th className="px-3 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-zinc-400">Name</th>
                <th className="px-3 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-zinc-400">Position</th>
                <th className="px-3 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-zinc-400">Company</th>
                <th className="px-3 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-zinc-400">Email</th>
                <th className="px-3 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-zinc-400">Phone</th>
                <th className="px-3 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-zinc-400">Content</th>
                <th className="px-3 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-zinc-400">Sent</th>
                <th className="px-3 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-zinc-400">Links</th>
                <th className="px-3 py-3 text-right text-[11px] font-bold uppercase tracking-wider text-zinc-400">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-zinc-100/70">
              {paginatedLeads.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-6 py-12 text-center text-sm text-zinc-500">
                    {totalLeads > 0
                      ? "No leads on this page match the current filter combination."
                      : "No leads match the current filter combination."}
                  </td>
                </tr>
              ) : (
                paginatedLeads.map((item) => {
                  const isReadOnly = isLeadSuppressed(item);
                  const isTargetLead = targetLeadId === item.id;
                  const isSelected = selectedLeadIds.has(item.id);
                  const isGeneratingContent = generatingLeadIds.has(item.id);
                  const contentReady = hasGeneratedEmailContent(item);
                  const canGenerateContent = contentGenerationEnabled && isLeadSelectableForGeneration(item);
                  const sentChannels = isReadOnly
                    ? { whatsapp: false, email: false }
                    : getSentChannelState(item.contactState);

                  return (
                    <tr
                      key={item.id}
                      ref={isTargetLead ? targetLeadRowRef : undefined}
                      id={`lead-${item.id}`}
                      className={`group scroll-mt-24 transition-colors ${
                        isTargetLead
                          ? "bg-blue-50/85 ring-1 ring-inset ring-blue-200/90"
                          : isReadOnly
                            ? "bg-rose-50/35 hover:bg-rose-50/45"
                            : "hover:bg-white/46"
                      }`}
                    >
                    <td className="px-3 py-3 align-top">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleLeadSelection(item)}
                        disabled={!canGenerateContent || isGeneratingContent}
                        aria-label={`Select ${item.employeeName || "lead"}`}
                        className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-zinc-900 accent-zinc-900 disabled:cursor-not-allowed disabled:opacity-40"
                      />
                    </td>

                    <td className="px-3 py-3 align-top">
                      <span className="line-clamp-2 text-sm text-zinc-700">
                        {item.canonicalEventName || item.eventName || "-"}
                      </span>
                    </td>

                    <td className="px-3 py-3 align-top">
                      <span className="block text-sm font-semibold text-zinc-900">{item.employeeName || "-"}</span>
                      {item.isManualLead ? (
                        <div className="mt-1 space-y-1">
                          <span className="inline-flex w-fit rounded-full border border-zinc-300 bg-zinc-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                            Manual Lead
                          </span>
                          <span className="block text-[11px] text-zinc-400">
                            {item.manualLeadAddedByUsername
                              ? `Added by ${item.manualLeadAddedByUsername}`
                              : "Manually added"}
                          </span>
                        </div>
                      ) : null}
                    </td>

                    <td className="px-3 py-3 align-top">
                      <span className="line-clamp-2 text-sm text-zinc-700">{item.title || "-"}</span>
                      <span className="mt-0.5 block text-[11px] text-zinc-400">{positionBucket(item.title)}</span>
                    </td>

                    <td className="px-3 py-3 align-top">
                      <span className="block text-sm font-semibold text-zinc-900">{item.company || "-"}</span>
                      {item.companyUrl ? (
                        <a
                          href={item.companyUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-0.5 block w-fit max-w-[20rem] truncate text-xs text-zinc-400 hover:text-zinc-600 hover:underline"
                          title={item.companyUrl}
                        >
                          {item.companyUrl}
                        </a>
                      ) : null}
                    </td>

                    <td className="px-3 py-3 align-top">
                      <span className="font-mono text-xs text-zinc-600">{item.email || "-"}</span>
                    </td>

                    <td className="px-3 py-3 align-top">
                      <div className="space-y-1">
                        <span className="text-xs text-zinc-500">{item.phone || "-"}</span>
                        {isReadOnly ? (
                          <span className="block w-fit rounded border border-rose-200 bg-rose-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-rose-700">
                            Suppressed
                          </span>
                        ) : null}
                        {isReadOnly && (item.suppression?.source || item.suppression?.reason) ? (
                          <div className="rounded border border-rose-100 bg-rose-50/60 px-2 py-1 text-[10px] leading-relaxed text-rose-700">
                            {item.suppression?.source ? <p>Source: {item.suppression.source}</p> : null}
                            {item.suppression?.reason ? <p>Reason: {item.suppression.reason}</p> : null}
                          </div>
                        ) : null}
                      </div>
                    </td>

                    <td className="px-3 py-3 align-top">
                      <span
                        className={`inline-flex rounded-md border px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${
                          contentReady
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-zinc-300/80 bg-white text-zinc-500"
                        }`}
                      >
                        {contentReady ? "Ready" : "Needed"}
                      </span>
                      {item.contentSource ? (
                        <span className="mt-1 block max-w-[8rem] truncate text-[10px] text-zinc-400" title={item.contentSource}>
                          {item.contentSource}
                        </span>
                      ) : null}
                    </td>

                    <td className="px-3 py-3 align-top">
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-block h-3 w-3 rounded-full ${sentChannels.whatsapp ? "bg-emerald-500" : "bg-zinc-300"}`}
                          title={sentChannels.whatsapp ? "WhatsApp sent" : "WhatsApp not sent"}
                          aria-label={sentChannels.whatsapp ? "WhatsApp sent" : "WhatsApp not sent"}
                        />
                        <span
                          className={`inline-block h-3 w-3 rounded-full ${sentChannels.email ? "bg-blue-500" : "bg-zinc-300"}`}
                          title={sentChannels.email ? "Email sent" : "Email not sent"}
                          aria-label={sentChannels.email ? "Email sent" : "Email not sent"}
                        />
                      </div>
                    </td>

                    <td className="px-3 py-3 align-top">
                      <div className="flex items-center gap-3">
                        {item.linkedinUrl ? (
                          <a href={item.linkedinUrl} target="_blank" rel="noreferrer" className="text-zinc-400 transition-colors hover:text-zinc-900" title="LinkedIn">
                            <LinkedInIcon className="h-4 w-4" />
                          </a>
                        ) : (
                          <span className="text-zinc-200">
                            <LinkedInIcon className="h-4 w-4" />
                          </span>
                        )}

                        {item.companyUrl ? (
                          <a href={item.companyUrl} target="_blank" rel="noreferrer" className="text-zinc-400 transition-colors hover:text-zinc-900" title="Website">
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        ) : (
                          <span className="text-zinc-200">
                            <ExternalLink className="h-4 w-4" />
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="px-3 py-3 align-top text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => void generateContentForLeads([item], "single")}
                          className="h-8 w-8 rounded-md border border-zinc-300/80 bg-white/82 text-zinc-500 shadow-none hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700 disabled:cursor-not-allowed disabled:opacity-45"
                          title={
                            !contentGenerationEnabled
                              ? "Content generation is available for campaign leads"
                              : !canGenerateContent
                              ? isReadOnly
                                ? "Suppressed lead is read-only"
                                : "Campaign context is missing"
                              : contentReady
                                ? "Regenerate outreach content"
                                : "Generate outreach content"
                          }
                          disabled={!canGenerateContent || isGeneratingContent}
                        >
                          {isGeneratingContent ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Sparkles className="h-3.5 w-3.5" />
                          )}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => void handleCopyLeadDetails(item)}
                          className="h-8 w-8 rounded-md border border-zinc-300/80 bg-white/82 text-zinc-500 shadow-none hover:border-zinc-300 hover:bg-white hover:text-zinc-900"
                          title={isReadOnly ? "Suppressed lead is read-only" : "Copy lead details"}
                          disabled={isReadOnly}
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => openSmsDialog(item)}
                          className="h-8 w-8 rounded-md border border-zinc-300/80 bg-white/82 text-zinc-400 shadow-none hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700 disabled:cursor-not-allowed disabled:opacity-45"
                          title={
                            !hasValue(item.phone)
                              ? "Lead has no phone number"
                              : isReadOnly
                                ? "Suppressed lead is read-only"
                                : "Send SMS"
                          }
                          disabled={!hasValue(item.phone) || isReadOnly}
                        >
                          <MessageSquare className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => openDisableLeadConfirm(item)}
                          className="h-8 w-8 rounded-md border border-zinc-300/80 bg-white/82 text-zinc-400 shadow-none hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700 disabled:cursor-not-allowed disabled:opacity-45"
                          title={
                            !hasValue(item.phone) && !hasValue(item.email)
                              ? "Lead has no phone or email"
                              : isReadOnly
                                ? "Already in opt-out list"
                                : "Disable marketing for this lead"
                          }
                          disabled={(!hasValue(item.phone) && !hasValue(item.email)) || isReadOnly}
                        >
                          <PhoneOff className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {filteredLeads.length > 0 && (
          <div className="relative z-[1] flex flex-wrap items-center justify-between gap-2 border-t border-zinc-100/85 bg-white/38 px-4 py-3">
              <span className="text-xs text-zinc-500">
               Showing {showingFrom}-{showingTo} of {totalLeads} leads
              </span>

            <div className="flex flex-wrap items-center justify-end gap-2">
              <label className="inline-flex items-center gap-2 rounded-md border border-zinc-300/80 bg-white/82 px-2.5 py-1.5 text-[11px] font-medium text-zinc-600">
                <span>Rows per page</span>
                <Select
                  value={String(itemsPerPage)}
                  onValueChange={(value) => {
                    const next = Number(value);
                    if (!Number.isNaN(next)) setItemsPerPage(next);
                  }}
                >
                  <SelectTrigger size="sm" className="h-7 min-w-[4.25rem] border-zinc-300/80 bg-white/95 px-2 text-[11px] font-semibold text-zinc-800 shadow-none">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent align="end" className="border-zinc-300 bg-white/96 backdrop-blur-[10px]">
                    {PAGE_SIZE_OPTIONS.map((size) => (
                      <SelectItem key={size} value={String(size)} className="text-xs">
                        {size}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>

              <span className="text-[11px] text-zinc-500">Page {currentPage} / {totalPages}</span>

              <Button type="button" variant="outline" onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))} disabled={currentPage === 1} className="h-8 border-zinc-300/80 bg-white/82 px-2 text-zinc-600 shadow-none disabled:opacity-40">
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>

              {visiblePageNumbers.map((pageNum) => (
                <button
                  key={pageNum}
                  type="button"
                  onClick={() => setCurrentPage(pageNum)}
                  className={`h-8 min-w-8 rounded-md border px-2 text-xs font-semibold transition-colors ${
                    pageNum === currentPage
                      ? "border-zinc-300 bg-zinc-900 text-white"
                      : "border-zinc-300/80 bg-white/82 text-zinc-600 hover:border-zinc-300 hover:text-zinc-900"
                  }`}
                >
                  {pageNum}
                </button>
              ))}

              <Button type="button" variant="outline" onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages} className="h-8 border-zinc-300/80 bg-white/82 px-2 text-zinc-600 shadow-none disabled:opacity-40">
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {smsTargetLead ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/60 p-4 backdrop-blur-sm"
          onMouseDown={closeSmsDialog}
        >
          <div
            className="w-full max-w-lg overflow-hidden rounded-xl border border-zinc-300 bg-white shadow-2xl"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="border-b border-zinc-100 bg-zinc-50/60 px-6 py-4">
              <h3 className="text-lg font-semibold text-zinc-900">Send SMS</h3>
              <p className="mt-1 text-xs text-zinc-500">
                <span className="font-semibold text-zinc-900">{smsTargetLead.employeeName || "Lead"}</span>
                {smsTargetLead.phone ? ` | ${smsTargetLead.phone}` : ""}
              </p>
            </div>

            <div className="space-y-3 px-6 py-5">
              <label className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                Message
              </label>
              <textarea
                value={smsMessage}
                onChange={(event) => setSmsMessage(event.target.value.slice(0, 1600))}
                rows={6}
                className="w-full resize-none rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm leading-6 text-zinc-800 outline-none transition focus:border-zinc-400 focus:ring-1 focus:ring-zinc-300"
                placeholder="Write the SMS message..."
                disabled={isSendingSms}
              />
              <div className="flex justify-end text-[11px] text-zinc-400">
                {smsMessage.trim().length}/1600
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-zinc-100 bg-zinc-50/50 px-6 py-4">
              <Button
                variant="outline"
                className="border-zinc-300 text-zinc-700 hover:bg-zinc-50"
                onClick={closeSmsDialog}
                disabled={isSendingSms}
              >
                Cancel
              </Button>
              <Button
                className="bg-zinc-900 text-white hover:bg-zinc-800"
                onClick={() => void handleSendAdminSms()}
                disabled={isSendingSms || smsMessage.trim().length === 0}
              >
                {isSendingSms ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Send
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {disableTargetLead ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/60 p-4 backdrop-blur-sm"
          onMouseDown={closeDisableLeadConfirm}
        >
          <div
            className="w-full max-w-md overflow-hidden rounded-xl border border-zinc-300 bg-white shadow-2xl"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="border-b border-zinc-100 bg-zinc-50/60 px-6 py-4">
              <h3 className="text-lg font-semibold text-zinc-900">Add Lead to Opt-Out</h3>
              <p className="mt-1 text-xs text-zinc-500">
                Block <span className="font-semibold text-zinc-900">{disableTargetLead.employeeName}</span> from future marketing outreach.
              </p>
            </div>

            <div className="space-y-4 px-6 py-5">
              <div className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-800">
                This will suppress the lead across marketing actions, even if you do not remember the original campaign.
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                  Reason
                </label>
                <textarea
                  value={disableReason}
                  onChange={(event) => setDisableReason(event.target.value)}
                  placeholder="Optional note for why this lead is being opted out"
                  rows={4}
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-700 outline-none transition focus:border-zinc-300 focus:ring-1 focus:ring-zinc-300"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-zinc-100 bg-zinc-50/50 px-6 py-4">
              <Button
                variant="outline"
                className="border-zinc-300 text-zinc-700 hover:bg-zinc-50"
                onClick={closeDisableLeadConfirm}
                disabled={isDisablingLead}
              >
                Cancel
              </Button>
              <Button
                className="bg-zinc-900 text-white hover:bg-zinc-800"
                onClick={() => void handleConfirmDisableLead()}
                disabled={isDisablingLead}
              >
                {isDisablingLead ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Add to Opt-Out
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {uploadOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/60 backdrop-blur-sm p-4"
          onMouseDown={() => {
            if (!uploading) setUploadOpen(false);
          }}
        >
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-xl overflow-hidden" onMouseDown={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
              <div>
                <h3 className="text-lg font-semibold text-zinc-900">Upload Files</h3>
                <p className="text-xs text-zinc-500">Drag and drop or choose files to upload</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-zinc-400 hover:text-zinc-900"
                onClick={() => {
                  if (!uploading) setUploadOpen(false);
                }}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="p-6 space-y-4">
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDrop}
                className={[
                  "rounded-xl border border-dashed p-6 text-center transition-colors",
                  dragOver ? "border-zinc-900 bg-zinc-50" : "border-zinc-300 bg-white",
                ].join(" ")}
              >
                <div className="mx-auto h-12 w-12 rounded-xl border border-zinc-300 bg-white flex items-center justify-center">
                  <UploadCloud className="h-6 w-6 text-zinc-500" />
                </div>
                <p className="mt-3 text-sm font-semibold text-zinc-900">Drag and drop files here</p>
                <p className="mt-1 text-xs text-zinc-500">or click below to select files</p>

                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.length) addFiles(e.target.files);
                    e.currentTarget.value = "";
                  }}
                />

                <Button
                  variant="outline"
                  className="mt-4 border-zinc-300 text-zinc-700 hover:bg-zinc-50"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  <FileUp className="mr-2 h-4 w-4" />
                  Choose files
                </Button>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">Selected</p>

                {selectedFiles.length === 0 ? (
                  <p className="text-sm text-zinc-500">No files selected.</p>
                ) : (
                  <div className="max-h-40 overflow-y-auto rounded-lg border border-zinc-100">
                    {selectedFiles.map((f, idx) => (
                      <div
                        key={`${f.name}-${f.size}`}
                        className="flex items-center justify-between px-3 py-2 text-sm border-b last:border-b-0 border-zinc-100"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-zinc-900">{f.name}</p>
                          <p className="text-xs text-zinc-400">{Math.round(f.size / 1024)} KB</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-zinc-400 hover:text-red-600"
                          onClick={() => removeFile(idx)}
                          disabled={uploading}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="px-6 py-4 border-t border-zinc-100 bg-zinc-50/50 flex justify-end gap-2">
              <Button variant="outline" className="border-zinc-300 text-zinc-700 hover:bg-zinc-50" onClick={() => setUploadOpen(false)} disabled={uploading}>
                Cancel
              </Button>

              <Button className="bg-zinc-900 text-white hover:bg-zinc-800" onClick={uploadSelectedFiles} disabled={uploading || selectedFiles.length === 0}>
                {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Upload
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function LeadsPage() {
  const { isSuperAdmin } = useAuth();
  return isSuperAdmin ? <SuperAdminTotalLeads /> : <NormalUserEventLeadSheet />;
}
