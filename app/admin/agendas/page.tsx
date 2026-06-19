"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  CalendarDays,
  Download,
  FileText,
  Trash2,
  History,
  Loader2,
  RefreshCw,
  ShieldCheck,
  UploadCloud,
} from "lucide-react";
import { toast } from "sonner";
import { EventRegistryPicker } from "@/components/events/EventRegistryPicker";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  deleteEventAgenda,
  downloadEventAgendaFile,
  listEventAgendas,
  uploadEventAgenda,
  type EventAgendaItem,
} from "@/lib/api";
import { listAdminEvents, type AdminEventItem } from "@/lib/auth";

const MAX_AGENDA_BYTES = 20 * 1024 * 1024;

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

function validateAgendaFile(file: File) {
  if (!file.name.toLowerCase().endsWith(".pdf")) {
    return "Only PDF agenda files are supported.";
  }
  if (file.type && file.type !== "application/pdf") {
    return "Only PDF agenda files are supported.";
  }
  if (file.size > MAX_AGENDA_BYTES) {
    return "Agenda PDF must be 20MB or smaller.";
  }
  return "";
}

function sortEvents(events: AdminEventItem[]) {
  return [...events].sort((a, b) => a.eventName.localeCompare(b.eventName));
}

export default function AdminAgendasPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [events, setEvents] = useState<AdminEventItem[]>([]);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [loadingAgendas, setLoadingAgendas] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [downloadingId, setDownloadingId] = useState("");
  const [deletingId, setDeletingId] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<EventAgendaItem | null>(null);
  const [agendas, setAgendas] = useState<EventAgendaItem[]>([]);
  const [agendaError, setAgendaError] = useState("");

  const selectedEvent = useMemo(
    () => events.find((event) => event.id === selectedEventId) ?? null,
    [events, selectedEventId]
  );
  const latestAgenda = agendas[0] ?? null;

  const loadEvents = useCallback(async () => {
    setLoadingEvents(true);
    try {
      const rows = sortEvents(await listAdminEvents(true));
      setEvents(rows);
      setSelectedEventId((current) => current || rows.find((event) => event.isActive)?.id || rows[0]?.id || "");
    } catch (error: unknown) {
      toast.error("Failed to load events", { description: getErrorMessage(error) });
      setEvents([]);
    } finally {
      setLoadingEvents(false);
    }
  }, []);

  const loadAgendas = useCallback(async (eventId: string) => {
    if (!eventId) {
      setAgendas([]);
      return;
    }
    setLoadingAgendas(true);
    setAgendaError("");
    try {
      const response = await listEventAgendas({ eventId });
      setAgendas(Array.isArray(response.agendas) ? response.agendas : []);
    } catch (error: unknown) {
      setAgendas([]);
      setAgendaError(getErrorMessage(error));
    } finally {
      setLoadingAgendas(false);
    }
  }, []);

  useEffect(() => {
    void loadEvents();
  }, [loadEvents]);

  useEffect(() => {
    void loadAgendas(selectedEventId);
  }, [loadAgendas, selectedEventId]);

  const handleFileChange = (file: File | null) => {
    if (!file) {
      setSelectedFile(null);
      return;
    }
    const error = validateAgendaFile(file);
    if (error) {
      toast.error("Agenda file rejected", { description: error });
      if (fileInputRef.current) fileInputRef.current.value = "";
      setSelectedFile(null);
      return;
    }
    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedEventId) {
      toast.error("Select an event first");
      return;
    }
    if (!selectedFile) {
      toast.error("Select a PDF agenda first");
      return;
    }
    const error = validateAgendaFile(selectedFile);
    if (error) {
      toast.error("Agenda file rejected", { description: error });
      return;
    }

    setUploading(true);
    try {
      const response = await uploadEventAgenda(selectedEventId, selectedFile);
      toast.success("Agenda uploaded", {
        description: response.agenda.name + " is now the latest agenda.",
      });
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      await loadAgendas(selectedEventId);
    } catch (uploadError: unknown) {
      toast.error("Agenda upload failed", { description: getErrorMessage(uploadError) });
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (agenda: EventAgendaItem) => {
    setDownloadingId(agenda.id);
    try {
      await downloadEventAgendaFile(agenda.id, agenda.name || "agenda.pdf");
      toast.success("Agenda download started");
    } catch (downloadError: unknown) {
      toast.error("Agenda download failed", { description: getErrorMessage(downloadError) });
    } finally {
      setDownloadingId("");
    }
  };

  const openDeleteDialog = (agenda: EventAgendaItem) => {
    setDeleteTarget(agenda);
  };

  const closeDeleteDialog = () => {
    if (deletingId) return;
    setDeleteTarget(null);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;

    setDeletingId(deleteTarget.id);
    try {
      await deleteEventAgenda(deleteTarget.id);
      toast.success("Agenda deleted", {
        description: (deleteTarget.name || "Agenda") + " was removed from this event.",
      });
      setDeleteTarget(null);
      if (selectedEventId) await loadAgendas(selectedEventId);
    } catch (deleteError: unknown) {
      toast.error("Agenda delete failed", { description: getErrorMessage(deleteError) });
    } finally {
      setDeletingId("");
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
          <h1 className="admin-title">Agenda Library</h1>
          <p className="admin-description">
            Upload event-scoped agenda PDFs and keep every previous version available for review.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => selectedEventId && void loadAgendas(selectedEventId)}
          disabled={loadingEvents || loadingAgendas}
          className="h-10 border-zinc-300 bg-white px-4 text-zinc-700 hover:bg-zinc-50"
        >
          {loadingAgendas ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Refresh
        </Button>
      </motion.div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <Card className="admin-card p-5">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-zinc-300 bg-zinc-50 text-zinc-700">
              <UploadCloud className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">Admin upload</p>
              <h2 className="mt-1 text-lg font-semibold tracking-tight text-zinc-900">Latest agenda PDF</h2>
              <p className="mt-1 text-sm leading-relaxed text-zinc-500">PDF only, maximum 20MB.</p>
            </div>
          </div>

          <div className="mt-6 space-y-5">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Event</label>
              <EventRegistryPicker
                events={events}
                value={selectedEventId}
                onValueChange={setSelectedEventId}
                loading={loadingEvents}
                disabled={uploading}
                placeholder="Select event"
              />
            </div>

            <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50/80 p-5">
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf,.pdf"
                className="sr-only"
                onChange={(event) => handleFileChange(event.target.files?.[0] ?? null)}
              />
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-zinc-900">
                    {selectedFile ? selectedFile.name : "No PDF selected"}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {selectedFile ? formatBytes(selectedFile.size) : "Choose the agenda that should become latest."}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="h-9 shrink-0 border-zinc-300 bg-white px-3 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                >
                  Select PDF
                </Button>
              </div>
            </div>

            <Button
              type="button"
              onClick={() => void handleUpload()}
              disabled={uploading || !selectedEventId || !selectedFile}
              className="h-11 w-full rounded-md bg-blue-600 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
              Upload Latest Agenda
            </Button>
          </div>
        </Card>

        <Card className="admin-card p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">Selected event</p>
              <h2 className="mt-1 truncate text-lg font-semibold tracking-tight text-zinc-900">
                {selectedEvent?.eventName || "Select an event"}
              </h2>
              <p className="mt-1 text-sm text-zinc-500">
                {selectedEvent?.location || "No location"} · {selectedEvent?.date || "No date"}
              </p>
            </div>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-zinc-300 bg-zinc-50 text-zinc-700">
              <CalendarDays className="h-5 w-5" />
            </span>
          </div>

          <div className="mt-7 border-t border-zinc-100 pt-5">
            {loadingAgendas ? (
              <div className="flex h-36 items-center justify-center text-sm text-zinc-500">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading agenda history
              </div>
            ) : agendaError ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-relaxed text-amber-800">
                {agendaError}
              </div>
            ) : latestAgenda ? (
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-red-100 bg-red-50 text-red-600">
                    <FileText className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="truncate text-base font-semibold text-zinc-900">{latestAgenda.name}</h3>
                      <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                        Latest
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-zinc-500">
                      {formatBytes(latestAgenda.sizeBytes)} · uploaded by {latestAgenda.uploadedByUsername || "admin"}
                    </p>
                    <p className="mt-1 text-xs text-zinc-400">{formatDateTime(latestAgenda.createdAt)}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void handleDownload(latestAgenda)}
                    disabled={downloadingId === latestAgenda.id || deletingId === latestAgenda.id}
                    className="h-10 border-zinc-300 bg-white px-4 text-zinc-700 hover:bg-zinc-50"
                  >
                    {downloadingId === latestAgenda.id ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="mr-2 h-4 w-4" />
                    )}
                    Download Latest
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => openDeleteDialog(latestAgenda)}
                    disabled={deletingId === latestAgenda.id || downloadingId === latestAgenda.id}
                    className="h-10 border-red-200 bg-white px-4 text-red-600 hover:border-red-300 hover:bg-red-50 hover:text-red-700"
                  >
                    {deletingId === latestAgenda.id ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="mr-2 h-4 w-4" />
                    )}
                    Delete
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex h-36 flex-col items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-zinc-50/80 text-center">
                <FileText className="h-8 w-8 text-zinc-300" />
                <p className="mt-3 text-sm font-semibold text-zinc-700">No agenda uploaded</p>
                <p className="mt-1 text-xs text-zinc-500">Upload the first PDF for this event.</p>
              </div>
            )}
          </div>
        </Card>

        <Card className="admin-card p-5 xl:col-span-2">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">History tree</p>
              <h2 className="mt-1 text-lg font-semibold tracking-tight text-zinc-900">Uploaded agenda versions</h2>
            </div>
            <div className="inline-flex items-center gap-2 text-sm text-zinc-500">
              <History className="h-4 w-4" />
              {agendas.length} version{agendas.length === 1 ? "" : "s"}
            </div>
          </div>

          <div className="mt-6">
            {loadingAgendas ? (
              <div className="flex h-32 items-center justify-center text-sm text-zinc-500">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading history
              </div>
            ) : agendas.length > 0 ? (
              <div className="admin-list-panel space-y-0 pr-1">
                {agendas.map((agenda, index) => (
                  <div key={agenda.id} className="relative border-l border-zinc-200 pb-6 pl-6 last:pb-1">
                    <span className="absolute -left-[7px] top-1.5 h-3.5 w-3.5 rounded-full border border-zinc-300 bg-white" />
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="truncate text-sm font-semibold text-zinc-900">{agenda.name}</h3>
                          {index === 0 ? (
                            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                              Latest
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-1 text-sm text-zinc-500">
                          {formatBytes(agenda.sizeBytes)} · {agenda.uploadedByUsername || "admin"} · {formatDateTime(agenda.createdAt)}
                        </p>
                        <p className="mt-1 text-xs text-zinc-400">Document ID: {agenda.id}</p>
                      </div>
                      <div className="flex shrink-0 flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => void handleDownload(agenda)}
                          disabled={downloadingId === agenda.id || deletingId === agenda.id}
                          className="h-9 border-zinc-300 bg-white px-3 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                        >
                          {downloadingId === agenda.id ? (
                            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Download className="mr-1.5 h-3.5 w-3.5" />
                          )}
                          Download
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => openDeleteDialog(agenda)}
                          disabled={deletingId === agenda.id || downloadingId === agenda.id}
                          className="h-9 border-red-200 bg-white px-3 text-xs font-semibold text-red-600 hover:border-red-300 hover:bg-red-50 hover:text-red-700"
                        >
                          {deletingId === agenda.id ? (
                            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                          )}
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50/80 p-8 text-center">
                <ShieldCheck className="mx-auto h-8 w-8 text-zinc-300" />
                <p className="mt-3 text-sm font-semibold text-zinc-700">No upload history for this event</p>
                <p className="mt-1 text-xs text-zinc-500">Every new PDF will appear here as a separate version.</p>
              </div>
            )}
          </div>
        </Card>
      </div>

      {deleteTarget ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-blue-950/35 px-4 py-6">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="agenda-delete-title"
            className="admin-modal-panel w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-5 shadow-[0_28px_80px_-30px_rgba(2,10,27,0.6)]"
          >
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-red-100 bg-red-50 text-red-600">
                <Trash2 className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold uppercase tracking-wider text-red-600">Delete agenda PDF</p>
                <h2 id="agenda-delete-title" className="mt-1 text-lg font-semibold tracking-tight text-slate-900">
                  Remove this document?
                </h2>
                <p className="mt-2 break-words text-sm leading-6 text-zinc-500">
                  {deleteTarget.name || "This agenda"} will be removed from the selected event and can no longer be downloaded.
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={closeDeleteDialog}
                disabled={Boolean(deletingId)}
                className="h-10 border-zinc-300 bg-white px-4 text-zinc-700 hover:bg-zinc-50"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => void confirmDelete()}
                disabled={deletingId === deleteTarget.id}
                className="h-10 bg-red-600 px-4 text-white hover:bg-red-700 disabled:opacity-60"
              >
                {deletingId === deleteTarget.id ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="mr-2 h-4 w-4" />
                )}
                Delete PDF
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
