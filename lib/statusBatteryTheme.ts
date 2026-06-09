import type { CSSProperties } from "react";

type StatusBatteryStyle = CSSProperties & {
  "--status-battery-start": string;
  "--status-battery-dim": string;
  "--status-battery-mid": string;
  "--status-battery-core": string;
  "--status-battery-end": string;
  "--status-battery-glow-soft": string;
  "--status-battery-glow-mid": string;
  "--status-battery-glow-deep": string;
};

function batteryStyle(
  start: string,
  dim: string,
  mid: string,
  core: string,
  end: string,
  glowSoft: string,
  glowMid: string,
  glowDeep: string
): StatusBatteryStyle {
  return {
    "--status-battery-start": start,
    "--status-battery-dim": dim,
    "--status-battery-mid": mid,
    "--status-battery-core": core,
    "--status-battery-end": end,
    "--status-battery-glow-soft": glowSoft,
    "--status-battery-glow-mid": glowMid,
    "--status-battery-glow-deep": glowDeep,
  };
}

const blue = batteryStyle(
  "#02040a",
  "#071126",
  "#0f1c3f",
  "#2563eb",
  "#0c1836",
  "rgba(37,99,235,0.42)",
  "#1d4ed8",
  "#172554"
);

const cyan = batteryStyle(
  "#02070a",
  "#062329",
  "#0b5560",
  "#0aefff",
  "#06313a",
  "rgba(10,239,255,0.42)",
  "#0891b2",
  "#164e63"
);

const orange = batteryStyle(
  "#090402",
  "#291106",
  "#5c2607",
  "#ff8700",
  "#351706",
  "rgba(255,135,0,0.38)",
  "#ea580c",
  "#7c2d12"
);

const amber = batteryStyle(
  "#090502",
  "#2b1b05",
  "#5c3907",
  "#f59e0b",
  "#342107",
  "rgba(245,158,11,0.38)",
  "#d97706",
  "#78350f"
);

const purple = batteryStyle(
  "#07040b",
  "#1e1030",
  "#3b1d63",
  "#a855f7",
  "#25123f",
  "rgba(168,85,247,0.4)",
  "#7e22ce",
  "#4c1d95"
);

const green = batteryStyle(
  "#020805",
  "#092114",
  "#0f4a29",
  "#22c55e",
  "#0a2d1a",
  "rgba(34,197,94,0.4)",
  "#16a34a",
  "#14532d"
);

const red = batteryStyle(
  "#0a0202",
  "#2b0707",
  "#5c1111",
  "#ff1f1f",
  "#360909",
  "rgba(255,31,31,0.34)",
  "#dc2626",
  "#7f1d1d"
);

const STATUS_BATTERY_STYLES: Record<string, StatusBatteryStyle> = {
  default: blue,
  new: cyan,
  "first-call": blue,
  "email-sent": blue,
  "follow-up": orange,
  "1st-follow-up": orange,
  "2nd-follow-up": amber,
  "3rd-follow-up": orange,
  "proposal-sent": purple,
  pending: purple,
  "deal-closed": green,
  confirmed: green,
  "whatsapp-sent": green,
  "deal-dead": red,
  declined: red,
};

export function getStatusBatteryStyle(status: string): StatusBatteryStyle {
  const key = status.trim().toLowerCase();
  return STATUS_BATTERY_STYLES[key] ?? STATUS_BATTERY_STYLES.default;
}
