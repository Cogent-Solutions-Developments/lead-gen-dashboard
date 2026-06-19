"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Archive,
  Download,
  HardDrive,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  deleteAdminStorageObject,
  downloadAdminStorageObjectFile,
  getAdminStorageSummary,
  listAdminStorageObjects,
  type AdminStorageObjectItem,
  type AdminStorageSummary,
} from "@/lib/auth";

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Please try again.";
}

function formatBytes(value?: number | null) {
  const bytes = Number(value || 0);
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  if (bytes >= 1024 * 1024 * 1024) return (bytes / (1024 * 1024 * 1024)).toFixed(1) + " GB";
  if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(bytes >= 10 * 1024 * 1024 ? 0 : 1) + " MB";
  if (bytes >= 1024) return (bytes / 1024).toFixed(bytes >= 10 * 1024 ? 0 : 1) + " KB";
  return bytes + " B";
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
}

function statusClass(status: string) {
  if (status.toLowerCase() === "active") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status.toLowerCase() === "deleted") return "border-red-200 bg-red-50 text-red-700";
  return "border-zinc-200 bg-zinc-100 text-zinc-600";
}

function DeleteStorageDialog({
  target,
  busy,
  onClose,
  onConfirm,
}: {
  target: AdminStorageObjectItem | null;
  busy: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  if (!target) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close confirmation"
        className="absolute inset-0 bg-blue-950/35 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div className="admin-modal-panel relative z-[1] w-full max-w-md rounded-2xl border border-zinc-300 bg-white p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-red-100 bg-red-50 text-red-600">
            <Trash2 className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wider text-red-600">Delete Storage Object</p>
            <h2 className="mt-2 text-xl font-semibold text-slate-900">Remove this file?</h2>
            <p className="mt-3 break-words text-sm leading-relaxed text-zinc-600">
              {target.originalFilename} will be removed from the active storage bucket. Metadata remains for audit history.
            </p>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={onClose}
            className="h-10 border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50"
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className="h-10 bg-red-600 px-4 text-white hover:bg-red-700 disabled:opacity-60"
          >
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
            Delete File
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function AdminStoragePage() {
  const [summary, setSummary] = useState<AdminStorageSummary | null>(null);
  const [objects, setObjects] = useState<AdminStorageObjectItem[]>([]);
  const [status, setStatus] = useState("active");
  const [provider, setProvider] = useState("all");
  const [entityType, setEntityType] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState("");
  const [deletingId, setDeletingId] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<AdminStorageObjectItem | null>(null);

  const entityOptions = useMemo(() => {
    const values = new Set(objects.map((item) => item.entityType).filter(Boolean) as string[]);
    return ["all", ...Array.from(values).sort((a, b) => a.localeCompare(b))];
  }, [objects]);

  const loadStorage = useCallback(async () => {
    setLoading(true);
    try {
      const [nextSummary, list] = await Promise.all([
        getAdminStorageSummary(),
        listAdminStorageObjects({
          status,
          provider: provider === "all" ? undefined : provider,
          entityType: entityType === "all" ? undefined : entityType,
          search: search.trim() || undefined,
          limit: 100,
        }),
      ]);
      setSummary(nextSummary);
      setObjects(list.objects);
    } catch (error: unknown) {
      toast.error("Storage data failed to load", { description: getErrorMessage(error) });
      setObjects([]);
    } finally {
      setLoading(false);
    }
  }, [entityType, provider, search, status]);

  useEffect(() => {
    void loadStorage();
  }, [loadStorage]);

  const handleDownload = async (item: AdminStorageObjectItem) => {
    setDownloadingId(item.id);
    try {
      await downloadAdminStorageObjectFile(item.id, item.originalFilename || "file");
      toast.success("Download started");
    } catch (error: unknown) {
      toast.error("Download failed", { description: getErrorMessage(error) });
    } finally {
      setDownloadingId("");
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeletingId(deleteTarget.id);
    try {
      await deleteAdminStorageObject(deleteTarget.id);
      toast.success("File removed", { description: deleteTarget.originalFilename });
      setDeleteTarget(null);
      await loadStorage();
    } catch (error: unknown) {
      toast.error("Delete failed", { description: getErrorMessage(error) });
    } finally {
      setDeletingId("");
    }
  };

  return (
    <div className="admin-page flex min-h-[calc(100dvh-3rem)] flex-col bg-transparent">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="admin-page-header flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between"
      >
        <div>
          <p className="admin-eyebrow">Admin Control</p>
          <h1 className="admin-title">Storage Control</h1>
          <p className="admin-description">
            Monitor stored files, download objects, and remove obsolete active files.
          </p>
        </div>
        <Button
          type="button"
          onClick={() => void loadStorage()}
          disabled={loading || Boolean(deletingId)}
          className="analytics-frost-btn h-10 px-4"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </motion.div>

      <div className="grid gap-3 md:grid-cols-3">
        {[
          { label: "Active Objects", value: summary?.activeObjects ?? 0, icon: ShieldCheck },
          { label: "Total Objects", value: summary?.totalObjects ?? 0, icon: Archive },
          { label: "Stored Size", value: formatBytes(summary?.totalBytes), icon: HardDrive },
        ].map((item) => (
          <Card key={item.label} className="admin-card-soft p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">{item.label}</p>
                <p className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900">{item.value}</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-300 bg-zinc-50 text-zinc-700">
                <item.icon className="h-5 w-5" />
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Card className="admin-card mt-5 overflow-hidden">
        <div className="grid gap-3 border-b border-zinc-100 p-5 lg:grid-cols-[minmax(0,1fr)_9rem_9rem_11rem_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search files, keys, or entity IDs"
              className="h-10 border-zinc-300 bg-white pl-9"
            />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="h-10 border-zinc-300 bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-zinc-300 bg-white">
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="deleted">Deleted</SelectItem>
              <SelectItem value="all">All</SelectItem>
            </SelectContent>
          </Select>
          <Select value={provider} onValueChange={setProvider}>
            <SelectTrigger className="h-10 border-zinc-300 bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-zinc-300 bg-white">
              <SelectItem value="all">All Stores</SelectItem>
              <SelectItem value="local">Local</SelectItem>
              <SelectItem value="r2">R2</SelectItem>
            </SelectContent>
          </Select>
          <Select value={entityType} onValueChange={setEntityType}>
            <SelectTrigger className="h-10 border-zinc-300 bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-zinc-300 bg-white">
              {entityOptions.map((value) => (
                <SelectItem key={value} value={value}>
                  {value === "all" ? "All Types" : value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setSearch("");
              setStatus("active");
              setProvider("all");
              setEntityType("all");
            }}
            className="h-10 border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50"
          >
            <X className="mr-2 h-4 w-4" />
            Clear
          </Button>
        </div>

        <div className="admin-table-wrap">
          <table className="w-full min-w-[1100px]">
            <thead className="border-b border-zinc-100 bg-zinc-50/70 text-left text-[11px] font-bold uppercase tracking-wider text-zinc-400">
              <tr>
                <th className="px-5 py-3">File</th>
                <th className="px-5 py-3">Provider</th>
                <th className="px-5 py-3">Entity</th>
                <th className="px-5 py-3">Size</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Created</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-sm text-zinc-500">
                    Loading storage objects...
                  </td>
                </tr>
              ) : objects.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-sm text-zinc-500">
                    No storage objects found.
                  </td>
                </tr>
              ) : (
                objects.map((item) => {
                  const deleted = item.status.toLowerCase() === "deleted";
                  return (
                    <tr key={item.id} className="transition-colors hover:bg-zinc-50/80">
                      <td className="px-5 py-4">
                        <div className="max-w-[24rem]">
                          <p className="truncate font-semibold text-zinc-900">{item.originalFilename}</p>
                          <p className="mt-1 truncate text-xs text-zinc-500">{item.objectKey}</p>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm font-medium uppercase text-zinc-700">{item.provider}</td>
                      <td className="px-5 py-4 text-sm text-zinc-600">
                        <div>{item.entityType || "-"}</div>
                        <div className="mt-1 max-w-[14rem] truncate text-xs text-zinc-400">{item.entityId || ""}</div>
                      </td>
                      <td className="px-5 py-4 text-sm text-zinc-700">{formatBytes(item.sizeBytes)}</td>
                      <td className="px-5 py-4">
                        <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusClass(item.status)}`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-sm text-zinc-600">{formatDateTime(item.createdAt)}</td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            disabled={deleted || downloadingId === item.id || deletingId === item.id}
                            onClick={() => void handleDownload(item)}
                            className="h-8 border-zinc-300 bg-white px-3 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                          >
                            {downloadingId === item.id ? (
                              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Download className="mr-1.5 h-3.5 w-3.5" />
                            )}
                            Download
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            disabled={deleted || downloadingId === item.id || deletingId === item.id}
                            onClick={() => setDeleteTarget(item)}
                            className="h-8 border-red-200 bg-white px-3 text-xs font-semibold text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                            Delete
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
      </Card>

      <DeleteStorageDialog
        target={deleteTarget}
        busy={Boolean(deletingId)}
        onClose={() => {
          if (!deletingId) setDeleteTarget(null);
        }}
        onConfirm={() => void confirmDelete()}
      />
    </div>
  );
}
