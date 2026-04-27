"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
} from "lucide-react";
import { toast } from "sonner";
import { disableLeadWhatsApp, getApiKeyClient } from "@/lib/apiRouter";
import { usePersona } from "@/hooks/usePersona";
import { useAuth } from "@/hooks/useAuth";
import { NormalUserEventLeadSheet } from "@/components/leads/NormalUserEventLeadSheet";

const GET_ALL_LEADS_ENDPOINT = "/api/all/leads";
const PAGE_SIZE_OPTIONS = [15, 25, 50, 100] as const;

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
type OutreachState = "pending" | "queued" | "sending" | "sent" | "failed";

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
  eventName: string;
  employeeName: string;
  title: string;
  company: string;
  email: string;
  phone: string;
  linkedinUrl: string;
  companyUrl: string;
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

function normalizeLookupText(value: string) {
  return value.trim().toLowerCase().replaceAll(/\s+/g, " ");
}

function normalizeLookupPhone(value: string) {
  return value.replaceAll(/\D+/g, "");
}

function buildLookupKeys(source: Record<string, unknown>) {
  const id = asText(source.id).trim();
  const name = normalizeLookupText(asText(source.employeeName) || asText(source.employee_name));
  const company = normalizeLookupText(asText(source.company) || asText(source.companyName));
  const email = normalizeLookupText(asText(source.email));
  const phone = normalizeLookupPhone(asText(source.phone));
  const keys = new Set<string>();

  if (id) keys.add(`id:${id}`);
  if (name && email) keys.add(`name_email:${name}|${email}`);
  if (name && phone) keys.add(`name_phone:${name}|${phone}`);
  if (name && company && email) keys.add(`name_company_email:${name}|${company}|${email}`);
  if (name && company && phone) keys.add(`name_company_phone:${name}|${company}|${phone}`);

  return Array.from(keys);
}

const CONTACT_STATE_SCORE: Record<ContactState, number> = {
  unknown: 0,
  not_contacted: 1,
  in_progress: 2,
  email: 3,
  whatsapp: 3,
  both: 4,
};

function pickBetterContactState(current: ContactState, next: ContactState) {
  return CONTACT_STATE_SCORE[next] > CONTACT_STATE_SCORE[current] ? next : current;
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

function normalizeOutreachState(value: unknown): OutreachState {
  const v = String(value || "").toLowerCase();
  if (v === "pending" || v === "queued" || v === "sending" || v === "sent" || v === "failed") return v;
  return "pending";
}

function extractOutreachStatus(source: Record<string, unknown>) {
  const direct = asRecord(source.outreachStatus);
  const fromDraftMeta =
    asRecord(asRecord(asRecord(source.draft)?.meta)?.outreach) ??
    asRecord(asRecord(source.draft_meta)?.outreach) ??
    asRecord(asRecord(source.draftMeta)?.outreach);

  const picked = direct ?? fromDraftMeta;
  if (!picked) return null;

  return {
    email: normalizeOutreachState(picked.email),
    linkedin: normalizeOutreachState(picked.linkedin),
    whatsapp: normalizeOutreachState(picked.whatsapp),
  };
}

function buildOutreachStatus(source: Record<string, unknown>) {
  const extracted = extractOutreachStatus(source);
  if (extracted) return extracted;

  const draftStatus = String(source.draftStatus || source.draft_status || "").toLowerCase();
  if (draftStatus === "sent") return { email: "sent", linkedin: "sent", whatsapp: "sent" } as const;
  if (draftStatus === "queued") return { email: "queued", linkedin: "pending", whatsapp: "queued" } as const;
  if (draftStatus === "sending") return { email: "sending", linkedin: "pending", whatsapp: "sending" } as const;
  if (draftStatus === "failed") return { email: "failed", linkedin: "pending", whatsapp: "failed" } as const;
  return { email: "pending", linkedin: "pending", whatsapp: "pending" } as const;
}

function deriveContactStateFromCampaignLead(source: Record<string, unknown>): ContactState {
  const approval = normalizeApprovalStatus(source.approvalStatus);
  const outreach = buildOutreachStatus(source);
  const suppressed =
    approval === "suppressed" ||
    parseBoolean(source.isSuppressed) ||
    parseBoolean(source.contactReadOnly) ||
    parseBoolean(asRecord(source.suppression)?.active);

  if (suppressed) return "not_contacted";

  if (outreach.email === "sent" && outreach.whatsapp === "sent") return "both";
  if (outreach.whatsapp === "sent") return "whatsapp";
  if (outreach.email === "sent") return "email";
  if (outreach.email === "queued" || outreach.email === "sending" || outreach.whatsapp === "queued" || outreach.whatsapp === "sending") {
    return "in_progress";
  }

  if (approval === "approved" || approval === "rejected" || approval === "pending") return "not_contacted";
  return "unknown";
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

function matchesPresence(value: string, filter: PresenceFilter) {
  if (filter === "all") return true;
  const present = hasValue(value);
  return filter === "yes" ? present : !present;
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

function SuperAdminTotalLeads() {
  const { persona } = usePersona();
  const api = useMemo(() => getApiKeyClient(persona), [persona]);

  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState<Lead[]>([]);

  const [q, setQ] = useState("");
  const [eventFilter, setEventFilter] = useState<string>("all");
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
  const [itemsPerPage, setItemsPerPage] = useState<number>(15);

  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [disableTargetLead, setDisableTargetLead] = useState<Lead | null>(null);
  const [disableReason, setDisableReason] = useState("");
  const [isDisablingLead, setIsDisablingLead] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const activeStatusSyncRef = useRef(0);

  const fetchCampaignLeadStatusMap = useCallback(async () => {
    const lookup = new Map<string, ContactState>();

    const campaignIds: string[] = [];
    let offset = 0;
    let hasMore = true;
    const limit = 100;

    while (hasMore) {
      const res = await api.get("/api/campaigns", { params: { status: "all", limit, offset } });
      const rows = Array.isArray(res.data?.campaigns) ? (res.data.campaigns as Array<Record<string, unknown>>) : [];

      for (const row of rows) {
        const id = asText(row.id).trim();
        if (id) campaignIds.push(id);
      }

      hasMore = Boolean(res.data?.hasMore) && rows.length > 0;
      offset += limit;
      if (offset >= 5000) break;
    }

    const uniqueCampaignIds = Array.from(new Set(campaignIds));
    const chunkSize = 6;

    for (let i = 0; i < uniqueCampaignIds.length; i += chunkSize) {
      const chunk = uniqueCampaignIds.slice(i, i + chunkSize);
      const chunkResponses = await Promise.all(
        chunk.map((campaignId) =>
          api.get(`/api/campaigns/${campaignId}/leads`, { params: { status: "all" } }).catch(() => null)
        )
      );

      for (const response of chunkResponses) {
        const rows = Array.isArray(response?.data?.leads) ? (response?.data?.leads as Array<Record<string, unknown>>) : [];
        for (const row of rows) {
          const state = deriveContactStateFromCampaignLead(row);
          const keys = buildLookupKeys(row);
          for (const key of keys) {
            const prev = lookup.get(key) ?? "unknown";
            lookup.set(key, pickBetterContactState(prev, state));
          }
        }
      }
    }

    return lookup;
  }, [api]);

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

  const fetchAllLeads = useCallback(async () => {
    const syncRun = Date.now();
    activeStatusSyncRef.current = syncRun;
    setLoading(true);
    try {
      const res = await api.get(GET_ALL_LEADS_ENDPOINT);
      const raw = Array.isArray(res.data) ? res.data : Array.isArray(res.data?.leads) ? res.data.leads : [];

      const mapped: Lead[] = raw.map((x: Record<string, unknown>) => ({
        id: asText(x.id),
        eventName:
          asText(x.eventName) ||
          asText(x.event) ||
          asText(x.campaignName) ||
          asText(x.icpName) ||
          asText(x.icpPreview) ||
          "Unknown Event",
        employeeName: asText(x.employeeName) || asText(x.employee_name),
        title: asText(x.title),
        company: asText(x.company) || asText(x.companyName),
        email: asText(x.email),
        phone: asText(x.phone),
        linkedinUrl: asText(x.linkedinUrl) || asText(x.linkedin_url),
        companyUrl: asText(x.companyUrl) || asText(x.company_url),
        contactState: deriveContactState(x),
        approvalStatus: normalizeApprovalStatus(x.approvalStatus),
        isSuppressed: parseBoolean(x.isSuppressed),
        contactReadOnly: parseBoolean(x.contactReadOnly),
        suppression: normalizeSuppression(x.suppression),
        isManualLead: parseBoolean(x.isManualLead),
        manualLeadAddedByUsername: asText(x.manualLeadAddedByUsername),
        manualLeadAddedAt: asText(x.manualLeadAddedAt),
      }));

      setLeads(mapped);

      void (async () => {
        try {
          const lookup = await fetchCampaignLeadStatusMap();
          if (activeStatusSyncRef.current !== syncRun) return;
          if (lookup.size === 0) return;

          setLeads((prev) =>
            prev.map((lead) => {
              if (isLeadSuppressed(lead)) {
                return lead.contactState === "not_contacted"
                  ? lead
                  : { ...lead, contactState: "not_contacted" };
              }

              const keys = buildLookupKeys({
                id: lead.id,
                employeeName: lead.employeeName,
                company: lead.company,
                email: lead.email,
                phone: lead.phone,
              });

              let nextState = lead.contactState;
              for (const key of keys) {
                const mappedState = lookup.get(key);
                if (!mappedState) continue;
                nextState = pickBetterContactState(nextState, mappedState);
              }

              return nextState === lead.contactState ? lead : { ...lead, contactState: nextState };
            })
          );
        } catch {
          // Non-blocking: keep base rows even if status enrichment fails.
        }
      })();
    } catch (e: unknown) {
      toast.error("Failed to load leads", {
        description: e instanceof Error ? e.message : "Could not fetch leads.",
      });
    } finally {
      setLoading(false);
    }
  }, [api, fetchCampaignLeadStatusMap]);

  useEffect(() => {
    void fetchAllLeads();
  }, [persona, fetchAllLeads]);

  const eventOptions = useMemo(() => {
    const set = new Set<string>();
    for (const l of leads) if (l.eventName.trim()) set.add(l.eventName.trim());
    return Array.from(set)
      .map((value) => ({ value, label: formatEventLabel(value) }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [leads]);

  const positionOptions = useMemo(() => {
    const set = new Set<string>();
    for (const l of leads) set.add(positionBucket(l.title));
    const arr = Array.from(set);

    const preferred = [
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
    ];

    return preferred.filter((p) => arr.includes(p)).concat(arr.filter((x) => !preferred.includes(x)).sort());
  }, [leads]);
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

      if (eventFilter !== "all" && lead.eventName !== eventFilter) return false;
      if (positionFilter !== "all" && positionBucket(lead.title) !== positionFilter) return false;

      if (nameNeedle && !name.includes(nameNeedle)) return false;
      if (jobTitleNeedle && !title.includes(jobTitleNeedle)) return false;
      if (companyNeedle && !company.includes(companyNeedle)) return false;
      if (eventNeedle && !eventName.includes(eventNeedle)) return false;

      if (domainNeedle && !`${email} ${website}`.includes(domainNeedle)) return false;
      if (phoneNeedle && !normalizePhone(phone).includes(phoneNeedle)) return false;

      if (!matchesPresence(lead.email, hasEmailFilter)) return false;
      if (!matchesPresence(lead.phone, hasPhoneFilter)) return false;
      if (!matchesPresence(lead.linkedinUrl, hasLinkedinFilter)) return false;
      if (!matchesPresence(lead.companyUrl, hasWebsiteFilter)) return false;
      if (!query) return true;

      return scoreLead(lead, query) > 0;
    });

    if (!query) {
      if (sortBy === "relevance") return sortLeads(scoped, "name_asc");
      return sortLeads(scoped, sortBy);
    }

    if (sortBy === "relevance") {
      return scoped
        .map((lead) => ({ lead, score: scoreLead(lead, query) }))
        .sort((a, b) => b.score - a.score)
        .map((entry) => entry.lead);
    }

    return sortLeads(scoped, sortBy);
  }, [
    leads,
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
  ]);

  const totalPages = Math.max(1, Math.ceil(filteredLeads.length / itemsPerPage));

  const paginatedLeads = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredLeads.slice(start, start + itemsPerPage);
  }, [filteredLeads, currentPage, itemsPerPage]);

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
      await fetchAllLeads();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { detail?: string } }; message?: string };
      toast.error("Failed to disable marketing", {
        description: err.response?.data?.detail || err.message || "Please try again.",
      });
    } finally {
      setIsDisablingLead(false);
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

  const showingFrom = filteredLeads.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const showingTo = filteredLeads.length === 0 ? 0 : Math.min(currentPage * itemsPerPage, filteredLeads.length);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
      </div>
    );
  }

  return (
    <div className="font-sans min-h-screen bg-transparent p-1">
      <div className="relative overflow-hidden rounded-2xl border border-[rgb(255_255_255_/_0.82)] bg-[linear-gradient(160deg,rgba(255,255,255,0.88)_0%,rgba(250,252,255,0.72)_56%,rgba(240,246,253,0.58)_100%)] px-4 pb-4 pt-3 shadow-[0_0_0_1px_rgba(255,255,255,0.82),0_0_12px_-9px_rgba(2,10,27,0.58),0_0_6px_-5px_rgba(15,23,42,0.36),inset_0_1px_0_rgba(255,255,255,1),inset_0_-2px_0_rgba(221,230,244,0.74)] backdrop-blur-[14px] [backdrop-filter:saturate(168%)_blur(14px)]">
        <div className="pointer-events-none absolute -right-16 -top-16 h-36 w-36 rounded-full bg-gradient-to-br from-sky-300/34 via-blue-500/16 to-transparent blur-3xl" />
        <div className="pointer-events-none absolute -left-20 -bottom-16 h-44 w-44 rounded-full bg-gradient-to-tr from-blue-300/20 via-sky-200/8 to-transparent blur-3xl" />

        <div className="relative z-[1] flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Nizo Finder</h1>
            <p className="mt-1 text-sm text-zinc-500">Professional lead discovery with precision filtering and clean data views.</p>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => void fetchAllLeads()} className="h-10 border-zinc-200/90 bg-white/82 text-zinc-700 shadow-none hover:border-zinc-300 hover:bg-white">
              <RefreshCcw className="mr-2 h-4 w-4" />
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
                className="h-9 border-zinc-200/85 bg-white/90 pl-8 text-sm"
              />
            </div>

            <Select value={eventFilter} onValueChange={setEventFilter}>
              <SelectTrigger size="sm" className="h-9 min-w-[10rem] border-zinc-200/80 bg-white/90 text-xs font-semibold shadow-none">
                <SelectValue placeholder="All Events" />
              </SelectTrigger>
              <SelectContent align="end" className="border-zinc-200 bg-white/96 backdrop-blur-[10px]">
                <SelectItem value="all">All Events</SelectItem>
                {eventOptions.map((eventOption) => (
                  <SelectItem key={eventOption.value} value={eventOption.value}>
                    {eventOption.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={positionFilter} onValueChange={setPositionFilter}>
              <SelectTrigger size="sm" className="h-9 min-w-[8rem] border-zinc-200/80 bg-white/90 text-xs font-semibold shadow-none">
                <SelectValue placeholder="All Positions" />
              </SelectTrigger>
              <SelectContent align="end" className="border-zinc-200 bg-white/96 backdrop-blur-[10px]">
                <SelectItem value="all">All Positions</SelectItem>
                {positionOptions.map((p) => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={(value: SortBy) => setSortBy(value)}>
              <SelectTrigger size="sm" className="h-9 min-w-[8.5rem] border-zinc-200/80 bg-white/90 text-xs font-semibold shadow-none">
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent align="end" className="border-zinc-200 bg-white/96 backdrop-blur-[10px]">
                <SelectItem value="relevance">Relevance</SelectItem>
                <SelectItem value="name_asc">Name A-Z</SelectItem>
                <SelectItem value="name_desc">Name Z-A</SelectItem>
                <SelectItem value="company_asc">Company A-Z</SelectItem>
                <SelectItem value="company_desc">Company Z-A</SelectItem>
                <SelectItem value="event_asc">Event A-Z</SelectItem>
                <SelectItem value="position_asc">Position</SelectItem>
              </SelectContent>
            </Select>

            <Button type="button" variant="outline" onClick={() => setIsAdvancedOpen((prev) => !prev)} className="h-9 border-zinc-200 text-zinc-700">
              <SlidersHorizontal className="mr-1.5 h-3.5 w-3.5" />
              Filters
              {advancedFilterCount > 0 ? <span className="ml-1 text-[10px]">({advancedFilterCount})</span> : null}
            </Button>

            <Button type="button" variant="outline" onClick={resetFilters} className="h-9 border-zinc-200 text-zinc-700">
              <X className="mr-1.5 h-3.5 w-3.5" />
              Reset
            </Button>
          </div>

          {isAdvancedOpen && (
            <div className="mt-3 rounded-xl border border-zinc-200/85 bg-white/92 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_8px_16px_-14px_rgba(2,10,27,0.34)] backdrop-blur-[6px]">
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

              <div className="mt-3 flex items-center justify-between border-t border-zinc-200/80 pt-2.5">
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
              <Badge className="rounded-full border border-zinc-200/80 bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-600 shadow-none">
                {activeFilterCount} active
              </Badge>
            ) : null}
          </div>
          <div className="flex items-center gap-1.5">
            <Badge className="rounded-md border border-zinc-200/80 bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-zinc-500 shadow-none">
              Total {leads.length}
            </Badge>
            <Badge className="rounded-md border border-zinc-200/80 bg-zinc-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-zinc-500 shadow-none">
              Filtered {filteredLeads.length}
            </Badge>
          </div>
        </div>

        <div className="relative z-[1] overflow-x-auto px-4 pb-2 pt-2">
          <table className="min-w-[1180px] w-full">
            <thead className="border-b border-zinc-100/85 bg-white/70">
              <tr>
                <th className="px-3 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-zinc-400">Event</th>
                <th className="px-3 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-zinc-400">Name</th>
                <th className="px-3 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-zinc-400">Position</th>
                <th className="px-3 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-zinc-400">Company</th>
                <th className="px-3 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-zinc-400">Email</th>
                <th className="px-3 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-zinc-400">Phone</th>
                <th className="px-3 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-zinc-400">Sent</th>
                <th className="px-3 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-zinc-400">Links</th>
                <th className="px-3 py-3 text-right text-[11px] font-bold uppercase tracking-wider text-zinc-400">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-zinc-100/70">
              {paginatedLeads.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-sm text-zinc-500">
                    No leads match the current filter combination.
                  </td>
                </tr>
              ) : (
                paginatedLeads.map((item) => {
                  const isReadOnly = isLeadSuppressed(item);
                  const sentChannels = isReadOnly
                    ? { whatsapp: false, email: false }
                    : getSentChannelState(item.contactState);

                  return (
                    <tr
                      key={item.id}
                      className={`group transition-colors ${isReadOnly ? "bg-rose-50/35 hover:bg-rose-50/45" : "hover:bg-white/46"}`}
                    >
                    <td className="px-3 py-3 align-top">
                      <span className="line-clamp-2 text-sm text-zinc-700">
                        {item.eventName ? formatEventLabel(item.eventName) : "-"}
                      </span>
                    </td>

                    <td className="px-3 py-3 align-top">
                      <span className="block text-sm font-semibold text-zinc-900">{item.employeeName || "-"}</span>
                      {item.isManualLead ? (
                        <div className="mt-1 space-y-1">
                          <span className="inline-flex w-fit rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
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
                          onClick={() => void handleCopyLeadDetails(item)}
                          className="h-8 w-8 rounded-md border border-zinc-200/80 bg-white/82 text-zinc-500 shadow-none hover:border-zinc-300 hover:bg-white hover:text-zinc-900"
                          title={isReadOnly ? "Suppressed lead is read-only" : "Copy lead details"}
                          disabled={isReadOnly}
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => openDisableLeadConfirm(item)}
                          className="h-8 w-8 rounded-md border border-zinc-200/80 bg-white/82 text-zinc-400 shadow-none hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700 disabled:cursor-not-allowed disabled:opacity-45"
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
              Showing {showingFrom}-{showingTo} of {filteredLeads.length} leads
            </span>

            <div className="flex flex-wrap items-center justify-end gap-2">
              <label className="inline-flex items-center gap-2 rounded-md border border-zinc-200/80 bg-white/82 px-2.5 py-1.5 text-[11px] font-medium text-zinc-600">
                <span>Rows per page</span>
                <Select
                  value={String(itemsPerPage)}
                  onValueChange={(value) => {
                    const next = Number(value);
                    if (!Number.isNaN(next)) setItemsPerPage(next);
                  }}
                >
                  <SelectTrigger size="sm" className="h-7 min-w-[4.25rem] border-zinc-200/80 bg-white/95 px-2 text-[11px] font-semibold text-zinc-800 shadow-none">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent align="end" className="border-zinc-200 bg-white/96 backdrop-blur-[10px]">
                    {PAGE_SIZE_OPTIONS.map((size) => (
                      <SelectItem key={size} value={String(size)} className="text-xs">
                        {size}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>

              <span className="text-[11px] text-zinc-500">Page {currentPage} / {totalPages}</span>

              <Button type="button" variant="outline" onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))} disabled={currentPage === 1} className="h-8 border-zinc-200/80 bg-white/82 px-2 text-zinc-600 shadow-none disabled:opacity-40">
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
                      : "border-zinc-200/80 bg-white/82 text-zinc-600 hover:border-zinc-300 hover:text-zinc-900"
                  }`}
                >
                  {pageNum}
                </button>
              ))}

              <Button type="button" variant="outline" onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages} className="h-8 border-zinc-200/80 bg-white/82 px-2 text-zinc-600 shadow-none disabled:opacity-40">
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {disableTargetLead ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/60 p-4 backdrop-blur-sm"
          onMouseDown={closeDisableLeadConfirm}
        >
          <div
            className="w-full max-w-md overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-2xl"
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
                  className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 outline-none transition focus:border-zinc-300 focus:ring-1 focus:ring-zinc-200"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-zinc-100 bg-zinc-50/50 px-6 py-4">
              <Button
                variant="outline"
                className="border-zinc-200 text-zinc-700 hover:bg-zinc-50"
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
                  dragOver ? "border-zinc-900 bg-zinc-50" : "border-zinc-200 bg-white",
                ].join(" ")}
              >
                <div className="mx-auto h-12 w-12 rounded-xl border border-zinc-200 bg-white flex items-center justify-center">
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
                  className="mt-4 border-zinc-200 text-zinc-700 hover:bg-zinc-50"
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
              <Button variant="outline" className="border-zinc-200 text-zinc-700 hover:bg-zinc-50" onClick={() => setUploadOpen(false)} disabled={uploading}>
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
