"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { AxiosInstance } from "axios";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Mail,
  CheckCircle,
  Clock,
  XCircle,
  Eye,
  X,
  Copy,
  Download,
  Filter,
  ExternalLink,
  Search,
  Save,
  Loader2,
  Trash2,
  RotateCcw,
  Paperclip,
  UploadCloud,
  PhoneOff,
  Play,
  MessageSquare,
  Sparkles,
  Square,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useParams, useRouter } from "next/navigation";
import {
  approveSelectedCampaignLeads,
  deleteCampaignEmailTemplate,
  generateSelectedCampaignLeadContent,
  getCampaignEmailTemplate,
  resetLeadContent,
  resetSelectedCampaignLeadContent,
  type CampaignImportSummary,
  type CampaignEmailTemplateDeleteFallbackDrafts,
  type CampaignEmailTemplateFallbackDrafts,
  type ChannelCapabilities,
  disableLeadWhatsApp,
  getApiKeyClient,
  listWhatsAppOptOuts,
  saveCampaignEmailTemplate,
  sendAdminLeadSms,
  sendSelectedCampaignLeads,
  type SuppressionMeta,
  type WhatsAppOptOutItem,
  uploadCampaignCommonAttachment,
} from "@/lib/apiRouter";
import { consumeCampaignUploadSummary } from "@/lib/campaignUploadSummary";
import { usePersona } from "@/hooks/usePersona";
import { useAuth } from "@/hooks/useAuth";

// -----------------------------
// Custom LinkedIn Icon
// -----------------------------
const LinkedInIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M20.5 2h-17A1.5 1.5 0 002 3.5v17A1.5 1.5 0 003.5 22h17a1.5 1.5 0 001.5-1.5v-17A1.5 1.5 0 0020.5 2zM8 19H5v-9h3zM6.5 8.25A1.75 1.75 0 118.3 6.5a1.78 1.78 0 01-1.8 1.75zM19 19h-3v-4.74c0-1.22-.44-2.12-1.54-2.12a1.6 1.6 0 00-1.58 1.14 2.17 2.17 0 00-.1 1.08V19h-3v-9h2.9v1.3a3.11 3.11 0 012.7-1.4c1.95 0 3.52 1.27 3.52 4z" />
  </svg>
);

const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M12.04 2C6.5 2 2 6.4 2 11.84c0 1.93.58 3.81 1.67 5.43L2.28 22l4.94-1.29a10.15 10.15 0 004.82 1.21h.01c5.54 0 10.04-4.4 10.04-9.84C22.09 6.4 17.59 2 12.04 2zm0 18.18h-.01a8.43 8.43 0 01-4.28-1.16l-.31-.18-2.94.77.79-2.84-.2-.33a8.08 8.08 0 01-1.27-4.36c0-4.47 3.69-8.11 8.22-8.11 2.2 0 4.26.84 5.81 2.37a8 8 0 012.41 5.73c0 4.47-3.69 8.11-8.22 8.11zm4.5-6.02c-.25-.12-1.49-.73-1.72-.81-.23-.08-.4-.12-.57.12-.17.24-.65.81-.8.97-.15.16-.29.18-.54.06-.25-.12-1.05-.38-2-1.2-.74-.64-1.24-1.44-1.38-1.68-.15-.24-.02-.37.11-.49.12-.12.25-.3.37-.45.12-.14.16-.24.25-.4.08-.16.04-.3-.02-.42-.06-.12-.57-1.36-.78-1.86-.21-.5-.43-.43-.57-.44h-.49c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2 0 1.18.86 2.32.98 2.48.12.16 1.69 2.68 4.16 3.65 2.48.97 2.48.65 2.92.61.44-.04 1.49-.61 1.7-1.2.21-.59.21-1.09.15-1.2-.06-.1-.23-.16-.48-.28z" />
  </svg>
);

type ApprovalStatus = "pending" | "approved" | "rejected" | "suppressed";
type OutreachState = "pending" | "queued" | "sending" | "sent" | "failed";
type AttachmentChannel = "email" | "whatsapp" | "common";
type LeadFilterKey = "new" | "sent" | "rejected" | "suppressed";
type LeadSendAction = "both" | "email" | "whatsapp";

const FOLLOW_UP_STEPS = ["1st follow-up", "2nd follow-up", "3rd follow-up", "Final follow-up"] as const;
type FollowUpTemplate = {
  id?: string;
  stage: number;
  subject: string;
  body: string;
  isActive: boolean;
  updatedAt?: string | null;
};
type FollowUpHistoryItem = {
  id: string;
  stage: number;
  status: "draft" | "queued" | "sent" | "failed";
  subject: string;
  sentAt?: string | null;
  errorMessage?: string | null;
};

const createEmptyFollowUpTemplates = (): Record<number, FollowUpTemplate> =>
  Object.fromEntries(
    FOLLOW_UP_STEPS.map((_, index) => [index + 1, { stage: index + 1, subject: "", body: "", isActive: true }])
  ) as Record<number, FollowUpTemplate>;
type BulkSendChannel = "email" | "whatsapp";
type LeadContentSource = "template" | "generated" | "manual" | "empty" | "unknown";
type ContentGenerationQueueStatus = "idle" | "running" | "stopping" | "paused";
type GenerationFailureStatus = "validator_rejected" | "qa_failed" | "generation_failed";

// const OUTREACH_REQUEST_TIMEOUT_MS = 15_000;
const OUTREACH_REQUEST_TIMEOUT_MS = 0;


type GenerationFailureInfo = {
  status: GenerationFailureStatus;
  stage: string;
  title: string;
  reason: string;
  guidance: string;
  details: string[];
  metrics: Array<{
    label: string;
    actual: string;
    expected: string;
    status?: string;
  }>;
  evidence: string[];
};

type ContentGenerationStats = {
  total: number;
  completed: number;
  generated: number;
  failed: number;
  suppressed: number;
};

type ContentGenerationQueueState = ContentGenerationStats & {
  status: ContentGenerationQueueStatus;
  currentLeadId: string | null;
  remainingLeadIds: string[];
};

type Attachment = {
  id: string;
  name: string;
  url?: string;
  mime?: string;
  sizeBytes?: number;
  channel?: AttachmentChannel; // optional but helpful
};

type PendingUpload = {
  tempId: string;
  file: File;
  name: string;
  mime: string;
  sizeBytes: number;
  uploading?: boolean;
  error?: string;
};

interface Lead {
  id: string;
  draftId?: string | null;
  draftStatus?: string | null;
  draftMeta?: Record<string, unknown> | null;
  generationFailure?: GenerationFailureInfo | null;

  batchId?: string;
  employeeName: string;
  title: string;
  company: string;
  email: string;
  phone: string;
  linkedinUrl: string;
  companyUrl: string;

  contentEmailSubject: string;
  contentEmail: string;
  contentLinkedin: string;
  contentWhatsapp: string;

  reviewStatus?: string | null;
  approvalStatus: ApprovalStatus;
  isSuppressed?: boolean;
  suppression?: SuppressionMeta | null;
  contactReadOnly?: boolean;
  sendable?: boolean;
  channelCapabilities?: ChannelCapabilities | null;
  contentSource?: LeadContentSource | string | null;
  templateFallback?: boolean;

  outreachStatus?: {
    email: OutreachState;
    linkedin: OutreachState;
    whatsapp: OutreachState;
  };

  // ✅ Separate attachments
  emailAttachments?: Attachment[];
  whatsappAttachments?: Attachment[];

  whatsappOptedOut?: boolean;
  whatsappOptOutSource?: string | null;
  whatsappOptOutReason?: string | null;
  whatsappOptOutPhoneE164?: string | null;
}

interface CampaignDetail {
  id: string;
  name: string;
  icpPreview: string;
  status: string;
  category?: string | null;
  location?: string | null;
  date?: string | null;
  createdAt: string;
  stats: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    suppressed: number;
    sendableApproved: number;
  };
}

type LeadExportRow = {
  campaignTitle: string;
  name: string;
  title: string;
  company: string;
  email: string;
  phone: string;
  linkedinUrl: string;
  companyUrl: string;
};

const approvalStyles = {
  pending: { bg: "bg-zinc-100 text-zinc-500 border-zinc-300", icon: Clock },
  approved: { bg: "bg-sidebar-primary/10 text-emerald-900 border-sidebar-primary/20", icon: CheckCircle },
  rejected: { bg: "bg-white text-zinc-400 border-zinc-300 line-through", icon: XCircle },
  suppressed: { bg: "bg-rose-50 text-rose-700 border-rose-200", icon: XCircle },
};

const PAGE_SIZE_OPTIONS = [15, 25, 50, 100] as const;
const SELECTED_CONTENT_GENERATION_LIMIT = 25;
const EMPTY_CONTENT_GENERATION_QUEUE: ContentGenerationQueueState = {
  status: "idle",
  total: 0,
  completed: 0,
  generated: 0,
  failed: 0,
  suppressed: 0,
  currentLeadId: null,
  remainingLeadIds: [],
};
const EXPORT_HEADERS: Array<keyof LeadExportRow> = [
  "campaignTitle",
  "name",
  "title",
  "company",
  "email",
  "phone",
  "linkedinUrl",
  "companyUrl",
];
const EXPORT_HEADER_LABELS: Record<keyof LeadExportRow, string> = {
  campaignTitle: "Campaign Title",
  name: "Name",
  title: "Title",
  company: "Company",
  email: "Email",
  phone: "Phone",
  linkedinUrl: "LinkedIn URL",
  companyUrl: "Company URL",
};
const normalizeApprovalStatus = (s: unknown): ApprovalStatus => {
  if (s === "content_generated" || s === "needs_review") return "pending";
  return s === "approved" || s === "rejected" || s === "suppressed" || s === "pending" ? s : "pending";
};

const normalizeOutreachState = (value: unknown): OutreachState => {
  const s = String(value || "").toLowerCase();
  if (s === "pending" || s === "queued" || s === "sending" || s === "sent" || s === "failed") {
    return s;
  }
  return "pending";
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function asCleanText(value: unknown): string {
  return String(value ?? "").trim();
}

function getRecordValue(source: Record<string, unknown> | null | undefined, key: string): Record<string, unknown> | null {
  return asRecord(source?.[key]);
}

function textFromList(value: unknown): string {
  if (Array.isArray(value)) {
    return value.map((item) => asCleanText(item)).filter(Boolean).join("; ");
  }
  return asCleanText(value);
}

function textArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    const text = asCleanText(value);
    return text ? [text] : [];
  }
  return value
    .map((item) => {
      const source = asRecord(item);
      return source
        ? asCleanText(source.summary || source.reason || source.claim || source.text)
        : asCleanText(item);
    })
    .filter(Boolean);
}

function evidenceArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    const text = asCleanText(value);
    return text ? [text] : [];
  }
  return value
    .map((item) => {
      const source = asRecord(item);
      if (!source) return asCleanText(item);
      const claim = asCleanText(source.claim || source.summary || source.reason || source.text);
      const evidenceSource = asCleanText(source.source || source.label);
      const url = asCleanText(source.url);
      return [claim, evidenceSource ? `Source: ${evidenceSource}` : "", url ? `URL: ${url}` : ""]
        .filter(Boolean)
        .join(" | ");
    })
    .filter(Boolean);
}

function normalizeFailureMetrics(value: unknown): GenerationFailureInfo["metrics"] {
  if (!Array.isArray(value)) return [];
  const metrics: GenerationFailureInfo["metrics"] = [];
  for (const item of value) {
    const source = asRecord(item);
    if (!source) continue;
    const label = asCleanText(source.label);
    const actual = asCleanText(source.actual);
    const expected = asCleanText(source.expected);
    if (!label && !actual && !expected) continue;
    metrics.push({
      label: label || "Check",
      actual: actual || "-",
      expected: expected || "-",
      status: asCleanText(source.status) || undefined,
    });
  }
  return metrics;
}

function isGenericFailureReason(value: unknown): boolean {
  const text = asCleanText(value).toLowerCase().replace(/\s+/g, " ");
  if (!text) return true;
  return [
    "did not meet the qa checks",
    "did not pass validation or qa",
    "generation did not pass validation",
    "not relevant enough for this event based on the validator check",
    "could not release generated content",
  ].some((fragment) => text.includes(fragment));
}

function dedupeText(items: string[]): string[] {
  return items.filter((item, index, arr) => item && arr.indexOf(item) === index);
}

function metricsFromFailureText(items: string[]): GenerationFailureInfo["metrics"] {
  const metrics: GenerationFailureInfo["metrics"] = [];
  const pushMetric = (label: string, actual: string, expected: string) => {
    if (!metrics.some((metric) => metric.label === label && metric.actual === actual && metric.expected === expected)) {
      metrics.push({ label, actual, expected, status: "failed" });
    }
  };

  for (const item of items) {
    const emailWords = item.match(/Email body must be 90-140 words; current body is about (\d+) words/i);
    if (emailWords?.[1]) {
      pushMetric("Email body word count", `${emailWords[1]} words`, "90-140 words");
    }

    const whatsappWords = item.match(/WhatsApp message must be 45-75 words; current message is about (\d+) words/i);
    if (whatsappWords?.[1]) {
      pushMetric("WhatsApp word count", `${whatsappWords[1]} words`, "45-75 words");
    }

    if (/Email body must use four short paragraphs/i.test(item)) {
      pushMetric("Email paragraph structure", "Missing required structure", "4 paragraphs after greeting");
    }

    if (/Email opening must start with a personable outreach phrase/i.test(item)) {
      pushMetric("Opening quality", "Bare event description", "Personable outreach opener");
    }

    if (/Email final paragraph must be a low-friction question/i.test(item)) {
      pushMetric("Reply hook", "Missing reply question", "Question ending");
    }

    if (/Sales first outreach must not pitch/i.test(item)) {
      pushMetric("Sales tone", "Pitch language detected", "Strategic relevance only");
    }

    if (/Remove semicolons/i.test(item)) {
      pushMetric("Punctuation", "Semicolon detected", "Natural short sentences");
    }
  }

  return metrics;
}

function hasText(value: unknown): boolean {
  return String(value ?? "").trim().length > 0;
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

function normalizeContentSource(value: unknown): LeadContentSource {
  const source = String(value || "").trim().toLowerCase();
  if (source === "template" || source === "generated" || source === "manual" || source === "empty") return source;
  return "unknown";
}

function shouldShowTemplateFallback(lead: Pick<Lead, "contentSource" | "templateFallback">): boolean {
  return Boolean(lead.templateFallback) && normalizeContentSource(lead.contentSource) !== "generated";
}

function leadHasContent(
  lead: Pick<
    Lead,
    "contentEmailSubject" | "contentEmail" | "contentLinkedin" | "contentWhatsapp" | "contentSource"
  >
): boolean {
  const contentSource = normalizeContentSource(lead.contentSource);
  return (
    hasText(lead.contentEmailSubject) ||
    hasText(lead.contentEmail) ||
    hasText(lead.contentLinkedin) ||
    hasText(lead.contentWhatsapp) ||
    contentSource === "generated" ||
    contentSource === "manual" ||
    contentSource === "template"
  );
}

function getLeadContentIndicator(lead: Lead) {
  if (lead.generationFailure?.status === "validator_rejected") {
    return {
      title: lead.generationFailure.reason || "Validator rejected this lead content.",
      buttonClassName:
        "border-rose-200 bg-rose-50/90 text-rose-800 hover:border-rose-300 hover:bg-rose-100/80 hover:text-rose-900",
      iconClassName: "text-rose-500",
    };
  }

  if (lead.generationFailure?.status === "qa_failed") {
    return {
      title: lead.generationFailure.reason || "Generated content did not pass QA.",
      buttonClassName:
        "border-amber-200 bg-amber-50/90 text-amber-800 hover:border-amber-300 hover:bg-amber-100/80 hover:text-amber-900",
      iconClassName: "text-amber-500",
    };
  }

  if (lead.generationFailure?.status === "generation_failed") {
    return {
      title: lead.generationFailure.reason || "Content generation failed.",
      buttonClassName:
        "border-amber-200 bg-amber-50/90 text-amber-800 hover:border-amber-300 hover:bg-amber-100/80 hover:text-amber-900",
      iconClassName: "text-amber-500",
    };
  }

  if (leadHasContent(lead)) {
    return {
      title: "Content is available for this lead.",
      buttonClassName:
        "border-emerald-200 bg-emerald-50/90 text-emerald-800 hover:border-emerald-300 hover:bg-emerald-100/80 hover:text-emerald-900",
      iconClassName: "text-emerald-500",
    };
  }

  return {
    title: "Review email content",
    buttonClassName:
      "border-zinc-300/80 bg-white/82 text-zinc-700 hover:border-zinc-300 hover:bg-white hover:text-zinc-900",
    iconClassName: "text-zinc-400",
  };
}

function deriveGenerationFailure(draftStatus: unknown, draftMeta: Record<string, unknown> | null): GenerationFailureInfo | null {
  const status = asCleanText(draftStatus).toLowerCase();
  const failureMeta = getRecordValue(draftMeta, "generationFailure");
  const agenticV2 = getRecordValue(draftMeta, "agenticV2");
  const agentic = getRecordValue(draftMeta, "agentic");
  const source = failureMeta || agenticV2 || agentic;
  const display =
    getRecordValue(failureMeta, "display") ||
    getRecordValue(failureMeta, "failureDisplay") ||
    getRecordValue(source, "failureDisplay");
  const agenticDisplay = getRecordValue(agenticV2, "failureDisplay") || getRecordValue(agentic, "failureDisplay");
  const qa = getRecordValue(agenticV2, "qa") || getRecordValue(agentic, "qa") || getRecordValue(source, "qa");
  const validator = getRecordValue(agenticV2, "validator") || getRecordValue(agentic, "validator") || getRecordValue(source, "validator");
  const stage = asCleanText(source?.stage || source?.failureStage || failureMeta?.status || status);
  const details = dedupeText([
    ...textArray(display?.details),
    ...textArray(agenticDisplay?.details),
    ...textArray(failureMeta?.details),
    ...textArray(source?.details),
    ...textArray(agenticV2?.details),
    ...textArray(agentic?.details),
    ...textArray(source?.rejectReasons),
    ...textArray(source?.rewriteFeedback),
    ...textArray(source?.localQualityIssues),
    ...textArray(agenticV2?.rejectReasons),
    ...textArray(agenticV2?.rewriteFeedback),
    ...textArray(agenticV2?.localQualityIssues),
    ...textArray(agentic?.rejectReasons),
    ...textArray(agentic?.rewriteFeedback),
    ...textArray(agentic?.localQualityIssues),
    ...textArray(validator?.displayReason),
    ...textArray(validator?.rejectReasons),
    ...textArray(validator?.relevanceFindings),
    ...textArray(validator?.companyFitSummary),
    ...textArray(validator?.leadFitSummary),
    ...textArray(validator?.departmentFitSummary),
    ...textArray(qa?.failureDetails),
    ...textArray(qa?.rewrite_instructions),
    ...textArray(qa?.quality_notes),
  ]);
  const metrics = [
    ...normalizeFailureMetrics(display?.metrics),
    ...normalizeFailureMetrics(agenticDisplay?.metrics),
    ...normalizeFailureMetrics(failureMeta?.metrics),
    ...normalizeFailureMetrics(source?.qualityMetrics),
    ...normalizeFailureMetrics(agenticV2?.qualityMetrics),
    ...normalizeFailureMetrics(agentic?.qualityMetrics),
    ...metricsFromFailureText(details),
  ].filter(
    (item, index, arr) =>
      arr.findIndex(
        (candidate) =>
          candidate.label === item.label &&
          candidate.actual === item.actual &&
          candidate.expected === item.expected,
      ) === index,
  );
  const evidence = dedupeText([
    ...evidenceArray(display?.evidence),
    ...evidenceArray(agenticDisplay?.evidence),
    ...evidenceArray(failureMeta?.evidence),
    ...evidenceArray(source?.evidence),
    ...evidenceArray(agenticV2?.evidence),
    ...evidenceArray(agentic?.evidence),
    ...evidenceArray(validator?.evidence),
  ]);
  const displaySummary = asCleanText(display?.summary || agenticDisplay?.summary);
  const explicitReason = asCleanText(
    failureMeta?.reason ||
      source?.reason ||
      source?.failureReason ||
      agenticV2?.reason ||
      agenticV2?.failureReason ||
      agentic?.reason ||
      agentic?.failureReason,
  );
  const qaReason = asCleanText(qa?.displayReason);
  const reason =
    (!isGenericFailureReason(displaySummary) ? displaySummary : "") ||
    (!isGenericFailureReason(explicitReason) ? explicitReason : "") ||
    details.find((item) => !isGenericFailureReason(item)) ||
    (!isGenericFailureReason(qaReason) ? qaReason : "") ||
    displaySummary ||
    explicitReason ||
    details[0] ||
    textFromList(source?.rejectReasons) ||
    textFromList(source?.rewriteFeedback) ||
    textFromList(source?.localQualityIssues) ||
    textFromList(agenticV2?.rejectReasons) ||
    textFromList(agenticV2?.rewriteFeedback) ||
    textFromList(agenticV2?.localQualityIssues) ||
    textFromList(agentic?.rejectReasons) ||
    textFromList(agentic?.rewriteFeedback) ||
    textFromList(agentic?.localQualityIssues);
  const failed =
    status === "validator_rejected" ||
    status === "qa_failed" ||
    status === "generation_failed" ||
    Boolean(failureMeta) ||
    source?.approved === false;

  if (!failed) return null;

  const normalizedStatus: GenerationFailureStatus =
    status === "validator_rejected" || stage === "validator"
      ? "validator_rejected"
      : status === "qa_failed" || stage === "qa"
        ? "qa_failed"
        : "generation_failed";
  const title =
    asCleanText(display?.title || failureMeta?.title) ||
    (normalizedStatus === "validator_rejected"
      ? "Lead did not pass validation"
      : normalizedStatus === "qa_failed"
        ? "Generated content did not pass QA"
        : "Content generation failed");
  const fallbackReason =
    normalizedStatus === "validator_rejected"
      ? "This lead is not relevant enough for this event based on the validator check."
      : normalizedStatus === "qa_failed"
        ? "The generated content was not released because it did not meet the QA checks."
        : "The system could not release generated content for this lead.";

  return {
    status: normalizedStatus,
    stage: stage || normalizedStatus,
    title,
    reason: reason || fallbackReason,
    guidance:
      asCleanText(failureMeta?.regenerationGuidance || display?.nextAction || source?.regenerationGuidance) ||
      "Generate again after reviewing the failure reason. The next run will receive this metadata as feedback.",
    details,
    metrics,
    evidence,
  };
}

function normalizeSuppressionMeta(value: unknown): SuppressionMeta | null {
  const source = asRecord(value);
  if (!source) return null;
  return {
    active: parseBoolean(source.active),
    scope: source.scope ? String(source.scope) : null,
    matchedBy: source.matchedBy ? String(source.matchedBy) : null,
    source: source.source ? String(source.source) : null,
    reason: source.reason ? String(source.reason) : null,
    provider: source.provider ? String(source.provider) : null,
    phoneE164: source.phoneE164 ? String(source.phoneE164) : null,
    email: source.email ? String(source.email) : null,
    personId: source.personId ? String(source.personId) : null,
    campaignId: source.campaignId ? String(source.campaignId) : null,
    identifiers: asRecord(source.identifiers),
    legacy: parseBoolean(source.legacy),
  };
}

function normalizePhoneDigits(value: unknown): string {
  return String(value ?? "").replace(/\D+/g, "");
}

function isExecutedOutreachState(state: OutreachState): boolean {
  return state === "queued" || state === "sending" || state === "sent";
}

function buildPhoneLookupKeys(value: unknown): string[] {
  const digits = normalizePhoneDigits(value);
  if (!digits) return [];

  const keys = new Set<string>([digits]);
  if (digits.length >= 10) keys.add(digits.slice(-10));
  if (digits.length >= 8) keys.add(digits.slice(-8));
  return Array.from(keys);
}

function isMarketingOptOutError(detail: string): boolean {
  const text = detail.toLowerCase();
  return (
    text.includes("opted out from marketing messages") ||
    text.includes("opted out from whatsapp") ||
    text.includes("opted out")
  );
}

const extractOutreachStatus = (source: unknown): Required<NonNullable<Lead["outreachStatus"]>> | undefined => {
  const src = asRecord(source);
  if (!src) return undefined;

  const direct = asRecord(src.outreachStatus);
  const fromDraftMeta =
    asRecord(asRecord(asRecord(src.draft)?.meta)?.outreach) ??
    asRecord(asRecord(src.draft_meta)?.outreach) ??
    asRecord(asRecord(src.draftMeta)?.outreach);

  const picked =
    direct && typeof direct === "object" ? direct : fromDraftMeta && typeof fromDraftMeta === "object" ? fromDraftMeta : null;

  if (!picked) return undefined;

  return {
    email: normalizeOutreachState(picked.email),
    linkedin: normalizeOutreachState(picked.linkedin),
    whatsapp: normalizeOutreachState(picked.whatsapp),
  };
};

function normalizeChannelCapability(value: unknown) {
  const source = asRecord(value);
  if (!source) return null;

  return {
    sendable: source.sendable == null ? undefined : parseBoolean(source.sendable),
    attachmentsSupported: parseBoolean(source.attachmentsSupported),
    delivery: source.delivery ? String(source.delivery) : null,
    usesDraftContent: parseBoolean(source.usesDraftContent),
    requiresApprovedDraft: parseBoolean(source.requiresApprovedDraft),
    mode: source.mode ? String(source.mode) : null,
    enabled: source.enabled == null ? undefined : parseBoolean(source.enabled),
    templateConfigured:
      source.templateConfigured == null ? undefined : parseBoolean(source.templateConfigured),
  };
}

function normalizeChannelCapabilities(value: unknown): ChannelCapabilities | null {
  const source = asRecord(value);
  if (!source) return null;

  const email = normalizeChannelCapability(source.email);
  const whatsapp = normalizeChannelCapability(source.whatsapp);

  if (!email && !whatsapp) return null;
  return { email, whatsapp };
}

function normalizeAttachment(value: unknown): Attachment | null {
  const source = asRecord(value);
  if (!source || !source.id) return null;

  return {
    id: String(source.id),
    name: String(source.name || "attachment"),
    url: source.url ? String(source.url) : undefined,
    mime: source.mime ? String(source.mime) : undefined,
    sizeBytes: typeof source.sizeBytes === "number" ? source.sizeBytes : undefined,
    channel: source.channel ? (String(source.channel) as AttachmentChannel) : undefined,
  };
}

function normalizeAttachments(value: unknown): Attachment[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => normalizeAttachment(item)).filter((item): item is Attachment => Boolean(item));
}

function normalizeTitleBucket(titleRaw: string): string {
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

// -----------------------------
// Outreach icons
// -----------------------------
const buildOutreachStatus = (lead: Lead): Required<NonNullable<Lead["outreachStatus"]>> => {
  if (lead.outreachStatus) {
    return {
      email: lead.outreachStatus.email ?? "pending",
      linkedin: lead.outreachStatus.linkedin ?? "pending",
      whatsapp: lead.outreachStatus.whatsapp ?? "pending",
    };
  }

  const s = String(lead.draftStatus || "").toLowerCase();
  if (s === "sent") return { email: "sent", linkedin: "sent", whatsapp: "sent" };
  if (s === "queued") return { email: "queued", linkedin: "pending", whatsapp: "queued" };
  if (s === "sending") return { email: "sending", linkedin: "pending", whatsapp: "sending" };
  if (s === "failed") return { email: "failed", linkedin: "pending", whatsapp: "failed" };

  return { email: "pending", linkedin: "pending", whatsapp: "pending" };
};

const OutreachStatusIcons = ({ status }: { status: Required<NonNullable<Lead["outreachStatus"]>> }) => {
  const whatsappSent = status.whatsapp === "sent";
  const emailSent = status.email === "sent";

  return (
    <div className="flex items-center justify-center gap-2" title="Sent status">
      <span
        className={`inline-block h-3 w-3 rounded-full ${whatsappSent ? "bg-emerald-500" : "bg-zinc-300"}`}
        title={whatsappSent ? "WhatsApp sent" : "WhatsApp not sent"}
        aria-label={whatsappSent ? "WhatsApp sent" : "WhatsApp not sent"}
      />
      <span
        className={`inline-block h-3 w-3 rounded-full ${emailSent ? "bg-blue-500" : "bg-zinc-300"}`}
        title={emailSent ? "Email sent" : "Email not sent"}
        aria-label={emailSent ? "Email sent" : "Email not sent"}
      />
    </div>
  );
};

// -----------------------------
// Attachments helpers
// -----------------------------
const MAX_ATTACHMENT_BYTES = 3 * 1024 * 1024; // ✅ 3MB

const formatBytes = (bytes?: number) => {
  if (bytes == null) return "";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let v = bytes;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
};

function formatDateOnly(value?: string) {
  if (!value) return "-";

  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  const fallback = String(value).split("T")[0]?.split(" ")[0];
  return fallback || value;
}

function formatDateTime(value?: string | null) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return parsed.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatFallbackDraftSummary(summary: CampaignEmailTemplateFallbackDrafts) {
  return `${summary.created} created, ${summary.updated} updated, ${summary.skipped} skipped`;
}

function formatFallbackDraftCleanup(summary: CampaignEmailTemplateDeleteFallbackDrafts) {
  return `${summary.deleted} fallback draft(s), ${summary.deletedQueueRows} queue row(s) removed`;
}

function escapeCsv(value: unknown) {
  const text = String(value ?? "");
  if (text.includes(",") || text.includes("\n") || text.includes('"')) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function sanitizeFileNamePart(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function triggerFileDownload(filename: string, mimeType: string, content: string) {
  const blob = new Blob(["\ufeff", content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

async function writeToClipboard(text: string) {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  if (typeof document !== "undefined") {
    const area = document.createElement("textarea");
    area.value = text;
    area.style.position = "fixed";
    area.style.left = "-9999px";
    document.body.appendChild(area);
    area.focus();
    area.select();
    document.execCommand("copy");
    document.body.removeChild(area);
    return;
  }

  throw new Error("Clipboard unavailable");
}

function buildLeadClipboardText(lead: Lead) {
  const rows = [
    `Name: ${lead.employeeName || "-"}`,
    `Title: ${lead.title || "-"}`,
    `Company: ${lead.company || "-"}`,
    `Email: ${lead.email || "-"}`,
    `Phone: ${lead.phone || "-"}`,
    `LinkedIn: ${lead.linkedinUrl || "-"}`,
    `Company URL: ${lead.companyUrl || "-"}`,
  ].filter(Boolean);

  return rows.join("\n");
}

function formatImportSummaryToast(summary: CampaignImportSummary) {
  return `${summary.importedLeads} leads imported from ${summary.fileName}.`;
}

const AttachmentSection = ({
  title,
  subtitle,
  attachments,
  readonlyAttachments,
  pendingUploads,
  onPickFiles,
  onRemoveAttachment,
  onRemovePending,
  className,
}: {
  title: string;
  subtitle: string;
  attachments: Attachment[];
  readonlyAttachments?: Attachment[];
  pendingUploads: PendingUpload[];
  onPickFiles: () => void;
  onRemoveAttachment: (id: string) => void;
  onRemovePending: (tempId: string) => void;
  className?: string;
}) => {
  const readonlyList = readonlyAttachments || [];
  const hasAny = attachments.length > 0 || pendingUploads.length > 0 || readonlyList.length > 0;

  return (
    <Card className={`flex min-h-0 flex-col rounded-xl border border-zinc-300 bg-white shadow-sm ${className || ""}`}>
      <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md border border-zinc-300 bg-white">
            <Paperclip className="h-4 w-4 text-zinc-900" />
          </div>
          <div>
            <div className="text-sm font-semibold text-zinc-900">{title}</div>
            <div className="text-xs text-zinc-500">{subtitle} • Max 3MB/file</div>
          </div>
        </div>

        <Button
          type="button"
          className="h-9 rounded-md border border-zinc-300 bg-white px-3 text-xs font-semibold text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50"
          onClick={onPickFiles}
        >
          <UploadCloud className="mr-2 h-4 w-4" />
          Add
        </Button>
      </div>

      <div className="min-h-0 overflow-y-auto p-5 scrollbar-hide">
        {!hasAny ? (
          <div className="text-sm text-zinc-500">
            No attachments added.
            <div className="text-xs text-zinc-400 mt-1">PDF/DOC/PPT/Images supported.</div>
          </div>
        ) : (
          <div className="space-y-2">
            {readonlyList.map((a) => (
              <div key={a.id} className="flex items-center justify-between rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-zinc-900">
                    {a.name}
                    <span className="ml-2 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Attach All</span>
                  </div>
                  <div className="text-xs text-zinc-500">
                    {a.mime ? a.mime : "File"}
                    {a.sizeBytes != null ? ` • ${formatBytes(a.sizeBytes)}` : ""}
                  </div>
                </div>
              </div>
            ))}

            {pendingUploads.map((p) => (
              <div key={p.tempId} className="flex items-center justify-between rounded-lg border border-zinc-300 bg-white px-3 py-2">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-zinc-900 truncate">
                    {p.name}{" "}
                    {p.uploading ? <span className="text-xs text-amber-600 font-semibold">• uploading...</span> : null}
                    {p.error ? <span className="text-xs text-red-600 font-semibold">• {p.error}</span> : null}
                  </div>
                  <div className="text-xs text-zinc-500">
                    {p.mime} • {formatBytes(p.sizeBytes)}
                  </div>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  className="h-8 px-2 text-zinc-500 hover:text-red-600 hover:bg-red-50"
                  onClick={() => onRemovePending(p.tempId)}
                  disabled={!!p.uploading}
                  title="Remove"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}

            {attachments.map((a) => (
              <div key={a.id} className="flex items-center justify-between rounded-lg border border-zinc-300 bg-white px-3 py-2">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-zinc-900 truncate">{a.name}</div>
                  <div className="text-xs text-zinc-500">
                    {a.mime ? a.mime : "File"}
                    {a.sizeBytes != null ? ` • ${formatBytes(a.sizeBytes)}` : ""}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {a.url ? (
                    <a href={a.url} target="_blank" rel="noreferrer" className="text-xs text-zinc-500 hover:text-zinc-900 hover:underline">
                      View
                    </a>
                  ) : null}

                  <Button
                    type="button"
                    variant="ghost"
                    className="h-8 px-2 text-zinc-500 hover:text-red-600 hover:bg-red-50"
                    onClick={() => onRemoveAttachment(a.id)}
                    title="Remove"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
};

// -----------------------------
// Attachment API (channel aware)
// -----------------------------
async function uploadLeadAttachment(
  api: AxiosInstance,
  leadId: string,
  channel: AttachmentChannel,
  file: File
): Promise<Attachment> {
  if (channel !== "email") {
    throw new Error("WhatsApp attachments are not available yet.");
  }

  const form = new FormData();
  form.append("file", file);

  const res = await api.post(`/api/leads/${leadId}/attachments`, form, {
    params: { channel }, // ✅ channel=email|whatsapp
    headers: { "Content-Type": "multipart/form-data" },
  });

  return res.data as Attachment;
}

async function deleteLeadAttachment(
  api: AxiosInstance,
  leadId: string,
  attachmentId: string
): Promise<void> {
  await api.delete(`/api/leads/${leadId}/attachments/${attachmentId}`);
}

function SuperAdminCampaignDetailPage() {
  const params = useParams<{ id: string }>();
  const campaignId = params.id;
  const { persona } = usePersona();
  const { isSuperAdmin } = useAuth();
  const canManageLeadActions = isSuperAdmin;
  const api = useMemo(() => getApiKeyClient(persona), [persona]);

  const [campaign, setCampaign] = useState<CampaignDetail | null>(null);
  const [campaignCategory, setCampaignCategory] = useState<string>("");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [leadFilter, setLeadFilter] = useState<LeadFilterKey>("new");
  const [tableSearch, setTableSearch] = useState("");
  const [jobTitleFilter, setJobTitleFilter] = useState("");
  const [hasEmailOnly, setHasEmailOnly] = useState(false);
  const [domainFilter, setDomainFilter] = useState("");
  const [phoneFilter, setPhoneFilter] = useState("");
  const [isTableFilterOpen, setIsTableFilterOpen] = useState(false);
  const [bulkSelectMode, setBulkSelectMode] = useState(false);
  const [selectedBulkLeadIds, setSelectedBulkLeadIds] = useState<Set<string>>(new Set());
  const [universalAttachment, setUniversalAttachment] = useState<Attachment | null>(null);
  const [commonAttachmentId, setCommonAttachmentId] = useState<string | null>(null);
  const [isCommonAttachmentUploading, setIsCommonAttachmentUploading] = useState(false);
  const [showBulkSendConfirm, setShowBulkSendConfirm] = useState(false);
  const [bulkSendChannel, setBulkSendChannel] = useState<BulkSendChannel>("email");
  const [isBulkSending, setIsBulkSending] = useState(false);
  const [contentGenerationQueue, setContentGenerationQueue] = useState<ContentGenerationQueueState>(
    EMPTY_CONTENT_GENERATION_QUEUE
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(15);
  const [uploadImportSummary, setUploadImportSummary] = useState<CampaignImportSummary | null>(null);
  const [optOutItems, setOptOutItems] = useState<WhatsAppOptOutItem[]>([]);
  const [disableTargetLead, setDisableTargetLead] = useState<Lead | null>(null);
  const [disableReason, setDisableReason] = useState("");
  const [isDisablingWhatsapp, setIsDisablingWhatsapp] = useState(false);
  const [smsTargetLead, setSmsTargetLead] = useState<Lead | null>(null);
  const [smsMessage, setSmsMessage] = useState("");
  const [isSendingSms, setIsSendingSms] = useState(false);
  const [followUpTargetLead, setFollowUpTargetLead] = useState<Lead | null>(null);
  const [followUpHistory, setFollowUpHistory] = useState<FollowUpHistoryItem[]>([]);
  const [followUpStep, setFollowUpStep] = useState(0);
  const [followUpSubject, setFollowUpSubject] = useState("");
  const [followUpBody, setFollowUpBody] = useState("");
  const [isSendingFollowUp, setIsSendingFollowUp] = useState(false);
  const [quickFollowUpLeadId, setQuickFollowUpLeadId] = useState<string | null>(null);
  const [followUpTemplates, setFollowUpTemplates] = useState<Record<number, FollowUpTemplate>>(createEmptyFollowUpTemplates);
  const [selectedFollowUpTemplateStage, setSelectedFollowUpTemplateStage] = useState(1);
  const [isSavingFollowUpTemplate, setIsSavingFollowUpTemplate] = useState(false);
  const [emailTemplateId, setEmailTemplateId] = useState<string | null>(null);
  const [emailTemplateSubject, setEmailTemplateSubject] = useState("");
  const [emailTemplateBody, setEmailTemplateBody] = useState("");
  const [emailTemplateUpdatedAt, setEmailTemplateUpdatedAt] = useState<string | null>(null);
  const [isEmailTemplateLoading, setIsEmailTemplateLoading] = useState(false);
  const [isEmailTemplateSaving, setIsEmailTemplateSaving] = useState(false);
  const [isEmailTemplateDeleting, setIsEmailTemplateDeleting] = useState(false);
  const [fallbackDraftSummary, setFallbackDraftSummary] = useState<CampaignEmailTemplateFallbackDrafts | null>(null);
  const leadOrderRef = useRef<Map<string, number>>(new Map());

  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [editForm, setEditForm] = useState<Partial<Lead>>({});
  const [saving, setSaving] = useState(false);
  const [isResettingContent, setIsResettingContent] = useState(false);
  const [isBulkResettingContent, setIsBulkResettingContent] = useState(false);

  // ✅ Separate pending queues
  const [pendingEmailUploads, setPendingEmailUploads] = useState<PendingUpload[]>([]);
  const [pendingWhatsappUploads, setPendingWhatsappUploads] = useState<PendingUpload[]>([]);
  const [leadSendLoading, setLeadSendLoading] = useState<Record<string, Partial<Record<LeadSendAction, boolean>>>>({});

  // ✅ Separate file pickers
  const emailFileRef = useRef<HTMLInputElement | null>(null);
  const whatsappFileRef = useRef<HTMLInputElement | null>(null);
  const tableFilterRef = useRef<HTMLDivElement | null>(null);
  const universalAttachmentRef = useRef<HTMLInputElement | null>(null);
  const contentGenerationPauseRequestedRef = useRef(false);
  const contentGenerationControllerRef = useRef<AbortController | null>(null);

  const pendingCount = useMemo(() => leads.filter((l) => l.approvalStatus === "pending").length, [leads]);
  const approvedCount = useMemo(() => leads.filter((l) => l.approvalStatus === "approved").length, [leads]);
  const rejectedCount = useMemo(() => leads.filter((l) => l.approvalStatus === "rejected").length, [leads]);
  const suppressedCount = useMemo(() => leads.filter((l) => l.approvalStatus === "suppressed").length, [leads]);
  const sendableApprovedCount = useMemo(() => {
    const backendValue = Number(campaign?.stats?.sendableApproved ?? NaN);
    if (Number.isFinite(backendValue)) return backendValue;
    return leads.filter((l) => l.approvalStatus === "approved" && l.sendable !== false).length;
  }, [campaign?.stats?.sendableApproved, leads]);
  const totalLeadCount = useMemo(() => Number(campaign?.stats?.total ?? leads.length), [campaign?.stats?.total, leads.length]);
  const pendingMetricCount = useMemo(() => Number(campaign?.stats?.pending ?? pendingCount), [campaign?.stats?.pending, pendingCount]);
  const approvedMetricCount = useMemo(() => Number(campaign?.stats?.approved ?? approvedCount), [campaign?.stats?.approved, approvedCount]);
  const rejectedMetricCount = useMemo(() => Number(campaign?.stats?.rejected ?? rejectedCount), [campaign?.stats?.rejected, rejectedCount]);
  const suppressedMetricCount = useMemo(() => Number(campaign?.stats?.suppressed ?? suppressedCount), [campaign?.stats?.suppressed, suppressedCount]);
  const emailLeadCount = useMemo(() => leads.filter((lead) => hasText(lead.email)).length, [leads]);
  const hasEmailLeads = emailLeadCount > 0;
  const emailTemplateSaveDisabled =
    !hasEmailLeads || isEmailTemplateLoading || isEmailTemplateSaving || isEmailTemplateDeleting;
  const selectedFollowUpTemplate = followUpTemplates[selectedFollowUpTemplateStage];

  const leadFilterTabs = useMemo(
    () => [
      { key: "new" as const, label: "New", count: leads.filter((lead) => isLeadInNewBucket(lead)).length },
      { key: "sent" as const, label: "Sent", count: leads.filter((lead) => isLeadInSentBucket(lead)).length },
      { key: "rejected" as const, label: "Rejected", count: rejectedCount },
      { key: "suppressed" as const, label: "Suppressed", count: suppressedCount },
    ],
    [leads, rejectedCount, suppressedCount]
  );
  const optOutByPersonId = useMemo(() => {
    const map = new Map<string, WhatsAppOptOutItem>();
    for (const item of optOutItems) {
      const personId = String(item.personId || "").trim();
      if (!personId) continue;
      if (!map.has(personId)) map.set(personId, item);
    }
    return map;
  }, [optOutItems]);

  const optOutByPhoneKey = useMemo(() => {
    const map = new Map<string, WhatsAppOptOutItem>();
    for (const item of optOutItems) {
      for (const key of buildPhoneLookupKeys(item.phoneE164)) {
        if (!map.has(key)) map.set(key, item);
      }
    }
    return map;
  }, [optOutItems]);

  const optOutByEmailKey = useMemo(() => {
    const map = new Map<string, WhatsAppOptOutItem>();
    for (const item of optOutItems) {
      const emailKey = String(item.email || "").trim().toLowerCase();
      if (!emailKey) continue;
      if (!map.has(emailKey)) map.set(emailKey, item);
    }
    return map;
  }, [optOutItems]);

  const leadOptOutById = useMemo(() => {
    const map = new Map<string, WhatsAppOptOutItem | null>();

    for (const lead of leads) {
      if (lead.suppression?.active || lead.isSuppressed || lead.contactReadOnly || lead.approvalStatus === "suppressed") {
        map.set(lead.id, {
          id: `suppression-${lead.id}`,
          scope: lead.suppression?.scope || "marketing",
          identityType: lead.suppression?.matchedBy || null,
          identityValue: lead.suppression?.email || lead.suppression?.phoneE164 || null,
          phoneE164: lead.suppression?.phoneE164 || lead.phone || null,
          email: lead.suppression?.email || lead.email || null,
          isActive: true,
          source: lead.suppression?.source || "backend",
          reason: lead.suppression?.reason || "suppressed",
          provider: lead.suppression?.provider || "backend",
          personId: lead.suppression?.personId || null,
          campaignId: lead.suppression?.campaignId || campaignId || null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        continue;
      }

      const byPersonId = optOutByPersonId.get(lead.id);
      if (byPersonId) {
        map.set(lead.id, byPersonId);
        continue;
      }

      const phoneKeys = buildPhoneLookupKeys(lead.phone);
      const byPhone = phoneKeys.map((key) => optOutByPhoneKey.get(key)).find(Boolean) ?? null;
      if (byPhone) {
        map.set(lead.id, byPhone);
        continue;
      }

      const emailKey = String(lead.email || "").trim().toLowerCase();
      if (emailKey) {
        const byEmail = optOutByEmailKey.get(emailKey);
        if (byEmail) {
          map.set(lead.id, byEmail);
          continue;
        }
      }

      if (lead.whatsappOptedOut) {
        map.set(lead.id, {
          id: `local-${lead.id}`,
          scope: "marketing",
          identityType: "phone",
          identityValue: lead.whatsappOptOutPhoneE164 || lead.phone || null,
          phoneE164: lead.whatsappOptOutPhoneE164 || lead.phone || "",
          email: lead.email || null,
          isActive: true,
          source: lead.whatsappOptOutSource || "backend",
          reason: lead.whatsappOptOutReason || "opted out",
          provider: "backend",
          personId: lead.id,
          campaignId: campaignId || null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        continue;
      }

      map.set(lead.id, null);
    }

    return map;
  }, [campaignId, leads, optOutByEmailKey, optOutByPersonId, optOutByPhoneKey]);

  function isLeadMarketingOptedOut(lead: Lead) {
    if (lead.contactReadOnly) return true;
    if (lead.approvalStatus === "suppressed") return true;
    if (lead.isSuppressed) return true;
    if (lead.suppression?.active) return true;
    return Boolean(leadOptOutById.get(lead.id));
  }
  function isLeadSelectionBlocked(lead: Lead) {
    return isLeadMarketingOptedOut(lead);
  }
  function leadSupportsEmailAction(lead: Lead) {
    return hasText(lead.email);
  }
  function leadSupportsWhatsappAction(lead: Lead) {
    return hasText(lead.phone);
  }
  function isLeadEmailActionCompleted(lead: Lead) {
    return isExecutedOutreachState(buildOutreachStatus(lead).email);
  }
  function isLeadWhatsappActionCompleted(lead: Lead) {
    return isExecutedOutreachState(buildOutreachStatus(lead).whatsapp);
  }
  function isLeadFullyActioned(lead: Lead) {
    const needsEmail = leadSupportsEmailAction(lead);
    const needsWhatsapp = leadSupportsWhatsappAction(lead);

    if (!needsEmail && !needsWhatsapp) return false;
    if (needsEmail && !isLeadEmailActionCompleted(lead)) return false;
    if (needsWhatsapp && !isLeadWhatsappActionCompleted(lead)) return false;
    return true;
  }
  function isLeadInNewBucket(lead: Lead) {
    return lead.approvalStatus !== "rejected" && lead.approvalStatus !== "suppressed" && !isLeadFullyActioned(lead);
  }
  function isLeadInSentBucket(lead: Lead) {
    return lead.approvalStatus !== "rejected" && lead.approvalStatus !== "suppressed" && isLeadFullyActioned(lead);
  }
  function getEmailCapabilityDisabledReason(lead: Lead) {
    if (!hasText(lead.email)) return "Lead has no email address.";

    const capability = lead.channelCapabilities?.email;
    if (!capability) return null;
    if (capability.sendable === false) {
      return "Email is not currently sendable for this lead.";
    }

    return null;
  }
  function getWhatsappCapabilityDisabledReason(lead: Lead) {
    if (!hasText(lead.phone)) return "Lead has no phone number.";

    const capability = lead.channelCapabilities?.whatsapp;
    if (!capability) return null;
    if (capability.enabled === false) return "WhatsApp sending is disabled.";
    if (capability.templateConfigured === false) return "WhatsApp template is not configured.";
    if (capability.sendable === false) return "WhatsApp is not currently sendable for this lead.";

    return null;
  }

  const stabilizeLeadOrder = (items: Lead[]) => {
    const order = leadOrderRef.current;
    for (const item of items) {
      if (!order.has(item.id)) order.set(item.id, order.size);
    }

    return [...items].sort((a, b) => {
      const aOrder = order.get(a.id) ?? Number.MAX_SAFE_INTEGER;
      const bOrder = order.get(b.id) ?? Number.MAX_SAFE_INTEGER;
      return aOrder - bOrder;
    });
  };

  const filteredLeads = useMemo(() => {
    const statusFiltered = canManageLeadActions
      ? leadFilter === "new"
          ? leads.filter((l) => isLeadInNewBucket(l))
          : leadFilter === "sent"
            ? leads.filter((l) => isLeadInSentBucket(l))
            : leadFilter === "rejected"
              ? leads.filter((l) => l.approvalStatus === "rejected")
              : leads.filter((l) => l.approvalStatus === "suppressed")
      : leads;

    const asText = (value: unknown) => String(value ?? "").toLowerCase();
    const query = tableSearch.trim().toLowerCase();
    const jobTitleQuery = jobTitleFilter.trim().toLowerCase();
    const domainQuery = domainFilter.trim().toLowerCase();
    const phoneQuery = phoneFilter.trim().toLowerCase().replaceAll(" ", "");

    return statusFiltered.filter((lead) => {
      const leadTitle = asText(lead.title);
      const titleBucket = normalizeTitleBucket(leadTitle).toLowerCase();

      const searchMatch =
        !query ||
        asText(lead.id).includes(query) ||
        asText(lead.batchId).includes(query) ||
        asText(lead.employeeName).includes(query) ||
        leadTitle.includes(query) ||
        titleBucket.includes(query) ||
        asText(lead.company).includes(query) ||
        asText(lead.email).includes(query) ||
        asText(lead.phone).includes(query) ||
        asText(lead.companyUrl).includes(query);

      const jobTitleMatch = !jobTitleQuery || leadTitle.includes(jobTitleQuery) || titleBucket.includes(jobTitleQuery);

      // Domain can be partial/suffix like ".ae", ".sa", or full company domain.
      const domainHaystack = `${asText(lead.email)} ${asText(lead.companyUrl)}`;
      const domainMatch = !domainQuery || domainHaystack.includes(domainQuery);

      const emailPresenceMatch = !hasEmailOnly || String(lead.email || "").trim().length > 0;

      const compactPhone = asText(lead.phone).replaceAll(" ", "");
      const phoneMatch = !phoneQuery || compactPhone.includes(phoneQuery);

      return searchMatch && jobTitleMatch && emailPresenceMatch && domainMatch && phoneMatch;
    });
  }, [canManageLeadActions, leads, leadFilter, tableSearch, jobTitleFilter, hasEmailOnly, domainFilter, phoneFilter]);

  const selectableFilteredLeads = useMemo(
    () =>
      canManageLeadActions
        ? filteredLeads.filter((lead) => {
        const blocked =
          lead.sendable === false ||
          lead.contactReadOnly ||
          lead.approvalStatus === "suppressed" ||
          lead.isSuppressed ||
          Boolean(lead.suppression?.active) ||
          Boolean(leadOptOutById.get(lead.id));
        return !blocked;
      })
        : [],
    [canManageLeadActions, filteredLeads, leadOptOutById]
  );
  const leadById = useMemo(() => {
    const map = new Map<string, Lead>();
    for (const lead of leads) map.set(lead.id, lead);
    return map;
  }, [leads]);

  const totalPages = Math.max(1, Math.ceil(filteredLeads.length / itemsPerPage));

  const paginatedLeads = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredLeads.slice(start, start + itemsPerPage);
  }, [filteredLeads, currentPage, itemsPerPage]);
  const selectedBulkCount = Array.from(selectedBulkLeadIds).reduce((count, leadId) => {
    const lead = leadById.get(leadId);
    if (!lead || isLeadSelectionBlocked(lead)) return count;
    return count + 1;
  }, 0);
  const selectedContentResetLeads = Array.from(selectedBulkLeadIds)
    .map((leadId) => leadById.get(leadId))
    .filter((lead): lead is Lead => {
      if (!lead) return false;
      return !isLeadSelectionBlocked(lead);
    });
  const selectedContentResetCount = selectedContentResetLeads.length;
  const selectedContentGenerationLeads = useMemo(
    () =>
      Array.from(selectedBulkLeadIds)
        .map((leadId) => leadById.get(leadId))
        .filter((lead): lead is Lead => {
          if (!lead || !hasText(lead.email)) return false;
          const blocked =
            lead.contactReadOnly ||
            lead.approvalStatus === "suppressed" ||
            lead.isSuppressed ||
            Boolean(lead.suppression?.active) ||
            Boolean(leadOptOutById.get(lead.id));
          return !blocked;
        }),
    [leadById, leadOptOutById, selectedBulkLeadIds]
  );
  const selectedContentGenerationCount = selectedContentGenerationLeads.length;
  const selectedContentGenerationOverLimit = selectedContentGenerationCount > SELECTED_CONTENT_GENERATION_LIMIT;
  const selectedEmailSendLeads = useMemo(
    () =>
      Array.from(selectedBulkLeadIds)
        .map((leadId) => leadById.get(leadId))
        .filter((lead): lead is Lead => {
          if (!lead) return false;
          const blocked =
            lead.sendable === false ||
            lead.contactReadOnly ||
            lead.approvalStatus === "suppressed" ||
            lead.isSuppressed ||
            Boolean(lead.suppression?.active) ||
            Boolean(leadOptOutById.get(lead.id));
          return !blocked && leadSupportsEmailAction(lead) && !isLeadEmailActionCompleted(lead);
        }),
    [leadById, leadOptOutById, selectedBulkLeadIds]
  );
  const selectedWhatsappSendLeads = useMemo(
    () =>
      Array.from(selectedBulkLeadIds)
        .map((leadId) => leadById.get(leadId))
        .filter((lead): lead is Lead => {
          if (!lead) return false;
          const blocked =
            lead.sendable === false ||
            lead.contactReadOnly ||
            lead.approvalStatus === "suppressed" ||
            lead.isSuppressed ||
            Boolean(lead.suppression?.active) ||
            Boolean(leadOptOutById.get(lead.id));
          return !blocked && leadSupportsWhatsappAction(lead) && !isLeadWhatsappActionCompleted(lead);
        }),
    [leadById, leadOptOutById, selectedBulkLeadIds]
  );
  const selectedBulkEmailCount = selectedEmailSendLeads.length;
  const selectedBulkWhatsappCount = selectedWhatsappSendLeads.length;
  const selectedBulkChannelCount = bulkSendChannel === "email" ? selectedBulkEmailCount : selectedBulkWhatsappCount;
  const isBulkGeneratingContent =
    contentGenerationQueue.status === "running" || contentGenerationQueue.status === "stopping";
  const isContentGenerationPaused = contentGenerationQueue.status === "paused";
  const isContentGenerationActive = isBulkGeneratingContent || isContentGenerationPaused;
  const selectableCurrentPageLeads = canManageLeadActions
    ? paginatedLeads.filter((lead) => !isLeadSelectionBlocked(lead))
    : [];
  const isCurrentPageAllSelected =
    selectableCurrentPageLeads.length > 0 &&
    selectableCurrentPageLeads.every((lead) => selectedBulkLeadIds.has(lead.id));

  const visiblePageNumbers = useMemo(() => {
    const windowSize = 5;
    let start = Math.max(1, currentPage - Math.floor(windowSize / 2));
    const end = Math.min(totalPages, start + windowSize - 1);
    start = Math.max(1, end - windowSize + 1);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }, [currentPage, totalPages]);

  const activeFilterLabel = useMemo(
    () => (canManageLeadActions ? leadFilterTabs.find((tab) => tab.key === leadFilter)?.label || "New" : "All"),
    [canManageLeadActions, leadFilterTabs, leadFilter]
  );
  const categoryChipLabel = useMemo(
    () => (campaignCategory || campaign?.category || "").trim(),
    [campaignCategory, campaign?.category]
  );
  const hasAdvancedTableFilters =
    jobTitleFilter.trim().length > 0 ||
    hasEmailOnly ||
    domainFilter.trim().length > 0 ||
    phoneFilter.trim().length > 0;
  const exportRows = useMemo<LeadExportRow[]>(
    () =>
      leads.map((lead) => {
        return {
          campaignTitle: campaign?.name || "",
          name: lead.employeeName || "",
          title: lead.title || "",
          company: lead.company || "",
          email: lead.email || "",
          phone: lead.phone || "",
          linkedinUrl: lead.linkedinUrl || "",
          companyUrl: lead.companyUrl || "",
        };
      }),
    [leads, campaign?.name]
  );

  const applyLatestCommonAttachment = (raw: unknown) => {
    const rows = Array.isArray((raw as { attachments?: unknown[] } | null)?.attachments)
      ? ((raw as { attachments: unknown[] }).attachments as Array<Record<string, unknown>>)
      : [];

    const latest = rows[0];
    if (!latest || !latest.id) {
      setUniversalAttachment(null);
      setCommonAttachmentId(null);
      return;
    }

    const mapped: Attachment = {
      id: String(latest.id),
      name: String(latest.name || "attachment"),
      mime: String(latest.mime || "application/octet-stream"),
      sizeBytes: typeof latest.sizeBytes === "number" ? latest.sizeBytes : undefined,
      url: latest.url ? String(latest.url) : undefined,
      channel: "common",
    };

    setUniversalAttachment(mapped);
    setCommonAttachmentId(mapped.id);
  };

  const fetchAll = async (options?: { silent?: boolean; syncSelectedLeadId?: string }) => {
    if (!options?.silent) {
      setLoading(true);
    }
    setIsEmailTemplateLoading(true);
    try {
      const [cRes, lRes, infoRes, commonRes, optOutRes, templateRes, followUpTemplatesRes] = await Promise.all([
        api.get(`/api/campaigns/${campaignId}`),
        api.get(`/api/campaigns/${campaignId}/leads`, { params: { status: "all" } }),
        api.get(`/api/campaigns/${campaignId}/info`).catch(() => null),
        api.get(`/api/campaigns/${campaignId}/common-attachments`).catch(() => null),
        listWhatsAppOptOuts({ limit: 1000, activeOnly: true }).catch(() => ({ ok: false, items: [] })),
        getCampaignEmailTemplate(campaignId).catch(() => null),
        api.get(`/api/campaigns/${campaignId}/follow-up-templates`).catch(() => null),
      ]);

      setCampaign(cRes.data);
      setCampaignCategory(String(infoRes?.data?.info?.category || cRes.data?.category || "").trim());
      const activeTemplate = templateRes?.template ?? null;
      setEmailTemplateId(activeTemplate?.id ?? null);
      setEmailTemplateSubject(activeTemplate?.emailSubject ?? "");
      setEmailTemplateBody(activeTemplate?.emailBody ?? "");
      setEmailTemplateUpdatedAt(activeTemplate?.updatedAt ?? null);
      const rawFollowUpTemplates = followUpTemplatesRes?.data?.templates ?? followUpTemplatesRes?.data ?? [];
      if (Array.isArray(rawFollowUpTemplates)) {
        const nextTemplates = createEmptyFollowUpTemplates();
        rawFollowUpTemplates.forEach((template: any) => {
          const stage = Number(template?.stage);
          if (stage < 1 || stage > FOLLOW_UP_STEPS.length) return;
          nextTemplates[stage] = {
            id: template.id ? String(template.id) : undefined,
            stage,
            subject: String(template.subject ?? template.emailSubject ?? ""),
            body: String(template.body ?? template.emailBody ?? ""),
            isActive: template.isActive !== false,
            updatedAt: template.updatedAt ?? null,
          };
        });
        setFollowUpTemplates(nextTemplates);
      }

      const mapped: Lead[] = (lRes.data.leads || []).map((x: any) => ({
        id: x.id,
        batchId: x.batchId,
        employeeName: x.employeeName,
        title: x.title || "",
        company: x.company || x.companyName || x.company_name || "",
        email: x.email || "",
        phone: x.phone || "",
        linkedinUrl: x.linkedinUrl || "",
        companyUrl: x.companyUrl || x.company_url || "",

        contentEmailSubject: x.contentEmailSubject || "",
        contentEmail: x.contentEmail || "",
        contentLinkedin: x.contentLinkedin || "",
        contentWhatsapp: x.contentWhatsapp || "",

        reviewStatus: x.reviewStatus ?? null,
        approvalStatus: normalizeApprovalStatus(x.approvalStatus),
        isSuppressed: parseBoolean(x.isSuppressed),
        suppression: normalizeSuppressionMeta(x.suppression),
        contactReadOnly: parseBoolean(x.contactReadOnly),
        sendable: typeof x.sendable === "boolean" ? x.sendable : undefined,
        channelCapabilities: normalizeChannelCapabilities(x.channelCapabilities),
        contentSource: normalizeContentSource(x.contentSource),
        templateFallback: parseBoolean(x.templateFallback),

        draftId: x.draftId ?? null,
        draftStatus: x.draftStatus ?? null,
        draftMeta: asRecord(x.draftMeta),
        generationFailure: deriveGenerationFailure(x.draftStatus ?? null, asRecord(x.draftMeta)),
        outreachStatus: extractOutreachStatus(x),

        // ✅ expect backend arrays; fallback to empty
        emailAttachments: normalizeAttachments(x.emailAttachments),
        whatsappAttachments: normalizeAttachments(x.whatsappAttachments),
        whatsappOptedOut: Boolean(x.whatsappOptedOut ?? x.isWhatsappOptedOut ?? x.whatsapp_opted_out ?? false),
        whatsappOptOutSource: x.whatsappOptOutSource ?? x.optOutSource ?? null,
        whatsappOptOutReason: x.whatsappOptOutReason ?? x.optOutReason ?? null,
        whatsappOptOutPhoneE164: x.whatsappOptOutPhoneE164 ?? x.optOutPhoneE164 ?? null,
      }));

      setLeads(stabilizeLeadOrder(mapped));
      if (options?.syncSelectedLeadId) {
        const refreshedLead = mapped.find((item) => item.id === options.syncSelectedLeadId) || null;
        if (refreshedLead) {
          setSelectedLead(refreshedLead);
          setEditForm(refreshedLead);
        }
      }
      applyLatestCommonAttachment(commonRes?.data ?? null);
      setOptOutItems(Array.isArray(optOutRes?.items) ? optOutRes.items : []);
    } catch (e: any) {
      toast.error("Failed to load campaign", { description: e?.message });
    } finally {
      setIsEmailTemplateLoading(false);
      if (!options?.silent) {
        setLoading(false);
      }
    }
  };

  // const sendDraft = async (draftId: string) => api.post(`/api/v1/drafts/${draftId}/send`);
  const sendLeadEmailOnly = async (leadId: string, attachmentId?: string) =>
    api.post(`/api/leads/${leadId}/send-email`, null, {
      params: attachmentId ? { attachment_id: attachmentId } : undefined,
      timeout: 0,
    });
  const sendLeadWhatsappOnly = async (leadId: string) =>
    api.post(`/api/leads/${leadId}/send-whatsapp`, null, { timeout: 0 });


  const startPollingLead = (
    leadId: string,
    expectedChannels: Array<"email" | "whatsapp"> = ["email", "whatsapp"]
  ) => {
    if (expectedChannels.length === 0) return;

    const waitForEmail = expectedChannels.includes("email");
    const waitForWhatsapp = expectedChannels.includes("whatsapp");
    let tries = 0;
    const maxTries = 40;

    const t = setInterval(async () => {
      tries++;
      if (typeof document !== "undefined" && document.visibilityState !== "visible") {
        if (tries >= maxTries) clearInterval(t);
        return;
      }

      try {
        const res = await api.get(`/api/campaigns/${campaignId}/leads`, { params: { status: "all" } });
        const latest = (res.data.leads || []).find((x: any) => x.id === leadId);
        if (!latest) return;
        const latestOutreachStatus = extractOutreachStatus(latest);

        setLeads((prev) =>
          prev.map((l) =>
            l.id === leadId
              ? {
                ...l,
                approvalStatus: normalizeApprovalStatus(latest.approvalStatus ?? l.approvalStatus),
                reviewStatus: latest.reviewStatus ?? l.reviewStatus ?? null,
                isSuppressed: parseBoolean(latest.isSuppressed ?? l.isSuppressed),
                suppression: normalizeSuppressionMeta(latest.suppression) ?? l.suppression ?? null,
                contactReadOnly: parseBoolean(latest.contactReadOnly ?? l.contactReadOnly),
                sendable: typeof latest.sendable === "boolean" ? latest.sendable : l.sendable,
                channelCapabilities: normalizeChannelCapabilities(latest.channelCapabilities) ?? l.channelCapabilities ?? null,
                contentSource: latest.contentSource == null ? l.contentSource : normalizeContentSource(latest.contentSource),
                templateFallback:
                  latest.templateFallback == null ? l.templateFallback : parseBoolean(latest.templateFallback),
                draftStatus: latest.draftStatus ?? l.draftStatus,
                draftMeta: latest.draftMeta === undefined ? l.draftMeta ?? null : asRecord(latest.draftMeta),
                generationFailure:
                  latest.draftMeta === undefined && latest.draftStatus === undefined
                    ? l.generationFailure ?? null
                    : deriveGenerationFailure(latest.draftStatus ?? l.draftStatus, asRecord(latest.draftMeta) ?? l.draftMeta ?? null),
                outreachStatus: latestOutreachStatus ?? l.outreachStatus,
                emailAttachments: Array.isArray(latest.emailAttachments)
                  ? normalizeAttachments(latest.emailAttachments)
                  : l.emailAttachments,
                whatsappAttachments: Array.isArray(latest.whatsappAttachments)
                  ? normalizeAttachments(latest.whatsappAttachments)
                  : l.whatsappAttachments,
              }
              : l
          )
        );

        const s = latestOutreachStatus;
        if (s) {
          const emailDone = !waitForEmail || s.email === "sent" || s.email === "failed";
          const whatsappDone = !waitForWhatsapp || s.whatsapp === "sent" || s.whatsapp === "failed";
          if (emailDone && whatsappDone) {
            clearInterval(t);

            const emailSent = !waitForEmail || s.email === "sent";
            const whatsappSent = !waitForWhatsapp || s.whatsapp === "sent";
            if (emailSent && whatsappSent) {
              toast.success("Outreach sent successfully");
            } else {
              toast.error("Outreach completed with failures");
            }
            return;
          }
        }

        if (tries >= maxTries) {
          clearInterval(t);
          toast.info("Still sending, check again later");
        }
      } catch {
        if (tries >= maxTries) clearInterval(t);
      }
    }, 3000);
  };

  const setLeadSendActionLoading = (leadId: string, action: LeadSendAction, value: boolean) => {
    setLeadSendLoading((prev) => {
      const current = prev[leadId] || {};
      const next = { ...current, [action]: value };
      if (!next.both && !next.email && !next.whatsapp) {
        const clone = { ...prev };
        delete clone[leadId];
        return clone;
      }
      return { ...prev, [leadId]: next };
    });
  };

  const getLeadSendActionDisabledReason = (lead: Lead, action: LeadSendAction) => {
    const outreachStatus = buildOutreachStatus(lead);
    if (isLeadMarketingOptedOut(lead)) return "This lead is in the opt-out list and cannot receive any messages.";
    if (lead.sendable === false) return "This lead is currently not sendable.";
    const emailCapabilityReason = getEmailCapabilityDisabledReason(lead);
    const whatsappCapabilityReason = getWhatsappCapabilityDisabledReason(lead);
    if (action === "email" && isExecutedOutreachState(outreachStatus.email)) {
      return "Email already queued or sent.";
    }
    if (action === "whatsapp" && isExecutedOutreachState(outreachStatus.whatsapp)) {
      return "WhatsApp already queued or sent.";
    }
    if (
      action === "both" &&
      (isExecutedOutreachState(outreachStatus.email) || isExecutedOutreachState(outreachStatus.whatsapp))
    ) {
      return "Use the remaining channel action.";
    }
    if ((action === "both" || action === "email") && isCommonAttachmentUploading) {
      return "Attachment is still uploading.";
    }
    if (action === "email") return emailCapabilityReason;
    if (action === "whatsapp") return whatsappCapabilityReason;
    if (action === "both" && !hasText(lead.email) && !hasText(lead.phone)) {
      return "Lead has no phone or email.";
    }
    if (action === "both") return emailCapabilityReason || whatsappCapabilityReason;
    return null;
  };

  const runLeadSendAction = async (
    lead: Lead,
    action: LeadSendAction,
    options?: { manageLoading?: boolean }
  ) => {
    const previousOutreachStatus = buildOutreachStatus(lead);
    const expectedChannels =
      action === "both" ? (["email", "whatsapp"] as Array<"email" | "whatsapp">) : ([action] as Array<"email" | "whatsapp">);

    if (options?.manageLoading !== false) {
      setLeadSendActionLoading(lead.id, action, true);
    }
    setLeads((prev) =>
      prev.map((item) =>
        item.id === lead.id
          ? {
              ...item,
              outreachStatus: {
                email: expectedChannels.includes("email") ? "sending" : previousOutreachStatus.email,
                linkedin: previousOutreachStatus.linkedin,
                whatsapp: expectedChannels.includes("whatsapp") ? "sending" : previousOutreachStatus.whatsapp,
              },
            }
          : item
      )
    );

    try {
      const queuedChannels: Array<"email" | "whatsapp"> = [];
      const channelErrors: string[] = [];

      const appendQueuedChannels = (
        response: { data?: { queuedChannels?: unknown } } | undefined,
        fallbackChannels: Array<"email" | "whatsapp">
      ) => {
        const resolved = Array.isArray(response?.data?.queuedChannels)
          ? (response?.data?.queuedChannels as string[]).filter(
              (channel): channel is "email" | "whatsapp" => channel === "email" || channel === "whatsapp"
            )
          : fallbackChannels;

        for (const channel of resolved) {
          if (!queuedChannels.includes(channel)) queuedChannels.push(channel);
        }
      };

      const runChannelSend = async (channel: "email" | "whatsapp") => {
        try {
          const response =
            channel === "email"
              ? await sendLeadEmailOnly(lead.id, commonAttachmentId ?? undefined)
              : await sendLeadWhatsappOnly(lead.id);
          appendQueuedChannels(response, [channel]);
        } catch (error: any) {
          const detail = String(error?.response?.data?.detail || error?.message || "");
          if (isMarketingOptOutError(detail)) {
            throw error;
          }
          channelErrors.push(`${channel === "email" ? "Email" : "WhatsApp"}: ${detail || "Failed to queue."}`);
        }
      };

      if (action === "both") {
        await runChannelSend("email");
        await runChannelSend("whatsapp");
      } else {
        const response =
          action === "email"
            ? await sendLeadEmailOnly(lead.id, commonAttachmentId ?? undefined)
            : await sendLeadWhatsappOnly(lead.id);
        appendQueuedChannels(response, expectedChannels);
      }

      if (queuedChannels.length === 0 && channelErrors.length > 0) {
        throw new Error(channelErrors.join(" "));
      }

      setLeads((prev) =>
        prev.map((item) =>
          item.id === lead.id
            ? {
                ...item,
                outreachStatus: {
                  email: queuedChannels.includes("email") ? "queued" : previousOutreachStatus.email,
                  linkedin: previousOutreachStatus.linkedin,
                  whatsapp: queuedChannels.includes("whatsapp") ? "queued" : previousOutreachStatus.whatsapp,
                },
              }
            : item
        )
      );

      if (queuedChannels.length > 0) {
        startPollingLead(lead.id, queuedChannels);
      }

      if (action === "both" && channelErrors.length > 0) {
        toast.warning("Partially queued", {
          description: channelErrors.join(" "),
        });
      } else {
        toast.success(
          action === "both"
            ? "Outreach queued"
            : action === "email"
              ? "Email queued"
              : "WhatsApp queued"
        );
      }
    } catch (error: any) {
      const detail = String(error?.response?.data?.detail || error?.message || "");

      setLeads((prev) =>
        prev.map((item) =>
          item.id === lead.id
            ? {
                ...item,
                outreachStatus: previousOutreachStatus,
              }
            : item
        )
      );

      if (isMarketingOptOutError(detail)) {
        toast.warning("Lead is opted out", {
          description: "This lead is blocked from all marketing messages.",
        });
        await fetchAll();
        return;
      }

      toast.error(
        action === "both"
          ? "Send failed"
          : action === "email"
            ? "Email send failed"
            : "WhatsApp send failed",
        { description: detail || "Please try again." }
      );
    } finally {
      if (options?.manageLoading !== false) {
        setLeadSendActionLoading(lead.id, action, false);
      }
    }
  };

  const handleSendLeadAction = async (lead: Lead, action: LeadSendAction) => {
    if (!canManageLeadActions) return;
    const disabledReason = getLeadSendActionDisabledReason(lead, action);
    if (disabledReason) {
      toast.warning("Action blocked", { description: disabledReason });
      return;
    }

    await runLeadSendAction(lead, action);
  };

  useEffect(() => {
    if (!campaignId) return;
    leadOrderRef.current = new Map();
    void fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignId, persona]);

  useEffect(() => {
    if (!campaignId) return;

    const summary = consumeCampaignUploadSummary(campaignId);
    setUploadImportSummary(summary);
    if (!summary) return;

    toast.success("Lead sheet imported", {
      description: formatImportSummaryToast(summary),
    });
  }, [campaignId]);

  useEffect(() => {
    if (selectedLead) {
      setEditForm(selectedLead);
      setPendingEmailUploads([]);
      setPendingWhatsappUploads([]);
    }
  }, [selectedLead]);

  useEffect(() => {
    if (canManageLeadActions) return;
    setBulkSelectMode(false);
    setSelectedBulkLeadIds(new Set());
    setSelectedLead(null);
    setDisableTargetLead(null);
  }, [canManageLeadActions]);

  useEffect(() => {
    setSelectedBulkLeadIds((prev) => {
      const next = new Set<string>();
      prev.forEach((leadId) => {
        const lead = leadById.get(leadId);
        if (!lead) return;
        const blocked =
          lead.sendable === false ||
          lead.contactReadOnly ||
          lead.approvalStatus === "suppressed" ||
          lead.isSuppressed ||
          Boolean(lead.suppression?.active) ||
          Boolean(leadOptOutById.get(lead.id));
        if (!blocked) next.add(leadId);
      });
      return next;
    });
  }, [leadById, leadOptOutById]);

  useEffect(() => {
    if (!isTableFilterOpen) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!tableFilterRef.current) return;
      if (!tableFilterRef.current.contains(event.target as Node)) {
        setIsTableFilterOpen(false);
      }
    };

    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [isTableFilterOpen]);

  useEffect(() => {
    setCurrentPage(1);
  }, [leadFilter, tableSearch, jobTitleFilter, hasEmailOnly, domainFilter, phoneFilter]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const handleContentChange = (field: keyof Lead, value: string) => {
    setEditForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleItemsPerPageChange = (nextValue: string) => {
    const nextPageSize = Number(nextValue);
    if (!Number.isFinite(nextPageSize) || nextPageSize <= 0) return;

    const firstVisibleIndex = (currentPage - 1) * itemsPerPage;
    const nextPage = Math.floor(firstVisibleIndex / nextPageSize) + 1;

    setItemsPerPage(nextPageSize);
    setCurrentPage(nextPage);
  };

  const handleToggleBulkSelectMode = () => {
    if (!canManageLeadActions) return;
    setBulkSelectMode((prev) => {
      if (prev) {
        setSelectedBulkLeadIds(new Set());
      }
      return !prev;
    });
  };

  const handlePickUniversalAttachment = () => {
    if (!canManageLeadActions) return;
    if (!hasEmailLeads) {
      toast.warning("Email attachment unavailable", {
        description: "This campaign has no leads with email addresses.",
      });
      return;
    }
    universalAttachmentRef.current?.click();
  };

  const handleViewUniversalAttachment = () => {
    if (!universalAttachment?.url) {
      toast.error("No attachment selected");
      return;
    }
    window.open(universalAttachment.url, "_blank", "noopener,noreferrer");
  };

  const handleDeleteUniversalAttachment = async () => {
    if (!canManageLeadActions) return;
    if (!commonAttachmentId) {
      setUniversalAttachment(null);
      return;
    }

    try {
      await api.delete(`/api/campaigns/${campaignId}/common-attachment/${commonAttachmentId}`);
      setUniversalAttachment(null);
      setCommonAttachmentId(null);
      toast.success("Attachment removed");
    } catch (error: unknown) {
      const err = error as { response?: { data?: { detail?: string } }; message?: string };
      toast.error("Failed to delete attachment", {
        description: err.response?.data?.detail || err.message || "Please try again.",
      });
    }
  };

  const handleUniversalAttachmentChange = async (files: FileList | null) => {
    if (!canManageLeadActions) return;
    if (!hasEmailLeads) {
      toast.warning("Email attachment unavailable", {
        description: "This campaign has no leads with email addresses.",
      });
      return;
    }
    const picked = files?.[0];
    if (!picked) return;

    const allowedExt = new Set([".pdf", ".doc", ".docx", ".ppt", ".pptx", ".png", ".jpg", ".jpeg"]);
    const lower = picked.name.toLowerCase();
    const dot = lower.lastIndexOf(".");
    const ext = dot >= 0 ? lower.slice(dot) : "";
    if (ext && !allowedExt.has(ext)) {
      toast.error("Unsupported file type", { description: "Use PDF, DOC, PPT, PNG, JPG, or JPEG." });
      return;
    }

    if (picked.size > MAX_ATTACHMENT_BYTES) {
      toast.error("Attachment too large", { description: "File must be 3MB or smaller." });
      return;
    }

    try {
      setIsCommonAttachmentUploading(true);
      const res = await uploadCampaignCommonAttachment(campaignId, picked);
      setCommonAttachmentId(res.attachment_id);
      setUniversalAttachment({
        id: res.attachment_id,
        name: picked.name,
        mime: picked.type || "application/octet-stream",
        sizeBytes: picked.size,
        channel: "common",
      });
      try {
        const commonRes = await api.get(`/api/campaigns/${campaignId}/common-attachments`);
        applyLatestCommonAttachment(commonRes?.data ?? null);
      } catch {
        // keep fallback local metadata if list endpoint is temporarily unavailable
      }
      toast.success("Attachment uploaded", { description: picked.name });
    } catch (error: unknown) {
      const err = error as { response?: { data?: { detail?: string } }; message?: string };
      toast.error("Failed to upload attachment", {
        description: err.response?.data?.detail || err.message || "Please try again.",
      });
    } finally {
      setIsCommonAttachmentUploading(false);
    }
  };

  const handleSaveEmailTemplate = async () => {
    if (!canManageLeadActions || isEmailTemplateSaving) return;
    if (!hasEmailLeads) {
      toast.warning("Email template unavailable", {
        description: "Add at least one lead with an email address before saving an email template.",
      });
      return;
    }
    const emailSubject = emailTemplateSubject.trim();
    const emailBody = emailTemplateBody.trim();

    if (!emailSubject || !emailBody) {
      toast.error("Template subject and body are required");
      return;
    }

    try {
      setIsEmailTemplateSaving(true);
      const response = await saveCampaignEmailTemplate(campaignId, { emailSubject, emailBody });
      const template = response.template;
      setEmailTemplateId(template?.id ?? null);
      setEmailTemplateSubject(template?.emailSubject ?? emailSubject);
      setEmailTemplateBody(template?.emailBody ?? emailBody);
      setEmailTemplateUpdatedAt(template?.updatedAt ?? null);
      setFallbackDraftSummary(response.fallbackDrafts ?? null);
      toast.success("Email template saved", {
        description: response.fallbackDrafts ? formatFallbackDraftSummary(response.fallbackDrafts) : undefined,
      });
      await fetchAll({ silent: true });
    } catch (error: any) {
      toast.error("Template save failed", {
        description: error?.response?.data?.detail || error?.message || "Please try again.",
      });
    } finally {
      setIsEmailTemplateSaving(false);
    }
  };

  const handleDeleteEmailTemplate = async () => {
    if (!canManageLeadActions || isEmailTemplateDeleting) return;
    if (!emailTemplateId && !emailTemplateSubject.trim() && !emailTemplateBody.trim()) return;

    if (!emailTemplateId) {
      setEmailTemplateSubject("");
      setEmailTemplateBody("");
      setEmailTemplateUpdatedAt(null);
      setFallbackDraftSummary(null);
      return;
    }

    try {
      setIsEmailTemplateDeleting(true);
      const response = await deleteCampaignEmailTemplate(campaignId);
      setEmailTemplateId(null);
      setEmailTemplateSubject("");
      setEmailTemplateBody("");
      setEmailTemplateUpdatedAt(null);
      setFallbackDraftSummary(null);
      toast.success("Email template disabled", {
        description: response.fallbackDrafts ? formatFallbackDraftCleanup(response.fallbackDrafts) : undefined,
      });
      await fetchAll({ silent: true });
    } catch (error: any) {
      toast.error("Template delete failed", {
        description: error?.response?.data?.detail || error?.message || "Please try again.",
      });
    } finally {
      setIsEmailTemplateDeleting(false);
    }
  };

  const handleSelectBulkLead = (leadId: string, checked: boolean) => {
    const lead = leadById.get(leadId);
    if (!lead || isLeadSelectionBlocked(lead)) return;

    setSelectedBulkLeadIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(leadId);
      else next.delete(leadId);
      return next;
    });
  };

  const handleSelectAllCurrentPage = (checked: boolean) => {
    setSelectedBulkLeadIds((prev) => {
      const next = new Set(prev);
      for (const lead of selectableCurrentPageLeads) {
        if (checked) next.add(lead.id);
        else next.delete(lead.id);
      }
      return next;
    });
  };

  const handleSelectAllFiltered = () => {
    setSelectedBulkLeadIds(new Set(selectableFilteredLeads.map((lead) => lead.id)));
  };

  const isContentGenerationAbortError = (error: any) =>
    error?.code === "ERR_CANCELED" || error?.name === "CanceledError" || error?.name === "AbortError";

  const resetContentGenerationQueue = () => {
    contentGenerationPauseRequestedRef.current = false;
    setContentGenerationQueue({ ...EMPTY_CONTENT_GENERATION_QUEUE, remainingLeadIds: [] });
  };

  const runContentGenerationQueue = async (
    leadIds: string[],
    stats?: ContentGenerationStats,
    options?: { syncSelectedLeadId?: string }
  ) => {
    const total = stats?.total || leadIds.length;
    let completed = stats?.completed || 0;
    let generated = stats?.generated || 0;
    let failed = stats?.failed || 0;
    let suppressed = stats?.suppressed || 0;

    if (leadIds.length === 0) {
      resetContentGenerationQueue();
      return;
    }

    contentGenerationPauseRequestedRef.current = false;
    setContentGenerationQueue({
      status: "running",
      total,
      completed,
      generated,
      failed,
      suppressed,
      currentLeadId: null,
      remainingLeadIds: leadIds,
    });

    const controller = new AbortController();
    contentGenerationControllerRef.current = controller;
    try {
      const response = await generateSelectedCampaignLeadContent({
        campaignId,
        leadIds,
        signal: controller.signal,
      });
      completed += leadIds.length;
      if (response?.queued) {
        resetContentGenerationQueue();
        toast.success("Content generation queued", {
          description: `${leadIds.length} lead${leadIds.length === 1 ? "" : "s"} sent to the content generation worker.`,
        });
        await fetchAll({ silent: true, syncSelectedLeadId: options?.syncSelectedLeadId });
        return;
      }
      generated += Number(response?.generatedCount ?? 0);
      failed += Number(response?.failedCount ?? 0);
      suppressed += Number(response?.suppressedCount ?? 0);
    } catch (error: any) {
      if (isContentGenerationAbortError(error)) {
        setContentGenerationQueue({
          status: "paused",
          total,
          completed,
          generated,
          failed,
          suppressed,
          currentLeadId: null,
          remainingLeadIds: leadIds,
        });
        toast.info("Content generation stopped", {
          description: `${completed}/${total} lead${total === 1 ? "" : "s"} processed.`,
        });
        await fetchAll({ silent: true, syncSelectedLeadId: options?.syncSelectedLeadId });
        return;
      }
      failed += leadIds.length;
    } finally {
      if (contentGenerationControllerRef.current === controller) {
        contentGenerationControllerRef.current = null;
      }
    }

    resetContentGenerationQueue();
    toast.success("Content generation completed", {
      description: `Generated ${generated} lead${generated === 1 ? "" : "s"}. ${
        failed || suppressed ? `Skipped/failed ${failed + suppressed}.` : ""
      }`,
    });
    if (failed > 0) {
      toast.warning("Some content could not be generated", {
        description: `${failed} lead${failed === 1 ? "" : "s"} failed during generation.`,
      });
    }
    await fetchAll({ silent: true, syncSelectedLeadId: options?.syncSelectedLeadId });
  };

  const handleBulkGenerateContent = async () => {
    if (!canManageLeadActions || isContentGenerationActive) return;
    if (selectedContentGenerationCount === 0) {
      toast.error("Select leads for content generation", {
        description: "Selected leads need an email address and must not be suppressed or blocked.",
      });
      return;
    }
    if (selectedContentGenerationOverLimit) {
      toast.error("Select fewer leads", {
        description: `Generate content for ${SELECTED_CONTENT_GENERATION_LIMIT} or fewer leads at a time.`,
      });
      return;
    }

    const leadIds = selectedContentGenerationLeads.map((lead) => lead.id);
    contentGenerationPauseRequestedRef.current = false;
    await runContentGenerationQueue(leadIds);
  };

  const handleGenerateSelectedLeadAgain = async () => {
    if (!canManageLeadActions || !selectedLead || isContentGenerationActive) return;
    if (!hasText(selectedLead.email)) {
      toast.error("Email address required", {
        description: "This lead needs an email address before content can be generated.",
      });
      return;
    }
    if (isLeadSelectionBlocked(selectedLead)) {
      toast.warning("Generation blocked", {
        description: "This lead is suppressed or blocked for outreach.",
      });
      return;
    }

    await runContentGenerationQueue([selectedLead.id], undefined, { syncSelectedLeadId: selectedLead.id });
  };

  const handleStopContentGeneration = () => {
    if (!canManageLeadActions || contentGenerationQueue.status !== "running") return;
    contentGenerationPauseRequestedRef.current = true;
    contentGenerationControllerRef.current?.abort();
    setContentGenerationQueue((prev) => ({ ...prev, status: "stopping" }));
  };

  const handleContinueContentGeneration = async () => {
    if (!canManageLeadActions || contentGenerationQueue.status !== "paused") return;
    const remainingLeadIds = [...contentGenerationQueue.remainingLeadIds];
    if (remainingLeadIds.length === 0) {
      resetContentGenerationQueue();
      return;
    }
    contentGenerationPauseRequestedRef.current = false;
    await runContentGenerationQueue(remainingLeadIds, {
      total: contentGenerationQueue.total,
      completed: contentGenerationQueue.completed,
      generated: contentGenerationQueue.generated,
      failed: contentGenerationQueue.failed,
      suppressed: contentGenerationQueue.suppressed,
    });
  };

  const handleBulkSendRequest = (channel: BulkSendChannel) => {
    if (!canManageLeadActions) return;
    const selectedChannelCount = channel === "email" ? selectedBulkEmailCount : selectedBulkWhatsappCount;
    if (selectedChannelCount === 0) {
      toast.error(`Select at least one ${channel === "email" ? "email" : "WhatsApp"} lead`);
      return;
    }
    if (channel === "email" && isCommonAttachmentUploading) {
      toast.error("Attachment is still uploading");
      return;
    }
    setBulkSendChannel(channel);
    setShowBulkSendConfirm(true);
  };

  const handleConfirmBulkSend = async () => {
    if (!canManageLeadActions || selectedBulkChannelCount === 0 || isBulkSending) return;
    setIsBulkSending(true);

    try {
      const selectedLeads = Array.from(selectedBulkLeadIds)
        .map((leadId) => leadById.get(leadId))
        .filter((lead): lead is Lead => Boolean(lead));
      const eligibleLeads = bulkSendChannel === "email" ? selectedEmailSendLeads : selectedWhatsappSendLeads;
      const leadIds = eligibleLeads.map((lead) => lead.id);
      const skippedCount = selectedLeads.length - eligibleLeads.length;
      const channelLabel = bulkSendChannel === "email" ? "email" : "WhatsApp";

      if (leadIds.length === 0) {
        toast.error("Selected leads cannot be sent", {
          description: `Selected leads have no queueable ${channelLabel} channel.`,
        });
        setShowBulkSendConfirm(false);
        return;
      }

      const approveResult = await approveSelectedCampaignLeads({
        campaignId,
        leadIds,
      });

      const approvedLeadIds = Array.isArray(approveResult?.approvedLeadIds)
        ? approveResult.approvedLeadIds
        : leadIds;
      const suppressedFromApprove = Number(approveResult?.suppressedCount ?? 0);

      let sendSummaryMessage = "No sendable leads after suppression checks.";
      let queuedLeads = 0;
      let queuedEmail = 0;
      let queuedWhatsapp = 0;
      let suppressedFromSend = 0;
      let skippedNoChannel = 0;
      if (approvedLeadIds.length > 0) {
        const sendResult = await sendSelectedCampaignLeads({
          campaignId,
          leadIds: approvedLeadIds,
          attachmentId: bulkSendChannel === "email" ? commonAttachmentId ?? undefined : undefined,
          channel: bulkSendChannel,
        });
        queuedLeads = Number(sendResult?.queuedLeads ?? approvedLeadIds.length);
        queuedEmail = Number(sendResult?.queuedEmail ?? 0);
        queuedWhatsapp = Number(sendResult?.queuedWhatsapp ?? 0);
        suppressedFromSend = Number(sendResult?.suppressedOptOut ?? 0);
        skippedNoChannel = Number(sendResult?.skippedNoChannel ?? 0);
        sendSummaryMessage =
          sendResult?.message ||
          `Queued outreach for ${queuedLeads} lead(s).`;
      }

      toast.success(`Selected ${bulkSendChannel === "email" ? "email" : "WhatsApp"} processed`, {
        description: `Approved ${approvedLeadIds.length}, queued ${queuedLeads} lead(s) (${queuedEmail} email, ${queuedWhatsapp} WhatsApp). ${sendSummaryMessage}`,
      });

      const totalSuppressed = skippedCount + suppressedFromApprove + suppressedFromSend;
      if (totalSuppressed > 0) {
        toast.warning("Some leads were skipped", {
          description: `${totalSuppressed} lead(s) were blocked, already sent, or missing ${channelLabel} and were not queued.`,
        });
      }
      if (skippedNoChannel > 0) {
        toast.info("Some leads had no sendable channel", {
          description: `${skippedNoChannel} lead(s) were approved but had no queueable ${channelLabel} channel.`,
        });
      }

      setShowBulkSendConfirm(false);
      setBulkSelectMode(false);
      setSelectedBulkLeadIds(new Set());
      await fetchAll();
    } catch (error: any) {
      const detail = String(error?.response?.data?.detail || error?.message || "");
      if (isMarketingOptOutError(detail)) {
        toast.warning("Some selected leads are blocked", {
          description: "Suppressed leads are blocked from marketing outreach.",
        });
        await fetchAll();
        return;
      }
      toast.error("Failed to queue bulk outreach", {
        description: detail || "Please try again.",
      });
    } finally {
      setIsBulkSending(false);
    }
  };

  const handleReject = async (leadId: string) => {
    if (!canManageLeadActions) return;
    const lead = leadById.get(leadId);
    if (lead && isLeadMarketingOptedOut(lead)) {
      toast.warning("Action blocked", {
        description: "This lead is in the opt-out list and is read-only.",
      });
      return;
    }

    try {
      await api.put(`/api/leads/${leadId}/reject`);
      toast.success("Lead rejected");
      setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, approvalStatus: "rejected" } : l)));
    } catch (e: any) {
      toast.error("Reject failed", { description: e?.response?.data?.detail || e?.message });
    }
  };

  const handleApprove = async (leadId: string, action: LeadSendAction = "both") => {
    if (!canManageLeadActions) return;
    const lead = leadById.get(leadId);
    if (!lead) return;

    const disabledReason = getLeadSendActionDisabledReason(lead, action);
    if (disabledReason) {
      toast.warning("Action blocked", {
        description: disabledReason,
      });
      return;
    }

    try {
      setLeadSendActionLoading(leadId, action, true);
      const approveResponse = await api.put(`/api/leads/${leadId}/approve`, null, {
        timeout: OUTREACH_REQUEST_TIMEOUT_MS,
      });
      const approvedLead = approveResponse?.data ?? {};
      const resolvedStatus = normalizeApprovalStatus(approvedLead.approvalStatus ?? "approved");
      const resolvedSuppression = normalizeSuppressionMeta(approvedLead.suppression);
      const suppressedNow =
        resolvedStatus === "suppressed" ||
        parseBoolean(approvedLead.isSuppressed) ||
        parseBoolean(approvedLead.contactReadOnly) ||
        Boolean(resolvedSuppression?.active);
      const resolvedSendable =
        typeof approvedLead.sendable === "boolean"
          ? approvedLead.sendable
          : !suppressedNow;

      setLeads((prev) =>
        prev.map((item) =>
          item.id === leadId
            ? {
              ...item,
              approvalStatus: resolvedStatus,
              isSuppressed: suppressedNow,
              suppression: resolvedSuppression ?? item.suppression ?? null,
              contactReadOnly: suppressedNow || parseBoolean(approvedLead.contactReadOnly),
              sendable:
                typeof approvedLead.sendable === "boolean"
                  ? approvedLead.sendable
                  : suppressedNow
                    ? false
                    : item.sendable,
              channelCapabilities:
                normalizeChannelCapabilities(approvedLead.channelCapabilities) ?? item.channelCapabilities ?? null,
            }
            : item
        )
      );

      if (suppressedNow) {
        toast.warning("Lead suppressed", {
          description: resolvedSuppression?.reason || "This lead is blocked from all marketing messages.",
        });
        return;
      }
      if (!resolvedSendable) {
        toast.warning("Lead not sendable", {
          description: "This lead cannot be queued for outreach right now.",
        });
        return;
      }


      // ✅ NEW: send by leadId (backend locates latest draft)
      const approvedLeadState: Lead = {
        ...lead,
        approvalStatus: resolvedStatus,
        isSuppressed: suppressedNow,
        suppression: resolvedSuppression ?? lead.suppression ?? null,
        contactReadOnly: suppressedNow || parseBoolean(approvedLead.contactReadOnly),
        sendable:
          typeof approvedLead.sendable === "boolean"
            ? approvedLead.sendable
            : suppressedNow
              ? false
              : lead.sendable,
        channelCapabilities: normalizeChannelCapabilities(approvedLead.channelCapabilities) ?? lead.channelCapabilities ?? null,
      };

      await runLeadSendAction(approvedLeadState, action, { manageLoading: false });
    } catch (e: any) {
      const detail = String(e?.response?.data?.detail || e?.message || "");
      if (isMarketingOptOutError(detail)) {
        toast.warning("Lead is opted out", {
          description: "This lead is blocked from all marketing messages.",
        });
        await fetchAll();
        return;
      }
      toast.error("Approve/send failed", { description: detail });
    } finally {
      setLeadSendActionLoading(leadId, action, false);
    }
  };

  const openDisableWhatsappConfirm = (lead: Lead) => {
    if (!canManageLeadActions) return;
    if (!hasText(lead.phone) && !hasText(lead.email)) {
      toast.error("Lead has no phone or email");
      return;
    }
    if (isLeadMarketingOptedOut(lead)) {
      toast.info("Already opted out", {
        description: "This lead is already blocked for all marketing messages.",
      });
      return;
    }
    setDisableReason("");
    setDisableTargetLead(lead);
  };

  const closeDisableWhatsappConfirm = () => {
    if (isDisablingWhatsapp) return;
    setDisableTargetLead(null);
    setDisableReason("");
  };

  const handleConfirmDisableWhatsapp = async () => {
    if (!canManageLeadActions || !disableTargetLead || isDisablingWhatsapp) return;

    try {
      setIsDisablingWhatsapp(true);
      const response = await disableLeadWhatsApp(
        disableTargetLead.id,
        disableReason.trim() || undefined
      );
      const effectiveReason = disableReason.trim() || "disabled from frontend marketing controls";

      setLeads((prev) =>
        prev.map((lead) =>
          lead.id === disableTargetLead.id
            ? {
              ...lead,
              approvalStatus: "suppressed",
              isSuppressed: true,
              contactReadOnly: true,
              sendable: false,
              suppression: {
                active: true,
                scope: "marketing",
                matchedBy: response.phoneE164 ? "phone" : response.email ? "email" : null,
                source: response.source || "manual_disable",
                reason: response.reason || effectiveReason,
                provider: "frontend",
                phoneE164: response.phoneE164 || lead.phone || null,
                email: response.email || lead.email || null,
                personId: lead.id,
                campaignId: campaignId || null,
              },
              whatsappOptedOut: true,
              whatsappOptOutSource: response.source || "manual_disable",
              whatsappOptOutReason: response.reason || effectiveReason,
              whatsappOptOutPhoneE164: response.phoneE164 || lead.phone || null,
            }
            : lead
        )
      );

      toast.success("Lead added to opt-out", {
        description: `${disableTargetLead.employeeName} will not receive any marketing messages.`,
      });

      setDisableTargetLead(null);
      setDisableReason("");
      await fetchAll();
    } catch (error: any) {
      toast.error("Failed to disable marketing", {
        description: error?.response?.data?.detail || error?.message || "Please try again.",
      });
    } finally {
      setIsDisablingWhatsapp(false);
    }
  };

  const openSmsDialog = (lead: Lead) => {
    if (!canManageLeadActions) return;
    if (!hasText(lead.phone)) {
      toast.error("Lead has no phone number");
      return;
    }
    if (isLeadMarketingOptedOut(lead)) {
      toast.warning("Action blocked", {
        description: "This lead is in the opt-out list and is read-only.",
      });
      return;
    }

    setSmsMessage("");
    setSmsTargetLead(lead);
  };

  const closeSmsDialog = () => {
    if (isSendingSms) return;
    setSmsTargetLead(null);
    setSmsMessage("");
  };

  const personalizeFollowUpTemplate = (value: string, lead: Lead) => {
    const firstName = lead.employeeName.trim().split(/\s+/)[0] || "there";
    return value
      .replace(/{{\s*(first_name|firstName|name)\s*}}/gi, firstName)
      .replace(/{{\s*(company|companyName)\s*}}/gi, lead.company || "your company")
      .replace(/{{\s*campaignName\s*}}/gi, campaign?.name || "our campaign");
  };

  const followUpContentForStage = (stage: number, lead: Lead) => {
    const template = followUpTemplates[stage];
    const subject = template?.isActive && template.subject.trim() ? template.subject : "Quick follow-up";
    const body =
      template?.isActive && template.body.trim()
        ? template.body
        : "Hi {{first_name}},\n\nI wanted to follow up on my earlier email about {{campaignName}}.\n\nWould you be open to a quick conversation?\n\nBest,";
    return {
      templateId: template?.isActive ? template.id : undefined,
      subject: personalizeFollowUpTemplate(subject, lead),
      body: personalizeFollowUpTemplate(body, lead),
    };
  };

  const followUpHistoryFromResponse = (payload: any): FollowUpHistoryItem[] => {
    const rows = payload?.history ?? payload?.items ?? [];
    if (!Array.isArray(rows)) return [];
    return rows
      .map((row: any) => ({
        id: String(row?.id || ""),
        stage: Number(row?.stage),
        status: String(row?.status || "draft") as FollowUpHistoryItem["status"],
        subject: String(row?.subject || ""),
        sentAt: row?.sentAt ?? null,
        errorMessage: row?.errorMessage ?? null,
      }))
      .filter((row) => row.stage >= 1 && row.stage <= FOLLOW_UP_STEPS.length);
  };

  const openFollowUpComposer = async (lead: Lead) => {
    if (!canManageLeadActions || !isLeadEmailActionCompleted(lead)) return;
    if (isLeadMarketingOptedOut(lead)) {
      toast.warning("Action blocked", { description: "This lead is in the opt-out list and cannot receive email." });
      return;
    }

    try {
      const response = await api.get(`/api/leads/${lead.id}/follow-ups`);
      const nextStage = Number(response?.data?.nextStage);
      if (!Number.isInteger(nextStage) || nextStage < 1 || nextStage > FOLLOW_UP_STEPS.length) {
        toast.info("All follow-ups have already been sent");
        return;
      }
      const content = followUpContentForStage(nextStage, lead);
      setFollowUpHistory(followUpHistoryFromResponse(response?.data));
      setFollowUpStep(nextStage - 1);
      setFollowUpSubject(content.subject);
      setFollowUpBody(content.body);
      setFollowUpTargetLead(lead);
    } catch (error: any) {
      toast.error("Could not load follow-up history", { description: error?.response?.data?.detail || error?.message });
    }
  };

  const selectFollowUpStep = (stepIndex: number) => {
    if (!followUpTargetLead) return;
    const stage = stepIndex + 1;
    const existing = followUpHistory.find((item) => item.stage === stage && (item.status === "queued" || item.status === "sent"));
    if (existing) {
      toast.info(`${FOLLOW_UP_STEPS[stepIndex]} is already ${existing.status}`);
      return;
    }
    const content = followUpContentForStage(stage, followUpTargetLead);
    setFollowUpStep(stepIndex);
    setFollowUpSubject(content.subject);
    setFollowUpBody(content.body);
  };

  const closeFollowUpComposer = () => {
    if (isSendingFollowUp) return;
    setFollowUpTargetLead(null);
    setFollowUpHistory([]);
    setFollowUpStep(0);
    setFollowUpSubject("");
    setFollowUpBody("");
  };

  const handleSendFollowUp = async () => {
    if (!followUpTargetLead || isSendingFollowUp) return;
    const subject = followUpSubject.trim();
    const body = followUpBody.trim();
    if (!subject || !body) {
      toast.error("Follow-up subject and body are required");
      return;
    }

    try {
      setIsSendingFollowUp(true);
      const stage = followUpStep + 1;
      const response = await api.post(`/api/leads/${followUpTargetLead.id}/follow-ups`, {
        stage,
        templateId: followUpTemplates[stage]?.isActive ? followUpTemplates[stage]?.id : undefined,
        subject,
        body,
        sendNow: true,
      });
      setFollowUpHistory(followUpHistoryFromResponse(response?.data));
      toast.success(`${FOLLOW_UP_STEPS[followUpStep]} queued`, {
        description: `Your follow-up to ${followUpTargetLead.employeeName || "the lead"} is being sent.`,
      });
      setFollowUpTargetLead(null);
      setFollowUpHistory([]);
      setFollowUpStep(0);
      setFollowUpSubject("");
      setFollowUpBody("");
    } catch (error: any) {
      toast.error("Could not send follow-up", { description: error?.response?.data?.detail || error?.message });
    } finally {
      setIsSendingFollowUp(false);
    }
  };

  const handleSendNextFollowUp = async (lead: Lead) => {
    if (quickFollowUpLeadId || isLeadMarketingOptedOut(lead)) return;
    try {
      setQuickFollowUpLeadId(lead.id);
      const historyResponse = await api.get(`/api/leads/${lead.id}/follow-ups`);
      const stage = Number(historyResponse?.data?.nextStage);
      if (!Number.isInteger(stage) || stage < 1 || stage > FOLLOW_UP_STEPS.length) {
        toast.info("All follow-ups have already been sent");
        return;
      }
      const content = followUpContentForStage(stage, lead);
      await api.post(`/api/leads/${lead.id}/follow-ups`, {
        stage,
        templateId: content.templateId,
        subject: content.subject,
        body: content.body,
        sendNow: true,
      });
      toast.success(`${FOLLOW_UP_STEPS[stage - 1]} queued`);
    } catch (error: any) {
      toast.error("Could not send follow-up", { description: error?.response?.data?.detail || error?.message });
    } finally {
      setQuickFollowUpLeadId(null);
    }
  };

  const handleSaveFollowUpTemplate = async () => {
    if (!canManageLeadActions || isSavingFollowUpTemplate) return;
    const template = followUpTemplates[selectedFollowUpTemplateStage];
    const subject = template.subject.trim();
    const body = template.body.trim();
    if (!subject || !body) {
      toast.error("Follow-up template subject and body are required");
      return;
    }

    try {
      setIsSavingFollowUpTemplate(true);
      const response = await api.put(
        `/api/campaigns/${campaignId}/follow-up-templates/${selectedFollowUpTemplateStage}`,
        { subject, body, isActive: template.isActive }
      );
      const saved = response?.data?.template ?? response?.data ?? {};
      setFollowUpTemplates((previous) => ({
        ...previous,
        [selectedFollowUpTemplateStage]: {
          ...previous[selectedFollowUpTemplateStage],
          id: saved.id ? String(saved.id) : previous[selectedFollowUpTemplateStage].id,
          subject: String(saved.subject ?? saved.emailSubject ?? subject),
          body: String(saved.body ?? saved.emailBody ?? body),
          isActive: saved.isActive ?? template.isActive,
          updatedAt: saved.updatedAt ?? new Date().toISOString(),
        },
      }));
      toast.success(`${FOLLOW_UP_STEPS[selectedFollowUpTemplateStage - 1]} template saved`);
    } catch (error: any) {
      toast.error("Follow-up template save failed", {
        description: error?.response?.data?.detail || error?.message || "Please try again.",
      });
    } finally {
      setIsSavingFollowUpTemplate(false);
    }
  };

  const handleClearFollowUpTemplate = async () => {
    if (isSavingFollowUpTemplate) return;
    const template = followUpTemplates[selectedFollowUpTemplateStage];
    try {
      setIsSavingFollowUpTemplate(true);
      if (template.id) {
        await api.delete(`/api/campaigns/${campaignId}/follow-up-templates/${selectedFollowUpTemplateStage}`);
      }
      setFollowUpTemplates((previous) => ({
        ...previous,
        [selectedFollowUpTemplateStage]: {
          stage: selectedFollowUpTemplateStage,
          subject: "",
          body: "",
          isActive: true,
        },
      }));
      toast.success("Follow-up template cleared");
    } catch (error: any) {
      toast.error("Could not clear follow-up template", {
        description: error?.response?.data?.detail || error?.message || "Please try again.",
      });
    } finally {
      setIsSavingFollowUpTemplate(false);
    }
  };

  const handleSendAdminSms = async () => {
    if (!canManageLeadActions || !smsTargetLead || isSendingSms) return;

    const message = smsMessage.trim();
    if (!message) {
      toast.error("SMS message is required");
      return;
    }

    try {
      setIsSendingSms(true);
      const result = await sendAdminLeadSms(smsTargetLead.id, message);
      toast.success("SMS sent", {
        description: `${smsTargetLead.employeeName || "Lead"} received the message at ${result.to || smsTargetLead.phone}.`,
      });
      closeSmsDialog();
    } catch (error: any) {
      const detail = String(error?.response?.data?.detail || error?.message || "Please try again.");
      if (isMarketingOptOutError(detail)) {
        toast.warning("Lead is opted out", {
          description: "This lead is blocked from all marketing messages.",
        });
        await fetchAll();
        return;
      }
      toast.error("SMS send failed", { description: detail });
    } finally {
      setIsSendingSms(false);
    }
  };

  const handleCopyLeadDetails = async (lead: Lead) => {
    try {
      await writeToClipboard(buildLeadClipboardText(lead));
      toast.success("Lead details copied");
    } catch (error: any) {
      toast.error("Copy failed", { description: error?.message || "Could not copy details." });
    }
  };

  const buildExportFilenameBase = () => {
    const campaignPart = sanitizeFileNamePart(campaign?.name || "campaign");
    const datePart = new Date().toISOString().slice(0, 10);
    return `${campaignPart || "campaign"}-all-leads-${datePart}`;
  };

  const handleExportCsv = () => {
    if (exportRows.length === 0) {
      toast.error("No leads to export");
      return;
    }

    const headerLine = EXPORT_HEADERS.map((key) => escapeCsv(EXPORT_HEADER_LABELS[key])).join(",");
    const dataLines = exportRows.map((row) => EXPORT_HEADERS.map((key) => escapeCsv(row[key])).join(","));
    const csv = [headerLine, ...dataLines].join("\n");

    triggerFileDownload(`${buildExportFilenameBase()}.csv`, "text/csv;charset=utf-8", csv);
    toast.success(`CSV exported (${exportRows.length} leads)`);
  };


  // -----------------------------
  // File picking (separate)
  // -----------------------------
  const openEmailPicker = () => emailFileRef.current?.click();
  const openWhatsappPicker = () => whatsappFileRef.current?.click();

  const pushPickedFiles = (files: FileList | null, setPending: React.Dispatch<React.SetStateAction<PendingUpload[]>>) => {
    if (!files || files.length === 0) return;

    const picked: PendingUpload[] = [];
    for (const f of Array.from(files)) {
      if (f.size > MAX_ATTACHMENT_BYTES) {
        toast.error("Attachment too large", { description: `${f.name} exceeds 3MB.` });
        continue;
      }
      picked.push({
        tempId: crypto.randomUUID(),
        file: f,
        name: f.name,
        mime: f.type || "application/octet-stream",
        sizeBytes: f.size,
      });
    }

    if (picked.length === 0) return;

    setPending((prev) => {
      const existing = new Set(prev.map((p) => `${p.name}::${p.sizeBytes}`));
      const filtered = picked.filter((p) => !existing.has(`${p.name}::${p.sizeBytes}`));
      if (filtered.length !== picked.length) toast.info("Some files were skipped (duplicates).");
      return [...prev, ...filtered];
    });
  };

  const removePending = (tempId: string, channel: AttachmentChannel) => {
    if (channel === "email") setPendingEmailUploads((prev) => prev.filter((p) => p.tempId !== tempId));
    else setPendingWhatsappUploads((prev) => prev.filter((p) => p.tempId !== tempId));
  };

  const removeUploadedAttachment = async (attachmentId: string, channel: AttachmentChannel) => {
    if (!selectedLead) return;
    try {
      await deleteLeadAttachment(api, selectedLead.id, attachmentId);

      if (channel === "email") {
        setEditForm((prev) => ({
          ...prev,
          emailAttachments: ((prev.emailAttachments as Attachment[]) || []).filter((a) => a.id !== attachmentId),
        }));
        setLeads((prev) =>
          prev.map((l) =>
            l.id === selectedLead.id ? { ...l, emailAttachments: (l.emailAttachments || []).filter((a) => a.id !== attachmentId) } : l
          )
        );
      } else {
        setEditForm((prev) => ({
          ...prev,
          whatsappAttachments: ((prev.whatsappAttachments as Attachment[]) || []).filter((a) => a.id !== attachmentId),
        }));
        setLeads((prev) =>
          prev.map((l) =>
            l.id === selectedLead.id
              ? { ...l, whatsappAttachments: (l.whatsappAttachments || []).filter((a) => a.id !== attachmentId) }
              : l
          )
        );
      }

      toast.success("Attachment removed");
    } catch (e: any) {
      toast.error("Failed to remove attachment", { description: e?.response?.data?.detail || e?.message });
    }
  };

  const closeModal = () => {
    setSelectedLead(null);
    setEditForm({});
    setPendingEmailUploads([]);
    setPendingWhatsappUploads([]);
  };

  const handleClearContentPreview = () => {
    setEditForm((prev) => ({
      ...prev,
      contentEmailSubject: "",
      contentEmail: "",
    }));
  };

  const mergeLeadContentResponse = (lead: Lead, data: any): Lead => ({
    ...lead,
    draftId: data.draftId == null ? lead.draftId ?? null : String(data.draftId),
    draftStatus: data.draftStatus == null ? lead.draftStatus ?? null : String(data.draftStatus),
    draftMeta: data.draftMeta === undefined ? lead.draftMeta ?? null : asRecord(data.draftMeta),
    generationFailure:
      data.draftMeta === undefined && data.draftStatus === undefined
        ? lead.generationFailure ?? null
        : deriveGenerationFailure(data.draftStatus ?? lead.draftStatus, asRecord(data.draftMeta) ?? lead.draftMeta ?? null),
    contentEmailSubject: data.contentEmailSubject ?? "",
    contentEmail: data.contentEmail ?? "",
    contentLinkedin: data.contentLinkedin ?? "",
    contentWhatsapp: data.contentWhatsapp ?? "",
    contentSource: data.contentSource == null ? "empty" : normalizeContentSource(data.contentSource),
    templateFallback: data.templateFallback == null ? false : parseBoolean(data.templateFallback),
    approvalStatus: (data.approvalStatus ?? lead.approvalStatus ?? "pending") as ApprovalStatus,
    reviewStatus: data.reviewStatus ?? data.approvalStatus ?? lead.reviewStatus ?? null,
    isSuppressed: data.isSuppressed == null ? lead.isSuppressed : Boolean(data.isSuppressed),
    suppression: data.suppression === undefined ? lead.suppression : data.suppression,
    contactReadOnly: data.contactReadOnly == null ? lead.contactReadOnly : Boolean(data.contactReadOnly),
    sendable: data.sendable == null ? lead.sendable : Boolean(data.sendable),
    channelCapabilities: data.channelCapabilities ?? lead.channelCapabilities,
  });

  const applyLeadContentResponses = (items: any[]) => {
    const byId = new Map(items.filter((item) => item?.id).map((item) => [String(item.id), item]));
    if (byId.size === 0) return;

    setLeads((prev) => prev.map((lead) => (byId.has(lead.id) ? mergeLeadContentResponse(lead, byId.get(lead.id)) : lead)));
    setSelectedLead((prev) => (prev && byId.has(prev.id) ? mergeLeadContentResponse(prev, byId.get(prev.id)) : prev));

    const activeLeadId = selectedLead?.id;
    if (activeLeadId && byId.has(activeLeadId)) {
      const data = byId.get(activeLeadId);
      setEditForm((prev) => ({
        ...prev,
        contentEmailSubject: data.contentEmailSubject ?? "",
        contentEmail: data.contentEmail ?? "",
        contentLinkedin: data.contentLinkedin ?? "",
        contentWhatsapp: data.contentWhatsapp ?? "",
        contentSource: data.contentSource == null ? "empty" : normalizeContentSource(data.contentSource),
        templateFallback: data.templateFallback == null ? false : parseBoolean(data.templateFallback),
        approvalStatus: (data.approvalStatus ?? "pending") as ApprovalStatus,
        reviewStatus: data.reviewStatus ?? data.approvalStatus ?? null,
        draftStatus: data.draftStatus ?? prev.draftStatus ?? null,
        draftMeta: data.draftMeta === undefined ? (prev.draftMeta as Record<string, unknown> | null) ?? null : asRecord(data.draftMeta),
        generationFailure: deriveGenerationFailure(
          data.draftStatus ?? prev.draftStatus ?? null,
          data.draftMeta === undefined ? (prev.draftMeta as Record<string, unknown> | null) ?? null : asRecord(data.draftMeta)
        ),
      }));
    }
  };

  const handleResetContentPreview = async () => {
    if (!canManageLeadActions || !selectedLead || isResettingContent) return;

    setIsResettingContent(true);
    try {
      const result = await resetLeadContent(selectedLead.id);
      applyLeadContentResponses([result]);
      toast.success("Content reset", {
        description: "This lead now has empty content and will stay empty after refresh.",
      });
      await fetchAll({ silent: true });
    } catch (e: any) {
      toast.error("Reset failed", { description: e?.response?.data?.detail || e?.message });
    } finally {
      setIsResettingContent(false);
    }
  };

  const handleBulkResetContent = async () => {
    if (!canManageLeadActions || isBulkResettingContent || selectedContentResetCount === 0) return;

    setIsBulkResettingContent(true);
    try {
      const result = await resetSelectedCampaignLeadContent({
        campaignId,
        leadIds: selectedContentResetLeads.map((lead) => lead.id),
      });
      applyLeadContentResponses(result.leads || []);
      toast.success("Selected content reset", {
        description: `${result.resetCount} lead${result.resetCount === 1 ? "" : "s"} reset to empty content.`,
      });
      if (result.failedCount > 0) {
        toast.warning("Some selected leads were not reset", {
          description: `${result.failedCount} lead${result.failedCount === 1 ? "" : "s"} failed.`,
        });
      }
      await fetchAll({ silent: true });
    } catch (e: any) {
      toast.error("Selected reset failed", { description: e?.response?.data?.detail || e?.message });
    } finally {
      setIsBulkResettingContent(false);
    }
  };

  // -----------------------------
  // Save only (content updates only)
  // -----------------------------
  const handleSave = async () => {
    if (!canManageLeadActions || !selectedLead) return;

    setSaving(true);
    const leadId = selectedLead.id;

    try {
      const ignoredAttachmentChanges = pendingEmailUploads.length > 0 || pendingWhatsappUploads.length > 0;

      // Save content only. Attachment flows stay separate from this button.
      const payload = {
        contentEmailSubject: editForm.contentEmailSubject,
        contentEmail: editForm.contentEmail,
        contentLinkedin: editForm.contentLinkedin,
        contentWhatsapp: editForm.contentWhatsapp,
      };

      const res = await api.put(`/api/leads/${leadId}/content`, payload);

      // Update local row content only.
      setLeads((prev) =>
        prev.map((l) =>
          l.id === leadId
            ? {
              ...l,
              contentEmailSubject: res.data.contentEmailSubject ?? l.contentEmailSubject,
              contentEmail: res.data.contentEmail ?? l.contentEmail,
              contentLinkedin: res.data.contentLinkedin ?? l.contentLinkedin,
              contentWhatsapp: res.data.contentWhatsapp ?? l.contentWhatsapp,
              contentSource: res.data.contentSource == null ? "manual" : normalizeContentSource(res.data.contentSource),
              templateFallback:
                res.data.templateFallback == null ? false : parseBoolean(res.data.templateFallback),
              draftStatus: res.data.draftStatus ?? l.draftStatus,
              draftMeta: res.data.draftMeta === undefined ? l.draftMeta ?? null : asRecord(res.data.draftMeta),
              generationFailure:
                res.data.draftMeta === undefined && res.data.draftStatus === undefined
                  ? l.generationFailure ?? null
                  : deriveGenerationFailure(res.data.draftStatus ?? l.draftStatus, asRecord(res.data.draftMeta) ?? l.draftMeta ?? null),
              reviewStatus: res.data.reviewStatus ?? l.reviewStatus ?? null,
            }
            : l
        )
      );

      setSelectedLead(null);
      setEditForm({});
      setPendingEmailUploads([]);
      setPendingWhatsappUploads([]);
      if (ignoredAttachmentChanges) {
        toast.info("Attachment changes were not saved", {
          description: "Save only stores content updates. Attachments are handled separately.",
        });
      }
      toast.success("Changes saved");
    } catch (e: any) {
      const detail = String(e?.response?.data?.detail || e?.message || "");
      toast.error("Save failed", { description: detail });
    } finally {
      setSaving(false);
    }
  };

  const selectedGenerationFailure =
    selectedLead?.generationFailure ?? (editForm.generationFailure as GenerationFailureInfo | null | undefined) ?? null;
  const selectedContentEmpty =
    Boolean(selectedLead) && !hasText(editForm.contentEmailSubject) && !hasText(editForm.contentEmail);
  const selectedEmptyContentNotice = selectedContentEmpty
    ? {
        title: selectedGenerationFailure?.title || "No generated content available",
        reason:
          selectedGenerationFailure?.reason ||
          "This lead has empty saved content. Generate again to create personalized content for review.",
        guidance:
          selectedGenerationFailure?.guidance ||
          "The next run will use the latest lead, event, website, and validation context.",
        status: selectedGenerationFailure?.status || "generation_failed",
        details: selectedGenerationFailure?.details || [],
        metrics: selectedGenerationFailure?.metrics || [],
        evidence: selectedGenerationFailure?.evidence || [],
      }
    : null;
  const isGeneratingSelectedLeadAgain =
    Boolean(selectedLead) &&
    isContentGenerationActive &&
    contentGenerationQueue.remainingLeadIds.includes(selectedLead?.id || "");

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

        <div className="relative z-[1] flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="truncate text-xl font-semibold tracking-tight text-zinc-900">{campaign?.name || "Campaign"}</h1>
              <Badge className="rounded-full border border-zinc-300/80 bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-700 shadow-none backdrop-blur-[6px] [backdrop-filter:saturate(130%)_blur(6px)]">
                {String(campaign?.status || "needs_review").replaceAll("_", " ")}
              </Badge>
              {categoryChipLabel ? (
                <>
                  <span className="h-4 w-px bg-zinc-300/80" aria-hidden="true" />
                  <Badge className="rounded-full border border-blue-200/80 bg-blue-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-blue-700 shadow-none">
                    {categoryChipLabel}
                  </Badge>
                </>
              ) : null}
            </div>
            <div className="mt-1 flex items-center gap-2 text-xs text-zinc-500/90">
              <span>Created {formatDateOnly(campaign?.createdAt)}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start">
            <Link href="/campaigns">
              <Button className="analytics-frost-btn h-9 px-3.5">
                <ArrowLeft className="h-4 w-4" />
                Back to Campaigns
              </Button>
            </Link>
          </div>
        </div>

        {canManageLeadActions ? (
          <div className="relative z-[1] mt-3 grid gap-3 border-t border-zinc-100/80 pt-3 sm:grid-cols-2 xl:grid-cols-6">
            {[
              { label: "Total Leads", value: totalLeadCount, valueClass: "text-zinc-900" },
              { label: "Pending", value: pendingMetricCount, valueClass: "text-zinc-900" },
              { label: "Approved", value: approvedMetricCount, valueClass: "text-sidebar-primary" },
              { label: "Sendable Approved", value: sendableApprovedCount, valueClass: "text-emerald-700" },
              { label: "Suppressed", value: suppressedMetricCount, valueClass: "text-rose-700" },
              { label: "Rejected", value: rejectedMetricCount, valueClass: "text-zinc-500" },
            ].map((metric) => (
              <Card key={metric.label} className="rounded-2xl border border-zinc-300 bg-white p-3">
                <div className="flex h-full flex-col">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500/90">{metric.label}</span>
                  <div className="mt-auto flex items-end">
                    <span className={`text-xl font-semibold tracking-tight ${metric.valueClass}`}>{metric.value}</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : null}
      </div>

      {canManageLeadActions && uploadImportSummary ? (
        <Card className="relative mt-3 overflow-hidden rounded-2xl border border-emerald-200/80 bg-[linear-gradient(160deg,rgba(236,253,245,0.92)_0%,rgba(255,255,255,0.92)_60%,rgba(240,253,250,0.84)_100%)] p-5 shadow-[0_16px_28px_-24px_rgba(5,150,105,0.68)]">
          <div className="pointer-events-none absolute -right-12 -top-12 h-28 w-28 rounded-full bg-emerald-200/45 blur-3xl" />
          <div className="relative z-[1]">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-700/80">
                  Lead Sheet Imported
                </p>
                <h2 className="mt-1 text-lg font-semibold tracking-tight text-zinc-900">
                  Campaign is ready for review
                </h2>
                <p className="mt-1 text-sm text-zinc-600">
                  Imported from <span className="font-semibold text-zinc-900">{uploadImportSummary.fileName}</span>.
                  Uploaded campaigns use only CSV leads for approval and outreach.
                </p>
              </div>

              <Badge className="w-fit rounded-full border border-emerald-200/90 bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 shadow-none">
                Review Ready
              </Badge>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              {[
                { label: "Imported Leads", value: uploadImportSummary.importedLeads },
                { label: "Companies", value: uploadImportSummary.companies },
                { label: "Invalid Rows", value: uploadImportSummary.invalidRows },
                { label: "Duplicates", value: uploadImportSummary.duplicatesCollapsed },
                { label: "Rejected Rows", value: uploadImportSummary.rejectedRows },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-xl border border-emerald-100/80 bg-white/80 px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.92)]"
                >
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                    {item.label}
                  </p>
                  <p className="mt-1 text-xl font-semibold tracking-tight text-zinc-900">
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </Card>
      ) : null}

      {canManageLeadActions ? (
        <Card className="relative mt-3 overflow-hidden rounded-2xl border border-[rgb(255_255_255_/_0.82)] bg-[linear-gradient(160deg,rgba(255,255,255,0.86)_0%,rgba(250,252,255,0.7)_58%,rgba(240,246,253,0.58)_100%)] p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.82),0_12px_24px_-22px_rgba(2,10,27,0.55),inset_0_1px_0_rgba(255,255,255,1)] backdrop-blur-[14px] [backdrop-filter:saturate(168%)_blur(14px)]">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start">
            <div className="min-w-0 xl:w-80">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-md border border-zinc-300 bg-white">
                  <Mail className="h-4 w-4 text-zinc-900" />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-sm font-semibold text-zinc-900">Email Template</h2>
                    <Badge className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide shadow-none ${
                      emailTemplateId
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-zinc-300 bg-white text-zinc-500"
                    }`}>
                      {emailTemplateId ? "Active" : "Not Set"}
                    </Badge>
                  </div>
                  {emailTemplateUpdatedAt ? (
                    <p className="mt-0.5 text-xs text-zinc-500">Updated {formatDateTime(emailTemplateUpdatedAt)}</p>
                  ) : (
                    <p className="mt-0.5 text-xs text-zinc-500">Campaign-level fallback email content</p>
                  )}
                  <p className={`mt-1 text-xs ${hasEmailLeads ? "text-zinc-500" : "font-medium text-amber-700"}`}>
                    {hasEmailLeads
                      ? `${emailLeadCount} lead${emailLeadCount === 1 ? "" : "s"} with email`
                      : "No leads with email. Mail controls are disabled."}
                  </p>
                </div>
              </div>

              {fallbackDraftSummary ? (
                <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50/70 px-3 py-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700">Fallback Drafts</p>
                  <p className="mt-1 text-sm font-semibold text-zinc-900">
                    {formatFallbackDraftSummary(fallbackDraftSummary)}
                  </p>
                </div>
              ) : null}
            </div>

            <div className="grid min-w-0 flex-1 gap-3 xl:grid-cols-[minmax(16rem,24rem)_minmax(24rem,1fr)]">
              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  Email Subject
                </label>
                <Input
                  value={emailTemplateSubject}
                  onChange={(event) => setEmailTemplateSubject(event.target.value)}
                  disabled={emailTemplateSaveDisabled}
                  placeholder="e.g. Digital Stadium 2026"
                  className="h-10 border-zinc-300/85 bg-white/90 text-sm text-zinc-900 placeholder:text-zinc-400"
                />
              </div>

              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  Email Body
                </label>
                <textarea
                  value={emailTemplateBody}
                  onChange={(event) => setEmailTemplateBody(event.target.value)}
                  disabled={emailTemplateSaveDisabled}
                  placeholder={"Dear {{first_name}},\n\nWrite the fallback email body for leads with email addresses."}
                  className="min-h-28 w-full resize-y rounded-md border border-zinc-300/85 bg-white/90 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-900 disabled:cursor-not-allowed disabled:opacity-60"
                />
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap gap-2 xl:w-44 xl:flex-col">
              <Button
                type="button"
                onClick={handleSaveEmailTemplate}
                disabled={emailTemplateSaveDisabled}
                className="btn-sidebar-noise h-9 px-3.5"
                title={hasEmailLeads ? "Save email template" : "No leads with email addresses"}
              >
                {isEmailTemplateSaving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save Template
              </Button>

              <Button
                type="button"
                variant="ghost"
                onClick={handleDeleteEmailTemplate}
                disabled={isEmailTemplateLoading || isEmailTemplateSaving || isEmailTemplateDeleting || (!emailTemplateId && !emailTemplateSubject && !emailTemplateBody)}
                className="h-9 rounded-md border border-zinc-300 bg-white px-3 text-zinc-600 hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
              >
                {isEmailTemplateDeleting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="mr-2 h-4 w-4" />
                )}
                Delete
              </Button>
            </div>
          </div>
        </Card>
      ) : null}

      {canManageLeadActions ? (
        <Card className="relative mt-3 overflow-hidden rounded-2xl border border-violet-100 bg-[linear-gradient(160deg,rgba(250,248,255,0.94)_0%,rgba(255,255,255,0.9)_60%,rgba(245,243,255,0.8)_100%)] p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.82),0_12px_24px_-22px_rgba(76,29,149,0.35)]">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start">
            <div className="xl:w-72">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-md border border-violet-200 bg-violet-50">
                  <Mail className="h-4 w-4 text-violet-700" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-zinc-900">Follow-up Templates</h2>
                  <p className="mt-0.5 text-xs text-zinc-500">Used only for manual follow-up emails.</p>
                </div>
              </div>
              <p className="mt-4 text-xs leading-relaxed text-zinc-500">
                Variables: <span className="font-medium text-zinc-700">{"{{first_name}}"}, {"{{company}}"}, {"{{campaignName}}"}</span>
              </p>
            </div>

            <div className="min-w-0 flex-1">
              <div className="mb-3 flex flex-wrap gap-1.5">
                {FOLLOW_UP_STEPS.map((label, index) => {
                  const stage = index + 1;
                  const isSelected = selectedFollowUpTemplateStage === stage;
                  const isConfigured = Boolean(followUpTemplates[stage]?.subject.trim() && followUpTemplates[stage]?.body.trim());
                  return (
                    <button
                      key={label}
                      type="button"
                      onClick={() => setSelectedFollowUpTemplateStage(stage)}
                      className={`rounded-lg border px-3 py-1.5 text-[11px] font-semibold transition-colors ${
                        isSelected
                          ? "border-violet-600 bg-violet-600 text-white"
                          : "border-violet-200 bg-white/80 text-violet-700 hover:border-violet-300 hover:bg-violet-50"
                      }`}
                    >
                      {label}
                      {isConfigured ? <span className={`ml-1.5 text-[9px] ${isSelected ? "text-white/75" : "text-emerald-600"}`}>●</span> : null}
                    </button>
                  );
                })}
              </div>

              <div className="grid gap-3 xl:grid-cols-[minmax(15rem,22rem)_minmax(22rem,1fr)]">
                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-zinc-400">Subject</label>
                  <Input
                    value={selectedFollowUpTemplate.subject}
                    onChange={(event) => setFollowUpTemplates((previous) => ({
                      ...previous,
                      [selectedFollowUpTemplateStage]: { ...previous[selectedFollowUpTemplateStage], subject: event.target.value },
                    }))}
                    disabled={isSavingFollowUpTemplate}
                    placeholder={`e.g. ${FOLLOW_UP_STEPS[selectedFollowUpTemplateStage - 1]} — {{first_name}}`}
                    className="h-10 border-violet-200 bg-white/90 text-sm"
                  />
                  <label className="mt-3 flex items-center gap-2 text-xs text-zinc-600">
                    <input
                      type="checkbox"
                      checked={selectedFollowUpTemplate.isActive}
                      onChange={(event) => setFollowUpTemplates((previous) => ({
                        ...previous,
                        [selectedFollowUpTemplateStage]: { ...previous[selectedFollowUpTemplateStage], isActive: event.target.checked },
                      }))}
                      disabled={isSavingFollowUpTemplate}
                      className="h-3.5 w-3.5 rounded border-violet-300 text-violet-600 focus:ring-violet-500"
                    />
                    Active for manual follow-ups
                  </label>
                </div>

                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-zinc-400">Email body</label>
                  <textarea
                    value={selectedFollowUpTemplate.body}
                    onChange={(event) => setFollowUpTemplates((previous) => ({
                      ...previous,
                      [selectedFollowUpTemplateStage]: { ...previous[selectedFollowUpTemplateStage], body: event.target.value },
                    }))}
                    disabled={isSavingFollowUpTemplate}
                    placeholder={"Hi {{first_name}},\n\nI wanted to follow up on my earlier email about {{campaignName}}.\n\nWould you be open to a quick conversation?"}
                    className="min-h-28 w-full resize-y rounded-md border border-violet-200 bg-white/90 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
                  />
                </div>
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap gap-2 xl:w-40 xl:flex-col">
              <Button
                type="button"
                onClick={() => void handleSaveFollowUpTemplate()}
                disabled={isSavingFollowUpTemplate || !selectedFollowUpTemplate.subject.trim() || !selectedFollowUpTemplate.body.trim()}
                className="h-9 bg-violet-600 px-3.5 text-white hover:bg-violet-700"
              >
                {isSavingFollowUpTemplate ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save Template
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => void handleClearFollowUpTemplate()}
                disabled={isSavingFollowUpTemplate || (!selectedFollowUpTemplate.id && !selectedFollowUpTemplate.subject && !selectedFollowUpTemplate.body)}
                className="h-9 border border-violet-200 bg-white px-3 text-violet-700 hover:bg-violet-50"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Clear
              </Button>
              {selectedFollowUpTemplate.updatedAt ? (
                <p className="px-1 text-[10px] text-zinc-400">Updated {formatDateTime(selectedFollowUpTemplate.updatedAt)}</p>
              ) : null}
            </div>
          </div>
        </Card>
      ) : null}

      <Card className="relative isolate mt-3 flex flex-col overflow-hidden rounded-2xl border border-[rgb(255_255_255_/_0.82)] bg-[linear-gradient(160deg,rgba(255,255,255,0.84)_0%,rgba(250,252,255,0.66)_56%,rgba(240,246,253,0.56)_100%)] backdrop-blur-[16px] [backdrop-filter:saturate(175%)_blur(16px)] shadow-[0_0_0_1px_rgba(255,255,255,0.82),0_0_12px_-9px_rgba(2,10,27,0.58),0_0_6px_-5px_rgba(15,23,42,0.36),inset_0_1px_0_rgba(255,255,255,1),inset_0_-2px_0_rgba(221,230,244,0.74),inset_0_0_22px_rgba(255,255,255,0.2)]">
        <div className="pointer-events-none absolute -right-20 -top-24 h-60 w-60 rounded-full bg-gradient-to-br from-sky-300/34 via-blue-500/12 to-blue-700/0 blur-3xl" />
        <div className="pointer-events-none absolute -left-24 -bottom-20 h-56 w-56 rounded-full bg-gradient-to-tr from-blue-300/20 via-sky-200/10 to-transparent blur-3xl" />

        <div className="relative z-[6] flex flex-col gap-2 px-6 pt-0.5 sm:flex-row sm:items-center sm:justify-between">
          {canManageLeadActions ? (
            <div className="inline-flex flex-wrap items-center rounded-xl border border-zinc-300/90 bg-white/60 p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_4px_8px_-10px_rgba(2,10,27,0.34)] backdrop-blur-[6px]">
              {leadFilterTabs.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setLeadFilter(tab.key)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                    leadFilter === tab.key
                      ? "bg-zinc-900 text-white shadow-[0_6px_10px_-12px_rgba(2,10,27,0.42)]"
                      : "text-zinc-600 hover:bg-white hover:text-zinc-900"
                  }`}
                >
                  {tab.label}
                  <span className={`ml-1.5 text-[10px] ${leadFilter === tab.key ? "text-white/80" : "text-zinc-400"}`}>
                    {tab.count}
                  </span>
                </button>
              ))}

              <span className="mx-1.5 h-4 w-px bg-zinc-300/80" aria-hidden="true" />

              <button
                type="button"
                onClick={handleToggleBulkSelectMode}
                className={`px-2 py-1 text-[11px] font-semibold transition-colors ${
                  bulkSelectMode ? "text-zinc-900" : "text-zinc-500 hover:text-zinc-800"
                }`}
              >
                Select
              </button>

              <button
                type="button"
                onClick={handleBulkGenerateContent}
                disabled={
                  selectedContentGenerationCount === 0 ||
                  selectedContentGenerationOverLimit ||
                  isContentGenerationActive
                }
                title={
                  isContentGenerationActive
                    ? "Content generation is already running"
                    : selectedContentGenerationOverLimit
                    ? `Generate content for ${SELECTED_CONTENT_GENERATION_LIMIT} or fewer leads at a time`
                    : selectedContentGenerationCount === 0
                      ? "Select leads with email addresses to generate content"
                      : `Generate content for ${selectedContentGenerationCount} selected lead${
                          selectedContentGenerationCount === 1 ? "" : "s"
                        }`
                }
                className="inline-flex items-center gap-1.5 px-2 py-1 text-[11px] font-semibold text-violet-700 transition-colors hover:text-violet-800 disabled:cursor-not-allowed disabled:text-zinc-300"
              >
                {isBulkGeneratingContent ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5" />
                )}
                {isBulkGeneratingContent ? "Generating" : "Generate Content"}
              </button>

              {isContentGenerationActive ? (
                <span className="rounded border border-violet-200 bg-violet-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-700">
                  {contentGenerationQueue.completed}/{contentGenerationQueue.total}
                </span>
              ) : null}

              {contentGenerationQueue.status === "running" ? (
                <button
                  type="button"
                  onClick={handleStopContentGeneration}
                  className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-red-600 transition-colors hover:text-red-700"
                  title="Stop content generation"
                >
                  <Square className="h-3 w-3" />
                  Stop
                </button>
              ) : contentGenerationQueue.status === "stopping" ? (
                <button
                  type="button"
                  disabled
                  className="inline-flex cursor-not-allowed items-center gap-1 px-2 py-1 text-[11px] font-semibold text-zinc-400"
                  title="Stopping content generation"
                >
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Stopping
                </button>
              ) : contentGenerationQueue.status === "paused" ? (
                <button
                  type="button"
                  onClick={() => void handleContinueContentGeneration()}
                  className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-emerald-700 transition-colors hover:text-emerald-800"
                  title={`Continue remaining ${contentGenerationQueue.remainingLeadIds.length} lead${
                    contentGenerationQueue.remainingLeadIds.length === 1 ? "" : "s"
                  }`}
                >
                  <Play className="h-3.5 w-3.5" />
                  Continue
                </button>
              ) : null}

              <button
                type="button"
                onClick={() => void handleBulkResetContent()}
                disabled={selectedContentResetCount === 0 || isBulkResettingContent}
                title={
                  selectedContentResetCount === 0
                    ? "Select leads to reset content"
                    : `Reset content for ${selectedContentResetCount} selected lead${
                        selectedContentResetCount === 1 ? "" : "s"
                      }`
                }
                className="inline-flex items-center gap-1.5 px-2 py-1 text-[11px] font-semibold text-amber-700 transition-colors hover:text-amber-800 disabled:cursor-not-allowed disabled:text-zinc-300"
              >
                {isBulkResettingContent ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RotateCcw className="h-3.5 w-3.5" />
                )}
                {isBulkResettingContent ? "Resetting" : "Reset Content"}
              </button>

              <span className="mx-1 h-4 w-px bg-zinc-300/80" aria-hidden="true" />

              <button
                type="button"
                onClick={() => handleBulkSendRequest("email")}
                disabled={selectedBulkEmailCount === 0 || isCommonAttachmentUploading || isBulkSending}
                title={
                  selectedBulkEmailCount === 0
                    ? "Select leads with unsent email"
                    : isCommonAttachmentUploading
                      ? "Attachment is still uploading"
                      : `Send email for ${selectedBulkEmailCount} selected lead${
                          selectedBulkEmailCount === 1 ? "" : "s"
                        }`
                }
                className="inline-flex items-center gap-1.5 px-2 py-1 text-[11px] font-semibold text-sidebar-primary transition-colors hover:text-sidebar-primary/85 disabled:cursor-not-allowed disabled:text-zinc-300"
              >
                <Mail className="h-3.5 w-3.5" />
                Email Selected
              </button>

              <button
                type="button"
                onClick={() => handleBulkSendRequest("whatsapp")}
                disabled={selectedBulkWhatsappCount === 0 || isBulkSending}
                title={
                  selectedBulkWhatsappCount === 0
                    ? "Select leads with unsent WhatsApp"
                    : `Send WhatsApp for ${selectedBulkWhatsappCount} selected lead${
                        selectedBulkWhatsappCount === 1 ? "" : "s"
                      }`
                }
                className="inline-flex items-center gap-1.5 px-2 py-1 text-[11px] font-semibold text-emerald-700 transition-colors hover:text-emerald-800 disabled:cursor-not-allowed disabled:text-zinc-300"
              >
                <WhatsAppIcon className="h-3.5 w-3.5" />
                WhatsApp Selected
              </button>
            </div>
          ) : null}

          <div className="flex w-full flex-wrap items-center gap-2 sm:ml-auto sm:w-auto sm:flex-nowrap">
            <div className="relative min-w-0 flex-1 sm:w-72 sm:flex-none">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
              <Input
                value={tableSearch}
                onChange={(e) => setTableSearch(e.target.value)}
                placeholder={`Search ${activeFilterLabel.toLowerCase()} leads`}
                className="h-8 border-zinc-300/85 bg-white/88 pl-8 text-xs text-zinc-700 placeholder:text-zinc-400"
              />
            </div>

            <div className="flex items-center gap-1.5">
              {canManageLeadActions ? (
                <>
                  <Button
                    type="button"
                    onClick={handlePickUniversalAttachment}
                    disabled={!hasEmailLeads || isCommonAttachmentUploading}
                    aria-label={
                      !hasEmailLeads
                        ? "No leads with email addresses"
                        : isCommonAttachmentUploading
                          ? "Uploading attachment"
                          : "Add email attachment"
                    }
                    title={
                      !hasEmailLeads
                        ? "No leads with email addresses"
                        : isCommonAttachmentUploading
                          ? "Uploading attachment"
                          : "Add email attachment"
                    }
                    className={`h-8 w-8 rounded-md border p-0 shadow-none disabled:cursor-not-allowed disabled:opacity-50 ${
                      commonAttachmentId && universalAttachment
                        ? "border-emerald-200/90 bg-emerald-50/90 text-emerald-700 hover:border-emerald-300 hover:bg-emerald-50"
                        : "border-zinc-300/80 bg-white/82 text-zinc-700 hover:border-zinc-300 hover:bg-white hover:text-zinc-900"
                    }`}
                  >
                    {isCommonAttachmentUploading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Paperclip className="h-3.5 w-3.5" />
                    )}
                  </Button>

                  <Button
                    type="button"
                    onClick={handleViewUniversalAttachment}
                    disabled={!commonAttachmentId || !universalAttachment?.url || isCommonAttachmentUploading}
                    aria-label="View attachment"
                    title="View attachment"
                    className="h-8 w-8 rounded-md border border-zinc-300/80 bg-white/82 p-0 text-zinc-700 shadow-none hover:border-zinc-300 hover:bg-white hover:text-zinc-900 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </Button>

                  <Button
                    type="button"
                    onClick={handleDeleteUniversalAttachment}
                    disabled={!commonAttachmentId || isCommonAttachmentUploading || isBulkSending}
                    aria-label="Delete attachment"
                    title="Delete attachment"
                    className="h-8 w-8 rounded-md border border-zinc-300/80 bg-white/82 p-0 text-zinc-700 shadow-none hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </>
              ) : null}

              <div ref={tableFilterRef} className="relative">
                <Button
                  type="button"
                  onClick={() => setIsTableFilterOpen((prev) => !prev)}
                  className="h-8 rounded-md border border-zinc-300/80 bg-white/82 px-2.5 text-[11px] font-semibold text-zinc-700 shadow-none hover:border-zinc-300 hover:bg-white hover:text-zinc-900"
                >
                  <Filter className="mr-1.5 h-3.5 w-3.5" />
                  Filter
                  {hasAdvancedTableFilters ? (
                    <span className="ml-1 rounded-full bg-zinc-900/12 px-1.5 py-0.5 text-[10px] text-zinc-700">On</span>
                  ) : null}
                </Button>

                {isTableFilterOpen && (
                  <div className="absolute right-0 top-10 z-40 w-72 rounded-xl border border-zinc-300/85 bg-white/96 p-3 shadow-[0_0_0_1px_rgba(255,255,255,0.85),0_16px_24px_-14px_rgba(2,10,27,0.24),0_6px_12px_-8px_rgba(15,23,42,0.14)] backdrop-blur-[8px]">
                    <div className="space-y-2">
                      <label className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Job Title</label>
                      <Input
                        value={jobTitleFilter}
                        onChange={(e) => setJobTitleFilter(e.target.value)}
                        placeholder="e.g. manager, director"
                        className="h-8 border-zinc-300/80 bg-white text-xs"
                      />
                    </div>

                    <div className="mt-3 flex items-center justify-between rounded-lg border border-zinc-300/75 bg-white/85 px-2.5 py-2">
                      <div className="pr-3">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Has Email</p>
                        <p className="text-[10px] text-zinc-400">Show only leads with an email address</p>
                      </div>
                      <label className="relative inline-flex h-[28px] w-[50px] cursor-pointer items-center">
                        <input
                          type="checkbox"
                          checked={hasEmailOnly}
                          onChange={(e) => setHasEmailOnly(e.target.checked)}
                          className="peer sr-only"
                          aria-label="Has email only"
                        />
                        <span className="absolute inset-0 rounded-full border border-zinc-300 bg-white transition-colors duration-300 peer-checked:border-transparent peer-checked:bg-[#5fdd54]" />
                        <span className="pointer-events-none absolute left-[1px] top-[1px] h-[24px] w-[24px] rounded-full bg-white shadow-[0_2px_5px_rgba(0,0,0,0.35)] transition-transform duration-300 peer-checked:translate-x-[22px]" />
                      </label>
                    </div>

                    <div className="mt-3 space-y-2">
                      <label className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Domain</label>
                      <Input
                        value={domainFilter}
                        onChange={(e) => setDomainFilter(e.target.value)}
                        placeholder="e.g. .ae, .sa, company.com"
                        className="h-8 border-zinc-300/80 bg-white text-xs"
                      />
                    </div>

                    <div className="mt-3 space-y-2">
                      <label className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Phone Number</label>
                      <Input
                        value={phoneFilter}
                        onChange={(e) => setPhoneFilter(e.target.value)}
                        placeholder="Type any part of phone"
                        className="h-8 border-zinc-300/80 bg-white text-xs"
                      />
                    </div>

                    <div className="mt-3 flex items-center justify-between border-t border-zinc-300/70 pt-2.5">
                      <button
                        type="button"
                        onClick={() => {
                          setJobTitleFilter("");
                          setHasEmailOnly(false);
                          setDomainFilter("");
                          setPhoneFilter("");
                        }}
                        className="text-[11px] font-medium text-zinc-500 hover:text-zinc-800"
                      >
                        Clear
                      </button>

                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setIsTableFilterOpen(false)}
                        className="h-7 rounded-md border border-zinc-300/80 bg-white/90 px-2.5 text-[11px] font-medium text-zinc-700 hover:bg-white"
                      >
                        Done
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              <Button
                type="button"
                onClick={handleExportCsv}
                disabled={exportRows.length === 0}
                className="h-8 rounded-md border border-zinc-300/80 bg-white/82 px-2.5 text-[11px] font-semibold text-zinc-700 shadow-none hover:border-zinc-300 hover:bg-white hover:text-zinc-900 disabled:opacity-50"
              >
                <Download className="mr-1.5 h-3.5 w-3.5" />
                CSV
              </Button>
            </div>
          </div>
        </div>

        {canManageLeadActions && bulkSelectMode && (
          <div className="relative z-[5] flex flex-wrap items-center gap-2 px-6 pt-1 text-[11px] text-zinc-500">
            <span>Select leads for bulk outreach.</span>
            <span>{selectedBulkCount} selected.</span>
            {universalAttachment && commonAttachmentId ? (
              <span className="truncate text-zinc-600">
                Attachment: {universalAttachment.name}
              </span>
            ) : (
              <span className="text-zinc-400">No attachment selected.</span>
            )}

            {selectableFilteredLeads.length > 0 && (
              <button
                type="button"
                onClick={handleSelectAllFiltered}
                className="font-semibold text-zinc-700 hover:text-zinc-900"
              >
                Select all filtered ({selectableFilteredLeads.length})
              </button>
            )}
          </div>
        )}

        <div className="relative z-[2] px-4 pb-2 pt-3">
          <div>
            <table className={canManageLeadActions ? "min-w-[1000px] w-full" : "min-w-[520px] w-full"}>
            <thead className="border-b border-zinc-100/85 bg-white/70">
              <tr>
                {canManageLeadActions && bulkSelectMode && (
                  <th className="w-10 px-3 py-3 text-center">
                    <input
                      type="checkbox"
                      checked={isCurrentPageAllSelected}
                      onChange={(e) => handleSelectAllCurrentPage(e.target.checked)}
                      aria-label="Select all on current page"
                      disabled={selectableCurrentPageLeads.length === 0}
                      className="h-3.5 w-3.5 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900"
                    />
                  </th>
                )}
                {canManageLeadActions && (
                  <th className="w-16 px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-zinc-400">No.</th>
                )}
                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-zinc-400">Profile</th>
                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-zinc-400">Contact Info</th>
                {canManageLeadActions ? (
                  <>
                    <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-zinc-400">Content</th>
                    <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-zinc-400">Status</th>
                    <th className="px-4 py-3 text-center text-[11px] font-bold uppercase tracking-wider text-zinc-400">Sent</th>
                    <th className="px-4 py-3 text-right text-[11px] font-bold uppercase tracking-wider text-zinc-400">Quick Actions</th>
                  </>
                ) : null}
              </tr>
            </thead>

            <tbody className="divide-y divide-zinc-100/70">
              {paginatedLeads.length === 0 && (
                <tr>
                  <td colSpan={canManageLeadActions ? (bulkSelectMode ? 8 : 7) : 2} className="px-6 py-10 text-center text-sm text-zinc-500">
                    No {activeFilterLabel.toLowerCase()} leads found.
                  </td>
                </tr>
              )}

              {paginatedLeads.map((item, index) => {
                const rowNumber = (currentPage - 1) * itemsPerPage + index + 1;
                const status = approvalStyles[item.approvalStatus] ?? approvalStyles.pending;
                const StatusIcon = status.icon;
                const titleBucket = normalizeTitleBucket(item.title || "");
                const showTitleBucket =
                  titleBucket !== "Other" &&
                  titleBucket !== "Unknown" &&
                  !(item.title || "").toLowerCase().includes(titleBucket.toLowerCase());
                const optOutEntry = leadOptOutById.get(item.id) ?? null;
                const isOptedOut = Boolean(optOutEntry);
                const isLeadReadOnly = isLeadMarketingOptedOut(item);
                const canSendEmail = leadSupportsEmailAction(item);
                const canSendWhatsapp = leadSupportsWhatsappAction(item);
                const showEmailAction = canSendEmail;
                const showWhatsappAction = canSendWhatsapp;
                const showSendActions =
                  item.approvalStatus !== "rejected" &&
                  item.approvalStatus !== "suppressed" &&
                  !isLeadFullyActioned(item);
                const sendEmailDisabledReason = getLeadSendActionDisabledReason(item, "email");
                const sendWhatsappDisabledReason = getLeadSendActionDisabledReason(item, "whatsapp");
                const isSendingEmail = Boolean(leadSendLoading[item.id]?.email);
                const isSendingWhatsapp = Boolean(leadSendLoading[item.id]?.whatsapp);
                const disableWhatsappAction = (!hasText(item.phone) && !hasText(item.email)) || isOptedOut;
                const smsDisabledReason = !hasText(item.phone)
                  ? "Lead has no phone number"
                  : isLeadReadOnly
                    ? "Lead actions are blocked"
                    : null;
                const suppressionMeta = item.suppression || null;
                const suppressionSource = optOutEntry?.source || suppressionMeta?.source || null;
                const suppressionReason = optOutEntry?.reason || suppressionMeta?.reason || null;
                const suppressionMatchedBy = suppressionMeta?.matchedBy || optOutEntry?.identityType || null;
                const suppressionPhone = suppressionMeta?.phoneE164 || optOutEntry?.phoneE164 || item.phone || null;
                const suppressionEmail = suppressionMeta?.email || optOutEntry?.email || item.email || null;
                const showTemplateFallback = shouldShowTemplateFallback(item);
                const reviewContentDisabled = isLeadReadOnly || !canSendEmail;
                const contentIndicator = getLeadContentIndicator(item);
                const reviewContentTitle = !canSendEmail
                  ? "Email content review is available only for leads with email addresses."
                  : isLeadReadOnly
                    ? "Lead actions are blocked"
                    : contentIndicator.title;

                return (
                  <tr
                    key={item.id}
                    className={`group transition-colors ${
                      canManageLeadActions && isLeadReadOnly ? "bg-rose-50/35 hover:bg-rose-50/50" : "hover:bg-white/46"
                    }`}
                  >
                    {canManageLeadActions && bulkSelectMode && (
                      <td className="px-3 py-3.5 text-center align-top">
                        <input
                          type="checkbox"
                          checked={selectedBulkLeadIds.has(item.id)}
                          onChange={(e) => handleSelectBulkLead(item.id, e.target.checked)}
                          aria-label={`Select ${item.employeeName}`}
                          disabled={isLeadSelectionBlocked(item)}
                          className="mt-0.5 h-3.5 w-3.5 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900"
                        />
                      </td>
                    )}
                    {canManageLeadActions && (
                      <td className="px-4 py-3.5 align-top">
                        <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-md border border-zinc-200 bg-white/80 px-2 text-xs font-semibold text-zinc-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
                          {rowNumber}
                        </span>
                      </td>
                    )}
                    <td className="px-4 py-3.5">
                      <div className="flex flex-col">
                        <span className="font-semibold text-zinc-900">{item.employeeName}</span>
                        <span className="text-xs text-zinc-500">{item.title}</span>
                        {showTitleBucket ? (
                          <span className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
                            {titleBucket}
                          </span>
                        ) : null}
                        {item.companyUrl ? (
                          <a href={item.companyUrl} target="_blank" rel="noreferrer" className="mt-0.5 w-fit text-xs text-zinc-400 hover:text-zinc-600 hover:underline">
                            {item.companyUrl}
                          </a>
                        ) : item.company ? (
                          <span className="mt-0.5 w-fit text-xs text-zinc-400">{item.company}</span>
                        ) : null}
                      </div>
                    </td>

                    <td className="px-4 py-3.5">
                      <div className="flex flex-col gap-1">
                        <span className="font-mono text-xs text-zinc-600">{item.email}</span>
                        <span className="text-xs text-zinc-400">{item.phone}</span>
                        {canManageLeadActions && isLeadReadOnly ? (
                          <span className="w-fit rounded border border-rose-200 bg-rose-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-rose-700">
                            Suppressed
                          </span>
                        ) : null}
                        {canManageLeadActions && isLeadReadOnly ? (
                          <div className="rounded border border-rose-100 bg-rose-50/60 px-2 py-1 text-[10px] leading-relaxed text-rose-700">
                            {suppressionSource ? <p>Source: {suppressionSource}</p> : null}
                            {suppressionReason ? <p>Reason: {suppressionReason}</p> : null}
                            {suppressionMatchedBy ? <p>Matched by: {suppressionMatchedBy}</p> : null}
                            {suppressionPhone ? <p>Phone: {suppressionPhone}</p> : null}
                            {suppressionEmail ? <p>Email: {suppressionEmail}</p> : null}
                          </div>
                        ) : null}
                        <div className="mt-1 flex gap-3">
                          <a href={item.linkedinUrl} target="_blank" rel="noreferrer" className="text-zinc-400 transition-colors hover:text-zinc-900">
                            <LinkedInIcon className="h-3.5 w-3.5" />
                          </a>
                          {item.companyUrl ? (
                            <a href={item.companyUrl} target="_blank" rel="noreferrer" className="text-zinc-400 transition-colors hover:text-zinc-900">
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          ) : null}
                        </div>
                      </div>
                    </td>

                    {canManageLeadActions ? (
                      <>
                        <td className="px-4 py-3.5">
                          <div className="flex flex-col items-start gap-1.5">
                            {showTemplateFallback ? (
                              <span className="rounded border border-blue-200 bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-blue-700">
                                Template fallback
                              </span>
                            ) : null}
                            <div className="inline-flex overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-[0_6px_14px_-12px_rgba(2,10,27,0.45)]">
                              <Button
                                variant="outline"
                                size="sm"
                                className={`h-7 rounded-none border-0 border-r border-zinc-200 px-2.5 text-[11px] font-semibold shadow-none ${contentIndicator.buttonClassName}`}
                                onClick={() => setSelectedLead(item)}
                                disabled={reviewContentDisabled}
                                title={reviewContentTitle}
                              >
                                <Eye className={`mr-1.5 h-3 w-3 ${contentIndicator.iconClassName}`} />
                                Review
                              </Button>
                              {isLeadEmailActionCompleted(item) ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 rounded-none border-0 bg-violet-50 px-2.5 text-[11px] font-semibold text-violet-700 shadow-none hover:bg-violet-100"
                                  onClick={() => void openFollowUpComposer(item)}
                                  disabled={isLeadReadOnly}
                                >
                                  <Mail className="mr-1.5 h-3 w-3" />
                                  Follow-ups
                                </Button>
                              ) : null}
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-3.5">
                          <div className="flex flex-col gap-1">
                            <Badge className={`w-fit rounded-md border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide shadow-none ${status.bg}`}>
                              <StatusIcon className="mr-1.5 h-3 w-3" />
                              {item.approvalStatus}
                            </Badge>
                            {isLeadReadOnly ? (
                              <span className="w-fit rounded border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-rose-700">
                                Blocked
                              </span>
                            ) : null}
                            {!isLeadReadOnly && item.sendable === false ? (
                              <span className="w-fit rounded border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                                Not Sendable
                              </span>
                            ) : null}
                            {item.reviewStatus ? (
                              <span className="text-[10px] text-zinc-500">Review: {item.reviewStatus}</span>
                            ) : null}
                          </div>
                        </td>

                        <td className="px-4 py-3.5">
                          <OutreachStatusIcons status={buildOutreachStatus(item)} />
                        </td>

                        <td className="px-4 py-3.5 text-right">
                          <div className="flex min-w-[310px] justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-md border border-zinc-300/80 bg-white/82 text-zinc-500 hover:border-zinc-300 hover:bg-white hover:text-zinc-900"
                          onClick={() => handleCopyLeadDetails(item)}
                          title={isLeadReadOnly ? "Lead actions are blocked" : "Copy lead details"}
                          disabled={isLeadReadOnly}
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-md border border-zinc-300/80 bg-white/82 text-zinc-400 hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700 disabled:cursor-not-allowed disabled:opacity-45"
                          onClick={() => openDisableWhatsappConfirm(item)}
                          title={
                            !hasText(item.phone) && !hasText(item.email)
                              ? "Lead has no phone or email"
                              : isOptedOut
                                ? "Already in opt-out list"
                                : "Disable marketing for this lead"
                          }
                          disabled={disableWhatsappAction}
                        >
                          <PhoneOff className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          className="h-8 min-w-[3.5rem] rounded-md border border-zinc-300/80 bg-white/82 px-2 text-[11px] font-semibold text-sky-700 shadow-none hover:border-sky-300 hover:bg-sky-50 hover:text-sky-800 disabled:cursor-not-allowed disabled:opacity-45"
                          onClick={() => openSmsDialog(item)}
                          title={smsDisabledReason || "Send SMS"}
                          disabled={Boolean(smsDisabledReason)}
                        >
                          <MessageSquare className="h-3.5 w-3.5" />
                          SMS
                        </Button>
                        {showSendActions ? (
                          <>
                            {showWhatsappAction ? (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-md border border-zinc-300/80 bg-white/82 text-zinc-500 hover:border-zinc-300 hover:bg-white hover:text-zinc-900 disabled:cursor-not-allowed disabled:opacity-45"
                                onClick={() =>
                                  void (item.approvalStatus === "pending"
                                    ? handleApprove(item.id, "whatsapp")
                                    : handleSendLeadAction(item, "whatsapp"))
                                }
                                disabled={Boolean(sendWhatsappDisabledReason) || isSendingWhatsapp}
                                title={
                                  sendWhatsappDisabledReason ||
                                  (item.approvalStatus === "pending" ? "Approve and send WhatsApp only" : "Send WhatsApp only")
                                }
                              >
                                {isSendingWhatsapp ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <WhatsAppIcon className="h-3.5 w-3.5" />
                                )}
                              </Button>
                            ) : null}
                            {showEmailAction && !isLeadEmailActionCompleted(item) ? (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-md border border-zinc-300/80 bg-white/82 text-zinc-500 hover:border-zinc-300 hover:bg-white hover:text-zinc-900 disabled:cursor-not-allowed disabled:opacity-45"
                                onClick={() =>
                                  void (item.approvalStatus === "pending"
                                    ? handleApprove(item.id, "email")
                                    : handleSendLeadAction(item, "email"))
                                }
                                disabled={Boolean(sendEmailDisabledReason) || isSendingEmail}
                                title={
                                  sendEmailDisabledReason ||
                                  (item.approvalStatus === "pending" ? "Approve and send Email only" : "Send Email only")
                                }
                              >
                                {isSendingEmail ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Mail className="h-3.5 w-3.5" />
                                )}
                              </Button>
                            ) : null}
                            {item.approvalStatus === "pending" ? (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-md border border-zinc-300/80 bg-white/82 text-zinc-400 hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                                onClick={() => handleReject(item.id)}
                                disabled={isLeadReadOnly}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            ) : null}
                          </>
                        ) : item.approvalStatus === "rejected" ? (
                          <span className="text-xs italic text-zinc-400">Rejected</span>
                        ) : null}
                        {isLeadEmailActionCompleted(item) && canSendEmail ? (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              disabled
                              title="Initial email sent"
                              className="h-8 w-8 rounded-md border border-emerald-200 bg-emerald-50 text-emerald-700 disabled:opacity-100"
                            >
                              <Mail className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-md border border-violet-200 bg-violet-50 text-violet-700 shadow-none hover:border-violet-300 hover:bg-violet-100 hover:text-violet-800 disabled:cursor-not-allowed disabled:opacity-45"
                              onClick={() => void handleSendNextFollowUp(item)}
                              disabled={isLeadReadOnly || quickFollowUpLeadId === item.id}
                              title={isLeadReadOnly ? "Lead actions are blocked" : "Send next follow-up"}
                            >
                              {quickFollowUpLeadId === item.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Mail className="h-3.5 w-3.5" />}
                            </Button>
                          </>
                        ) : null}
                          </div>
                        </td>
                      </>
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
            </table>
          </div>
        </div>

        {filteredLeads.length > 0 && (
          <div className="relative z-[2] flex flex-wrap items-center justify-between gap-2 border-t border-zinc-100/85 bg-white/38 px-6 py-3">
            <span className="text-xs text-zinc-500">
              Showing {(currentPage - 1) * itemsPerPage + 1}-
              {Math.min(currentPage * itemsPerPage, filteredLeads.length)} of {filteredLeads.length}{" "}
              {activeFilterLabel.toLowerCase()} leads
            </span>

            <div className="flex flex-wrap items-center justify-end gap-2">
              <label className="inline-flex items-center gap-2 rounded-md border border-zinc-300/80 bg-white/82 px-2.5 py-1.5 text-[11px] font-medium text-zinc-600">
                <span>Rows per page</span>
                <Select value={String(itemsPerPage)} onValueChange={handleItemsPerPageChange}>
                  <SelectTrigger
                    size="sm"
                    className="h-7 min-w-[4.25rem] border-zinc-300/80 bg-white/95 px-2 text-[11px] font-semibold text-zinc-800 shadow-none"
                    aria-label="Rows per page"
                  >
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

              <span className="text-[11px] text-zinc-500">
                Page {currentPage} / {totalPages}
              </span>

              <Button
                type="button"
                variant="ghost"
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="h-8 rounded-md border border-zinc-300/80 bg-white/82 px-2 text-zinc-600 disabled:opacity-40"
              >
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

              <Button
                type="button"
                variant="ghost"
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="h-8 rounded-md border border-zinc-300/80 bg-white/82 px-2 text-zinc-600 disabled:opacity-40"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Hidden file inputs (separate) */}
      <input
        ref={emailFileRef}
        type="file"
        multiple
        className="hidden"
        accept=".pdf,.doc,.docx,.ppt,.pptx,.png,.jpg,.jpeg"
        onChange={(e) => {
          pushPickedFiles(e.target.files, setPendingEmailUploads);
          if (emailFileRef.current) emailFileRef.current.value = "";
        }}
      />
      <input
        ref={whatsappFileRef}
        type="file"
        multiple
        className="hidden"
        accept=".pdf,.doc,.docx,.ppt,.pptx,.png,.jpg,.jpeg"
        onChange={(e) => {
          pushPickedFiles(e.target.files, setPendingWhatsappUploads);
          if (whatsappFileRef.current) whatsappFileRef.current.value = "";
        }}
      />
      <input
        ref={universalAttachmentRef}
        type="file"
        className="hidden"
        accept=".pdf,.doc,.docx,.ppt,.pptx,.png,.jpg,.jpeg"
        onChange={(e) => {
          handleUniversalAttachmentChange(e.target.files);
          if (universalAttachmentRef.current) universalAttachmentRef.current.value = "";
        }}
      />
      <AnimatePresence>
        {canManageLeadActions && showBulkSendConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[72] flex items-center justify-center bg-zinc-950/50 p-4 backdrop-blur-[3px]"
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0, y: 8 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0, y: 8 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="w-full max-w-md overflow-hidden rounded-2xl border border-zinc-300 bg-white shadow-[0_24px_40px_-28px_rgba(2,10,27,0.68)]"
            >
              <div className="space-y-2 border-b border-zinc-100 px-5 py-4">
                <h3 className="text-base font-semibold text-zinc-900">
                  Confirm selected {bulkSendChannel === "email" ? "email" : "WhatsApp"}
                </h3>
                <p className="text-sm text-zinc-600">
                  Queue {bulkSendChannel === "email" ? "email" : "WhatsApp"} for{" "}
                  <span className="font-semibold text-zinc-900">{selectedBulkChannelCount}</span> selected lead
                  {selectedBulkChannelCount === 1 ? "" : "s"}?
                </p>
                {bulkSendChannel === "email" && universalAttachment && commonAttachmentId ? (
                  <p className="text-xs text-zinc-500">Attachment: {universalAttachment.name}</p>
                ) : null}
              </div>

              <div className="flex items-center justify-end gap-2 px-5 py-4">
                <Button
                  type="button"
                  variant="ghost"
                  disabled={isBulkSending}
                  onClick={() => setShowBulkSendConfirm(false)}
                  className="h-9 rounded-md border border-zinc-300 bg-white px-3 text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleConfirmBulkSend}
                  disabled={isBulkSending}
                  className="h-9 rounded-md border border-sidebar-primary/75 bg-sidebar-primary px-3.5 text-sidebar-foreground hover:bg-sidebar-primary/90 disabled:opacity-60"
                >
                  {isBulkSending ? (
                    <>
                      <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    `Send ${bulkSendChannel === "email" ? "Email" : "WhatsApp"}`
                  )}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {canManageLeadActions && followUpTargetLead && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[73] flex items-start justify-center overflow-y-auto bg-zinc-950/50 p-3 backdrop-blur-[3px] sm:items-center sm:p-4"
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0, y: 8 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0, y: 8 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="my-auto flex max-h-[calc(100dvh-1.5rem)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-zinc-300 bg-white shadow-[0_24px_40px_-28px_rgba(2,10,27,0.68)] sm:max-h-[calc(100dvh-2rem)]"
            >
              <div className="shrink-0 border-b border-zinc-100 px-4 py-3 sm:px-5 sm:py-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-md border border-violet-200 bg-violet-50 text-violet-700">
                        <Mail className="h-4 w-4" />
                      </div>
                      <h3 className="text-base font-semibold text-zinc-900">Manual Follow-ups</h3>
                    </div>
                    <p className="mt-2 text-sm text-zinc-600">
                      Continue the conversation with <span className="font-semibold text-zinc-900">{followUpTargetLead.employeeName || "this lead"}</span>.
                    </p>
                    <p className="mt-1 text-xs text-zinc-500">{followUpTargetLead.email}</p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={closeFollowUpComposer}
                    disabled={isSendingFollowUp}
                    className="h-8 w-8 rounded-md border border-zinc-300 bg-white text-zinc-400 hover:text-zinc-900"
                    aria-label="Close follow-up composer"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3 sm:space-y-4 sm:px-5 sm:py-4">
                <div className="rounded-xl border border-violet-100 bg-[linear-gradient(135deg,rgba(245,243,255,0.9),rgba(255,255,255,0.96))] p-3 sm:p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold text-zinc-900">Follow-up status</p>
                      <p className="mt-0.5 text-[11px] text-zinc-500">Initial email sent · choose the next manual touchpoint.</p>
                    </div>
                    <Badge className="border border-violet-200 bg-violet-100 px-2 py-0.5 text-[10px] font-semibold text-violet-700 shadow-none">
                      {FOLLOW_UP_STEPS[followUpStep]}
                    </Badge>
                  </div>
                  <div className="overflow-x-auto pb-1">
                    <div className="flex min-w-[450px] items-start">
                      <div className="flex min-w-0 flex-1 items-center">
                        <div className="flex flex-col items-center gap-1.5">
                          <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-emerald-300 bg-emerald-100 text-emerald-700 sm:h-9 sm:w-9">
                            <Mail className="h-4 w-4" />
                          </span>
                          <span className="text-center text-[9px] font-semibold leading-tight text-emerald-700">Initial email</span>
                        </div>
                        <span className="mx-1 mb-5 h-0.5 min-w-3 flex-1 rounded-full bg-emerald-300" />
                      </div>
                      {FOLLOW_UP_STEPS.map((step, index) => {
                        const isActive = index === followUpStep;
                        const historyStatus = followUpHistory.find((item) => item.stage === index + 1)?.status;
                        const isComplete = historyStatus === "queued" || historyStatus === "sent";
                        return (
                          <div key={step} className="flex min-w-0 flex-1 items-center last:flex-none">
                            <button
                              type="button"
                              onClick={() => selectFollowUpStep(index)}
                              disabled={isSendingFollowUp || isComplete}
                              className="group flex min-w-0 flex-col items-center gap-1.5"
                              aria-pressed={isActive}
                            >
                              <span className={`flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all sm:h-9 sm:w-9 ${
                                isActive
                                  ? "border-violet-600 bg-violet-600 text-white shadow-[0_8px_16px_-10px_rgba(124,58,237,0.9)]"
                                  : isComplete
                                    ? "border-violet-300 bg-violet-100 text-violet-700"
                                    : "border-zinc-200 bg-white text-zinc-400 group-hover:border-violet-300 group-hover:text-violet-600"
                              }`}>
                                <Mail className="h-4 w-4" />
                              </span>
                              <span className={`max-w-[68px] text-center text-[9px] font-semibold leading-tight ${isActive ? "text-violet-700" : "text-zinc-500"}`}>
                                {step}
                              </span>
                            </button>
                            {index < FOLLOW_UP_STEPS.length - 1 ? (
                              <span className={`mx-1 mb-5 h-0.5 min-w-2 flex-1 rounded-full ${isComplete ? "bg-violet-300" : "bg-zinc-200"}`} />
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Subject</label>
                  <Input
                    value={followUpSubject}
                    onChange={(event) => setFollowUpSubject(event.target.value)}
                    disabled={isSendingFollowUp}
                    placeholder="Following up"
                    className="border-zinc-300 bg-white text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Email body</label>
                  <textarea
                    value={followUpBody}
                    onChange={(event) => setFollowUpBody(event.target.value)}
                    disabled={isSendingFollowUp}
                    rows={7}
                    className="w-full resize-y rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm leading-6 text-zinc-800 outline-none transition focus:border-zinc-400 focus:ring-1 focus:ring-zinc-300 disabled:cursor-not-allowed disabled:opacity-60"
                  />
                </div>
              </div>

              <div className="flex shrink-0 items-center justify-end gap-2 border-t border-zinc-100 px-4 py-3 sm:px-5 sm:py-4">
                <Button
                  type="button"
                  variant="ghost"
                  disabled={isSendingFollowUp}
                  onClick={closeFollowUpComposer}
                  className="h-9 rounded-md border border-zinc-300 bg-white px-3 text-zinc-700 hover:bg-zinc-50"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={() => void handleSendFollowUp()}
                  disabled={isSendingFollowUp || !followUpSubject.trim() || !followUpBody.trim()}
                  className="h-9 rounded-md border border-violet-600/75 bg-violet-600 px-3.5 text-white hover:bg-violet-700 disabled:opacity-60"
                >
                  {isSendingFollowUp ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Mail className="mr-1.5 h-4 w-4" />}
                  Send {FOLLOW_UP_STEPS[followUpStep]}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {canManageLeadActions && smsTargetLead && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[73] flex items-center justify-center bg-zinc-950/50 p-4 backdrop-blur-[3px]"
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0, y: 8 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0, y: 8 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="w-full max-w-lg overflow-hidden rounded-2xl border border-zinc-300 bg-white shadow-[0_24px_40px_-28px_rgba(2,10,27,0.68)]"
            >
              <div className="space-y-2 border-b border-zinc-100 px-5 py-4">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md border border-sky-200 bg-sky-50 text-sky-700">
                    <MessageSquare className="h-4 w-4" />
                  </div>
                  <h3 className="text-base font-semibold text-zinc-900">Send SMS</h3>
                </div>
                <p className="text-sm text-zinc-600">
                  Send to <span className="font-semibold text-zinc-900">{smsTargetLead.employeeName || "Lead"}</span>
                </p>
                <p className="text-xs text-zinc-500">Phone: {smsTargetLead.phone || "-"}</p>
              </div>

              <div className="space-y-2 px-5 py-4">
                <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Message
                </label>
                <textarea
                  value={smsMessage}
                  onChange={(event) => setSmsMessage(event.target.value.slice(0, 1600))}
                  rows={6}
                  placeholder="Write the SMS message..."
                  disabled={isSendingSms}
                  className="w-full resize-none rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm leading-6 text-zinc-800 outline-none transition focus:border-zinc-400 focus:ring-1 focus:ring-zinc-300 disabled:cursor-not-allowed disabled:opacity-60"
                />
                <div className="flex justify-end text-[11px] text-zinc-400">
                  {smsMessage.trim().length}/1600
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-zinc-100 px-5 py-4">
                <Button
                  type="button"
                  variant="ghost"
                  disabled={isSendingSms}
                  onClick={closeSmsDialog}
                  className="h-9 rounded-md border border-zinc-300 bg-white px-3 text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={() => void handleSendAdminSms()}
                  disabled={isSendingSms || smsMessage.trim().length === 0}
                  className="h-9 rounded-md border border-sky-600/75 bg-sky-600 px-3.5 text-white hover:bg-sky-700 disabled:opacity-60"
                >
                  {isSendingSms ? (
                    <>
                      <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    "Send SMS"
                  )}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {canManageLeadActions && disableTargetLead && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[73] flex items-center justify-center bg-zinc-950/50 p-4 backdrop-blur-[3px]"
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0, y: 8 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0, y: 8 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="w-full max-w-md overflow-hidden rounded-2xl border border-zinc-300 bg-white shadow-[0_24px_40px_-28px_rgba(2,10,27,0.68)]"
            >
              <div className="space-y-2 border-b border-zinc-100 px-5 py-4">
                <h3 className="text-base font-semibold text-zinc-900">Disable Marketing For Lead</h3>
                <p className="text-sm text-zinc-600">
                  Add <span className="font-semibold text-zinc-900">{disableTargetLead.employeeName}</span> to opt-out list?
                </p>
                <p className="text-xs text-zinc-500">Phone: {disableTargetLead.phone || "-"}</p>
                <p className="text-xs text-zinc-500">Email: {disableTargetLead.email || "-"}</p>
              </div>

              <div className="space-y-2 px-5 py-4">
                <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Reason (optional)
                </label>
                <Input
                  value={disableReason}
                  onChange={(event) => setDisableReason(event.target.value)}
                  placeholder="e.g. requested to stop all marketing messages"
                  disabled={isDisablingWhatsapp}
                  className="border-zinc-300"
                />
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-zinc-100 px-5 py-4">
                <Button
                  type="button"
                  variant="ghost"
                  disabled={isDisablingWhatsapp}
                  onClick={closeDisableWhatsappConfirm}
                  className="h-9 rounded-md border border-zinc-300 bg-white px-3 text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleConfirmDisableWhatsapp}
                  disabled={isDisablingWhatsapp}
                  className="h-9 rounded-md border border-amber-500/75 bg-amber-500 px-3.5 text-white hover:bg-amber-600 disabled:opacity-60"
                >
                  {isDisablingWhatsapp ? (
                    <>
                      <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                      Disabling...
                    </>
                  ) : (
                    "Yes, Disable Marketing"
                  )}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {canManageLeadActions && selectedLead && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/55 p-3 backdrop-blur-[4px] sm:p-6"
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0, y: 10 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="relative flex max-h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-zinc-300 bg-white shadow-[0_22px_36px_-26px_rgba(2,10,27,0.62)]"
            >
              <div className="relative z-[2] flex flex-col gap-3 border-b border-zinc-100 bg-white px-6 py-5 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="text-xl font-semibold tracking-tight text-zinc-900">Review &amp; Personalize Content</h3>
                  <p className="mt-1 text-xs text-zinc-500">
                    {selectedLead.employeeName} - {selectedLead.title}
                  </p>
                  {shouldShowTemplateFallback(selectedLead) ? (
                    <span className="mt-2 inline-flex rounded border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-blue-700">
                      Template fallback
                    </span>
                  ) : null}
                </div>

                <div className="flex items-center">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={closeModal}
                    className="h-8 w-8 rounded-md border border-zinc-300 bg-white text-zinc-400 hover:border-zinc-300 hover:text-zinc-900"
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>
              </div>

              <div className="relative z-[2] flex-1 space-y-5 overflow-y-auto scrollbar-hide bg-white p-6">
                <div className="grid gap-5 xl:h-[24.5rem] xl:grid-cols-1">
                  <Card className="h-full rounded-2xl border border-zinc-300 bg-white p-5 shadow-sm">
                    <div className="mb-4 flex items-center gap-2">
                      <div className="rounded-md border border-zinc-300 bg-white p-1.5">
                        <Mail className="h-4 w-4 text-zinc-900" />
                      </div>
                      <span className="text-sm font-semibold text-zinc-900">Cold Email</span>
                    </div>

                    <div className="flex h-full min-h-0 flex-col space-y-3">
                      {selectedEmptyContentNotice ? (
                        <div
                          className={`rounded-lg border px-3 py-3 text-sm ${
                            selectedEmptyContentNotice.status === "validator_rejected"
                              ? "border-rose-200 bg-rose-50 text-rose-900"
                              : selectedEmptyContentNotice.status === "qa_failed"
                                ? "border-amber-200 bg-amber-50 text-amber-900"
                                : "border-zinc-300 bg-zinc-50 text-zinc-800"
                          }`}
                        >
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0 space-y-1">
                              <div className="flex items-center gap-2">
                                <XCircle className="h-4 w-4 shrink-0" />
                                <p className="font-semibold">{selectedEmptyContentNotice.title}</p>
                              </div>
                              <p className="text-xs leading-relaxed">{selectedEmptyContentNotice.reason}</p>
                              {selectedEmptyContentNotice.metrics.length > 0 ? (
                                <div className="mt-2 space-y-1.5">
                                  <p className="text-[11px] font-semibold uppercase tracking-wide opacity-75">
                                    Failed checks
                                  </p>
                                  <div className="grid gap-1.5 sm:grid-cols-2">
                                  {selectedEmptyContentNotice.metrics.slice(0, 4).map((metric) => (
                                    <div
                                      key={`${metric.label}-${metric.actual}-${metric.expected}`}
                                      className="rounded-md border border-white/70 bg-white/65 px-2 py-1.5 text-[11px] leading-snug"
                                    >
                                      <p className="font-semibold">{metric.label}</p>
                                      <p className="mt-0.5">
                                        <span className="font-medium">Actual:</span> {metric.actual}
                                      </p>
                                      <p>
                                        <span className="font-medium">Expected:</span> {metric.expected}
                                      </p>
                                    </div>
                                  ))}
                                  </div>
                                </div>
                              ) : null}
                              {selectedEmptyContentNotice.details.length > 0 ? (
                                <div className="mt-2 space-y-1.5">
                                  <p className="text-[11px] font-semibold uppercase tracking-wide opacity-75">
                                    Rejection factors
                                  </p>
                                  <ul className="space-y-1 text-[11px] leading-relaxed">
                                    {selectedEmptyContentNotice.details.slice(0, 6).map((detail) => (
                                      <li key={detail} className="flex gap-1.5">
                                        <span className="mt-[0.45rem] h-1 w-1 shrink-0 rounded-full bg-current opacity-60" />
                                        <span>{detail}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              ) : null}
                              {selectedEmptyContentNotice.evidence.length > 0 ? (
                                <div className="mt-2 space-y-1.5">
                                  <p className="text-[11px] font-semibold uppercase tracking-wide opacity-75">
                                    Evidence used
                                  </p>
                                  <ul className="space-y-1 text-[11px] leading-relaxed">
                                    {selectedEmptyContentNotice.evidence.slice(0, 4).map((item) => (
                                      <li key={item} className="flex gap-1.5">
                                        <span className="mt-[0.45rem] h-1 w-1 shrink-0 rounded-full bg-current opacity-60" />
                                        <span className="break-words">{item}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              ) : null}
                              <p className="text-[11px] leading-relaxed opacity-75">{selectedEmptyContentNotice.guidance}</p>
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              className="h-8 shrink-0 rounded-md border-white/70 bg-white px-3 text-xs text-zinc-800 hover:bg-white/90"
                              disabled={
                                saving ||
                                isResettingContent ||
                                isContentGenerationActive ||
                                !canManageLeadActions ||
                                !selectedLead ||
                                !hasText(selectedLead.email) ||
                                isLeadSelectionBlocked(selectedLead)
                              }
                              onClick={() => void handleGenerateSelectedLeadAgain()}
                              title={
                                isContentGenerationActive
                                  ? "Content generation is already running"
                                  : !selectedLead || !hasText(selectedLead.email)
                                    ? "Lead needs an email address before generation"
                                    : "Generate content again for this lead"
                              }
                            >
                              {isGeneratingSelectedLeadAgain ? (
                                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Sparkles className="mr-2 h-3.5 w-3.5" />
                              )}
                              {isGeneratingSelectedLeadAgain ? "Generating" : "Generate again"}
                            </Button>
                          </div>
                        </div>
                      ) : null}

                      <div>
                        <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-zinc-400">Subject Line</label>
                        <input
                          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-900"
                          value={(editForm.contentEmailSubject as string) || ""}
                          onChange={(e) => handleContentChange("contentEmailSubject", e.target.value)}
                        />
                      </div>

                      <div className="flex min-h-0 flex-1 flex-col">
                        <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-zinc-400">Email Body</label>
                        <textarea
                          className="h-full min-h-0 w-full resize-none rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-900"
                          value={(editForm.contentEmail as string) || ""}
                          onChange={(e) => handleContentChange("contentEmail", e.target.value)}
                        />
                      </div>
                    </div>
                  </Card>

                  <div className="hidden min-h-0 grid-cols-1 gap-4 xl:h-full xl:grid-rows-2">
                    <AttachmentSection
                      title="Email Attachments"
                      subtitle="Sent with cold email"
                      attachments={((editForm.emailAttachments as Attachment[]) || []).filter(Boolean)}
                      pendingUploads={pendingEmailUploads}
                      onPickFiles={openEmailPicker}
                      onRemovePending={(tempId) => removePending(tempId, "email")}
                      onRemoveAttachment={(id) => removeUploadedAttachment(id, "email")}
                      className="h-full"
                    />

                    <AttachmentSection
                      title="WhatsApp Attachments"
                      subtitle="Sent with WhatsApp"
                      attachments={((editForm.whatsappAttachments as Attachment[]) || []).filter(Boolean)}
                      pendingUploads={pendingWhatsappUploads}
                      onPickFiles={openWhatsappPicker}
                      onRemovePending={(tempId) => removePending(tempId, "whatsapp")}
                      onRemoveAttachment={(id) => removeUploadedAttachment(id, "whatsapp")}
                      className="h-full"
                    />
                  </div>
                </div>
              </div>

              <div className="relative z-[2] flex flex-col gap-3 border-t border-zinc-100 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <p className="text-xs text-zinc-500">Changes are saved only. No approval or outreach is triggered here.</p>
                  {isLeadMarketingOptedOut(selectedLead) ? (
                    <p className="text-xs font-medium text-rose-600">
                      This lead is suppressed for outreach, but content changes can still be saved.
                    </p>
                  ) : selectedLead.sendable === false ? (
                    <p className="text-xs font-medium text-amber-700">
                      This lead is currently not sendable, but content changes can still be saved.
                    </p>
                  ) : null}
                </div>

                {selectedLead.approvalStatus === "pending" ? (
                  <div className="flex justify-end gap-3">
                    <Button
                      variant="ghost"
                      className="h-9 rounded-md border border-amber-300 bg-amber-50 px-3 text-amber-800 hover:border-amber-400 hover:bg-amber-100 hover:text-amber-900"
                      disabled={saving || isResettingContent}
                      onClick={() => void handleResetContentPreview()}
                      title="Reset this lead to empty saved content"
                    >
                      {isResettingContent ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <RotateCcw className="mr-2 h-4 w-4" />
                      )}
                      {isResettingContent ? "Resetting" : "Reset"}
                    </Button>

                    <Button
                      variant="ghost"
                      className="h-9 rounded-md border border-zinc-300 bg-white px-3 text-zinc-600 hover:border-zinc-400 hover:bg-zinc-50 hover:text-zinc-900"
                      disabled={saving || isResettingContent}
                      onClick={handleClearContentPreview}
                      title="Clear the subject and email body in this preview"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Clear
                    </Button>

                    <Button
                      variant="ghost"
                      className="h-9 rounded-md border border-zinc-300 bg-white px-3 text-zinc-600 hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                      disabled={isLeadMarketingOptedOut(selectedLead) || isResettingContent}
                      onClick={async () => {
                        await handleReject(selectedLead.id);
                        closeModal();
                      }}
                    >
                      Reject
                    </Button>

                    <Button
                      className="btn-sidebar-noise h-9 px-3.5"
                      disabled={saving || isResettingContent}
                      onClick={handleSave}
                    >
                      {saving ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="mr-2 h-4 w-4" />
                      )}
                      Save
                    </Button>
                  </div>
                ) : (
                  <div className="flex justify-end gap-3">
                    <Button
                      variant="ghost"
                      className="h-9 rounded-md border border-amber-300 bg-amber-50 px-3 text-amber-800 hover:border-amber-400 hover:bg-amber-100 hover:text-amber-900"
                      disabled={isResettingContent}
                      onClick={() => void handleResetContentPreview()}
                      title="Reset this lead to empty saved content"
                    >
                      {isResettingContent ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <RotateCcw className="mr-2 h-4 w-4" />
                      )}
                      {isResettingContent ? "Resetting" : "Reset"}
                    </Button>
                    <Button variant="outline" onClick={closeModal} className="analytics-frost-btn h-9 min-w-24 px-3">
                      Close
                    </Button>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function NormalUserCampaignDetailRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/campaigns");
  }, [router]);

  return null;
}

export default function CampaignDetailPage() {
  const { isSuperAdmin } = useAuth();
  return isSuperAdmin ? <SuperAdminCampaignDetailPage /> : <NormalUserCampaignDetailRedirect />;
}
