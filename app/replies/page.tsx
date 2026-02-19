"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  BellRing,
  Building2,
  CheckCircle2,
  ExternalLink,
  Inbox,
  Loader2,
  Mail,
  MessageCircle,
  Phone,
  RefreshCw,
  Send,
  UserRound,
  XCircle,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  listMessageStatuses,
  listReplyNotifications,
  markReplyAsRead,
  type MessageStatus,
  type ReplyNotification,
} from "@/lib/apiRouter";
import { usePersona } from "@/hooks/usePersona";
import { toast } from "sonner";

function formatAbsoluteTime(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value || "Unknown time";
  return d.toLocaleString();
}

function formatRelativeTime(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "Unknown";

  const diffMs = d.getTime() - Date.now();
  const absSeconds = Math.round(Math.abs(diffMs) / 1000);

  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  if (absSeconds < 60) return rtf.format(Math.round(diffMs / 1000), "second");

  const absMinutes = Math.round(absSeconds / 60);
  if (absMinutes < 60) return rtf.format(Math.round(diffMs / 60000), "minute");

  const absHours = Math.round(absMinutes / 60);
  if (absHours < 24) return rtf.format(Math.round(diffMs / 3600000), "hour");

  return rtf.format(Math.round(diffMs / 86400000), "day");
}

function channelIcon(channel: string) {
  const key = channel.toLowerCase();
  if (key === "email") return Mail;
  return MessageCircle;
}

function statusStyles(status: string) {
  const key = status.toLowerCase();
  if (key === "failed") return "bg-red-50 text-red-700 border-red-200";
  if (key === "replied") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (key === "delivered") return "bg-blue-50 text-blue-700 border-blue-200";
  if (key === "sent" || key === "sending" || key === "queued")
    return "bg-zinc-100 text-zinc-700 border-zinc-200";
  return "bg-zinc-100 text-zinc-600 border-zinc-200";
}

export default function RepliesPage() {
  const { persona } = usePersona();
  const [loading, setLoading] = useState(true);
  const [replies, setReplies] = useState<ReplyNotification[]>([]);
  const [statuses, setStatuses] = useState<MessageStatus[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const refreshData = useCallback(
    async (silent: boolean) => {
      if (!silent) setLoading(true);

      const [replyResult, statusResult] = await Promise.allSettled([
        listReplyNotifications({ limit: 100 }),
        listMessageStatuses({ limit: 300 }),
      ]);

      if (replyResult.status === "fulfilled") {
        setReplies(replyResult.value.replies || []);
      } else if (!silent) {
        toast.error("Failed to load replies", { description: replyResult.reason?.message });
      }

      if (statusResult.status === "fulfilled") {
        setStatuses(statusResult.value.statuses || []);
      } else if (!silent) {
        toast.error("Failed to load message status", { description: statusResult.reason?.message });
      }

      if (!silent) setLoading(false);
    },
    []
  );

  useEffect(() => {
    const runInitialLoad = async () => {
      await refreshData(false);
    };
    void runInitialLoad();

    const intervalId = setInterval(() => {
      void refreshData(true);
    }, 15000);

    return () => clearInterval(intervalId);
  }, [refreshData, persona]);

  const activeSelectedId = useMemo(() => {
    if (replies.length === 0) return null;
    if (selectedId && replies.some((reply) => reply.id === selectedId)) return selectedId;
    return replies[0].id;
  }, [replies, selectedId]);

  const selectedReply = useMemo(
    () => replies.find((reply) => reply.id === activeSelectedId) || null,
    [activeSelectedId, replies]
  );

  const unreadCount = useMemo(
    () => replies.filter((reply) => !reply.isRead).length,
    [replies]
  );

  const relatedStatuses = useMemo(() => {
    if (!selectedReply) return [];

    const leadId = selectedReply.recipient.leadId;
    const messageId = selectedReply.messageId;
    const campaignId = selectedReply.campaignId;

    return statuses.filter((status) => {
      if (messageId && status.id === messageId) return true;
      if (leadId && status.leadId === leadId) return true;
      if (campaignId && status.campaignId === campaignId) return true;
      return false;
    });
  }, [selectedReply, statuses]);

  const handleOpenReply = useCallback(async (reply: ReplyNotification) => {
    setSelectedId(reply.id);
    if (reply.isRead) return;

    setReplies((prev) =>
      prev.map((item) => (item.id === reply.id ? { ...item, isRead: true } : item))
    );

    try {
      await markReplyAsRead(reply.id);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Request failed";
      toast.error("Failed to mark message as read", { description: message });
    }
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
      </div>
    );
  }

  return (
    <div className="font-sans min-h-screen bg-transparent p-1">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 flex flex-col gap-3 border-b border-zinc-100 pb-6 sm:flex-row sm:items-end sm:justify-between"
      >
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-zinc-900">
            <BellRing className="h-6 w-6 text-sidebar" />
            Replies
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Mobile-style inbox for incoming replies and delivery status.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge className="rounded-full border-zinc-200 bg-zinc-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-700 shadow-none">
            Unread: {unreadCount}
          </Badge>
          <Button
            variant="outline"
            className="h-9 border-zinc-200 text-zinc-700 hover:bg-zinc-50"
            onClick={() => void refreshData(false)}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
        <Card className="rounded-2xl border border-zinc-200 bg-white p-0 shadow-sm">
          <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
            <div>
              <h2 className="text-sm font-semibold text-zinc-900">Inbox</h2>
              <p className="text-xs text-zinc-500">Tap a notification to open</p>
            </div>
            <Badge className="rounded-full border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-600 shadow-none">
              {replies.length} items
            </Badge>
          </div>

          <div className="max-h-[70vh] overflow-y-auto p-3">
            {replies.length === 0 ? (
              <div className="flex min-h-48 flex-col items-center justify-center rounded-xl border border-dashed border-zinc-200 bg-zinc-50 text-center">
                <Inbox className="h-5 w-5 text-zinc-400" />
                <p className="mt-2 text-sm text-zinc-500">No incoming replies yet.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {replies.map((reply) => {
                  const ActiveIcon = channelIcon(reply.channel);
                  const isActive = reply.id === activeSelectedId;

                  return (
                    <button
                      key={reply.id}
                      type="button"
                      onClick={() => void handleOpenReply(reply)}
                      className={`w-full rounded-xl border px-3 py-3 text-left transition-all ${
                        isActive
                          ? "border-zinc-300 bg-zinc-50 shadow-sm"
                          : "border-zinc-100 bg-white hover:border-zinc-200 hover:bg-zinc-50/60"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-600">
                            <ActiveIcon className="h-3.5 w-3.5" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-zinc-900">
                              {reply.recipient.leadName || "Unknown Receiver"}
                            </p>
                            <p className="text-[11px] text-zinc-500">
                              {reply.recipient.company || "Unknown Company"}
                            </p>
                          </div>
                        </div>

                        {!reply.isRead ? (
                          <span className="mt-1 h-2.5 w-2.5 rounded-full bg-sidebar" />
                        ) : null}
                      </div>

                      <p className="mt-2 line-clamp-2 text-xs text-zinc-600">
                        {reply.text || "No message content provided."}
                      </p>

                      <div className="mt-2 flex items-center justify-between">
                        <Badge
                          className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider shadow-none ${statusStyles(
                            "replied"
                          )}`}
                        >
                          {reply.channel}
                        </Badge>
                        <span className="text-[11px] text-zinc-400">
                          {formatRelativeTime(reply.receivedAt)}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </Card>

        <Card className="rounded-2xl border border-zinc-200 bg-white p-0 shadow-sm">
          {!selectedReply ? (
            <div className="flex min-h-[70vh] flex-col items-center justify-center text-center">
              <Inbox className="h-6 w-6 text-zinc-400" />
              <p className="mt-2 text-sm text-zinc-500">Select a reply to view details.</p>
            </div>
          ) : (
            <>
              <div className="border-b border-zinc-100 px-6 py-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-zinc-900">
                      {selectedReply.recipient.leadName || "Unknown Receiver"}
                    </h2>
                    <p className="mt-1 text-xs text-zinc-500">
                      Received {formatAbsoluteTime(selectedReply.receivedAt)}
                    </p>
                  </div>
                  <Badge className="rounded-full border-zinc-200 bg-zinc-100 px-2.5 py-1 text-[10px] uppercase tracking-wider text-zinc-700 shadow-none">
                    {selectedReply.channel}
                  </Badge>
                </div>
              </div>

              <div className="max-h-[70vh] space-y-6 overflow-y-auto px-6 py-6">
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Message</p>
                  <div className="max-w-2xl rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm leading-relaxed text-zinc-800">
                    {selectedReply.text || "No message content provided."}
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                    Receiver Details
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="flex items-start gap-2 rounded-lg border border-zinc-200 bg-white p-3">
                      <UserRound className="mt-0.5 h-4 w-4 text-zinc-500" />
                      <div>
                        <p className="text-xs text-zinc-400">Name</p>
                        <p className="text-sm font-medium text-zinc-900">
                          {selectedReply.recipient.leadName || "N/A"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2 rounded-lg border border-zinc-200 bg-white p-3">
                      <Send className="mt-0.5 h-4 w-4 text-zinc-500" />
                      <div>
                        <p className="text-xs text-zinc-400">Title</p>
                        <p className="text-sm font-medium text-zinc-900">
                          {selectedReply.recipient.title || "N/A"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2 rounded-lg border border-zinc-200 bg-white p-3">
                      <Building2 className="mt-0.5 h-4 w-4 text-zinc-500" />
                      <div>
                        <p className="text-xs text-zinc-400">Company</p>
                        <p className="text-sm font-medium text-zinc-900">
                          {selectedReply.recipient.company || "N/A"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2 rounded-lg border border-zinc-200 bg-white p-3">
                      <Mail className="mt-0.5 h-4 w-4 text-zinc-500" />
                      <div>
                        <p className="text-xs text-zinc-400">Email</p>
                        <p className="text-sm font-medium text-zinc-900">
                          {selectedReply.recipient.email || "N/A"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2 rounded-lg border border-zinc-200 bg-white p-3">
                      <Phone className="mt-0.5 h-4 w-4 text-zinc-500" />
                      <div>
                        <p className="text-xs text-zinc-400">Phone</p>
                        <p className="text-sm font-medium text-zinc-900">
                          {selectedReply.recipient.phone || "N/A"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2 rounded-lg border border-zinc-200 bg-white p-3">
                      <ExternalLink className="mt-0.5 h-4 w-4 text-zinc-500" />
                      <div>
                        <p className="text-xs text-zinc-400">LinkedIn</p>
                        {selectedReply.recipient.linkedinUrl ? (
                          <a
                            href={selectedReply.recipient.linkedinUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-sm font-medium text-zinc-900 hover:underline"
                          >
                            Open Profile
                          </a>
                        ) : (
                          <p className="text-sm font-medium text-zinc-900">N/A</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                    Message Status
                  </p>
                  {relatedStatuses.length === 0 ? (
                    <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-500">
                      No matching delivery status entries for this receiver yet.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {relatedStatuses.map((status) => {
                        const success = status.status.toLowerCase() === "delivered" || status.status.toLowerCase() === "replied";
                        return (
                          <div
                            key={status.id}
                            className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-4 py-3"
                          >
                            <div className="flex items-center gap-3">
                              {success ? (
                                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                              ) : (
                                <XCircle className="h-4 w-4 text-zinc-400" />
                              )}
                              <div>
                                <p className="text-sm font-medium text-zinc-900">{status.channel}</p>
                                <p className="text-xs text-zinc-500">
                                  {formatAbsoluteTime(status.repliedAt || status.deliveredAt || status.sentAt || "")}
                                </p>
                              </div>
                            </div>
                            <Badge
                              className={`rounded-full px-2.5 py-1 text-[10px] uppercase tracking-wider shadow-none ${statusStyles(
                                status.status
                              )}`}
                            >
                              {status.status}
                            </Badge>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
