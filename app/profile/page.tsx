"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Camera,
  CheckCircle2,
  ImagePlus,
  Loader2,
  Save,
  Trash2,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { UserAvatar } from "@/components/profile/UserAvatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  deleteMyProfileAvatar,
  getRoleLabel,
  getMyProfile,
  updateMyProfile,
  uploadMyProfileAvatar,
  type MyProfile,
} from "@/lib/auth";

const MAX_PROFILE_IMAGE_BYTES = 20 * 1024 * 1024;
const PROFILE_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Please try again.";
}

function validateProfileImage(file: File) {
  if (!PROFILE_IMAGE_TYPES.includes(file.type)) return "Use a JPG, PNG, or WebP image.";
  if (file.size > MAX_PROFILE_IMAGE_BYTES) return "Profile image must be 20MB or smaller.";
  return "";
}

export default function ProfilePage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [profile, setProfile] = useState<MyProfile | null>(null);
  const [fullName, setFullName] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        const next = await getMyProfile();
        if (!active) return;
        setProfile(next);
        setFullName(next.fullName || "");
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
        fullName: fullName.trim(),
      });
      setProfile(next);
      setFullName(next.fullName || "");
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
      toast.success("Profile image removed");
    } catch (error: unknown) {
      toast.error("Profile image delete failed", { description: getErrorMessage(error) });
    } finally {
      setAvatarBusy(false);
    }
  };

  const displayName = profile?.fullName?.trim() || profile?.username || (loading ? "Loading..." : "Unnamed user");
  const roleLabel = profile ? getRoleLabel(profile.role) : "Account";
  const avatarActionsDisabled = avatarBusy || loading;

  return (
    <div className="min-h-[calc(100dvh-3rem)] bg-[#f7f7f7] p-1 font-sans">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-6 lg:px-10"
      >
        <header className="flex flex-col gap-5 border-b border-zinc-200 pb-7 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-medium tracking-wide text-zinc-400">Account Workspace</p>
            <h1 className="mt-3 text-[clamp(2.75rem,5vw,5.25rem)] font-light leading-[0.9] tracking-tighter text-zinc-950">
              Profile
            </h1>
          </div>

          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm text-zinc-600 shadow-sm">
            <UserRound className="h-4 w-4 text-zinc-400" />
            <span>{roleLabel}</span>
          </div>
        </header>

        <div className="grid gap-6 xl:grid-cols-[24rem_minmax(0,1fr)]">
          <section className="h-fit overflow-hidden rounded-lg border border-zinc-300 bg-white shadow-[0_22px_70px_-58px_rgba(2,10,27,0.72)]">
            <div className="h-24 border-b border-blue-500/10 bg-[linear-gradient(135deg,#2563eb_0%,#1d4ed8_48%,#0f172a_100%)]" />
            <div className="px-6 pb-6">
              <div className="-mt-16 flex items-end justify-between gap-4">
                <div className="relative">
                  <div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-zinc-50 text-3xl font-semibold text-zinc-700 shadow-[0_18px_46px_-30px_rgba(2,10,27,0.62)]">
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
                  <button
                    type="button"
                    aria-label="Choose profile image"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={avatarActionsDisabled}
                    className="absolute bottom-1 right-1 flex h-10 w-10 items-center justify-center rounded-full border border-blue-500/20 bg-blue-600 text-white shadow-[0_12px_24px_-16px_rgba(37,99,235,0.9)] transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Camera className="h-4 w-4" />
                  </button>
                </div>

                <span className="mb-2 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-medium text-zinc-500">
                  {roleLabel}
                </span>
              </div>

              <div className="mt-5 border-b border-zinc-100 pb-5">
                <h2 className="text-2xl font-medium tracking-tight text-zinc-950">
                  {displayName}
                </h2>
                <p className="mt-1 text-sm font-light text-zinc-500">{profile?.username || ""}</p>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(event) => handleSelectFile(event.target.files?.[0] ?? null)}
              />

              <div className="mt-5 grid gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 rounded-md border-zinc-300 bg-white text-sm font-semibold text-zinc-700 shadow-none hover:bg-zinc-50"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={avatarActionsDisabled}
                >
                  <ImagePlus className="mr-2 h-4 w-4" />
                  Choose Image
                </Button>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    type="button"
                    onClick={() => void handleUploadAvatar()}
                    disabled={!selectedFile || avatarActionsDisabled}
                    className="h-11 rounded-md border border-blue-500/20 bg-blue-600 text-sm font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_10px_22px_-14px_rgba(37,99,235,0.95)] hover:bg-blue-700 disabled:opacity-50"
                  >
                    {avatarBusy && selectedFile ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                    )}
                    Upload
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void handleDeleteAvatar()}
                    disabled={avatarActionsDisabled || (!profile?.avatarStorageObjectId && !selectedFile)}
                    className="h-11 rounded-md border-red-200 bg-white text-sm font-semibold text-red-600 shadow-none hover:bg-red-50"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Remove
                  </Button>
                </div>
                {selectedFile ? (
                  <p className="truncate text-xs font-light text-zinc-400">
                    Selected: {selectedFile.name}
                  </p>
                ) : null}
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-zinc-300 bg-white p-6 shadow-[0_22px_70px_-58px_rgba(2,10,27,0.72)] lg:p-8">
            <div className="flex items-start justify-between gap-6 border-b border-zinc-100 pb-7">
              <div>
                <p className="text-xs font-medium tracking-wide text-zinc-400">Profile Details</p>
                <h2 className="mt-2 text-3xl font-light tracking-tight text-zinc-950">Sender identity</h2>
                <p className="mt-2 max-w-2xl text-sm font-light leading-6 text-zinc-500">
                  This information is used anywhere the product needs a human sender context.
                </p>
              </div>
              <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-zinc-300 bg-zinc-50 text-zinc-700 sm:flex">
                <UserRound className="h-5 w-5" />
              </div>
            </div>

            <div className="mt-8 space-y-7">
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Profile Name</label>
                <Input
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  disabled={loading || saving}
                  placeholder="Your display name"
                  className="h-12 rounded-md border-zinc-300 bg-white px-4 text-base font-light shadow-none focus-visible:border-blue-600 focus-visible:ring-1 focus-visible:ring-blue-600"
                />
              </div>

              <div className="flex items-center justify-end border-t border-zinc-100 pt-6">
                <Button
                  type="button"
                  onClick={() => void handleSaveProfile()}
                  disabled={loading || saving}
                  className="h-11 rounded-md border border-blue-500/20 bg-blue-600 px-5 text-sm font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_10px_22px_-14px_rgba(37,99,235,0.95)] hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Save Profile
                </Button>
              </div>
            </div>
          </section>
        </div>
      </motion.div>
    </div>
  );
}
