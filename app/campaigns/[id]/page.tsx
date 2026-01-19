"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Users,
  Mail,
  MessageCircle,
  CheckCircle,
  Clock,
  XCircle,
  Eye,
  Check,
  X,
  ExternalLink,
  Save,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";

// Custom LinkedIn Icon
const LinkedInIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M20.5 2h-17A1.5 1.5 0 002 3.5v17A1.5 1.5 0 003.5 22h17a1.5 1.5 0 001.5-1.5v-17A1.5 1.5 0 0020.5 2zM8 19H5v-9h3zM6.5 8.25A1.75 1.75 0 118.3 6.5a1.78 1.78 0 01-1.8 1.75zM19 19h-3v-4.74c0-1.22-.44-2.12-1.54-2.12a1.6 1.6 0 00-1.58 1.14 2.17 2.17 0 00-.1 1.08V19h-3v-9h2.9v1.3a3.11 3.11 0 012.7-1.4c1.95 0 3.52 1.27 3.52 4z" />
  </svg>
);

type ApprovalStatus = "pending" | "approved" | "rejected";
type OutreachState = "pending" | "sending" | "sent";

interface Lead {
  id: string;
  draftId?: string | null;
  draftStatus?: string | null; // ✅ NEW

  batchId?: string;
  employeeName: string;
  title: string;
  company: string;
  email: string;
  phone: string;
  linkedinUrl: string;
  companyUrl: string;

  contentEmailSubject: string;
  contentEmail: string;
  contentLinkedin: string;
  contentWhatsapp: string;

  approvalStatus: ApprovalStatus;

  outreachStatus?: {
    email: OutreachState;
    linkedin: OutreachState;
    whatsapp: OutreachState;
  };
}


interface CampaignDetail {
  id: string;
  name: string;
  icpPreview: string;
  status: string;
  createdAt: string;
  stats: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
  };
}

const approvalStyles = {
  pending: { bg: "bg-zinc-100 text-zinc-500 border-zinc-200", icon: Clock },
  approved: { bg: "bg-sidebar-primary/10 text-emerald-900 border-sidebar-primary/20", icon: CheckCircle },
  rejected: { bg: "bg-white text-zinc-400 border-zinc-200 line-through", icon: XCircle },
};

const normalizeApprovalStatus = (s: any): ApprovalStatus => {
  if (s === "content_generated" || s === "needs_review") return "pending";
  return s === "approved" || s === "rejected" || s === "pending" ? s : "pending";
};



// --- Outreach icon component (kept) ---
const buildOutreachStatus = (lead: Lead): Required<NonNullable<Lead["outreachStatus"]>> => {
  // Use backend if present
  if (lead.outreachStatus) {
    return {
      email: lead.outreachStatus.email ?? "pending",
      linkedin: lead.outreachStatus.linkedin ?? "pending",
      whatsapp: lead.outreachStatus.whatsapp ?? "pending",
    };
  }

  // Fallback from delivery status
  const s = String(lead.draftStatus || "").toLowerCase();
  if (s === "sent") return { email: "sent", linkedin: "sent", whatsapp: "sent" };
  if (s === "sending") return { email: "sending", linkedin: "pending", whatsapp: "pending" };

  return { email: "pending", linkedin: "pending", whatsapp: "pending" };
};


const OutreachStatusIcons = ({ status }: { status: Required<NonNullable<Lead["outreachStatus"]>> }) => {
  // if (!status) return null;

  const getStyle = (s: string) => {
    if (s === "sent") return "bg-emerald-50 text-emerald-600 border-emerald-200 shadow-sm";
    if (s === "sending") return "bg-amber-50 text-amber-500 border-amber-200 animate-pulse";
    return "bg-zinc-50 text-zinc-300 border-zinc-100";
  };

  return (
    <div className="flex items-center justify-end gap-1.5">
      <div className={`flex h-6 w-6 items-center justify-center rounded-full border transition-all duration-500 ${getStyle(status.email)}`} title="Email">
        <Mail className="h-3 w-3" />
      </div>
      {/* <div className={`flex h-6 w-6 items-center justify-center rounded-full border transition-all duration-500 delay-75 ${getStyle(status.linkedin)}`} title="LinkedIn">
        <LinkedInIcon className="h-3 w-3" />
      </div> */}
      <div className={`flex h-6 w-6 items-center justify-center rounded-full border transition-all duration-500 delay-150 ${getStyle(status.whatsapp)}`} title="WhatsApp">
        <MessageCircle className="h-3 w-3" />
      </div>
    </div>
  );
};

export default function CampaignDetailPage() {
  const params = useParams<{ id: string }>();
  const campaignId = params.id;

  const [campaign, setCampaign] = useState<CampaignDetail | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [editForm, setEditForm] = useState<Partial<Lead>>({});
  const [saving, setSaving] = useState(false);

  const pendingCount = useMemo(() => leads.filter((l) => l.approvalStatus === "pending").length, [leads]);
  const approvedCount = useMemo(() => leads.filter((l) => l.approvalStatus === "approved").length, [leads]);
  const rejectedCount = useMemo(() => leads.filter((l) => l.approvalStatus === "rejected").length, [leads]);

  // trigger content generation only
  const triggerStep5 = async () => {
    try {
      toast.info("Starting content generation...");
      const res = await api.post(`/api/v1/icp/${campaignId}/content/generate-step5`, null, {
        params: { batch_size: 50 },
      });

      toast.success("Step 5 started", { description: `Job: ${res.data.job_id}` });

      // simple: refresh leads every 5s until drafts appear
      let tries = 0;
      const maxTries = 30;

      const t = setInterval(async () => {
        tries++;
        await fetchAll(); // you already have this
        const res2 = await api.get(`/api/campaigns/${campaignId}/leads`, { params: { status: "all" } });
        const hasAnyDraft = (res2.data.leads || []).some((l: any) => l.draftId);

        if (hasAnyDraft || tries >= maxTries) {
          clearInterval(t);
          if (hasAnyDraft) toast.success("Drafts created");
          else toast.info("Still generating, refresh later");
        }
      }, 5000);

    } catch (e: any) {
      toast.error("Step 5 trigger failed", { description: e?.response?.data?.detail || e?.message });
    }
  };


  const fetchAll = async () => {
    setLoading(true);
    try {
      const [cRes, lRes] = await Promise.all([
        api.get(`/api/campaigns/${campaignId}`),
        api.get(`/api/campaigns/${campaignId}/leads`, { params: { status: "all" } }),
      ]);

      setCampaign(cRes.data);

      // Backend returns { leads: [...], total: n }
      // We map to your UI Lead shape.
      const mapped: Lead[] = (lRes.data.leads || []).map((x: any) => ({
        id: x.id,
        batchId: x.batchId,
        employeeName: x.employeeName,
        title: x.title || "",
        company: x.company || "",
        email: x.email || "",
        phone: x.phone || "",
        linkedinUrl: x.linkedinUrl || "",
        companyUrl: x.companyUrl || "",

        contentEmailSubject: x.contentEmailSubject || "",
        contentEmail: x.contentEmail || "",
        contentLinkedin: x.contentLinkedin || "",
        contentWhatsapp: x.contentWhatsapp || "",

        approvalStatus: normalizeApprovalStatus(x.approvalStatus),

        draftId: x.draftId ?? null,
        draftStatus: x.draftStatus ?? null,      // ✅ NEW
        outreachStatus: x.outreachStatus ?? undefined,
      }));

      setLeads(mapped);
    } catch (e: any) {
      toast.error("Failed to load campaign", { description: e?.message });
    } finally {
      setLoading(false);
    }
  };

  const sendDraft = async (draftId: string) => {
    // calls backend -> which calls Make.com
    // NOTE: your backend send route is /api/v1/drafts/:draft_id/send
    return api.post(`/api/v1/drafts/${draftId}/send`);
  };

  const startPollingLead = (leadId: string) => {
    // Poll every 3 seconds for up to 2 minutes
    let tries = 0;
    const maxTries = 40;

    const t = setInterval(async () => {
      tries++;
      try {
        const res = await api.get(`/api/campaigns/${campaignId}/leads`, { params: { status: "all" } });
        const latest = (res.data.leads || []).find((x: any) => x.id === leadId);
        if (!latest) return;

        // Update this one lead in state
        setLeads((prev) =>
          prev.map((l) =>
            l.id === leadId
              ? {
                ...l,
                approvalStatus: normalizeApprovalStatus(latest.approvalStatus ?? l.approvalStatus),
                draftStatus: latest.draftStatus ?? l.draftStatus,
                outreachStatus: latest.outreachStatus ?? l.outreachStatus,
              }
              : l
          )
        );

        // stop when fully sent
        const s = latest.outreachStatus;
        if (s && s.email === "sent" && s.linkedin === "sent" && s.whatsapp === "sent") {
          clearInterval(t);
          toast.success("Outreach sent successfully");
        }

        if (tries >= maxTries) {
          clearInterval(t);
          toast.info("Still sending, check again later");
        }
      } catch {
        if (tries >= maxTries) clearInterval(t);
      }
    }, 3000);
  };


  useEffect(() => {
    if (!campaignId) return;
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignId]);

  useEffect(() => {
    if (selectedLead) setEditForm(selectedLead);
  }, [selectedLead]);

  const handleContentChange = (field: keyof Lead, value: string) => {
    setEditForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleApprove = async (leadId: string) => {
    try {
      // 1) approve in backend
      await api.put(`/api/leads/${leadId}/approve`);

      // 2) Optimistic UI: show yellow icons immediately
      setLeads((prev) =>
        prev.map((item) =>
          item.id === leadId
            ? {
              ...item,
              approvalStatus: "approved",
              outreachStatus: {
                email: "sending",
                linkedin: "pending",
                whatsapp: "pending",
              },
            }
            : item
        )
      );

      toast.success("Lead approved, sending outreach...");

      // 3) Send via backend -> Make.com
      const lead = leads.find((l) => l.id === leadId);
      const draftId = lead?.draftId;

      if (!draftId) {
        toast.error("Cannot send: draftId missing. Ensure backend returns draftId.");
        return;
      }

      await sendDraft(draftId);

      // 4) Poll to reflect sent status
      startPollingLead(leadId);
    } catch (e: any) {
      toast.error("Approve/send failed", { description: e?.response?.data?.detail || e?.message });
    }
  };


  const handleReject = async (leadId: string) => {
    try {
      await api.put(`/api/leads/${leadId}/reject`);
      toast.success("Lead rejected");

      setLeads((prev) =>
        prev.map((l) => (l.id === leadId ? { ...l, approvalStatus: "rejected" } : l))
      );
    } catch (e: any) {
      toast.error("Reject failed", { description: e?.response?.data?.detail || e?.message });
    }
  };

  const handleApproveAll = async () => {
    try {
      const res = await api.put(`/api/campaigns/${campaignId}/approve-all`);
      toast.success(`Approved ${res.data.approved} leads`);

      setLeads((prev) =>
        prev.map((l) => (l.approvalStatus === "pending" ? { ...l, approvalStatus: "approved" } : l))
      );
    } catch (e: any) {
      toast.error("Approve all failed", { description: e?.response?.data?.detail || e?.message });
    }
  };

  const handleSaveAndApprove = async () => {
    if (!selectedLead) return;

    setSaving(true);
    try {
      const payload = {
        contentEmailSubject: editForm.contentEmailSubject,
        contentEmail: editForm.contentEmail,
        contentLinkedin: editForm.contentLinkedin,
        contentWhatsapp: editForm.contentWhatsapp,
      };

      const res = await api.put(`/api/leads/${selectedLead.id}/content`, payload);

      toast.success("Saved & Approved, sending outreach...");

      // update local row
      setLeads((prev) =>
        prev.map((l) =>
          l.id === selectedLead.id
            ? {
              ...l,
              contentEmailSubject: res.data.contentEmailSubject ?? l.contentEmailSubject,
              contentEmail: res.data.contentEmail ?? l.contentEmail,
              contentLinkedin: res.data.contentLinkedin ?? l.contentLinkedin,
              contentWhatsapp: res.data.contentWhatsapp ?? l.contentWhatsapp,
              approvalStatus: "approved",
              outreachStatus: {
                email: "sending",
                linkedin: "pending",
                whatsapp: "pending",
              },
            }
            : l
        )
      );

      // close modal
      const leadId = selectedLead.id;
      setSelectedLead(null);
      setEditForm({});

      // send
      const lead = leads.find((l) => l.id === leadId);
      const draftId = lead?.draftId;

      if (!draftId) {
        toast.error("Cannot send: draftId missing. Ensure backend returns draftId.");
        return;
      }

      await sendDraft(draftId);

      // poll until sent
      startPollingLead(leadId);
    } catch (e: any) {
      toast.error("Save/send failed", { description: e?.response?.data?.detail || e?.message });
    } finally {
      setSaving(false);
    }
  };


  const closeModal = () => {
    setSelectedLead(null);
    setEditForm({});
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
      </div>
    );
  }

  return (
    <div className="font-sans min-h-screen bg-transparent p-1">
      <Link
        href="/campaigns"
        className="mb-6 inline-flex items-center text-sm font-medium text-zinc-400 hover:text-zinc-900 transition-colors"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Campaigns
      </Link>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-8 pb-6 border-b border-zinc-100">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
              {campaign?.name || "Campaign"}
            </h1>
            <Badge className="bg-sidebar text-sidebar-foreground border-sidebar/50 rounded-full px-3 py-1 text-[11px] uppercase tracking-wider">
              {campaign?.status || "needs_review"}
            </Badge>
          </div>
          <p className="mt-2 text-sm text-zinc-500">
            {campaign?.icpPreview || ""} • {campaign?.createdAt || ""}
          </p>
        </div>
        {/* <div className="flex gap-3">
          {pendingCount > 0 && (
            <Button
              variant="outline"
              onClick={handleApproveAll}
              className="h-10 border-zinc-200 text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
            >
              <Check className="mr-2 h-4 w-4" />
              Approve All ({pendingCount})
            </Button>


          )}
          <Button
            variant="outline"
            onClick={triggerStep5}
            className="h-10 border-zinc-200 text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
          >
            Generate Content (Step 5)
          </Button>

        </div> */}
      </div>

      <div className="grid gap-4 sm:grid-cols-4 mb-8">
        <Card className="flex flex-col justify-between p-6 rounded-xl border border-zinc-200 shadow-sm bg-white">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Total Leads</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-zinc-900">{leads.length}</span>
            <Users className="h-4 w-4 text-zinc-300" />
          </div>
        </Card>

        <Card className="flex flex-col justify-between p-6 rounded-xl border border-zinc-200 shadow-sm bg-white">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Pending</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-zinc-900">{pendingCount}</span>
            <Clock className="h-4 w-4 text-zinc-300" />
          </div>
        </Card>

        <Card className="flex flex-col justify-between p-6 rounded-xl border border-zinc-200 shadow-sm bg-white">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Approved</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-sidebar-primary">{approvedCount}</span>
            <CheckCircle className="h-4 w-4 text-sidebar-primary/80" />
          </div>
        </Card>

        <Card className="flex flex-col justify-between p-6 rounded-xl border border-zinc-200 shadow-sm bg-white">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Rejected</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-zinc-400">{rejectedCount}</span>
            <XCircle className="h-4 w-4 text-zinc-200" />
          </div>
        </Card>
      </div>

      <Card className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
        <div className="px-6 py-5 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/30">
          <h2 className="font-semibold text-zinc-900">Review Leads</h2>
          <span className="text-xs text-zinc-400 uppercase tracking-wider font-medium">Batch #{String(campaignId).slice(0, 4)}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-white border-b border-zinc-100">
              <tr>
                <th className="px-6 py-4 text-left text-[11px] font-bold uppercase tracking-wider text-zinc-400">Profile</th>
                <th className="px-6 py-4 text-left text-[11px] font-bold uppercase tracking-wider text-zinc-400">Contact Info</th>
                <th className="px-6 py-4 text-left text-[11px] font-bold uppercase tracking-wider text-zinc-400">Content</th>
                <th className="px-6 py-4 text-left text-[11px] font-bold uppercase tracking-wider text-zinc-400">Status</th>
                <th className="px-6 py-4 text-right text-[11px] font-bold uppercase tracking-wider text-zinc-400">Quick Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-zinc-50">
              {leads.map((item) => {
                const status = approvalStyles[item.approvalStatus] ?? approvalStyles.pending;
                const StatusIcon = status.icon;

                return (
                  <tr key={item.id} className="group hover:bg-zinc-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-semibold text-zinc-900">{item.employeeName}</span>
                        <span className="text-xs text-zinc-500">{item.title}</span>
                        <a href={item.companyUrl} target="_blank" className="text-xs text-zinc-400 hover:text-zinc-600 hover:underline mt-0.5 w-fit">
                          {item.company}
                        </a>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <span className="text-xs text-zinc-600 font-mono">{item.email}</span>
                        <span className="text-xs text-zinc-400">{item.phone}</span>
                        <div className="flex gap-3 mt-1">
                          <a href={item.linkedinUrl} target="_blank" className="text-zinc-400 hover:text-zinc-900 transition-colors">
                            <LinkedInIcon className="h-3.5 w-3.5" />
                          </a>
                          <a href={item.companyUrl} target="_blank" className="text-zinc-400 hover:text-zinc-900 transition-colors">
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 border-zinc-200 text-xs font-medium text-zinc-600 hover:bg-white hover:text-zinc-900 hover:border-zinc-300"
                        onClick={() => setSelectedLead(item)}
                      >
                        <Eye className="mr-2 h-3.5 w-3.5 text-zinc-400" />
                        Review Content
                      </Button>
                    </td>

                    <td className="px-6 py-4">
                      <Badge className={`rounded-md px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide shadow-none border ${status.bg}`}>
                        <StatusIcon className="mr-1.5 h-3 w-3" />
                        {item.approvalStatus}
                      </Badge>
                    </td>

                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2 min-w-[120px]">
                        {item.approvalStatus === "pending" ? (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-zinc-400 hover:bg-zinc-100 hover:text-red-600"
                              onClick={() => handleReject(item.id)}
                            >
                              <X className="h-4 w-4" />
                            </Button>

                            <Button
                              size="icon"
                              className="h-8 w-8 bg-sidebar-primary text-sidebar-foreground hover:bg-sidebar-primary/80 shadow-sm"
                              onClick={() => handleApprove(item.id)}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                          </>
                        ) : item.approvalStatus === "rejected" ? (
                          <span className="text-xs text-zinc-300 italic">Rejected</span>
                        ) : (
                          <OutreachStatusIcons status={buildOutreachStatus(item)} />
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <AnimatePresence>
        {selectedLead && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/60 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[85vh] flex flex-col overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
                <div>
                  <h3 className="text-lg font-semibold text-zinc-900">Edit Generated Content</h3>
                  <p className="text-xs text-zinc-500">
                    Target: {selectedLead.employeeName} — {selectedLead.title}
                  </p>
                </div>
                <Button variant="ghost" size="icon" onClick={closeModal} className="h-8 w-8 text-zinc-400 hover:text-zinc-900">
                  <X className="h-5 w-5" />
                </Button>
              </div>

              <div className="p-6 overflow-y-auto space-y-8 bg-white flex-1">
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-zinc-100 rounded-md">
                      <Mail className="h-4 w-4 text-zinc-900" />
                    </div>
                    <span className="text-sm font-semibold text-zinc-900">Cold Email</span>
                  </div>

                  <div className="space-y-3 pl-2">
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1 block">Subject Line</label>
                      <input
                        className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-900"
                        value={editForm.contentEmailSubject || ""}
                        onChange={(e) => handleContentChange("contentEmailSubject", e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1 block">Email Body</label>
                      <textarea
                        className="min-h-36 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-900 resize-y"
                        value={editForm.contentEmail || ""}
                        onChange={(e) => handleContentChange("contentEmail", e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-zinc-100 rounded-md">
                        <LinkedInIcon className="h-4 w-4 text-zinc-900" />
                      </div>
                      <span className="text-sm font-semibold text-zinc-900">LinkedIn Message</span>
                    </div>
                    <textarea
                      className="h-full min-h-[150px] w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-900 resize-none"
                      value={editForm.contentLinkedin || ""}
                      onChange={(e) => handleContentChange("contentLinkedin", e.target.value)}
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-zinc-100 rounded-md">
                        <MessageCircle className="h-4 w-4 text-zinc-900" />
                      </div>
                      <span className="text-sm font-semibold text-zinc-900">WhatsApp</span>
                    </div>
                    <textarea
                      className="h-full min-h-[150px] w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-900 resize-none"
                      value={editForm.contentWhatsapp || ""}
                      onChange={(e) => handleContentChange("contentWhatsapp", e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="p-4 border-t border-zinc-100 bg-zinc-50/50 flex justify-end gap-3">
                {selectedLead.approvalStatus === "pending" ? (
                  <>
                    <Button
                      variant="ghost"
                      className="text-zinc-500 hover:text-red-600 hover:bg-red-50"
                      onClick={async () => {
                        await handleReject(selectedLead.id);
                        closeModal();
                      }}
                    >
                      Reject
                    </Button>

                    <Button
                      className="bg-zinc-900 text-white hover:bg-zinc-800"
                      disabled={saving}
                      onClick={handleSaveAndApprove}
                    >
                      {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                      Save & Approve
                    </Button>
                  </>
                ) : (
                  <Button variant="outline" onClick={closeModal} className="min-w-24">
                    Close
                  </Button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
