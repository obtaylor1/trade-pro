import { useState } from "react";

const MOCK_NEWS = [
  { id: 1, category: "stocks", source: "Reuters", headline: "NVIDIA Surges 8% After Record Data Center Revenue Beats Estimates by $2B", summary: "Blackwell GPU demand from hyperscalers drove quarterly revenue to $26B, far exceeding analyst expectations.", affect: "NVDA position holders see strong short-term upside. Consider adding to existing longs on any pullback toward $130.", image: "📈", time: "2h ago" },
  { id: 2, category: "crypto", source: "CoinDesk", headline: "Bitcoin ETF Inflows Hit $500M in a Single Day as Institutional Demand Accelerates", summary: "BlackRock's iShares Bitcoin Trust recorded its highest single-day inflow, pushing total AUM past $20B.", affect: "Strong institutional buying supports BTC above $95K support. Momentum trade setup with stop at $90K.", image: "₿", time: "3h ago" },
  { id: 3, category: "forex", source: "FX Street", headline: "ECB Signals Slower Rate Cuts as Eurozone Inflation Stays Sticky at 2.6%", summary: "Christine Lagarde suggested the ECB would move cautiously, making fewer cuts than markets priced in for 2026.", affect: "EUR/USD likely to strengthen. Bullish bias on EUR pairs — consider EUR/USD long above 1.08.", image: "💱", time: "4h ago" },
  { id: 4, category: "commodities", source: "Bloomberg", headline: "Gold Hits New All-Time High at $3,320 as Central Banks Continue Record Buying Spree", summary: "Central banks globally purchased 55% more gold in Q1 2026 versus prior year, led by China and India.", affect: "Gold momentum remains firmly bullish. Any pullback to $3,250 is a buy opportunity with target $3,400.", image: "🪙", time: "5h ago" },
  { id: 5, category: "stocks", source: "CNBC", headline: "Apple's Services Revenue Tops $30B Quarterly for First Time, AI Features Driving Upgrades", summary: "App Store, iCloud, and Apple Intelligence subscriptions drove record services income with 18% YoY growth.", affect: "AAPL fundamentals remain strong. Options premium elevated — covered call strategy attractive near $215.", image: "🍎", time: "6h ago" },
  { id: 6, category: "crypto", source: "The Block", headline: "Ethereum Staking Yield Rises to 4.5% as Network Activity Reaches 2024 All-Time Highs", summary: "Increased DeFi activity on Ethereum mainnet and Layer-2s has driven up staking rewards for validators.", affect: "Higher yield makes ETH increasingly attractive to institutional holders. Supports bullish thesis above $3,700.", image: "⟠", time: "7h ago" },
  { id: 7, category: "options", source: "Market Watch", headline: "VIX Spikes to 22 as Earnings Season Begins — Options Premiums Elevated Across S&P 500", summary: "Implied volatility rising ahead of major tech earnings creates expensive options premiums across the board.", affect: "Higher IV means richer option premiums for sellers. Iron condor and covered call strategies more lucrative now.", image: "📊", time: "8h ago" },
  { id: 8, category: "forex", source: "FX Empire", headline: "Bank of Japan Raises Rates Again, Sending USD/JPY Down 200 Pips in Asian Session", summary: "BoJ's unexpected 25bps hike surprised markets, triggering yen strength across the board.", affect: "USD/JPY reversal confirmed. Short-term bearish — put options or short USD/JPY with stop above 157.", image: "🇯🇵", time: "9h ago" },
  { id: 9, category: "commodities", source: "Oil Price", headline: "OPEC+ Confirms Production Cuts Extended Through Q3 as WTI Holds Above $60", summary: "The cartel maintained discipline despite pressure from non-OPEC producers, supporting oil prices.", affect: "Oil downside limited by OPEC+ support. Range trade $58–$65 likely; buy near $60 support.", image: "🛢️", time: "10h ago" },
  { id: 10, category: "stocks", source: "Reuters", headline: "Amazon AWS Growth Accelerates to 22% as Enterprises Commit to Multi-Year AI Cloud Deals", summary: "Enterprise AI spending translated directly into AWS contract wins, with backlog growing 45% year-over-year.", affect: "AMZN cloud growth re-accelerating supports stock re-rating higher. Buy the dip toward $190 support.", image: "📦", time: "11h ago" },
];

const TABS = ["all", "stocks", "crypto", "forex", "commodities", "options"];

export default function NewsPage() {
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<number | null>(null);

  const filtered = MOCK_NEWS
    .filter(n => activeTab === "all" || n.category === activeTab)
    .filter(n => !search || n.headline.toLowerCase().includes(search.toLowerCase()) || n.summary.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="page-container lg:pb-8 min-h-screen" style={{ background: "#0d1117" }}>
      <div className="px-4 lg:px-8 pt-6 max-w-none">
        <h1 className="text-xl font-black mb-4">📰 Market News</h1>
        <div className="mb-4">
          <input type="text" placeholder="Search news..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full rounded-xl px-4 py-2.5 text-sm outline-none"
            style={{ background: "#1a2332", border: "1px solid #243044", color: "#e2e8f0" }} />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 mb-4 -mx-4 px-4 lg:mx-0 lg:px-0" style={{ scrollbarWidth: "none" }}>
          {TABS.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className="flex-shrink-0 px-4 py-2 rounded-2xl text-sm font-semibold capitalize transition-all"
              style={{ background: activeTab === tab ? "#3b82f622" : "#1a2332", color: activeTab === tab ? "#60a5fa" : "#64748b", border: `2px solid ${activeTab === tab ? "#3b82f6" : "#243044"}` }}>
              {tab}
            </button>
          ))}
        </div>
        {filtered.length === 0 ? (
          <div className="text-center py-12"><div className="text-4xl mb-3">📭</div><div className="font-semibold" style={{ color: "#64748b" }}>No articles found</div></div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {filtered.map(n => (
              <div key={n.id} className="rounded-2xl p-4 trade-card" style={{ background: "#1a2332", border: "1px solid #243044" }}>
                <div className="flex items-start gap-3">
                  <div className="text-3xl flex-shrink-0">{n.image}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full capitalize"
                        style={{ background: "#243044", color: "#94a3b8" }}>{n.source}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full capitalize"
                        style={{ background: "rgba(59,130,246,0.15)", color: "#60a5fa", border: "1px solid rgba(59,130,246,0.3)" }}>{n.category}</span>
                      <span className="text-[10px]" style={{ color: "#64748b" }}>{n.time}</span>
                    </div>
                    <div className="text-sm font-bold leading-snug mb-2">{n.headline}</div>
                    <div className="text-xs leading-relaxed" style={{ color: "#94a3b8" }}>{n.summary}</div>
                    <button onClick={() => setExpanded(expanded === n.id ? null : n.id)}
                      className="mt-2 text-xs font-semibold flex items-center gap-1" style={{ color: "#f59e0b" }}>
                      💡 How this affects my trades {expanded === n.id ? "▲" : "▼"}
                    </button>
                    {expanded === n.id && (
                      <div className="mt-2 rounded-xl p-3 text-xs leading-relaxed animate-fade-in"
                        style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", color: "#fbbf24" }}>
                        {n.affect}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
