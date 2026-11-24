"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { linkedInPageError, type LinkedInPage } from "@/lib/linkedinPages";
import { getLinkedInPage } from "@/lib/linkedinPagesApi";
import { LinkedInCampaignList } from "./LinkedInCampaignList";

export function LinkedInPageWorkspace({ pageId }: { pageId: string }) {
  const [reloadKey, setReloadKey] = useState(0);
  const [result, setResult] = useState<{ page: LinkedInPage | null; loading: boolean; error: string | null }>({ page: null, loading: true, error: null });

  useEffect(() => {
    const controller = new AbortController();
    getLinkedInPage(pageId, controller.signal).then(
      (page) => { if (!controller.signal.aborted) setResult({ page, loading: false, error: null }); },
      (error) => { if (!controller.signal.aborted) setResult({ page: null, loading: false, error: linkedInPageError(error) }); },
    );
    return () => controller.abort();
  }, [pageId, reloadKey]);

  function retry() {
    setResult({ page: null, loading: true, error: null });
    setReloadKey((value) => value + 1);
  }

  return (
    <div className="space-y-6 p-1 font-sans">
      {!result.page && <Link href="/admin/lead-intelligence/linkedin" className="inline-flex min-h-10 items-center gap-2 text-sm text-zinc-500 hover:text-zinc-900"><ArrowLeft className="size-4" aria-hidden="true" />All LinkedIn pages</Link>}
      {result.loading && <p role="status" className="inline-flex items-center gap-2 text-sm text-zinc-500"><Loader2 className="size-4 animate-spin" aria-hidden="true" />Loading LinkedIn page…</p>}
      {result.error && <div role="alert" className="space-y-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300"><p>{result.error}</p><Button type="button" variant="outline" onClick={retry}>Retry</Button></div>}
      {result.page && <LinkedInCampaignList key={result.page.id} page={result.page} />}
    </div>
  );
}
