"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, CheckCircle2, Loader2, PauseCircle, Pencil, PlayCircle, RefreshCw, RotateCw, Trash2, Webhook } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  createDepartmentMailWebhook,
  deleteDepartmentMailWebhook,
  listDepartmentMailWebhooks,
  updateDepartmentMailWebhook,
  type DepartmentMailWebhook,
  type DepartmentMailWebhookDepartmentSummary,
  type OutreachDepartment,
} from "@/lib/apiRouter";

const DEFAULT_DEPARTMENTS: DepartmentMailWebhookDepartmentSummary[] = [
  { value: "sales", label: "Sales", webhookCount: 0, activeWebhookCount: 0, suggestedWebhookName: "Sales Mail Webhook 1" },
  { value: "delegate", label: "Delegate", webhookCount: 0, activeWebhookCount: 0, suggestedWebhookName: "Delegate Mail Webhook 1" },
  { value: "production", label: "Production", webhookCount: 0, activeWebhookCount: 0, suggestedWebhookName: "Production Mail Webhook 1" },
];

function formatDateTime(value?: string | null) {
  if (!value) return "Never";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
}

function getErrorMessage(error: unknown): string {
  if (typeof error === "string") return error;
  if (error && typeof error === "object") {
    const err = error as { response?: { data?: { detail?: string } | string }; message?: string };
    if (typeof err.response?.data === "string") return err.response.data;
    if (typeof err.response?.data === "object" && err.response?.data?.detail) return err.response.data.detail;
    if (typeof err.message === "string" && err.message.trim()) return err.message;
  }
  return "Please try again.";
}

function validateMakeWebhookUrl(value: string) {
  try {
    const parsed = new URL(value.trim());
    const hostname = parsed.hostname.toLowerCase();
    const supportedHost = hostname === "hook.make.com" || (hostname.startsWith("hook.") && hostname.endsWith(".make.com"));
    return parsed.protocol === "https:" && supportedHost && parsed.pathname !== "/";
  } catch {
    return false;
  }
}

function DeleteWebhookDialog({ target, busy, onClose, onConfirm }: {
  target: DepartmentMailWebhook | null;
  busy: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  if (!target) return null;
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <button type="button" aria-label="Close confirmation" className="absolute inset-0 bg-blue-950/35 backdrop-blur-[2px]" onClick={onClose} />
      <div role="dialog" aria-modal="true" aria-labelledby="delete-mail-webhook-title" className="admin-modal-panel relative z-[1] w-full max-w-md rounded-2xl border border-zinc-300 bg-white p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-red-100 bg-red-50 text-red-600"><Trash2 className="h-5 w-5" /></div>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wider text-red-600">Delete mail webhook</p>
            <h2 id="delete-mail-webhook-title" className="mt-2 text-xl font-semibold text-slate-900">Remove this webhook?</h2>
            <p className="mt-3 break-words text-sm leading-relaxed text-zinc-600">
              {target.name} will stop receiving {target.departmentLabel.toLowerCase()} mail requests. The record remains available in the backend audit history.
            </p>
          </div>
        </div>
        <div className="mt-6 flex items-center justify-end gap-2">
          <Button type="button" variant="outline" disabled={busy} onClick={onClose} className="h-10 border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50">Cancel</Button>
          <Button type="button" disabled={busy} onClick={onConfirm} className="h-10 bg-red-600 px-4 text-white hover:bg-red-700 disabled:opacity-60">
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
            Delete webhook
          </Button>
        </div>
      </div>
    </div>
  );
}

function RenameWebhookDialog({
  target,
  value,
  busy,
  onValueChange,
  onClose,
  onConfirm,
}: {
  target: DepartmentMailWebhook | null;
  value: string;
  busy: boolean;
  onValueChange: (value: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}) {
  if (!target) return null;
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <button type="button" aria-label="Close rename dialog" className="absolute inset-0 bg-blue-950/35 backdrop-blur-[2px]" onClick={onClose} />
      <div role="dialog" aria-modal="true" aria-labelledby="rename-mail-webhook-title" className="admin-modal-panel relative z-[1] w-full max-w-md rounded-2xl border border-zinc-300 bg-white p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-blue-100 bg-blue-50 text-blue-600"><Pencil className="h-5 w-5" /></div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-wider text-blue-600">Rename mail webhook</p>
            <h2 id="rename-mail-webhook-title" className="mt-2 text-xl font-semibold text-slate-900">Update the webhook name</h2>
            <p className="mt-2 text-sm leading-relaxed text-zinc-600">Names are unique across all departments and remain reserved for audit history.</p>
          </div>
        </div>
        <div className="mt-5 space-y-1">
          <label className="block text-sm font-medium text-slate-700" htmlFor="rename-mail-webhook-name">Webhook name</label>
          <Input id="rename-mail-webhook-name" value={value} onChange={(event) => onValueChange(event.target.value)} maxLength={120} disabled={busy} autoFocus />
        </div>
        <div className="mt-6 flex items-center justify-end gap-2">
          <Button type="button" variant="outline" disabled={busy} onClick={onClose} className="h-10 border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50">Cancel</Button>
          <Button type="button" disabled={busy || value.trim().length < 3 || value.trim() === target.name} onClick={onConfirm} className="h-10 bg-blue-600 px-4 text-white hover:bg-blue-700 disabled:opacity-60">
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Pencil className="mr-2 h-4 w-4" />}
            Save name
          </Button>
        </div>
      </div>
    </div>
  );
}

export function OutreachMailWebhookSettings({ onBack }: { onBack: () => void }) {
  const [departments, setDepartments] = useState(DEFAULT_DEPARTMENTS);
  const [webhooks, setWebhooks] = useState<DepartmentMailWebhook[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState<OutreachDepartment>("sales");
  const [webhookName, setWebhookName] = useState(DEFAULT_DEPARTMENTS[0].suggestedWebhookName);
  const [nameCustomized, setNameCustomized] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [newWebhookActive, setNewWebhookActive] = useState(true);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [busyWebhookId, setBusyWebhookId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DepartmentMailWebhook | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [renameTarget, setRenameTarget] = useState<DepartmentMailWebhook | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [renaming, setRenaming] = useState(false);

  const loadConfiguration = useCallback(async () => {
    setLoading(true);
    try {
      const response = await listDepartmentMailWebhooks();
      setDepartments(Array.isArray(response.departments) && response.departments.length > 0 ? response.departments : DEFAULT_DEPARTMENTS);
      setWebhooks(Array.isArray(response.items) ? response.items : []);
    } catch (error: unknown) {
      toast.error("Failed to load mail webhooks", { description: getErrorMessage(error) });
      setDepartments(DEFAULT_DEPARTMENTS);
      setWebhooks([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadConfiguration();
  }, [loadConfiguration]);

  const selectedSummary = useMemo(
    () => departments.find((department) => department.value === selectedDepartment) ?? DEFAULT_DEPARTMENTS.find((department) => department.value === selectedDepartment)!,
    [departments, selectedDepartment]
  );
  const selectedWebhooks = useMemo(
    () => webhooks.filter((webhook) => webhook.department === selectedDepartment && !webhook.deletedAt),
    [selectedDepartment, webhooks]
  );

  useEffect(() => {
    if (!nameCustomized) setWebhookName(selectedSummary.suggestedWebhookName);
  }, [nameCustomized, selectedSummary.suggestedWebhookName]);

  const selectDepartment = (department: OutreachDepartment) => {
    setSelectedDepartment(department);
    setNameCustomized(false);
  };

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedName = webhookName.trim();
    const normalizedUrl = webhookUrl.trim();
    if (normalizedName.length < 3) {
      toast.error("Enter a webhook name", { description: "Webhook names must contain at least 3 characters." });
      return;
    }
    if (!validateMakeWebhookUrl(normalizedUrl)) {
      toast.error("Enter a valid Make.com webhook URL", { description: "Use an HTTPS hook.make.com URL that includes the webhook token path." });
      return;
    }
    try {
      setCreating(true);
      await createDepartmentMailWebhook({ department: selectedDepartment, name: normalizedName, webhookUrl: normalizedUrl, isActive: newWebhookActive });
      setWebhookUrl("");
      setNameCustomized(false);
      setNewWebhookActive(true);
      toast.success("Mail webhook added", { description: `${selectedSummary.label} mail can now use this webhook.` });
      await loadConfiguration();
    } catch (error: unknown) {
      toast.error("Failed to add mail webhook", { description: getErrorMessage(error) });
    } finally {
      setCreating(false);
    }
  };

  const handleStatusChange = async (webhook: DepartmentMailWebhook) => {
    try {
      setBusyWebhookId(webhook.id);
      await updateDepartmentMailWebhook(webhook.id, { isActive: !webhook.isActive });
      toast.success(webhook.isActive ? "Mail webhook deactivated" : "Mail webhook activated", { description: `${webhook.departmentLabel} mail routing has been updated.` });
      await loadConfiguration();
    } catch (error: unknown) {
      toast.error("Failed to update mail webhook", { description: getErrorMessage(error) });
    } finally {
      setBusyWebhookId(null);
    }
  };

  const openRenameDialog = (webhook: DepartmentMailWebhook) => {
    setRenameTarget(webhook);
    setRenameValue(webhook.name);
  };

  const confirmRename = async () => {
    if (!renameTarget) return;
    const normalizedName = renameValue.trim();
    if (normalizedName.length < 3) {
      toast.error("Enter a webhook name", { description: "Webhook names must contain at least 3 characters." });
      return;
    }
    try {
      setRenaming(true);
      await updateDepartmentMailWebhook(renameTarget.id, { name: normalizedName });
      toast.success("Mail webhook renamed", { description: `${normalizedName} is ready to manage.` });
      setRenameTarget(null);
      setRenameValue("");
      await loadConfiguration();
    } catch (error: unknown) {
      toast.error("Failed to rename mail webhook", { description: getErrorMessage(error) });
    } finally {
      setRenaming(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await deleteDepartmentMailWebhook(deleteTarget.id);
      toast.success("Mail webhook deleted", { description: `${deleteTarget.departmentLabel} mail routing has been updated.` });
      setDeleteTarget(null);
      await loadConfiguration();
    } catch (error: unknown) {
      toast.error("Failed to delete mail webhook", { description: getErrorMessage(error) });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
      <Card className="p-6">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <div>
            <Button type="button" variant="ghost" onClick={onBack} className="mb-4 -ml-3 h-9 text-slate-600 hover:bg-slate-100 hover:text-slate-900">
              <ArrowLeft className="mr-2 h-4 w-4" />All settings
            </Button>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100"><Webhook className="h-5 w-5 text-blue-600" /></div>
              <div>
                <p className="mb-1 text-xs font-medium text-slate-400">Settings / Outreach Configuration / Mail webhook</p>
                <h2 className="font-semibold text-slate-900">Mail webhook</h2>
                <p className="text-sm text-slate-500">Manage Make.com mail delivery webhooks by department</p>
              </div>
            </div>
          </div>
          <Button type="button" variant="outline" onClick={() => void loadConfiguration()} disabled={loading || creating || deleting || renaming || Boolean(busyWebhookId)} className="border-slate-300 text-slate-700">
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />Refresh
          </Button>
        </div>

        <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50/70 p-4 text-sm text-blue-900">
          <div className="flex items-start gap-3"><RotateCw className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" /><p className="leading-6">If a department has multiple active webhooks, email requests rotate through them sequentially. The same webhook may be used in different departments, but cannot be registered twice in one department.</p></div>
        </div>

        <div className="grid gap-3 md:grid-cols-3" role="tablist" aria-label="Mail webhook departments">
          {departments.map((department) => {
            const selected = department.value === selectedDepartment;
            return (
              <button key={department.value} type="button" role="tab" aria-selected={selected} onClick={() => selectDepartment(department.value)} className={`rounded-lg border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${selected ? "border-blue-300 bg-blue-50 text-blue-950" : "border-slate-300 bg-white text-slate-700 hover:border-blue-200 hover:bg-slate-50"}`}>
                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold">{department.label}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${department.activeWebhookCount > 0 ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{department.activeWebhookCount} active</span>
                </div>
                <p className="mt-2 text-xs text-slate-500">{department.webhookCount} {department.webhookCount === 1 ? "webhook" : "webhooks"} configured</p>
              </button>
            );
          })}
        </div>

        <div className="mt-6 rounded-lg border border-slate-300 bg-slate-50/60 p-4">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div><h3 className="font-semibold text-slate-900">Add {selectedSummary.label} webhook</h3><p className="text-sm text-slate-500">Enter the full URL once. Saved webhooks are masked after creation.</p></div>
            {selectedSummary.activeWebhookCount > 1 ? <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-700"><RotateCw className="h-3.5 w-3.5" />Sequential rotation enabled</span> : null}
          </div>
          <form className="grid gap-3 lg:grid-cols-[minmax(220px,0.65fr)_minmax(360px,1.35fr)_auto_auto] lg:items-end" onSubmit={handleCreate}>
            <div className="space-y-1">
              <label className="block text-sm font-medium text-slate-700" htmlFor="mail-webhook-name">Webhook name</label>
              <Input id="mail-webhook-name" value={webhookName} onChange={(event) => { setWebhookName(event.target.value); setNameCustomized(true); }} maxLength={120} placeholder="Sales Mail Webhook 1" autoComplete="off" disabled={creating} required />
              <p className="text-xs text-slate-500">Unique suggestion — edit it if you prefer another name.</p>
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-medium text-slate-700" htmlFor="mail-webhook-url">Make.com webhook URL</label>
              <Input id="mail-webhook-url" type="url" value={webhookUrl} onChange={(event) => setWebhookUrl(event.target.value)} placeholder="https://hook.make.com/..." autoComplete="off" disabled={creating} required />
              <p className="text-xs text-slate-500">Stored securely and masked after saving.</p>
            </div>
            <label className="flex h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700">
              <input type="checkbox" checked={newWebhookActive} onChange={(event) => setNewWebhookActive(event.target.checked)} disabled={creating} className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900" />Active now
            </label>
            <Button type="submit" disabled={creating || webhookName.trim().length < 3 || !webhookUrl.trim()} className="h-10">{creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Webhook className="mr-2 h-4 w-4" />}Add webhook</Button>
          </form>
        </div>

        <div className="mt-6 overflow-x-auto rounded-lg border border-slate-300">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-100/80 text-xs uppercase tracking-wide text-slate-600"><tr><th className="px-3 py-2">Webhook</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Selections</th><th className="px-3 py-2">Last selected</th><th className="px-3 py-2 text-right">Actions</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {selectedWebhooks.length === 0 ? (
                <tr><td colSpan={5} className="px-3 py-8 text-center text-slate-500">{loading ? `Loading ${selectedSummary.label.toLowerCase()} webhooks...` : `No ${selectedSummary.label.toLowerCase()} mail webhooks configured.`}</td></tr>
              ) : selectedWebhooks.map((webhook) => {
                const busy = busyWebhookId === webhook.id;
                return (
                  <tr key={webhook.id} className="bg-white">
                    <td className="px-3 py-3">
                      <p className="font-medium text-slate-900">{webhook.name}</p>
                      <p className="mt-1 font-mono text-xs text-slate-600">{webhook.webhookUrlMasked}</p>
                      <p className="mt-1 text-xs text-slate-400">Added {formatDateTime(webhook.createdAt)}</p>
                    </td>
                    <td className="px-3 py-3"><span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${webhook.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{webhook.isActive ? <CheckCircle2 className="h-3.5 w-3.5" /> : <PauseCircle className="h-3.5 w-3.5" />}{webhook.isActive ? "Active" : "Inactive"}</span></td>
                    <td className="px-3 py-3 text-slate-600">{webhook.selectionCount}</td>
                    <td className="px-3 py-3 text-slate-500">{formatDateTime(webhook.lastSelectedAt)}</td>
                    <td className="px-3 py-3"><div className="flex items-center justify-end gap-2">
                      <Button type="button" variant="outline" disabled={busy || deleting || renaming} onClick={() => openRenameDialog(webhook)} aria-label={`Rename ${webhook.name}`} className="h-9 border-slate-300 px-3 text-slate-700"><Pencil className="h-4 w-4" /></Button>
                      <Button type="button" variant="outline" disabled={busy || deleting || renaming} onClick={() => void handleStatusChange(webhook)} className="h-9 border-slate-300 text-slate-700">
                        {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : webhook.isActive ? <PauseCircle className="mr-2 h-4 w-4" /> : <PlayCircle className="mr-2 h-4 w-4" />}{webhook.isActive ? "Deactivate" : "Activate"}
                      </Button>
                      <Button type="button" variant="outline" disabled={busy || deleting || renaming} onClick={() => setDeleteTarget(webhook)} aria-label={`Delete ${webhook.name}`} className="h-9 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"><Trash2 className="h-4 w-4" /></Button>
                    </div></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
      <DeleteWebhookDialog target={deleteTarget} busy={deleting} onClose={() => { if (!deleting) setDeleteTarget(null); }} onConfirm={() => void confirmDelete()} />
      <RenameWebhookDialog target={renameTarget} value={renameValue} busy={renaming} onValueChange={setRenameValue} onClose={() => { if (!renaming) { setRenameTarget(null); setRenameValue(""); } }} onConfirm={() => void confirmRename()} />
    </motion.div>
  );
}
