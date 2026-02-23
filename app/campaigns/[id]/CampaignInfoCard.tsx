"use client";

import { type ComponentType, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Loader2, MapPin, CalendarDays, Tag, FileText } from "lucide-react";
import { toast } from "sonner";
import { getCampaignInfo } from "@/lib/apiRouter";
import type { CampaignInfo } from "@/lib/api";

function formatDateOnly(value?: string | null) {
  if (!value) return "Not set";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

type InfoItemProps = {
  label: string;
  value?: string | null;
  icon: ComponentType<{ className?: string }>;
};

function InfoItem({ label, value, icon: Icon }: InfoItemProps) {
  return (
    <div className="rounded-xl border border-zinc-200/90 bg-white/84 px-3 py-2.5">
      <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className="truncate text-sm font-medium text-zinc-900">{value?.trim() || "Not set"}</p>
    </div>
  );
}

export default function CampaignInfoCard({ campaignId }: { campaignId: string }) {
  const [loading, setLoading] = useState(true);
  const [info, setInfo] = useState<CampaignInfo | null>(null);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        const res = await getCampaignInfo(campaignId);
        if (!alive) return;
        setInfo(res.info);
      } catch (e: unknown) {
        const description = e instanceof Error ? e.message : "Failed to load campaign info";
        toast.error("Campaign info error", { description });
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [campaignId]);

  return (
    <Card className="relative isolate overflow-hidden rounded-2xl border border-[rgb(255_255_255_/_0.82)] bg-[linear-gradient(160deg,rgba(255,255,255,0.84)_0%,rgba(250,252,255,0.66)_56%,rgba(240,246,253,0.56)_100%)] p-4 backdrop-blur-[14px] [backdrop-filter:saturate(170%)_blur(14px)] shadow-[0_0_0_1px_rgba(255,255,255,0.82),0_0_12px_-9px_rgba(2,10,27,0.58),0_0_6px_-5px_rgba(15,23,42,0.36),inset_0_1px_0_rgba(255,255,255,1),inset_0_-2px_0_rgba(221,230,244,0.74)]">
      <div className="pointer-events-none absolute -right-14 -top-14 h-28 w-28 rounded-full bg-gradient-to-br from-sky-300/24 via-blue-500/8 to-transparent blur-2xl" />

      <div className="relative z-[2] flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Campaign Info</p>
          <p className="mt-1 text-xs text-zinc-500">Saved metadata used for category-based output paths.</p>
        </div>
        {loading ? <Loader2 className="h-4 w-4 animate-spin text-zinc-500" /> : null}
      </div>

      <div className="relative z-[2] mt-4 flex items-center gap-2">
        <Badge className="rounded-full border border-blue-200/80 bg-blue-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-blue-700 shadow-none">
          <Tag className="mr-1.5 h-3 w-3" />
          {info?.category?.trim() || "No Category"}
        </Badge>
      </div>

      <div className="relative z-[2] mt-3 grid gap-2 md:grid-cols-2">
        <InfoItem label="Name" value={info?.name} icon={FileText} />
        <InfoItem label="Location" value={info?.location} icon={MapPin} />
        <InfoItem label="Date" value={formatDateOnly(info?.date)} icon={CalendarDays} />
        <InfoItem label="Updated" value={formatDateOnly(info?.updatedAt)} icon={CalendarDays} />
      </div>
    </Card>
  );
}
