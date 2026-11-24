"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChevronRight, Linkedin, Loader2, Plus, RefreshCw } from "lucide-react";
import { CampaignPageHeader } from "@/components/campaigns/CampaignListPresentation";
import { Button } from "@/components/ui/button";
import { AddLinkedInPageDialog } from "@/components/linkedin/AddLinkedInPageDialog";
import { linkedInPageError, type LinkedInPage } from "@/lib/linkedinPages";
import { listLinkedInPages } from "@/lib/linkedinPagesApi";

export default function LinkedInOutreachPage() {
  const [showAddPage, setShowAddPage] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [result, setResult] = useState<{ items: LinkedInPage[]; loading: boolean; error: string | null }>({ items: [], loading: true, error: null });
  const sequence = useRef(0);

  useEffect(() => {
    const controller = new AbortController();
    const request = ++sequence.current;
    listLinkedInPages(controller.signal).then(
      (items) => { if (!controller.signal.aborted && request === sequence.current) setResult({ items, loading: false, error: null }); },
      (error) => { if (!controller.signal.aborted && request === sequence.current) setResult((current) => ({ ...current, loading: false, error: linkedInPageError(error) })); },
    );
    return () => controller.abort();
  }, [reloadKey]);

  function reloadPages() {
    setResult((current) => ({ ...current, loading: true, error: null }));
    setReloadKey((value) => value + 1);
  }

  function handlePageSaved(page: LinkedInPage) {
    sequence.current++;
    setResult((current) => ({ items: [...current.items.filter((item) => item.id !== page.id), page], loading: true, error: null }));
    setReloadKey((value) => value + 1);
  }

  return (
    <div className="space-y-6 p-1 font-sans">
      <CampaignPageHeader
        title="LinkedIn"
        description="Select a LinkedIn page to manage its leads."
      >
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" disabled={result.loading} onClick={reloadPages}>
            <RefreshCw className={`size-4 ${result.loading ? "animate-spin" : ""}`} aria-hidden="true" />Refresh
          </Button>
          <Button type="button" onClick={() => setShowAddPage(true)}>
            <Plus className="size-4" aria-hidden="true" />Add Page
          </Button>
        </div>
      </CampaignPageHeader>
      {result.error && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300"><span>{result.error}</span><Button type="button" variant="outline" onClick={reloadPages}>Retry</Button></div>}
      {result.loading && !result.items.length && <p role="status" className="inline-flex items-center gap-2 py-8 text-sm text-zinc-500"><Loader2 className="size-4 animate-spin" aria-hidden="true" />Loading LinkedIn pages…</p>}
      {!result.loading && !result.error && !result.items.length && <div className="rounded-2xl border border-dashed border-zinc-300 p-10 text-center dark:border-zinc-700"><h2 className="text-lg font-medium">No LinkedIn pages yet</h2><p className="mt-2 text-sm text-zinc-500">Add your first page to get started.</p><Button type="button" className="mt-5" onClick={() => setShowAddPage(true)}>Add Page</Button></div>}
      <section aria-label="LinkedIn pages" className="grid gap-4 md:grid-cols-2">
        {result.items.map((page) => (
          <Link
            key={page.id}
            href={`/admin/lead-intelligence/linkedin/${page.id}`}
            aria-label={`Select ${page.name}`}
            className="group flex min-h-56 min-w-0 flex-col rounded-2xl border border-zinc-300/80 bg-white/32 p-6 backdrop-blur-[8px] transition-colors hover:border-blue-400 hover:bg-white/60 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600 dark:border-zinc-700 dark:bg-zinc-900/30 dark:hover:border-blue-500 dark:hover:bg-zinc-900/60"
          >
            <span className="mb-5 flex size-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
              <Linkedin className="size-5" aria-hidden="true" />
            </span>
            <h2 className="max-w-lg text-lg font-medium leading-snug text-zinc-900 dark:text-zinc-100">
              {page.name}
            </h2>
            <span className="mt-auto inline-flex items-center gap-2 pt-6 text-sm font-medium text-blue-600 dark:text-blue-400">
              Select page
              <ChevronRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
            </span>
          </Link>
        ))}
      </section>
      {showAddPage && <AddLinkedInPageDialog onClose={() => setShowAddPage(false)} onSaved={handlePageSaved} />}
    </div>
  );
}
