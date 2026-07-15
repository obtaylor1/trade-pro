interface DurationSelectorProps {
  selected: string;
  onChange: (duration: string) => void;
}

const DURATIONS = [
  { id: "quick", label: "Quick Trade", subtitle: "Minutes", iconClass: "fas fa-bolt text-yellow-500 text-lg", activeSubColor: "#3b82f6" },
  { id: "shortTerm", label: "Short-Term", subtitle: "Days", iconClass: "fas fa-calendar-alt text-slate-400 text-lg" },
  { id: "longTerm", label: "Long-Term", subtitle: "Weeks+", iconClass: "fas fa-university text-slate-300 text-lg" },
];

export default function DurationSelector({ selected, onChange }: DurationSelectorProps) {
  return (
    <div className="flex flex-col gap-3.5 flex-1 text-left">
      <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
        2. How long do you want to stay in the trade?
      </h2>
      <div className="grid grid-cols-3 gap-2">
        {DURATIONS.map(dur => {
          const active = dur.id === selected;
          return (
            <button
              key={dur.id}
              onClick={() => onChange(dur.id)}
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
                <i className={dur.iconClass}></i>
              </div>
              
              {/* Labels */}
              <div className="text-xs font-extrabold text-white mt-2 leading-none">
                {dur.label}
              </div>
              <div
                className="text-[10px] font-bold mt-1.5 leading-none"
                style={{ color: active && dur.activeSubColor ? dur.activeSubColor : "#64748b" }}
              >
                {dur.subtitle}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
