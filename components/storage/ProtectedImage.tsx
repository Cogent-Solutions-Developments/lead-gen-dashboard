"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { createProtectedObjectUrl } from "@/lib/auth";

type ProtectedImageProps = {
  src?: string | null;
  directUrlPath?: string | null;
  alt?: string;
  className?: string;
  fallback: ReactNode;
};

export function ProtectedImage({
  src,
  directUrlPath,
  alt = "",
  className = "",
  fallback,
}: ProtectedImageProps) {
  const [resolvedUrl, setResolvedUrl] = useState("");

  useEffect(() => {
    let active = true;
    let revoke = () => {};

    const load = async () => {
      const source = String(src || "").trim();
      if (!source) {
        setResolvedUrl("");
        return;
      }

      try {
        const next = await createProtectedObjectUrl(source, directUrlPath || undefined);
        revoke = next.revoke;
        if (active) setResolvedUrl(next.url);
      } catch {
        if (active) setResolvedUrl("");
      }
    };

    void load();

    return () => {
      active = false;
      revoke();
    };
  }, [src, directUrlPath]);

  if (!resolvedUrl) return <>{fallback}</>;

  // eslint-disable-next-line @next/next/no-img-element
  return <img src={resolvedUrl} alt={alt} className={className} loading="lazy" decoding="async" />;
}
