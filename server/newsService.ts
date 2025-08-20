import { XMLParser } from 'fast-xml-parser';
const fetch = require('node-fetch');

export interface NewsArticle {
  id: string;
  title: string;
  summary: string;
  url: string;
  source: string;
  sourceFavicon: string;
  publishedAt: string;
  category: string;
  sentiment?: 'positive' | 'negative' | 'neutral';
  tickers: string[];
}

interface RSSItem {
  title: string;
  description?: string;
  link: string;
  pubDate?: string;
  'dc:date'?: string;
  guid?: string | { '#text': string };
}

interface RSSFeed {
  rss?: {
    channel: {
      item: RSSItem | RSSItem[];
    };
  };
  feed?: {
    entry: RSSItem | RSSItem[];
  };
}

// Cache for storing fetched news
const newsCache = new Map<string, { data: NewsArticle[]; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// RSS feed sources
const RSS_SOURCES = [
  {
    name: 'Reuters Business',
    url: 'https://feeds.reuters.com/reuters/businessNews',
    favicon: 'https://www.reuters.com/favicon.ico'
  },
  {
    name: 'CNBC Markets',
    url: 'https://www.cnbc.com/id/100003114/device/rss/rss.html',
    favicon: 'https://www.cnbc.com/favicon.ico'
  },
  {
    name: 'MarketWatch',
    url: 'https://feeds.marketwatch.com/marketwatch/realtimeheadlines/',
    favicon: 'https://www.marketwatch.com/favicon.ico'
  },
  {
    name: 'Yahoo Finance',
    url: 'https://feeds.finance.yahoo.com/rss/2.0/headline',
    favicon: 'https://finance.yahoo.com/favicon.ico'
  }
];

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text'
});

// Extract tickers from text using regex patterns
function extractTickers(text: string): string[] {
  const tickers = new Set<string>();
  
  // Stock symbols (3-4 uppercase letters)
  const stockPattern = /\b[A-Z]{3,4}\b/g;
  const stockMatches = text.match(stockPattern) || [];
  
  // Forex pairs (XXX/YYY format)
  const forexPattern = /\b[A-Z]{3}\/[A-Z]{3}\b/g;
  const forexMatches = text.match(forexPattern) || [];
  
  // Crypto symbols
  const cryptoPattern = /\b(BTC|ETH|XRP|ADA|DOT|SOL|AVAX|MATIC|LINK|UNI)\b/g;
  const cryptoMatches = text.match(cryptoPattern) || [];
  
  // Futures symbols
  const futuresPattern = /\b(ES|NQ|YM|RTY|GC|SI|CL|NG|ZB|ZN)\b/g;
  const futuresMatches = text.match(futuresPattern) || [];
  
  [...stockMatches, ...forexMatches, ...cryptoMatches, ...futuresMatches].forEach(ticker => {
    // Filter out common false positives
    if (!['THE', 'AND', 'FOR', 'ARE', 'BUT', 'NOT', 'YOU', 'ALL', 'CAN', 'HER', 'WAS', 'ONE', 'OUR', 'HAD', 'BUT', 'HAS', 'HIS', 'NEW', 'NOW', 'OLD', 'SEE', 'TWO', 'WHO', 'BOY', 'DID', 'ITS', 'LET', 'PUT', 'SAY', 'SHE', 'TOO', 'USE'].includes(ticker)) {
      tickers.add(ticker);
    }
  });
  
  return Array.from(tickers).slice(0, 5); // Limit to 5 tickers
}

// Categorize article based on content
function categorizeArticle(title: string, description: string): string {
  const text = `${title} ${description}`.toLowerCase();
  
  // Futures keywords
  if (/\b(futures?|commodities?|oil|gold|silver|copper|corn|wheat|soybeans?|natural gas|crude|wti|brent|cme|nymex|cbot|ice)\b/.test(text)) {
    return 'futures';
  }
  
  // Forex keywords
  if (/\b(forex|fx|currency|currencies|dollar|euro|yen|pound|usd|eur|gbp|jpy|exchange rate|central bank|fed|ecb|boe|boj)\b/.test(text)) {
    return 'forex';
  }
  
  // Crypto keywords
  if (/\b(crypto|cryptocurrency|bitcoin|ethereum|btc|eth|blockchain|defi|nft|altcoin|coinbase|binance|mining)\b/.test(text)) {
    return 'crypto';
  }
  
  // Education keywords
  if (/\b(education|tutorial|guide|learn|how to|basics|beginner|course|training|strategy|analysis|tips)\b/.test(text)) {
    return 'education';
  }
  
  // Default to stocks
  return 'stocks';
}

// Simple sentiment analysis
function analyzeSentiment(title: string, description: string): 'positive' | 'negative' | 'neutral' {
  const text = `${title} ${description}`.toLowerCase();
  
  const positiveWords = ['gains', 'rises', 'up', 'surge', 'rally', 'bullish', 'growth', 'strong', 'beats', 'outperforms', 'soars', 'jumps'];
  const negativeWords = ['falls', 'drops', 'down', 'crash', 'plunge', 'bearish', 'weak', 'misses', 'underperforms', 'tumbles', 'slides'];
  
  const positiveCount = positiveWords.filter(word => text.includes(word)).length;
  const negativeCount = negativeWords.filter(word => text.includes(word)).length;
  
  if (positiveCount > negativeCount) return 'positive';
  if (negativeCount > positiveCount) return 'negative';
  return 'neutral';
}

// Parse RSS feed
async function parseRSSFeed(source: { name: string; url: string; favicon: string }): Promise<NewsArticle[]> {
  try {
    const response = await fetch(source.url, {
      headers: {
        'User-Agent': 'Trading News Aggregator/1.0'
      },
      timeout: 10000
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const xmlText = await response.text();
    const parsed: RSSFeed = xmlParser.parse(xmlText);
    
    let items: RSSItem[] = [];
    
    if (parsed.rss?.channel?.item) {
      items = Array.isArray(parsed.rss.channel.item) ? parsed.rss.channel.item : [parsed.rss.channel.item];
    } else if (parsed.feed?.entry) {
      items = Array.isArray(parsed.feed.entry) ? parsed.feed.entry : [parsed.feed.entry];
    }
    
    return items.map((item, index): NewsArticle => {
      const title = item.title || '';
      const description = item.description || '';
      const link = item.link || '';
      const pubDate = item.pubDate || item['dc:date'] || new Date().toISOString();
      
      // Generate unique ID
      const id = `${source.name}-${Date.now()}-${index}`;
      
      const category = categorizeArticle(title, description);
      const tickers = extractTickers(`${title} ${description}`);
      const sentiment = analyzeSentiment(title, description);
      
      return {
        id,
        title,
        summary: description.replace(/<[^>]*>/g, '').substring(0, 200) + '...',
        url: link,
        source: source.name,
        sourceFavicon: source.favicon,
        publishedAt: new Date(pubDate).toISOString(),
        category,
        sentiment,
        tickers
      };
    }).filter(article => article.title && article.url);
    
  } catch (error) {
    console.error(`Error fetching ${source.name}:`, error);
    return [];
  }
}

// Fetch all news articles
export async function fetchAllNews(): Promise<NewsArticle[]> {
  const cacheKey = 'all-news';
  const cached = newsCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }
  
  console.log('Fetching fresh news data...');
  
  const allArticles: NewsArticle[] = [];
  
  // Fetch from all RSS sources in parallel
  const rssPromises = RSS_SOURCES.map(source => parseRSSFeed(source));
  const rssResults = await Promise.allSettled(rssPromises);
  
  rssResults.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      allArticles.push(...result.value);
    } else {
      console.error(`Failed to fetch from ${RSS_SOURCES[index].name}:`, result.reason);
    }
  });
  
  // Remove duplicates based on URL or similar titles
  const uniqueArticles = allArticles.filter((article, index, self) => {
    return self.findIndex(a => 
      a.url === article.url || 
      (a.title.toLowerCase().trim() === article.title.toLowerCase().trim() && a.source !== article.source)
    ) === index;
  });
  
  // Sort by publication date (newest first)
  uniqueArticles.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
  
  // Cache the results
  newsCache.set(cacheKey, {
    data: uniqueArticles,
    timestamp: Date.now()
  });
  
  console.log(`Fetched ${uniqueArticles.length} unique articles from ${RSS_SOURCES.length} sources`);
  
  return uniqueArticles;
}

// Filter articles by criteria
export function filterArticles(
  articles: NewsArticle[],
  category?: string,
  sources?: string[],
  since?: string,
  search?: string
): NewsArticle[] {
  let filtered = [...articles];
  
  // Filter by category
  if (category && category !== 'all') {
    filtered = filtered.filter(article => article.category === category);
  }
  
  // Filter by sources
  if (sources && sources.length > 0) {
    filtered = filtered.filter(article => sources.includes(article.source));
  }
  
  // Filter by time range
  if (since) {
    const now = new Date();
    let cutoffTime: Date;
    
    switch (since) {
      case '1h':
        cutoffTime = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case '24h':
        cutoffTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        cutoffTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      default:
        cutoffTime = new Date(0);
    }
    
    filtered = filtered.filter(article => new Date(article.publishedAt) >= cutoffTime);
  }
  
  // Filter by search query
  if (search && search.trim()) {
    const searchTerms = search.toLowerCase().trim().split(' ');
    filtered = filtered.filter(article => {
      const searchText = `${article.title} ${article.summary}`.toLowerCase();
      return searchTerms.some(term => searchText.includes(term));
    });
  }
  
  return filtered;
}

// Get available sources
export function getAvailableSources(): string[] {
  return RSS_SOURCES.map(source => source.name);
}