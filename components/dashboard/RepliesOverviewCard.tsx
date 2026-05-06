"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { fetchWhatsAppNotifications, listReplyNotifications } from "@/lib/apiRouter";
import { usePersona } from "@/hooks/usePersona";
import { ArrowUpRight } from "lucide-react";

const REPLIES_OVERVIEW_POLL_MS = 30000;

function formatCount(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

export function RepliesOverviewCard() {
  const [totalReplies, setTotalReplies] = useState(0);
  const [loading, setLoading] = useState(true);
  const { persona } = usePersona();

  useEffect(() => {
    let alive = true;

    const load = async () => {
      if (typeof document !== "undefined" && document.visibilityState !== "visible") {
        return;
      }

      try {
        const [allNotifications, repliesMeta] = await Promise.allSettled([
          fetchWhatsAppNotifications({ limit: 200, unreadOnly: false }),
          listReplyNotifications({ limit: 1 }),
        ]);
        if (!alive) return;

        let total = 0;

        if (allNotifications.status === "fulfilled") {
          total = allNotifications.value.notifications.length;
        }

        if (repliesMeta.status === "fulfilled") {
          total = Math.max(total, repliesMeta.value.total || 0, repliesMeta.value.replies?.length || 0);
        }

        setTotalReplies(total);
      } catch (error) {
        if (!alive) return;
        setTotalReplies(0);
        console.warn("Failed to load replies overview", error);
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    };

    void load();
    const timer = setInterval(() => {
      void load();
    }, REPLIES_OVERVIEW_POLL_MS);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void load();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      alive = false;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [persona]);

  return (
    <Link href="/replies" className="block h-full">
      <Card className="group relative flex h-full min-h-[5.5rem] flex-col justify-between gap-0 rounded-none border-0 border-b border-zinc-200 bg-transparent p-0 pb-6 shadow-none transition-colors hover:border-zinc-950">
        <div className="relative z-[2] flex h-full items-stretch justify-between gap-3">
          <div className="flex min-w-0 flex-1 flex-col justify-between">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">
              Total Replies
            </p>
            <div className="mt-4">
              <span className="block text-5xl font-light leading-none tracking-tighter text-zinc-950 xl:text-6xl">
                {loading ? "..." : formatCount(totalReplies)}
              </span>
            </div>
          </div>

          <div className="flex shrink-0 flex-col items-end justify-end">
            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-zinc-100 bg-white text-zinc-400 transition-all group-hover:border-zinc-900 group-hover:bg-zinc-950 group-hover:text-white">
              <ArrowUpRight className="h-6 w-6" />
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}