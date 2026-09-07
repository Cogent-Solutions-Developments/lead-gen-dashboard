"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";

type SettingsBackButtonProps =
  | { href: string; onClick?: never }
  | { href?: never; onClick: () => void };

const buttonClassName = "mb-4 -ml-3 h-9 text-slate-600 hover:bg-slate-100 hover:text-slate-900";

export function SettingsBackButton({ href, onClick }: SettingsBackButtonProps) {
  if (href !== undefined) {
    return (
      <Button asChild variant="ghost" className={buttonClassName}>
        <Link href={href}>
          <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
          All settings
        </Link>
      </Button>
    );
  }

  return (
    <Button type="button" variant="ghost" onClick={onClick} className={buttonClassName}>
      <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
      All settings
    </Button>
  );
}
