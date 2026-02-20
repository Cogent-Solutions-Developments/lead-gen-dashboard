"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { fetchWhatsAppNotifications, listReplyNotifications } from "@/lib/apiRouter";
import { usePersona } from "@/hooks/usePersona";

function formatCount(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

export function RepliesOverviewCard() {
  const [totalReplies, setTotalReplies] = useState(0);
  const [unreadReplies, setUnreadReplies] = useState(0);
  const [loading, setLoading] = useState(true);
  const { persona } = usePersona();

  useEffect(() => {
    let alive = true;

    const load = async () => {
      try {
        const [allNotifications, unreadNotifications, repliesMeta] = await Promise.allSettled([
          fetchWhatsAppNotifications({ limit: 200, unreadOnly: false }),
          fetchWhatsAppNotifications({ limit: 200, unreadOnly: true }),
          listReplyNotifications({ limit: 1 }),
        ]);
        if (!alive) return;

        let total = 0;
        let unread = 0;
        let hasUnreadMeta = false;

        if (allNotifications.status === "fulfilled") {
          total = allNotifications.value.notifications.length;
        }

        if (repliesMeta.status === "fulfilled") {
          total = Math.max(total, repliesMeta.value.total || 0, repliesMeta.value.replies?.length || 0);
          unread = repliesMeta.value.unread || 0;
          hasUnreadMeta = true;
        }

        if (!hasUnreadMeta && unreadNotifications.status === "fulfilled") {
          unread = unreadNotifications.value.notifications.length;
        }

        setTotalReplies(total);
        setUnreadReplies(unread);
      } catch (error) {
        if (!alive) return;
        setTotalReplies(0);
        setUnreadReplies(0);
        console.warn("Failed to load replies overview", error);
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    };

    void load();
    const timer = setInterval(() => {
      void load();
    }, 15000);

    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [persona]);

  return (
    <Link href="/replies" className="block h-full">
      <Card className="btn-sidebar-noise group relative flex h-full min-h-[5.5rem] flex-col justify-between gap-0 rounded-2xl p-4">
        <div className="pointer-events-none absolute -right-8 -top-10 h-24 w-24 rounded-full bg-white/18 blur-2xl" />
        <div className="relative z-[2] flex h-full items-stretch justify-between gap-3">
          <div className="flex min-w-0 flex-1 flex-col justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/76">
              Total Replies
            </p>
            <div className="space-y-0.5">
              <span className="block text-4xl font-semibold leading-none tracking-tight text-white xl:text-5xl">
                {loading ? "..." : formatCount(totalReplies)}
              </span>
              <span className="block text-xs font-medium text-white/75">
                {formatCount(unreadReplies)} unread
              </span>
            </div>
          </div>

          <div className="flex shrink-0 flex-col items-end justify-end">
            <div className="flex items-center gap-2">
              <span className="h-px w-8 bg-white/45 transition-all duration-200 group-hover:w-12 group-hover:bg-white/80" />
              <ArrowUpRight className="h-7 w-7 text-white opacity-70 hover:opacity-100 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </div>
            <span className="mt-1 h-0.5 w-16 origin-left bg-gradient-to-r from-white/75 via-white/35 to-transparent transition-all duration-200 group-hover:w-20" />
          </div>
        </div>
      </Card>
    </Link>
  );
}
