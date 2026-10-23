import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function OutreachPagination({ page, pageSize, total, onChange }: {
  page: number; pageSize: number; total: number; onChange: (page: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const start = Math.max(1, Math.min(page - 2, pages - 4));
  return <div className="relative flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-zinc-300/80 px-6 py-3 text-xs text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
    <span>Showing {total ? (page - 1) * pageSize + 1 : 0}–{Math.min(page * pageSize, total)} of {total.toLocaleString()}</span>
    <nav aria-label="Pagination" className="flex items-center gap-1.5">
      <Button type="button" variant="outline" aria-label="Previous page" disabled={page <= 1} onClick={() => onChange(page - 1)} className="h-8 w-8 p-0"><ChevronLeft className="h-4 w-4" /></Button>
      {Array.from({ length: Math.min(5, pages) }, (_, index) => start + index).map((number) => <button key={number} type="button" aria-label={`Page ${number}`} aria-current={page === number ? "page" : undefined} onClick={() => onChange(number)} className={`h-8 min-w-8 rounded-md border px-2 text-xs font-semibold transition-colors ${page === number ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-300/80 bg-white/82 text-zinc-600 hover:bg-white dark:bg-zinc-800 dark:text-zinc-300"}`}>{number}</button>)}
      <Button type="button" variant="outline" aria-label="Next page" disabled={page >= pages} onClick={() => onChange(page + 1)} className="h-8 w-8 p-0"><ChevronRight className="h-4 w-4" /></Button>
    </nav>
  </div>;
}
