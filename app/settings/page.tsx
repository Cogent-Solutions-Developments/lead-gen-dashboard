"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { motion } from "framer-motion";
import { ArrowRight, FilePenLine, MonitorDot, UserRoundMinus, Workflow, type LucideIcon } from "lucide-react";
import { WebhooksLogoIcon } from "@phosphor-icons/react/dist/csr/WebhooksLogo";

import { AdminPanelShell } from "@/components/layout/AdminPanelShell";
import { MarketingOptOutSettings } from "@/components/settings/MarketingOptOutSettings";
import { OutreachMailWebhookSettings } from "@/components/settings/OutreachMailWebhookSettings";
import { Card } from "@/components/ui/card";
import { buildSettingsHref, parseSettingsSection, type SettingsSection } from "@/lib/settingsNavigation";

type SettingsCardProps = {
  icon: LucideIcon | typeof WebhooksLogoIcon;
  title: string;
  description: string;
  detailLabel: string;
  detailTitle: string;
  detailDescription: string;
  ariaLabel: string;
  delay: number;
  tone?: "blue" | "rose";
} & (
  | { href: string; onClick?: never }
  | { href?: never; onClick: () => void }
);

function SettingsCard({
  icon: Icon,
  title,
  description,
  detailLabel,
  detailTitle,
  detailDescription,
  ariaLabel,
  delay,
  tone = "blue",
  href,
  onClick,
}: SettingsCardProps) {
  const rose = tone === "rose";
  const controlClassName = `group block h-full w-full rounded-xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${rose ? "focus-visible:ring-rose-500" : "focus-visible:ring-blue-500"}`;
  const animation = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { delay },
  };
  const content = (
    <Card className={`h-full gap-6 border-slate-200 p-6 shadow-sm transition-all duration-200 group-hover:-translate-y-0.5 group-hover:shadow-md ${rose ? "group-hover:border-rose-200 group-hover:bg-rose-50/30" : "group-hover:border-blue-200 group-hover:bg-blue-50/30"}`}>
      <div className="flex items-start justify-between gap-5">
        <div className="flex min-w-0 items-start gap-4">
          {Icon === WebhooksLogoIcon ? (
            <WebhooksLogoIcon
              size={36}
              weight="duotone"
              className="mt-0.5 shrink-0 text-blue-600"
              aria-hidden="true"
            />
          ) : (
            <Icon
              size={36}
              strokeWidth={1.75}
              className={`mt-0.5 shrink-0 ${rose ? "text-rose-600" : "text-blue-600"}`}
              aria-hidden="true"
            />
          )}
          <div className="min-w-0">
            <h2 className="font-semibold text-slate-900">{title}</h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
          </div>
        </div>
        <ArrowRight
          className={`mt-2 h-5 w-5 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 ${rose ? "group-hover:text-rose-600" : "group-hover:text-blue-600"}`}
          strokeWidth={1.75}
          aria-hidden="true"
        />
      </div>
      <div className="mt-auto rounded-lg border border-slate-200 bg-slate-50/70 p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{detailLabel}</p>
        <p className="mt-2 text-sm font-medium text-slate-700">{detailTitle}</p>
        <p className="mt-1 text-xs leading-5 text-slate-500">{detailDescription}</p>
      </div>
    </Card>
  );

  return href !== undefined ? (
    <motion.div {...animation} className="h-full">
      <Link href={href} aria-label={ariaLabel} className={controlClassName}>
        {content}
      </Link>
    </motion.div>
  ) : (
    <motion.button {...animation} type="button" onClick={onClick} aria-label={ariaLabel} className={controlClassName}>
      {content}
    </motion.button>
  );
}

function SettingsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeSection = parseSettingsSection(searchParams.get("section"));

  const navigateToSection = (section: SettingsSection) => {
    router.push(buildSettingsHref(searchParams.toString(), section), { scroll: false });
  };

  return (
    <AdminPanelShell>
      <div>
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"
        >
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
            <p className="text-slate-500">Manage admin settings</p>
          </div>
        </motion.div>

        {activeSection === "outreach" ? (
          <OutreachMailWebhookSettings onBack={() => navigateToSection(null)} />
        ) : activeSection === "opt-out" ? (
          <MarketingOptOutSettings onBack={() => navigateToSection(null)} />
        ) : (
          <div className="grid auto-rows-fr gap-6 lg:grid-cols-2">
            <SettingsCard
              href="/settings/system-monitor"
              ariaLabel="Open System Monitor"
              icon={MonitorDot}
              title="System Monitor"
              description="See live activity, system pressure, and how work moves through your platform."
              detailLabel="Live monitoring"
              detailTitle="Traffic, active users, and delivery health"
              detailDescription="Follow live activity, monitor system pressure, and track outreach delivery."
              delay={0.02}
            />
            <SettingsCard
              href="/settings/system-operations"
              ariaLabel="Open System Operations"
              icon={Workflow}
              title="System Operations"
              description="Investigate incidents, inspect live logs, and safely recover interrupted work."
              detailLabel="Operations tools"
              detailTitle="Service logs and guided recovery"
              detailDescription="Admin tools to investigate incidents and safely recover interrupted work."
              delay={0.06}
            />
            <SettingsCard
              href="/settings/content-generation"
              ariaLabel="Open Content Generation settings"
              icon={FilePenLine}
              title="Content Generation"
              description="Configure cost guardrails and inspect live workflow activity."
              detailLabel="Control center"
              detailTitle="Limits and live monitoring"
              detailDescription="Usage, checkpoints, pause and resume state, and configuration history"
              delay={0.1}
            />
            <SettingsCard
              onClick={() => navigateToSection("outreach")}
              ariaLabel="Open Outreach Configuration"
              icon={WebhooksLogoIcon}
              title="Outreach Configuration"
              description="Manage department-wise mail delivery webhooks and active routing."
              detailLabel="Available configuration"
              detailTitle="Mail webhook"
              detailDescription="Sales, Delegate, and Production departments"
              delay={0.14}
            />
            <SettingsCard
              onClick={() => navigateToSection("opt-out")}
              ariaLabel="Open Marketing Opt-out"
              icon={UserRoundMinus}
              title="Marketing Opt-out"
              description="Add suppressions, upload CSV files, and review all-channel opt-outs."
              detailLabel="Suppression tools"
              detailTitle="Manual and CSV management"
              detailDescription="Manage phone and email opt-outs across all outreach channels."
              delay={0.18}
              tone="rose"
            />
          </div>
        )}
      </div>
    </AdminPanelShell>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={null}>
      <SettingsContent />
    </Suspense>
  );
}
