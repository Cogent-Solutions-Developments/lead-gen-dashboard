"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  CalendarDays,
  Download,
  FileSpreadsheet,
  FileText,
  History,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { toast } from "sonner";
import { EventRegistryPicker } from "@/components/events/EventRegistryPicker";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  deleteEventDocument,
  downloadEventDocumentFile,
  listEventDocuments,
  uploadEventDocument,
  type EventDocumentItem,
  type EventDocumentType,
} from "@/lib/api";
import { listAdminEvents, type AdminEventItem } from "../admin-api";

const MAX_DOCUMENT_BYTES = 20 * 1024 * 1024;
const DOCUMENT_TABS: Array<{
  type: EventDocumentType;
  label: string;
  singular: string;
  formats: string;
  accept: string;
  allowed: ReadonlySet<string>;
}> = [
  {
    type: "agenda",
    label: "Agendas",
    singular: "agenda",
    formats: "PDF only, maximum 20MB.",
    accept: "application/pdf,.pdf",
    allowed: new Set(["pdf"]),
  },
  {
    type: "speaker_list",
    label: "Confirmed Speakers",
    singular: "confirmed speaker list",
    formats: "PDF or spreadsheet (.xlsx, .xls, .csv), maximum 20MB.",
    accept: "application/pdf,.pdf,.xlsx,.xls,.csv",
    allowed: new Set(["pdf", "xlsx", "xls", "csv"]),
  },
  {
    type: "delegate_list",
    label: "Confirmed Delegates",
    singular: "confirmed delegate list",
    formats: "PDF or spreadsheet (.xlsx, .xls, .csv), maximum 20MB.",
    accept: "application/pdf,.pdf,.xlsx,.xls,.csv",
    allowed: new Set(["pdf", "xlsx", "xls", "csv"]),
  },
];

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Please try again.";
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString();
}

function formatBytes(value?: number | null) {
  const bytes = Number(value || 0);
  if (!Number.isFinite(bytes) || bytes <= 0) return "-";
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(bytes >= 10 * 1024 * 1024 ? 0 : 1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(bytes >= 10 * 1024 ? 0 : 1)} KB`;
  return `${bytes} B`;
}

function validateFile(file: File, tab: (typeof DOCUMENT_TABS)[number]) {
  const extension = file.name.toLowerCase().split(".").pop() || "";
  if (!tab.allowed.has(extension)) return `Use one of the supported formats: ${tab.formats}`;
  if (file.size <= 0) return "The selected file is empty.";
  if (file.size > MAX_DOCUMENT_BYTES) return "The selected file must be 20MB or smaller.";
  return "";
}

export default function AdminEventDocumentsPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [activeType, setActiveType] = useState<EventDocumentType>("agenda");
  const [events, setEvents] = useState<AdminEventItem[]>([]);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documents, setDocuments] = useState<EventDocumentItem[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [documentError, setDocumentError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [downloadingId, setDownloadingId] = useState("");
  const [deletingId, setDeletingId] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<EventDocumentItem | null>(null);

  const activeTab = useMemo(
    () => DOCUMENT_TABS.find((tab) => tab.type === activeType) ?? DOCUMENT_TABS[0],
    [activeType]
  );
  const selectedEvent = useMemo(
    () => events.find((event) => event.id === selectedEventId) ?? null,
    [events, selectedEventId]
  );
  const latestDocument = documents[0] ?? null;
  const DocumentIcon = activeType === "agenda" ? FileText : FileSpreadsheet;

  const loadEvents = useCallback(async () => {
    setLoadingEvents(true);
    try {
      const rows = [...(await listAdminEvents(true))].sort((a, b) => a.eventName.localeCompare(b.eventName));
      setEvents(rows);
      setSelectedEventId((current) => (rows.some((event) => event.id === current) ? current : ""));
    } catch (error: unknown) {
      toast.error("Failed to load events", { description: getErrorMessage(error) });
      setEvents([]);
    } finally {
      setLoadingEvents(false);
    }
  }, []);

  const loadDocuments = useCallback(async (eventId: string, documentType: EventDocumentType) => {
    if (!eventId) {
      setDocuments([]);
      setDocumentError("");
      return;
    }
    setLoadingDocuments(true);
    setDocumentError("");
    try {
      const response = await listEventDocuments({ eventId, documentType });
      setDocuments(response.documents);
    } catch (error: unknown) {
      setDocuments([]);
      setDocumentError(getErrorMessage(error));
    } finally {
      setLoadingDocuments(false);
    }
  }, []);

  useEffect(() => void loadEvents(), [loadEvents]);
  useEffect(() => void loadDocuments(selectedEventId, activeType), [activeType, loadDocuments, selectedEventId]);

  const selectTab = (documentType: EventDocumentType) => {
    setActiveType(documentType);
    setSelectedFile(null);
    setDeleteTarget(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleFileChange = (file: File | null) => {
    if (!file) return void setSelectedFile(null);
    const error = validateFile(file, activeTab);
    if (!error) return void setSelectedFile(file);
    toast.error("File rejected", { description: error });
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleUpload = async () => {
    if (!selectedEventId) return void toast.error("Select an event first");
    if (!selectedFile) return void toast.error(`Select a ${activeTab.singular} file first`);
    const error = validateFile(selectedFile, activeTab);
    if (error) return void toast.error("File rejected", { description: error });
    setUploading(true);
    try {
      const response = await uploadEventDocument(selectedEventId, activeType, selectedFile);
      toast.success("Document uploaded", { description: `${response.document.name} is now the latest version.` });
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      await loadDocuments(selectedEventId, activeType);
    } catch (uploadError: unknown) {
      toast.error("Upload failed", { description: getErrorMessage(uploadError) });
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (document: EventDocumentItem) => {
    setDownloadingId(document.id);
    try {
      await downloadEventDocumentFile(document.id, document.name);
      toast.success("Document download started");
    } catch (downloadError: unknown) {
      toast.error("Download failed", { description: getErrorMessage(downloadError) });
    } finally {
      setDownloadingId("");
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeletingId(deleteTarget.id);
    try {
      await deleteEventDocument(deleteTarget.id);
      toast.success("Document deleted", { description: `${deleteTarget.name} was removed.` });
      setDeleteTarget(null);
      await loadDocuments(selectedEventId, activeType);
    } catch (deleteError: unknown) {
      toast.error("Delete failed", { description: getErrorMessage(deleteError) });
    } finally {
      setDeletingId("");
    }
  };

  return (
    <div className="admin-page">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="admin-page-header flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <Link href="/admin" className="inline-flex items-center text-xs font-semibold text-zinc-500 transition-colors hover:text-zinc-950">
            <ArrowLeft className="mr-2 h-3.5 w-3.5" />Admin dashboard
          </Link>
          <p className="admin-eyebrow mt-3">Admin Control</p>
          <h1 className="admin-title">Event Document Library</h1>
          <p className="admin-description">Manage agendas, confirmed speakers, and confirmed delegates with isolated version histories.</p>
        </div>
        <Button type="button" variant="outline" onClick={() => selectedEventId && void loadDocuments(selectedEventId, activeType)} disabled={loadingEvents || loadingDocuments} className="h-10 border-zinc-300 bg-white px-4 text-zinc-700 hover:bg-zinc-50">
          {loadingDocuments ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}Refresh
        </Button>
      </motion.div>

      <div role="tablist" aria-label="Event document types" className="mb-4 grid gap-2 rounded-xl border border-zinc-200 bg-white p-2 sm:grid-cols-3">
        {DOCUMENT_TABS.map((tab) => (
          <button key={tab.type} type="button" role="tab" aria-selected={activeType === tab.type} onClick={() => selectTab(tab.type)} className={`rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors ${activeType === tab.type ? "bg-blue-600 text-white shadow-sm" : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-950"}`}>
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <Card className="admin-card p-5">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-zinc-300 bg-zinc-50 text-zinc-700"><UploadCloud className="h-5 w-5" /></span>
            <div><p className="text-xs font-bold uppercase tracking-wider text-zinc-500">Admin upload</p><h2 className="mt-1 text-lg font-semibold tracking-tight text-zinc-900">Latest {activeTab.singular}</h2><p className="mt-1 text-sm text-zinc-500">{activeTab.formats}</p></div>
          </div>
          <div className="mt-6 space-y-5">
            <div className="space-y-2"><label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Event</label><EventRegistryPicker events={events} value={selectedEventId} onValueChange={setSelectedEventId} loading={loadingEvents} disabled={uploading} placeholder="Select event" /></div>
            <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50/80 p-5">
              <input ref={fileInputRef} type="file" accept={activeTab.accept} className="sr-only" onChange={(event) => handleFileChange(event.target.files?.[0] ?? null)} />
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0"><p className="truncate text-sm font-semibold text-zinc-900">{selectedFile?.name || "No file selected"}</p><p className="mt-1 text-xs text-zinc-500">{selectedFile ? formatBytes(selectedFile.size) : `Choose the ${activeTab.singular} that should become latest.`}</p></div>
                <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="h-9 shrink-0 border-zinc-300 bg-white px-3 text-xs font-semibold text-zinc-700">Select file</Button>
              </div>
            </div>
            <Button type="button" onClick={() => void handleUpload()} disabled={uploading || !selectedEventId || !selectedFile} className="h-11 w-full bg-blue-600 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">{uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}Upload latest version</Button>
          </div>
        </Card>

        <Card className="admin-card p-5">
          <div className="flex items-start justify-between gap-4"><div className="min-w-0"><p className="text-xs font-bold uppercase tracking-wider text-zinc-500">Selected event</p><h2 className="mt-1 truncate text-lg font-semibold text-zinc-900">{selectedEvent?.eventName || "Select an event"}</h2><p className="mt-1 text-sm text-zinc-500">{selectedEvent ? `${selectedEvent.location || "No location"} · ${selectedEvent.date || "No date"}` : "Choose an event to review documents."}</p></div><span className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-300 bg-zinc-50 text-zinc-700"><CalendarDays className="h-5 w-5" /></span></div>
          <div className="mt-7 border-t border-zinc-100 pt-5">
            {loadingDocuments ? <div className="flex h-36 items-center justify-center text-sm text-zinc-500"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Loading document history</div> : documentError ? <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">{documentError}</div> : latestDocument ? (
              <div className="space-y-4"><div className="flex items-start gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl border border-red-100 bg-red-50 text-red-600"><DocumentIcon className="h-5 w-5" /></span><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><h3 className="truncate text-base font-semibold text-zinc-900">{latestDocument.name}</h3><span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-700">Latest</span></div><p className="mt-1 text-sm text-zinc-500">{formatBytes(latestDocument.sizeBytes)} · uploaded by {latestDocument.uploadedByUsername || "admin"}</p><p className="mt-1 text-xs text-zinc-400">{formatDateTime(latestDocument.createdAt)}</p></div></div>
                <div className="flex flex-wrap gap-2"><Button type="button" variant="outline" onClick={() => void handleDownload(latestDocument)} disabled={Boolean(downloadingId || deletingId)} className="h-10 border-zinc-300 bg-white px-4 text-zinc-700">{downloadingId === latestDocument.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}Download latest</Button><Button type="button" variant="outline" onClick={() => setDeleteTarget(latestDocument)} disabled={Boolean(downloadingId || deletingId)} className="h-10 border-red-200 bg-white px-4 text-red-600"><Trash2 className="mr-2 h-4 w-4" />Delete</Button></div></div>
            ) : <div className="flex h-36 flex-col items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-zinc-50/80 text-center"><DocumentIcon className="h-8 w-8 text-zinc-300" /><p className="mt-3 text-sm font-semibold text-zinc-700">{selectedEvent ? `No ${activeTab.singular} uploaded` : "No event selected"}</p><p className="mt-1 text-xs text-zinc-500">Upload the first version to begin its history.</p></div>}
          </div>
        </Card>

        <Card className="admin-card p-5 xl:col-span-2">
          <div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-wider text-zinc-500">History tree</p><h2 className="mt-1 text-lg font-semibold text-zinc-900">Uploaded {activeTab.singular} versions</h2></div><div className="inline-flex items-center gap-2 text-sm text-zinc-500"><History className="h-4 w-4" />{documents.length} version{documents.length === 1 ? "" : "s"}</div></div>
          <div className="mt-6">
            {documents.length ? <div className="admin-list-panel space-y-0 pr-1">{documents.map((document, index) => <div key={document.id} className="relative border-l border-zinc-200 pb-6 pl-6 last:pb-1"><span className="absolute -left-[7px] top-1.5 h-3.5 w-3.5 rounded-full border border-zinc-300 bg-white" /><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0"><div className="flex items-center gap-2"><h3 className="truncate text-sm font-semibold text-zinc-900">{document.name}</h3>{index === 0 ? <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-700">Latest</span> : null}</div><p className="mt-1 text-sm text-zinc-500">{formatBytes(document.sizeBytes)} · {document.uploadedByUsername || "admin"} · {formatDateTime(document.createdAt)}</p><p className="mt-1 text-xs text-zinc-400">Document ID: {document.id}</p></div><div className="flex gap-2"><Button type="button" variant="outline" onClick={() => void handleDownload(document)} disabled={Boolean(downloadingId || deletingId)} className="h-9 border-zinc-300 bg-white px-3 text-xs text-zinc-700"><Download className="mr-1.5 h-3.5 w-3.5" />Download</Button><Button type="button" variant="outline" onClick={() => setDeleteTarget(document)} disabled={Boolean(downloadingId || deletingId)} className="h-9 border-red-200 bg-white px-3 text-xs text-red-600"><Trash2 className="mr-1.5 h-3.5 w-3.5" />Delete</Button></div></div></div>)}</div> : !loadingDocuments ? <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50/80 p-8 text-center"><ShieldCheck className="mx-auto h-8 w-8 text-zinc-300" /><p className="mt-3 text-sm font-semibold text-zinc-700">No upload history</p><p className="mt-1 text-xs text-zinc-500">Each upload appears here as a separate version.</p></div> : null}
          </div>
        </Card>
      </div>

      {deleteTarget ? <div className="fixed inset-0 z-[80] flex items-center justify-center bg-blue-950/35 px-4"><div role="dialog" aria-modal="true" aria-labelledby="document-delete-title" className="admin-modal-panel w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-5"><div className="flex items-start gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl border border-red-100 bg-red-50 text-red-600"><Trash2 className="h-5 w-5" /></span><div><p className="text-xs font-bold uppercase text-red-600">Delete event document</p><h2 id="document-delete-title" className="mt-1 text-lg font-semibold text-zinc-900">Remove this version?</h2><p className="mt-2 text-sm leading-6 text-zinc-500">{deleteTarget.name} can no longer be downloaded after deletion.</p></div></div><div className="mt-6 flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setDeleteTarget(null)} disabled={Boolean(deletingId)}>Cancel</Button><Button type="button" onClick={() => void confirmDelete()} disabled={Boolean(deletingId)} className="bg-red-600 text-white hover:bg-red-700">{deletingId ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}Delete version</Button></div></div></div> : null}
    </div>
  );
}
