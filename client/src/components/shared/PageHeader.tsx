import type { ReactNode } from "react";

interface PageHeaderProps {
  title: ReactNode;
  subtitle?: ReactNode;
  /** Rendered on the right (mode switches, status chips, avatars). */
  action?: ReactNode;
}

/** Consistent page title block: 28px title, 13px muted subtitle. */
export default function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 select-none">
      <div>
        <h1 className="text-[28px] font-black text-white leading-tight tracking-tight">{title}</h1>
        {subtitle && <p className="text-[13px] font-semibold mt-1 text-[var(--color-muted)]">{subtitle}</p>}
      </div>
      {action && <div className="flex items-center gap-4">{action}</div>}
    </div>
  );
}
