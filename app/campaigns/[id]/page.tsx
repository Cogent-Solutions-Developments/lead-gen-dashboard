import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft,
  Play,
  Pause,
  Users,
  Mail,
  MessageCircle,
  CheckCircle,
  Clock,
  Linkedin,
} from "lucide-react";
import Link from "next/link";

const leads = [
  {
    id: "1",
    name: "Ahmed Al-Rashid",
    title: "Sales Director",
    company: "Petro Solutions LLC",
    status: "interested",
    lastAction: "Replied to email",
  },
  {
    id: "2",
    name: "Sarah Johnson",
    title: "VP Marketing",
    company: "Gulf Energy Corp",
    status: "contacted",
    lastAction: "Email sent",
  },
  {
    id: "3",
    name: "Mohammed Hassan",
    title: "BD Manager",
    company: "Oilfield Services Co",
    status: "replied",
    lastAction: "LinkedIn replied",
  },
  {
    id: "4",
    name: "James Wilson",
    title: "Regional Director",
    company: "Energy Partners Int",
    status: "pending",
    lastAction: "Not contacted yet",
  },
];

const statusStyles = {
  pending: { bg: "bg-slate-100 text-slate-700", icon: Clock },
  contacted: { bg: "bg-blue-100 text-blue-700", icon: Mail },
  replied: { bg: "bg-amber-100 text-amber-700", icon: MessageCircle },
  interested: { bg: "bg-emerald-100 text-emerald-700", icon: CheckCircle },
};

export default function CampaignDetailPage({ params }: { params: { id: string } }) {
  return (
    <div>
      <Link href="/campaigns" className="inline-flex items-center text-sm text-slate-500 hover:text-slate-700 mb-4">
        <ArrowLeft className="mr-1 h-4 w-4" />
        Back to Campaigns
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">12th MICT Forum Qatar</h1>
            <Badge className="bg-emerald-100 text-emerald-700">Active</Badge>
          </div>
          <p className="text-slate-500">Oil & Gas Vendors Campaign</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Pause className="mr-2 h-4 w-4" />
            Pause
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-100 p-2">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Total Leads</p>
              <p className="text-2xl font-bold text-slate-900">156</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-amber-100 p-2">
              <Mail className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Contacted</p>
              <p className="text-2xl font-bold text-slate-900">89</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-emerald-100 p-2">
              <MessageCircle className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Replied</p>
              <p className="text-2xl font-bold text-slate-900">23</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-violet-100 p-2">
              <CheckCircle className="h-5 w-5 text-violet-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Interested</p>
              <p className="text-2xl font-bold text-slate-900">12</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Progress */}
      <Card className="p-4 mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-slate-500">Campaign Progress</span>
          <span className="text-sm font-medium">57%</span>
        </div>
        <Progress value={57} className="h-2" />
        <p className="text-sm text-slate-500 mt-2">89 of 156 leads contacted</p>
      </Card>

      {/* Leads Table */}
      <Card className="overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">Leads</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Lead</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Company</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Status</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Last Action</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => {
                const status = statusStyles[lead.status as keyof typeof statusStyles];
                const StatusIcon = status.icon;
                return (
                  <tr key={lead.id} className="border-t border-slate-50 hover:bg-slate-50/50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{lead.name}</p>
                      <p className="text-sm text-slate-500">{lead.title}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{lead.company}</td>
                    <td className="px-4 py-3">
                      <Badge className={status.bg}>
                        <StatusIcon className="mr-1 h-3 w-3" />
                        {lead.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500">{lead.lastAction}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Mail className="h-4 w-4 text-slate-400" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Linkedin className="h-4 w-4 text-slate-400" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}