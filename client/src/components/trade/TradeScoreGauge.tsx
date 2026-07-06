interface TradeScoreGaugeProps {
  score: number;
}

export default function TradeScoreGauge({ score }: TradeScoreGaugeProps) {
  let label = "Okay Setup";
  let color = "#eab308";
  let desc = "Average setup, moderate risk of loss.";

  if (score >= 85) {
    label = "Strong Setup";
    color = "#22c55e";
    desc = "High chance of success with minimal warnings.";
  } else if (score >= 70) {
    label = "Good Setup";
    color = "#22c55e"; // match screenshot's green
    desc = "Strong chance of success but not guaranteed.";
  } else if (score < 50) {
    label = "Weak Setup";
    color = "#ef4444";
    desc = "High risk configuration, proceed with caution.";
  }

  // Semi-circle path properties
  const radius = 50;
  const strokeWidth = 10;
  const circumference = Math.PI * radius;
  const strokeDashoffset = circumference * (1 - score / 100);

  return (
    <div className="flex flex-col items-center justify-center text-center select-none w-full">
      <div className="text-[14px] font-extrabold uppercase tracking-wider text-[#cbd5e1] mb-2 flex items-center gap-1.5 justify-center w-full">
        <span>Trade Score</span>
        <i className="fas fa-info-circle text-[10px] cursor-help text-slate-500"></i>
      </div>

      <div className="relative w-[190px] h-[115px] flex items-center justify-center overflow-hidden">
        {/* SVG Arch Gauge */}
        <svg className="absolute top-0 left-0 w-full h-full" viewBox="0 0 120 70">
          {/* Background Arc */}
          <path
            d="M 10 60 A 50 50 0 0 1 110 60"
            fill="none"
            stroke="#1e3555"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
          {/* Foreground Arc */}
          <path
            d="M 10 60 A 50 50 0 0 1 110 60"
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 0.8s ease-out" }}
          />
        </svg>

        {/* Center Text */}
        <div className="absolute bottom-2 flex items-baseline justify-center">
          <span className="text-[44px] font-black text-white leading-none">{score}</span>
          <span className="text-[22px] font-black text-[#94a3b8] leading-none ml-0.5">/100</span>
        </div>
      </div>

      {/* Label and Subtext */}
      <div className="mt-2 flex flex-col items-center max-w-[220px]">
        <div className="text-[20px] font-black" style={{ color }}>
          {label}
        </div>
        <div className="text-[15px] text-[#cbd5e1] leading-snug font-semibold mt-2">
          {desc}
        </div>
      </div>
    </div>
  );
}
