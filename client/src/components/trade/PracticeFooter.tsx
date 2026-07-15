import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function PracticeFooter() {
  const [showTutorial, setShowTutorial] = useState(false);

  return (
    <div className="flex flex-col gap-4 mt-8">
      {/* Footer Banner */}
      <div
        className="rounded-2xl p-5 border flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
        style={{
          background: "var(--color-card-deep)",
          borderColor: "var(--color-border-strong)",
        }}
      >
        <div className="flex-1 text-left">
          <h4 className="text-sm font-black text-white flex items-center gap-2">
            <i className="fas fa-graduation-cap text-blue-400"></i>
            Practice First
          </h4>
          <p className="text-xs font-semibold mt-1 leading-relaxed" style={{ color: "var(--color-muted)" }}>
            All trades use practice money. You can practice as much as you want before using real money.
          </p>
        </div>

        <button
          onClick={() => setShowTutorial(true)}
          id="how-it-works-btn"
          className="min-h-10 bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-500/30 text-xs font-bold py-2.5 px-5 rounded-xl transition-all whitespace-nowrap"
        >
          How It Works
        </button>
      </div>

      {/* Safety Note */}
      <div className="text-center text-[10px] font-bold text-slate-500 flex items-center justify-center gap-1.5 py-1">
        <i className="fas fa-exclamation-triangle text-amber-500/75 text-[9px]"></i>
        <span>Trading involves risk. A high trade score does not guarantee a win.</span>
      </div>

      {/* Interactive Explanation Modal */}
      <Dialog open={showTutorial} onOpenChange={setShowTutorial}>
        <DialogContent className="bg-gray-900 border-gray-800 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-white flex items-center gap-2">
              <i className="fas fa-info-circle text-blue-500"></i>
              How Paper Trading Works
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-xs font-medium text-slate-300 leading-relaxed">
            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 flex items-center justify-center font-black flex-shrink-0">1</div>
              <div>
                <strong className="text-white block font-extrabold mb-0.5">Explore setup indicators</strong>
                Choose your favorite assets (Forex, Crypto, Stocks) and how long you want to hold the position.
              </div>
            </div>

            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 flex items-center justify-center font-black flex-shrink-0">2</div>
              <div>
                <strong className="text-white block font-extrabold mb-0.5">Manage risk with practice funds</strong>
                Input how much practice balance you want to place. We calculate the maximum profit and loss beforehand.
              </div>
            </div>

            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 flex items-center justify-center font-black flex-shrink-0">3</div>
              <div>
                <strong className="text-white block font-extrabold mb-0.5">Follow and close trades</strong>
                Track open signals on your Account page. You can close them early to lock in profits or prevent losses!
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
