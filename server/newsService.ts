import { XMLParser } from 'fast-xml-parser';
import fetch, { Response } from 'node-fetch';

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
  content?: string;
  image?: string;
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
    url: 'https://feeds.content.dowjones.io/public/rss/mw_realtimeheadlines',
    favicon: 'https://www.marketwatch.com/favicon.ico'
  },
  {
    name: 'Yahoo Finance',
    url: 'https://feeds.finance.yahoo.com/rss/2.0/headline',
    favicon: 'https://finance.yahoo.com/favicon.ico'
  },
  {
    name: 'Commodity News',
    url: 'https://www.cnbc.com/id/19832390/device/rss/rss.html',
    favicon: 'https://www.cnbc.com/favicon.ico'
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
  
  // Futures symbols - expanded list
  const futuresPattern = /\b(ES|NQ|YM|RTY|GC|SI|CL|NG|ZB|ZN|ZC|ZS|ZW|ZL|ZM|KC|CC|CT|SB|LBS|HE|LE|PA|PL|HG|ZA|QG|QM)\b/g;
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
  
  // Futures keywords - expanded list
  if (/\b(futures?|commodities?|commodity|oil|gold|silver|copper|corn|wheat|soybeans?|natural gas|crude|wti|brent|cme|nymex|cbot|ice|energy|metals?|agriculture|agricultural|grains?|livestock|cattle|hogs?|coffee|sugar|cocoa|cotton|lumber|gasoline|heating oil|propane|ethanol|platinum|palladium|zinc|lead|nickel|aluminum|steel|iron ore)\b/.test(text)) {
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
      }
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
      
      // Debug logging for futures categorization
      if (category === 'futures') {
        console.log(`Futures article found: "${title}" - Category: ${category}`);
      }
      
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

// Extract main image from article HTML
export function extractMainImage(html: string): string | null {
  try {
    // Common patterns for article images
    const imagePatterns = [
      // Open Graph image
      /<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i,
      // Twitter card image
      /<meta[^>]*name=["']twitter:image["'][^>]*content=["']([^"']+)["']/i,
      // Article images with specific classes
      /<img[^>]*class=["'][^"']*(?:article|hero|featured|main)[^"']*["'][^>]*src=["']([^"']+)["']/i,
      // First img tag in article content
      /<article[^>]*>[\s\S]*?<img[^>]*src=["']([^"']+)["']/i,
      // Any img with reasonable size attributes
      /<img[^>]*(?:width=["'][4-9]\d{2,}["']|height=["'][3-9]\d{2,}["'])[^>]*src=["']([^"']+)["']/i,
      // Fallback to first reasonable img tag
      /<img[^>]*src=["']([^"']+\.(?:jpg|jpeg|png|webp)[^"']*)["']/i
    ];

    for (const pattern of imagePatterns) {
      const match = html.match(pattern);
      if (match && match[1]) {
        let imageUrl = match[1];
        
        // Skip tiny images, icons, and ads
        if (imageUrl.includes('icon') || 
            imageUrl.includes('logo') || 
            imageUrl.includes('avatar') ||
            imageUrl.includes('advertisement') ||
            imageUrl.includes('tracking') ||
            imageUrl.match(/\d+x\d+/) && parseInt(imageUrl.match(/(\d+)x\d+/)?.[1] || '0') < 200) {
          continue;
        }
        
        // Convert relative URLs to absolute
        if (imageUrl.startsWith('//')) {
          imageUrl = 'https:' + imageUrl;
        } else if (imageUrl.startsWith('/')) {
          const urlMatch = html.match(/<meta[^>]*property=["']og:url["'][^>]*content=["']([^"']+)["']/i);
          if (urlMatch) {
            const baseUrl = new URL(urlMatch[1]).origin;
            imageUrl = baseUrl + imageUrl;
          }
        }
        
        return imageUrl;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error extracting image:', error);
    return null;
  }
}

// Fetch article content and image
export async function fetchArticleContent(url: string): Promise<{ content: string; image?: string }> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const html = await response.text();
    
    // Extract main image first
    const image = extractMainImage(html);
    
    // Basic HTML content extraction - remove scripts, styles, and extract main content
    let content = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<head[^>]*>[\s\S]*?<\/head>/gi, '')
      .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
      .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
      .replace(/<aside[^>]*>[\s\S]*?<\/aside>/gi, '')
      .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '');
    
    // Try to extract main content areas
    const contentPatterns = [
      /<article[^>]*>([\s\S]*?)<\/article>/gi,
      /<main[^>]*>([\s\S]*?)<\/main>/gi,
      /<div[^>]*class[^>]*article[^>]*>([\s\S]*?)<\/div>/gi,
      /<div[^>]*class[^>]*content[^>]*>([\s\S]*?)<\/div>/gi,
      /<div[^>]*class[^>]*story[^>]*>([\s\S]*?)<\/div>/gi
    ];
    
    for (const pattern of contentPatterns) {
      const match = content.match(pattern);
      if (match && match[1] && match[1].length > 500) {
        content = match[1];
        break;
      }
    }
    
    // Clean up the content
    content = content
      .replace(/<(?!\/?(p|br|h[1-6]|ul|ol|li|blockquote|strong|em|a|img)\b)[^>]*>/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
    
    return {
      content: content || 'Content could not be extracted from this article.',
      image: image || undefined
    };
    
  } catch (error) {
    console.error('Error fetching article content:', error);
    return {
      content: 'Unable to load article content.'
    };
  }
}