interface MarketSelectorProps {
  selected: string;
  onChange: (market: string) => void;
}

const MARKETS = [
  { id: "forex", label: "Forex", subtitle: "Currencies", icon: "€$", iconClass: "text-blue-500 font-black text-base" },
  { id: "stocks", label: "Stocks", subtitle: "Companies", iconClass: "fas fa-chart-bar text-slate-300 text-lg" },
  { id: "crypto", label: "Crypto", subtitle: "Digital coins", iconClass: "fab fa-bitcoin text-amber-500 text-xl" },
  { id: "commodities", label: "Commodities", subtitle: "Gold, Oil, etc.", iconClass: "fas fa-cubes text-yellow-600 text-lg" },
  { id: "options", label: "Options", subtitle: "Advanced contracts", iconClass: "fas fa-layer-group text-purple-400 text-lg" },
];

export default function MarketSelector({ selected, onChange }: MarketSelectorProps) {
  return (
    <div className="flex flex-col gap-3.5 flex-[1.3] text-left">
      <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
        1. What do you want to trade?
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-2">
        {MARKETS.map(market => {
          const active = market.id === selected;
          return (
            <button
              key={market.id}
              onClick={() => onChange(market.id)}
              aria-pressed={active}
              className="flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all duration-200 outline-none select-none min-h-[110px]"
              style={{
                background: active ? "#0b1624" : "#07101d",
                borderColor: active ? "#2563eb" : "#1e3555",
                boxShadow: active ? "0 0 12px rgba(59, 130, 246, 0.25)" : "none",
              }}
            >
              {/* Circular Icon Container */}
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center border"
                style={{
                  background: active ? "rgba(37, 99, 235, 0.1)" : "#0b1624",
                  borderColor: active ? "#2563eb" : "#1e3555",
                }}
              >
                {market.icon ? (
                  <span className={market.iconClass}>{market.icon}</span>
                ) : (
                  <i className={market.iconClass}></i>
                )}
              </div>
              
              {/* Labels */}
              <div className="text-xs font-extrabold text-white mt-2 leading-none">
                {market.label}
              </div>
              <div className="text-[10px] text-slate-500 font-bold mt-1.5 leading-none">
                {market.subtitle}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
