"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import {
  Camera,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Copy,
  ImagePlus,
  KeyRound,
  Loader2,
  Palette,
  RefreshCw,
  Save,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";

function svgImageDataUrl(value: string) {
  const svg = value.trim();
  if (!/^<svg(?:\s|>)/i.test(svg)) return "";
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
import { UserAvatar } from "@/components/profile/UserAvatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  deleteMyProfileAvatar,
  getRoleLabel,
  getMyProfile,
  getMfaStatus,
  confirmMfaTotpSetup,
  regenerateMfaRecoveryCodes,
  disableMfaTotp,
  startMfaTotpSetup,
  updateMyProfile,
  uploadMyProfileAvatar,
  type MfaStatus,
  type MfaTotpSetup,
  type MyProfile,
} from "@/lib/auth";

const MAX_PROFILE_IMAGE_BYTES = 20 * 1024 * 1024;
const PROFILE_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

type ProfileFormState = {
  fullName: string;
  designation: string;
  dateOfBirth: string;
  mobilePhone: string;
  address: string;
  companyJoinedDate: string;
};

const EMPTY_PROFILE_FORM: ProfileFormState = {
  fullName: "",
  designation: "",
  dateOfBirth: "",
  mobilePhone: "",
  address: "",
  companyJoinedDate: "",
};

const FIELD_INPUT_CLASS =
  "h-9 rounded-none border-0 bg-transparent px-0 text-lg font-light tracking-tight text-zinc-950 shadow-none outline-none placeholder:text-zinc-300 focus-visible:border-transparent focus-visible:ring-0 disabled:opacity-60";
const FIELD_TEXTAREA_CLASS =
  "min-h-20 resize-none rounded-none border-0 bg-transparent px-0 py-0 text-lg font-light leading-6 tracking-tight text-zinc-950 shadow-none outline-none placeholder:text-zinc-300 focus-visible:border-transparent focus-visible:ring-0 disabled:opacity-60";
const MONTH_OPTIONS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const YEAR_PAGE_SIZE = 16;
type DatePickerPanel = "days" | "months" | "years";

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Please try again.";
}

function validateProfileImage(file: File) {
  if (!PROFILE_IMAGE_TYPES.includes(file.type)) return "Use a JPG, PNG, or WebP image.";
  if (file.size > MAX_PROFILE_IMAGE_BYTES) return "Profile image must be 20MB or smaller.";
  return "";
}

function dateInputValue(value?: string | null) {
  const text = String(value || "").trim();
  return /^\d{4}-\d{2}-\d{2}/.test(text) ? text.slice(0, 10) : "";
}

function nullableDate(value: string) {
  const text = value.trim();
  return text ? text : null;
}

function profileToForm(profile: MyProfile): ProfileFormState {
  return {
    fullName: profile.fullName || "",
    designation: profile.designation || "",
    dateOfBirth: dateInputValue(profile.dateOfBirth),
    mobilePhone: profile.mobilePhone || "",
    address: profile.address || "",
    companyJoinedDate: dateInputValue(profile.companyJoinedDate),
  };
}

function displayDate(value: string) {
  if (!value) return "Not set";
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function parseDateValue(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const [, year, month, day] = match;
  const parsed = new Date(Number(year), Number(month) - 1, Number(day));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function toDateValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function sameDate(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function calendarDaysForMonth(date: Date) {
  const firstOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
  const start = new Date(firstOfMonth);
  start.setDate(firstOfMonth.getDate() - firstOfMonth.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const next = new Date(start);
    next.setDate(start.getDate() + index);
    return next;
  });
}

function yearPageStartFor(year: number, fromYear: number, toYear: number) {
  const clampedYear = Math.min(Math.max(year, fromYear), toYear);
  return fromYear + Math.floor((clampedYear - fromYear) / YEAR_PAGE_SIZE) * YEAR_PAGE_SIZE;
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-5 border-b border-zinc-100 py-3">
      <span className="text-sm font-light text-zinc-500">{label}</span>
      <span className="min-w-0 truncate text-right text-sm font-light text-zinc-950">{value || "Not set"}</span>
    </div>
  );
}

function DatePickerField({
  value,
  onChange,
  disabled,
  placeholder = "Select date",
  title,
  fromYear = 1900,
  toYear = new Date().getFullYear() + 5,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  title: string;
  fromYear?: number;
  toYear?: number;
}) {
  const selectedDate = parseDateValue(value);
  const [open, setOpen] = useState(false);
  const [viewDate, setViewDate] = useState<Date>(() => selectedDate ?? new Date());
  const [panel, setPanel] = useState<DatePickerPanel>("days");
  const [yearPageStart, setYearPageStart] = useState(() =>
    yearPageStartFor((selectedDate ?? new Date()).getFullYear(), fromYear, toYear),
  );
  const today = new Date();
  const days = calendarDaysForMonth(viewDate);
  const yearPage = Array.from({ length: YEAR_PAGE_SIZE }, (_, index) => yearPageStart + index);

  const openPicker = () => {
    const nextViewDate = selectedDate ?? new Date();
    setViewDate(nextViewDate);
    setPanel("days");
    setYearPageStart(yearPageStartFor(nextViewDate.getFullYear(), fromYear, toYear));
    setOpen(true);
  };

  const goBack = () => {
    if (panel === "years") {
      setYearPageStart((current) => Math.max(fromYear, current - YEAR_PAGE_SIZE));
      return;
    }
    setViewDate((current) => new Date(current.getFullYear(), current.getMonth() - (panel === "months" ? 12 : 1), 1));
  };

  const goForward = () => {
    if (panel === "years") {
      setYearPageStart((current) => Math.min(yearPageStartFor(toYear, fromYear, toYear), current + YEAR_PAGE_SIZE));
      return;
    }
    setViewDate((current) => new Date(current.getFullYear(), current.getMonth() + (panel === "months" ? 12 : 1), 1));
  };

  return (
    <>
      <button
        type="button"
        onClick={openPicker}
        disabled={disabled}
        className="flex h-9 w-full min-w-0 items-center justify-between gap-5 text-left text-lg font-light tracking-tight text-zinc-950 transition-colors hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span className={value ? "truncate" : "truncate text-zinc-300"}>
          {value ? displayDate(value) : placeholder}
        </span>
        <CalendarDays className="h-4 w-4 shrink-0 text-zinc-500" />
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/25 p-4 backdrop-blur-[3px]">
          <button
            type="button"
            aria-label="Close date picker"
            className="absolute inset-0 cursor-default"
            onClick={() => setOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className="relative w-full max-w-sm overflow-hidden rounded-[1.75rem] border border-zinc-200 bg-white shadow-[0_28px_80px_-42px_rgba(2,10,27,0.72)]"
          >
            <div className="border-b border-zinc-100 px-5 py-4">
              <div className="flex items-center justify-between gap-4">
                <button
                  type="button"
                  onClick={goBack}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-500 transition-colors hover:border-zinc-900 hover:text-zinc-950"
                  aria-label="Previous"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <div className="flex min-w-0 flex-1 items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPanel((current) => (current === "months" ? "days" : "months"))}
                    className={[
                      "h-10 min-w-0 flex-1 rounded-full px-4 text-sm font-medium transition-colors",
                      panel === "months"
                        ? "bg-blue-600 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_10px_22px_-16px_rgba(37,99,235,0.95)]"
                        : "border border-zinc-200 bg-white text-zinc-950 hover:border-zinc-300",
                    ].join(" ")}
                  >
                    {MONTH_OPTIONS[viewDate.getMonth()]}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setYearPageStart(yearPageStartFor(viewDate.getFullYear(), fromYear, toYear));
                      setPanel((current) => (current === "years" ? "days" : "years"));
                    }}
                    className={[
                      "h-10 w-20 rounded-full px-4 text-sm font-medium tabular-nums transition-colors",
                      panel === "years"
                        ? "bg-zinc-950 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_10px_22px_-16px_rgba(2,6,23,0.85)]"
                        : "border border-zinc-200 bg-white text-zinc-950 hover:border-zinc-300",
                    ].join(" ")}
                  >
                    {viewDate.getFullYear()}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={goForward}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-500 transition-colors hover:border-zinc-900 hover:text-zinc-950"
                  aria-label="Next"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="px-5 pb-5 pt-4">
              {panel === "months" ? (
                <div className="grid grid-cols-3 gap-2">
                  {MONTH_OPTIONS.map((month, index) => {
                    const isCurrentMonth = index === viewDate.getMonth();
                    return (
                      <button
                        key={month}
                        type="button"
                        onClick={() => {
                          setViewDate((current) => new Date(current.getFullYear(), index, 1));
                          setPanel("days");
                        }}
                        className={[
                          "h-11 rounded-full text-sm font-medium transition-colors",
                          isCurrentMonth
                            ? "bg-blue-600 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_10px_22px_-16px_rgba(37,99,235,0.95)]"
                            : "border border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 hover:text-zinc-950",
                        ].join(" ")}
                      >
                        {month.slice(0, 3)}
                      </button>
                    );
                  })}
                </div>
              ) : panel === "years" ? (
                <div>
                  <div className="mb-3 flex items-center justify-between text-xs font-medium text-zinc-400">
                    <span>Select year</span>
                    <span className="tabular-nums">
                      {yearPageStart}-{Math.min(yearPageStart + YEAR_PAGE_SIZE - 1, toYear)}
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {yearPage.map((year) => {
                      const disabledYear = year < fromYear || year > toYear;
                      const isCurrentYear = year === viewDate.getFullYear();
                      return (
                        <button
                          key={year}
                          type="button"
                          disabled={disabledYear}
                          onClick={() => {
                            setViewDate((current) => new Date(year, current.getMonth(), 1));
                            setPanel("days");
                          }}
                          className={[
                            "h-11 rounded-full text-sm font-medium tabular-nums transition-colors disabled:cursor-not-allowed disabled:opacity-30",
                            isCurrentYear
                              ? "bg-zinc-950 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_10px_22px_-16px_rgba(2,6,23,0.85)]"
                              : "border border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 hover:text-zinc-950",
                          ].join(" ")}
                        >
                          {year}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-zinc-400">
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                      <span key={day} className="py-1">
                        {day}
                      </span>
                    ))}
                  </div>

                  <div className="mt-2 grid grid-cols-7 gap-1">
                    {days.map((day) => {
                      const dayValue = toDateValue(day);
                      const isCurrentMonth = day.getMonth() === viewDate.getMonth();
                      const isSelected = selectedDate ? sameDate(day, selectedDate) : false;
                      const isToday = sameDate(day, today);

                      return (
                        <button
                          key={dayValue}
                          type="button"
                          onClick={() => {
                            onChange(dayValue);
                            setOpen(false);
                          }}
                          className={[
                            "flex h-9 items-center justify-center rounded-full text-sm font-medium transition-colors",
                            isSelected
                              ? "border border-blue-500/20 bg-blue-600 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_10px_22px_-14px_rgba(37,99,235,0.95)]"
                              : isToday
                                ? "border border-blue-500/20 bg-blue-50 text-blue-700"
                                : isCurrentMonth
                                  ? "text-zinc-700 hover:bg-zinc-100 hover:text-zinc-950"
                                  : "text-zinc-300 hover:bg-zinc-50",
                          ].join(" ")}
                        >
                          {day.getDate()}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}

              <div className="mt-5 flex items-center border-t border-zinc-100 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    onChange("");
                    setOpen(false);
                  }}
                  className="border-b border-transparent pb-1 text-sm font-medium text-zinc-400 transition-colors hover:border-zinc-900 hover:text-zinc-950"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function FieldRow({
  label,
  children,
  align = "center",
}: {
  label: string;
  children: ReactNode;
  align?: "center" | "start";
}) {
  return (
    <div
      className={[
        "grid min-h-0 gap-3 border-b border-zinc-200 py-3 md:grid-cols-[13rem_minmax(0,1fr)]",
        align === "start" ? "flex-[1.35] md:items-start" : "flex-1 md:items-center",
      ].join(" ")}
    >
      <label className="text-sm font-light text-zinc-500">{label}</label>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

type ProfileCompletionItem = {
  label: string;
  complete: boolean;
};

function ProfileCompletionTracker({ items }: { items: ProfileCompletionItem[] }) {
  const completedCount = items.filter((item) => item.complete).length;
  const completionPercent = Math.round((completedCount / items.length) * 100);

  if (completionPercent >= 100) {
    return (
      <div className="border-b border-zinc-100 pb-1 pt-0">
        <p className="text-sm font-light text-zinc-500">Profile complete</p>
        <p className="mt-1 text-xs font-light text-zinc-400">
          Thanks for keeping your details up to date.
        </p>
      </div>
    );
  }

  return (
    <div className="border-b border-zinc-100 pb-1 pt-0">
      <div className="flex items-end justify-between gap-5">
        <div>
          <p className="text-sm font-light text-zinc-500">Profile completion</p>
          <p className="mt-1 text-xs font-light text-zinc-400">
            {completedCount} of {items.length} details set
          </p>
        </div>
        <span className="text-3xl font-light tabular-nums tracking-tight text-zinc-950">
          {completionPercent}%
        </span>
      </div>

      <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-200">
        <div
          className="h-full rounded-full bg-blue-600 shadow-[0_8px_18px_-12px_rgba(37,99,235,0.95)] transition-[width]"
          style={{ width: `${completionPercent}%` }}
        />
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [profile, setProfile] = useState<MyProfile | null>(null);
  const [form, setForm] = useState<ProfileFormState>(EMPTY_PROFILE_FORM);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState("");
  const [avatarDialogOpen, setAvatarDialogOpen] = useState(false);
  const [themeDialogOpen, setThemeDialogOpen] = useState(false);
  const [mfaStatus, setMfaStatus] = useState<MfaStatus | null>(null);
  const [mfaSetup, setMfaSetup] = useState<MfaTotpSetup | null>(null);
  const mfaQrImageUrl = mfaSetup?.qrSvg ? svgImageDataUrl(mfaSetup.qrSvg) : "";
  const [mfaConfirmCode, setMfaConfirmCode] = useState("");
  const [mfaRecoveryCodes, setMfaRecoveryCodes] = useState<string[]>([]);
  const [mfaRegenerateCode, setMfaRegenerateCode] = useState("");
  const [mfaDisableCode, setMfaDisableCode] = useState("");
  const [mfaBusy, setMfaBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        const [next, nextMfaStatus] = await Promise.all([getMyProfile(), getMfaStatus()]);
        if (!active) return;
        setProfile(next);
        setForm(profileToForm(next));
        setMfaStatus(nextMfaStatus);
      } catch (error: unknown) {
        toast.error("Profile failed to load", { description: getErrorMessage(error) });
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let objectUrl = "";

    if (selectedFile) {
      objectUrl = window.URL.createObjectURL(selectedFile);
      setAvatarPreviewUrl(objectUrl);
    } else {
      setAvatarPreviewUrl("");
    }

    return () => {
      if (objectUrl) window.URL.revokeObjectURL(objectUrl);
    };
  }, [selectedFile]);

  const updateField = (field: keyof ProfileFormState, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSelectFile = (file: File | null) => {
    if (!file) {
      setSelectedFile(null);
      return;
    }
    const error = validateProfileImage(file);
    if (error) {
      toast.error("Profile image rejected", { description: error });
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    setSelectedFile(file);
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const next = await updateMyProfile({
        fullName: form.fullName.trim(),
        designation: form.designation.trim(),
        dateOfBirth: nullableDate(form.dateOfBirth),
        mobilePhone: form.mobilePhone.trim(),
        address: form.address.trim(),
        companyJoinedDate: nullableDate(form.companyJoinedDate),
      });
      setProfile(next);
      setForm(profileToForm(next));
      toast.success("Profile updated");
    } catch (error: unknown) {
      toast.error("Profile update failed", { description: getErrorMessage(error) });
    } finally {
      setSaving(false);
    }
  };

  const handleUploadAvatar = async () => {
    if (!selectedFile) {
      toast.error("Choose an image first");
      return;
    }
    setAvatarBusy(true);
    try {
      const response = await uploadMyProfileAvatar(selectedFile);
      setProfile(response.profile);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setAvatarDialogOpen(false);
      toast.success("Profile image updated");
    } catch (error: unknown) {
      toast.error("Profile image upload failed", { description: getErrorMessage(error) });
    } finally {
      setAvatarBusy(false);
    }
  };

  const handleDeleteAvatar = async () => {
    setAvatarBusy(true);
    try {
      const response = await deleteMyProfileAvatar();
      setProfile(response.profile);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setAvatarDialogOpen(false);
      toast.success("Profile image removed");
    } catch (error: unknown) {
      toast.error("Profile image delete failed", { description: getErrorMessage(error) });
    } finally {
      setAvatarBusy(false);
    }
  };

  const handleStartMfaSetup = async () => {
    setMfaBusy(true);
    try {
      const setup = await startMfaTotpSetup();
      setMfaSetup(setup);
      setMfaConfirmCode("");
      setMfaRecoveryCodes([]);
      toast.message("Scan the QR code in Microsoft Authenticator.");
    } catch (error: unknown) {
      toast.error("MFA setup failed", { description: getErrorMessage(error) });
    } finally {
      setMfaBusy(false);
    }
  };

  const handleConfirmMfaSetup = async () => {
    if (!mfaSetup) return;
    if (!mfaConfirmCode.trim()) {
      toast.error("Authenticator code is required.");
      return;
    }
    setMfaBusy(true);
    try {
      const result = await confirmMfaTotpSetup(mfaSetup.methodId, mfaConfirmCode.trim());
      setMfaStatus(result.status);
      setMfaRecoveryCodes(result.recoveryCodes || []);
      setMfaSetup(null);
      setMfaConfirmCode("");
      setProfile((current) => (current ? { ...current, mfaEnabled: true } : current));
      toast.success("MFA enabled");
    } catch (error: unknown) {
      toast.error("Authenticator verification failed", { description: getErrorMessage(error) });
    } finally {
      setMfaBusy(false);
    }
  };

  const handleRegenerateRecoveryCodes = async () => {
    if (!mfaRegenerateCode.trim()) {
      toast.error("Authenticator code is required.");
      return;
    }
    setMfaBusy(true);
    try {
      const result = await regenerateMfaRecoveryCodes(mfaRegenerateCode.trim());
      setMfaRecoveryCodes(result.recoveryCodes || []);
      setMfaRegenerateCode("");
      const nextStatus = await getMfaStatus();
      setMfaStatus(nextStatus);
      toast.success("Recovery codes regenerated");
    } catch (error: unknown) {
      toast.error("Recovery code regeneration failed", { description: getErrorMessage(error) });
    } finally {
      setMfaBusy(false);
    }
  };

  const handleDisableMfa = async () => {
    if (!mfaDisableCode.trim()) {
      toast.error("Authenticator code is required.");
      return;
    }
    setMfaBusy(true);
    try {
      const result = await disableMfaTotp(mfaDisableCode.trim());
      setMfaStatus(result.status);
      setMfaSetup(null);
      setMfaRecoveryCodes([]);
      setMfaRegenerateCode("");
      setMfaDisableCode("");
      setProfile((current) => (current ? { ...current, mfaEnabled: false } : current));
      toast.success("MFA disabled");
    } catch (error: unknown) {
      toast.error("MFA disable failed", { description: getErrorMessage(error) });
    } finally {
      setMfaBusy(false);
    }
  };

  const copyRecoveryCodes = async () => {
    if (!mfaRecoveryCodes.length) return;
    try {
      await navigator.clipboard.writeText(mfaRecoveryCodes.join("\n"));
      toast.success("Recovery codes copied");
    } catch {
      toast.error("Unable to copy recovery codes.");
    }
  };

  const displayName =
    form.fullName.trim() || profile?.fullName?.trim() || profile?.username || (loading ? "Loading..." : "Unnamed user");
  const roleLabel = profile ? getRoleLabel(profile.role) : "Account";
  const avatarActionsDisabled = avatarBusy || loading;
  const displayDesignation = form.designation.trim() || "Designation not set";
  const mfaEnabled = Boolean(mfaStatus?.enabled || profile?.mfaEnabled);
  const profileCompletionItems: ProfileCompletionItem[] = [
    {
      label: "Profile image",
      complete: Boolean(profile?.avatarStorageObjectId || profile?.avatarUrl),
    },
    { label: "Name", complete: Boolean(form.fullName.trim()) },
    { label: "Designation", complete: Boolean(form.designation.trim()) },
    { label: "Mobile", complete: Boolean(form.mobilePhone.trim()) },
    { label: "Birth date", complete: Boolean(form.dateOfBirth.trim()) },
    { label: "Joined date", complete: Boolean(form.companyJoinedDate.trim()) },
    { label: "Address", complete: Boolean(form.address.trim()) },
  ];

  return (
    <div className="flex h-[calc(100dvh-3rem)] min-h-0 flex-col overflow-hidden bg-[#f7f7f7] font-sans text-zinc-950">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative isolate flex h-full min-h-0 w-full flex-col overflow-hidden px-8 py-7 lg:px-12"
      >
        <header className="flex shrink-0 flex-col gap-4 border-b border-zinc-200 pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-[clamp(2.35rem,4.5vw,4.35rem)] font-light leading-[0.9] tracking-tighter text-zinc-950">
              Profile
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setThemeDialogOpen(true)}
              className="h-12 rounded-full border-zinc-300 bg-white px-5 text-sm font-semibold text-zinc-600 shadow-none hover:border-zinc-900 hover:bg-white hover:text-zinc-950"
            >
              <Palette className="mr-1 h-4 w-4" />
              Theme
            </Button>
            <Button
              type="button"
              onClick={() => void handleSaveProfile()}
              disabled={loading || saving}
              className="h-12 w-fit rounded-full border border-blue-500/20 bg-blue-600 px-7 text-sm font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_10px_22px_-14px_rgba(37,99,235,0.95)] hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />}
              Save profile
            </Button>
          </div>
        </header>

        <div className="grid min-h-0 flex-1 gap-10 overflow-hidden pt-6 xl:grid-cols-[19rem_minmax(0,1fr)]">
          <aside className="min-h-0 shrink-0 overflow-hidden pr-2">
            <div className="flex h-full min-h-0 flex-col">
              <div className="space-y-5">
                <div className="flex items-end gap-4">
                  <div className="relative">
                    <button
                      type="button"
                      aria-label="Open profile image settings"
                      onClick={() => setAvatarDialogOpen(true)}
                      disabled={avatarActionsDisabled}
                      className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border border-zinc-300 bg-white text-3xl font-semibold text-zinc-700 shadow-[0_24px_60px_-46px_rgba(2,10,27,0.72)] transition-colors hover:border-blue-500 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {avatarPreviewUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={avatarPreviewUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <UserAvatar
                          user={profile}
                          size="xl"
                          className="h-full w-full border-0 bg-transparent"
                        />
                      )}
                    </button>
                    <button
                      type="button"
                      aria-label="Choose profile image"
                      onClick={() => setAvatarDialogOpen(true)}
                      disabled={avatarActionsDisabled}
                      className="absolute bottom-1 right-1 flex h-10 w-10 items-center justify-center rounded-full border border-blue-500/20 bg-blue-600 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_12px_24px_-16px_rgba(37,99,235,0.9)] transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Camera className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="border-b border-zinc-100 pb-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-3xl font-light leading-tight tracking-tight text-zinc-950">
                      {displayName}
                    </h2>
                    <span className="inline-flex max-w-[9rem] items-center rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-medium text-zinc-500">
                      <span className="truncate">{roleLabel}</span>
                    </span>
                  </div>
                  <p className="mt-2 text-sm font-light text-zinc-500">{displayDesignation}</p>
                  <p className="mt-1 text-xs font-light text-zinc-400">{profile?.username || ""}</p>
                </div>

                <div className="space-y-0">
                  <SummaryRow label="Mobile" value={form.mobilePhone} />
                  <SummaryRow label="Joined" value={displayDate(form.companyJoinedDate)} />
                  <SummaryRow label="Address" value={form.address} />
                </div>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(event) => handleSelectFile(event.target.files?.[0] ?? null)}
              />

              <div className="mt-auto pt-6">
                <ProfileCompletionTracker items={profileCompletionItems} />
              </div>
            </div>
          </aside>

          <main className="flex min-h-0 min-w-0 flex-col overflow-y-auto pr-2 xl:border-l xl:border-zinc-300 xl:pl-16">
            <div className="shrink-0 border-b border-zinc-300 pb-4">
              <h2 className="mt-1 text-[clamp(1.75rem,3vw,3rem)] font-light leading-none tracking-tighter text-zinc-950">
                User identity
              </h2>
            </div>

            <div className="mt-2 flex min-h-0 flex-1 flex-col">
              <FieldRow label="Profile name">
                <Input
                  value={form.fullName}
                  onChange={(event) => updateField("fullName", event.target.value)}
                  disabled={loading || saving}
                  maxLength={160}
                  placeholder="Your display name"
                  className={FIELD_INPUT_CLASS}
                />
              </FieldRow>

              <FieldRow label="Designation">
                <Input
                  value={form.designation}
                  onChange={(event) => updateField("designation", event.target.value)}
                  disabled={loading || saving}
                  maxLength={160}
                  placeholder="Sales Manager"
                  className={FIELD_INPUT_CLASS}
                />
              </FieldRow>

              <FieldRow label="Mobile phone">
                <Input
                  value={form.mobilePhone}
                  onChange={(event) => updateField("mobilePhone", event.target.value)}
                  disabled={loading || saving}
                  maxLength={40}
                  placeholder="+94770000000"
                  className={FIELD_INPUT_CLASS}
                />
              </FieldRow>

              <FieldRow label="Date of birth">
                <DatePickerField
                  title="Date of birth"
                  value={form.dateOfBirth}
                  onChange={(value) => updateField("dateOfBirth", value)}
                  disabled={loading || saving}
                  toYear={new Date().getFullYear()}
                />
              </FieldRow>

              <FieldRow label="Company joined date">
                <DatePickerField
                  title="Company joined date"
                  value={form.companyJoinedDate}
                  onChange={(value) => updateField("companyJoinedDate", value)}
                  disabled={loading || saving}
                />
              </FieldRow>

              <FieldRow label="Address" align="start">
                <Textarea
                  value={form.address}
                  onChange={(event) => updateField("address", event.target.value)}
                  disabled={loading || saving}
                  maxLength={1000}
                  placeholder="Colombo, Sri Lanka"
                  className={FIELD_TEXTAREA_CLASS}
                />
              </FieldRow>

              <section className="mt-7 border-t border-zinc-300 pt-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                      <ShieldCheck className={mfaEnabled ? "h-5 w-5 text-emerald-500" : "h-5 w-5 text-zinc-400"} />
                      <h3 className="text-2xl font-light leading-none tracking-tight text-zinc-950">
                        Account security
                      </h3>
                    </div>
                    <p className="mt-2 max-w-2xl text-sm font-light leading-6 text-zinc-500">
                      Microsoft Authenticator adds a time-based code after password sign-in.
                    </p>
                  </div>
                  <span
                    className={[
                      "inline-flex w-fit items-center rounded-full border px-3 py-1 text-xs font-medium",
                      mfaEnabled
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-amber-200 bg-amber-50 text-amber-700",
                    ].join(" ")}
                  >
                    {mfaEnabled ? "MFA enabled" : "MFA not enabled"}
                  </span>
                </div>

                <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,0.7fr)]">
                  <div className="rounded-2xl border border-zinc-200 bg-white p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-zinc-950">
                          Authenticator app
                        </p>
                        <p className="mt-1 text-sm font-light leading-6 text-zinc-500">
                          {mfaEnabled
                            ? `Recovery codes remaining: ${mfaStatus?.recoveryCodesRemaining ?? 0}`
                            : "Scan a setup QR code and confirm the first authenticator code."}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => void handleStartMfaSetup()}
                        disabled={loading || mfaBusy}
                        className="h-10 shrink-0 rounded-full border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-700 hover:border-zinc-900 hover:bg-white"
                      >
                        {mfaBusy && !mfaSetup ? (
                          <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                        ) : (
                          <KeyRound className="mr-1 h-4 w-4" />
                        )}
                        {mfaEnabled ? "Reconfigure" : "Set up"}
                      </Button>
                    </div>

                    {mfaSetup ? (
                      <div className="mt-5 grid gap-5 md:grid-cols-[12rem_minmax(0,1fr)] md:items-start">
                        {mfaQrImageUrl ? (
                          // The SVG stays in an image context, so backend markup cannot execute in the page DOM.
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={mfaQrImageUrl}
                            alt="Authenticator setup QR code"
                            className="h-48 w-48 rounded-2xl border border-zinc-200 bg-white object-contain p-3"
                          />
                        ) : (
                          <div className="flex h-48 w-48 items-center justify-center rounded-2xl border border-zinc-200 bg-zinc-50 p-3 text-center text-xs text-zinc-500">
                            QR code unavailable
                          </div>
                        )}
                        <div className="space-y-4">
                          <div>
                            <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-400">
                              Account
                            </p>
                            <p className="mt-1 text-sm font-light text-zinc-700">{mfaSetup.accountLabel}</p>
                          </div>
                          <div>
                            <label className="mb-2 block text-xs font-medium text-zinc-400">
                              6-digit code
                            </label>
                            <Input
                              value={mfaConfirmCode}
                              inputMode="numeric"
                              maxLength={6}
                              onChange={(event) => setMfaConfirmCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                              placeholder="123456"
                              disabled={mfaBusy}
                              className="h-11 rounded-xl border-zinc-200 bg-white"
                            />
                          </div>
                          <Button
                            type="button"
                            onClick={() => void handleConfirmMfaSetup()}
                            disabled={mfaBusy || mfaConfirmCode.length < 6}
                            className="h-11 rounded-full bg-blue-600 px-5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                          >
                            {mfaBusy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-1 h-4 w-4" />}
                            Enable MFA
                          </Button>
                        </div>
                      </div>
                    ) : null}

                    {mfaEnabled && !mfaSetup ? (
                      <div className="mt-5 border-t border-zinc-100 pt-5">
                        <p className="text-sm font-semibold text-zinc-950">Disable MFA</p>
                        <p className="mt-1 text-sm font-light leading-6 text-zinc-500">
                          Enter a current authenticator code to remove MFA from this account.
                        </p>
                        <div className="mt-4 flex gap-2">
                          <Input
                            value={mfaDisableCode}
                            inputMode="numeric"
                            maxLength={6}
                            onChange={(event) => setMfaDisableCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                            placeholder="Authenticator code"
                            disabled={mfaBusy}
                            className="h-10 rounded-full border-zinc-200 bg-white px-4 text-sm"
                          />
                          <Button
                            type="button"
                            onClick={() => void handleDisableMfa()}
                            disabled={mfaBusy || mfaDisableCode.length < 6}
                            className="h-10 shrink-0 rounded-full border border-red-200 bg-white px-4 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                          >
                            {mfaBusy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-1 h-4 w-4" />}
                            Disable
                          </Button>
                        </div>
                      </div>
                    ) : null}
                  </div>

                  <div className="rounded-2xl border border-zinc-200 bg-white p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-zinc-950">Recovery codes</p>
                        <p className="mt-1 text-sm font-light leading-6 text-zinc-500">
                          Store these once. Each code can be used one time if the authenticator app is unavailable.
                        </p>
                      </div>
                      {mfaRecoveryCodes.length ? (
                        <button
                          type="button"
                          onClick={() => void copyRecoveryCodes()}
                          className="flex h-9 w-9 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-500 hover:border-zinc-900 hover:text-zinc-950"
                          aria-label="Copy recovery codes"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                      ) : null}
                    </div>

                    {mfaRecoveryCodes.length ? (
                      <div className="mt-4 grid gap-2 sm:grid-cols-2">
                        {mfaRecoveryCodes.map((code) => (
                          <code
                            key={code}
                            className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm font-semibold tracking-wide text-zinc-900"
                          >
                            {code}
                          </code>
                        ))}
                      </div>
                    ) : (
                      <div className="mt-4 rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 px-4 py-5 text-sm font-light text-zinc-500">
                        New recovery codes appear here after setup or regeneration.
                      </div>
                    )}

                    {mfaEnabled ? (
                      <div className="mt-4 flex gap-2">
                        <Input
                          value={mfaRegenerateCode}
                          inputMode="numeric"
                          maxLength={6}
                          onChange={(event) => setMfaRegenerateCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                          placeholder="Authenticator code"
                          disabled={mfaBusy}
                          className="h-10 rounded-full border-zinc-200 bg-white px-4 text-sm"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => void handleRegenerateRecoveryCodes()}
                          disabled={mfaBusy || mfaRegenerateCode.length < 6}
                          className="h-10 shrink-0 rounded-full border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-700 hover:border-zinc-900 hover:bg-white"
                        >
                          {mfaBusy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-1 h-4 w-4" />}
                          Regenerate
                        </Button>
                      </div>
                    ) : null}
                  </div>
                </div>
              </section>
            </div>
          </main>
        </div>
      </motion.div>

      {avatarDialogOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/30 p-4 backdrop-blur-[3px]">
          <button
            type="button"
            aria-label="Close profile image dialog"
            className="absolute inset-0 cursor-default"
            onClick={() => {
              if (!avatarBusy) setAvatarDialogOpen(false);
            }}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="profile-avatar-dialog-title"
            className="relative w-full max-w-xl overflow-hidden rounded-[2rem] border border-zinc-200 bg-white shadow-[0_28px_80px_-42px_rgba(2,10,27,0.72)]"
          >
            <button
              type="button"
              aria-label="Close profile image dialog"
              onClick={() => setAvatarDialogOpen(false)}
              disabled={avatarBusy}
              className="absolute right-5 top-5 flex h-10 w-10 items-center justify-center rounded-full border border-zinc-300 bg-white text-zinc-500 transition-colors hover:border-zinc-900 hover:text-zinc-950 disabled:opacity-50"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="px-8 pb-8 pt-8">
              <h2 id="profile-avatar-dialog-title" className="text-4xl font-light tracking-tight text-zinc-950">
                Profile image
              </h2>

              <div className="mt-8 grid gap-7 sm:grid-cols-[9rem_minmax(0,1fr)] sm:items-center">
                <div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-full border border-zinc-300 bg-zinc-50 text-3xl font-semibold text-zinc-700 shadow-[0_24px_60px_-46px_rgba(2,10,27,0.72)]">
                  {avatarPreviewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={avatarPreviewUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <UserAvatar
                      user={profile}
                      size="xl"
                      className="h-full w-full border-0 bg-transparent"
                    />
                  )}
                </div>

                <div className="min-w-0">
                  <p className="text-sm font-light text-zinc-500">
                    {selectedFile ? selectedFile.name : "JPG, PNG or WebP. Maximum 20MB."}
                  </p>
                  <div className="mt-5 grid h-12 w-full grid-cols-2 items-center gap-1.5 rounded-full border border-zinc-200 bg-white p-1.5">
                    <button
                      type="button"
                      className="inline-flex h-9 min-w-0 items-center justify-center gap-2 rounded-full text-sm font-semibold text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-950 disabled:opacity-50"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={avatarActionsDisabled}
                    >
                      <ImagePlus className="h-4 w-4" />
                      Choose
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleUploadAvatar()}
                      disabled={!selectedFile || avatarActionsDisabled}
                      className="inline-flex h-9 min-w-0 items-center justify-center gap-2 rounded-full border border-blue-500/20 bg-blue-600 text-sm font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_10px_22px_-14px_rgba(37,99,235,0.95)] transition-colors hover:bg-blue-700 disabled:opacity-50"
                    >
                      {avatarBusy && selectedFile ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4" />
                      )}
                      Upload
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => void handleDeleteAvatar()}
                    disabled={avatarActionsDisabled || (!profile?.avatarStorageObjectId && !selectedFile)}
                    className="mt-5 inline-flex items-center border-b border-transparent pb-1 text-sm font-medium text-red-500 transition-colors hover:border-red-500 disabled:text-zinc-300"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Remove image
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {themeDialogOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/30 p-4 backdrop-blur-[3px]">
          <button
            type="button"
            aria-label="Close theme selector dialog"
            className="absolute inset-0 cursor-default"
            onClick={() => setThemeDialogOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="theme-selector-dialog-title"
            className="relative w-full max-w-xl overflow-hidden rounded-[2rem] border border-zinc-200 bg-white shadow-[0_28px_80px_-42px_rgba(2,10,27,0.72)]"
          >
            <button
              type="button"
              aria-label="Close theme selector dialog"
              onClick={() => setThemeDialogOpen(false)}
              className="absolute right-5 top-5 flex h-10 w-10 items-center justify-center rounded-full border border-zinc-300 bg-white text-zinc-500 transition-colors hover:border-zinc-900 hover:text-zinc-950"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="px-8 pb-8 pt-8">
              <h2 id="theme-selector-dialog-title" className="text-4xl font-light tracking-tight text-zinc-950">
                Theme selector
              </h2>

              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                {[0, 1, 2].map((item) => (
                  <div key={item} className="rounded-2xl border border-zinc-200 bg-white p-3">
                    <div className="h-20 animate-pulse rounded-xl bg-zinc-100" />
                    <div className="mt-3 h-2.5 w-2/3 animate-pulse rounded-full bg-zinc-100" />
                    <div className="mt-2 h-2.5 w-1/2 animate-pulse rounded-full bg-zinc-100" />
                  </div>
                ))}
              </div>

              <div className="mt-8 border-y border-zinc-100 py-5">
                <p className="text-2xl font-light tracking-tight text-zinc-950">Coming soon</p>
                <p className="mt-2 text-sm font-light leading-6 text-zinc-500">
                  Theme controls are being prepared for this workspace.
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
