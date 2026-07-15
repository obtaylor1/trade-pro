import { useTradingMode } from "@/contexts/TradingModeContext";

export default function ModeSwitch() {
  const { tradingMode, setMode, connectedLiveAccount } = useTradingMode();

  return (
    <div className="flex items-center gap-4 select-none">
      
      {/* Dynamic Warning Indicator Text Label */}
      <div className="hidden md:flex items-center gap-2">
        {tradingMode === "paper" ? (
          <span className="text-[10px] font-black uppercase tracking-wider text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2.5 py-1 rounded-lg">
            PRACTICE MODE - No real money is used.
          </span>
        ) : (
          <span className="text-[10px] font-black uppercase tracking-wider text-amber-500 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-lg animate-pulse">
            BROKER SANDBOX - Orders are simulated.
          </span>
        )}
      </div>

      {/* Premium Selector Slider switch */}
      <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-900 w-[220px]">
        {/* Practice Selection */}
        <button
          onClick={() => setMode("paper")}
          className={`flex-1 min-h-10 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
            tradingMode === "paper"
              ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          Practice
        </button>

        {/* Live Selection */}
        <button
          onClick={() => setMode("live")}
          className={`flex-1 min-h-10 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
            tradingMode === "live"
              ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          Sandbox
        </button>
      </div>

      {/* Mini Status Account Label */}
      {tradingMode === "live" && connectedLiveAccount && (
        <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#cbd5e1] border border-amber-500/30 px-2 py-1 rounded bg-[#0b1624]">
          <i className="fas fa-lock text-amber-500 mr-1"></i>
          {connectedLiveAccount.brokerName} Sandbox
        </span>
      )}
    </div>
  );
}
