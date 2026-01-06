import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, Download, Eye, RefreshCw, Calendar } from "lucide-react";
import Link from "next/link";

const completedCampaigns = [
  {
    id: "1",
    name: "Manufacturing - GCC",
    event: "Gulf Manufacturing Expo",
    completedAt: "Jan 4, 2024",
    leads: 312,
    contacted: 312,
    replied: 67,
    interested: 34,
    replyRate: 21.5,
  },
  {
    id: "2",
    name: "Healthcare Summit",
    event: "MENA Healthcare 2023",
    completedAt: "Dec 28, 2023",
    leads: 189,
    contacted: 189,
    replied: 45,
    interested: 22,
    replyRate: 23.8,
  },
];

export default function CompletedPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Completed</h1>
      <p className="mb-6 text-slate-500">Review your finished campaigns</p>

      <div className="space-y-4">
        {completedCampaigns.map((campaign) => (
          <Card key={campaign.id} className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100">
                  <CheckCircle className="h-6 w-6 text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">{campaign.name}</h3>
                  <p className="text-sm text-slate-500">{campaign.event}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge className="bg-emerald-100 text-emerald-700">Completed</Badge>
                    <span className="flex items-center gap-1 text-sm text-slate-500">
                      <Calendar className="h-3.5 w-3.5" />
                      {campaign.completedAt}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <Link href={`/campaigns/${campaign.id}`}>
                  <Button variant="outline" size="sm">
                    <Eye className="mr-2 h-4 w-4" />
                    View
                  </Button>
                </Link>
                <Button variant="outline" size="sm">
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </Button>
                <Button variant="outline" size="sm">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Re-run
                </Button>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 grid grid-cols-5 gap-4">
              <div>
                <p className="text-sm text-slate-500">Total Leads</p>
                <p className="text-xl font-semibold text-slate-900">{campaign.leads}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Contacted</p>
                <p className="text-xl font-semibold text-slate-900">{campaign.contacted}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Replied</p>
                <p className="text-xl font-semibold text-slate-900">{campaign.replied}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Interested</p>
                <p className="text-xl font-semibold text-emerald-600">{campaign.interested}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Reply Rate</p>
                <p className="text-xl font-semibold text-blue-600">{campaign.replyRate}%</p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}