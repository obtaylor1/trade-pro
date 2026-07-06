import { useState } from "react";

interface EmptyStateArtProps {
  /** Illustration file stem: renders /empty_<name>.png from client/public. */
  name: string;
  /** Font Awesome class used as fallback while no illustration file exists. */
  fallbackIcon: string;
  size?: number;
  className?: string;
}

/**
 * Empty-state illustration with graceful fallback: shows the PNG from
 * client/public when present, otherwise a styled icon disc. Lets generated
 * artwork be dropped in later without code changes.
 */
export default function EmptyStateArt({ name, fallbackIcon, size = 96, className = "" }: EmptyStateArtProps) {
  const [missing, setMissing] = useState(false);

  if (missing) {
    return (
      <div
        className={`rounded-full border border-slate-700/40 flex items-center justify-center text-slate-500 bg-slate-900/30 flex-shrink-0 ${className}`}
        style={{ width: size * 0.7, height: size * 0.7 }}
        aria-hidden="true"
      >
        <i className={`${fallbackIcon} text-2xl`}></i>
      </div>
    );
  }

  return (
    <img
      src={`/empty_${name}.png`}
      onError={() => setMissing(true)}
      alt=""
      aria-hidden="true"
      className={`object-contain flex-shrink-0 select-none ${className}`}
      style={{ width: size, height: size }}
    />
  );
}
