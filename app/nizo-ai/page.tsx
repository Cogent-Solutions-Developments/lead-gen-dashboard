"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  AtSign,
  Brain,
  Copy,
  Loader2,
  Search,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { nizoAiChat, searchNizoAiMentions } from "@/lib/apiRouter";
import type {
  NizoAiLeadContext,
  NizoAiLeadSearchItem,
  NizoAiLeadSearchResult,
  NizoAiMention,
  NizoAiSource,
} from "@/lib/apiRouter";
import { useAuth } from "@/hooks/useAuth";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  mode?: "chat" | "lead_search";
  sources?: NizoAiSource[];
  leadContext?: NizoAiLeadContext[];
  leadSearch?: NizoAiLeadSearchResult | null;
  mentions?: NizoAiMention[];
};

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return "NizoAI request failed.";
}

function mentionLabel(item: NizoAiMention) {
  return item.label || item.id;
}

function mentionQueryFromDraft(value: string) {
  const at = value.lastIndexOf("@");
  if (at < 0) return "";
  const tail = value.slice(at + 1);
  return tail.split(/\s/)[0]?.trim() || "";
}

function sourceTitle(source: NizoAiSource) {
  const page = source.pageNumber ? ` p.${source.pageNumber}` : "";
  return `${source.title || source.fileName || "Knowledge"}${page}`;
}

function leadResultDetail(item: NizoAiLeadSearchItem) {
  return [item.title, item.company, item.campaignName || item.canonicalEventName].filter(Boolean).join(" | ");
}

function leadContactDetail(item: NizoAiLeadSearchItem) {
  return [item.email, item.phone, item.linkedinUrl ? "LinkedIn" : ""].filter(Boolean).join(" | ");
}

function leadSearchHasMore(result?: NizoAiLeadSearchResult | null) {
  if (!result) return false;
  return (result.offset || 0) + (result.items?.length || 0) < result.total;
}

export default function NizoAiPage() {
  const { isSuperAdmin, isPipelineUser } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [selectedMentions, setSelectedMentions] = useState<NizoAiMention[]>([]);
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionResults, setMentionResults] = useState<NizoAiMention[]>([]);
  const [mentionLoading, setMentionLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const mentionQuery = useMemo(() => mentionQueryFromDraft(draft), [draft]);
  const mentionActive = useMemo(() => mentionOpen || /(^|\s)@\S*$/.test(draft), [draft, mentionOpen]);
  const canSend = draft.trim().length > 0 && !sending && isPipelineUser && !isSuperAdmin;
  const selectedMentionKeys = useMemo(
    () => new Set(selectedMentions.map((item) => `${item.type}:${item.id}`)),
    [selectedMentions]
  );

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, sending]);

  useEffect(() => {
    if (!mentionActive || isSuperAdmin || !isPipelineUser) {
      setMentionResults([]);
      setMentionLoading(false);
      return;
    }

    let active = true;
    setMentionLoading(true);
    const timer = window.setTimeout(async () => {
      try {
        const data = await searchNizoAiMentions({
          q: mentionQuery,
          kind: "all",
          limit: 8,
        });
        if (active) setMentionResults(data.items || []);
      } catch (error) {
        if (active) setMentionResults([]);
        console.warn("NizoAI mention search failed", error);
      } finally {
        if (active) setMentionLoading(false);
      }
    }, 250);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [isPipelineUser, isSuperAdmin, mentionActive, mentionQuery]);

  const addMention = useCallback((item: NizoAiMention) => {
    setSelectedMentions((current) => {
      if (current.some((existing) => existing.type === item.type && existing.id === item.id)) return current;
      return [...current, item].slice(0, 8);
    });
    setDraft((current) => {
      const at = current.lastIndexOf("@");
      if (at < 0) return current;
      const before = current.slice(0, at);
      const after = current.slice(at + 1).replace(/^\S*/, "");
      return `${before}@${mentionLabel(item)} ${after}`.replace(/\s{2,}/g, " ");
    });
    setMentionOpen(false);
  }, []);

  const removeMention = useCallback((item: NizoAiMention) => {
    setSelectedMentions((current) =>
      current.filter((existing) => !(existing.type === item.type && existing.id === item.id))
    );
  }, []);

  const sendMessage = useCallback(async (overrideContent?: string, overrideMentions?: NizoAiMention[]) => {
    const content = (overrideContent ?? draft).trim();
    if (!content || sending || isSuperAdmin || !isPipelineUser) return;
    const mentionsForRequest = overrideMentions ?? selectedMentions;
    const clearComposer = overrideContent === undefined;

    const userMessage: ChatMessage = {
      id: uid(),
      role: "user",
      content,
      mentions: mentionsForRequest,
    };
    setMessages((current) => [...current, userMessage]);
    if (clearComposer) {
      setDraft("");
      setSelectedMentions([]);
    }
    setMentionOpen(false);
    setSending(true);

    try {
      const response = await nizoAiChat({
        message: content,
        sessionId,
        mentions: mentionsForRequest,
      });
      setSessionId(response.sessionId);
      setMessages((current) => [
        ...current,
        {
          id: uid(),
          role: "assistant",
          mode: response.mode || "chat",
          content: response.answer,
          sources: response.sources || [],
          leadContext: response.leadContext || [],
          leadSearch: response.leadSearch || null,
        },
      ]);
    } catch (error) {
      toast.error("NizoAI failed", { description: errorMessage(error) });
      setMessages((current) => [
        ...current,
        {
          id: uid(),
          role: "assistant",
          content: "I could not complete that request. Please try again with a shorter question.",
        },
      ]);
    } finally {
      setSending(false);
    }
  }, [draft, isPipelineUser, isSuperAdmin, selectedMentions, sending, sessionId]);

  const copyText = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied");
    } catch {
      toast.error("Copy failed");
    }
  }, []);

  if (isSuperAdmin || !isPipelineUser) {
    return (
      <div className="min-h-screen bg-transparent px-8 py-8 font-sans text-zinc-950">
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm font-light text-zinc-500 transition-colors hover:text-zinc-900">
          <ArrowLeft className="h-4 w-4" />
          Return to dashboard
        </Link>
        <div className="mx-auto mt-28 max-w-xl border border-zinc-200 bg-white p-12 text-center shadow-sm">
          <Brain className="mx-auto h-10 w-10 text-zinc-300" />
          <h1 className="mt-6 text-3xl font-extralight tracking-tight text-zinc-950">NizoAI</h1>
          <p className="mt-3 text-sm font-light text-zinc-500">This chat is available to pipeline users.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-transparent font-sans text-zinc-950">
      <header className="relative z-10 flex items-center justify-between border-b border-zinc-200 bg-transparent px-8 py-5">
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm font-light text-zinc-500 transition-colors hover:text-zinc-900">
          <ArrowLeft className="h-4 w-4" />
          Return to dashboard
        </Link>
        <div className="flex items-center gap-3">
          <span className="inline-flex h-8 items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 text-xs font-medium text-zinc-500 shadow-sm">
            <Sparkles className="h-3.5 w-3.5 text-zinc-400" />
            Cogent Knowledge Chat
          </span>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-6 py-10 lg:px-8">
        {messages.length === 0 ? (
          <motion.section 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-1 flex-col items-center justify-center pb-24 text-center"
          >
            <div className="mb-6 flex items-center justify-center gap-4">
              <Brain className="h-12 w-12 text-zinc-200" />
            </div>
            <h1 className="text-[2.75rem] font-extralight tracking-tight text-zinc-950">NizoAI</h1>
            <p className="mt-4 max-w-xl text-lg font-light leading-relaxed text-zinc-500">
              Ask about Cogent leads, events, objections, or next-step wording.
            </p>
          </motion.section>
        ) : (
          <section className="flex-1 space-y-8 pb-6">
            {messages.map((message, index) => (
              <motion.article
                key={message.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className={`group flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[min(46rem,90vw)] ${
                    message.role === "user"
                      ? "rounded-[2rem] bg-[#2977e7] px-6 py-3.5 text-white shadow-sm"
                      : "px-2 py-2 text-zinc-950"
                  }`}
                >
                  {message.mentions?.length ? (
                    <div className="mb-4 flex flex-wrap gap-2">
                      {message.mentions.map((item) => (
                        <span
                          key={`${item.type}-${item.id}`}
                          className={`px-2 py-1 text-[11px] font-medium uppercase tracking-wider ${
                            message.role === "user" ? "rounded-full bg-white/20 text-white" : "rounded-none bg-zinc-200 text-zinc-600"
                          }`}
                        >
                          @{mentionLabel(item)}
                        </span>
                      ))}
                    </div>
                  ) : null}
                  <div className="whitespace-pre-wrap text-[15px] font-light leading-relaxed">{message.content}</div>
                  
                  {message.leadSearch?.items?.length ? (
                    <div className="mt-6 space-y-3 border-t border-zinc-100 pt-5">
                      {message.leadSearch.items.map((item) => {
                        const selected = selectedMentionKeys.has(`lead:${item.id}`);
                        return (
                          <div
                            key={item.id}
                            className="grid gap-4 border border-zinc-200 bg-zinc-50 p-4 transition-colors hover:border-zinc-300 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                          >
                            <div className="min-w-0">
                              <div className="truncate text-[15px] font-medium text-zinc-950">{item.name || item.label}</div>
                              <div className="mt-1.5 truncate text-xs font-light text-zinc-500">{leadResultDetail(item) || "Local lead"}</div>
                              {leadContactDetail(item) ? (
                                <div className="mt-1 truncate text-xs font-light text-zinc-400">{leadContactDetail(item)}</div>
                              ) : null}
                            </div>
                            <Button
                              type="button"
                              size="sm"
                              variant={selected ? "secondary" : "outline"}
                              className="h-9 justify-self-start rounded-none border-zinc-200 bg-white text-sm font-light text-zinc-700 hover:bg-zinc-100 hover:text-zinc-950 sm:justify-self-end"
                              onClick={() => addMention(item)}
                              disabled={selected}
                            >
                              <AtSign className="mr-2 h-3.5 w-3.5" />
                              {selected ? "Selected" : "Select"}
                            </Button>
                          </div>
                        );
                      })}
                      {message.role === "assistant" &&
                      message === messages[messages.length - 1] &&
                      leadSearchHasMore(message.leadSearch) ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="mt-3 h-9 rounded-none border-zinc-200 bg-white text-sm font-light text-zinc-700 hover:text-zinc-950"
                          onClick={() => void sendMessage("show more", [])}
                          disabled={sending}
                        >
                          Show more
                        </Button>
                      ) : null}
                    </div>
                  ) : null}

                  {message.role === "assistant" ? (
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-8 rounded-none px-2 text-zinc-400 hover:bg-zinc-200/50 hover:text-zinc-900"
                        onClick={() => copyText(message.content)}
                        aria-label="Copy response"
                      >
                        <Copy className="mr-1.5 h-3.5 w-3.5" />
                        <span className="text-xs">Copy</span>
                      </Button>
                    </div>
                  ) : null}
                </div>
              </motion.article>
            ))}
            {sending ? (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex justify-start px-2"
              >
                <div className="inline-flex items-center gap-3 text-sm font-light text-zinc-500">
                  <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
                  NizoAI is thinking...
                </div>
              </motion.div>
            ) : null}
            <div ref={bottomRef} className="h-4" />
          </section>
        )}
      </main>

      <footer className="sticky bottom-0 z-20 border-t border-zinc-200 bg-transparent px-6 py-6 lg:px-8">
        <div className="mx-auto w-full max-w-4xl">
          {selectedMentions.length ? (
            <div className="mb-4 flex flex-wrap gap-2">
              {selectedMentions.map((item) => (
                <button
                  key={`${item.type}-${item.id}`}
                  type="button"
                  onClick={() => removeMention(item)}
                  className="inline-flex items-center gap-1.5 rounded-none border border-zinc-300 bg-white px-3 py-1.5 text-[11px] font-medium uppercase tracking-wider text-zinc-700 shadow-sm transition-colors hover:bg-zinc-50"
                >
                  @{mentionLabel(item)}
                  <X className="h-3.5 w-3.5 text-zinc-400" />
                </button>
              ))}
            </div>
          ) : null}

          <div className="relative border border-zinc-200 bg-white shadow-sm transition-shadow focus-within:border-zinc-300 focus-within:ring-1 focus-within:ring-zinc-200">
            <Textarea
              value={draft}
              onChange={(event) => {
                const value = event.target.value;
                setDraft(value);
                if (value.includes("@")) setMentionOpen(true);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void sendMessage();
                }
              }}
              placeholder="Ask NizoAI about a lead, event, objection, or message..."
              className="min-h-[100px] resize-none rounded-none border-0 bg-transparent px-5 py-4 text-[15px] font-light text-zinc-950 placeholder:text-zinc-400 focus-visible:ring-0"
              maxLength={4000}
            />

            {mentionActive ? (
              <div className="absolute bottom-[calc(100%+1rem)] left-0 w-full max-w-xl border border-zinc-200 bg-white shadow-lg">
                <div className="flex items-center gap-2 border-b border-zinc-100 bg-zinc-50 px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-zinc-500">
                  <Search className="h-3.5 w-3.5" />
                  {mentionQuery ? `Search: ${mentionQuery}` : "Recent Context"}
                </div>
                {mentionLoading ? (
                  <div className="flex items-center gap-3 px-4 py-6 text-sm font-light text-zinc-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Searching...
                  </div>
                ) : mentionResults.length ? (
                  <div className="max-h-64 overflow-y-auto py-2">
                    {mentionResults.map((item) => (
                      <button
                        key={`${item.type}-${item.id}`}
                        type="button"
                        onClick={() => addMention(item)}
                        className="flex w-full items-start gap-4 px-4 py-2.5 text-left transition-colors hover:bg-zinc-50 focus:bg-zinc-50 focus:outline-none"
                      >
                        <span className="mt-0.5 inline-flex min-w-[3.5rem] items-center justify-center border border-zinc-200 bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-widest text-zinc-500">
                          {item.type}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-zinc-950">{mentionLabel(item)}</span>
                          {item.description ? (
                            <span className="mt-0.5 block truncate text-[13px] font-light text-zinc-500">{item.description}</span>
                          ) : null}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="px-4 py-6 text-sm font-light italic text-zinc-500">No matches found.</div>
                )}
              </div>
            ) : null}

            <div className="flex items-center justify-between gap-3 border-t border-zinc-100 bg-zinc-50/50 px-3 py-2.5">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-9 gap-2 rounded-none font-light text-zinc-500 hover:bg-zinc-100 hover:text-zinc-950"
                onClick={() => setMentionOpen((value) => !value)}
                aria-label="Mention lead or event"
              >
                <AtSign className="h-4 w-4" />
                <span className="text-xs">Mention context</span>
              </Button>
              <Button
                type="button"
                size="icon"
                disabled={!canSend}
                onClick={() => void sendMessage()}
                className="h-9 w-9 rounded-none bg-zinc-950 text-white transition-colors hover:bg-zinc-800 disabled:bg-zinc-200 disabled:text-zinc-400"
                aria-label="Send message"
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
