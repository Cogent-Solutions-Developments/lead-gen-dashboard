"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
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
  NizoAiMention,
  NizoAiSource,
} from "@/lib/apiRouter";
import { useAuth } from "@/hooks/useAuth";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: NizoAiSource[];
  leadContext?: NizoAiLeadContext[];
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

  const sendMessage = useCallback(async () => {
    const content = draft.trim();
    if (!content || sending || isSuperAdmin || !isPipelineUser) return;

    const userMessage: ChatMessage = {
      id: uid(),
      role: "user",
      content,
      mentions: selectedMentions,
    };
    setMessages((current) => [...current, userMessage]);
    setDraft("");
    setSelectedMentions([]);
    setMentionOpen(false);
    setSending(true);

    try {
      const response = await nizoAiChat({
        message: content,
        sessionId,
        mentions: selectedMentions,
      });
      setSessionId(response.sessionId);
      setMessages((current) => [
        ...current,
        {
          id: uid(),
          role: "assistant",
          content: response.answer,
          sources: response.sources || [],
          leadContext: response.leadContext || [],
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
      <div className="min-h-screen bg-[#f7f8fb] px-6 py-6 text-slate-950">
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900">
          <ArrowLeft className="h-4 w-4" />
          Return to dashboard
        </Link>
        <div className="mx-auto mt-28 max-w-xl rounded-lg border border-slate-200 bg-white p-8 text-center shadow-sm">
          <Brain className="mx-auto h-10 w-10 text-blue-600" />
          <h1 className="mt-4 text-2xl font-semibold">NizoAI</h1>
          <p className="mt-3 text-sm text-slate-500">This chat is available to pipeline users.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f8fb] text-slate-950">
      <div className="flex min-h-screen flex-col">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white/80 px-6 py-4 backdrop-blur">
          <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900">
            <ArrowLeft className="h-4 w-4" />
            Return to dashboard
          </Link>
          <div className="flex items-center gap-3 text-sm text-slate-500">
            <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5">
              <Sparkles className="h-4 w-4 text-blue-600" />
              Cogent knowledge chat
            </span>
          </div>
        </header>

        <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-6 sm:px-6">
          {messages.length === 0 ? (
            <section className="flex flex-1 flex-col items-center justify-center pb-16 text-center">
              <div className="mb-5 flex items-center gap-3">
                <h1 className="text-5xl font-normal tracking-normal text-slate-950">NizoAI</h1>
                <Brain className="h-10 w-10 text-slate-900" />
              </div>
              <p className="max-w-xl text-base text-slate-500">Ask about Cogent leads, events, objections, or next-step wording.</p>
            </section>
          ) : (
            <section className="flex-1 space-y-5 pb-6">
              {messages.map((message) => (
                <article
                  key={message.id}
                  className={`group flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[min(44rem,92vw)] rounded-lg px-5 py-4 shadow-sm ${
                      message.role === "user"
                        ? "bg-slate-950 text-white"
                        : "border border-slate-200 bg-white text-slate-900"
                    }`}
                  >
                    {message.mentions?.length ? (
                      <div className="mb-3 flex flex-wrap gap-2">
                        {message.mentions.map((item) => (
                          <span
                            key={`${item.type}-${item.id}`}
                            className="rounded-full bg-white/10 px-2.5 py-1 text-xs text-white/80"
                          >
                            @{mentionLabel(item)}
                          </span>
                        ))}
                      </div>
                    ) : null}
                    <div className="whitespace-pre-wrap text-sm leading-6">{message.content}</div>
                    {message.role === "assistant" ? (
                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-8 border-slate-200 bg-white text-slate-600 hover:text-slate-950"
                          onClick={() => copyText(message.content)}
                          aria-label="Copy response"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        {(message.sources || []).slice(0, 4).map((source) => (
                          <span
                            key={`${source.documentId}-${source.chunkId}`}
                            className="rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-xs text-blue-700"
                          >
                            {sourceTitle(source)}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </article>
              ))}
              {sending ? (
                <div className="flex justify-start">
                  <div className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500 shadow-sm">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    NizoAI is thinking
                  </div>
                </div>
              ) : null}
              <div ref={bottomRef} />
            </section>
          )}

          <footer className="sticky bottom-0 border-t border-slate-200 bg-[#f7f8fb]/95 py-4 backdrop-blur">
            {selectedMentions.length ? (
              <div className="mb-3 flex flex-wrap gap-2">
                {selectedMentions.map((item) => (
                  <button
                    key={`${item.type}-${item.id}`}
                    type="button"
                    onClick={() => removeMention(item)}
                    className="inline-flex items-center gap-1 rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700"
                  >
                    @{mentionLabel(item)}
                    <X className="h-3.5 w-3.5" />
                  </button>
                ))}
              </div>
            ) : null}

            <div className="relative rounded-lg border border-slate-200 bg-white p-2 shadow-sm">
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
                className="min-h-24 resize-none border-0 bg-transparent px-3 py-3 text-base shadow-none focus-visible:ring-0"
                maxLength={4000}
              />

              {mentionActive ? (
                <div className="absolute bottom-full left-0 mb-3 w-full max-w-xl rounded-lg border border-slate-200 bg-white p-2 shadow-xl">
                  <div className="mb-2 flex items-center gap-2 px-2 py-1 text-xs text-slate-500">
                    <Search className="h-3.5 w-3.5" />
                    {mentionQuery ? `Search: ${mentionQuery}` : "Recent lead and event context"}
                  </div>
                  {mentionLoading ? (
                    <div className="flex items-center gap-2 px-3 py-3 text-sm text-slate-500">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Searching
                    </div>
                  ) : mentionResults.length ? (
                    <div className="max-h-64 overflow-y-auto">
                      {mentionResults.map((item) => (
                        <button
                          key={`${item.type}-${item.id}`}
                          type="button"
                          onClick={() => addMention(item)}
                          className="flex w-full items-start gap-3 rounded-md px-3 py-2 text-left hover:bg-slate-50"
                        >
                          <span className="mt-0.5 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium uppercase text-slate-500">
                            {item.type}
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-medium text-slate-900">{mentionLabel(item)}</span>
                            {item.description ? (
                              <span className="block truncate text-xs text-slate-500">{item.description}</span>
                            ) : null}
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="px-3 py-3 text-sm text-slate-500">No matches found.</div>
                  )}
                </div>
              ) : null}

              <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-2 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 text-slate-500 hover:text-slate-950"
                  onClick={() => setMentionOpen((value) => !value)}
                  aria-label="Mention lead or event"
                >
                  <AtSign className="h-5 w-5" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  disabled={!canSend}
                  onClick={() => void sendMessage()}
                  className="h-10 w-10 rounded-full bg-slate-950 text-white hover:bg-slate-800"
                  aria-label="Send message"
                >
                  {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                </Button>
              </div>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}
