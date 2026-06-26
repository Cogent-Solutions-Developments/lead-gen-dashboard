"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  CalendarClock,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Pencil,
  RefreshCw,
  Save,
  Trash2,
  UserPlus,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createAdminClientCredential,
  listAdminClientCredentials,
  listAdminEvents,
  revokeAdminClientCredential,
  updateAdminClientCredential,
  type AdminClientCredential,
  type AdminEventItem,
} from "../admin-api";

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Please try again.";
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString();
}

function toDateInputValue(value?: string | null) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value).slice(0, 10);
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function expiryDateToIso(value: string) {
  return new Date(`${value}T23:59:59`).toISOString();
}

function eventTypeLabel(value?: string | null) {
  return value === "boardroom" ? "Boardroom" : "Conference";
}

export default function AdminClientAccessPage() {
  const [events, setEvents] = useState<AdminEventItem[]>([]);
  const [credentials, setCredentials] = useState<AdminClientCredential[]>([]);
  const [eventId, setEventId] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [loadingCredentials, setLoadingCredentials] = useState(false);
  const [saving, setSaving] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [editingCredential, setEditingCredential] = useState<AdminClientCredential | null>(null);
  const [editExpiresAt, setEditExpiresAt] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  const selectedEvent = useMemo(
    () => events.find((event) => event.id === eventId) || null,
    [eventId, events]
  );

  const loadEvents = useCallback(async () => {
    setLoadingEvents(true);
    try {
      const rows = await listAdminEvents(false);
      setEvents(rows);
      setEventId((current) =>
        rows.some((event) => event.id === current) ? current : ""
      );
    } catch (error) {
      toast.error("Failed to load events", { description: getErrorMessage(error) });
      setEvents([]);
    } finally {
      setLoadingEvents(false);
    }
  }, []);

  const loadCredentials = useCallback(async () => {
    if (!eventId) {
      setCredentials([]);
      return;
    }
    setLoadingCredentials(true);
    try {
      const rows = await listAdminClientCredentials({ eventId, includeInactive: true });
      setCredentials(rows);
    } catch (error) {
      toast.error("Failed to load client access", { description: getErrorMessage(error) });
      setCredentials([]);
    } finally {
      setLoadingCredentials(false);
    }
  }, [eventId]);

  useEffect(() => {
    void loadEvents();
  }, [loadEvents]);

  useEffect(() => {
    void loadCredentials();
  }, [loadCredentials]);

  const handleCreate = async () => {
    if (!selectedEvent) {
      toast.error("Select an event first");
      return;
    }
    if (!companyName.trim()) {
      toast.error("Company name is required");
      return;
    }
    if (!username.trim()) {
      toast.error("Username is required");
      return;
    }
    if (!password.trim()) {
      toast.error("Password is required");
      return;
    }
    if (!expiresAt) {
      toast.error("Expiry date is required");
      return;
    }

    setSaving(true);
    try {
      const response = await createAdminClientCredential({
        eventId: selectedEvent.id,
        companyName: companyName.trim(),
        username: username.trim(),
        password,
        fullName: fullName.trim(),
        eventType: selectedEvent.eventType || "conference",
        expiresAt: new Date(`${expiresAt}T23:59:59`).toISOString(),
        isActive: true,
      });
      toast.success("Client access created", {
        description: `${response.credential.user?.username || username} can open ${selectedEvent.eventName}.`,
      });
      setUsername("");
      setPassword("");
      setFullName("");
      setExpiresAt("");
      await loadCredentials();
    } catch (error) {
      toast.error("Failed to create client access", { description: getErrorMessage(error) });
    } finally {
      setSaving(false);
    }
  };

  const formDisabled = !selectedEvent || loadingEvents || saving;

  const handleRevoke = async (credential: AdminClientCredential) => {
    setRevokingId(credential.id);
    try {
      await revokeAdminClientCredential(credential.id);
      toast.success("Client access revoked", {
        description: credential.user?.username || credential.companyName,
      });
      await loadCredentials();
    } catch (error) {
      toast.error("Failed to revoke client access", { description: getErrorMessage(error) });
    } finally {
      setRevokingId(null);
    }
  };

  const openEditDialog = (credential: AdminClientCredential) => {
    setEditingCredential(credential);
    setEditExpiresAt(toDateInputValue(credential.expiresAt));
  };

  const closeEditDialog = () => {
    if (editSaving) return;
    setEditingCredential(null);
    setEditExpiresAt("");
  };

  const handleUpdateExpiry = async () => {
    if (!editingCredential) return;
    if (!editExpiresAt) {
      toast.error("Expiry date is required");
      return;
    }

    setEditSaving(true);
    try {
      const updated = await updateAdminClientCredential(editingCredential.id, {
        expiresAt: expiryDateToIso(editExpiresAt),
      });
      setCredentials((prev) => prev.map((credential) => (credential.id === updated.id ? updated : credential)));
      toast.success("Expiry updated", {
        description: `${updated.user?.username || updated.companyName} expires ${formatDate(updated.expiresAt)}.`,
      });
      closeEditDialog();
    } catch (error) {
      toast.error("Failed to update expiry", { description: getErrorMessage(error) });
    } finally {
      setEditSaving(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100dvh-3rem)] flex-col overflow-y-auto bg-transparent p-1 font-sans">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between"
      >
        <div>
          <p className="text-lg font-normal text-zinc-900">Admin Control</p>
          <h1 className="mt-0 text-2xl font-semibold tracking-tight text-zinc-900">Client Access</h1>
          <p className="mt-1 max-w-3xl text-sm text-zinc-500">
            Assign event dashboard credentials by event and company.
          </p>
        </div>

        <Button
          type="button"
          onClick={() => {
            void loadEvents();
            void loadCredentials();
          }}
          disabled={loadingEvents || loadingCredentials || saving}
          className="h-11 rounded-full border border-blue-500/20 bg-blue-600 px-5 text-sm font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_10px_22px_-16px_rgba(37,99,235,0.95)] hover:bg-blue-700 disabled:bg-blue-600/55"
        >
          {loadingEvents || loadingCredentials ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          Refresh
        </Button>
      </motion.div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <section className="min-w-0 space-y-5">
          <Card className="overflow-hidden rounded-2xl border border-zinc-300 bg-white/90">
            <div className="flex items-center justify-between gap-4 border-b border-zinc-100 px-5 py-4">
              <div>
                <h2 className="text-base font-semibold text-zinc-900">Current Client Access</h2>
                <p className="text-sm text-zinc-500">
                  {selectedEvent
                    ? `${credentials.length} records for ${selectedEvent.eventName}.`
                    : "Select an event in the create form to view existing credentials."}
                </p>
              </div>
              <KeyRound className="h-5 w-5 text-zinc-400" />
            </div>

            <div className="divide-y divide-zinc-100">
              {loadingCredentials ? (
                <div className="flex min-h-40 items-center justify-center px-5 py-10 text-sm text-zinc-500">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading client access...
                </div>
              ) : credentials.length ? (
                credentials.map((credential) => (
                  <div key={credential.id} className="grid gap-4 px-5 py-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_auto] lg:items-center">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-zinc-900">
                        {credential.user?.fullName || credential.user?.username || credential.userId}
                      </p>
                      <p className="mt-1 truncate text-xs text-zinc-500">{credential.user?.username || credential.userId}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-zinc-700">{credential.companyName}</p>
                      <p className="mt-1 text-xs text-zinc-500">
                        {credential.isUsable ? "Active" : "Expired or revoked"} | Expires {formatDate(credential.expiresAt)}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 lg:justify-end">
                      <Button
                        type="button"
                        variant="outline"
                        disabled={revokingId === credential.id}
                        onClick={() => openEditDialog(credential)}
                        className="h-9 border-blue-200 bg-white px-3 text-xs font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-50"
                      >
                        <Pencil className="mr-1.5 h-3.5 w-3.5" />
                        Edit
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        disabled={revokingId === credential.id || !credential.isActive}
                        onClick={() => void handleRevoke(credential)}
                        className="h-9 border-red-200 bg-white px-3 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                      >
                        {revokingId === credential.id ? (
                          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                        )}
                        Revoke
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="px-5 py-10 text-center text-sm text-zinc-500">
                  {selectedEvent ? "No client credentials for this event." : "No event selected."}
                </div>
              )}
            </div>
          </Card>
        </section>

        <Card className="h-fit rounded-2xl border border-zinc-300 bg-white/90 p-5 xl:sticky xl:top-6">
          <div className="mb-5 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-zinc-900">Create Client User</h2>
              <p className="mt-1 text-sm text-zinc-500">
                The backend enforces three active users per company for each event.
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-blue-100 bg-blue-50 text-blue-700">
              <UserPlus className="h-5 w-5" />
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Event</label>
              <Select value={eventId} onValueChange={setEventId} disabled={loadingEvents || saving}>
                <SelectTrigger className="h-10 border-zinc-300 bg-white">
                  <SelectValue placeholder={loadingEvents ? "Loading active events..." : "Select active event"} />
                </SelectTrigger>
                <SelectContent className="border-zinc-300 bg-white">
                  {events.map((event) => (
                    <SelectItem key={event.id} value={event.id}>
                      {event.eventName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-zinc-500">
                {selectedEvent
                  ? `${eventTypeLabel(selectedEvent.eventType)} | ${formatDate(selectedEvent.date)}`
                  : "Choose an active event before entering client details."}
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Company Name</label>
              <Input
                value={companyName}
                onChange={(event) => setCompanyName(event.target.value)}
                placeholder="Client company"
                disabled={formDisabled}
                className="h-10 border-zinc-300 bg-white"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Username</label>
              <Input
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="client.username"
                disabled={formDisabled}
                className="h-10 border-zinc-300 bg-white"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Display Name</label>
              <Input
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                placeholder="Optional"
                disabled={formDisabled}
                className="h-10 border-zinc-300 bg-white"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Password</label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Set password"
                  disabled={formDisabled}
                  className="h-10 border-zinc-300 bg-white pr-11"
                />
                <button
                  type="button"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  disabled={formDisabled}
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Expiry Date</label>
              <Input
                type="date"
                value={expiresAt}
                onChange={(event) => setExpiresAt(event.target.value)}
                disabled={formDisabled}
                className="h-10 border-zinc-300 bg-white"
              />
            </div>

            <Button
              type="button"
              onClick={() => void handleCreate()}
              disabled={saving || loadingEvents || !selectedEvent}
              className="h-10 w-full bg-sidebar text-white hover:bg-zinc-800 disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <UserPlus className="mr-2 h-4 w-4" />
              )}
              Create Client Access
            </Button>
          </div>
        </Card>
      </div>

      {editingCredential ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-blue-950/35 p-4 backdrop-blur-[3px]">
          <Card className="admin-modal-panel w-full max-w-md overflow-hidden rounded-2xl border border-blue-100 bg-white">
            <div className="flex items-start justify-between gap-4 border-b border-zinc-100 px-5 py-4">
              <div>
                <p className="text-xs font-semibold uppercase text-blue-700">Client Access</p>
                <h3 className="mt-1 text-lg font-semibold text-slate-900">Edit Expiry Date</h3>
                <p className="mt-1 text-sm text-zinc-500">
                  {editingCredential.user?.username || editingCredential.userId}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                onClick={closeEditDialog}
                disabled={editSaving}
                className="h-8 w-8 rounded-md border border-zinc-300 bg-white p-0 text-zinc-500 hover:bg-blue-50 hover:text-blue-700 disabled:opacity-50"
                aria-label="Close edit form"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-4 px-5 py-5">
              <div className="rounded-md border border-blue-100 bg-blue-50/70 px-3 py-2 text-xs text-blue-900">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <CalendarClock className="h-3.5 w-3.5 text-blue-700" />
                  <span className="font-semibold">{editingCredential.companyName}</span>
                  <span className="text-blue-300">|</span>
                  <span>Current expiry: {formatDate(editingCredential.expiresAt)}</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Expiry Date</label>
                <Input
                  type="date"
                  value={editExpiresAt}
                  onChange={(event) => setEditExpiresAt(event.target.value)}
                  disabled={editSaving}
                  className="h-10 border-zinc-300 bg-white"
                  autoComplete="off"
                />
              </div>
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-zinc-100 px-5 py-4 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="ghost"
                disabled={editSaving}
                onClick={closeEditDialog}
                className="h-9 rounded-md border border-zinc-300 bg-white px-3 text-zinc-700 hover:bg-zinc-50"
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={editSaving}
                onClick={() => void handleUpdateExpiry()}
                className="h-9 rounded-md bg-blue-600 px-4 text-white hover:bg-blue-700"
              >
                {editSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save Expiry
              </Button>
            </div>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
