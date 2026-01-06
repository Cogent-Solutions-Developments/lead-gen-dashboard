import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Users, Mail, MessageCircle, Rocket } from "lucide-react";
import Link from "next/link";

const campaigns = [
  {
    id: "1",
    name: "Oil & Gas Vendors - Nigeria",
    event: "AIM Nigeria 2024",
    status: "active",
    leads: 156,
    contacted: 89,
    replied: 12,
    progress: 57,
  },
  {
    id: "2",
    name: "12th MICT Forum Qatar",
    event: "MICT Forum",
    status: "active",
    leads: 234,
    contacted: 156,
    replied: 28,
    progress: 67,
  },
  {
    id: "3",
    name: "Tech Startups - UAE",
    event: "Dubai Tech Summit",
    status: "queued",
    leads: 78,
    contacted: 0,
    replied: 0,
    progress: 0,
  },
  {
    id: "4",
    name: "Manufacturing - GCC",
    event: "Gulf Manufacturing Expo",
    status: "completed",
    leads: 312,
    contacted: 312,
    replied: 67,
    progress: 100,
  },
];

const statusStyles = {
  active: "bg-emerald-100 text-emerald-700",
  completed: "bg-slate-100 text-slate-700",
  paused: "bg-amber-100 text-amber-700",
  queued: "bg-blue-100 text-blue-700",
};

export default function CampaignsPage() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Campaigns</h1>
          <p className="text-slate-500">Manage your outreach campaigns</p>
        </div>
        <Link href="/campaigns/new">
          <Button className="bg-blue-600 hover:bg-blue-700">
            <Plus className="mr-2 h-4 w-4" />
            New Campaign
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {campaigns.map((campaign) => (
          <Link key={campaign.id} href={`/campaigns/${campaign.id}`}>
            <Card className="p-5 hover:shadow-md transition-shadow cursor-pointer">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                    <Rocket className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">{campaign.name}</h3>
                    <p className="text-sm text-slate-500">{campaign.event}</p>
                  </div>
                </div>
              </div>

              <Badge className={statusStyles[campaign.status as keyof typeof statusStyles]}>
                {campaign.status}
              </Badge>

              {campaign.status !== "queued" && (
                <div className="mt-4">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-500">Progress</span>
                    <span className="font-medium">{campaign.progress}%</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-600 rounded-full"
                      style={{ width: `${campaign.progress}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-lg font-semibold text-slate-900">{campaign.leads}</p>
                  <p className="text-xs text-slate-500">Leads</p>
                </div>
                <div>
                  <p className="text-lg font-semibold text-slate-900">{campaign.contacted}</p>
                  <p className="text-xs text-slate-500">Contacted</p>
                </div>
                <div>
                  <p className="text-lg font-semibold text-slate-900">{campaign.replied}</p>
                  <p className="text-xs text-slate-500">Replied</p>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}