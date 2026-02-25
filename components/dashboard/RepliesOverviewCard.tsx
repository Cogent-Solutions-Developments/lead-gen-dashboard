"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { fetchWhatsAppNotifications, listReplyNotifications } from "@/lib/apiRouter";
import { usePersona } from "@/hooks/usePersona";

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
            <div>
              <span className="block text-5xl font-medium leading-none tracking-tight text-white xl:text-6xl">
                {loading ? "..." : formatCount(totalReplies)}
              </span>
            </div>
          </div>

          <div className="flex shrink-0 flex-col items-end justify-end">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-12 w-12 text-white/55 transition-all duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-white"
            >
              <path d="M7 7h10v10" />
              <path d="M7 17 17 7" />
            </svg>
          </div>
        </div>
      </Card>
    </Link>
  );
}
