"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Archive,
  FileText,
  Loader2,
  PencilLine,
  Plus,
  RefreshCw,
  Save,
  ShieldCheck,
  Upload,
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
import { Textarea } from "@/components/ui/textarea";
import {
  archiveAdminContentPrompt,
  createAdminContentPrompt,
  listAdminContentPrompts,
  updateAdminContentPrompt,
  uploadAdminContentPrompt,
  type AdminContentPromptItem,
} from "@/lib/auth";

type PromptStatusValue = "active" | "inactive";

const PROMPT_FILE_EXTENSIONS = [".txt", ".md"];
const PROMPT_FILE_MAX_BYTES = 64 * 1024;

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Please try again.";
}

function promptStatusValue(isActive: boolean): PromptStatusValue {
  return isActive ? "active" : "inactive";
}

function validatePromptFile(file: File) {
  const lowerName = file.name.toLowerCase();
  if (!PROMPT_FILE_EXTENSIONS.some((ext) => lowerName.endsWith(ext))) return "Use a .txt or .md file.";
  if (file.size > PROMPT_FILE_MAX_BYTES) return "Prompt file must be 64KB or smaller.";
  return "";
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
}

function sortPrompts(rows: AdminContentPromptItem[]) {
  return [...rows].sort((a, b) => {
    if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
    return a.displayName.localeCompare(b.displayName);
  });
}

export default function AdminContentPromptsPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [prompts, setPrompts] = useState<AdminContentPromptItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [promptKey, setPromptKey] = useState("");
  const [description, setDescription] = useState("");
  const [promptText, setPromptText] = useState("");
  const [promptStatus, setPromptStatus] = useState<PromptStatusValue>("active");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [editingPrompt, setEditingPrompt] = useState<AdminContentPromptItem | null>(null);
  const [editDisplayName, setEditDisplayName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPromptText, setEditPromptText] = useState("");
  const [editStatus, setEditStatus] = useState<PromptStatusValue>("active");
  const [editSaving, setEditSaving] = useState(false);
  const [archivingId, setArchivingId] = useState<string | null>(null);

  const isBusy = saving || editSaving || Boolean(archivingId);

  const loadPrompts = async () => {
    setLoading(true);
    try {
      setPrompts(sortPrompts(await listAdminContentPrompts(true)));
    } catch (error: unknown) {
      toast.error("Failed to load content prompts", { description: getErrorMessage(error) });
      setPrompts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadPrompts();
  }, []);

  const stats = useMemo(() => {
    const active = prompts.filter((prompt) => prompt.isActive).length;
    const system = prompts.filter((prompt) => prompt.isSystemDefault).length;
    return { total: prompts.length, active, inactive: prompts.length - active, system };
  }, [prompts]);

  const resetCreateForm = () => {
    setDisplayName("");
    setPromptKey("");
    setDescription("");
    setPromptText("");
    setPromptStatus("active");
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleFileSelect = async (file: File | null) => {
    if (!file) {
      setSelectedFile(null);
      return;
    }
    const error = validatePromptFile(file);
    if (error) {
      toast.error("Prompt file rejected", { description: error });
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    setSelectedFile(file);
    try {
      setPromptText(await file.text());
    } catch (error: unknown) {
      toast.error("Failed to read prompt file", { description: getErrorMessage(error) });
    }
  };

  const handleCreate = async () => {
    const nextName = displayName.trim();
    const nextKey = promptKey.trim();
    const nextDescription = description.trim();
    const nextText = promptText.trim();
    if (!nextName) {
      toast.error("Display name is required");
      return;
    }
    if (!selectedFile && !nextText) {
      toast.error("Prompt text is required");
      return;
    }

    setSaving(true);
    try {
      const created = selectedFile
        ? await uploadAdminContentPrompt(selectedFile, {
            displayName: nextName,
            promptKey: nextKey || undefined,
            description: nextDescription || undefined,
            isActive: promptStatus === "active",
          })
        : await createAdminContentPrompt({
            displayName: nextName,
            promptKey: nextKey || undefined,
            description: nextDescription || undefined,
            promptText: nextText,
            isActive: promptStatus === "active",
          });
      setPrompts((prev) => sortPrompts([...prev, created]));
      toast.success("Content prompt saved", { description: created.displayName });
      resetCreateForm();
    } catch (error: unknown) {
      toast.error("Failed to save content prompt", { description: getErrorMessage(error) });
    } finally {
      setSaving(false);
    }
  };

  const openEditDialog = (prompt: AdminContentPromptItem) => {
    setEditingPrompt(prompt);
    setEditDisplayName(prompt.displayName);
    setEditDescription(prompt.description ?? "");
    setEditPromptText(prompt.promptText);
    setEditStatus(promptStatusValue(prompt.isActive));
  };

  const closeEditDialog = (force = false) => {
    if (editSaving && !force) return;
    setEditingPrompt(null);
  };

  const handleEditSave = async () => {
    if (!editingPrompt) return;
    const nextName = editDisplayName.trim();
    const nextDescription = editDescription.trim();
    const nextText = editPromptText.trim();
    if (!nextName) {
      toast.error("Display name is required");
      return;
    }
    if (!nextText) {
      toast.error("Prompt text is required");
      return;
    }

    setEditSaving(true);
    try {
      const updated = await updateAdminContentPrompt(editingPrompt.id, {
        displayName: nextName,
        description: nextDescription,
        promptText: nextText,
        isActive: editStatus === "active",
      });
      setPrompts((prev) => sortPrompts(prev.map((prompt) => (prompt.id === updated.id ? updated : prompt))));
      toast.success("Content prompt updated", { description: updated.displayName });
      closeEditDialog(true);
    } catch (error: unknown) {
      toast.error("Failed to update content prompt", { description: getErrorMessage(error) });
    } finally {
      setEditSaving(false);
    }
  };

  const handleArchive = async (prompt: AdminContentPromptItem) => {
    setArchivingId(prompt.id);
    try {
      const response = await archiveAdminContentPrompt(prompt.id);
      setPrompts((prev) => sortPrompts(prev.map((item) => (item.id === response.prompt.id ? response.prompt : item))));
      toast.success("Content prompt archived", { description: response.prompt.displayName });
    } catch (error: unknown) {
      toast.error("Failed to archive content prompt", { description: getErrorMessage(error) });
    } finally {
      setArchivingId(null);
    }
  };

  return (
    <div className="flex min-h-[calc(100dvh-3rem)] w-full min-w-0 flex-col overflow-y-auto bg-transparent p-1 font-sans">
      <div className="mb-5 flex flex-col gap-4 min-[1180px]:flex-row min-[1180px]:items-end min-[1180px]:justify-between">
        <div className="min-w-0">
          <h1 className="text-3xl font-light leading-[1.12] tracking-[-0.025em] text-zinc-950 sm:text-4xl 2xl:text-5xl">Content Prompts</h1>
          <p className="mt-4 max-w-xl text-lg font-light leading-relaxed text-zinc-500">
            Manage event-category prompt templates used by lead email and WhatsApp generation.
          </p>
        </div>

        <Button
          type="button"
          onClick={() => void loadPrompts()}
          disabled={loading || isBusy}
          className="analytics-frost-btn h-10 w-fit px-4"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="grid min-w-0 gap-5 2xl:grid-cols-[minmax(0,1fr)_27rem]">
        <div className="min-w-0 space-y-5">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: "Total Prompts", value: stats.total, icon: FileText },
              { label: "Active", value: stats.active, icon: ShieldCheck },
              { label: "Inactive", value: stats.inactive, icon: Archive },
              { label: "Seeded", value: stats.system, icon: Save },
            ].map((item) => (
              <Card key={item.label} className="rounded-2xl border border-zinc-300 bg-white/86 p-4">
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

          <Card className="overflow-hidden rounded-2xl border border-zinc-300/85 bg-white/82">
            <div className="flex flex-col gap-3 border-b border-zinc-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-semibold text-zinc-900">Prompt Library</h2>
                <p className="text-sm text-zinc-500">Active prompts can be mapped to events from the Event Registry.</p>
              </div>
            </div>

            <div className="hidden border-b border-zinc-100 bg-zinc-50/70 px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-zinc-400 lg:grid lg:grid-cols-[minmax(0,1.6fr)_8rem_minmax(0,2.4fr)_8rem_8rem] lg:gap-4">
              <div>Prompt</div>
              <div>Status</div>
              <div>Preview</div>
              <div>Updated</div>
              <div className="text-right">Action</div>
            </div>

            <div className="divide-y divide-zinc-100">
              {loading ? (
                <div className="px-5 py-10 text-center text-sm text-zinc-500">Loading prompts...</div>
              ) : prompts.length === 0 ? (
                <div className="px-5 py-10 text-center text-sm text-zinc-500">No prompts found.</div>
              ) : (
                prompts.map((prompt) => (
                  <div
                    key={prompt.id}
                    className="grid min-w-0 gap-4 px-5 py-4 transition-colors hover:bg-zinc-50/80 lg:grid-cols-[minmax(0,1.6fr)_8rem_minmax(0,2.4fr)_8rem_8rem] lg:items-center"
                  >
                    <div className="min-w-0">
                      <span className="block truncate font-semibold text-zinc-900" title={prompt.displayName}>
                        {prompt.displayName}
                      </span>
                      <span className="mt-1 block truncate text-xs text-zinc-500" title={prompt.promptKey}>
                        {prompt.promptKey}
                      </span>
                    </div>

                    <div>
                      <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-zinc-400 lg:hidden">
                        Status
                      </span>
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                          prompt.isActive
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-amber-200 bg-amber-50 text-amber-700"
                        }`}
                      >
                        {prompt.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>

                    <p className="line-clamp-2 text-sm leading-relaxed text-zinc-600">{prompt.promptPreview || "-"}</p>

                    <div className="text-xs text-zinc-500">
                      <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-zinc-400 lg:hidden">
                        Updated
                      </span>
                      {formatDateTime(prompt.updatedAt)}
                    </div>

                    <div className="flex flex-wrap justify-start gap-2 lg:justify-end">
                      <Button
                        type="button"
                        variant="outline"
                        disabled={isBusy}
                        onClick={() => openEditDialog(prompt)}
                        className="h-9 border-zinc-300 bg-white px-3 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 lg:h-8"
                      >
                        <PencilLine className="mr-1.5 h-3.5 w-3.5" />
                        Edit
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        disabled={isBusy || !prompt.isActive}
                        onClick={() => void handleArchive(prompt)}
                        className="h-9 border-red-200 bg-white px-3 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50 lg:h-8"
                      >
                        {archivingId === prompt.id ? (
                          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Archive className="mr-1.5 h-3.5 w-3.5" />
                        )}
                        Archive
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        <Card className="h-fit rounded-2xl border border-zinc-300 bg-white/88 p-5 2xl:sticky 2xl:top-6">
          <div className="mb-5 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-zinc-900">Create Prompt</h2>
              <p className="mt-1 text-sm text-zinc-500">Upload a prompt file or paste a managed prompt template.</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-blue-100 bg-blue-50 text-blue-700">
              <Plus className="h-5 w-5" />
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Display Name</label>
              <Input
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder="AIMCT / Asset Integrity"
                className="h-10 border-zinc-300 bg-white"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Prompt Key</label>
              <Input
                value={promptKey}
                onChange={(event) => setPromptKey(event.target.value)}
                placeholder="amict"
                className="h-10 border-zinc-300 bg-white"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Description</label>
              <Input
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Oil and gas technical conferences"
                className="h-10 border-zinc-300 bg-white"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Status</label>
              <Select value={promptStatus} onValueChange={(value) => setPromptStatus(value as PromptStatusValue)}>
                <SelectTrigger className="h-10 border-zinc-300 bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-zinc-300 bg-white">
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.md,text/plain,text/markdown"
              className="hidden"
              onChange={(event) => void handleFileSelect(event.target.files?.[0] ?? null)}
            />

            <Button
              type="button"
              variant="outline"
              disabled={isBusy}
              onClick={() => fileInputRef.current?.click()}
              className="h-10 w-full border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50"
            >
              <Upload className="mr-2 h-4 w-4" />
              {selectedFile ? selectedFile.name : "Choose Prompt File"}
            </Button>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Prompt Text</label>
              <Textarea
                value={promptText}
                onChange={(event) => {
                  setPromptText(event.target.value);
                  setSelectedFile(null);
                }}
                placeholder="Paste prompt text here"
                style={{ fieldSizing: "fixed" } as React.CSSProperties}
                className="h-56 min-h-56 max-h-72 resize-y overflow-y-auto border-zinc-300 bg-white font-mono text-xs leading-relaxed"
              />
            </div>

            <Button
              type="button"
              onClick={() => void handleCreate()}
              disabled={isBusy}
              className="h-10 w-full bg-sidebar text-white hover:bg-zinc-800 disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving Prompt...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Prompt
                </>
              )}
            </Button>
          </div>
        </Card>
      </div>

      {editingPrompt ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-4">
          <button
            type="button"
            aria-label="Close dialog"
            className="absolute inset-0 bg-zinc-950/35 backdrop-blur-[2px]"
            onClick={() => closeEditDialog()}
          />
          <div className="relative z-[1] flex max-h-[calc(100dvh-2rem)] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-zinc-300/85 bg-white/96 shadow-[0_24px_40px_-24px_rgba(2,10,27,0.6)] backdrop-blur-[10px]">
            <div className="flex shrink-0 items-start justify-between gap-4 border-b border-zinc-100 px-5 py-4 sm:px-6">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">Content Prompt</p>
                <h2 className="mt-2 line-clamp-2 text-xl font-semibold tracking-tight text-zinc-900">Edit {editingPrompt.displayName}</h2>
                <p className="mt-2 truncate text-sm leading-relaxed text-zinc-600" title={editingPrompt.promptKey}>
                  {editingPrompt.promptKey}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                className="h-9 w-9 shrink-0 rounded-full p-0 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
                onClick={() => closeEditDialog()}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Display Name</label>
                  <Input
                    value={editDisplayName}
                    onChange={(event) => setEditDisplayName(event.target.value)}
                    className="h-10 border-zinc-300 bg-white"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Status</label>
                  <Select value={editStatus} onValueChange={(value) => setEditStatus(value as PromptStatusValue)}>
                    <SelectTrigger className="h-10 border-zinc-300 bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="border-zinc-300 bg-white">
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Description</label>
                  <Input
                    value={editDescription}
                    onChange={(event) => setEditDescription(event.target.value)}
                    className="h-10 border-zinc-300 bg-white"
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Prompt Text</label>
                  <Textarea
                    value={editPromptText}
                    onChange={(event) => setEditPromptText(event.target.value)}
                    style={{ fieldSizing: "fixed" } as React.CSSProperties}
                    className="h-[min(36dvh,20rem)] min-h-56 resize-none overflow-y-auto border-zinc-300 bg-white font-mono text-xs leading-relaxed"
                  />
                </div>
              </div>
            </div>

            <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-zinc-100 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
              <Button
                type="button"
                variant="ghost"
                disabled={editSaving}
                onClick={() => closeEditDialog()}
                className="h-10 border border-zinc-300 bg-white px-4 text-zinc-700 hover:bg-zinc-50 sm:w-auto"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => void handleEditSave()}
                disabled={editSaving}
                className="h-10 bg-sidebar px-4 text-white hover:bg-zinc-800 disabled:opacity-50 sm:w-auto"
              >
                {editSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving Changes...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
