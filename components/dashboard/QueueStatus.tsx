import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Clock, Loader2 } from "lucide-react";

const queueItems = [
  {
    id: "1",
    name: "Oil & Gas Vendors - Nigeria",
    status: "processing",
    progress: 67,
    leads: 45,
  },
  {
    id: "2",
    name: "Tech Startups - UAE",
    status: "queued",
    position: 1,
    leads: 32,
  },
  {
    id: "3",
    name: "Manufacturing - Qatar",
    status: "queued",
    position: 2,
    leads: 28,
  },
];

export function QueueStatus() {
  return (
    <Card className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900">Queue Status</h3>
        <Badge variant="outline" className="bg-blue-50 text-blue-700">
          1 Active
        </Badge>
      </div>

      <div className="space-y-4">
        {queueItems.map((item) => (
          <div
            key={item.id}
            className="rounded-lg border border-slate-100 bg-slate-50/50 p-4"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 rounded-lg bg-white p-2 shadow-sm">
                  {item.status === "processing" ? (
                    <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
                  ) : (
                    <Clock className="h-4 w-4 text-amber-500" />
                  )}
                </div>
                <div>
                  <p className="font-medium text-slate-900">{item.name}</p>
                  <p className="text-sm text-slate-500">
                    {item.leads} leads
                    {item.position && ` · Position #${item.position}`}
                  </p>
                </div>
              </div>
              <Badge
                className={
                  item.status === "processing"
                    ? "bg-blue-100 text-blue-700"
                    : "bg-amber-100 text-amber-700"
                }
              >
                {item.status === "processing" ? "Processing" : "Queued"}
              </Badge>
            </div>

            {item.status === "processing" && (
              <div className="mt-3">
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="text-slate-500">Progress</span>
                  <span className="font-medium text-slate-700">{item.progress}%</span>
                </div>
                <Progress value={item.progress} className="h-2" />
              </div>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}