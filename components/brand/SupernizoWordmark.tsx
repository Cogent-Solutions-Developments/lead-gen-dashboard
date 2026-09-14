import type { HTMLAttributes } from "react";

const APP_VERSION_LABEL = "v0.3.0";

type SupernizoWordmarkProps = HTMLAttributes<HTMLDivElement> & {
  tone?: "light" | "dark";
  size?: "sm" | "md";
};

export function SupernizoWordmark({
  tone = "light",
  size = "md",
  className = "",
  ...props
}: SupernizoWordmarkProps) {
  const isDark = tone === "dark";
  const isSmall = size === "sm";

  return (
    <div className={`min-w-0 ${className}`} {...props}>
      <div className="flex min-w-0 items-baseline gap-2 whitespace-nowrap">
        <span
          className={`${isSmall ? "text-xl" : "text-2xl"} font-normal leading-none tracking-wide ${
            isDark ? "text-blue-950" : "text-white"
          }`}
        >
          supernizo
        </span>
        <span
          className={`${isSmall ? "text-[1.1rem]" : "text-[1.35rem]"} font-normal leading-none tracking-wide ${
            isDark ? "text-slate-500" : "text-white/78"
          }`}
          style={{ fontFamily: '"Bungee Hairline", sans-serif' }}
        >
          LITE
        </span>
      </div>
      <span
        className={`${isSmall ? "mt-0.5 text-[9px]" : "mt-1 text-[10px]"} block font-light tracking-[0.22em] ${
          isDark ? "text-slate-400" : "text-white/40"
        }`}
      >
        {APP_VERSION_LABEL}
      </span>
    </div>
  );
}
