import type { ReactNode } from "react";

interface StatCardProps {
  label: string;
  value: ReactNode;
  /** Tailwind text color class for the value, e.g. "text-green-500". */
  valueClass?: string;
  helper?: ReactNode;
  /** Optional footer rendered below a divider (links, breakdowns). */
  footer?: ReactNode;
  icon?: string;
}

/**
 * Compact dashboard stat card: uppercase label, large numeric value,
 * small helper line. Matches the summary cards on Home and My Trades.
 */
export default function StatCard({ label, value, valueClass = "text-white", helper, footer, icon }: StatCardProps) {
  return (
    <div className="summary-card flex flex-col justify-between">
      <div>
        <span className="summary-label flex items-center gap-1.5">
          {icon && <i className={`${icon} text-[10px]`} aria-hidden="true"></i>}
          {label}
        </span>
        <strong className={`summary-value ${valueClass}`}>{value}</strong>
        {helper && <p className="summary-helper">{helper}</p>}
      </div>
      {footer && (
        <div className="border-t border-slate-900/60 pt-2 mt-3 text-[10px] font-bold text-slate-400 select-none">
          {footer}
        </div>
      )}
    </div>
  );
}
