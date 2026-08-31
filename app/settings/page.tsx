"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AdminPanelShell } from "@/components/layout/AdminPanelShell";
import { ShieldOff, RefreshCw, UploadCloud, Activity, ChevronRight, Database, Sparkles } from "lucide-react";
import { toast } from "sonner";
import {
  createWhatsAppOptOut,
  listWhatsAppOptOuts,
  uploadWhatsAppOptOutCsv,
  type UploadWhatsAppOptOutCsvResponse,
  type WhatsAppOptOutItem,
} from "@/lib/apiRouter";
import { usePersona } from "@/hooks/usePersona";

function formatDateTime(value?: string) {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
}

function getErrorMessage(error: unknown): string {
  if (typeof error === "string") return error;
  if (error && typeof error === "object") {
    const err = error as {
      response?: { data?: { detail?: string } | string };
      message?: string;
    };
    if (typeof err.response?.data === "string") return err.response.data;
    if (typeof err.response?.data === "object" && err.response?.data?.detail) {
      return err.response.data.detail;
    }
    if (typeof err.message === "string" && err.message.trim()) return err.message;
  }
  return "Please try again.";
}

function normalizePhoneInput(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return trimmed.replace(/\s+/g, "");
}

function displayIdentity(row: WhatsAppOptOutItem) {
  if (row.identityValue) return row.identityValue;
  if (row.phoneE164) return row.phoneE164;
  if (row.email) return row.email;
  return "-";
}

export default function SettingsPage() {
  const { persona } = usePersona();
  const [optOutRows, setOptOutRows] = useState<WhatsAppOptOutItem[]>([]);
  const [optOutLoading, setOptOutLoading] = useState(false);
  const [uploadingCsv, setUploadingCsv] = useState(false);
  const [addingManual, setAddingManual] = useState(false);
  const [activeOnly, setActiveOnly] = useState(true);
  const [selectedCsv, setSelectedCsv] = useState<File | null>(null);
  const [uploadSummary, setUploadSummary] = useState<UploadWhatsAppOptOutCsvResponse | null>(null);
  const [manualPhone, setManualPhone] = useState("");
  const [manualEmail, setManualEmail] = useState("");
  const [manualReason, setManualReason] = useState("");

  const loadOptOutList = useCallback(async () => {
    setOptOutLoading(true);
    try {
      const response = await listWhatsAppOptOuts({ limit: 200, activeOnly });
      setOptOutRows(Array.isArray(response?.items) ? response.items : []);
    } catch (error: unknown) {
      toast.error("Failed to load opt-out list", {
        description: getErrorMessage(error),
      });
      setOptOutRows([]);
    } finally {
      setOptOutLoading(false);
    }
  }, [activeOnly]);

  useEffect(() => {
    void loadOptOutList();
  }, [loadOptOutList, persona]);

  const handleOptOutCsvUpload = async () => {
    if (!selectedCsv) {
      toast.error("Select a CSV file first");
      return;
    }

    if (!selectedCsv.name.toLowerCase().endsWith(".csv")) {
      toast.error("Only CSV files are supported");
      return;
    }

    try {
      setUploadingCsv(true);
      const summary = await uploadWhatsAppOptOutCsv(selectedCsv);
      setUploadSummary(summary);
      toast.success("Opt-out CSV uploaded", {
        description: `Created ${summary.created}, updated ${summary.updated}, invalid ${summary.invalid}.`,
      });
      await loadOptOutList();
    } catch (error: unknown) {
      toast.error("CSV upload failed", {
        description: getErrorMessage(error),
      });
    } finally {
      setUploadingCsv(false);
    }
  };

  const handleManualAdd = async () => {
    const phone = normalizePhoneInput(manualPhone);
    const email = manualEmail.trim();
    const reason = manualReason.trim();

    if (!phone && !email) {
      toast.error("Provide a phone or email");
      return;
    }

    try {
      setAddingManual(true);
      const response = await createWhatsAppOptOut({
        phone: phone || undefined,
        email: email || undefined,
        reason: reason || undefined,
        source: "frontend_manual",
      });
      toast.success("Suppression saved", {
        description: response.created ? "A new suppression record was created." : "Existing suppression record was updated.",
      });
      setManualPhone("");
      setManualEmail("");
      setManualReason("");
      await loadOptOutList();
    } catch (error: unknown) {
      toast.error("Failed to save suppression", {
        description: getErrorMessage(error),
      });
    } finally {
      setAddingManual(false);
    }
  };

  const activeCount = useMemo(() => optOutRows.filter((row) => row.isActive).length, [optOutRows]);

  return (
    <AdminPanelShell>
    <div>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
          <p className="text-slate-500">Manage system controls and channel safety</p>
        </div>
        <Link href="/settings/system-monitor">
          <Button
            type="button"
            variant="outline"
            className="h-10 border-slate-300 bg-white/90 text-slate-700 hover:bg-slate-50"
          >
            <Activity className="mr-2 h-4 w-4" />
            System Monitor
          </Button>
        </Link>
      </motion.div>

      <div className="space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Link
            href="/settings/content-generation"
            aria-label="Open Content Generation settings"
            className="group block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
          >
            <Card className="overflow-hidden border-slate-200 bg-gradient-to-br from-white via-white to-blue-50/70 p-0 shadow-sm transition-all duration-200 group-hover:-translate-y-0.5 group-hover:border-blue-300 group-hover:shadow-md">
              <div className="flex flex-col justify-between gap-5 p-6 sm:flex-row sm:items-center">
                <div className="flex min-w-0 items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm shadow-blue-200">
                    <Sparkles className="h-6 w-6" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-semibold text-slate-950">Content Generation</h2>
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
                        <Database className="h-3 w-3" />DB managed
                      </span>
                    </div>
                    <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
                      Configure cost guardrails and inspect live runs, checkpoints, pause/resume state, and usage efficiency.
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2 text-sm font-semibold text-blue-700">
                  Open control center
                  <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </div>
              </div>
            </Card>
          </Link>
        </motion.div>

        {/* Marketing Opt-out */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <Card className="p-6">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-100">
                  <ShieldOff className="h-5 w-5 text-rose-600" />
                </div>
                <div>
                  <h2 className="font-semibold text-slate-900">Marketing Opt-out</h2>
                  <p className="text-sm text-slate-500">Upload blocked numbers and review all-channel opt-outs</p>
                </div>
              </div>

              <Button
                variant="outline"
                onClick={() => void loadOptOutList()}
                disabled={optOutLoading || uploadingCsv || addingManual}
                className="border-slate-300 text-slate-700"
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${optOutLoading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>

            <div className="mb-3 grid gap-3 rounded-lg border border-slate-300 bg-slate-50/60 p-4 md:grid-cols-3">
              <div className="space-y-1">
                <label className="block text-sm font-medium text-slate-700">Phone (optional)</label>
                <Input
                  value={manualPhone}
                  onChange={(event) => setManualPhone(event.target.value)}
                  placeholder="+9477xxxxxxx"
                  disabled={addingManual}
                />
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-medium text-slate-700">Email (optional)</label>
                <Input
                  value={manualEmail}
                  onChange={(event) => setManualEmail(event.target.value)}
                  placeholder="contact@example.com"
                  disabled={addingManual}
                />
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-medium text-slate-700">Reason (optional)</label>
                <Input
                  value={manualReason}
                  onChange={(event) => setManualReason(event.target.value)}
                  placeholder="requested no marketing"
                  disabled={addingManual}
                />
              </div>
              <div className="md:col-span-3">
                <Button
                  onClick={() => void handleManualAdd()}
                  disabled={addingManual}
                  className="w-full md:w-auto"
                >
                  {addingManual ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Add Manual Suppression
                </Button>
              </div>
            </div>

            <div className="grid gap-3 rounded-lg border border-slate-300 bg-slate-50/60 p-4 md:grid-cols-[1fr_auto] md:items-end">
              <div className="space-y-1">
                <label className="block text-sm font-medium text-slate-700">Upload Opt-out CSV</label>
                <Input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={(event) => setSelectedCsv(event.target.files?.[0] ?? null)}
                  disabled={uploadingCsv}
                />
                <p className="text-xs text-slate-500">
                  Supported columns: <span className="font-mono">phone</span>, <span className="font-mono">mobile</span>, <span className="font-mono">number</span>, <span className="font-mono">email</span>.
                </p>
              </div>
              <Button onClick={() => void handleOptOutCsvUpload()} disabled={!selectedCsv || uploadingCsv}>
                {uploadingCsv ? (
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <UploadCloud className="mr-2 h-4 w-4" />
                )}
                Upload CSV
              </Button>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={activeOnly}
                  onChange={(event) => setActiveOnly(event.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                />
                Show active only
              </label>
              <span className="text-xs text-slate-500">Active: {activeCount}</span>
              <span className="text-xs text-slate-500">Total: {optOutRows.length}</span>
            </div>

            {uploadSummary ? (
              <div className="mt-4 grid gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 sm:grid-cols-2 lg:grid-cols-6">
                <span>Effective rows: {uploadSummary.effectiveRows}</span>
                <span>Phone rows: {uploadSummary.phoneRows}</span>
                <span>Email rows: {uploadSummary.emailRows}</span>
                <span>Created: {uploadSummary.created}</span>
                <span>Updated: {uploadSummary.updated}</span>
                <span>Invalid: {uploadSummary.invalid}</span>
              </div>
            ) : null}

            <div className="mt-4 overflow-x-auto rounded-lg border border-slate-300">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-100/80 text-xs uppercase tracking-wide text-slate-600">
                  <tr>
                    <th className="px-3 py-2">Scope</th>
                    <th className="px-3 py-2">Identity</th>
                    <th className="px-3 py-2">Phone</th>
                    <th className="px-3 py-2">Email</th>
                    <th className="px-3 py-2">Source</th>
                    <th className="px-3 py-2">Reason</th>
                    <th className="px-3 py-2">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {optOutRows.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-3 py-6 text-center text-slate-500">
                        {optOutLoading ? "Loading opt-out records..." : "No opt-out records found."}
                      </td>
                    </tr>
                  ) : (
                    optOutRows.map((row) => (
                      <tr key={row.id} className="bg-white">
                        <td className="px-3 py-2 text-slate-600">{row.scope || "-"}</td>
                        <td className="px-3 py-2 font-mono text-xs text-slate-700">{displayIdentity(row)}</td>
                        <td className="px-3 py-2 font-mono text-xs text-slate-700">{row.phoneE164 || "-"}</td>
                        <td className="px-3 py-2 font-mono text-xs text-slate-700">{row.email || "-"}</td>
                        <td className="px-3 py-2 text-slate-600">{row.source || "-"}</td>
                        <td className="px-3 py-2 text-slate-600">{row.reason || "-"}</td>
                        <td className="px-3 py-2 text-slate-500">{formatDateTime(row.createdAt)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </motion.div>

      </div>
    </div>
    </AdminPanelShell>
  );
}
