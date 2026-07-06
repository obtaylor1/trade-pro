interface TradeTimelineProps {
  openTime: string;
  closeTime: string;
  tradeLength: string;
}

export default function TradeTimeline({ openTime, closeTime, tradeLength }: TradeTimelineProps) {
  return (
    <div className="flex flex-col gap-3 text-left">
      <div className="text-[14px] font-extrabold uppercase tracking-wider text-[#cbd5e1] mb-1 flex items-center gap-1.5">
        <span>Trade Timeline</span>
        <i className="fas fa-info-circle text-[10px] cursor-help text-slate-500"></i>
      </div>
      <div className="flex flex-col pl-2 border-l border-green-500/30 relative gap-2">
        {/* Row 1: Opens */}
        <div className="relative grid grid-cols-[90px_1fr] gap-[18px] items-center text-[15px] leading-relaxed">
          <span className="absolute -left-[12.5px] top-[7px] w-2.5 h-2.5 rounded-full bg-[#22c55e]"></span>
          <span className="text-[#f8fafc] font-semibold">Opens:</span>
          <span className="text-[#f8fafc] font-medium">{openTime}</span>
        </div>

        {/* Row 2: Closes */}
        <div className="relative grid grid-cols-[90px_1fr] gap-[18px] items-center text-[15px] leading-relaxed">
          <span className="absolute -left-[12.5px] top-[7px] w-2.5 h-2.5 rounded-full bg-[#22c55e]"></span>
          <span className="text-[#f8fafc] font-semibold">Closes:</span>
          <span className="text-[#f8fafc] font-medium">{closeTime}</span>
        </div>

        {/* Row 3: Trade Length */}
        <div className="relative grid grid-cols-[90px_1fr] gap-[18px] items-center text-[15px] leading-relaxed">
          <span className="absolute -left-[12.5px] top-[7px] w-2.5 h-2.5 rounded-full bg-[#22c55e]"></span>
          <span className="text-[#f8fafc] font-semibold">Trade length:</span>
          <span className="text-[#f8fafc] font-medium">{tradeLength}</span>
        </div>
      </div>
    </div>
  );
}
