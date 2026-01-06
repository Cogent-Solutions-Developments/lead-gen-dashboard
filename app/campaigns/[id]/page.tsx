"use client";

import { useState } from "react";
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
  Linkedin,
  FileCheck,
  XCircle,
  Eye,
  Check,
  X,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

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
    contentEmail: "Dear Ahmed,\n\nGiven your role at Petro Solutions...",
    contentLinkedin: "Hi Ahmed, saw your work in oil and gas sales.",
    contentWhatsapp: "Hi Ahmed, quick question about MICT Forum.",
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
    contentEmail: "Dear Sarah,\n\nWith your marketing expertise...",
    contentLinkedin: "Hi Sarah, your brand campaigns caught my eye.",
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
    contentEmail: "Dear Mohammed,\n\nYour BD experience makes you ideal.",
    contentLinkedin: "Hi Mohammed, impressive BD track record.",
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
    contentEmail: "Dear James,\n\nAs Regional Director, you would benefit.",
    contentLinkedin: "Hi James, your regional expertise is impressive.",
    contentWhatsapp: "Hi James, quick question about MICT Forum.",
    approvalStatus: "rejected",
  },
];

const approvalStyles = {
  pending: { bg: "bg-amber-100 text-amber-700", icon: Clock },
  approved: { bg: "bg-emerald-100 text-emerald-700", icon: CheckCircle },
  rejected: { bg: "bg-red-100 text-red-700", icon: XCircle },
};

export default function CampaignDetailPage() {
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  const pendingCount = leads.filter((l) => l.approvalStatus === "pending").length;
  const approvedCount = leads.filter((l) => l.approvalStatus === "approved").length;
  const rejectedCount = leads.filter((l) => l.approvalStatus === "rejected").length;

  const handleApprove = (id: string) => {
    setLeads((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, approvalStatus: "approved" as const } : item
      )
    );
    toast.success("Lead approved");
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
  };

  return (
    <div>
      <Link
        href="/campaigns"
        className="inline-flex items-center text-sm text-slate-500 hover:text-slate-700 mb-4"
      >
        <ArrowLeft className="mr-1 h-4 w-4" />
        Back to Campaigns
      </Link>

      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">
              12th MICT Forum Qatar
            </h1>
            <Badge className="bg-amber-100 text-amber-700">Pending Approval</Badge>
          </div>
          <p className="text-slate-500">Oil and Gas Vendors Campaign</p>
        </div>
        <div className="flex gap-2">
          {pendingCount > 0 && (
            <Button variant="outline" onClick={handleApproveAll}>
              <Check className="mr-2 h-4 w-4" />
              Approve All ({pendingCount})
            </Button>
          )}
          {approvedCount > 0 && (
            <Button
              onClick={handleStartOutreach}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Play className="mr-2 h-4 w-4" />
              Start Outreach ({approvedCount})
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-100 p-2">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Total Leads</p>
              <p className="text-2xl font-bold text-slate-900">{leads.length}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-amber-100 p-2">
              <FileCheck className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Pending</p>
              <p className="text-2xl font-bold text-slate-900">{pendingCount}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-emerald-100 p-2">
              <CheckCircle className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Approved</p>
              <p className="text-2xl font-bold text-slate-900">{approvedCount}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-red-100 p-2">
              <XCircle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Rejected</p>
              <p className="text-2xl font-bold text-slate-900">{rejectedCount}</p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">Leads and Content Approval</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Employee</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Contact</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Links</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Content</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Status</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((item) => {
                const status = approvalStyles[item.approvalStatus];
                const StatusIcon = status.icon;
                return (
                  <tr key={item.id} className="border-t border-slate-50 hover:bg-slate-50/50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{item.name}</p>
                      <p className="text-sm text-slate-500">{item.title}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-slate-600">{item.email}</p>
                      <p className="text-sm text-slate-500">{item.phone}</p>
                    </td>
                    <td className="px-4 py-3">
                      <a href={item.linkedinUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline block">
                        LinkedIn
                      </a>
                      <a href={item.companyUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline block">
                        {item.company}
                      </a>
                    </td>
                    <td className="px-4 py-3">
                      <Button variant="ghost" size="sm" onClick={() => setSelectedLead(item)}>
                        <Eye className="mr-1 h-4 w-4" />
                        Preview
                      </Button>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={status.bg}>
                        <StatusIcon className="mr-1 h-3 w-3" />
                        {item.approvalStatus}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        {item.approvalStatus === "pending" && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-emerald-600 hover:bg-emerald-50"
                              onClick={() => handleApprove(item.id)}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-600 hover:bg-red-50"
                              onClick={() => handleReject(item.id)}
                            >
                              <X className="h-4 w-4" />
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

      {selectedLead !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-auto">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-semibold">
                Content Preview - {selectedLead.name}
              </h3>
              <Button variant="ghost" size="icon" onClick={closeModal}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Mail className="h-4 w-4 text-blue-600" />
                  <h4 className="font-medium text-slate-900">Email</h4>
                </div>
                <Card className="p-4 bg-slate-50">
                  <p className="text-sm font-medium text-slate-700 mb-2">
                    Subject: {selectedLead.contentEmailSubject}
                  </p>
                  <p className="text-sm text-slate-600 whitespace-pre-wrap">
                    {selectedLead.contentEmail}
                  </p>
                </Card>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Linkedin className="h-4 w-4 text-blue-600" />
                  <h4 className="font-medium text-slate-900">LinkedIn</h4>
                </div>
                <Card className="p-4 bg-slate-50">
                  <p className="text-sm text-slate-600">{selectedLead.contentLinkedin}</p>
                </Card>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-2">
                  <MessageCircle className="h-4 w-4 text-emerald-600" />
                  <h4 className="font-medium text-slate-900">WhatsApp</h4>
                </div>
                <Card className="p-4 bg-slate-50">
                  <p className="text-sm text-slate-600">{selectedLead.contentWhatsapp}</p>
                </Card>
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 flex justify-end gap-2">
              {selectedLead.approvalStatus === "pending" ? (
                <>
                  <Button
                    variant="outline"
                    onClick={() => {
                      handleReject(selectedLead.id);
                      closeModal();
                    }}
                  >
                    <X className="mr-2 h-4 w-4" />
                    Reject
                  </Button>
                  <Button
                    className="bg-emerald-600 hover:bg-emerald-700"
                    onClick={() => {
                      handleApprove(selectedLead.id);
                      closeModal();
                    }}
                  >
                    <Check className="mr-2 h-4 w-4" />
                    Approve
                  </Button>
                </>
              ) : (
                <Button variant="outline" onClick={closeModal}>
                  Close
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}