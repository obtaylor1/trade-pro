interface OutcomeBoxProps {
  amount: number;
  profitRate: number;
  lossRate: number;
  riskLevel?: string;
}

export default function OutcomeBox({ amount, profitRate, lossRate, riskLevel }: OutcomeBoxProps) {
  const profitIfWin = amount * profitRate;
  const lossIfLose = amount * lossRate;
  const totalReturn = amount + profitIfWin;

  const format = (val: number) => {
    return val.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 });
  };

  return (
    <div className="flex flex-col text-left select-none">
      {/* Title with amount info */}
      <div className="text-[13px] font-black uppercase tracking-wider text-slate-400 mb-3.5 flex items-center gap-1.5">
        <span>WHAT COULD HAPPEN?</span>
        <span className="text-slate-500 font-bold lowercase">({`Based on ${format(amount)}`})</span>
        <i className="far fa-question-circle text-[11px] text-slate-650 cursor-pointer"></i>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Win Outcome Box */}
        <div
          className="rounded-xl p-4.5 border flex flex-col justify-between border-green-500/20"
          style={{
            background: "rgba(34, 197, 94, 0.04)",
          }}
        >
          <div>
            <div className="text-[12px] uppercase tracking-wider font-extrabold text-green-500 mb-2.5">
              If the trade wins
            </div>
            
            <div className="text-[17px] font-extrabold text-slate-200 leading-normal">
              Profit: <span className="text-green-400 font-black">+{format(profitIfWin)}</span>
            </div>

            <div className="text-[17px] font-extrabold text-slate-200 leading-normal mt-1.5">
              Total return: <span className="text-green-400 font-black">{format(totalReturn)}</span>
            </div>
          </div>

          <div className="text-[12px] text-slate-400 font-bold mt-4.5 leading-snug">
            Your {format(amount)} + {format(profitIfWin)} profit
          </div>
        </div>

        {/* Loss Outcome Box */}
        <div
          className="rounded-xl p-4.5 border flex flex-col justify-between border-red-500/20"
          style={{
            background: "rgba(239, 68, 68, 0.04)",
          }}
        >
          <div>
            <div className="text-[12px] uppercase tracking-wider font-extrabold text-red-400 mb-2.5">
              If the trade loses
            </div>
            
            <div className="text-[17px] font-extrabold text-slate-200 leading-normal">
              Loss: <span className="text-red-400 font-black">-{format(lossIfLose)}</span>
            </div>

            <div className="text-[12px] text-slate-400 font-bold leading-normal mt-2">
              Amount lost if stop hits
            </div>
          </div>

          <div className="text-[12px] text-slate-400 font-bold mt-4.5 leading-snug">
            Your {format(amount)} - {format(lossIfLose)}
          </div>
        </div>
      </div>
    </div>
  );
}
