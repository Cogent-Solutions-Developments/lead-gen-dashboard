"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { BrainCircuit, Loader2, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { AgenticApiError } from "@/features/agentic-nizo/api/client";

const MIN_ICP_LENGTH = 10;

interface IcpFormProps {
  isSubmitting: boolean;
  runId?: string | null;
  defaultIcp?: string;
  error?: AgenticApiError | null;
  onSubmit: (icp: string) => Promise<void> | void;
  onResetRun: () => void;
}

function stringifyValue(value: unknown): string {
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export function IcpForm({ isSubmitting, runId, defaultIcp = "", error, onSubmit, onResetRun }: IcpFormProps) {
  const [icp, setIcp] = useState(defaultIcp);

  useEffect(() => {
    setIcp(defaultIcp);
  }, [defaultIcp]);

  const trimmedIcp = icp.trim();
  const charCount = trimmedIcp.length;
  const canSubmit = charCount >= MIN_ICP_LENGTH && !isSubmitting;
  const helperText = useMemo(() => {
    if (!trimmedIcp) return `Describe your ICP in at least ${MIN_ICP_LENGTH} characters.`;
    if (charCount < MIN_ICP_LENGTH) return `Add ${MIN_ICP_LENGTH - charCount} more characters to continue.`;
    return "Looks good. You can launch a new run.";
  }, [charCount, trimmedIcp]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;
    await onSubmit(trimmedIcp);
  };

  return (
    <Card className="border-zinc-200/80 bg-white/88 shadow-[0_20px_36px_-30px_rgba(9,40,105,0.5)] backdrop-blur-sm">
      <CardHeader className="gap-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
              <BrainCircuit className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-xl text-zinc-900">Start MAS Run</CardTitle>
              <CardDescription>Submit your ICP and launch the multi-agent workflow.</CardDescription>
            </div>
          </div>
          {runId ? (
            <Badge variant="secondary" className="border border-blue-100 bg-blue-50 text-blue-700">
              Active run
            </Badge>
          ) : null}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {runId ? (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-lg border border-blue-100 bg-blue-50/70 p-3"
          >
            <p className="text-xs font-medium text-blue-900">Current run ID</p>
            <p className="mt-1 break-all text-xs text-blue-700">{runId}</p>
            <Button
              type="button"
              variant="outline"
              onClick={onResetRun}
              className="mt-3 h-8 border-blue-200 bg-white text-blue-700 hover:bg-blue-50"
            >
              <PlusCircle className="h-4 w-4" />
              Start another run
            </Button>
          </motion.div>
        ) : null}

        <form className="space-y-3" onSubmit={handleSubmit}>
          <Textarea
            value={icp}
            onChange={(event) => setIcp(event.target.value)}
            placeholder="Example: We target B2B SaaS companies in North America with 50-500 employees, looking for VP/Head of Marketing and Growth leaders via email-first outreach..."
            className="min-h-[160px] resize-y border-zinc-200 bg-white/90 text-sm leading-6 text-zinc-800"
          />
          <div className="flex items-center justify-between gap-2">
            <p className={`text-xs ${charCount >= MIN_ICP_LENGTH ? "text-emerald-700" : "text-zinc-500"}`}>{helperText}</p>
            <p className={`text-xs font-medium ${charCount >= MIN_ICP_LENGTH ? "text-emerald-700" : "text-zinc-500"}`}>
              {charCount} chars
            </p>
          </div>

          <Button type="submit" disabled={!canSubmit} className="btn-sidebar-noise h-10 w-full">
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Starting run...
              </>
            ) : (
              "Start Agentic Run"
            )}
          </Button>
        </form>

        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50/80 p-3">
            <p className="text-sm font-medium text-red-900">{error.message}</p>
            <p className="mt-1 text-xs text-red-700">Status: {error.status}</p>
            {error.detail ? (
              <details className="mt-2">
                <summary className="cursor-pointer text-xs font-medium text-red-800">Raw error detail</summary>
                <pre className="mt-2 max-h-44 overflow-auto rounded-md bg-white/70 p-2 text-xs text-red-900">
                  {stringifyValue(error.detail)}
                </pre>
              </details>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
