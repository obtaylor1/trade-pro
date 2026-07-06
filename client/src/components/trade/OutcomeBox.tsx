interface OutcomeBoxProps {
  amount: number;
  profitRate: number;
  lossRate: number;
}

export default function OutcomeBox({ amount, profitRate, lossRate }: OutcomeBoxProps) {
  const profitIfWin = amount * profitRate;
  const lossIfLose = amount * lossRate;
  const totalReturnIfWin = amount + profitIfWin;
  const totalReturnIfLoss = Math.max(0, amount - lossIfLose);

  const format = (val: number) => {
    return val.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 });
  };

  return (
    <div className="flex flex-col text-left">
      <div className="text-[14px] font-extrabold uppercase tracking-wider text-[#cbd5e1] mb-3">
        What Could Happen? (Based on {format(amount)})
      </div>
      <div className="grid grid-cols-2 gap-[14px]">
        {/* Win Outcome Box */}
        <div
          className="rounded-[12px] p-[16px_18px] border flex flex-col justify-between min-h-[118px]"
          style={{
            background: "rgba(34, 197, 94, 0.04)",
            borderColor: "rgba(34, 197, 94, 0.2)",
          }}
        >
          <div>
            <div className="text-[13px] uppercase tracking-wider font-bold text-[#22c55e]">
              If the trade wins
            </div>
            <div className="text-[22px] font-extrabold text-[#22c55e] leading-tight mt-1">
              Profit: +{format(profitIfWin)}
            </div>
            <div className="text-[18px] font-bold text-white mt-1">
              Total return: {format(totalReturnIfWin)}
            </div>
          </div>
          <div className="text-[13px] text-[#cbd5e1] font-medium mt-2">
            Your {format(amount)} + {format(profitIfWin)} profit
          </div>
        </div>

        {/* Loss Outcome Box */}
        <div
          className="rounded-[12px] p-[16px_18px] border flex flex-col justify-between min-h-[118px]"
          style={{
            background: "rgba(239, 68, 68, 0.04)",
            borderColor: "rgba(239, 68, 68, 0.2)",
          }}
        >
          <div>
            <div className="text-[13px] uppercase tracking-wider font-bold text-[#ef4444]">
              If the trade loses
            </div>
            <div className="text-[22px] font-extrabold text-[#ef4444] leading-tight mt-1">
              Loss: -{format(lossIfLose)}
            </div>
          </div>
          <div>
            <div className="text-[13px] text-[#cbd5e1] font-bold mt-1">
              Amount lost if stop hits
            </div>
            <div className="text-[13px] text-[#cbd5e1] font-medium mt-1">
              Your {format(amount)} - {format(lossIfLose)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
