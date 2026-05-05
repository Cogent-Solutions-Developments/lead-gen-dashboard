"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Key, Mail, RefreshCw, ShieldOff, Star, Trash2, UploadCloud, User } from "lucide-react";
import { toast } from "sonner";
import {
  createWhatsAppOptOut,
  listWhatsAppOptOuts,
  uploadWhatsAppOptOutCsv,
  type UploadWhatsAppOptOutCsvResponse,
  type WhatsAppOptOutItem,
} from "@/lib/apiRouter";
import {
  disconnectOutboundMailbox,
  getMicrosoftMailboxConnectUrl,
  listOutboundMailboxes,
  setDefaultOutboundMailbox,
  type ConnectedMailboxItem,
} from "@/lib/auth";
import { useAuth } from "@/hooks/useAuth";
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
      data?: { detail?: string; message?: string } | string;
      response?: { data?: { detail?: string } | string };
      message?: string;
    };
    if (typeof err.data === "string") return err.data;
    if (typeof err.data === "object" && err.data?.detail) return err.data.detail;
    if (typeof err.data === "object" && err.data?.message) return err.data.message;
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

function isActiveMailbox(row: ConnectedMailboxItem) {
  return row.status.toLowerCase() === "active";
}

function formatProvider(provider: string) {
  if (provider === "microsoft_graph_delegated") return "Microsoft Outlook";
  return provider || "-";
}

function formatExpiry(value?: string | null) {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  const now = Date.now();
  if (parsed.getTime() <= now) return `${parsed.toLocaleString()} (expired)`;
  return parsed.toLocaleString();
}

export default function SettingsPage() {
  const { persona } = usePersona();
  const { isSuperAdmin } = useAuth();
  const [mailboxes, setMailboxes] = useState<ConnectedMailboxItem[]>([]);
  const [mailboxesLoading, setMailboxesLoading] = useState(false);
  const [connectingMailbox, setConnectingMailbox] = useState(false);
  const [mailboxActionId, setMailboxActionId] = useState<string | null>(null);
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

  const loadMailboxes = useCallback(async () => {
    if (!isSuperAdmin) {
      setMailboxes([]);
      return;
    }

    setMailboxesLoading(true);
    try {
      setMailboxes(await listOutboundMailboxes());
    } catch (error: unknown) {
      toast.error("Failed to load outbound mailboxes", {
        description: getErrorMessage(error),
      });
      setMailboxes([]);
    } finally {
      setMailboxesLoading(false);
    }
  }, [isSuperAdmin]);

  useEffect(() => {
    void loadMailboxes();
  }, [loadMailboxes]);

  useEffect(() => {
    if (!isSuperAdmin) return;

    const handleFocus = () => {
      if (document.visibilityState === "hidden") return;
      void loadMailboxes();
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleFocus);
    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleFocus);
    };
  }, [isSuperAdmin, loadMailboxes]);

  useEffect(() => {
    void loadOptOutList();
  }, [loadOptOutList, persona]);

  const handleConnectMailbox = async () => {
    const tab = window.open("about:blank", "_blank");
    if (tab) tab.opener = null;

    try {
      setConnectingMailbox(true);
      const response = await getMicrosoftMailboxConnectUrl();
      if (!response.url) {
        tab?.close();
        toast.error("Connect URL was not returned");
        return;
      }

      if (tab) {
        tab.location.href = response.url;
      } else {
        window.open(response.url, "_blank", "noopener,noreferrer");
      }

      toast.success("Microsoft sign-in opened", {
        description: "After the connection succeeds, close the tab and return here.",
      });
    } catch (error: unknown) {
      tab?.close();
      toast.error("Failed to start Outlook connection", {
        description: getErrorMessage(error),
      });
    } finally {
      setConnectingMailbox(false);
    }
  };

  const handleSetDefaultMailbox = async (mailboxId: string) => {
    try {
      setMailboxActionId(mailboxId);
      await setDefaultOutboundMailbox(mailboxId);
      toast.success("Default outbound mailbox updated");
      await loadMailboxes();
    } catch (error: unknown) {
      toast.error("Failed to set default mailbox", {
        description: getErrorMessage(error),
      });
    } finally {
      setMailboxActionId(null);
    }
  };

  const handleDisconnectMailbox = async (mailbox: ConnectedMailboxItem) => {
    const label = mailbox.email || mailbox.displayName || "this mailbox";
    if (!window.confirm(`Disconnect ${label}?`)) return;

    try {
      setMailboxActionId(mailbox.id);
      await disconnectOutboundMailbox(mailbox.id);
      toast.success("Mailbox disconnected");
      await loadMailboxes();
    } catch (error: unknown) {
      toast.error("Failed to disconnect mailbox", {
        description: getErrorMessage(error),
      });
    } finally {
      setMailboxActionId(null);
    }
  };

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

  const handleSave = () => {
    toast.success("Settings saved successfully!");
  };

  return (
    <div>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="mb-6 text-slate-500">Manage your account settings</p>
      </motion.div>

      <div className="space-y-6">
        {/* Profile */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="max-w-2xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                <User className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h2 className="font-semibold text-slate-900">Profile</h2>
                <p className="text-sm text-slate-500">Your account information</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Company Name
                </label>
                <Input defaultValue="Cogent Solutions" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Email
                </label>
                <Input type="email" defaultValue="admin@cogentsolutions.com" />
              </div>
            </div>
          </Card>
        </motion.div>

        {/* API Keys */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="max-w-2xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100">
                <Key className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <h2 className="font-semibold text-slate-900">API Keys</h2>
                <p className="text-sm text-slate-500">Connect your services</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  OpenAI API Key
                </label>
                <Input type="password" placeholder="sk-..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Browserflow API Key
                </label>
                <Input type="password" placeholder="bf-..." />
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Outbound Mailboxes */}
        {isSuperAdmin ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <Card className="p-6">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100">
                    <Mail className="h-5 w-5 text-indigo-600" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-slate-900">Outbound Mailboxes</h2>
                    <p className="text-sm text-slate-500">Connect Microsoft Outlook accounts for delegated outbound email</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    onClick={() => void loadMailboxes()}
                    disabled={mailboxesLoading || connectingMailbox || Boolean(mailboxActionId)}
                    className="border-slate-200 text-slate-700"
                  >
                    <RefreshCw className={`mr-2 h-4 w-4 ${mailboxesLoading ? "animate-spin" : ""}`} />
                    Refresh
                  </Button>
                  <Button
                    onClick={() => void handleConnectMailbox()}
                    disabled={connectingMailbox || mailboxesLoading || Boolean(mailboxActionId)}
                    className="bg-slate-900 hover:bg-slate-800"
                  >
                    {connectingMailbox ? (
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <ExternalLink className="mr-2 h-4 w-4" />
                    )}
                    Connect Outlook
                  </Button>
                </div>
              </div>

              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-slate-100/80 text-xs uppercase tracking-wide text-slate-600">
                    <tr>
                      <th className="px-3 py-2">Mailbox</th>
                      <th className="px-3 py-2">Provider</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2">Last Connected</th>
                      <th className="px-3 py-2">Last Used</th>
                      <th className="px-3 py-2">Token Expiry</th>
                      <th className="px-3 py-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {mailboxes.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-3 py-6 text-center text-slate-500">
                          {mailboxesLoading ? "Loading connected mailboxes..." : "No Outlook mailboxes connected."}
                        </td>
                      </tr>
                    ) : (
                      mailboxes.map((mailbox) => {
                        const isActive = isActiveMailbox(mailbox);
                        const actionBusy = mailboxActionId === mailbox.id;
                        return (
                          <tr key={mailbox.id} className="bg-white align-top">
                            <td className="px-3 py-3">
                              <div className="flex flex-col gap-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-medium text-slate-900">{mailbox.email || "-"}</span>
                                  {mailbox.isDefault ? (
                                    <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">
                                      <Star className="h-3 w-3" />
                                      Default
                                    </Badge>
                                  ) : null}
                                </div>
                                {mailbox.displayName ? (
                                  <span className="text-xs text-slate-500">{mailbox.displayName}</span>
                                ) : null}
                                {mailbox.tenantId ? (
                                  <span className="font-mono text-[11px] text-slate-400">Tenant: {mailbox.tenantId}</span>
                                ) : null}
                              </div>
                            </td>
                            <td className="px-3 py-3 text-slate-600">{formatProvider(mailbox.provider)}</td>
                            <td className="px-3 py-3">
                              <Badge
                                className={
                                  isActive
                                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                    : "border-slate-200 bg-slate-100 text-slate-600"
                                }
                              >
                                {isActive ? "Active" : mailbox.status || "Inactive"}
                              </Badge>
                            </td>
                            <td className="px-3 py-3 text-slate-500">{formatDateTime(mailbox.lastConnectedAt ?? undefined)}</td>
                            <td className="px-3 py-3 text-slate-500">{formatDateTime(mailbox.lastUsedAt ?? undefined)}</td>
                            <td className="px-3 py-3 text-slate-500">{formatExpiry(mailbox.tokenExpiresAt)}</td>
                            <td className="px-3 py-3">
                              <div className="flex flex-wrap justify-end gap-2">
                                {!mailbox.isDefault && isActive ? (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => void handleSetDefaultMailbox(mailbox.id)}
                                    disabled={actionBusy || connectingMailbox || mailboxesLoading}
                                  >
                                    {actionBusy ? <RefreshCw className="mr-1 h-3 w-3 animate-spin" /> : <Star className="mr-1 h-3 w-3" />}
                                    Set default
                                  </Button>
                                ) : null}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => void handleDisconnectMailbox(mailbox)}
                                  disabled={actionBusy || connectingMailbox || mailboxesLoading}
                                  className="border-rose-200 text-rose-700 hover:bg-rose-50 hover:text-rose-800"
                                >
                                  {actionBusy ? <RefreshCw className="mr-1 h-3 w-3 animate-spin" /> : <Trash2 className="mr-1 h-3 w-3" />}
                                  Disconnect
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
          </motion.div>
        ) : null}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
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
                className="border-slate-200 text-slate-700"
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${optOutLoading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>

            <div className="mb-3 grid gap-3 rounded-lg border border-slate-200 bg-slate-50/60 p-4 md:grid-cols-3">
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

            <div className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50/60 p-4 md:grid-cols-[1fr_auto] md:items-end">
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

            <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200">
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

        {/* Save Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="flex justify-end"
        >
          <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
            Save Changes
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
