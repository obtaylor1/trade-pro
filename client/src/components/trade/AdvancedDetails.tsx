interface AdvancedDetailsProps {
  currentPrice: number;
  direction: string;
  tradingCost: string;
  profitGoal: string;
  safetyStop: string;
  tradeSize: string;
  timeframe: string;
  signalType: string;
}

export default function AdvancedDetails({
  currentPrice,
  direction,
  tradingCost,
  profitGoal,
  safetyStop,
  tradeSize,
  timeframe,
  signalType,
}: AdvancedDetailsProps) {
  const format = (val: number) => {
    return val.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 4 });
  };

  const fields = [
    { label: "Current Price", value: format(currentPrice) },
    { label: direction === "BUY" ? "Buy Price" : "Sell Price", value: format(currentPrice) },
    { label: "Trading Cost (Spread)", value: tradingCost },
    { label: "Profit Goal", value: profitGoal },
    { label: "Safety Stop", value: safetyStop },
    { label: "Trade Size", value: tradeSize },
    { label: "Timeframe", value: timeframe },
    { label: "Signal Type", value: signalType },
  ];

  return (
    <div
      className="rounded-xl p-3 grid grid-cols-2 sm:grid-cols-4 gap-3 border text-xs text-left"
      style={{
        background: "rgba(16, 29, 47, 0.5)",
        borderColor: "var(--color-border-strong)",
      }}
    >
      {fields.map((f, i) => (
        <div key={i} className="flex flex-col gap-0.5">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{f.label}</span>
          <span className="font-extrabold text-white">{f.value}</span>
        </div>
      ))}
    </div>
  );
}
