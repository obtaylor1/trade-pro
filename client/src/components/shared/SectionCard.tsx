import type { ReactNode } from "react";

interface SectionCardProps {
  icon?: string;
  title: string;
  subtitle?: string;
  /** Rendered on the right side of the header row (toggles, buttons). */
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

/**
 * Standard content card with an icon + title header row.
 * Consolidates the repeated "card header with icon" pattern.
 */
export default function SectionCard({ icon, title, subtitle, action, children, className = "" }: SectionCardProps) {
  return (
    <div className={`account-card text-left ${className}`}>
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5 select-none">
          {icon && (
            <div className="w-8 h-8 rounded-full bg-[#101d31]/80 border border-slate-800 flex items-center justify-center text-slate-400">
              <i className={`${icon} text-xs`} aria-hidden="true"></i>
            </div>
          )}
          <div>
            <span className="text-[15px] font-black text-white block leading-tight">{title}</span>
            {subtitle && <span className="text-[11px] text-slate-500 font-semibold">{subtitle}</span>}
          </div>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}
