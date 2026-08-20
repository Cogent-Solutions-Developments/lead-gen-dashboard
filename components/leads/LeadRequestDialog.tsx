"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { CheckCircle2, Clock3, Loader2, Send, X, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  createLeadRequest,
  listMyLeadRequests,
  type LeadRequestItem,
} from "@/lib/leadRequestsApi";
import { cn } from "@/lib/utils";

export type LeadRequestEvent = {
  id: string;
  eventName: string;
  location?: string | null;
  isActive?: boolean;
};

type FormState = {
  eventRegistryId: string;
  leadsPerCompany: string;
  companyList: string;
  icp: string;
  targetDesignation: string;
  location: string;
};

const EMPTY_FORM: FormState = {
  eventRegistryId: "",
  leadsPerCompany: "",
  companyList: "",
  icp: "",
  targetDesignation: "",
  location: "",
};

function errorMessage(error: unknown) {
  const detail = (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
  return detail || (error instanceof Error ? error.message : "Please try again.");
}

function statusIcon(status: LeadRequestItem["status"]) {
  if (status === "done") return <CheckCircle2 className="h-3.5 w-3.5" />;
  if (status === "rejected") return <XCircle className="h-3.5 w-3.5" />;
  return <Clock3 className="h-3.5 w-3.5" />;
}

export function LeadRequestDialog({
  open,
  onOpenChange,
  events,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  events: LeadRequestEvent[];
}) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [requests, setRequests] = useState<LeadRequestItem[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const activeEvents = useMemo(() => events.filter((event) => event.isActive !== false), [events]);

  useEffect(() => {
    if (!open) return;
    let active = true;
    setLoadingRequests(true);
    void listMyLeadRequests()
      .then((response) => {
        if (active) setRequests(response.requests.slice(0, 5));
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setLoadingRequests(false);
      });
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !submitting) onOpenChange(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      active = false;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [onOpenChange, open, submitting]);

  if (!open) return null;

  const update = (field: keyof FormState, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.eventRegistryId) {
      toast.error("Event required");
      return;
    }
    setSubmitting(true);
    try {
      const created = await createLeadRequest({
        eventRegistryId: form.eventRegistryId,
        leadsPerCompany: form.leadsPerCompany ? Number(form.leadsPerCompany) : undefined,
        companyList: form.companyList.trim() || undefined,
        icp: form.icp.trim() || undefined,
        targetDesignation: form.targetDesignation.trim() || undefined,
        location: form.location.trim() || undefined,
      });
      setRequests((current) => [created, ...current].slice(0, 5));
      setForm(EMPTY_FORM);
      toast.success("Request sent");
    } catch (error) {
      toast.error("Send failed", { description: errorMessage(error) });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[140] flex items-center justify-center bg-zinc-950/45 p-3 backdrop-blur-sm sm:p-6" role="presentation">
      <section role="dialog" aria-modal="true" aria-labelledby="lead-request-title" className="max-h-[calc(100dvh-2rem)] w-full max-w-4xl overflow-y-auto rounded-3xl border border-white bg-[#f8fafc] p-5 shadow-2xl sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-600">My Leads</p>
            <h2 id="lead-request-title" className="mt-1 text-2xl font-semibold tracking-tight text-zinc-950">Request leads</h2>
          </div>
          <button type="button" onClick={() => onOpenChange(false)} disabled={submitting} className="grid h-10 w-10 place-items-center rounded-full border border-zinc-200 bg-white text-zinc-500 hover:text-zinc-950" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
            <label className="sm:col-span-2">
              <span className="mb-1.5 block text-xs font-semibold text-zinc-700">Event <span className="text-red-500">*</span></span>
              <select required value={form.eventRegistryId} onChange={(event) => update("eventRegistryId", event.target.value)} className="h-11 w-full rounded-xl border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100">
                <option value="">Select event</option>
                {activeEvents.map((event) => <option key={event.id} value={event.id}>{event.eventName}</option>)}
              </select>
            </label>
            <label>
              <span className="mb-1.5 block text-xs font-semibold text-zinc-700">Leads/company</span>
              <Input type="number" min={1} max={10000} value={form.leadsPerCompany} onChange={(event) => update("leadsPerCompany", event.target.value)} placeholder="3" className="h-11 rounded-xl border-zinc-300 bg-white" />
            </label>
            <label>
              <span className="mb-1.5 block text-xs font-semibold text-zinc-700">Location</span>
              <Input value={form.location} onChange={(event) => update("location", event.target.value)} placeholder="City or region" className="h-11 rounded-xl border-zinc-300 bg-white" />
            </label>
            <label className="sm:col-span-2">
              <span className="mb-1.5 block text-xs font-semibold text-zinc-700">Companies</span>
              <Textarea value={form.companyList} onChange={(event) => update("companyList", event.target.value)} placeholder="One per line or comma" className="min-h-20 rounded-xl border-zinc-300 bg-white" />
            </label>
            <label className="sm:col-span-2">
              <span className="mb-1.5 block text-xs font-semibold text-zinc-700">ICP</span>
              <Textarea value={form.icp} onChange={(event) => update("icp", event.target.value)} placeholder="Ideal profile" className="min-h-20 rounded-xl border-zinc-300 bg-white" />
            </label>
            <label className="sm:col-span-2">
              <span className="mb-1.5 block text-xs font-semibold text-zinc-700">Designations</span>
              <Textarea value={form.targetDesignation} onChange={(event) => update("targetDesignation", event.target.value)} placeholder="One per line or comma" className="min-h-20 rounded-xl border-zinc-300 bg-white" />
            </label>
            <div className="sm:col-span-2 flex justify-end pt-1">
              <Button type="submit" disabled={submitting || !form.eventRegistryId} className="h-11 rounded-full bg-blue-600 px-6 text-white hover:bg-blue-700">
                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                {submitting ? "Sending…" : "Send"}
              </Button>
            </div>
          </form>

          <aside className="rounded-2xl border border-zinc-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-zinc-900">Recent</h3>
              {loadingRequests ? <Loader2 className="h-4 w-4 animate-spin text-zinc-400" /> : null}
            </div>
            <div className="mt-3 space-y-2.5">
              {!loadingRequests && requests.length === 0 ? <p className="rounded-xl bg-zinc-50 px-3 py-5 text-center text-xs text-zinc-500">None</p> : null}
              {requests.map((request) => (
                <div key={request.id} className="rounded-xl border border-zinc-200 px-3 py-2.5">
                  <p className="truncate text-sm font-semibold text-zinc-900">{request.eventName}</p>
                  <span className={cn("mt-1.5 inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-bold capitalize", request.status === "done" ? "bg-emerald-50 text-emerald-700" : request.status === "rejected" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700")}>{statusIcon(request.status)}{request.status}</span>
                  {request.adminNote ? <p className="mt-2 text-xs leading-5 text-zinc-500">{request.adminNote}</p> : null}
                </div>
              ))}
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}
