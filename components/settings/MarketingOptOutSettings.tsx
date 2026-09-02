"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeftIcon } from "@phosphor-icons/react/dist/csr/ArrowLeft";
import { ArrowsClockwiseIcon } from "@phosphor-icons/react/dist/csr/ArrowsClockwise";
import { CloudArrowUpIcon } from "@phosphor-icons/react/dist/csr/CloudArrowUp";
import { ShieldSlashIcon } from "@phosphor-icons/react/dist/csr/ShieldSlash";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { usePersona } from "@/hooks/usePersona";
import {
  createWhatsAppOptOut,
  listWhatsAppOptOuts,
  uploadWhatsAppOptOutCsv,
  type UploadWhatsAppOptOutCsvResponse,
  type WhatsAppOptOutItem,
} from "@/lib/apiRouter";

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
    if (typeof err.response?.data === "object" && err.response.data?.detail) {
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

export function MarketingOptOutSettings({ onBack }: { onBack: () => void }) {
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
        description: response.created
          ? "A new suppression record was created."
          : "Existing suppression record was updated.",
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

  const activeCount = useMemo(
    () => optOutRows.filter((row) => row.isActive).length,
    [optOutRows]
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="border-slate-200 p-6 shadow-sm">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <Button
              type="button"
              variant="ghost"
              onClick={onBack}
              className="mb-4 -ml-3 h-9 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            >
              <ArrowLeftIcon className="mr-2 h-4 w-4" weight="bold" aria-hidden="true" />
              Settings
            </Button>
            <div className="flex items-start gap-4">
              <ShieldSlashIcon
                size={36}
                weight="duotone"
                className="mt-0.5 shrink-0 text-rose-600"
                aria-hidden="true"
              />
              <div>
                <h2 className="font-semibold text-slate-900">Marketing Opt-out</h2>
              </div>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => void loadOptOutList()}
            disabled={optOutLoading || uploadingCsv || addingManual}
            className="border-slate-300 text-slate-700"
          >
            <ArrowsClockwiseIcon
              className={`mr-2 h-4 w-4 ${optOutLoading ? "animate-spin" : ""}`}
              weight="bold"
              aria-hidden="true"
            />
            Refresh
          </Button>
        </div>

        <div className="mb-3 grid gap-3 rounded-lg border border-slate-300 bg-slate-50/60 p-4 md:grid-cols-3">
          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700" htmlFor="opt-out-phone">
              Phone (optional)
            </label>
            <Input
              id="opt-out-phone"
              value={manualPhone}
              onChange={(event) => setManualPhone(event.target.value)}
              placeholder="+9477xxxxxxx"
              disabled={addingManual}
            />
          </div>
          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700" htmlFor="opt-out-email">
              Email (optional)
            </label>
            <Input
              id="opt-out-email"
              value={manualEmail}
              onChange={(event) => setManualEmail(event.target.value)}
              placeholder="contact@example.com"
              disabled={addingManual}
            />
          </div>
          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700" htmlFor="opt-out-reason">
              Reason (optional)
            </label>
            <Input
              id="opt-out-reason"
              value={manualReason}
              onChange={(event) => setManualReason(event.target.value)}
              placeholder="requested no marketing"
              disabled={addingManual}
            />
          </div>
          <div className="md:col-span-3">
            <Button
              type="button"
              onClick={() => void handleManualAdd()}
              disabled={addingManual}
              className="w-full md:w-auto"
            >
              {addingManual ? (
                <ArrowsClockwiseIcon
                  className="mr-2 h-4 w-4 animate-spin"
                  weight="bold"
                  aria-hidden="true"
                />
              ) : null}
              Add suppression
            </Button>
          </div>
        </div>

        <div className="grid gap-3 rounded-lg border border-slate-300 bg-slate-50/60 p-4 md:grid-cols-[1fr_auto] md:items-end">
          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700" htmlFor="opt-out-csv">
              CSV upload
            </label>
            <Input
              id="opt-out-csv"
              type="file"
              accept=".csv,text/csv"
              onChange={(event) => setSelectedCsv(event.target.files?.[0] ?? null)}
              disabled={uploadingCsv}
            />
            <p className="text-xs text-slate-500">
              Columns: <span className="font-mono">phone</span>,{" "}
              <span className="font-mono">mobile</span>, <span className="font-mono">number</span>,{" "}
              <span className="font-mono">email</span>.
            </p>
          </div>
          <Button
            type="button"
            onClick={() => void handleOptOutCsvUpload()}
            disabled={!selectedCsv || uploadingCsv}
          >
            {uploadingCsv ? (
              <ArrowsClockwiseIcon
                className="mr-2 h-4 w-4 animate-spin"
                weight="bold"
                aria-hidden="true"
              />
            ) : (
              <CloudArrowUpIcon className="mr-2 h-4 w-4" weight="duotone" aria-hidden="true" />
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
            Active only
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
  );
}
