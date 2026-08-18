"use client";

import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from "react";
import {
  CheckCircle2,
  Clock3,
  Download,
  FileSpreadsheet,
  Loader2,
  RefreshCw,
  RotateCcw,
  UploadCloud,
  UserRound,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { AdminPanelShell } from "@/components/layout/AdminPanelShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  downloadAdminLeadRequestTemplate,
  listAdminLeadRequests,
  updateAdminLeadRequestStatus,
  uploadAdminLeadRequest,
  type LeadRequestItem,
  type LeadRequestStatus,
} from "@/lib/leadRequestsApi";
import { cn } from "@/lib/utils";

type StatusFilter = "all" | LeadRequestStatus;

function errorMessage(error: unknown) {
  const detail = (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
  return detail || (error instanceof Error ? error.message : "Please try again.");
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function StatusBadge({ status }: { status: LeadRequestStatus }) {
  const Icon = status === "done" ? CheckCircle2 : status === "rejected" ? XCircle : Clock3;
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold capitalize",
      status === "done" ? "bg-emerald-50 text-emerald-700" : status === "rejected" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700",
    )}>
      <Icon className="h-3.5 w-3.5" />{status}
    </span>
  );
}

function Detail({ label, value }: { label: string; value?: string | number | null }) {
  if (value === null || value === undefined || String(value).trim() === "") return null;
  return (
    <div>
      <dt className="text-[11px] font-bold uppercase tracking-[0.12em] text-zinc-400">{label}</dt>
      <dd className="mt-1 whitespace-pre-wrap text-sm leading-6 text-zinc-700">{value}</dd>
    </div>
  );
}

export default function AdminLeadRequestsPage() {
  const [requests, setRequests] = useState<LeadRequestItem[]>([]);
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [files, setFiles] = useState<Record<string, File | null>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await listAdminLeadRequests();
      setRequests(response.requests);
      setNotes((current) => {
        const next = { ...current };
        for (const request of response.requests) {
          if (!(request.id in next)) next[request.id] = request.adminNote || "";
        }
        return next;
      });
    } catch (error) {
      toast.error("Could not load lead requests", { description: errorMessage(error) });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const counts = useMemo(() => ({
    all: requests.length,
    pending: requests.filter((request) => request.status === "pending").length,
    done: requests.filter((request) => request.status === "done").length,
    rejected: requests.filter((request) => request.status === "rejected").length,
  }), [requests]);
  const visible = filter === "all" ? requests : requests.filter((request) => request.status === filter);

  const replace = (updated: LeadRequestItem) => {
    setRequests((current) => current.map((request) => request.id === updated.id ? updated : request));
    setNotes((current) => ({ ...current, [updated.id]: updated.adminNote || "" }));
  };

  const changeStatus = async (request: LeadRequestItem, status: "pending" | "rejected") => {
    setBusyId(request.id);
    try {
      const updated = await updateAdminLeadRequestStatus(request.id, status, notes[request.id]);
      replace(updated);
      toast.success(status === "rejected" ? "Request rejected" : "Request reopened");
    } catch (error) {
      toast.error("Could not update request", { description: errorMessage(error) });
    } finally {
      setBusyId("");
    }
  };

  const upload = async (request: LeadRequestItem) => {
    const file = files[request.id];
    if (!file) {
      toast.error("Choose the completed Excel template first.");
      return;
    }
    setBusyId(request.id);
    try {
      const response = await uploadAdminLeadRequest(request.id, file, notes[request.id]);
      replace(response.request);
      setFiles((current) => ({ ...current, [request.id]: null }));
      toast.success("Requested leads uploaded", { description: "The request is done and the requester has been notified." });
    } catch (error) {
      toast.error("Lead upload failed", { description: errorMessage(error) });
    } finally {
      setBusyId("");
    }
  };

  const downloadTemplate = async (request: LeadRequestItem) => {
    setBusyId(request.id);
    try {
      await downloadAdminLeadRequestTemplate(request.id);
      toast.success("Template download started");
    } catch (error) {
      toast.error("Template download failed", { description: errorMessage(error) });
    } finally {
      setBusyId("");
    }
  };

  return (
    <AdminPanelShell>
      <div className="min-h-[calc(100dvh-3rem)] font-sans">
        <header className="rounded-2xl border border-white/80 bg-white/75 p-5 shadow-sm backdrop-blur-xl sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-600">Request management</p>
              <h1 className="mt-1 text-3xl font-semibold tracking-tight text-zinc-950">Lead Requests</h1>
              <p className="mt-1 text-sm text-zinc-500">Review requirements, reject or reopen requests, and upload event-scoped leads.</p>
            </div>
            <Button onClick={() => void load()} disabled={loading} variant="outline" className="h-10 rounded-full border-zinc-200 bg-white">
              <RefreshCw className={cn("mr-2 h-4 w-4", loading && "animate-spin")} />Refresh
            </Button>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {(["all", "pending", "done", "rejected"] as StatusFilter[]).map((status) => (
              <button key={status} type="button" onClick={() => setFilter(status)} className={cn("rounded-xl border px-4 py-3 text-left transition", filter === status ? "border-blue-500 bg-blue-600 text-white shadow-md" : "border-zinc-200 bg-white text-zinc-700 hover:border-blue-200 hover:bg-blue-50/50")}>
                <span className="block text-xs font-bold capitalize opacity-75">{status}</span>
                <span className="mt-1 block text-2xl font-semibold tabular-nums">{counts[status]}</span>
              </button>
            ))}
          </div>
        </header>

        <div className="mt-5 space-y-4">
          {loading && requests.length === 0 ? (
            <div className="flex min-h-64 items-center justify-center rounded-2xl border border-zinc-200 bg-white/80 text-sm text-zinc-500"><Loader2 className="mr-2 h-5 w-5 animate-spin" />Loading requests…</div>
          ) : visible.length === 0 ? (
            <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-300 bg-white/65 text-center"><FileSpreadsheet className="h-8 w-8 text-zinc-300" /><p className="mt-3 text-sm font-semibold text-zinc-700">No {filter === "all" ? "lead" : filter} requests</p></div>
          ) : visible.map((request) => {
            const busy = busyId === request.id;
            return (
              <article key={request.id} className="overflow-hidden rounded-2xl border border-white/85 bg-white/85 shadow-sm backdrop-blur-xl">
                <div className="grid gap-5 p-5 xl:grid-cols-[minmax(0,1fr)_24rem]">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2"><StatusBadge status={request.status} /><span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-semibold capitalize text-zinc-600">{request.pipeline}</span></div>
                        <h2 className="mt-3 text-xl font-semibold tracking-tight text-zinc-950">{request.eventName}</h2>
                        <p className="mt-1 flex items-center gap-1.5 text-sm text-zinc-500"><UserRound className="h-4 w-4" />{request.requesterName || request.requesterUsername || "Unknown requester"} · {formatDate(request.createdAt)}</p>
                      </div>
                      <span className="text-xs text-zinc-400">#{request.id.slice(0, 8)}</span>
                    </div>
                    <dl className="mt-5 grid gap-4 border-t border-zinc-100 pt-4 sm:grid-cols-2">
                      <Detail label="Leads per company" value={request.leadsPerCompany} />
                      <Detail label="Location" value={request.location} />
                      <Detail label="Target designation" value={request.targetDesignation} />
                      <Detail label="Company list" value={request.companyList} />
                      <div className="sm:col-span-2"><Detail label="ICP" value={request.icp} /></div>
                      {request.uploadedCampaignId ? <Detail label="Uploaded campaign" value={request.uploadedCampaignId} /> : null}
                      {request.completedAt ? <Detail label="Completed" value={formatDate(request.completedAt)} /> : null}
                    </dl>
                  </div>

                  <section className="rounded-2xl border border-zinc-200 bg-zinc-50/80 p-4">
                    <h3 className="text-sm font-semibold text-zinc-900">Fulfil this request</h3>
                    <p className="mt-1 text-xs leading-5 text-zinc-500">The upload is written to CS Database and this requester&apos;s My Leads event. Successful upload marks the request done.</p>
                    <label className="mt-4 block">
                      <span className="mb-1.5 block text-xs font-semibold text-zinc-600">Admin note</span>
                      <Input value={notes[request.id] || ""} onChange={(event) => setNotes((current) => ({ ...current, [request.id]: event.target.value }))} placeholder="Optional note for the requester" disabled={busy || request.status === "done"} className="h-10 border-zinc-300 bg-white" />
                    </label>

                    {request.status === "pending" ? (
                      <div className="mt-4 space-y-3">
                        <Button type="button" variant="outline" onClick={() => void downloadTemplate(request)} disabled={busy} className="h-10 w-full rounded-xl border-zinc-300 bg-white"><Download className="mr-2 h-4 w-4" />Download {request.pipeline} template</Button>
                        <label className="flex min-h-20 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-blue-300 bg-blue-50/60 px-3 text-center hover:bg-blue-50">
                          <FileSpreadsheet className="h-5 w-5 text-blue-600" />
                          <span className="mt-1 max-w-full truncate text-xs font-semibold text-blue-800">{files[request.id]?.name || "Choose completed .xlsx"}</span>
                          <input type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="sr-only" onChange={(event: ChangeEvent<HTMLInputElement>) => setFiles((current) => ({ ...current, [request.id]: event.target.files?.[0] || null }))} disabled={busy} />
                        </label>
                        <Button type="button" onClick={() => void upload(request)} disabled={busy || !files[request.id]} className="h-10 w-full rounded-xl bg-blue-600 text-white hover:bg-blue-700">{busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}Upload leads & complete</Button>
                        <Button type="button" variant="ghost" onClick={() => void changeStatus(request, "rejected")} disabled={busy} className="h-9 w-full rounded-xl text-red-600 hover:bg-red-50 hover:text-red-700"><XCircle className="mr-2 h-4 w-4" />Reject request</Button>
                      </div>
                    ) : request.status === "rejected" ? (
                      <Button type="button" onClick={() => void changeStatus(request, "pending")} disabled={busy} variant="outline" className="mt-4 h-10 w-full rounded-xl border-zinc-300 bg-white">{busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RotateCcw className="mr-2 h-4 w-4" />}Reopen as pending</Button>
                    ) : (
                      <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-3 text-xs leading-5 text-emerald-800"><CheckCircle2 className="mr-1 inline h-4 w-4" />Upload complete. The requester was notified and can access these leads in My Leads.</div>
                    )}
                  </section>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </AdminPanelShell>
  );
}
