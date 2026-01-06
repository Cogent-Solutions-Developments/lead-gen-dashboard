import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Mail, MessageCircle } from "lucide-react";

const campaigns = [
  {
    id: "1",
    name: "12th MICT Forum Qatar",
    status: "active",
    leads: 156,
    contacted: 89,
    replied: 12,
  },
  {
    id: "2",
    name: "AIM Nigeria - Oil & Gas",
    status: "completed",
    leads: 234,
    contacted: 234,
    replied: 45,
  },
  {
    id: "3",
    name: "Global Stadiums Congress",
    status: "paused",
    leads: 78,
    contacted: 32,
    replied: 5,
  },
];

const statusStyles = {
  active: "bg-emerald-100 text-emerald-700",
  completed: "bg-slate-100 text-slate-700",
  paused: "bg-amber-100 text-amber-700",
};

export function RecentCampaigns() {
  return (
    <Card className="p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-slate-900">Recent Campaigns</h3>
        <p className="text-sm text-slate-500">Your latest outreach campaigns</p>
      </div>

      <div className="space-y-4">
        {campaigns.map((campaign) => (
          <div
            key={campaign.id}
            className="rounded-lg border border-slate-100 p-4 hover:bg-slate-50/50 cursor-pointer transition-colors"
          >
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-slate-900">{campaign.name}</h4>
              <Badge className={statusStyles[campaign.status as keyof typeof statusStyles]}>
                {campaign.status}
              </Badge>
            </div>

            <div className="mt-3 flex items-center gap-4 text-sm text-slate-500">
              <div className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                {campaign.leads} leads
              </div>
              <div className="flex items-center gap-1">
                <Mail className="h-4 w-4" />
                {campaign.contacted} contacted
              </div>
              <div className="flex items-center gap-1">
                <MessageCircle className="h-4 w-4" />
                {campaign.replied} replied
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}