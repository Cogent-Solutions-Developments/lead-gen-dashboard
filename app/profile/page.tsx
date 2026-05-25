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
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  deleteMyProfileAvatar,
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
  const [bio, setBio] = useState("");
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
        setBio(next.bio || "");
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
        bio: bio.trim(),
      });
      setProfile(next);
      setFullName(next.fullName || "");
      setBio(next.bio || "");
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

  return (
    <div className="min-h-[calc(100dvh-3rem)] bg-transparent p-1 font-sans">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto flex w-full max-w-6xl flex-col gap-6"
      >
        <div>
          <p className="text-sm font-light text-zinc-500">Account Workspace</p>
          <h1 className="mt-4 text-4xl font-light leading-tight tracking-[-0.025em] text-zinc-950">
            Profile
          </h1>
        </div>

        <div className="grid gap-5 lg:grid-cols-[22rem_minmax(0,1fr)]">
          <Card className="h-fit rounded-2xl border border-zinc-300 bg-white/88 p-5">
            <div className="flex flex-col items-center text-center">
              <div className="relative">
                <div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-full border border-zinc-300 bg-zinc-50 text-3xl font-semibold text-zinc-700">
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
                <div className="absolute bottom-1 right-1 flex h-9 w-9 items-center justify-center rounded-full border border-blue-100 bg-blue-50 text-blue-700">
                  <Camera className="h-4 w-4" />
                </div>
              </div>

              <h2 className="mt-4 text-xl font-semibold text-zinc-950">
                {profile?.fullName?.trim() || profile?.username || "Loading..."}
              </h2>
              <p className="mt-1 text-sm text-zinc-500">{profile?.username || ""}</p>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(event) => handleSelectFile(event.target.files?.[0] ?? null)}
              />

              <div className="mt-5 grid w-full gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={avatarBusy || loading}
                >
                  <ImagePlus className="mr-2 h-4 w-4" />
                  Choose Image
                </Button>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    onClick={() => void handleUploadAvatar()}
                    disabled={!selectedFile || avatarBusy || loading}
                    className="h-10 bg-sidebar text-white hover:bg-zinc-800 disabled:opacity-50"
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
                    disabled={avatarBusy || loading || (!profile?.avatarStorageObjectId && !selectedFile)}
                    className="h-10 border-red-200 bg-white text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Remove
                  </Button>
                </div>
              </div>
            </div>
          </Card>

          <Card className="rounded-2xl border border-zinc-300 bg-white/88 p-5">
            <div className="mb-5 flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-zinc-300 bg-zinc-50 text-zinc-700">
                <UserRound className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-zinc-950">Profile Details</h2>
                <p className="mt-1 text-sm text-zinc-500">
                  Keep your sender identity clear for content generation and team activity.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Profile Name</label>
                <Input
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  disabled={loading || saving}
                  placeholder="Your display name"
                  className="h-11 border-zinc-300 bg-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Bio</label>
                <Textarea
                  value={bio}
                  onChange={(event) => setBio(event.target.value.slice(0, 1000))}
                  disabled={loading || saving}
                  placeholder="Short sales role, market focus, or outreach context."
                  className="min-h-40 resize-y border-zinc-300 bg-white"
                />
                <div className="text-right text-xs text-zinc-400">{bio.length}/1000</div>
              </div>

              <div className="flex items-center justify-end">
                <Button
                  type="button"
                  onClick={() => void handleSaveProfile()}
                  disabled={loading || saving}
                  className="h-10 bg-sidebar px-5 text-white hover:bg-zinc-800 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Save Profile
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </motion.div>
    </div>
  );
}
