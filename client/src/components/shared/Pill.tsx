import type { ReactNode } from "react";

export type PillVariant =
  | "buy" | "sell"
  | "win" | "loss" | "open" | "closed"
  | "risk-low" | "risk-medium" | "risk-high"
  | "info" | "warning" | "neutral";

const VARIANT_CLASSES: Record<PillVariant, string> = {
  buy:           "bg-green-500/10 text-green-400 border-green-500/20",
  sell:          "bg-red-500/10 text-red-400 border-red-500/20",
  win:           "bg-green-500/10 text-green-400 border-green-500/20",
  loss:          "bg-red-500/10 text-red-400 border-red-500/20",
  open:          "bg-blue-500/10 text-blue-400 border-blue-500/20",
  closed:        "bg-slate-500/10 text-slate-400 border-slate-500/20",
  "risk-low":    "bg-green-500/10 text-green-400 border-green-500/20",
  "risk-medium": "bg-amber-500/10 text-amber-400 border-amber-500/20",
  "risk-high":   "bg-red-500/10 text-red-400 border-red-500/20",
  info:          "bg-blue-500/10 text-blue-300 border-blue-500/25",
  warning:       "bg-amber-500/10 text-amber-400 border-amber-500/25",
  neutral:       "bg-slate-500/10 text-slate-400 border-slate-500/25",
};

/** Maps free-form status/risk strings from the API to a pill variant. */
export function pillVariantFor(value: string): PillVariant {
  const v = value.toLowerCase();
  if (v === "buy") return "buy";
  if (v === "sell") return "sell";
  if (v === "win") return "win";
  if (v === "loss" || v === "losing") return "loss";
  if (v === "open" || v === "winning") return "open";
  if (v === "closed") return "closed";
  if (v === "low") return "risk-low";
  if (v === "medium") return "risk-medium";
  if (v === "high") return "risk-high";
  return "neutral";
}

interface PillProps {
  variant: PillVariant;
  children: ReactNode;
  size?: "xs" | "sm";
  className?: string;
}

/** Small status/action badge used across trade cards and dashboards. */
export default function Pill({ variant, children, size = "sm", className = "" }: PillProps) {
  const sizing = size === "xs"
    ? "px-2 py-0.5 text-[9px]"
    : "px-2.5 py-1 text-[11px]";
  return (
    <span className={`inline-flex items-center gap-1 rounded-md border font-extrabold uppercase tracking-wide ${sizing} ${VARIANT_CLASSES[variant]} ${className}`}>
      {children}
    </span>
  );
}
