"use client";

import { UserRound } from "lucide-react";
import { ProtectedImage } from "@/components/storage/ProtectedImage";
import type { AuthUser } from "@/lib/auth";

type UserAvatarProps = {
  user: Pick<AuthUser, "fullName" | "username" | "avatarUrl"> | null | undefined;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  imageClassName?: string;
  showIconFallback?: boolean;
};

const SIZE_CLASS = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-12 w-12 text-base",
  xl: "h-32 w-32 text-3xl",
};

function getInitials(user: UserAvatarProps["user"]) {
  const label = user?.fullName?.trim() || user?.username?.trim() || "";
  return (
    label
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "U"
  );
}

function avatarDirectUrlPath(avatarUrl?: string | null) {
  const value = String(avatarUrl || "").trim();
  if (!value || !value.startsWith("/api/profile/avatar/")) return undefined;
  return `${value}/download-url`;
}

export function UserAvatar({
  user,
  size = "md",
  className = "",
  imageClassName = "",
  showIconFallback = false,
}: UserAvatarProps) {
  const fallback = showIconFallback ? <UserRound className="h-4 w-4" /> : getInitials(user);

  return (
    <div
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-card font-semibold text-muted-foreground ${SIZE_CLASS[size]} ${className}`}
    >
      <ProtectedImage
        src={user?.avatarUrl}
        directUrlPath={avatarDirectUrlPath(user?.avatarUrl)}
        alt=""
        className={`h-full w-full object-cover ${imageClassName}`}
        fallback={fallback}
      />
    </div>
  );
}
