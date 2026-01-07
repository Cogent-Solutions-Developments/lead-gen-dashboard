"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Play,
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
  Save
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

// Custom LinkedIn Icon (Professional "In" Shape)
const LinkedInIcon = ({ className }: { className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 24 24" 
    fill="currentColor" 
    className={className}
  >
    <path d="M20.5 2h-17A1.5 1.5 0 002 3.5v17A1.5 1.5 0 003.5 22h17a1.5 1.5 0 001.5-1.5v-17A1.5 1.5 0 0020.5 2zM8 19H5v-9h3zM6.5 8.25A1.75 1.75 0 118.3 6.5a1.78 1.78 0 01-1.8 1.75zM19 19h-3v-4.74c0-1.22-.44-2.12-1.54-2.12a1.6 1.6 0 00-1.58 1.14 2.17 2.17 0 00-.1 1.08V19h-3v-9h2.9v1.3a3.11 3.11 0 012.7-1.4c1.95 0 3.52 1.27 3.52 4z" />
  </svg>
);

interface Lead {
  id: string;
  name: string;
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
  approvalStatus: "pending" | "approved" | "rejected";
}

const initialLeads: Lead[] = [
  {
    id: "1",
    name: "Ahmed Al-Rashid",
    title: "Sales Director",
    company: "Petro Solutions LLC",
    email: "ahmed@petrosolutions.com",
    phone: "+971 50 123 4567",
    linkedinUrl: "https://linkedin.com/in/ahmedalrashid",
    companyUrl: "https://petrosolutions.com",
    contentEmailSubject: "12th MICT Forum Qatar - Partnership",
    contentEmail: "Dear Ahmed,\n\nGiven your role at Petro Solutions, I believe the MICT Forum is a perfect fit...",
    contentLinkedin: "Hi Ahmed, saw your work in oil and gas sales. Would love to connect regarding the MICT Forum.",
    contentWhatsapp: "Hi Ahmed, quick question about MICT Forum sponsorship opportunities.",
    approvalStatus: "pending",
  },
  {
    id: "2",
    name: "Sarah Johnson",
    title: "VP Marketing",
    company: "Gulf Energy Corp",
    email: "sarah.j@gulfenergy.com",
    phone: "+971 55 987 6543",
    linkedinUrl: "https://linkedin.com/in/sarahjohnson",
    companyUrl: "https://gulfenergy.com",
    contentEmailSubject: "12th MICT Forum Qatar - Brand Visibility",
    contentEmail: "Dear Sarah,\n\nWith your marketing expertise, the exposure at MICT Forum would be invaluable...",
    contentLinkedin: "Hi Sarah, your brand campaigns caught my eye. Let's discuss the upcoming forum.",
    contentWhatsapp: "Hi Sarah, quick one about MICT Forum.",
    approvalStatus: "approved",
  },
  {
    id: "3",
    name: "Mohammed Hassan",
    title: "BD Manager",
    company: "Oilfield Services Co",
    email: "m.hassan@oilfieldservices.com",
    phone: "+966 54 321 0987",
    linkedinUrl: "https://linkedin.com/in/mohammedhassan",
    companyUrl: "https://oilfieldservices.com",
    contentEmailSubject: "12th MICT Forum Qatar - Lead Generation",
    contentEmail: "Dear Mohammed,\n\nYour BD experience makes you ideal for our VIP networking sessions...",
    contentLinkedin: "Hi Mohammed, impressive BD track record. Check this out.",
    contentWhatsapp: "Hi Mohammed, about MICT Forum sponsorship.",
    approvalStatus: "pending",
  },
  {
    id: "4",
    name: "James Wilson",
    title: "Regional Director",
    company: "Energy Partners Int",
    email: "jwilson@energypartners.com",
    phone: "+974 33 456 7890",
    linkedinUrl: "https://linkedin.com/in/jameswilson",
    companyUrl: "https://energypartners.com",
    contentEmailSubject: "12th MICT Forum Qatar - Regional Expansion",
    contentEmail: "Dear James,\n\nAs Regional Director, you would benefit from our regional delegation...",
    contentLinkedin: "Hi James, your regional expertise is impressive.",
    contentWhatsapp: "Hi James, quick question about MICT Forum.",
    approvalStatus: "rejected",
  },
];

const approvalStyles = {
  pending: { bg: "bg-zinc-100 text-zinc-500 border-zinc-200", icon: Clock },
  approved: { bg: "bg-sidebar-primary/10 text-emerald-900 border-sidebar-primary/20", icon: CheckCircle }, 
  rejected: { bg: "bg-white text-zinc-400 border-zinc-200 line-through", icon: XCircle },
};

export default function CampaignDetailPage() {
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [editForm, setEditForm] = useState<Partial<Lead>>({});

  useEffect(() => {
    if (selectedLead) {
      setEditForm(selectedLead);
    }
  }, [selectedLead]);

  const pendingCount = leads.filter((l) => l.approvalStatus === "pending").length;
  const approvedCount = leads.filter((l) => l.approvalStatus === "approved").length;
  const rejectedCount = leads.filter((l) => l.approvalStatus === "rejected").length;

  const handleContentChange = (field: keyof Lead, value: string) => {
    setEditForm(prev => ({ ...prev, [field]: value }));
  };

  const handleApprove = (id: string, updatedContent?: Partial<Lead>) => {
    setLeads((prev) =>
      prev.map((item) =>
        item.id === id 
        ? { ...item, ...updatedContent, approvalStatus: "approved" as const }
        : item
      )
    );
    toast.success("Lead approved & content saved");
  };

  const handleReject = (id: string) => {
    setLeads((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, approvalStatus: "rejected" as const } : item
      )
    );
    toast.error("Lead rejected");
  };

  const handleApproveAll = () => {
    setLeads((prev) =>
      prev.map((item) =>
        item.approvalStatus === "pending"
          ? { ...item, approvalStatus: "approved" as const }
          : item
      )
    );
    toast.success("All pending leads approved");
  };

  const handleStartOutreach = () => {
    toast.success("Outreach started!", {
      description: "Sending to " + approvedCount + " approved leads.",
    });
  };

  const closeModal = () => {
    setSelectedLead(null);
    setEditForm({});
  };

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
              12th MICT Forum Qatar
            </h1>
            <Badge className="bg-zinc-900 text-sidebar-primary border-zinc-900 rounded-full px-3 py-1 text-[11px] uppercase tracking-wider">
              Pending Approval
            </Badge>
          </div>
          <p className="mt-2 text-sm text-zinc-500">
            Oil & Gas Vendors • Created 2 hours ago
          </p>
        </div>
        <div className="flex gap-3">
          {pendingCount > 0 && (
            <Button variant="outline" onClick={handleApproveAll} className="h-10 border-zinc-200 text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900">
              <Check className="mr-2 h-4 w-4" />
              Approve All ({pendingCount})
            </Button>
          )}
          {approvedCount > 0 && (
            <Button
              onClick={handleStartOutreach}
              className="h-10 bg-zinc-900 text-white shadow-lg shadow-zinc-900/10 hover:bg-zinc-800"
            >
              <Play className="mr-2 h-4 w-4" />
              Start Outreach ({approvedCount})
            </Button>
          )}
        </div>
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
          <span className="text-xs text-zinc-400 uppercase tracking-wider font-medium">Batch #2491</span>
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
                const status = approvalStyles[item.approvalStatus];
                const StatusIcon = status.icon;
                return (
                  <tr key={item.id} className="group hover:bg-zinc-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-semibold text-zinc-900">{item.name}</span>
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
                             {/* Uses the new Custom LinkedIn Icon */}
                             <a href={item.linkedinUrl} target="_blank" className="text-zinc-400 hover:text-zinc-900 transition-colors"><LinkedInIcon className="h-3.5 w-3.5" /></a>
                             <a href={item.companyUrl} target="_blank" className="text-zinc-400 hover:text-zinc-900 transition-colors"><ExternalLink className="h-3.5 w-3.5" /></a>
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
                        {/* Reverted Text */}
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
                      <div className="flex justify-end gap-2">
                        {item.approvalStatus === "pending" && (
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
                              className="h-8 w-8 bg-sidebar-primary text-zinc-900 hover:bg-sidebar-primary/80 shadow-sm"
                              onClick={() => handleApprove(item.id)}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                          </>
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
                        <h3 className="text-lg font-semibold text-zinc-900">
                            Edit Generated Content
                        </h3>
                        <p className="text-xs text-zinc-500">Target: {selectedLead.name} — {selectedLead.title}</p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={closeModal} className="h-8 w-8 text-zinc-400 hover:text-zinc-900">
                        <X className="h-5 w-5" />
                    </Button>
                </div>

                <div className="p-6 overflow-y-auto space-y-8 bg-white flex-1">
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-zinc-100 rounded-md"><Mail className="h-4 w-4 text-zinc-900" /></div>
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
                                  className="min-h-[150px] w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-900 resize-y"
                                  value={editForm.contentEmail || ""}
                                  onChange={(e) => handleContentChange("contentEmail", e.target.value)}
                                />
                             </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-zinc-100 rounded-md"><LinkedInIcon className="h-4 w-4 text-zinc-900" /></div>
                                <span className="text-sm font-semibold text-zinc-900">LinkedIn Message</span>
                            </div>
                            <textarea 
                              className="h-full min-h-[120px] w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-900 resize-none"
                              value={editForm.contentLinkedin || ""}
                              onChange={(e) => handleContentChange("contentLinkedin", e.target.value)}
                            />
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-zinc-100 rounded-md"><MessageCircle className="h-4 w-4 text-zinc-900" /></div>
                                <span className="text-sm font-semibold text-zinc-900">WhatsApp</span>
                            </div>
                            <textarea 
                              className="h-full min-h-[120px] w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-900 resize-none"
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
                                onClick={() => {
                                    handleReject(selectedLead.id);
                                    closeModal();
                                }}
                            >
                                Reject
                            </Button>
                            <Button
                                className="bg-zinc-900 text-white hover:bg-zinc-800"
                                onClick={() => {
                                    handleApprove(selectedLead.id, editForm);
                                    closeModal();
                                }}
                            >
                                <Save className="mr-2 h-4 w-4" />
                                Save & Approve
                            </Button>
                        </>
                    ) : (
                        <Button variant="outline" onClick={closeModal} className="min-w-[100px]">
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