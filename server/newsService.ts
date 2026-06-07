import Parser from "rss-parser";

const parser = new Parser({
  customFields: {
    item: [
      ["media:content", "mediaContent", { keepArray: false }],
      ["media:thumbnail", "mediaThumbnail", { keepArray: false }],
      ["enclosure", "enclosure", { keepArray: false }],
    ],
  },
});

export interface NewsArticle {
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

const FALLBACK_IMAGES: Record<string, string> = {
  stocks: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=600&q=80",
  crypto: "https://images.unsplash.com/photo-1518546305927-5a555bb7020d?w=600&q=80",
  forex: "https://images.unsplash.com/photo-1607944024060-0450380ddd33?w=600&q=80",
  commodities: "https://images.unsplash.com/photo-1516937941344-00b4e0337589?w=600&q=80",
  options: "https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=600&q=80",
};

const AFFECTS: Record<string, string> = {
  stocks: "Monitor key support/resistance levels before entering positions. Use defined risk with stop-loss orders.",
  crypto: "Crypto moves fast — size positions conservatively and consider wider stops due to high volatility.",
  forex: "Watch central bank commentary closely. Carry trades may shift on rate differentials.",
  commodities: "Supply/demand shocks can create rapid moves. Consider futures contracts for directional plays.",
  options: "Elevated implied volatility creates richer premiums for option sellers. Review Greeks before entry.",
};

const FEED_CONFIG: { url: string; source: string; category: string }[] = [
  { url: "https://finance.yahoo.com/news/rssindex", source: "Yahoo Finance", category: "stocks" },
  { url: "https://www.investing.com/rss/news_25.rss", source: "Investing.com", category: "stocks" },
  { url: "https://cointelegraph.com/rss", source: "CoinTelegraph", category: "crypto" },
  { url: "https://decrypt.co/feed", source: "Decrypt", category: "crypto" },
  { url: "https://www.investing.com/rss/news_301.rss", source: "Investing.com FX", category: "forex" },
  { url: "https://www.forexlive.com/feed/news", source: "ForexLive", category: "forex" },
  { url: "https://oilprice.com/rss/main", source: "OilPrice", category: "commodities" },
  { url: "https://www.investing.com/rss/news_11.rss", source: "Investing.com", category: "commodities" },
  { url: "https://feeds.reuters.com/reuters/businessNews", source: "Reuters", category: "options" },
  { url: "https://www.investing.com/rss/news.rss", source: "Investing.com", category: "options" },
];

function getDomain(url: string): string {
  try { return new URL(url).hostname.replace("www.", ""); } catch { return ""; }
}

function stripHtml(html: string): string {
  return (html || "").replace(/<[^>]*>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ").replace(/&#\d+;/g, "").trim();
}

function extractImage(item: any): string | null {
  // media:content
  if (item.mediaContent) {
    const mc = item.mediaContent;
    const url = mc.$ ? mc.$.url : mc.url;
    if (url && url.startsWith("http")) return url;
  }
  // media:thumbnail
  if (item.mediaThumbnail) {
    const mt = item.mediaThumbnail;
    const url = mt.$ ? mt.$.url : mt.url;
    if (url && url.startsWith("http")) return url;
  }
  // enclosure
  if (item.enclosure) {
    const enc = item.enclosure;
    const url = enc.$ ? enc.$.url : enc.url;
    if (url && (url.includes(".jpg") || url.includes(".png") || url.includes(".webp") || url.includes(".jpeg"))) return url;
  }
  // scan content for first img
  const content = item["content:encoded"] || item.content || item.description || "";
  const imgMatch = content.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (imgMatch) return imgMatch[1];
  return null;
}

function timeAgo(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "recently";
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// In-memory cache
let cache: NewsArticle[] = [];
let lastRefresh = 0;

async function fetchFeed(config: { url: string; source: string; category: string }): Promise<NewsArticle[]> {
  try {
    const feed = await parser.parseURL(config.url);
    const items = (feed.items || []).slice(0, 12);
    return items.map((item, i) => {
      const rawImage = extractImage(item);
      const imageUrl = rawImage || FALLBACK_IMAGES[config.category] || FALLBACK_IMAGES.options;
      const rawSummary = item.contentSnippet || item.description || item.title || "";
      const summary = stripHtml(rawSummary).slice(0, 160);
      const link = item.link || item.guid || "";
      const domain = getDomain(config.url);
      return {
        id: `${config.category}-${config.source}-${i}-${Date.now()}`,
        title: stripHtml(item.title || ""),
        summary,
        source: config.source,
        sourceDomain: domain,
        category: config.category,
        imageUrl,
        articleUrl: link,
        publishedAt: item.pubDate || item.isoDate || new Date().toISOString(),
        affect: AFFECTS[config.category] || AFFECTS.options,
      };
    });
  } catch (err: any) {
    console.error(`[news] Failed to fetch ${config.url}: ${err.message}`);
    return [];
  }
}

async function refreshAll() {
  console.log("[news] Refreshing all RSS feeds...");
  const results = await Promise.all(FEED_CONFIG.map(fetchFeed));
  cache = results.flat().sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
  lastRefresh = Date.now();
  console.log(`[news] Cache updated: ${cache.length} articles`);
}

export function startNewsService() {
  refreshAll();
  setInterval(refreshAll, 30 * 60 * 1000);
}

export function getNews(category: string): NewsArticle[] {
  const articles = category === "all"
    ? cache
    : cache.filter(a => a.category === category);
  // Deduplicate by title
  const seen = new Set<string>();
  const deduped = articles.filter(a => {
    const key = a.title.slice(0, 60).toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return deduped.slice(0, 20);
}

export function isCacheReady() {
  return cache.length > 0;
}
