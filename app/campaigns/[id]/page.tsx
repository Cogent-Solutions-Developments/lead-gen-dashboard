"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { AxiosInstance } from "axios";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Mail,
  MessageCircle,
  CheckCircle,
  Clock,
  XCircle,
  Eye,
  Check,
  X,
  ExternalLink,
  Save,
  Loader2,
  Trash2,
  Paperclip,
  UploadCloud,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useParams } from "next/navigation";
import { getApiKeyClient } from "@/lib/apiRouter";
import { usePersona } from "@/hooks/usePersona";

// -----------------------------
// Custom LinkedIn Icon
// -----------------------------
const LinkedInIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M20.5 2h-17A1.5 1.5 0 002 3.5v17A1.5 1.5 0 003.5 22h17a1.5 1.5 0 001.5-1.5v-17A1.5 1.5 0 0020.5 2zM8 19H5v-9h3zM6.5 8.25A1.75 1.75 0 118.3 6.5a1.78 1.78 0 01-1.8 1.75zM19 19h-3v-4.74c0-1.22-.44-2.12-1.54-2.12a1.6 1.6 0 00-1.58 1.14 2.17 2.17 0 00-.1 1.08V19h-3v-9h2.9v1.3a3.11 3.11 0 012.7-1.4c1.95 0 3.52 1.27 3.52 4z" />
  </svg>
);

type ApprovalStatus = "pending" | "approved" | "rejected";
type OutreachState = "pending" | "sending" | "sent";
type AttachmentChannel = "email" | "whatsapp";
type LeadFilterKey = "new" | "sent" | "rejected";

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

  approvalStatus: ApprovalStatus;

  outreachStatus?: {
    email: OutreachState;
    linkedin: OutreachState;
    whatsapp: OutreachState;
  };

  // ✅ Separate attachments
  emailAttachments?: Attachment[];
  whatsappAttachments?: Attachment[];
}

interface CampaignDetail {
  id: string;
  name: string;
  icpPreview: string;
  status: string;
  createdAt: string;
  stats: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
  };
}

const approvalStyles = {
  pending: { bg: "bg-zinc-100 text-zinc-500 border-zinc-200", icon: Clock },
  approved: { bg: "bg-sidebar-primary/10 text-emerald-900 border-sidebar-primary/20", icon: CheckCircle },
  rejected: { bg: "bg-white text-zinc-400 border-zinc-200 line-through", icon: XCircle },
};

const normalizeApprovalStatus = (s: any): ApprovalStatus => {
  if (s === "content_generated" || s === "needs_review") return "pending";
  return s === "approved" || s === "rejected" || s === "pending" ? s : "pending";
};

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
  if (s === "sending") return { email: "sending", linkedin: "pending", whatsapp: "pending" };

  return { email: "pending", linkedin: "pending", whatsapp: "pending" };
};

const OutreachStatusIcons = ({ status }: { status: Required<NonNullable<Lead["outreachStatus"]>> }) => {
  const getStyle = (s: string) => {
    if (s === "sent") return "bg-emerald-50 text-emerald-600 border-emerald-200 shadow-sm";
    if (s === "sending") return "bg-amber-50 text-amber-500 border-amber-200 animate-pulse";
    if (s === "queued") return "bg-blue-50 text-blue-500 border-blue-200 animate-pulse";

    return "bg-zinc-50 text-zinc-300 border-zinc-100";
  };

  return (
    <div className="flex items-center justify-end gap-1.5">
      <div className={`flex h-6 w-6 items-center justify-center rounded-full border transition-all duration-500 ${getStyle(status.email)}`} title="Email">
        <Mail className="h-3 w-3" />
      </div>
      <div className={`flex h-6 w-6 items-center justify-center rounded-full border transition-all duration-500 delay-150 ${getStyle(status.whatsapp)}`} title="WhatsApp">
        <MessageCircle className="h-3 w-3" />
      </div>
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

const AttachmentSection = ({
  title,
  subtitle,
  attachments,
  pendingUploads,
  onPickFiles,
  onRemoveAttachment,
  onRemovePending,
  className,
}: {
  title: string;
  subtitle: string;
  attachments: Attachment[];
  pendingUploads: PendingUpload[];
  onPickFiles: () => void;
  onRemoveAttachment: (id: string) => void;
  onRemovePending: (tempId: string) => void;
  className?: string;
}) => {
  const hasAny = attachments.length > 0 || pendingUploads.length > 0;

  return (
    <Card className={`flex min-h-0 flex-col rounded-xl border border-zinc-200 bg-white shadow-sm ${className || ""}`}>
      <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md border border-zinc-200 bg-white">
            <Paperclip className="h-4 w-4 text-zinc-900" />
          </div>
          <div>
            <div className="text-sm font-semibold text-zinc-900">{title}</div>
            <div className="text-xs text-zinc-500">{subtitle} • Max 3MB/file</div>
          </div>
        </div>

        <Button
          type="button"
          className="h-9 rounded-md border border-zinc-200 bg-white px-3 text-xs font-semibold text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50"
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
            {pendingUploads.map((p) => (
              <div key={p.tempId} className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-3 py-2">
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
              <div key={a.id} className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-3 py-2">
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

export default function CampaignDetailPage() {
  const params = useParams<{ id: string }>();
  const campaignId = params.id;
  const { persona } = usePersona();
  const api = useMemo(() => getApiKeyClient(persona), [persona]);

  const [campaign, setCampaign] = useState<CampaignDetail | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [leadFilter, setLeadFilter] = useState<LeadFilterKey>("new");
  const [currentPage, setCurrentPage] = useState(1);

  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [editForm, setEditForm] = useState<Partial<Lead>>({});
  const [saving, setSaving] = useState(false);

  // ✅ Separate pending queues
  const [pendingEmailUploads, setPendingEmailUploads] = useState<PendingUpload[]>([]);
  const [pendingWhatsappUploads, setPendingWhatsappUploads] = useState<PendingUpload[]>([]);

  // ✅ Separate file pickers
  const emailFileRef = useRef<HTMLInputElement | null>(null);
  const whatsappFileRef = useRef<HTMLInputElement | null>(null);
  const tableScrollRef = useRef<HTMLDivElement | null>(null);
  const [tableScrollbar, setTableScrollbar] = useState({
    visible: false,
    thumbTop: 0,
    thumbHeight: 0,
  });

  const pendingCount = useMemo(() => leads.filter((l) => l.approvalStatus === "pending").length, [leads]);
  const approvedCount = useMemo(() => leads.filter((l) => l.approvalStatus === "approved").length, [leads]);
  const rejectedCount = useMemo(() => leads.filter((l) => l.approvalStatus === "rejected").length, [leads]);
  const itemsPerPage = 8;

  const leadFilterTabs = useMemo(
    () => [
      { key: "new" as const, label: "New", count: pendingCount },
      { key: "sent" as const, label: "Sent", count: approvedCount },
      { key: "rejected" as const, label: "Rejected", count: rejectedCount },
    ],
    [pendingCount, approvedCount, rejectedCount]
  );

  const filteredLeads = useMemo(() => {
    if (leadFilter === "new") return leads.filter((l) => l.approvalStatus === "pending");
    if (leadFilter === "sent") return leads.filter((l) => l.approvalStatus === "approved");
    return leads.filter((l) => l.approvalStatus === "rejected");
  }, [leads, leadFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredLeads.length / itemsPerPage));

  const paginatedLeads = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredLeads.slice(start, start + itemsPerPage);
  }, [filteredLeads, currentPage]);

  const visiblePageNumbers = useMemo(() => {
    const windowSize = 5;
    let start = Math.max(1, currentPage - Math.floor(windowSize / 2));
    const end = Math.min(totalPages, start + windowSize - 1);
    start = Math.max(1, end - windowSize + 1);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }, [currentPage, totalPages]);

  const activeFilterLabel = useMemo(
    () => leadFilterTabs.find((tab) => tab.key === leadFilter)?.label || "New",
    [leadFilterTabs, leadFilter]
  );

  const updateTableScrollbar = useCallback(() => {
    const el = tableScrollRef.current;
    if (!el) return;

    const { scrollTop, scrollHeight, clientHeight } = el;
    const maxScroll = scrollHeight - clientHeight;

    if (maxScroll <= 0 || clientHeight <= 0) {
      setTableScrollbar((prev) => (prev.visible ? { visible: false, thumbTop: 0, thumbHeight: 0 } : prev));
      return;
    }

    const minThumb = 34;
    const thumbHeight = Math.max(minThumb, Math.round((clientHeight / scrollHeight) * clientHeight));
    const maxThumbTop = Math.max(0, clientHeight - thumbHeight);
    const thumbTop = Math.round((scrollTop / maxScroll) * maxThumbTop);

    setTableScrollbar((prev) => {
      if (prev.visible && prev.thumbTop === thumbTop && prev.thumbHeight === thumbHeight) return prev;
      return { visible: true, thumbTop, thumbHeight };
    });
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [cRes, lRes] = await Promise.all([
        api.get(`/api/campaigns/${campaignId}`),
        api.get(`/api/campaigns/${campaignId}/leads`, { params: { status: "all" } }),
      ]);

      setCampaign(cRes.data);

      const mapped: Lead[] = (lRes.data.leads || []).map((x: any) => ({
        id: x.id,
        batchId: x.batchId,
        employeeName: x.employeeName,
        title: x.title || "",
        company: x.company || "",
        email: x.email || "",
        phone: x.phone || "",
        linkedinUrl: x.linkedinUrl || "",
        companyUrl: x.companyUrl || "",

        contentEmailSubject: x.contentEmailSubject || "",
        contentEmail: x.contentEmail || "",
        contentLinkedin: x.contentLinkedin || "",
        contentWhatsapp: x.contentWhatsapp || "",

        approvalStatus: normalizeApprovalStatus(x.approvalStatus),

        draftId: x.draftId ?? null,
        draftStatus: x.draftStatus ?? null,
        outreachStatus: x.outreachStatus ?? undefined,

        // ✅ expect backend arrays; fallback to empty
        emailAttachments: Array.isArray(x.emailAttachments) ? x.emailAttachments : [],
        whatsappAttachments: Array.isArray(x.whatsappAttachments) ? x.whatsappAttachments : [],
      }));

      setLeads(mapped);
    } catch (e: any) {
      toast.error("Failed to load campaign", { description: e?.message });
    } finally {
      setLoading(false);
    }
  };

  // const sendDraft = async (draftId: string) => api.post(`/api/v1/drafts/${draftId}/send`);
  const sendLead = async (leadId: string) => api.post(`/api/leads/${leadId}/send`);


  const startPollingLead = (leadId: string) => {
    let tries = 0;
    const maxTries = 40;

    const t = setInterval(async () => {
      tries++;
      try {
        const res = await api.get(`/api/campaigns/${campaignId}/leads`, { params: { status: "all" } });
        const latest = (res.data.leads || []).find((x: any) => x.id === leadId);
        if (!latest) return;

        setLeads((prev) =>
          prev.map((l) =>
            l.id === leadId
              ? {
                ...l,
                approvalStatus: normalizeApprovalStatus(latest.approvalStatus ?? l.approvalStatus),
                draftStatus: latest.draftStatus ?? l.draftStatus,
                outreachStatus: latest.outreachStatus ?? l.outreachStatus,
              }
              : l
          )
        );

        const s = latest.outreachStatus;
        if (s && s.email === "sent" && s.whatsapp === "sent") {
          clearInterval(t);
          toast.success("Outreach sent successfully");
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

  useEffect(() => {
    if (!campaignId) return;
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignId, persona]);

  useEffect(() => {
    if (selectedLead) {
      setEditForm(selectedLead);
      setPendingEmailUploads([]);
      setPendingWhatsappUploads([]);
    }
  }, [selectedLead]);

  useEffect(() => {
    setCurrentPage(1);
  }, [leadFilter]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  useEffect(() => {
    const el = tableScrollRef.current;
    if (!el) return;

    const onResize = () => updateTableScrollbar();
    let resizeObserver: ResizeObserver | null = null;

    window.addEventListener("resize", onResize);

    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(onResize);
      resizeObserver.observe(el);
      if (el.firstElementChild instanceof HTMLElement) resizeObserver.observe(el.firstElementChild);
    }

    updateTableScrollbar();

    return () => {
      window.removeEventListener("resize", onResize);
      resizeObserver?.disconnect();
    };
  }, [updateTableScrollbar]);

  useEffect(() => {
    updateTableScrollbar();
  }, [updateTableScrollbar, filteredLeads.length, currentPage, leadFilter]);

  const handleContentChange = (field: keyof Lead, value: string) => {
    setEditForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleReject = async (leadId: string) => {
    try {
      await api.put(`/api/leads/${leadId}/reject`);
      toast.success("Lead rejected");
      setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, approvalStatus: "rejected" } : l)));
    } catch (e: any) {
      toast.error("Reject failed", { description: e?.response?.data?.detail || e?.message });
    }
  };

  const handleApprove = async (leadId: string) => {
    try {
      await api.put(`/api/leads/${leadId}/approve`);

      setLeads((prev) =>
        prev.map((item) =>
          item.id === leadId
            ? {
              ...item,
              approvalStatus: "approved",
              outreachStatus: { email: "sending", linkedin: "pending", whatsapp: "pending" },
            }
            : item
        )
      );

      toast.success("Lead approved, sending outreach...");

      // ✅ NEW: send by leadId (backend locates latest draft)
      await sendLead(leadId);

      startPollingLead(leadId);
    } catch (e: any) {
      toast.error("Approve/send failed", { description: e?.response?.data?.detail || e?.message });
    }
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

  // -----------------------------
  // Save & Approve (uploads both channels first)
  // -----------------------------
  const handleSaveAndApprove = async () => {
    if (!selectedLead) return;

    setSaving(true);
    const leadId = selectedLead.id;

    try {
      const uploadQueue = async (
        channel: AttachmentChannel,
        pending: PendingUpload[],
        setPending: React.Dispatch<React.SetStateAction<PendingUpload[]>>,
        mergeInto: "emailAttachments" | "whatsappAttachments"
      ) => {
        if (pending.length === 0) return;

        // mark uploading
        setPending((prev) => prev.map((p) => ({ ...p, uploading: true, error: undefined })));

        const uploaded: Attachment[] = [];

        for (const p of pending) {
          try {
            const att = await uploadLeadAttachment(api, leadId, channel, p.file);
            uploaded.push(att);
            setPending((prev) => prev.filter((x) => x.tempId !== p.tempId));
          } catch (e: any) {
            const msg = e?.response?.data?.detail || e?.message || "Upload failed";
            setPending((prev) =>
              prev.map((x) => (x.tempId === p.tempId ? { ...x, uploading: false, error: msg } : x))
            );
            toast.error("Attachment upload failed", { description: `${p.name}: ${msg}` });
          }
        }

        if (uploaded.length > 0) {
          setEditForm((prev) => ({
            ...prev,
            [mergeInto]: [...(((prev as any)[mergeInto] as Attachment[]) || []), ...uploaded],
          }));
        }
      };

      // 1) Upload Email attachments
      await uploadQueue("email", pendingEmailUploads, setPendingEmailUploads, "emailAttachments");

      // 2) Upload WhatsApp attachments
      await uploadQueue("whatsapp", pendingWhatsappUploads, setPendingWhatsappUploads, "whatsappAttachments");

      // 3) Save content + attachments lists
      const payload = {
        contentEmailSubject: editForm.contentEmailSubject,
        contentEmail: editForm.contentEmail,
        contentLinkedin: editForm.contentLinkedin,
        contentWhatsapp: editForm.contentWhatsapp,
        emailAttachments: (editForm.emailAttachments as Attachment[]) || [],
        whatsappAttachments: (editForm.whatsappAttachments as Attachment[]) || [],
      };

      const res = await api.put(`/api/leads/${leadId}/content`, payload);

      toast.success("Saved & Approved, sending outreach...");

      // 4) Update local row
      setLeads((prev) =>
        prev.map((l) =>
          l.id === leadId
            ? {
              ...l,
              contentEmailSubject: res.data.contentEmailSubject ?? l.contentEmailSubject,
              contentEmail: res.data.contentEmail ?? l.contentEmail,
              contentLinkedin: res.data.contentLinkedin ?? l.contentLinkedin,
              contentWhatsapp: res.data.contentWhatsapp ?? l.contentWhatsapp,
              approvalStatus: "approved",
              emailAttachments: Array.isArray(res.data.emailAttachments)
                ? res.data.emailAttachments
                : ((editForm.emailAttachments as Attachment[]) || l.emailAttachments || []),
              whatsappAttachments: Array.isArray(res.data.whatsappAttachments)
                ? res.data.whatsappAttachments
                : ((editForm.whatsappAttachments as Attachment[]) || l.whatsappAttachments || []),
              outreachStatus: { email: "sending", linkedin: "pending", whatsapp: "pending" },
            }
            : l
        )
      );

      // 5) close modal
      setSelectedLead(null);
      setEditForm({});
      setPendingEmailUploads([]);
      setPendingWhatsappUploads([]);

      // 6) send
      // const lead = leads.find((l) => l.id === leadId);
      // const draftId = lead?.draftId;
      // if (!draftId) {
      //   toast.error("Cannot send: draftId missing. Ensure backend returns draftId.");
      //   return;
      // }

      // await sendDraft(draftId);
      // startPollingLead(leadId);

      // NEW: send by leadId
      await sendLead(leadId);
      startPollingLead(leadId);

    } catch (e: any) {
      toast.error("Save/send failed", { description: e?.response?.data?.detail || e?.message });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
      </div>
    );
  }

  return (
    <div className="font-sans flex h-[calc(100dvh-3rem)] min-h-0 flex-col overflow-y-auto scrollbar-hide bg-transparent p-1">
      <div className="relative overflow-hidden rounded-2xl border border-[rgb(255_255_255_/_0.82)] bg-[linear-gradient(160deg,rgba(255,255,255,0.88)_0%,rgba(250,252,255,0.72)_56%,rgba(240,246,253,0.58)_100%)] px-4 py-3 shadow-[0_0_0_1px_rgba(255,255,255,0.82),0_0_12px_-9px_rgba(2,10,27,0.58),0_0_6px_-5px_rgba(15,23,42,0.36),inset_0_1px_0_rgba(255,255,255,1),inset_0_-2px_0_rgba(221,230,244,0.74)] backdrop-blur-[14px] [backdrop-filter:saturate(168%)_blur(14px)]">
        <div className="pointer-events-none absolute -right-16 -top-16 h-36 w-36 rounded-full bg-gradient-to-br from-sky-300/34 via-blue-500/16 to-transparent blur-3xl" />
        <div className="pointer-events-none absolute -left-20 -bottom-16 h-44 w-44 rounded-full bg-gradient-to-tr from-blue-300/20 via-sky-200/8 to-transparent blur-3xl" />

        <div className="relative z-[1] flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="truncate text-xl font-semibold tracking-tight text-zinc-900">{campaign?.name || "Campaign"}</h1>
              <Badge className="rounded-full border border-zinc-200/80 bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-700 shadow-none backdrop-blur-[6px] [backdrop-filter:saturate(130%)_blur(6px)]">
                {String(campaign?.status || "needs_review").replaceAll("_", " ")}
              </Badge>
            </div>
            <p className="mt-1 text-xs text-zinc-500/90">Created {formatDateOnly(campaign?.createdAt)}</p>
          </div>

          <div className="flex flex-nowrap items-center gap-2 self-start">
            <Link href="/campaigns">
              <Button className="analytics-frost-btn h-9 px-3.5">
                <ArrowLeft className="h-4 w-4" />
                Back to Campaigns
              </Button>
            </Link>
          </div>
        </div>

        <div className="relative z-[1] mt-3 grid gap-2 border-t border-zinc-100/80 pt-3 sm:grid-cols-2 xl:grid-cols-4">
          <Card className="rounded-2xl border border-zinc-200 bg-white p-3">
            <div className="flex h-full flex-col">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500/90">Total Leads</span>
              <div className="mt-auto flex items-end">
                <span className="text-xl font-semibold tracking-tight text-zinc-900">{leads.length}</span>
              </div>
            </div>
          </Card>

          <Card className="rounded-2xl border border-zinc-200 bg-white p-3">
            <div className="flex h-full flex-col">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500/90">Pending</span>
              <div className="mt-auto flex items-end">
                <span className="text-xl font-semibold tracking-tight text-zinc-900">{pendingCount}</span>
              </div>
            </div>
          </Card>

          <Card className="rounded-2xl border border-zinc-200 bg-white p-3">
            <div className="flex h-full flex-col">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500/90">Approved</span>
              <div className="mt-auto flex items-end">
                <span className="text-xl font-semibold tracking-tight text-sidebar-primary">{approvedCount}</span>
              </div>
            </div>
          </Card>

          <Card className="rounded-2xl border border-zinc-200 bg-white p-3">
            <div className="flex h-full flex-col">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500/90">Rejected</span>
              <div className="mt-auto flex items-end">
                <span className="text-xl font-semibold tracking-tight text-zinc-500">{rejectedCount}</span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <Card className="relative isolate mt-3 flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-[rgb(255_255_255_/_0.82)] bg-[linear-gradient(160deg,rgba(255,255,255,0.84)_0%,rgba(250,252,255,0.66)_56%,rgba(240,246,253,0.56)_100%)] backdrop-blur-[16px] [backdrop-filter:saturate(175%)_blur(16px)] shadow-[0_0_0_1px_rgba(255,255,255,0.82),0_0_12px_-9px_rgba(2,10,27,0.58),0_0_6px_-5px_rgba(15,23,42,0.36),inset_0_1px_0_rgba(255,255,255,1),inset_0_-2px_0_rgba(221,230,244,0.74),inset_0_0_22px_rgba(255,255,255,0.2)]">
        <div className="pointer-events-none absolute -right-20 -top-24 h-60 w-60 rounded-full bg-gradient-to-br from-sky-300/34 via-blue-500/12 to-blue-700/0 blur-3xl" />
        <div className="pointer-events-none absolute -left-24 -bottom-20 h-56 w-56 rounded-full bg-gradient-to-tr from-blue-300/20 via-sky-200/10 to-transparent blur-3xl" />

        <div className="relative z-[2] px-6 pt-0.5">
          <div className="inline-flex items-center rounded-xl border border-zinc-200/90 bg-white/60 p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.94),0_8px_14px_-12px_rgba(2,10,27,0.58)] backdrop-blur-[6px]">
            {leadFilterTabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setLeadFilter(tab.key)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  leadFilter === tab.key
                    ? "bg-zinc-900 text-white shadow-[0_10px_16px_-14px_rgba(2,10,27,0.65)]"
                    : "text-zinc-600 hover:bg-white hover:text-zinc-900"
                }`}
              >
                {tab.label}
                <span className={`ml-1.5 text-[10px] ${leadFilter === tab.key ? "text-white/80" : "text-zinc-400"}`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="relative z-[2] min-h-0 flex-1">
          <div
            ref={tableScrollRef}
            onScroll={updateTableScrollbar}
            className="scrollbar-hide h-full overflow-auto px-4 pb-2 pt-3 pr-5"
          >
            <table className="min-w-[960px] w-full">
            <thead className="border-b border-zinc-100/85 bg-white/70">
              <tr>
                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-zinc-400">Profile</th>
                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-zinc-400">Contact Info</th>
                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-zinc-400">Content</th>
                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-zinc-400">Status</th>
                <th className="px-4 py-3 text-right text-[11px] font-bold uppercase tracking-wider text-zinc-400">Quick Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-zinc-100/70">
              {paginatedLeads.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-sm text-zinc-500">
                    No {activeFilterLabel.toLowerCase()} leads found.
                  </td>
                </tr>
              )}

              {paginatedLeads.map((item) => {
                const status = approvalStyles[item.approvalStatus] ?? approvalStyles.pending;
                const StatusIcon = status.icon;

                return (
                  <tr key={item.id} className="group transition-colors hover:bg-white/46">
                    <td className="px-4 py-3.5">
                      <div className="flex flex-col">
                        <span className="font-semibold text-zinc-900">{item.employeeName}</span>
                        <span className="text-xs text-zinc-500">{item.title}</span>
                        <a href={item.companyUrl} target="_blank" rel="noreferrer" className="mt-0.5 w-fit text-xs text-zinc-400 hover:text-zinc-600 hover:underline">
                          {item.companyUrl}
                        </a>
                      </div>
                    </td>

                    <td className="px-4 py-3.5">
                      <div className="flex flex-col gap-1">
                        <span className="font-mono text-xs text-zinc-600">{item.email}</span>
                        <span className="text-xs text-zinc-400">{item.phone}</span>
                        <div className="mt-1 flex gap-3">
                          <a href={item.linkedinUrl} target="_blank" rel="noreferrer" className="text-zinc-400 transition-colors hover:text-zinc-900">
                            <LinkedInIcon className="h-3.5 w-3.5" />
                          </a>
                          <a href={item.companyUrl} target="_blank" rel="noreferrer" className="text-zinc-400 transition-colors hover:text-zinc-900">
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3.5">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 rounded-md border border-zinc-200/80 bg-white/82 text-xs font-semibold text-zinc-700 shadow-[0_8px_14px_-12px_rgba(2,10,27,0.42),inset_0_1px_0_rgba(255,255,255,0.95)] hover:border-zinc-300 hover:bg-white hover:text-zinc-900"
                        onClick={() => setSelectedLead(item)}
                      >
                        <Eye className="mr-2 h-3.5 w-3.5 text-zinc-400" />
                        Review Content
                      </Button>
                    </td>

                    <td className="px-4 py-3.5">
                      <Badge className={`rounded-md border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide shadow-none ${status.bg}`}>
                        <StatusIcon className="mr-1.5 h-3 w-3" />
                        {item.approvalStatus}
                      </Badge>
                    </td>

                    <td className="px-4 py-3.5 text-right">
                      <div className="flex min-w-[120px] justify-end gap-2">
                        {item.approvalStatus === "pending" ? (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-md border border-zinc-200/80 bg-white/82 text-zinc-400 hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                              onClick={() => handleReject(item.id)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              className="h-8 w-8 rounded-md border border-sidebar-primary/75 bg-sidebar-primary text-sidebar-foreground shadow-[0_8px_14px_-12px_rgba(17,46,98,0.62)] hover:bg-sidebar-primary/85"
                              onClick={() => handleApprove(item.id)}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                          </>
                        ) : item.approvalStatus === "rejected" ? (
                          <span className="text-xs italic text-zinc-400">Rejected</span>
                        ) : (
                          <OutreachStatusIcons status={buildOutreachStatus(item)} />
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            </table>
          </div>

          {tableScrollbar.visible && (
            <div className="pointer-events-none absolute inset-y-0 right-1 w-2">
              <div className="absolute inset-y-0 left-[2px] right-[2px] rounded-full bg-zinc-200/60" />
              <div
                className="absolute left-[2px] right-[2px] rounded-full bg-zinc-500/75 transition-[transform,height] duration-150"
                style={{
                  height: `${tableScrollbar.thumbHeight}px`,
                  transform: `translateY(${tableScrollbar.thumbTop}px)`,
                }}
              />
            </div>
          )}
        </div>

        {filteredLeads.length > 0 && (
          <div className="relative z-[2] flex items-center justify-between border-t border-zinc-100/85 bg-white/38 px-6 py-3">
            <span className="text-xs text-zinc-500">
              Showing {(currentPage - 1) * itemsPerPage + 1}-
              {Math.min(currentPage * itemsPerPage, filteredLeads.length)} of {filteredLeads.length}{" "}
              {activeFilterLabel.toLowerCase()} leads
            </span>

            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="h-8 rounded-md border border-zinc-200/80 bg-white/82 px-2 text-zinc-600 disabled:opacity-40"
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
                      : "border-zinc-200/80 bg-white/82 text-zinc-600 hover:border-zinc-300 hover:text-zinc-900"
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
                className="h-8 rounded-md border border-zinc-200/80 bg-white/82 px-2 text-zinc-600 disabled:opacity-40"
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
      <AnimatePresence>
        {selectedLead && (
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
              className="relative flex max-h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-[0_22px_36px_-26px_rgba(2,10,27,0.62)]"
            >
              <div className="relative z-[2] flex flex-col gap-3 border-b border-zinc-100 bg-white px-6 py-5 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="text-xl font-semibold tracking-tight text-zinc-900">Review &amp; Personalize Content</h3>
                  <p className="mt-1 text-xs text-zinc-500">
                    {selectedLead.employeeName} - {selectedLead.title}
                  </p>
                </div>

                <div className="flex items-center">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={closeModal}
                    className="h-8 w-8 rounded-md border border-zinc-200 bg-white text-zinc-400 hover:border-zinc-300 hover:text-zinc-900"
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>
              </div>

              <div className="relative z-[2] flex-1 space-y-5 overflow-y-auto scrollbar-hide bg-white p-6">
                <div className="grid gap-5 xl:h-[24.5rem] xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
                  <Card className="h-full rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
                    <div className="mb-4 flex items-center gap-2">
                      <div className="rounded-md border border-zinc-200 bg-white p-1.5">
                        <Mail className="h-4 w-4 text-zinc-900" />
                      </div>
                      <span className="text-sm font-semibold text-zinc-900">Cold Email</span>
                    </div>

                    <div className="flex h-full min-h-0 flex-col space-y-3">
                      <div>
                        <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-zinc-400">Subject Line</label>
                        <input
                          className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-900"
                          value={(editForm.contentEmailSubject as string) || ""}
                          onChange={(e) => handleContentChange("contentEmailSubject", e.target.value)}
                        />
                      </div>

                      <div className="flex min-h-0 flex-1 flex-col">
                        <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-zinc-400">Email Body</label>
                        <textarea
                          className="h-full min-h-0 w-full resize-none rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-900"
                          value={(editForm.contentEmail as string) || ""}
                          onChange={(e) => handleContentChange("contentEmail", e.target.value)}
                        />
                      </div>
                    </div>
                  </Card>

                  <div className="grid min-h-0 grid-cols-1 gap-4 xl:h-full xl:grid-rows-2">
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
                <p className="text-xs text-zinc-500">Changes are saved before approval and outreach is triggered.</p>

                {selectedLead.approvalStatus === "pending" ? (
                  <div className="flex justify-end gap-3">
                    <Button
                      variant="ghost"
                      className="h-9 rounded-md border border-zinc-200 bg-white px-3 text-zinc-600 hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                      onClick={async () => {
                        await handleReject(selectedLead.id);
                        closeModal();
                      }}
                    >
                      Reject
                    </Button>

                    <Button className="btn-sidebar-noise h-9 px-3.5" disabled={saving} onClick={handleSaveAndApprove}>
                      {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                      Save &amp; Approve
                    </Button>
                  </div>
                ) : (
                  <Button variant="outline" onClick={closeModal} className="analytics-frost-btn h-9 min-w-24 px-3">
                    Close
                  </Button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}


