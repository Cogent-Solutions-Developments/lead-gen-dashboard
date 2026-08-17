"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCcw } from "lucide-react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Unhandled application error", error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-6 py-16 text-zinc-950">
      <section className="w-full max-w-lg border border-zinc-200 bg-white p-8 shadow-sm">
        <AlertTriangle className="h-8 w-8 text-amber-500" aria-hidden="true" />
        <h1 className="mt-6 text-3xl font-light tracking-tight">Something went wrong</h1>
        <p className="mt-3 text-sm leading-6 text-zinc-500">
          The page could not be loaded. Retry the request, or sign in again if your session has expired.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-7 inline-flex h-11 items-center justify-center gap-2 bg-zinc-950 px-5 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-700 focus-visible:ring-offset-2"
        >
          <RefreshCcw className="h-4 w-4" aria-hidden="true" />
          Try again
        </button>
      </section>
    </main>
  );
}
