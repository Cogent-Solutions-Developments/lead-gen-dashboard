"use client";

import Link from "next/link";
import { ArrowLeft, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function AdminContentPromptsPage() {
  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <Link
          href="/admin"
          className="inline-flex items-center text-xs font-semibold text-zinc-500 transition-colors hover:text-zinc-950"
        >
          <ArrowLeft className="mr-2 h-3.5 w-3.5" />
          Admin dashboard
        </Link>
        <p className="admin-eyebrow mt-4">Admin Control</p>
        <h1 className="admin-title">Content Prompts</h1>
        <p className="admin-description">
          Placeholder surface for prompt operations until the backend exposes the supported prompt-management API.
        </p>
      </div>

      <Card className="admin-card max-w-3xl p-6">
        <div className="flex items-start gap-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-zinc-300 bg-zinc-50 text-zinc-700">
            <FileText className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Content Prompts</h1>
            <p className="mt-2 text-sm leading-relaxed text-zinc-500">
              This admin surface is not enabled by the current backend API. Event Registry now uses only the supported
              event fields: name, location, date, status, key, and logo.
            </p>
            <Link href="/admin/events" className="mt-5 inline-flex">
              <Button
                type="button"
                variant="outline"
                className="h-10 border-zinc-300 bg-white px-4 text-zinc-700 hover:bg-zinc-50"
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
