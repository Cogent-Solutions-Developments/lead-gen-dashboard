"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  BellRing,
  CheckCircle2,
  Inbox,
  Loader2,
  MessageCircle,
  Phone,
  RefreshCw,
  Search,
  UserRound,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fetchInbound, subscribeWhatsAppEvents, type WhatsAppInbound } from "@/lib/apiRouter";
import { toast } from "sonner";

function safeDate(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function formatAbsoluteTime(value: string) {
  const parsed = safeDate(value);
  if (!parsed) return value || "Unknown time";
  return parsed.toLocaleString();
}

function formatRelativeTime(value: string) {
  const parsed = safeDate(value);
  if (!parsed) return "Unknown";

  const diffMs = parsed.getTime() - Date.now();
  const absSeconds = Math.round(Math.abs(diffMs) / 1000);
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });

  if (absSeconds < 60) return rtf.format(Math.round(diffMs / 1000), "second");
  const absMinutes = Math.round(absSeconds / 60);
  if (absMinutes < 60) return rtf.format(Math.round(diffMs / 60000), "minute");
  const absHours = Math.round(absMinutes / 60);
  if (absHours < 24) return rtf.format(Math.round(diffMs / 3600000), "hour");

  return rtf.format(Math.round(diffMs / 86400000), "day");
}

function sortByReceivedAtDesc(items: WhatsAppInbound[]) {
  return [...items].sort((a, b) => {
    const aMs = safeDate(a.receivedAt)?.getTime() ?? 0;
    const bMs = safeDate(b.receivedAt)?.getTime() ?? 0;
    return bMs - aMs;
  });
}

function dedupeById(items: WhatsAppInbound[]) {
  const map = new Map<string, WhatsAppInbound>();
  for (const item of items) {
    if (!item.id) continue;
    map.set(item.id, item);
  }
  return Array.from(map.values());
}

export default function RepliesPage() {
  const [notifications, setNotifications] = useState<WhatsAppInbound[]>([]);
  const [messages, setMessages] = useState<WhatsAppInbound[]>([]);
  const [activePersonId, setActivePersonId] = useState<string | null>(null);
  const [activeNotificationId, setActiveNotificationId] = useState<string | null>(null);
  const [personIdInput, setPersonIdInput] = useState("");
  const [historyLoading, setHistoryLoading] = useState(false);
  const [connected, setConnected] = useState(false);

  const activePersonRef = useRef<string | null>(null);
  activePersonRef.current = activePersonId;

  const openConversation = useCallback(
    async (personId: string, seedMessage?: WhatsAppInbound) => {
      if (!personId) {
        toast.error("Missing personId for this reply.");
        return;
      }

      setActivePersonId(personId);
      setHistoryLoading(true);

      try {
        // API returns DESC, convert to ASC for chat view.
        const history = await fetchInbound(personId, 50);
        const ordered = [...history].reverse();

        const combined = seedMessage ? [...ordered, seedMessage] : ordered;
        const deduped = dedupeById(combined);
        const sortedAsc = [...deduped].sort((a, b) => {
          const aMs = safeDate(a.receivedAt)?.getTime() ?? 0;
          const bMs = safeDate(b.receivedAt)?.getTime() ?? 0;
          return aMs - bMs;
        });

        setMessages(sortedAsc);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to load conversation";
        toast.error("Failed to load inbound history", { description: message });
      } finally {
        setHistoryLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    const unsubscribe = subscribeWhatsAppEvents((inbound) => {
      setNotifications((prev) => {
        const deduped = dedupeById([inbound, ...prev]);
        return sortByReceivedAtDesc(deduped);
      });

      if (inbound.personId && activePersonRef.current === inbound.personId) {
        setMessages((prev) => {
          if (prev.some((msg) => msg.id === inbound.id)) return prev;
          return [...prev, inbound];
        });
      }
    }, {
      onOpen: () => setConnected(true),
      onError: () => setConnected(false),
    });

    return () => {
      unsubscribe();
      setConnected(false);
    };
  }, []);

  const handleNotificationClick = useCallback(
    async (notification: WhatsAppInbound) => {
      setActiveNotificationId(notification.id);

      if (!notification.personId) {
        setMessages([notification]);
        setActivePersonId(null);
        toast.error("This message has no personId. Cannot load full history.");
        return;
      }

      await openConversation(notification.personId, notification);
    },
    [openConversation]
  );

  const handleOpenByPerson = useCallback(async () => {
    const value = personIdInput.trim();
    if (!value) {
      toast.error("Enter personId first.");
      return;
    }
    setActiveNotificationId(null);
    await openConversation(value);
  }, [openConversation, personIdInput]);

  const selectedNotification = useMemo(() => {
    if (activeNotificationId) {
      const selected = notifications.find((item) => item.id === activeNotificationId);
      if (selected) return selected;
    }

    if (activePersonId) {
      const forPerson = notifications.find((item) => item.personId === activePersonId);
      if (forPerson) return forPerson;
    }

    return notifications[0] ?? messages[messages.length - 1] ?? null;
  }, [activeNotificationId, activePersonId, notifications, messages]);

  const sortedNotifications = useMemo(() => sortByReceivedAtDesc(notifications), [notifications]);

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
            Live WhatsApp inbound notifications with click-to-open conversation.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge
            className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider shadow-none ${
              connected
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-zinc-200 bg-zinc-100 text-zinc-600"
            }`}
          >
            {connected ? "Live" : "Waiting"}
          </Badge>
          <Button
            variant="outline"
            className="h-9 border-zinc-200 text-zinc-700 hover:bg-zinc-50"
            onClick={() => {
              if (!activePersonId) return;
              void openConversation(activePersonId);
            }}
            disabled={!activePersonId || historyLoading}
          >
            {historyLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Refresh Chat
          </Button>
        </div>
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
        <Card className="rounded-2xl border border-zinc-200 bg-white p-0 shadow-sm">
          <div className="border-b border-zinc-100 px-5 py-4">
            <h2 className="text-sm font-semibold text-zinc-900">Notifications</h2>
            <p className="text-xs text-zinc-500">Mobile-style reply feed</p>
          </div>

          <div className="border-b border-zinc-100 p-3">
            <div className="flex gap-2">
              <Input
                value={personIdInput}
                onChange={(e) => setPersonIdInput(e.target.value)}
                placeholder="Open by personId"
                className="h-9 border-zinc-200"
              />
              <Button
                type="button"
                variant="outline"
                className="h-9 border-zinc-200 text-zinc-700 hover:bg-zinc-50"
                onClick={() => void handleOpenByPerson()}
              >
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="max-h-[70vh] overflow-y-auto p-3">
            {sortedNotifications.length === 0 ? (
              <div className="flex min-h-44 flex-col items-center justify-center rounded-xl border border-dashed border-zinc-200 bg-zinc-50 text-center">
                <Inbox className="h-5 w-5 text-zinc-400" />
                <p className="mt-2 text-sm text-zinc-500">
                  Waiting for live replies from SSE stream.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {sortedNotifications.map((item) => {
                  const active =
                    item.id === activeNotificationId ||
                    (!!activePersonId && !!item.personId && activePersonId === item.personId);

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => void handleNotificationClick(item)}
                      className={`w-full rounded-xl border px-3 py-3 text-left transition-all ${
                        active
                          ? "border-zinc-300 bg-zinc-50 shadow-sm"
                          : "border-zinc-100 bg-white hover:border-zinc-200 hover:bg-zinc-50/70"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-600">
                            <MessageCircle className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-zinc-900">
                              {item.contactName || "Unknown Contact"}
                            </p>
                            <p className="truncate text-[11px] text-zinc-500">
                              {item.fromPhone || "No phone"} • {item.personId || "No personId"}
                            </p>
                          </div>
                        </div>
                      </div>

                      <p className="mt-2 line-clamp-2 text-xs text-zinc-600">
                        {item.text || "(No text body)"}
                      </p>

                      <div className="mt-2 flex items-center justify-between">
                        <Badge className="rounded-full border-zinc-200 bg-zinc-100 px-2 py-0.5 text-[10px] uppercase tracking-wider text-zinc-700 shadow-none">
                          {item.messageType || "text"}
                        </Badge>
                        <span className="text-[11px] text-zinc-400">
                          {formatRelativeTime(item.receivedAt)}
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
          <div className="border-b border-zinc-100 px-6 py-5">
            <h2 className="text-lg font-semibold text-zinc-900">Conversation</h2>
            <p className="mt-1 text-xs text-zinc-500">
              {activePersonId ? `personId: ${activePersonId}` : "Select a notification to open chat"}
            </p>
          </div>

          {!selectedNotification && messages.length === 0 ? (
            <div className="flex min-h-[70vh] flex-col items-center justify-center text-center">
              <Inbox className="h-6 w-6 text-zinc-400" />
              <p className="mt-2 text-sm text-zinc-500">No message selected.</p>
            </div>
          ) : (
            <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div className="max-h-[70vh] space-y-3 overflow-y-auto p-5">
                {historyLoading ? (
                  <div className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-600">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading inbound history...
                  </div>
                ) : messages.length === 0 ? (
                  <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-500">
                    No messages for this person.
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div key={msg.id} className="flex">
                      <div className="max-w-[85%] rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3">
                        <p className="text-sm leading-relaxed text-zinc-800">{msg.text || "(No text body)"}</p>
                        <p className="mt-2 text-[11px] text-zinc-400">{formatAbsoluteTime(msg.receivedAt)}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="max-h-[70vh] space-y-3 overflow-y-auto border-l border-zinc-100 bg-zinc-50/40 p-5">
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Receiver Details
                </p>

                <div className="rounded-lg border border-zinc-200 bg-white p-3">
                  <div className="flex items-center gap-2">
                    <UserRound className="h-4 w-4 text-zinc-500" />
                    <div>
                      <p className="text-xs text-zinc-400">Contact Name</p>
                      <p className="text-sm font-medium text-zinc-900">
                        {selectedNotification?.contactName || "N/A"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-zinc-200 bg-white p-3">
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-zinc-500" />
                    <div>
                      <p className="text-xs text-zinc-400">Phone</p>
                      <p className="text-sm font-medium text-zinc-900">
                        {selectedNotification?.fromPhone || "N/A"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-zinc-200 bg-white p-3">
                  <p className="text-xs text-zinc-400">personId</p>
                  <p className="mt-1 break-all text-sm font-medium text-zinc-900">
                    {selectedNotification?.personId || "N/A"}
                  </p>
                </div>

                <div className="rounded-lg border border-zinc-200 bg-white p-3">
                  <p className="text-xs text-zinc-400">providerMessageId</p>
                  <p className="mt-1 break-all text-sm font-medium text-zinc-900">
                    {selectedNotification?.providerMessageId || "N/A"}
                  </p>
                </div>

                <div className="rounded-lg border border-zinc-200 bg-white p-3">
                  <p className="text-xs text-zinc-400">contextMessageId</p>
                  <p className="mt-1 break-all text-sm font-medium text-zinc-900">
                    {selectedNotification?.contextMessageId || "N/A"}
                  </p>
                </div>

                <div className="rounded-lg border border-zinc-200 bg-white p-3">
                  <p className="text-xs text-zinc-400">sendQueueId</p>
                  <p className="mt-1 break-all text-sm font-medium text-zinc-900">
                    {selectedNotification?.sendQueueId || "N/A"}
                  </p>
                </div>

                <div className="rounded-lg border border-zinc-200 bg-white p-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <div>
                      <p className="text-xs text-zinc-400">Received At</p>
                      <p className="text-sm font-medium text-zinc-900">
                        {selectedNotification
                          ? formatAbsoluteTime(selectedNotification.receivedAt)
                          : "N/A"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
