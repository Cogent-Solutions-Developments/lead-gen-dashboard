"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User, Copy, ExternalLink, ArrowRight, Loader2 } from "lucide-react";
import { searchLeads, type LeadItem } from "@/lib/apiRouter";
import { usePersona } from "@/hooks/usePersona";
import { toast } from "sonner";
import Link from "next/link";

export function PriorityQueue() {
  const [leads, setLeads] = useState<LeadItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { persona } = usePersona();

  useEffect(() => {
    let alive = true;

    const load = async () => {
      try {
        const response = await searchLeads({ limit: 12, sortBy: "createdAt", sortDir: "desc" });
        if (!alive) return;
        setLeads(response.items || []);
      } catch (err) {
        console.warn("PriorityQueue failed to load", err);
      } finally {
        if (alive) setLoading(false);
      }
    };

    void load();
    return () => {
      alive = false;
    };
  }, [persona]);

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied to clipboard`);
    } catch {
      toast.error("Failed to copy");
    }
  };

  if (loading && leads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-zinc-400">
        <Loader2 className="h-6 w-6 animate-spin mb-4" />
        <p className="text-xs font-light uppercase tracking-widest">Scanning Intelligence Registry...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-400">Active Pipeline</h3>
        <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-950">
          {leads.length} Priority Prospects
        </span>
      </div>

      <div className="grid grid-cols-1 gap-px bg-zinc-100 border-y border-zinc-100">
        <AnimatePresence mode="popLayout">
          {leads.map((lead, index) => (
            <motion.div
              key={lead.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
              className="group relative flex items-center gap-8 bg-white py-10 transition-colors hover:bg-zinc-50/50"
            >
              {/* Identity */}
              <div className="flex min-w-0 flex-1 items-start gap-8">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-zinc-100 bg-white text-zinc-950 transition-all group-hover:border-zinc-900 group-hover:bg-zinc-950 group-hover:text-white">
                  <User className="h-6 w-6" />
                </div>
                <div className="min-w-0 space-y-2">
                  <h4 className="truncate text-2xl font-light tracking-tight text-zinc-950">
                    {lead.employeeName}
                  </h4>
                  <div className="flex items-center gap-3 text-sm font-light text-zinc-500">
                    <span className="truncate">{lead.title}</span>
                    <span className="h-1 w-1 rounded-full bg-zinc-200" />
                    <span className="truncate font-semibold text-zinc-900">{lead.company}</span>
                  </div>
                </div>
              </div>

              {/* Context */}
              <div className="hidden lg:flex flex-col gap-1 w-64">
                <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Origin</span>
                <span className="truncate text-sm font-light text-zinc-950">
                  {lead.canonicalEventName || lead.eventName || "Manual Entry"}
                </span>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-4 opacity-0 transition-all group-hover:opacity-100 translate-x-2 group-hover:translate-x-0 pr-4">
                {lead.email && (
                  <button
                    onClick={() => copyToClipboard(lead.email!, "Email")}
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-zinc-300 bg-white text-zinc-500 hover:border-zinc-950 hover:text-zinc-950"
                    title="Copy Email"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                )}
                {lead.linkedinUrl && (
                  <a
                    href={lead.linkedinUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-zinc-300 bg-white text-zinc-500 hover:border-zinc-950 hover:text-zinc-950"
                    title="LinkedIn Profile"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
                <Link
                  href={`/leads?lead=${lead.id}&event=${lead.canonicalEventKey || ""}`}
                  className="flex h-10 px-6 items-center justify-center rounded-full bg-zinc-950 text-white text-xs font-bold uppercase tracking-widest hover:bg-blue-600"
                >
                  View Details
                </Link>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {leads.length > 0 && (
        <div className="flex justify-center pt-8">
          <Link
            href="/leads"
            className="group inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-zinc-400 transition-colors hover:text-zinc-950"
          >
            Access full intelligence registry
            <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      )}
    </div>
  );
}
