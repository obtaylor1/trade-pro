interface OutcomeBoxProps {
  amount: number;
  profitRate: number;
  lossRate: number;
  riskLevel?: string;
}

export default function OutcomeBox({ amount, profitRate, lossRate, riskLevel }: OutcomeBoxProps) {
  const profitIfWin = amount * profitRate;
  const lossIfLose = amount * lossRate;
  const rewardMultiple = lossIfLose > 0 ? profitIfWin / lossIfLose : 0;

  const format = (val: number) => {
    return val.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 });
  };

  const riskColors: Record<string, string> = {
    Low: "text-green-400 border-green-500/25 bg-green-500/5",
    Medium: "text-amber-400 border-amber-500/25 bg-amber-500/5",
    High: "text-red-400 border-red-500/25 bg-red-500/5",
  };

  return (
    <div className="flex flex-col text-left">
      <div className="text-[13px] font-extrabold uppercase tracking-wider text-[#cbd5e1] mb-3">
        What Could Happen?
      </div>
      <div className="grid grid-cols-2 gap-3">
        {/* Win Outcome Box */}
        <div
          className="rounded-xl p-4 border flex flex-col justify-between min-h-[110px]"
          style={{
            background: "rgba(34, 197, 94, 0.05)",
            borderColor: "rgba(34, 197, 94, 0.22)",
          }}
        >
          <div>
            <div className="text-[11px] uppercase tracking-wider font-bold text-[#22c55e]">
              If the trade wins
            </div>
            <div className="text-[24px] font-extrabold text-[#22c55e] leading-tight mt-1.5">
              +{format(profitIfWin)}
            </div>
          </div>
          <div className="text-[12px] text-[#cbd5e1] font-medium mt-2 leading-snug">
            You may gain this amount
          </div>
        </div>

        {/* Loss Outcome Box */}
        <div
          className="rounded-xl p-4 border flex flex-col justify-between min-h-[110px]"
          style={{
            background: "rgba(239, 68, 68, 0.05)",
            borderColor: "rgba(239, 68, 68, 0.22)",
          }}
        >
          <div>
            <div className="text-[11px] uppercase tracking-wider font-bold text-[#ef4444]">
              If the trade loses
            </div>
            <div className="text-[24px] font-extrabold text-[#ef4444] leading-tight mt-1.5">
              -{format(lossIfLose)}
            </div>
          </div>
          <div className="text-[12px] text-[#cbd5e1] font-medium mt-2 leading-snug">
            This is your safety limit
          </div>
        </div>
      </div>

      {/* Reward vs risk summary */}
      <div className="flex items-center justify-between gap-2 mt-3">
        {rewardMultiple >= 1 && (
          <div className="flex items-center gap-1.5 text-[12px] font-bold text-[#cbd5e1]">
            <i className="fas fa-trophy text-amber-400 text-[11px]" aria-hidden="true"></i>
            <span>Reward is {rewardMultiple % 1 === 0 ? rewardMultiple : rewardMultiple.toFixed(1)}x the risk</span>
          </div>
        )}
        {riskLevel && (
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border text-[11px] font-extrabold uppercase tracking-wider ${riskColors[riskLevel] ?? riskColors.Medium}`}>
            Risk Level: {riskLevel}
            <i className="fas fa-shield-halved text-[10px]" aria-hidden="true"></i>
          </span>
        )}
      </div>
    </div>
  );
}
