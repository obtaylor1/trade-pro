import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { apiJson } from "@/lib/queryClient";

interface NewsArticle {
  id: string;
  title: string;
  summary: string;
  source: string;
  sourceDomain: string;
  category: string;
  imageUrl: string;
  articleUrl: string;
  publishedAt: string;
  affect: string;
}

const TABS = [
  { value: "all", label: "All News", desc: "All markets" },
  { value: "stocks", label: "Stocks", desc: "Companies" },
  { value: "crypto", label: "Crypto", desc: "Digital coins" },
  { value: "forex", label: "Forex", desc: "Currencies" },
  { value: "commodities", label: "Commodities", desc: "Gold, oil, etc." },
  { value: "options", label: "Options", desc: "Advanced" },
];

function useETTime() {
  const [etInfo, setEtInfo] = useState({ time: "", isOpen: false });
  useEffect(() => {
    const update = () => {
      const now = new Date();
      const etStr = now.toLocaleString("en-US", { timeZone: "America/New_York", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true });
      const etDate = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
      const day = etDate.getDay();
      const h = etDate.getHours();
      const m = etDate.getMinutes();
      const totalMins = h * 60 + m;
      const isWeekday = day >= 1 && day <= 5;
      const isOpen = isWeekday && totalMins >= 9 * 60 + 30 && totalMins < 16 * 60;
      setEtInfo({ time: etStr + " ET", isOpen });
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);
  return etInfo;
}

function timeAgo(dateStr: string) {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "recently";
  const diff = Math.max(0, Math.floor((Date.now() - d.getTime()) / 1000));
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// Beginner Translation Parser
function getArticleImpact(article: NewsArticle) {
  const title = article.title.toLowerCase();
  
  let difficulty: "Easy" | "Medium" | "Advanced" = "Easy";
  let tradeImpact: "Low" | "Medium" | "High" = "Medium";
  let whyItMatters = article.summary || "This news highlights recent developments in the market.";
  let couldAffect = "Broader markets";
  let plainEnglishExplanation = "";
  let couldHelp = "";
  let couldHurt = "";
  let tags: string[] = [];

  if (article.category === "options" || title.includes("filing") || title.includes("form 4") || title.includes("implied volatility") || title.includes("option flow")) {
    difficulty = "Advanced";
    tradeImpact = "High";
    couldAffect = "Options, SPY, QQQ";
    whyItMatters = "Options flow or SEC filings indicate where smart money or insiders are placing large bets.";
    plainEnglishExplanation = "Insiders or institutions are purchasing or selling options contracts. This could trigger major stock price swings as market makers hedge their positions.";
    couldHelp = "Underlying symbols with heavy call volume";
    couldHurt = "Symbols facing heavy put writing or insider selling";
    tags = ["SPY", "Options Flow", "Volatility"];
  } else if (article.category === "forex" || title.includes("fed") || title.includes("ecb") || title.includes("inflation") || title.includes("cpi") || title.includes("interest rate") || title.includes("meeting")) {
    difficulty = "Medium";
    tradeImpact = "Medium";
    couldAffect = "EUR Pairs, Forex";
    whyItMatters = "Central bank meetings and inflation reports determine currency values.";
    plainEnglishExplanation = "Economic reports or central bank decisions affect currency values because higher interest rates attract international investors seeking better returns.";
    couldHelp = "EUR/USD, EUR/JPY, Major Pairs";
    couldHurt = "US Dollar if Fed indicators turn dovish";
    tags = ["EUR/USD", "EUR/JPY", "Major Pairs"];
  } else if (article.category === "crypto" || title.includes("bitcoin") || title.includes("ethereum") || title.includes("solana") || title.includes("coin") || title.includes("stabilizes")) {
    difficulty = "Medium";
    tradeImpact = "Medium";
    couldAffect = "BTC, Crypto Market";
    whyItMatters = "Crypto prices are driven by adoption metrics and regulatory news.";
    plainEnglishExplanation = "Crypto markets are open 24/7 and react strongly to network upgrades, token inflows, or regulatory approvals.";
    couldHelp = "Bitcoin (BTC), Ethereum (ETH), digital assets";
    couldHurt = "Altcoins if Bitcoin dominance spikes";
    tags = ["BTC", "Crypto Market", "Inflows"];
  } else if (article.category === "stocks" || title.includes("revenue") || title.includes("beats") || title.includes("earnings") || title.includes("revenue estimates") || title.includes("rivian")) {
    difficulty = "Medium";
    tradeImpact = "Medium";
    couldAffect = "RIVN, EV Stocks";
    whyItMatters = "Rivian reported stronger revenue than expected, which may affect investor confidence.";
    plainEnglishExplanation = "Rivian beat revenue estimates, proving that demand for electric trucks remains strong despite economic headwinds. This boosts investor sentiment in growth stocks.";
    couldHelp = "RIVN, EV Stocks, Earnings";
    couldHurt = "Traditional automakers losing market share";
    tags = ["RIVN", "EV Stocks", "Earnings"];
  } else {
    difficulty = "Easy";
    tradeImpact = "Low";
    couldAffect = "Broader market indices";
    whyItMatters = "General market updates keep you informed of broader economic sentiment.";
    plainEnglishExplanation = "This article covers general market conditions. Understanding the broader trend helps you avoid trading against the market direction.";
    couldHelp = "Index ETFs (SPY, QQQ)";
    couldHurt = "Speculative or high-risk stocks";
    tags = ["Broader Market", "Global Index"];
  }

  if (whyItMatters.length > 120) {
    whyItMatters = whyItMatters.substring(0, 117) + "...";
  }

  return { difficulty, tradeImpact, whyItMatters, couldAffect, plainEnglishExplanation, couldHelp, couldHurt, tags };
}

function CategoryFallbackGraphic({ category }: { category: string }) {
  const images: Record<string, string> = {
    stocks: "/fallback_stocks.jpg",
    crypto: "/fallback_crypto.jpg",
    forex: "/fallback_forex.jpg",
    commodities: "/fallback_commodities.jpg",
    options: "/fallback_options.jpg",
    all: "/summary_icon.jpg",
  };

  const src = images[category] || images.all;

  return (
    <img
      src={src}
      alt={category}
      className="w-full h-full object-cover rounded-xl"
    />
  );
}

export default function NewsPage() {
  const { token } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  // Search & Filters
  const [activeTab, setActiveTab] = useState<string>("all");
  const [search, setSearch] = useState<string>("");
  const [showBeginnerOnly, setShowBeginnerOnly] = useState<boolean>(true);
  const [videoHidden, setVideoHidden] = useState<boolean>(() => localStorage.getItem("news-video-hidden") === "true");

  // Saved Articles state
  const [savedArticles, setSavedArticles] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("news-saved") || "[]");
    } catch {
      return [];
    }
  });

  // Modal explanation drawer
  const [explainingArticle, setExplainingArticle] = useState<NewsArticle | null>(null);

  const { time, isOpen: marketOpen } = useETTime();

  // Query articles list
  const { data: articles = [], isLoading, isError } = useQuery<NewsArticle[]>({
    queryKey: ["/api/news", activeTab],
    queryFn: () => apiJson<NewsArticle[]>(`/api/news?category=${activeTab}`),
    staleTime: 5 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000,
  });

  // Filter list
  const getFilteredArticles = (): NewsArticle[] => {
    let result = articles ?? [];

    // Apply Search
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(a => a.title.toLowerCase().includes(q) || a.summary.toLowerCase().includes(q));
    }

    // Apply beginner filter
    if (showBeginnerOnly) {
      result = result.filter(a => {
        const impact = getArticleImpact(a);
        return impact.difficulty !== "Advanced";
      });
    }

    return result;
  };

  const filtered = getFilteredArticles();

  // Build Recommended Articles Carousel
  const getRecommendedArticles = (): NewsArticle[] => {
    const list: NewsArticle[] = [];
    
    // Find unique categories
    const stocksArt = (articles ?? []).find(a => a.category === "stocks");
    const forexArt = (articles ?? []).find(a => a.category === "forex");
    const cryptoArt = (articles ?? []).find(a => a.category === "crypto");

    if (stocksArt) list.push(stocksArt);
    if (forexArt) list.push(forexArt);
    if (cryptoArt) list.push(cryptoArt);

    // Fallbacks
    if (list.length < 3) {
      (articles ?? []).forEach(a => {
        if (!list.some(item => item.id === a.id) && list.length < 3) {
          list.push(a);
        }
      });
    }

    return list;
  };

  const recommended = getRecommendedArticles();

  const handleToggleVideo = () => {
    const next = !videoHidden;
    setVideoHidden(next);
    localStorage.setItem("news-video-hidden", String(next));
  };

  const handleSaveArticle = (id: string) => {
    const exists = savedArticles.includes(id);
    let next: string[] = [];
    if (exists) {
      next = savedArticles.filter(item => item !== id);
      toast({ title: "Article Removed", description: "Article removed from saved read list." });
    } else {
      next = [...savedArticles, id];
      toast({ title: "Article Saved! 📰", description: "This article has been saved to your dashboard read list." });
    }
    setSavedArticles(next);
    localStorage.setItem("news-saved", JSON.stringify(next));
  };

  const handleAddToWatchlist = (symbol: string) => {
    fetch("/api/watchlist", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ ticker: symbol, market: "stocks" })
    }).then(r => {
      if (r.ok) {
        toast({ title: `Added ${symbol} to Watchlist`, description: "You will now receive alerts and trade matching suggestions." });
      } else {
        toast({ title: "Action Failed", description: "Unable to add ticker. Try again.", variant: "destructive" });
      }
    });
  };

  const explainingImpact = explainingArticle ? getArticleImpact(explainingArticle) : null;

  return (
    <div className="page-container page-glow min-h-screen pb-16 text-left select-none" style={{ background: "var(--color-bg-deep)" }}>
      <div className="px-4 lg:px-8 pt-6 max-w-none">
        
        {/* Page Header */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4 select-none">
          <div>
            <h1 className="page-title text-28px font-extrabold text-white flex items-center gap-2 select-none">
              Market News & Trade Impact
              <i className="far fa-question-circle text-sm text-slate-500 cursor-pointer hover:text-slate-350 transition-all"></i>
            </h1>
            <p className="page-subtitle text-xs text-slate-400 mt-1 select-none font-semibold">
              Understand market news in plain English and see how it may affect your trades.
            </p>
          </div>
          <button
            onClick={() => toast({ title: "Customize Feed", description: "Your custom alert thresholds and keyword blocklists are active." })}
            className="h-10 px-4 rounded-xl bg-slate-900 border border-slate-800 text-slate-350 hover:text-white text-xs font-black transition-all flex items-center gap-2 cursor-pointer"
          >
            <i className="fas fa-sliders text-xs"></i>
            Customize News
          </button>
        </div>

        {/* ─── ROW 1: Summary Cards Grid ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mb-6 items-stretch select-none">
          
          {/* Today's Market Summary Card */}
          <div className="lg:col-span-5 account-card flex flex-col justify-between p-5 border border-slate-800 bg-[#0b1626] rounded-2xl border-box shadow-[0_4px_24px_rgba(37,99,235,0.02)]">
            <div>
              <div className="flex items-center gap-2.5 mb-3">
                <img src="/summary_icon.jpg" alt="" className="w-8 h-8 rounded-lg object-cover shrink-0 border border-slate-850" />
                <h3 className="text-sm font-black text-white">Today's Market Summary</h3>
              </div>
              
              <p className="text-xs font-black text-slate-300 leading-relaxed mb-3">
                Markets are closed right now. Crypto is still active.
              </p>
              
              <p className="text-[11px] text-slate-450 leading-normal mb-5 font-semibold">
                Economic data, company earnings, and crypto momentum may affect trade ideas.
              </p>

              {/* Status tiles */}
              <div className="grid grid-cols-3 gap-3 mb-5">
                {/* Stocks */}
                <div className="rounded-xl border border-slate-850 bg-slate-900/40 p-2.5 text-center flex flex-col items-center justify-center border-box">
                  <i className="fas fa-chart-line text-xs text-red-500 mb-1"></i>
                  <span className="text-[9px] font-black text-slate-450 uppercase mb-0.5">Stocks</span>
                  <span className="text-[8px] font-black text-red-400 bg-red-500/5 border border-red-500/10 px-1 rounded">Closed</span>
                </div>
                {/* Crypto */}
                <div className="rounded-xl border border-slate-850 bg-slate-900/40 p-2.5 text-center flex flex-col items-center justify-center border-box">
                  <i className="fas fa-coins text-xs text-green-500 mb-1 animate-pulse"></i>
                  <span className="text-[9px] font-black text-slate-450 uppercase mb-0.5">Crypto</span>
                  <span className="text-[8px] font-black text-green-400 bg-green-500/5 border border-green-500/10 px-1 rounded">Open</span>
                </div>
                {/* Forex */}
                <div className="rounded-xl border border-slate-850 bg-slate-900/40 p-2.5 text-center flex flex-col items-center justify-center border-box">
                  <i className="fas fa-rotate text-xs text-amber-500 mb-1"></i>
                  <span className="text-[9px] font-black text-slate-450 uppercase mb-0.5">Forex</span>
                  <span className="text-[8px] font-black text-amber-400 bg-amber-500/5 border border-amber-500/10 px-1 rounded">Opens Soon</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setLocation("/markets")}
              className="h-10 w-full rounded-xl bg-blue-600 hover:bg-blue-750 text-white text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer border-none shadow-sm mt-auto"
            >
              See Trade Ideas
              <i className="fas fa-arrow-right text-[10px]"></i>
            </button>
          </div>

          {/* Live Market Coverage Card */}
          <div className="lg:col-span-7 account-card p-5 border border-slate-800 bg-[#0b1626] rounded-2xl border-box flex flex-col justify-between shadow-[0_4px_24px_rgba(239,68,68,0.01)]">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[#ef4444]/15 border border-red-500/25 flex items-center justify-center text-red-500 animate-pulse">
                    <i className="fas fa-satellite-dish text-xs"></i>
                  </div>
                  <h3 className="text-sm font-black text-white">Live Market Coverage</h3>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleToggleVideo}
                    className="h-7 px-3 rounded border border-slate-800 bg-slate-900 text-slate-400 text-[10px] font-black hover:text-white cursor-pointer transition-all border-box"
                  >
                    {videoHidden ? "Show Video" : "Hide Video"}
                  </button>
                  <button
                    onClick={() => window.open("https://finance.yahoo.com/live", "_blank")}
                    className="w-7 h-7 rounded border border-slate-800 bg-slate-900 text-slate-450 hover:text-white flex items-center justify-center cursor-pointer transition-all border-box"
                  >
                    <i className="fas fa-expand text-[10px]"></i>
                  </button>
                </div>
              </div>
              <p className="text-[11px] text-slate-450 leading-normal mb-3.5 font-semibold">
                Watch live market updates, then review the key takeaways.
              </p>

              {/* Video Player */}
              {!videoHidden && (
                <div className="rounded-xl overflow-hidden mb-3.5 bg-black/40 border border-slate-900">
                  <iframe
                    src="https://www.youtube.com/embed/KQp-e_XQnDE?autoplay=0&mute=1"
                    title="Live Market Updates"
                    allow="fullscreen"
                    style={{ width: "100%", height: 160, display: "block", border: "none" }}
                  />
                </div>
              )}
            </div>

            {/* AI Summary note block */}
            <div className="bg-[#101d31]/50 border border-slate-800 p-3.5 rounded-xl flex items-start gap-2.5 text-slate-350 text-[11px] font-semibold leading-relaxed text-left border-box">
              <i className="fas fa-robot text-blue-400 text-xs mt-0.5 shrink-0 animate-pulse"></i>
              <div>
                <strong className="text-white block text-[10px] font-black uppercase mb-0.5">AI Summary of This Coverage</strong>
                This coverage is discussing economic data for the week. Reports like trade balance, Fed minutes, and inflation data can affect stocks, forex, and commodities.
              </div>
            </div>
          </div>
        </div>

        {/* ─── ROW 2: AI Key Takeaways ─── */}
        <div className="mb-6 select-none border border-slate-800 bg-[#0b1626] p-5 rounded-2xl border-box">
          <div className="flex items-center gap-2 mb-4">
            <i className="fas fa-wand-magic-sparkles text-blue-400 text-sm"></i>
            <h2 className="text-sm font-black text-white">AI Key Takeaways</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Stocks */}
            <div className="rounded-xl border bg-slate-900/30 border-slate-850 p-4 text-left flex items-start gap-3 border-box">
              <img src="/stocks_takeaway_icon.jpg" alt="" className="w-10 h-10 rounded-full object-cover shrink-0 border border-slate-800" />
              <div>
                <h4 className="text-xs font-black text-white">Stocks</h4>
                <p className="text-[11px] text-slate-450 leading-relaxed font-semibold mt-1 mb-2">
                  Earnings and economic data may affect price movement.
                </p>
                <button onClick={() => setLocation("/markets")} className="text-[9px] font-black text-blue-400 hover:text-blue-300 transition-all border-none bg-transparent p-0 cursor-pointer">
                  Explore Stock Ideas →
                </button>
              </div>
            </div>

            {/* Forex */}
            <div className="rounded-xl border bg-slate-900/30 border-slate-850 p-4 text-left flex items-start gap-3 border-box">
              <img src="/forex_takeaway_icon.jpg" alt="" className="w-10 h-10 rounded-full object-cover shrink-0 border border-slate-800" />
              <div>
                <h4 className="text-xs font-black text-white">Forex</h4>
                <p className="text-[11px] text-slate-450 leading-relaxed font-semibold mt-1 mb-2">
                  Inflation, Fed news, and economic reports can move currency pairs.
                </p>
                <button onClick={() => setLocation("/markets")} className="text-[9px] font-black text-blue-400 hover:text-blue-300 transition-all border-none bg-transparent p-0 cursor-pointer">
                  Explore Forex Ideas →
                </button>
              </div>
            </div>

            {/* Crypto */}
            <div className="rounded-xl border bg-slate-900/30 border-slate-850 p-4 text-left flex items-start gap-3 border-box">
              <img src="/crypto_takeaway_icon.jpg" alt="" className="w-10 h-10 rounded-full object-cover shrink-0 border border-slate-800" />
              <div>
                <h4 className="text-xs font-black text-white">Crypto</h4>
                <p className="text-[11px] text-slate-450 leading-relaxed font-semibold mt-1 mb-2">
                  Crypto trades continue even when stock markets are closed.
                </p>
                <button onClick={() => setLocation("/markets")} className="text-[9px] font-black text-blue-400 hover:text-blue-300 transition-all border-none bg-transparent p-0 cursor-pointer">
                  Explore Crypto Ideas →
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ─── ROW 3: Search + Filters ─── */}
        <div className="flex flex-col lg:flex-row gap-4 justify-between items-center mb-6 border-b border-slate-900 pb-5 select-none">
          <div className="w-full lg:w-80 relative flex items-center">
            <i className="fas fa-search text-slate-500 absolute left-3 text-xs"></i>
            <input
              type="text"
              aria-label="Search market news"
              placeholder="Search news..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full h-10 rounded-xl pl-9 pr-4 bg-[#0b1626] border border-slate-800 text-white text-xs font-semibold focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1 max-w-full" style={{ scrollbarWidth: "none" }}>
            {TABS.map(tab => (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                className={`flex-shrink-0 px-4 h-9 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer border flex flex-col justify-center items-center ${
                  activeTab === tab.value
                    ? "bg-[#3b82f6]/10 border-blue-500 text-blue-400 shadow-sm"
                    : "bg-[#0b1626] border-slate-800 text-slate-400 hover:text-slate-200"
                }`}
              >
                <span>{tab.label}</span>
                <span className="text-[8px] opacity-60 font-medium normal-case mt-0.5">{tab.desc}</span>
              </button>
            ))}
          </div>

          <label className="flex items-center gap-2 shrink-0 cursor-pointer select-none text-xs font-bold text-slate-350">
            <span>Show beginner-friendly news only</span>
            <input
              type="checkbox"
              checked={showBeginnerOnly}
              onChange={(e) => setShowBeginnerOnly(e.target.checked)}
              className="w-4 h-4 rounded border-slate-800 bg-slate-900 text-blue-600 focus:ring-blue-500"
            />
          </label>
        </div>

        {/* ─── ROW 4: Recommended for You ─── */}
        {recommended.length > 0 && !search && (
          <div className="mb-6 select-none border-b border-slate-900 pb-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5">
                <i className="fas fa-bookmark text-blue-400 text-sm"></i>
                <h2 className="text-sm font-black text-white">Recommended for You</h2>
                <span className="text-[9px] font-medium text-slate-550 ml-2">News related to your watched markets and recent practice trades.</span>
              </div>
              <button onClick={() => toast({ title: "Personalized Feed", description: "Showing topics matching your watchlist." })} className="text-[9px] font-black text-blue-400 hover:text-blue-300 transition-all border-none bg-transparent cursor-pointer">
                View All →
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {recommended.map(art => {
                const impact = getArticleImpact(art);
                return (
                  <div
                    key={`rec-${art.id}`}
                    onClick={() => setExplainingArticle(art)}
                    className="rounded-2xl border p-4 text-left bg-[#0b1626] border-slate-850 hover:border-blue-500/40 cursor-pointer transition-all flex gap-3 items-center border-box shadow-sm"
                  >
                    <div className="w-14 h-14 rounded-xl overflow-hidden bg-slate-900 shrink-0 border border-slate-800 flex items-center justify-center">
                      <CategoryFallbackGraphic category={art.category} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex gap-2 items-center mb-1 flex-wrap">
                        <span className="text-[8px] font-black uppercase text-blue-400">{art.category}</span>
                        <span className="text-[8px] font-bold text-slate-500">• {art.source}</span>
                      </div>
                      <h4 className="text-[11px] font-bold text-white leading-snug truncate">{art.title}</h4>
                      <div className="flex gap-1.5 items-center mt-2">
                        <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          Impact: {impact.tradeImpact}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ─── ROW 5: Latest Market News Cards ─── */}
        <div>
          <div className="flex items-center justify-between mb-4 select-none">
            <h2 className="text-sm font-black text-white flex items-center gap-1.5">
              <i className="fas fa-newspaper text-slate-500"></i>
              Latest Market News
            </h2>
            <div className="flex items-center gap-3">
              <span className="text-[9px] font-bold text-slate-550">Showing {filtered.length} articles</span>
              <div className="flex items-center gap-1.5 bg-[#0b1626] border border-slate-800 px-2.5 py-1 rounded-lg text-[10px] font-black text-slate-300 border-box">
                <span>Sort by:</span>
                <select aria-label="Sort news articles" className="bg-transparent border-none text-white font-black cursor-pointer outline-none">
                  <option value="latest">Latest</option>
                  <option value="popular">Popular</option>
                </select>
              </div>
            </div>
          </div>

          {isLoading && (
            <div className="flex flex-col gap-4 select-none">
              {[1, 2, 3].map(i => (
                <div key={i} className="rounded-2xl border bg-[#0b1626] border-slate-800 p-5 h-36 animate-pulse" />
              ))}
            </div>
          )}

          {isError && (
            <div className="rounded-2xl border p-12 text-center text-slate-550 bg-[#0b1626]" style={{ borderColor: "var(--color-border-strong)" }}>
              <i className="fas fa-triangle-exclamation text-3xl mb-3 text-red-500 animate-pulse"></i>
              <div className="text-xs font-black text-white">Failed to retrieve news feed</div>
              <p className="text-[10px] text-slate-550 mt-1">Please verify your internet connection and reload the page.</p>
            </div>
          )}

          {!isLoading && !isError && filtered.length === 0 && (
            <div className="rounded-2xl border p-12 text-center text-slate-550 bg-[#0b1626]" style={{ borderColor: "var(--color-border-strong)" }}>
              <i className="fas fa-folder-open text-3xl mb-3 text-slate-600"></i>
              <div className="text-xs font-black text-white">No articles matched your selections</div>
              <p className="text-[10px] text-slate-550 mt-1">Try disabling "Show beginner-friendly news only" to view advanced SEC filings.</p>
            </div>
          )}

          {/* Cards stacked vertically - Single column layout */}
          {!isLoading && !isError && filtered.length > 0 && (
            <div className="flex flex-col gap-4 select-none">
              {filtered.map(art => {
                const impact = getArticleImpact(art);
                const isSaved = savedArticles.includes(art.id);
                
                return (
                  <div
                    key={art.id}
                    className="rounded-2xl border flex bg-[#0b1626] border-slate-850 overflow-hidden text-left border-box hover:border-slate-700/80 transition-all flex-col md:flex-row items-stretch"
                  >
                    {/* Fallback graphic cover on the Left */}
                    <div className="w-full md:w-40 shrink-0 relative bg-slate-950 flex flex-col justify-center items-center border-b md:border-b-0 md:border-r border-slate-900 border-box">
                      <CategoryFallbackGraphic category={art.category} />
                    </div>

                    {/* Main Content Area */}
                    <div className="p-5 flex-1 flex flex-col md:flex-row justify-between gap-5 border-box">
                      
                      {/* Left Column: Article Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex gap-2 items-center mb-2.5 flex-wrap">
                          <span className="text-[9px] font-black uppercase text-blue-400 px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20">
                            {art.category}
                          </span>
                          <span className="text-[10px] font-semibold text-slate-450">{art.source}</span>
                          <span className="text-[10px] font-bold text-slate-550">• {timeAgo(art.publishedAt)}</span>
                        </div>

                        <h3 className="text-sm font-black text-white leading-snug mb-2">{art.title}</h3>
                        <p className="text-[11px] text-slate-400 leading-relaxed font-semibold mb-4">
                          {art.summary.substring(0, 160)}...
                        </p>

                        {/* tags */}
                        <div className="flex gap-2 flex-wrap">
                          {impact.tags.map((tag, idx) => (
                            <span key={idx} className="text-[9px] font-bold text-slate-400 px-2 py-0.5 rounded bg-[#101d31]/80 border border-slate-800">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Middle Column: Difficulty & Could Affect info columns */}
                      <div className="w-full md:w-48 flex flex-col justify-center border-t md:border-t-0 md:border-l md:border-r border-slate-900/60 md:px-5 py-4 md:py-0 select-none border-box">
                        <div className="flex justify-between items-center mb-2.5 text-[11px]">
                          <span className="text-slate-500 font-bold">Difficulty</span>
                          <span className={`font-black uppercase text-[10px] ${
                            impact.difficulty === "Easy" ? "text-green-400" :
                            impact.difficulty === "Medium" ? "text-amber-500" : "text-orange-500"
                          }`}>
                            {impact.difficulty}
                          </span>
                        </div>
                        <div className="flex justify-between items-center mb-3 text-[11px]">
                          <span className="text-slate-500 font-bold">Trade Impact</span>
                          <span className={`font-black uppercase text-[10px] ${
                            impact.tradeImpact === "Low" ? "text-green-400" :
                            impact.tradeImpact === "Medium" ? "text-amber-500" : "text-red-500"
                          }`}>
                            {impact.tradeImpact}
                          </span>
                        </div>
                        <div className="text-[11px] leading-relaxed">
                          <span className="text-slate-500 font-bold block mb-1">Could Affect</span>
                          <span className="text-slate-300 font-black truncate block">{impact.couldAffect}</span>
                        </div>
                      </div>

                      {/* Right Column: Actions and Bookmark toggle */}
                      <div className="w-full md:w-44 flex flex-col justify-center gap-2 shrink-0 select-none border-t md:border-t-0 border-slate-900/60 pt-4 md:pt-0 border-box">
                        <button
                          onClick={() => setExplainingArticle(art)}
                          className="h-8.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer border-none shadow-[0_0_12px_rgba(59,130,246,0.15)]"
                        >
                          <i className="fas fa-brain text-[9px]"></i>
                          Explain This News
                        </button>
                        <button
                          onClick={() => setLocation("/markets")}
                          className="h-8.5 rounded-lg bg-slate-900 border border-slate-800 text-[10px] font-black uppercase text-slate-300 hover:text-white cursor-pointer transition-all"
                        >
                          <i className="fas fa-chart-line text-[9px] mr-1 opacity-75"></i>
                          Find Trade Ideas
                        </button>
                        <div className="flex items-center gap-2">
                          {art.articleUrl && (
                            <a
                              href={art.articleUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-1 h-8 rounded-lg bg-slate-950 border border-slate-900 text-[9px] font-black uppercase text-slate-450 hover:text-slate-350 cursor-pointer flex items-center justify-center gap-1 text-center decoration-none border-box transition-all"
                            >
                              Read Full Article
                              <i className="fas fa-arrow-up-right-from-square text-[8px]"></i>
                            </a>
                          )}
                          <button
                            onClick={() => handleSaveArticle(art.id)}
                            className="w-8 h-8 rounded-lg border border-slate-900 bg-slate-950 text-slate-450 hover:text-blue-400 flex items-center justify-center cursor-pointer transition-all border-box shrink-0"
                          >
                            <i className={`${isSaved ? "fas text-blue-500" : "far"} fa-bookmark text-xs`}></i>
                          </button>
                        </div>
                      </div>

                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* ─── Explain This News Modal Drawer ─── */}
      {explainingArticle && explainingImpact && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center p-4 z-[999] animate-fade-in select-none text-left">
          <div className="w-full max-w-md rounded-2xl border p-6 relative bg-[#0b1624] border-blue-500/35 border-box">
            <button
              onClick={() => setExplainingArticle(null)}
              className="absolute top-4 right-4 text-slate-550 hover:text-white text-sm outline-none cursor-pointer border-none bg-transparent"
            >
              <i className="fas fa-times"></i>
            </button>

            <h3 className="text-base font-black text-white flex items-center gap-2 mb-1">
              <i className="fas fa-brain text-blue-400 animate-pulse"></i>
              Explain This News
            </h3>
            <p className="text-[10px] text-slate-550 font-bold mb-4 uppercase">
              Plain-English trading analysis for beginners
            </p>

            <div className="flex flex-col gap-4 overflow-y-auto max-h-[70vh] pr-1 select-none border-box">
              {/* Section 1 */}
              <div>
                <h4 className="text-[10px] text-slate-500 font-black uppercase tracking-wider mb-1">What Happened?</h4>
                <p className="text-xs text-slate-300 font-semibold leading-relaxed">
                  {explainingArticle.title}. {explainingArticle.summary}
                </p>
              </div>

              {/* Section 2 */}
              <div>
                <h4 className="text-[10px] text-slate-500 font-black uppercase tracking-wider mb-1">Why it matters</h4>
                <p className="text-xs text-slate-300 font-semibold leading-relaxed">
                  {explainingImpact.whyItMatters} {explainingImpact.plainEnglishExplanation}
                </p>
              </div>

              {/* Section 3 */}
              <div>
                <h4 className="text-[10px] text-slate-500 font-black uppercase tracking-wider mb-1">Possible Trade Impact</h4>
                <div className="rounded-xl bg-[#101d31]/50 border border-slate-900 p-3 flex flex-col gap-2 border-box">
                  {explainingImpact.couldHelp && (
                    <div className="text-xs">
                      🟢 <strong className="text-green-400">Could help:</strong> <span className="text-slate-300 font-semibold">{explainingImpact.couldHelp}</span>
                    </div>
                  )}
                  {explainingImpact.couldHurt && (
                    <div className="text-xs">
                      🔴 <strong className="text-red-400">Could hurt:</strong> <span className="text-slate-300 font-semibold">{explainingImpact.couldHurt}</span>
                    </div>
                  )}
                  <div className="text-xs">
                    📊 <strong className="text-white">Could affect:</strong> <span className="text-slate-300 font-semibold">{explainingImpact.couldAffect}</span>
                  </div>
                </div>
              </div>

              {/* Section 4 */}
              <div className="bg-red-500/5 border border-red-500/20 p-3 rounded-lg text-[10px] text-red-400 font-bold leading-normal border-box">
                ⚠️ <strong className="text-white block mb-0.5">Risk Reminder:</strong> News can move asset prices quickly. Trade outcomes are never guaranteed, even with strong news convergence. Always use safety stop losses.
              </div>
            </div>

            <div className="flex flex-col gap-2 mt-6">
              <button
                onClick={() => {
                  setExplainingArticle(null);
                  setLocation("/markets");
                }}
                className="h-10 w-full rounded-xl bg-blue-600 hover:bg-blue-750 text-white text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer border-none"
              >
                Show Related Practice Trades
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const match = explainingArticle.title.match(/[A-Z]{2,4}/);
                    const ticker = match ? match[0] : "SPY";
                    handleAddToWatchlist(ticker);
                    setExplainingArticle(null);
                  }}
                  className="flex-1 h-10 rounded-xl bg-slate-900 border border-slate-800 text-[10px] font-black uppercase text-slate-300 hover:text-white cursor-pointer transition-all"
                >
                  Add to Watchlist
                </button>
                {explainingArticle.articleUrl && (
                  <a
                    href={explainingArticle.articleUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 h-10 rounded-xl bg-slate-950 border border-slate-900 text-[10px] font-black uppercase text-slate-450 hover:text-slate-350 cursor-pointer flex items-center justify-center gap-1.5 text-center decoration-none border-box transition-all"
                  >
                    Full Article
                    <i className="fas fa-arrow-up-right-from-square text-[9px]"></i>
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
