import { useState } from "react";

interface AmountSelectorProps {
  amount: number;
  customActive: boolean;
  onSelectAmount: (val: number, isCustom: boolean) => void;
}

export default function AmountSelector({ amount, customActive, onSelectAmount }: AmountSelectorProps) {
  const presets = [0.25, 1.0, 5.0, 10.0, 25.0];
  const [customVal, setCustomVal] = useState("");

  const handlePreset = (val: number) => {
    setCustomVal("");
    onSelectAmount(val, false);
  };

  const handleCustomChange = (val: string) => {
    setCustomVal(val);
    const parsed = parseFloat(val);
    if (!isNaN(parsed)) {
      onSelectAmount(parsed, true);
    } else {
      onSelectAmount(0, true);
    }
  };

  const isInvalid = customActive && (isNaN(parseFloat(customVal)) || parseFloat(customVal) < 0.10);

  return (
    <div className="flex flex-col gap-3 flex-1">
      <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
        3. How much do you want to trade with?
      </h2>
      <div className="flex gap-2">
        {presets.map(val => {
          const active = !customActive && amount === val;
          return (
            <button
              key={val}
              onClick={() => handlePreset(val)}
              aria-pressed={active}
              className="flex-1 min-h-10 py-2 rounded-lg text-xs font-bold border transition-all duration-200"
              style={{
                background: active ? "rgba(37, 99, 235, 0.15)" : "transparent",
                borderColor: active ? "#2563eb" : "#1e3555",
                color: active ? "#3b82f6" : "#cbd5e1",
              }}
            >
              ${val.toFixed(val === 0.25 ? 2 : 0)}
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-1.5 mt-1">
        <label htmlFor="custom-trade-amount" className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
          Custom Amount
        </label>
        <div
          className="flex items-center gap-2 px-3 min-h-10 rounded-lg border transition-all duration-200"
          style={{
            background: "var(--color-panel)",
            borderColor: customActive ? (isInvalid ? "#ef4444" : "#2563eb") : "#1e3555",
            boxShadow: customActive && !isInvalid ? "0 0 12px rgba(59, 130, 246, 0.2)" : "none",
          }}
        >
          <span className="font-extrabold text-xs text-slate-500">$</span>
          <input
            id="custom-trade-amount"
            type="number"
            min="0.10"
            step="0.01"
            inputMode="decimal"
            aria-describedby={isInvalid ? "custom-trade-amount-error" : undefined}
            placeholder="Enter amount"
            value={customVal}
            onChange={e => handleCustomChange(e.target.value)}
            onFocus={() => {
              if (customVal) {
                handleCustomChange(customVal);
              } else {
                onSelectAmount(0, true);
              }
            }}
            className="bg-transparent outline-none border-none text-xs font-extrabold text-white placeholder-slate-600 flex-1 w-full min-h-10"
          />
        </div>
        {isInvalid && (
          <div id="custom-trade-amount-error" role="alert" className="text-[11px] text-red-400 font-bold mt-0.5">
            Enter an amount of $0.10 or more.
          </div>
        )}
      </div>
    </div>
  );
}
