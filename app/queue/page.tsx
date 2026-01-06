import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Clock, Loader2, Pause, Play, ChevronUp, ChevronDown, X, Rocket } from "lucide-react";

const queueItems = [
  {
    id: "1",
    name: "Oil & Gas Vendors - Nigeria",
    event: "AIM Nigeria 2024",
    status: "processing",
    progress: 67,
    leads: 156,
    estimatedTime: "~12 min remaining",
  },
  {
    id: "2",
    name: "Tech Startups - UAE",
    event: "Dubai Tech Summit",
    status: "queued",
    position: 1,
    leads: 78,
    estimatedTime: "~25 min",
  },
  {
    id: "3",
    name: "Manufacturing - Qatar",
    event: "Qatar Industrial Expo",
    status: "queued",
    position: 2,
    leads: 92,
    estimatedTime: "~40 min",
  },
];

export default function QueuePage() {
  const processingItem = queueItems.find((item) => item.status === "processing");
  const queuedItems = queueItems.filter((item) => item.status === "queued");

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Queue</h1>
      <p className="mb-6 text-slate-500">Manage your campaign processing queue</p>

      {/* Currently Processing */}
      {processingItem && (
        <div className="mb-8">
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase text-slate-500 mb-4">
            <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
            Currently Processing
          </h2>

          <Card className="p-6 border-blue-200 bg-blue-50/30">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-white">
                  <Rocket className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">{processingItem.name}</h3>
                  <p className="text-sm text-slate-600">{processingItem.event}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <Badge className="bg-blue-100 text-blue-700">
                      <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                      Processing
                    </Badge>
                    <span className="text-sm text-slate-500">{processingItem.leads} leads</span>
                    <span className="text-sm text-blue-600 font-medium">{processingItem.estimatedTime}</span>
                  </div>
                </div>
              </div>
              <Button variant="outline">
                <Pause className="mr-2 h-4 w-4" />
                Pause
              </Button>
            </div>

            <div className="mt-6">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-slate-600">Progress</span>
                <span className="font-semibold text-blue-600">{processingItem.progress}%</span>
              </div>
              <Progress value={processingItem.progress} className="h-3" />
              <p className="text-sm text-slate-500 mt-2">104 of 156 leads processed</p>
            </div>
          </Card>
        </div>
      )}

      {/* Queue */}
      {queuedItems.length > 0 && (
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase text-slate-500 mb-4">
            <Clock className="h-4 w-4 text-amber-500" />
            Waiting in Queue ({queuedItems.length})
          </h2>

          <div className="space-y-3">
            {queuedItems.map((item) => (
              <Card key={item.id} className="p-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-sm font-semibold text-amber-700">
                    #{item.position}
                  </div>

                  <div className="flex-1">
                    <h3 className="font-medium text-slate-900">{item.name}</h3>
                    <p className="text-sm text-slate-500">
                      {item.event} · {item.leads} leads
                    </p>
                  </div>

                  <span className="text-sm text-slate-500">{item.estimatedTime}</span>

                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <ChevronUp className="h-4 w-4 text-slate-400" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <ChevronDown className="h-4 w-4 text-slate-400" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <X className="h-4 w-4 text-slate-400" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}