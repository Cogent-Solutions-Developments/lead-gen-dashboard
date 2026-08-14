"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Clock3,
  History,
  Info,
  Loader2,
  LockKeyhole,
  Search,
  SlidersHorizontal,
  UserRound,
  UserRoundX,
  UsersRound,
  X,
} from "lucide-react";
import { MyLeadsWorkspace } from "@/app/my-leads/page";
import { UserAvatar } from "@/components/profile/UserAvatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import {
  TEAM_LEAD_MEMBER_HEADER,
  TEAM_LEAD_TAKEOVER_REASON_HEADER,
  TEAM_LEAD_TAKEOVER_REQUIRED_EVENT,
  canAccessTeamLeads,
  clearTeamLeadRequestScope,
  getTeamLeadErrorMessage,
  isInactiveTeamLeadMember,
  setTeamLeadRequestScope,
  teamLeadPipelineFor,
  teamLeadQueryKey,
  type TeamLeadLifecycleStatus,
  type TeamLeadMember,
} from "@/lib/teamLeads";
import {
  listTeamLeadActions,
  listTeamLeadMembers,
  type TeamLeadAction,
  type TeamLeadDelegationMetadata,
  type TeamLeadManagerScope,
} from "@/lib/teamLeadsApi";
import { cn } from "@/lib/utils";

const MEMBER_PAGE_SIZE = 50;
const HISTORY_PAGE_SIZE = 100;

function memberName(member: TeamLeadMember) {
  return member.fullName || member.username || "Team member";
}

function memberStatusDotClass(status: TeamLeadLifecycleStatus) {
  if (status === "active") return "bg-emerald-500";
  if (status === "resigned") return "bg-amber-500";
  if (status === "terminated") return "bg-rose-500";
  return "bg-zinc-400";
}

function memberDeactivatedIconClass(status: TeamLeadLifecycleStatus) {
  return status === "terminated" ? "text-rose-600" : "text-amber-600";
}

function formatTimeWindow(startValue?: string | null, endValue?: string | null) {
  if (!startValue) return "Time unavailable";
  const start = new Date(startValue);
  if (Number.isNaN(start.getTime())) return startValue;

  const date = new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const time = new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });
  const end = endValue ? new Date(endValue) : null;
  if (!end || Number.isNaN(end.getTime()) || end.getTime() === start.getTime()) {
    return `${date.format(start)} · ${time.format(start)}`;
  }

  const sameDate =
    start.getFullYear() === end.getFullYear() &&
    start.getMonth() === end.getMonth() &&
    start.getDate() === end.getDate();
  if (sameDate) {
    return `${date.format(start)} · ${time.format(start)} – ${time.format(end)}`;
  }
  return `${date.format(start)}, ${time.format(start)} – ${date.format(end)}, ${time.format(end)}`;
}

function humanize(value: string) {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .trim()
    .toLowerCase();
}

function actionLabel(value: string) {
  const label = humanize(value).replace(/\bworkflow status\b/g, "status");
  return label ? `${label.charAt(0).toUpperCase()}${label.slice(1)}` : "Action";
}

function actionSentence(item: TeamLeadAction) {
  const actor = item.actor?.fullName || item.actor?.username || "A manager";
  const owner = item.owner?.fullName || item.owner?.username || "the selected member";
  const entity = humanize(item.entityType || "record");
  const action = actionLabel(item.action || "updated").toLowerCase();
  return `${actor} ${action} for ${entity === "lead" ? "a lead" : `a ${entity}`} owned by ${owner}.`;
}

function outcomeLabel(outcome: string) {
  const normalized = outcome.toLowerCase();
  if (normalized === "succeeded") return "Completed";
  if (normalized === "started") return "In progress";
  if (normalized === "denied") return "Not allowed";
  if (normalized === "failed") return "Failed";
  return "Status unavailable";
}

function outcomeClasses(outcome: string) {
  const normalized = outcome.toLowerCase();
  if (normalized === "succeeded") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (normalized === "denied" || normalized === "failed") {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }
  if (normalized === "started") return "border-blue-200 bg-blue-50 text-blue-700";
  return "border-zinc-300 bg-zinc-100 text-zinc-600";
}

function useDialogFocusTrap(open: boolean, onClose: () => void) {
  const dialogRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusableSelector =
      'button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const firstFocusable = dialog.querySelector<HTMLElement>(focusableSelector);
    firstFocusable?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(focusableSelector));
      if (!focusable.length) {
        event.preventDefault();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    dialog.addEventListener("keydown", onKeyDown);
    return () => {
      dialog.removeEventListener("keydown", onKeyDown);
      previousFocus?.focus();
    };
  }, [onClose, open]);

  return dialogRef;
}

type TakeoverDialogProps = {
  member: TeamLeadMember | null;
  open: boolean;
  backendMessage: string;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
};

function TakeoverDialog({
  member,
  open,
  backendMessage,
  onCancel,
  onConfirm,
}: TakeoverDialogProps) {
  const [reason, setReason] = useState("");
  const [validationError, setValidationError] = useState("");
  const close = useCallback(() => {
    setReason("");
    setValidationError("");
    onCancel();
  }, [onCancel]);
  const dialogRef = useDialogFocusTrap(open, close);

  if (!open || !member) return null;

  const confirm = () => {
    const trimmed = reason.trim();
    if (trimmed.length < 3) {
      setValidationError("Enter a reason with at least three non-whitespace characters.");
      return;
    }
    onConfirm(trimmed);
    setReason("");
    setValidationError("");
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-zinc-950/45 backdrop-blur-[3px]"
        aria-label="Close takeover dialog"
        onClick={close}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="team-lead-takeover-title"
        aria-describedby="team-lead-takeover-description"
        className="relative z-[1] w-full max-w-lg rounded-2xl border border-zinc-300 bg-white p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-amber-200 bg-amber-50 text-amber-700">
              <LockKeyhole className="h-5 w-5" />
            </div>
            <h2 id="team-lead-takeover-title" className="mt-5 text-2xl font-semibold tracking-tight text-zinc-950">
              Take control of this member&apos;s leads
            </h2>
          </div>
          <Button type="button" variant="ghost" size="icon" onClick={close} aria-label="Close">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <p id="team-lead-takeover-description" className="mt-3 text-sm leading-6 text-zinc-600">
          {memberName(member)} is active. Your manager identity and the reason below will be recorded with every
          modifying action.
        </p>
        {backendMessage ? (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {backendMessage}
          </div>
        ) : null}

        <label htmlFor="team-lead-takeover-reason" className="mt-5 block text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Takeover reason
        </label>
        <Textarea
          id="team-lead-takeover-reason"
          value={reason}
          onChange={(event) => {
            setReason(event.target.value);
            if (validationError) setValidationError("");
          }}
          placeholder="Why do you need to manage this member's leads?"
          maxLength={500}
          className="mt-2 min-h-28 border-zinc-300 bg-white"
          aria-invalid={Boolean(validationError)}
          aria-describedby={validationError ? "team-lead-takeover-error" : undefined}
        />
        {validationError ? (
          <p id="team-lead-takeover-error" className="mt-2 text-sm text-rose-600">
            {validationError}
          </p>
        ) : null}

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={close}>
            Keep view-only
          </Button>
          <Button type="button" onClick={confirm} className="bg-amber-600 text-white hover:bg-amber-700">
            Confirm takeover
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function TeamLeadsPage() {
  const router = useRouter();
  const { role, user } = useAuth();
  const authorized = canAccessTeamLeads(role);
  const [memberSearch, setMemberSearch] = useState("");
  const [debouncedMemberSearch, setDebouncedMemberSearch] = useState("");
  const [memberOffset, setMemberOffset] = useState(0);
  const [members, setMembers] = useState<TeamLeadMember[]>([]);
  const [membersTotal, setMembersTotal] = useState(0);
  const [membersHasMore, setMembersHasMore] = useState(false);
  const [membersLoading, setMembersLoading] = useState(true);
  const [membersError, setMembersError] = useState("");
  const [selectedMember, setSelectedMember] = useState<TeamLeadMember | null>(null);
  const [takeoverReason, setTakeoverReason] = useState("");
  const [takeoverOpen, setTakeoverOpen] = useState(false);
  const [takeoverBackendMessage, setTakeoverBackendMessage] = useState("");
  const [activeTab, setActiveTab] = useState<"leads" | "history">("leads");
  const [actionFilter, setActionFilter] = useState("");
  const [outcomeFilter, setOutcomeFilter] = useState("");
  const [historyFiltersOpen, setHistoryFiltersOpen] = useState(false);
  const [historyActionOptions, setHistoryActionOptions] = useState<string[]>([]);
  const [historyItems, setHistoryItems] = useState<TeamLeadAction[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyLoadingMore, setHistoryLoadingMore] = useState(false);
  const [historyHasMore, setHistoryHasMore] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const historyRequestRef = useRef(0);
  const selectedMemberRef = useRef<TeamLeadMember | null>(null);
  const takeoverReasonRef = useRef("");
  const delegationRef = useRef<TeamLeadDelegationMetadata>({
    memberHeader: TEAM_LEAD_MEMBER_HEADER,
    takeoverReasonHeader: TEAM_LEAD_TAKEOVER_REASON_HEADER,
  });
  const managerScopeRef = useRef<TeamLeadManagerScope>({});

  const configureRequestScope = useCallback(
    (
      member: TeamLeadMember,
      reason: string,
      metadata: TeamLeadDelegationMetadata = delegationRef.current
    ) => {
      setTeamLeadRequestScope({
        memberId: member.id,
        memberName: memberName(member),
        pipeline: teamLeadPipelineFor(
          managerScopeRef.current.persona ||
            managerScopeRef.current.pipeline ||
            member.role
        ),
        memberHeader: metadata.memberHeader,
        takeoverReasonHeader: metadata.takeoverReasonHeader,
        lifecycleStatus: member.lifecycleStatus,
        isActive: !isInactiveTeamLeadMember(member),
        canManage: member.access.canManage,
        takeoverRequired: member.access.takeoverRequired,
        takeoverReason: reason,
      });
    },
    []
  );

  const selectMember = useCallback(
    (
      member: TeamLeadMember,
      metadata: TeamLeadDelegationMetadata = delegationRef.current
    ) => {
      if (!member.access.canView) return;
      clearTeamLeadRequestScope();
      setTakeoverReason("");
      takeoverReasonRef.current = "";
      setTakeoverOpen(false);
      setTakeoverBackendMessage("");
      setSelectedMember(member);
      selectedMemberRef.current = member;
      setActiveTab("leads");
      setActionFilter("");
      setOutcomeFilter("");
      setHistoryFiltersOpen(false);
      setHistoryActionOptions([]);
      setHistoryItems([]);
      setHistoryError("");
      historyRequestRef.current += 1;
      configureRequestScope(member, "", metadata);
    },
    [configureRequestScope]
  );

  useEffect(() => {
    if (authorized) return;
    clearTeamLeadRequestScope();
    router.replace("/dashboard");
  }, [authorized, router]);

  useEffect(() => {
    return () => {
      clearTeamLeadRequestScope();
    };
  }, []);

  useEffect(() => {
    clearTeamLeadRequestScope();
    selectedMemberRef.current = null;
    takeoverReasonRef.current = "";
    setSelectedMember(null);
    setTakeoverReason("");
    setTakeoverOpen(false);
  }, [role, user?.id]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setMemberOffset(0);
      setDebouncedMemberSearch(memberSearch.trim());
    }, 250);
    return () => window.clearTimeout(handle);
  }, [memberSearch]);

  const loadMembers = useCallback(async () => {
    if (!authorized) return;
    setMembersLoading(true);
    setMembersError("");
    try {
      const response = await listTeamLeadMembers({
        includeInactive: true,
        search: debouncedMemberSearch,
        limit: MEMBER_PAGE_SIZE,
        offset: memberOffset,
      });
      setMembers(response.members);
      setMembersTotal(response.pagination.total);
      setMembersHasMore(response.pagination.hasMore);
      managerScopeRef.current = response.managerScope;
      delegationRef.current = response.delegation;

      const current = selectedMemberRef.current;
      if (!current) {
        const firstViewable = response.members.find((member) => member.access.canView);
        if (firstViewable) selectMember(firstViewable, response.delegation);
      } else {
        const refreshed = response.members.find((member) => member.id === current.id);
        if (refreshed) {
          setSelectedMember(refreshed);
          selectedMemberRef.current = refreshed;
          configureRequestScope(refreshed, takeoverReasonRef.current, response.delegation);
        }
      }
    } catch (error: unknown) {
      setMembers([]);
      setMembersTotal(0);
      setMembersHasMore(false);
      setMembersError(getTeamLeadErrorMessage(error));
    } finally {
      setMembersLoading(false);
    }
  }, [
    authorized,
    configureRequestScope,
    debouncedMemberSearch,
    memberOffset,
    selectMember,
  ]);

  useEffect(() => {
    void loadMembers();
  }, [loadMembers]);

  useEffect(() => {
    const onTakeoverRequired = (event: Event) => {
      const member = selectedMemberRef.current;
      if (!member || isInactiveTeamLeadMember(member)) return;
      const message =
        event instanceof CustomEvent && typeof event.detail?.message === "string"
          ? event.detail.message
          : "This active member requires a takeover reason.";
      setTakeoverReason("");
      takeoverReasonRef.current = "";
      configureRequestScope(member, "");
      setTakeoverBackendMessage(message);
      setTakeoverOpen(true);
    };
    window.addEventListener(TEAM_LEAD_TAKEOVER_REQUIRED_EVENT, onTakeoverRequired);
    return () => window.removeEventListener(TEAM_LEAD_TAKEOVER_REQUIRED_EVENT, onTakeoverRequired);
  }, [configureRequestScope]);

  const loadHistory = useCallback(
    async (offset: number, append: boolean) => {
      const member = selectedMemberRef.current;
      if (!member || activeTab !== "history") return;
      const requestId = ++historyRequestRef.current;
      if (append) setHistoryLoadingMore(true);
      else setHistoryLoading(true);
      setHistoryError("");
      try {
        const response = await listTeamLeadActions({
          memberUserId: member.id,
          action: actionFilter,
          outcome: outcomeFilter,
          limit: HISTORY_PAGE_SIZE,
          offset,
        });
        if (requestId !== historyRequestRef.current) return;
        setHistoryItems((current) => (append ? [...current, ...response.actions] : response.actions));
        if (!actionFilter.trim()) {
          const receivedActions = response.actions
            .map((item) => item.action.trim())
            .filter(Boolean);
          setHistoryActionOptions((current) => {
            const options = append ? [...current, ...receivedActions] : receivedActions;
            return Array.from(new Set(options)).sort((left, right) =>
              actionLabel(left).localeCompare(actionLabel(right))
            );
          });
        }
        setHistoryHasMore(response.pagination.hasMore);
      } catch (error: unknown) {
        if (requestId !== historyRequestRef.current) return;
        if (!append) setHistoryItems([]);
        setHistoryError(getTeamLeadErrorMessage(error));
      } finally {
        if (requestId === historyRequestRef.current) {
          setHistoryLoading(false);
          setHistoryLoadingMore(false);
        }
      }
    },
    [actionFilter, activeTab, outcomeFilter]
  );

  useEffect(() => {
    if (activeTab !== "history" || !selectedMember) return;
    const handle = window.setTimeout(() => {
      void loadHistory(0, false);
    }, 200);
    return () => window.clearTimeout(handle);
  }, [activeTab, actionFilter, loadHistory, outcomeFilter, selectedMember]);

  const activeMember = selectedMember && !isInactiveTeamLeadMember(selectedMember);
  const takeoverMode = Boolean(activeMember && takeoverReason);
  const historyCacheKey = selectedMember
    ? teamLeadQueryKey(selectedMember.id, "history", actionFilter, outcomeFilter)
    : "";

  const confirmTakeover = (reason: string) => {
    const member = selectedMemberRef.current;
    if (!member) return;
    setTakeoverReason(reason);
    takeoverReasonRef.current = reason;
    configureRequestScope(member, reason);
    setTakeoverBackendMessage("");
    setTakeoverOpen(false);
  };

  const endTakeover = () => {
    const member = selectedMemberRef.current;
    if (!member) return;
    setTakeoverReason("");
    takeoverReasonRef.current = "";
    configureRequestScope(member, "");
    setTakeoverBackendMessage("");
  };

  const handleMemberKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>, member: TeamLeadMember) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    selectMember(member);
  };

  if (!authorized) return null;

  return (
    <>
      <div className="flex min-h-[calc(100dvh-3rem)] flex-col bg-transparent font-sans xl:h-[calc(100dvh-3rem)] xl:overflow-hidden">
        <header className="shrink-0 border-b border-zinc-300 pb-4">
          <h1 className="text-3xl font-light tracking-tight text-zinc-950 sm:text-4xl xl:text-5xl">Team Leads</h1>
        </header>

        <div className="mt-4 grid min-h-0 gap-4 lg:grid-cols-[17rem_minmax(0,1fr)] xl:flex-1 xl:gap-6 xl:grid-cols-[18rem_minmax(0,1fr)] xl:overflow-hidden">
          <aside className="flex max-h-[30rem] min-h-0 flex-col rounded-2xl border border-zinc-300 bg-white shadow-[0_24px_60px_-48px_rgba(15,23,42,0.55)] lg:max-h-none">
            <div className="border-b border-zinc-200 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-zinc-950">Department members</h2>
                  <p className="mt-1 text-xs text-zinc-500">{membersTotal.toLocaleString()} available</p>
                </div>
                <UsersRound className="h-5 w-5 text-blue-700" />
              </div>
              <div className="relative mt-4">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                <Input
                  value={memberSearch}
                  onChange={(event) => setMemberSearch(event.target.value)}
                  placeholder="Search members"
                  aria-label="Search team members"
                  className="h-10 border-zinc-300 bg-white pl-9"
                />
              </div>
            </div>

            <div className="min-h-72 flex-1 overflow-y-auto p-2 scrollbar-modern">
              {membersLoading ? (
                <div className="flex min-h-48 items-center justify-center text-sm text-zinc-500">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading members...
                </div>
              ) : membersError ? (
                <div className="m-2 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
                  <AlertTriangle className="mb-2 h-5 w-5" />
                  {membersError}
                  <Button type="button" variant="outline" size="sm" className="mt-4 w-full" onClick={() => void loadMembers()}>
                    Retry
                  </Button>
                </div>
              ) : members.length === 0 ? (
                <div className="flex min-h-48 flex-col items-center justify-center px-6 text-center text-sm text-zinc-500">
                  <UserRound className="mb-3 h-7 w-7 text-zinc-300" />
                  No department members match this search.
                </div>
              ) : (
                <div role="listbox" aria-label="Team members" className="space-y-1">
                  {members.map((member) => {
                    const selected = selectedMember?.id === member.id;
                    const inactive = isInactiveTeamLeadMember(member);
                    return (
                      <button
                        key={member.id}
                        type="button"
                        role="option"
                        aria-selected={selected}
                        aria-label={`${memberName(member)}, ${member.lifecycleStatus}`}
                        disabled={!member.access.canView}
                        onClick={() => selectMember(member)}
                        onKeyDown={(event) => handleMemberKeyDown(event, member)}
                        className={cn(
                          "inline-flex w-full items-center gap-3 rounded-lg border px-3 py-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
                          selected
                            ? "border-blue-200 bg-blue-50 text-blue-800 shadow-sm"
                            : "border-transparent text-zinc-600 hover:border-blue-100 hover:bg-white hover:text-blue-700",
                          !member.access.canView && "cursor-not-allowed opacity-50"
                        )}
                      >
                        <UserAvatar
                          user={member}
                          size="md"
                          className={cn(
                            "!h-9 !w-9 !rounded-lg shadow-sm",
                            selected
                              ? "!border-blue-600 !bg-blue-600 !text-white"
                              : "!border-zinc-200 !bg-white !text-zinc-700"
                          )}
                        />
                        <span className="min-w-0 flex-1 text-left">
                          <span className="block truncate">{memberName(member)}</span>
                          <span className="mt-0.5 flex items-center gap-1.5 truncate text-xs font-normal text-zinc-500">
                            <span
                              className={cn(
                                "h-1.5 w-1.5 shrink-0 rounded-full",
                                memberStatusDotClass(member.lifecycleStatus)
                              )}
                              aria-hidden="true"
                            />
                            {member.username}
                          </span>
                        </span>
                        {inactive ? (
                          <span
                            className={cn(
                              "group relative inline-flex h-6 w-6 shrink-0 items-center justify-center",
                              memberDeactivatedIconClass(member.lifecycleStatus)
                            )}
                          >
                            <UserRoundX className="h-4.5 w-4.5 stroke-[2.25]" aria-hidden="true" />
                            <span
                              role="tooltip"
                              className="pointer-events-none invisible absolute right-0 top-full z-40 mt-0 w-max translate-y-1 text-[11px] font-normal text-current opacity-0 transition-all group-hover:visible group-hover:translate-y-0 group-hover:opacity-100"
                            >
                              Deactivated user
                            </span>
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between border-t border-zinc-200 p-3">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={memberOffset === 0 || membersLoading}
                onClick={() => setMemberOffset((current) => Math.max(0, current - MEMBER_PAGE_SIZE))}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <span className="text-xs tabular-nums text-zinc-500">
                {membersTotal ? `${memberOffset + 1}-${Math.min(memberOffset + members.length, membersTotal)}` : "0"}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={!membersHasMore || membersLoading}
                onClick={() => setMemberOffset((current) => current + MEMBER_PAGE_SIZE)}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </aside>

          <section className="min-w-0 xl:flex xl:min-h-0 xl:flex-col xl:overflow-hidden">
            {!selectedMember ? (
              <div className="flex min-h-[34rem] flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-300 bg-white/60 px-6 text-center xl:min-h-0 xl:flex-1">
                <UsersRound className="h-10 w-10 text-zinc-300" />
                <h2 className="mt-5 text-xl font-semibold text-zinc-900">Select a team member</h2>
                <p className="mt-2 max-w-md text-sm leading-6 text-zinc-500">
                  Choose a department member to view their campaign and lead workspace.
                </p>
              </div>
            ) : (
              <>
                {!isInactiveTeamLeadMember(selectedMember) &&
                !selectedMember.access.canManage &&
                !selectedMember.access.takeoverRequired ? (
                  <div className="flex shrink-0 gap-3 rounded-2xl border border-zinc-300 bg-zinc-100 px-5 py-4 text-sm text-zinc-700">
                    <LockKeyhole className="h-5 w-5 shrink-0" />
                    Your current pipeline permissions allow viewing only. Modifying controls remain protected.
                  </div>
                ) : null}

                <div
                  className={cn(
                    "flex shrink-0 flex-col gap-3 border-b border-zinc-300 sm:flex-row sm:items-center sm:justify-between sm:gap-4",
                    !isInactiveTeamLeadMember(selectedMember) &&
                      !selectedMember.access.canManage &&
                      !selectedMember.access.takeoverRequired
                      ? "mt-4"
                      : ""
                  )}
                >
                  <div className="grid w-full min-w-0 grid-cols-2 sm:flex sm:w-auto" role="tablist" aria-label="Team lead views">
                    <button
                      type="button"
                      role="tab"
                      aria-selected={activeTab === "leads"}
                      onClick={() => setActiveTab("leads")}
                      className={cn(
                        "inline-flex h-11 min-w-0 items-center justify-center gap-2 border-b-2 px-2 text-sm font-semibold transition-colors sm:justify-start sm:px-4",
                        activeTab === "leads"
                          ? "border-blue-600 text-blue-700"
                          : "border-transparent text-zinc-500 hover:text-zinc-900"
                      )}
                    >
                      <UserRound className="h-4 w-4" />
                      Leads
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={activeTab === "history"}
                      onClick={() => setActiveTab("history")}
                      className={cn(
                        "inline-flex h-11 min-w-0 items-center justify-center gap-2 border-b-2 px-2 text-sm font-semibold transition-colors sm:justify-start sm:px-4",
                        activeTab === "history"
                          ? "border-blue-600 text-blue-700"
                          : "border-transparent text-zinc-500 hover:text-zinc-900"
                      )}
                    >
                      <History className="h-4 w-4" />
                      Action history
                    </button>
                  </div>

                  {activeMember &&
                  (takeoverMode ||
                    selectedMember.access.canManage ||
                    selectedMember.access.takeoverRequired) ? (
                    <div className="flex w-full items-center gap-2 pb-2 sm:w-auto sm:pb-1">
                      {takeoverMode ? (
                        <Button type="button" variant="outline" size="sm" className="flex-1 sm:flex-none" onClick={endTakeover}>
                          End takeover
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          onClick={() => {
                            setTakeoverBackendMessage("");
                            setTakeoverOpen(true);
                          }}
                          className="h-10 rounded-full flex-1 border border-blue-500/20 bg-blue-600 px-6 text-sm font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_10px_22px_-14px_rgba(37,99,235,0.95)] hover:bg-blue-700 sm:flex-none"
                        >
                          Take control
                        </Button>
                      )}
                      <span className="group relative inline-flex">
                        <button
                          type="button"
                          aria-label="About takeover controls"
                          aria-describedby="takeover-control-help"
                          className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-blue-50 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                        >
                          <Info className="h-4 w-4" />
                        </button>
                        <span
                          id="takeover-control-help"
                          role="tooltip"
                          className="pointer-events-none invisible absolute right-0 top-full z-40 mt-2 w-72 max-w-[calc(100vw-2rem)] translate-y-1 rounded-xl border border-zinc-200 bg-white p-3 text-left text-xs font-normal leading-5 text-zinc-600 opacity-0 shadow-[0_18px_35px_-24px_rgba(15,23,42,0.55)] transition-all group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100"
                        >
                          {takeoverMode
                            ? "End takeover to return this member's workspace to view-only mode."
                            : "Take control to manage this active member's leads. You must provide a reason, and every action is recorded under your manager account."}
                        </span>
                      </span>
                    </div>
                  ) : null}
                </div>

                {activeTab === "leads" ? (
                  <div
                    role="tabpanel"
                    aria-label="Member leads"
                    className="mt-4 min-w-0 xl:min-h-0 xl:flex-1 xl:overflow-hidden"
                  >
                    <MyLeadsWorkspace
                      key={teamLeadQueryKey(selectedMember.id, "my-leads-workspace")}
                      embedded
                      teamMemberId={selectedMember.id}
                      originLabel={`${memberName(selectedMember)}'s Leads`}
                    />
                  </div>
                ) : (
                  <div
                    role="tabpanel"
                    aria-label="Action history"
                    data-query-cache-key={historyCacheKey}
                    className="mt-5 overflow-hidden rounded-2xl border border-zinc-300 bg-white xl:min-h-0 xl:flex-1"
                  >
                    <div className="flex items-center justify-between gap-4 border-b border-zinc-200 p-5">
                      <div>
                        <h3 className="text-lg font-semibold text-zinc-950">Action history</h3>
                      </div>
                      <button
                        type="button"
                        aria-label="Toggle action history filters"
                        aria-controls="team-lead-history-filters"
                        aria-expanded={historyFiltersOpen}
                        title="Filters"
                        onClick={() => setHistoryFiltersOpen((current) => !current)}
                        className={cn(
                          "relative flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
                          historyFiltersOpen || actionFilter || outcomeFilter
                            ? "border-blue-200 bg-blue-50 text-blue-700"
                            : "border-zinc-200 bg-white text-zinc-500 hover:border-blue-200 hover:text-blue-700"
                        )}
                      >
                        <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
                        {actionFilter || outcomeFilter ? (
                          <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-blue-600" aria-hidden="true" />
                        ) : null}
                      </button>
                    </div>

                    {historyFiltersOpen ? (
                      <div
                        id="team-lead-history-filters"
                        className="grid gap-3 border-b border-zinc-200 bg-zinc-50/70 p-4 sm:grid-cols-2"
                      >
                        <label className="grid gap-1.5 text-xs font-semibold text-zinc-600">
                          Action
                          <select
                            id="team-lead-action-filter"
                            value={actionFilter}
                            onChange={(event) => setActionFilter(event.target.value)}
                            className="h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-800 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                          >
                            <option value="">All actions</option>
                            {historyActionOptions.map((action) => (
                              <option key={action} value={action}>
                                {actionLabel(action)}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="grid gap-1.5 text-xs font-semibold text-zinc-600">
                          Outcome
                          <select
                            id="team-lead-outcome-filter"
                            value={outcomeFilter}
                            onChange={(event) => setOutcomeFilter(event.target.value)}
                            className="h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-800 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                          >
                            <option value="">All outcomes</option>
                            <option value="started">In progress</option>
                            <option value="succeeded">Completed</option>
                            <option value="denied">Not allowed</option>
                            <option value="failed">Failed</option>
                          </select>
                        </label>
                      </div>
                    ) : null}

                    <div className="p-5">
                      {historyLoading ? (
                        <div className="flex min-h-56 items-center justify-center text-sm text-zinc-500">
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Loading audited actions...
                        </div>
                      ) : historyError ? (
                        <div className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800">
                          <AlertTriangle className="mb-2 h-5 w-5" />
                          {historyError}
                          <Button type="button" variant="outline" size="sm" className="mt-4 block" onClick={() => void loadHistory(0, false)}>
                            Retry
                          </Button>
                        </div>
                      ) : historyItems.length === 0 ? (
                        <div className="flex min-h-56 flex-col items-center justify-center text-center text-sm text-zinc-500">
                          <History className="mb-3 h-8 w-8 text-zinc-300" />
                          No audited actions match these filters.
                        </div>
                      ) : (
                        <ol className="space-y-0">
                          {historyItems.map((item, index) => (
                            <li key={item.id || `${item.createdAt}-${index}`} className="relative grid grid-cols-[1.5rem_minmax(0,1fr)] gap-4 pb-7">
                              <div className="relative flex justify-center">
                                {index < historyItems.length - 1 ? (
                                  <span className="absolute bottom-[-1.75rem] top-4 w-px bg-zinc-200" aria-hidden="true" />
                                ) : null}
                                <span className="relative z-[1] mt-1 h-3 w-3 rounded-full border-2 border-blue-600 bg-white" aria-hidden="true" />
                              </div>
                              <article>
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                  <p className="max-w-3xl text-sm font-medium leading-6 text-zinc-900">{actionSentence(item)}</p>
                                  <span className={cn("rounded-full border px-2.5 py-1 text-[11px] font-semibold", outcomeClasses(item.outcome))}>
                                    {outcomeLabel(item.outcome)}
                                  </span>
                                </div>
                                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500">
                                  <span className="inline-flex items-center gap-1.5" aria-label="Time window">
                                    <Clock3 className="h-3.5 w-3.5" />
                                    {formatTimeWindow(item.createdAt, item.completedAt)}
                                  </span>
                                </div>
                                {item.reason ? (
                                  <p className="mt-3 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm leading-6 text-zinc-600">
                                    Reason: {item.reason}
                                  </p>
                                ) : null}
                              </article>
                            </li>
                          ))}
                        </ol>
                      )}

                      {historyHasMore && !historyLoading ? (
                        <div className="border-t border-zinc-200 pt-4 text-center">
                          <Button
                            type="button"
                            variant="outline"
                            disabled={historyLoadingMore}
                            onClick={() => void loadHistory(historyItems.length, true)}
                          >
                            {historyLoadingMore ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                            Load more
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      </div>

      <TakeoverDialog
        member={selectedMember}
        open={takeoverOpen}
        backendMessage={takeoverBackendMessage}
        onCancel={() => {
          setTakeoverOpen(false);
          setTakeoverBackendMessage("");
        }}
        onConfirm={confirmTakeover}
      />
    </>
  );
}
