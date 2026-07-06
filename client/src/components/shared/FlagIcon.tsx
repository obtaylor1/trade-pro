interface FlagIconProps {
  /** Currency or asset code, e.g. "EUR", "USD", "GOLD". */
  code: string;
  size?: number;
  className?: string;
}

/**
 * Circular vector flag/asset icons — crisp at any size, no image fetches.
 * Covers the major forex currencies plus common commodity/crypto codes;
 * unknown codes fall back to a monogram disc.
 */
export default function FlagIcon({ code, size = 28, className = "" }: FlagIconProps) {
  const c = code.toUpperCase();
  const clipId = `flag-clip-${c}`;

  const flag = FLAGS[c];
  if (!flag) {
    const monogram = MONOGRAMS[c] ?? c.slice(0, 2);
    return (
      <span
        className={`inline-flex items-center justify-center rounded-full bg-slate-800 border border-slate-700 font-black text-slate-200 select-none ${className}`}
        style={{ width: size, height: size, fontSize: size * 0.34 }}
        role="img"
        aria-label={c}
      >
        {monogram}
      </span>
    );
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      className={className}
      role="img"
      aria-label={`${c} flag`}
    >
      <defs>
        <clipPath id={clipId}>
          <circle cx="16" cy="16" r="16" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`}>{flag}</g>
      <circle cx="16" cy="16" r="15.5" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="1" />
    </svg>
  );
}

const MONOGRAMS: Record<string, string> = {
  GOLD: "Au",
  SILVER: "Ag",
  OIL: "Oil",
  BTC: "₿",
  ETH: "Ξ",
  SOL: "◎",
};

const FLAGS: Record<string, JSX.Element> = {
  EUR: (
    <>
      <rect width="32" height="32" fill="#003399" />
      {Array.from({ length: 12 }, (_, i) => {
        const angle = (i * 30 * Math.PI) / 180;
        const x = 16 + 9 * Math.sin(angle);
        const y = 16 - 9 * Math.cos(angle);
        return <circle key={i} cx={x} cy={y} r="1.4" fill="#FFCC00" />;
      })}
    </>
  ),
  USD: (
    <>
      <rect width="32" height="32" fill="#FFFFFF" />
      {Array.from({ length: 7 }, (_, i) => (
        <rect key={i} y={i * 4.6} width="32" height="2.3" fill="#B22234" />
      ))}
      <rect width="15" height="14" fill="#3C3B6E" />
      {Array.from({ length: 12 }, (_, i) => {
        const x = 2.5 + (i % 4) * 3.4;
        const y = 2.5 + Math.floor(i / 4) * 4.2;
        return <circle key={i} cx={x} cy={y} r="0.9" fill="#FFFFFF" />;
      })}
    </>
  ),
  GBP: (
    <>
      <rect width="32" height="32" fill="#012169" />
      <path d="M0,0 L32,32 M32,0 L0,32" stroke="#FFFFFF" strokeWidth="6" />
      <path d="M0,0 L32,32 M32,0 L0,32" stroke="#C8102E" strokeWidth="2.5" />
      <path d="M16,0 V32 M0,16 H32" stroke="#FFFFFF" strokeWidth="9" />
      <path d="M16,0 V32 M0,16 H32" stroke="#C8102E" strokeWidth="5" />
    </>
  ),
  JPY: (
    <>
      <rect width="32" height="32" fill="#FFFFFF" />
      <circle cx="16" cy="16" r="8" fill="#BC002D" />
    </>
  ),
  AUD: (
    <>
      <rect width="32" height="32" fill="#012169" />
      <g transform="scale(0.5)">
        <path d="M0,0 L32,32 M32,0 L0,32" stroke="#FFFFFF" strokeWidth="6" />
        <path d="M0,0 L32,32 M32,0 L0,32" stroke="#C8102E" strokeWidth="2.5" />
        <path d="M16,0 V32 M0,16 H32" stroke="#FFFFFF" strokeWidth="9" />
        <path d="M16,0 V32 M0,16 H32" stroke="#C8102E" strokeWidth="5" />
      </g>
      <circle cx="24" cy="9" r="1.5" fill="#FFFFFF" />
      <circle cx="21" cy="17" r="1.2" fill="#FFFFFF" />
      <circle cx="27" cy="15" r="1.2" fill="#FFFFFF" />
      <circle cx="24" cy="23" r="1.2" fill="#FFFFFF" />
      <circle cx="8" cy="25" r="1.6" fill="#FFFFFF" />
    </>
  ),
  CAD: (
    <>
      <rect width="32" height="32" fill="#FFFFFF" />
      <rect width="8" height="32" fill="#D80621" />
      <rect x="24" width="8" height="32" fill="#D80621" />
      <path
        d="M16 8 l1.6 3.4 2.6-1-0.8 3.2 3 0.6-2.2 2.4 2.6 1.8-3.2 0.8 0.4 3-3-1.4-1 3.2-1-3.2-3 1.4 0.4-3-3.2-0.8 2.6-1.8-2.2-2.4 3-0.6-0.8-3.2 2.6 1z"
        fill="#D80621"
      />
    </>
  ),
  CHF: (
    <>
      <rect width="32" height="32" fill="#DA291C" />
      <rect x="13" y="7" width="6" height="18" fill="#FFFFFF" />
      <rect x="7" y="13" width="18" height="6" fill="#FFFFFF" />
    </>
  ),
  NZD: (
    <>
      <rect width="32" height="32" fill="#012169" />
      <g transform="scale(0.5)">
        <path d="M0,0 L32,32 M32,0 L0,32" stroke="#FFFFFF" strokeWidth="6" />
        <path d="M0,0 L32,32 M32,0 L0,32" stroke="#C8102E" strokeWidth="2.5" />
        <path d="M16,0 V32 M0,16 H32" stroke="#FFFFFF" strokeWidth="9" />
        <path d="M16,0 V32 M0,16 H32" stroke="#C8102E" strokeWidth="5" />
      </g>
      <circle cx="24" cy="10" r="1.4" fill="#C8102E" stroke="#FFFFFF" strokeWidth="0.6" />
      <circle cx="21" cy="17" r="1.4" fill="#C8102E" stroke="#FFFFFF" strokeWidth="0.6" />
      <circle cx="27" cy="16" r="1.4" fill="#C8102E" stroke="#FFFFFF" strokeWidth="0.6" />
      <circle cx="24" cy="23" r="1.4" fill="#C8102E" stroke="#FFFFFF" strokeWidth="0.6" />
    </>
  ),
};
