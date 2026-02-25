"use client";

import { useEffect, useState, type ComponentType, type SVGProps } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { getDashboardStats, type DashboardStats } from "@/lib/apiRouter";
import { toast } from "sonner";
import { usePersona } from "@/hooks/usePersona";
import { cn } from "@/lib/utils";

type WatermarkStyle = {
  sizeClass: string;
  rotationClass: string;
  positionClass: string;
  toneClass: string;
};

type StatItem = {
  name: string;
  value: string;
  label: string;
  accentClass: string;
  icon: ComponentType<{ className?: string }>;
  watermark: WatermarkStyle;
};

function RocketFill(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 16 16" {...props}>
      <g fill="currentColor">
        <path d="M10.175 1.991c.81 1.312 1.583 3.43 1.778 6.819l1.5 1.83A2.5 2.5 0 0 1 14 12.202V15.5a.5.5 0 0 1-.9.3l-1.125-1.5c-.166-.222-.42-.4-.752-.57c-.214-.108-.414-.192-.627-.282l-.196-.083C9.7 13.793 8.85 14 8 14c-.85 0-1.7-.207-2.4-.635c-.068.03-.133.057-.198.084c-.211.089-.411.173-.625.281c-.332.17-.586.348-.752.57L2.9 15.8a.5.5 0 0 1-.9-.3v-3.298a2.5 2.5 0 0 1 .548-1.562l.004-.005L4.049 8.81c.197-3.323.969-5.434 1.774-6.756c.466-.767.94-1.262 1.31-1.57a3.67 3.67 0 0 1 .601-.41A.549.549 0 0 1 8 0c.101 0 .17.027.25.064c.037.017.086.041.145.075c.118.066.277.167.463.315c.373.297.85.779 1.317 1.537ZM9.5 6c0-1.105-.672-2-1.5-2s-1.5.895-1.5 2S7.172 8 8 8s1.5-.895 1.5-2Z" />
        <path d="M8 14.5c.5 0 .999-.046 1.479-.139L8.4 15.8a.5.5 0 0 1-.8 0l-1.079-1.439c.48.093.98.139 1.479.139Z" />
      </g>
    </svg>
  );
}

function UsersFill(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 48 48" {...props}>
      <path
        fill="currentColor"
        d="M17 24c3.867 0 7-3.133 7-7s-3.133-7-7-7s-7 3.133-7 7s3.133 7 7 7Zm22-3.5c0 3.039-2.461 5.5-5.5 5.5a5.499 5.499 0 0 1-5.5-5.5c0-3.039 2.461-5.5 5.5-5.5s5.5 2.461 5.5 5.5ZM17 26c2.734 0 7.183.851 10.101 2.545C28.293 29.758 29 31.081 29 32.4V38H4v-5.6c0-4.256 8.661-6.4 13-6.4Zm27 12H31v-5.6c0-1.416-.511-2.72-1.324-3.883c1.541-.345 3.058-.517 4.217-.517C37.62 28 44 29.787 44 33.333V38Z"
      />
    </svg>
  );
}

function FileCheckFill(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 26 26" {...props}>
      <path
        fill="currentColor"
        d="m25.76 13.861l-1.519-2.396l.901-2.689a.813.813 0 0 0-.365-.962l-2.458-1.417l-.452-2.8a.816.816 0 0 0-.771-.683l-2.835-.111L16.56.533a.811.811 0 0 0-.999-.246L13 1.505L10.438.286a.815.815 0 0 0-.999.247l-1.701 2.27l-2.835.111a.813.813 0 0 0-.77.682l-.452 2.8l-2.458 1.417a.813.813 0 0 0-.366.962l.901 2.689L.24 13.861a.814.814 0 0 0 .125 1.022l2.047 1.963l-.23 2.826a.814.814 0 0 0 .584.848l2.725.785L6.6 23.916a.81.81 0 0 0 .911.479l2.78-.57l2.194 1.797c.149.121.332.184.515.184s.365-.063.515-.184l2.194-1.797l2.78.57c.377.08.76-.123.911-.479l1.109-2.611l2.725-.785a.813.813 0 0 0 .584-.848l-.23-2.826l2.047-1.963a.814.814 0 0 0 .125-1.022zM18.877 9.95l-5.691 8.526c-.215.318-.548.531-.879.531c-.33 0-.699-.185-.934-.421l-4.178-4.245a.752.752 0 0 1 0-1.05l1.031-1.05a.727.727 0 0 1 1.031 0l2.719 2.762l4.484-6.718a.724.724 0 0 1 1.014-.196l1.209.831c.333.23.419.693.194 1.03z"
      />
    </svg>
  );
}

function SendFill(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 14 14" {...props}>
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M11.821.098a1.62 1.62 0 0 1 2.077 2.076l-3.574 10.712a1.62 1.62 0 0 1-1.168 1.069a1.599 1.599 0 0 1-1.52-.434l-1.918-1.909l-2.014 1.042a.5.5 0 0 1-.73-.457l.083-3.184l7.045-5.117a.625.625 0 1 0-.735-1.012L2.203 8.088l-1.73-1.73a1.6 1.6 0 0 1-.437-1.447a1.62 1.62 0 0 1 1.069-1.238h.003L11.82.097Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function formatMetric(value?: number) {
  return new Intl.NumberFormat("en-US").format(value ?? 0);
}

export function StatsCards() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const { persona } = usePersona();

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const data = await getDashboardStats();
        if (!alive) return;
        setStats(data);
      } catch (err: unknown) {
        if (!alive) return;
        const message = err instanceof Error ? err.message : "Unknown error";
        toast.error("Failed to load dashboard stats", { description: message });
        setStats(null);
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [persona]);

  const cards: StatItem[] = [
    {
      name: "Active Campaigns",
      value: loading ? "..." : formatMetric(stats?.activeCampaigns),
      label: "Running now",
      accentClass: "from-sky-300/28 to-blue-600/8",
      icon: RocketFill,
      watermark: {
        sizeClass: "h-[9rem] w-[9rem]",
        rotationClass: "rotate-[40deg]",
        positionClass: "-right-10 top-[4.6rem] -translate-y-1/2",
        toneClass: "text-blue-300/20",
      },
    },
    {
      name: "Total Leads",
      value: loading ? "..." : formatMetric(stats?.totalLeads),
      label: "Scraped so far",
      accentClass: "from-blue-300/28 to-indigo-600/9",
      icon: UsersFill,
      watermark: {
        sizeClass: "h-[13rem] w-[13rem]",
        rotationClass: "rotate-[10deg]",
        positionClass: "-right-13 top-[70%] -translate-y-1/2",
        toneClass: "text-blue-300/20",
      },
    },
    {
      name: "Pending Review",
      value: loading ? "..." : formatMetric(stats?.pendingReview),
      label: "Needs approval",
      accentClass: "from-cyan-300/26 to-blue-700/9",
      icon: FileCheckFill,
      watermark: {
        sizeClass: "h-[8.5rem] w-[8.5rem]",
        rotationClass: "rotate-[18deg]",
        positionClass: "-right-10 top-[60%] -translate-y-1/2",
        toneClass: "text-blue-300/20",
      },
    },
    {
      name: "Leads Contacted",
      value: loading ? "..." : formatMetric(stats?.leadsContacted),
      label: "Outreach sent",
      accentClass: "from-indigo-300/28 to-blue-700/9",
      icon: SendFill,
      watermark: {
        sizeClass: "h-[9rem] w-[9rem]",
        rotationClass: "rotate-[10deg]",
        positionClass: "-right-6 top-[60%] -translate-y-1/2",
        toneClass: "text-blue-300/20",
      },
    },
  ];

  return (
    <div className="grid h-full grid-cols-4 gap-2.5">
      {cards.map((stat, index) => (
        <motion.div
          key={stat.name}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1, duration: 0.4 }}
          className="h-full"
        >
          <Card className="stats-premium-card group relative h-full overflow-hidden rounded-2xl p-2.5">
            <div
              className={`pointer-events-none absolute -right-10 -top-14 h-32 w-32 rounded-full bg-gradient-to-br blur-2xl ${stat.accentClass}`}
            />
            <div className={cn("pointer-events-none absolute", stat.watermark.positionClass)}>
              <stat.icon
                className={cn(
                  stat.watermark.sizeClass,
                  stat.watermark.rotationClass,
                  stat.watermark.toneClass
                )}
              />
            </div>

            <div className="relative z-10 flex h-full flex-col">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500/90">
                {stat.name}
              </span>

              <div className="mt-auto space-y-0.5">
                <span className="block text-3xl font-semibold tracking-tight text-zinc-900 xl:text-4xl">
                  {stat.value}
                </span>
                <p className="text-[11px] font-medium text-zinc-500">{stat.label}</p>
              </div>
            </div>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}
