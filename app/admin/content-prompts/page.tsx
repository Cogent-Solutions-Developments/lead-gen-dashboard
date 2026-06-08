"use client";

import Link from "next/link";
import { ArrowLeft, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function AdminContentPromptsPage() {
  return (
    <div className="flex min-h-[calc(100dvh-3rem)] flex-col bg-transparent p-1 font-sans">
      <Link
        href="/admin"
        className="inline-flex w-fit items-center text-xs font-semibold text-zinc-500 transition-colors hover:text-zinc-100"
      >
        <ArrowLeft className="mr-2 h-3.5 w-3.5" />
        Admin dashboard
      </Link>

      <Card className="mt-5 max-w-3xl rounded-[1.75rem] border border-white/18 bg-[#111722]/72 p-6 text-zinc-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_28px_80px_-52px_rgba(2,10,27,0.95)] backdrop-blur-[28px]">
        <div className="flex items-start gap-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/18 bg-white/[0.06] text-zinc-200">
            <FileText className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">Content Prompts</h1>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">
              This admin surface is not enabled by the current backend API. Event Registry now uses the supported event
              fields: name, location, date, status, key, and logo.
            </p>
            <Link href="/admin/events" className="mt-5 inline-flex">
              <Button
                type="button"
                variant="outline"
                className="h-10 rounded-full border-white/18 bg-white/[0.06] px-4 text-zinc-100 hover:border-blue-500 hover:bg-blue-600 hover:text-white"
              >
                Open Event Registry
              </Button>
            </Link>
          </div>
        </div>
      </Card>
    </div>
  );
}
