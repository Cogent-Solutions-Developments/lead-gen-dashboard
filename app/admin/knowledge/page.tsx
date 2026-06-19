"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Archive,
  ArrowLeft,
  BrainCircuit,
  CheckCircle2,
  Download,
  FileText,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  UploadCloud,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EventRegistryPicker } from "@/components/events/EventRegistryPicker";
import { Input } from "@/components/ui/input";
import {
  archiveNizoAiKnowledge,
  downloadNizoAiKnowledgeFile,
  listNizoAiKnowledge,
  uploadNizoAiKnowledge,
  type NizoAiKnowledgeCollection,
  type NizoAiKnowledgeDocument,
} from "@/lib/api";
import { listAdminEvents, type AdminEventItem } from "@/lib/auth";

const MAX_KNOWLEDGE_BYTES = 20 * 1024 * 1024;
const COLLECTION_FALLBACKS: NizoAiKnowledgeCollection[] = [
  { value: "00_event_intelligence", label: "Event Intelligence" },
  { value: "01_core_sales_philosophy", label: "Core Sales Philosophy" },
  { value: "02_sponsorship_motivation", label: "Sponsorship Motivation" },
  { value: "03_target_qualification", label: "Target Qualification" },
  { value: "04_competitive_intelligence", label: "Competitive Intelligence" },
  { value: "05_icp_analysis", label: "ICP Analysis" },
  { value: "06_event_fit_analysis", label: "Event Fit Analysis" },
  { value: "07_priority_scoring", label: "Priority Scoring" },
  { value: "08_sales_pitch_framework", label: "Sales Pitch Framework" },
  { value: "09_objection_handling", label: "Objection Handling" },
  { value: "10_high_ticket_sales", label: "High Ticket Sales" },
  { value: "11_crm_output_templates", label: "CRM Output Templates" },
  { value: "12_system_prompts", label: "System Prompts" },
];

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Please try again.";
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
}

function formatBytes(value?: number | null) {
  const bytes = Number(value || 0);
  if (!Number.isFinite(bytes) || bytes <= 0) return "-";
  if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(bytes >= 10 * 1024 * 1024 ? 0 : 1) + " MB";
  if (bytes >= 1024) return (bytes / 1024).toFixed(bytes >= 10 * 1024 ? 0 : 1) + " KB";
  return bytes + " B";
}

function readableCollection(value?: string | null) {
  const raw = String(value || "general");
  const match = COLLECTION_FALLBACKS.find((item) => item.value === raw);
  if (match) return match.label;
  return raw.replace(/^\d+_/, "").replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function sortEvents(events: AdminEventItem[]) {
  return [...events].sort((a, b) => a.eventName.localeCompare(b.eventName));
}

function statusClass(status: string) {
  const normalized = status.toLowerCase();
  if (normalized === "indexed") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (normalized === "failed") return "border-red-200 bg-red-50 text-red-700";
  if (normalized === "archived") return "border-zinc-200 bg-zinc-100 text-zinc-500";
  return "border-blue-200 bg-blue-50 text-blue-700";
}

function validateKnowledgeFile(file: File) {
  const name = file.name.toLowerCase();
  const isSupported = name.endsWith(".md") || name.endsWith(".txt") || name.endsWith(".pdf") || name.endsWith(".docx");
  if (!isSupported) return "Only .md, .txt, .pdf, and .docx knowledge files are supported.";
  if (file.size > MAX_KNOWLEDGE_BYTES) return "Knowledge files must be 20MB or smaller.";
  return "";
}

export default function AdminKnowledgePage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [documents, setDocuments] = useState<NizoAiKnowledgeDocument[]>([]);
  const [collections, setCollections] = useState<NizoAiKnowledgeCollection[]>(COLLECTION_FALLBACKS);
  const [events, setEvents] = useState<AdminEventItem[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [scope, setScope] = useState("global");
  const [documentType, setDocumentType] = useState("auto");
  const [eventKey, setEventKey] = useState("");
  const [category, setCategory] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [downloadingId, setDownloadingId] = useState("");
  const [archivingId, setArchivingId] = useState("");
  const [archiveTarget, setArchiveTarget] = useState<NizoAiKnowledgeDocument | null>(null);

  const activeCount = useMemo(
    () => documents.filter((document) => document.status.toLowerCase() === "indexed").length,
    [documents]
  );
  const archivedCount = useMemo(
    () => documents.filter((document) => document.status.toLowerCase() === "archived").length,
    [documents]
  );
  const totalChunks = useMemo(
    () => documents.reduce((sum, document) => sum + Number(document.chunkCount || 0), 0),
    [documents]
  );

  const collectionOptions = collections.length ? collections : COLLECTION_FALLBACKS;
  const selectedEvent = useMemo(
    () => events.find((event) => event.eventKey === eventKey) ?? null,
    [eventKey, events]
  );

  const loadKnowledge = useCallback(async () => {
    setLoading(true);
    try {
      const response = await listNizoAiKnowledge({
        status: statusFilter,
        search: search.trim() || undefined,
        limit: 100,
      });
      setDocuments(response.documents);
      if (response.collections?.length) setCollections(response.collections);
    } catch (error: unknown) {
      toast.error("Knowledge library failed to load", { description: getErrorMessage(error) });
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  const loadEvents = useCallback(async () => {
    setLoadingEvents(true);
    try {
      const rows = sortEvents(await listAdminEvents(true));
      setEvents(rows);
      setEventKey((current) => (rows.some((event) => event.eventKey === current) ? current : ""));
    } catch (error: unknown) {
      toast.error("Failed to load events", { description: getErrorMessage(error) });
      setEvents([]);
      setEventKey("");
    } finally {
      setLoadingEvents(false);
    }
  }, []);

  useEffect(() => {
    void loadKnowledge();
  }, [loadKnowledge]);

  useEffect(() => {
    void loadEvents();
  }, [loadEvents]);

  const handleFileChange = (file: File | null) => {
    if (!file) {
      setSelectedFile(null);
      return;
    }
    const error = validateKnowledgeFile(file);
    if (error) {
      toast.error("Knowledge file rejected", { description: error });
      if (fileInputRef.current) fileInputRef.current.value = "";
      setSelectedFile(null);
      return;
    }
    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error("Select a knowledge file first");
      return;
    }
    const error = validateKnowledgeFile(selectedFile);
    if (error) {
      toast.error("Knowledge file rejected", { description: error });
      return;
    }

    setUploading(true);
    try {
      const response = await uploadNizoAiKnowledge({
        file: selectedFile,
        scope,
        documentType,
        eventKey,
        category,
      });
      toast.success("Knowledge indexed", {
        description: response.document.fileName + " is ready for NizoAI retrieval.",
      });
      setSelectedFile(null);
      setEventKey("");
      setCategory("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      await loadKnowledge();
    } catch (error: unknown) {
      toast.error("Knowledge upload failed", { description: getErrorMessage(error) });
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (document: NizoAiKnowledgeDocument) => {
    setDownloadingId(document.id);
    try {
      await downloadNizoAiKnowledgeFile(document.id, document.fileName || "knowledge.md");
      toast.success("Knowledge download started");
    } catch (error: unknown) {
      toast.error("Knowledge download failed", { description: getErrorMessage(error) });
    } finally {
      setDownloadingId("");
    }
  };

  const closeArchiveDialog = () => {
    if (archivingId) return;
    setArchiveTarget(null);
  };

  const confirmArchive = async () => {
    if (!archiveTarget) return;
    setArchivingId(archiveTarget.id);
    try {
      await archiveNizoAiKnowledge(archiveTarget.id);
      toast.success("Knowledge archived", {
        description: archiveTarget.fileName + " will no longer be used by RAG.",
      });
      setArchiveTarget(null);
      await loadKnowledge();
    } catch (error: unknown) {
      toast.error("Archive failed", { description: getErrorMessage(error) });
    } finally {
      setArchivingId("");
    }
  };

  return (
    <div className="admin-page">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="admin-page-header flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between"
      >
        <div>
          <Link
            href="/admin"
            className="inline-flex items-center text-xs font-semibold text-zinc-500 transition-colors hover:text-zinc-950"
          >
            <ArrowLeft className="mr-2 h-3.5 w-3.5" />
            Admin dashboard
          </Link>
          <p className="admin-eyebrow mt-3">Admin Control</p>
          <h1 className="admin-title">Knowledge Library</h1>
          <p className="admin-description">
            Upload approved sales knowledge for NizoAI content generation and keep every source visible to admins.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => void loadKnowledge()}
          disabled={loading}
          className="h-10 border-zinc-300 bg-white px-4 text-zinc-700 hover:bg-zinc-50"
        >
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Refresh
        </Button>
      </motion.div>

      <div className="mb-4 grid gap-3 md:grid-cols-3">
        <Card className="admin-card-soft p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">Indexed sources</p>
          <div className="mt-3 flex items-center justify-between">
            <span className="text-3xl font-semibold text-zinc-950">{activeCount}</span>
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          </div>
        </Card>
        <Card className="admin-card-soft p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">Knowledge chunks</p>
          <div className="mt-3 flex items-center justify-between">
            <span className="text-3xl font-semibold text-zinc-950">{totalChunks}</span>
            <BrainCircuit className="h-5 w-5 text-blue-600" />
          </div>
        </Card>
        <Card className="admin-card-soft p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">Archived</p>
          <div className="mt-3 flex items-center justify-between">
            <span className="text-3xl font-semibold text-zinc-950">{archivedCount}</span>
            <Archive className="h-5 w-5 text-zinc-500" />
          </div>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <Card className="admin-card p-5">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-zinc-300 bg-zinc-50 text-zinc-700">
              <UploadCloud className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">Admin upload</p>
              <h2 className="mt-1 text-lg font-semibold tracking-tight text-zinc-900">Approved RAG source</h2>
              <p className="mt-1 text-sm leading-relaxed text-zinc-500">Markdown, text, PDF, or DOCX. Maximum 20MB.</p>
            </div>
          </div>

          <div className="mt-6 space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Scope</label>
                <select
                  value={scope}
                  onChange={(event) => setScope(event.target.value)}
                  disabled={uploading}
                  className="h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none transition-colors focus:border-blue-500 disabled:opacity-60"
                >
                  <option value="global">Global</option>
                  <option value="sales">Sales</option>
                  <option value="delegate">Delegate</option>
                  <option value="production">Production</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Collection</label>
                <select
                  value={documentType}
                  onChange={(event) => setDocumentType(event.target.value)}
                  disabled={uploading}
                  className="h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none transition-colors focus:border-blue-500 disabled:opacity-60"
                >
                  <option value="auto">Auto detect from filename</option>
                  {collectionOptions.map((collection) => (
                    <option key={collection.value} value={collection.value}>
                      {collection.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Event</label>
                <EventRegistryPicker
                  events={events}
                  value={eventKey}
                  onValueChange={setEventKey}
                  loading={loadingEvents}
                  disabled={uploading}
                  placeholder="Select event"
                  loadingLabel="Loading events..."
                  getEventValue={(event) => event.eventKey}
                />
                <p className="text-xs text-zinc-500">
                  {selectedEvent ? "Event scope selected." : "Optional event scope."}
                </p>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Category</label>
                <Input
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  placeholder="Optional category scope"
                  disabled={uploading}
                  className="h-10 border-zinc-300 bg-white"
                />
              </div>
            </div>

            <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50/80 p-5">
              <input
                ref={fileInputRef}
                type="file"
                accept=".md,.txt,.pdf,.docx,text/markdown,text/plain,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                className="sr-only"
                onChange={(event) => handleFileChange(event.target.files?.[0] ?? null)}
              />
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-zinc-900">
                    {selectedFile ? selectedFile.name : "No knowledge file selected"}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {selectedFile ? formatBytes(selectedFile.size) : "Choose a reviewed source file for NizoAI."}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="h-9 shrink-0 border-zinc-300 bg-white px-3 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                >
                  Select file
                </Button>
              </div>
            </div>

            <Button
              type="button"
              onClick={() => void handleUpload()}
              disabled={uploading || !selectedFile}
              className="h-11 w-full rounded-md bg-blue-600 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
              Upload and Index
            </Button>
          </div>
        </Card>

        <Card className="admin-card p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">Retrieval controls</p>
              <h2 className="mt-1 text-lg font-semibold tracking-tight text-zinc-900">Source hygiene</h2>
              <p className="mt-1 text-sm leading-relaxed text-zinc-500">
                Archived files stay auditable but are removed from RAG retrieval.
              </p>
            </div>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-zinc-300 bg-zinc-50 text-zinc-700">
              <ShieldCheck className="h-5 w-5" />
            </span>
          </div>

          <div className="mt-6 space-y-4">
            <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                <div>
                  <p className="text-sm font-semibold text-zinc-900">Approved files only</p>
                  <p className="mt-1 text-sm leading-6 text-zinc-500">
                    Upload polished company rules, sales prompts, qualification rules, and objection handling files after internal review.
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-4">
              <div className="flex items-start gap-3">
                <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
                <div>
                  <p className="text-sm font-semibold text-zinc-900">No unreviewed chat exports</p>
                  <p className="mt-1 text-sm leading-6 text-zinc-500">
                    Keep personal, private, or uncertain content out of the shared RAG library until it has been cleaned.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Card>

        <Card className="admin-card p-5 xl:col-span-2">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">Knowledge sources</p>
              <h2 className="mt-1 text-lg font-semibold tracking-tight text-zinc-900">Uploaded documents</h2>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search documents"
                  className="h-10 w-full border-zinc-300 bg-white pl-9 sm:w-72"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="h-10 rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none transition-colors focus:border-blue-500"
              >
                <option value="all">All statuses</option>
                <option value="indexed">Indexed</option>
                <option value="failed">Failed</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>

          <div className="mt-6">
            {loading ? (
              <div className="flex h-36 items-center justify-center text-sm text-zinc-500">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading knowledge sources
              </div>
            ) : documents.length > 0 ? (
              <div className="admin-list-panel space-y-3 pr-1">
                {documents.map((document) => {
                  const archived = document.status.toLowerCase() === "archived";
                  const meta = document.meta || {};
                  const eventMeta = String(meta.eventKey || "").trim();
                  const categoryMeta = String(meta.category || "").trim();
                  return (
                    <div
                      key={document.id}
                      className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm sm:flex-row sm:items-start sm:justify-between"
                    >
                      <div className="flex min-w-0 gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-600">
                          <FileText className="h-5 w-5" />
                        </span>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="truncate text-sm font-semibold text-zinc-950">{document.fileName}</h3>
                            <span className={"rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider " + statusClass(document.status)}>
                              {document.status}
                            </span>
                          </div>
                          <p className="mt-1 text-sm text-zinc-500">
                            {readableCollection(document.documentType)} - {document.pipelineScope} - {document.chunkCount || 0} chunks
                          </p>
                          <p className="mt-1 text-xs text-zinc-400">
                            Updated {formatDateTime(document.updatedAt)} - ID: {document.id}
                          </p>
                          {eventMeta || categoryMeta ? (
                            <p className="mt-1 text-xs text-zinc-500">
                              {eventMeta ? "Event: " + eventMeta : ""}
                              {eventMeta && categoryMeta ? " - " : ""}
                              {categoryMeta ? "Category: " + categoryMeta : ""}
                            </p>
                          ) : null}
                          {document.error ? (
                            <p className="mt-2 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs leading-5 text-red-700">
                              {document.error}
                            </p>
                          ) : null}
                        </div>
                      </div>

                      <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => void handleDownload(document)}
                          disabled={downloadingId === document.id || archivingId === document.id}
                          className="h-9 border-zinc-300 bg-white px-3 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                        >
                          {downloadingId === document.id ? (
                            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Download className="mr-1.5 h-3.5 w-3.5" />
                          )}
                          Download
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setArchiveTarget(document)}
                          disabled={archived || downloadingId === document.id || archivingId === document.id}
                          className="h-9 border-zinc-300 bg-white px-3 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
                        >
                          {archivingId === document.id ? (
                            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Archive className="mr-1.5 h-3.5 w-3.5" />
                          )}
                          Archive
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50/80 p-8 text-center">
                <BrainCircuit className="mx-auto h-8 w-8 text-zinc-300" />
                <p className="mt-3 text-sm font-semibold text-zinc-700">No knowledge sources found</p>
                <p className="mt-1 text-xs text-zinc-500">Upload approved RAG files to make them available for content generation.</p>
              </div>
            )}
          </div>
        </Card>
      </div>

      {archiveTarget ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-blue-950/35 px-4 py-6">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="knowledge-archive-title"
            className="admin-modal-panel w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-5 shadow-[0_28px_80px_-30px_rgba(2,10,27,0.6)]"
          >
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-100 bg-amber-50 text-amber-700">
                <Archive className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold uppercase tracking-wider text-amber-700">Archive knowledge</p>
                <h2 id="knowledge-archive-title" className="mt-1 text-lg font-semibold tracking-tight text-slate-900">
                  Remove from RAG retrieval?
                </h2>
                <p className="mt-2 break-words text-sm leading-6 text-zinc-500">
                  {archiveTarget.fileName || "This document"} will stay in the admin library, but NizoAI will stop using it for content generation.
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={closeArchiveDialog}
                disabled={Boolean(archivingId)}
                className="h-10 border-zinc-300 bg-white px-4 text-zinc-700 hover:bg-zinc-50"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => void confirmArchive()}
                disabled={archivingId === archiveTarget.id}
                className="h-10 bg-blue-600 px-4 text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {archivingId === archiveTarget.id ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Archive className="mr-2 h-4 w-4" />
                )}
                Archive source
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
