import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";

const TABS = ["all", "stocks", "crypto", "forex", "commodities", "options"];

const CATEGORY_ICONS: Record<string, string> = {
  stocks: "📈", crypto: "₿", forex: "💱", commodities: "🪙", options: "📊", all: "📰",
};

const FALLBACK_IMAGES: Record<string, string> = {
  stocks: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=600&q=80",
  crypto: "https://images.unsplash.com/photo-1518546305927-5a555bb7020d?w=600&q=80",
  forex: "https://images.unsplash.com/photo-1607944024060-0450380ddd33?w=600&q=80",
  commodities: "https://images.unsplash.com/photo-1516937941344-00b4e0337589?w=600&q=80",
  options: "https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=600&q=80",
};

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
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function SkeletonCard() {
  return (
    <div className="rounded-2xl overflow-hidden animate-pulse" style={{ background: "#1a2332", border: "1px solid var(--color-border)" }}>
      <div style={{ height: 180, background: "#243044" }} />
      <div className="p-4 flex flex-col gap-3">
        <div className="flex gap-2">
          <div className="rounded-full h-4 w-16" style={{ background: "#243044" }} />
          <div className="rounded-full h-4 w-20" style={{ background: "#243044" }} />
        </div>
        <div className="rounded h-4 w-full" style={{ background: "#243044" }} />
        <div className="rounded h-4 w-4/5" style={{ background: "#243044" }} />
        <div className="rounded h-3 w-full" style={{ background: "#1e293b" }} />
        <div className="rounded h-3 w-3/4" style={{ background: "#1e293b" }} />
      </div>
    </div>
  );
}

function ArticleImage({ src, category }: { src: string; category: string }) {
  const [errored, setErrored] = useState(false);
  const fallback = FALLBACK_IMAGES[category] || FALLBACK_IMAGES.options;
  const icon = CATEGORY_ICONS[category] || "📰";

  if (errored) {
    return (
      <div className="flex items-center justify-center text-5xl"
        style={{ height: 180, background: "linear-gradient(135deg,#1a2332,#243044)", borderRadius: "12px 12px 0 0" }}>
        {icon}
      </div>
    );
  }

  return (
    <img
      src={errored ? fallback : src}
      alt=""
      onError={() => setErrored(true)}
      style={{ width: "100%", height: 180, objectFit: "cover", display: "block", borderRadius: "12px 12px 0 0" }}
    />
  );
}

function LiveVideoSection() {
  const [hidden, setHidden] = useState(() => localStorage.getItem("news-video-hidden") === "true");
  const { time, isOpen } = useETTime();

  const toggle = () => {
    const next = !hidden;
    setHidden(next);
    localStorage.setItem("news-video-hidden", String(next));
  };

  return (
    <div className="mb-6 rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(239,68,68,0.25)", background: "#1a2332" }}>
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: hidden ? "none" : "1px solid rgba(239,68,68,0.15)", background: "rgba(239,68,68,0.05)" }}>
        <div className="flex items-center gap-3 flex-wrap">
          <span className="font-bold text-sm" style={{ color: "#e2e8f0" }}>📺 Yahoo Finance Live — 24/7 Market Coverage</span>
          <span className="flex items-center gap-1.5 text-[10px] font-black px-2 py-0.5 rounded-full"
            style={{ background: "rgba(239,68,68,0.2)", color: "var(--color-red)", border: "1px solid rgba(239,68,68,0.4)" }}>
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse inline-block" />
            LIVE
          </span>
          {time && (
            <span className="flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-0.5 rounded-full"
              style={{ background: isOpen ? "rgba(34,197,94,0.12)" : "rgba(100,116,139,0.12)", color: isOpen ? "#22c55e" : "#94a3b8", border: `1px solid ${isOpen ? "rgba(34,197,94,0.3)" : "rgba(100,116,139,0.2)"}` }}>
              <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: isOpen ? "#22c55e" : "#64748b" }} />
              US Markets {isOpen ? "Open" : "Closed"}
            </span>
          )}
          {time && <span className="text-[10px] font-mono" style={{ color: "var(--color-muted)" }}>{time}</span>}
        </div>
        <button onClick={toggle}
          className="flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ml-2"
          style={{ background: "rgba(59,130,246,0.12)", color: "#60a5fa", border: "1px solid rgba(59,130,246,0.25)" }}>
          {hidden ? "▶ Show Video" : "▼ Hide Video"}
        </button>
      </div>
      {!hidden && (
        <iframe
          src="https://www.youtube.com/embed/KQp-e_XQnDE?autoplay=1&mute=1"
          title="Yahoo Finance Live 24/7"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowFullScreen
          style={{ width: "100%", height: 400, display: "block", border: "none" }}
        />
      )}
    </div>
  );
}

export default function NewsPage() {
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data: articles, isLoading, isError } = useQuery<NewsArticle[]>({
    queryKey: ["/api/news", activeTab],
    queryFn: () => fetch(`/api/news?category=${activeTab}`).then(r => r.json()),
    staleTime: 5 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000,
  });

  const filtered = (articles ?? []).filter(n =>
    !search || n.title.toLowerCase().includes(search.toLowerCase()) || n.summary.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page-container lg:pb-8 min-h-screen" style={{ background: "#0d1117" }}>
      <div className="px-4 lg:px-8 pt-6 max-w-none">
        <h1 className="text-xl font-black mb-4">📰 Market News</h1>

        <LiveVideoSection />

        {/* Search */}
        <div className="mb-4">
          <input type="text" placeholder="Search news..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full rounded-xl px-4 py-2.5 text-sm outline-none"
            style={{ background: "#1a2332", border: "1px solid var(--color-border)", color: "#e2e8f0" }} />
        </div>

        {/* Category tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-6 -mx-4 px-4 lg:mx-0 lg:px-0" style={{ scrollbarWidth: "none" }}>
          {TABS.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className="flex-shrink-0 px-4 py-2 rounded-2xl text-sm font-semibold capitalize transition-all"
              style={{ background: activeTab === tab ? "#3b82f622" : "#1a2332", color: activeTab === tab ? "#60a5fa" : "#64748b", border: `2px solid ${activeTab === tab ? "#3b82f6" : "#243044"}` }}>
              {CATEGORY_ICONS[tab]} {tab}
            </button>
          ))}
        </div>

        {/* Loading skeletons */}
        {isLoading && (
          <div className="grid md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(i => <SkeletonCard key={i} />)}
          </div>
        )}

        {/* Error state */}
        {isError && !isLoading && (
          <div className="text-center py-12 glass-card">
            <div className="text-4xl mb-3">⚠️</div>
            <div className="font-semibold mb-1" style={{ color: "#e2e8f0" }}>Unable to load news</div>
            <div className="text-sm" style={{ color: "var(--color-muted)" }}>Check your connection and try again</div>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !isError && filtered.length === 0 && (
          <div className="text-center py-12">
            <div className="text-4xl mb-3">📭</div>
            <div className="font-semibold" style={{ color: "var(--color-muted)" }}>No articles found</div>
          </div>
        )}

        {/* Articles grid */}
        {!isLoading && !isError && filtered.length > 0 && (
          <div className="grid md:grid-cols-2 gap-4">
            {filtered.map(n => (
              <div key={n.id} className="rounded-2xl overflow-hidden flex flex-col"
                style={{ background: "#1a2332", border: "1px solid var(--color-border)" }}>
                {/* Cover image */}
                <ArticleImage src={n.imageUrl} category={n.category} />

                <div className="p-4 flex flex-col flex-1">
                  {/* Meta row */}
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    {/* Favicon + source */}
                    <span className="flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{ background: "#243044", color: "var(--color-text-soft)" }}>
                      {n.sourceDomain && (
                        <img src={`https://www.google.com/s2/favicons?domain=${n.sourceDomain}&sz=16`}
                          alt="" width={12} height={12} style={{ borderRadius: 2 }}
                          onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                      )}
                      {n.source}
                    </span>
                    {/* Category badge */}
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full capitalize"
                      style={{ background: "rgba(59,130,246,0.15)", color: "#60a5fa", border: "1px solid rgba(59,130,246,0.3)" }}>
                      {CATEGORY_ICONS[n.category]} {n.category}
                    </span>
                    {/* Time */}
                    <span className="text-[10px]" style={{ color: "var(--color-muted)" }}>{timeAgo(n.publishedAt)}</span>
                  </div>

                  {/* Title */}
                  <div className="text-sm font-bold leading-snug mb-2" style={{ color: "#e2e8f0" }}>
                    {n.title}
                  </div>

                  {/* Summary — 2 lines max */}
                  <div className="text-xs leading-relaxed mb-3" style={{ color: "var(--color-text-soft)", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                    {n.summary}
                  </div>

                  {/* Spacer */}
                  <div className="flex-1" />

                  {/* How this affects my trades */}
                  <button onClick={() => setExpanded(expanded === n.id ? null : n.id)}
                    className="mt-1 text-xs font-semibold flex items-center gap-1 mb-1" style={{ color: "#f59e0b" }}>
                    💡 How this affects my trades {expanded === n.id ? "▲" : "▼"}
                  </button>
                  {expanded === n.id && (
                    <div className="mb-3 rounded-xl p-3 text-xs leading-relaxed"
                      style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", color: "#fbbf24" }}>
                      {n.affect}
                    </div>
                  )}

                  {/* Read full article */}
                  {n.articleUrl && (
                    <a href={n.articleUrl} target="_blank" rel="noopener noreferrer"
                      className="flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all"
                      style={{ background: "rgba(59,130,246,0.1)", color: "#60a5fa", border: "1px solid rgba(59,130,246,0.25)" }}>
                      Read Full Article →
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
