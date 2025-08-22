import { useState, useEffect, useRef } from 'react';
import { Search, RefreshCw, Bookmark, Clock, ExternalLink, Filter, X, Star, ArrowLeft } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Link } from 'wouter';

interface NewsArticle {
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
  image?: string;
}

interface NewsResponse {
  articles: NewsArticle[];
  sources: string[];
  lastUpdated: string;
}

type Category = 'all' | 'stocks' | 'futures' | 'forex' | 'crypto' | 'education';
type TimeRange = '1h' | '24h' | '7d';
type AutoRefresh = 'off' | '1m' | '5m' | '15m';

export default function NewsPage() {
  const [selectedCategory, setSelectedCategory] = useState<Category>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [timeRange, setTimeRange] = useState<TimeRange>('7d');
  const [autoRefresh, setAutoRefresh] = useState<AutoRefresh>('off');
  const [showFilters, setShowFilters] = useState(false);
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [bookmarkedArticles, setBookmarkedArticles] = useState<string[]>([]);
  const [readLaterArticles, setReadLaterArticles] = useState<string[]>([]);
  const [selectedArticle, setSelectedArticle] = useState<NewsArticle | null>(null);
  const [articleContent, setArticleContent] = useState<string>('');
  const [loadingContent, setLoadingContent] = useState(false);
  const [articlesWithImages, setArticlesWithImages] = useState<Record<string, string>>({});
  
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load saved preferences
  useEffect(() => {
    const savedCategory = localStorage.getItem('news-category') as Category;
    const savedSources = JSON.parse(localStorage.getItem('news-sources') || '[]');
    const savedTimeRange = localStorage.getItem('news-timerange') as TimeRange;
    const savedAutoRefresh = localStorage.getItem('news-autorefresh') as AutoRefresh;
    const savedBookmarks = JSON.parse(localStorage.getItem('news-bookmarks') || '[]');
    const savedReadLater = JSON.parse(localStorage.getItem('news-readlater') || '[]');

    if (savedCategory) setSelectedCategory(savedCategory);
    if (savedSources.length) setSelectedSources(savedSources);
    // Default to 7d if no saved preference or if saved as 24h (for better futures/crypto coverage)
    if (savedTimeRange && savedTimeRange !== '24h') {
      setTimeRange(savedTimeRange);
    } else {
      setTimeRange('7d');
      localStorage.setItem('news-timerange', '7d');
    }
    if (savedAutoRefresh) setAutoRefresh(savedAutoRefresh);
    setBookmarkedArticles(savedBookmarks);
    setReadLaterArticles(savedReadLater);
  }, []);

  // Save preferences
  useEffect(() => {
    localStorage.setItem('news-category', selectedCategory);
    localStorage.setItem('news-sources', JSON.stringify(selectedSources));
    localStorage.setItem('news-timerange', timeRange);
    localStorage.setItem('news-autorefresh', autoRefresh);
    localStorage.setItem('news-bookmarks', JSON.stringify(bookmarkedArticles));
    localStorage.setItem('news-readlater', JSON.stringify(readLaterArticles));
  }, [selectedCategory, selectedSources, timeRange, autoRefresh, bookmarkedArticles, readLaterArticles]);

  // Fetch news
  const { data: newsData, isLoading, refetch } = useQuery({
    queryKey: ['news', selectedCategory, selectedSources, timeRange, searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams({
        category: selectedCategory,
        sources: selectedSources.join(','),
        since: timeRange,
        limit: '50',
        search: searchQuery
      });
      
      console.log('Frontend API request params:', {
        category: selectedCategory,
        sources: selectedSources,
        timeRange,
        searchQuery,
        fullUrl: `/api/news?${params}`
      });
      
      const response = await apiRequest('GET', `/api/news?${params}`);
      const data = await response.json() as NewsResponse;
      
      // Debug: Log first few articles to see if they have images
      console.log('Fetched articles sample:', data.articles.slice(0, 3).map(a => ({ 
        title: a.title.substring(0, 50), 
        url: a.url
      })));
      
      return data;
    },
    staleTime: 60000, // 1 minute
  });

  // Auto-refresh setup
  useEffect(() => {
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
    }

    if (autoRefresh !== 'off') {
      const intervals = { '1m': 60000, '5m': 300000, '15m': 900000 };
      refreshIntervalRef.current = setInterval(() => {
        refetch();
      }, intervals[autoRefresh]);
    }

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [autoRefresh, refetch]);

  // Batch fetch images for visible articles
  useEffect(() => {
    if (newsData?.articles && newsData.articles.length > 0) {
      const articlesNeedingImages = newsData.articles
        .filter(article => !article.image && !articlesWithImages[article.url])
        .slice(0, 12); // Fetch images for first 12 articles

      if (articlesNeedingImages.length > 0) {
        const urls = articlesNeedingImages.map(article => article.url);
        
        apiRequest('POST', '/api/news/images', { 
          urls
        })
        .then(response => response.json())
        .then(data => {
          if (data.images) {
            setArticlesWithImages(prev => ({ ...prev, ...data.images }));
          }
        })
        .catch(error => {
          console.log('Failed to fetch images:', error);
        });
      }
    }
  }, [newsData?.articles]);



  // Loading skeleton component
  const ArticleSkeleton = () => (
    <div className="bg-trading-card rounded-lg p-6 border border-gray-700 animate-pulse">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 bg-gray-600 rounded"></div>
          <div className="w-24 h-4 bg-gray-600 rounded"></div>
          <div className="w-12 h-3 bg-gray-700 rounded"></div>
        </div>
        <div className="flex gap-2">
          <div className="w-6 h-6 bg-gray-600 rounded"></div>
          <div className="w-6 h-6 bg-gray-600 rounded"></div>
          <div className="w-6 h-6 bg-gray-600 rounded"></div>
        </div>
      </div>
      
      <div className="w-4/5 h-6 bg-gray-600 rounded mb-2"></div>
      <div className="w-3/5 h-6 bg-gray-600 rounded mb-4"></div>
      
      <div className="space-y-2 mb-4">
        <div className="w-full h-4 bg-gray-700 rounded"></div>
        <div className="w-5/6 h-4 bg-gray-700 rounded"></div>
        <div className="w-4/5 h-4 bg-gray-700 rounded"></div>
      </div>
      
      <div className="flex flex-wrap gap-2">
        <div className="w-16 h-6 bg-gray-600 rounded-full"></div>
        <div className="w-12 h-6 bg-gray-600 rounded-full"></div>
        <div className="w-14 h-6 bg-gray-600 rounded-full"></div>
      </div>
    </div>
  );

  const categories: { key: Category; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'stocks', label: 'Stocks' },
    { key: 'futures', label: 'Futures' },
    { key: 'forex', label: 'Forex' },
    { key: 'crypto', label: 'Crypto' },
    { key: 'education', label: 'Education' }
  ];

  const timeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const toggleBookmark = (articleId: string) => {
    setBookmarkedArticles(prev => 
      prev.includes(articleId) 
        ? prev.filter(id => id !== articleId)
        : [...prev, articleId]
    );
  };

  const toggleReadLater = (articleId: string) => {
    setReadLaterArticles(prev => 
      prev.includes(articleId) 
        ? prev.filter(id => id !== articleId)
        : [...prev, articleId]
    );
  };

  const getSentimentColor = (sentiment?: string) => {
    switch (sentiment) {
      case 'positive': return 'bg-green-500';
      case 'negative': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'stocks': return 'bg-blue-900/50 text-blue-300 border border-blue-500/30';
      case 'futures': return 'bg-purple-900/50 text-purple-300 border border-purple-500/30';
      case 'forex': return 'bg-green-900/50 text-green-300 border border-green-500/30';
      case 'crypto': return 'bg-orange-900/50 text-orange-300 border border-orange-500/30';
      case 'education': return 'bg-yellow-900/50 text-yellow-300 border border-yellow-500/30';
      default: return 'bg-gray-700/50 text-gray-300 border border-gray-600/30';
    }
  };

  const openArticleModal = async (article: NewsArticle) => {
    setSelectedArticle(article);
    setLoadingContent(true);
    setArticleContent('');
    
    try {
      const response = await apiRequest('GET', `/api/news/article/${article.id}`);
      const articleWithContent = await response.json();
      setArticleContent(articleWithContent.content || 'Content could not be loaded.');
      // Update the selected article with the fetched image
      setSelectedArticle(prev => prev ? { ...prev, image: articleWithContent.image } : null);
    } catch (error) {
      console.error('Error loading article content:', error);
      setArticleContent('Failed to load article content.');
    } finally {
      setLoadingContent(false);
    }
  };

  return (
    <div className="min-h-screen bg-trading-dark text-white">
      {/* Header */}
      <header className="bg-trading-gray border-b border-gray-700 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link href="/" className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors">
                <ArrowLeft className="h-5 w-5" />
                <span>Back to Trading</span>
              </Link>
              <div className="h-6 w-px bg-gray-600"></div>
              <h1 className="text-xl font-bold text-white flex items-center gap-2">
                <span className="text-lg">📰</span>
                Market News
              </h1>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search news..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 w-64 bg-trading-card border border-gray-600 rounded-lg focus:ring-2 focus:ring-trading-light-blue focus:border-transparent text-white placeholder-gray-400"
                />
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <select
                value={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.value as AutoRefresh)}
                className="text-sm bg-trading-card border border-gray-600 rounded-md px-3 py-1 text-white"
              >
                <option value="off">Auto-refresh: Off</option>
                <option value="1m">Auto-refresh: 1min</option>
                <option value="5m">Auto-refresh: 5min</option>
                <option value="15m">Auto-refresh: 15min</option>
              </select>
              
              <button
                onClick={() => refetch()}
                className="p-2 text-gray-300 hover:text-white transition-colors"
              >
                <RefreshCw className="h-5 w-5" />
              </button>
              
              <button
                onClick={() => setShowFilters(true)}
                className="p-2 text-gray-300 hover:text-white transition-colors"
              >
                <Filter className="h-5 w-5" />
              </button>
              
              <button
                onClick={() => setShowBookmarks(true)}
                className="p-2 text-gray-300 hover:text-white transition-colors"
              >
                <Bookmark className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Video Section */}
      <section className="bg-gradient-to-r from-trading-dark via-gray-800 to-trading-dark py-8 mb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-white mb-2">Live Financial News</h2>
            <p className="text-gray-300">Live market coverage, financial news, and trading analysis</p>
          </div>
          
          <div className="relative bg-black rounded-lg overflow-hidden shadow-2xl">
            {/* Try multiple video sources with fallbacks */}
            <div className="aspect-video relative">
              {/* Primary: Custom YouTube Live Stream */}
              <iframe
                src="https://www.youtube.com/embed/KQp-e_XQnDE?autoplay=1&mute=1&controls=1&rel=0&modestbranding=1"
                className="w-full h-full border-0 absolute inset-0"
                title="Live Financial News Stream"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                onError={() => {
                  // Fallback to CNBC
                  const fallback = document.getElementById('cnbc-fallback');
                  if (fallback) fallback.style.display = 'block';
                }}
              />
              
              {/* Secondary: CNBC Embed */}
              <iframe
                id="cnbc-fallback"
                src="https://player.cnbc.com/p/gZWlPC/cnbc_global?playertype=synd&byGuid=7000031045&size=530_298&autoplay=true"
                className="w-full h-full border-0 absolute inset-0 hidden"
                title="CNBC Live Stream"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                onError={() => {
                  // Final fallback to custom player
                  const customPlayer = document.getElementById('custom-player');
                  if (customPlayer) customPlayer.style.display = 'flex';
                }}
              />
              
              {/* Final Fallback: Custom Video Player */}
              <div id="custom-player" className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900 hidden items-center justify-center">
                <div className="text-center p-8">
                  <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <div className="w-0 h-0 border-l-6 border-r-0 border-t-4 border-b-4 border-transparent border-l-white ml-1"></div>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-4">Live Financial News</h3>
                  <p className="text-gray-300 mb-6">Stream temporarily unavailable. Choose a direct source:</p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md mx-auto">
                    <a 
                      href="https://www.bloomberg.com/live/us" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg transition-colors text-center font-medium"
                    >
                      📺 Bloomberg Live
                    </a>
                    <a 
                      href="https://www.cnbc.com/live-tv/" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="bg-red-600 hover:bg-red-700 text-white px-4 py-3 rounded-lg transition-colors text-center font-medium"
                    >
                      📺 CNBC Live
                    </a>
                    <a 
                      href="https://www.youtube.com/c/BloombergTelevision/live" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-3 rounded-lg transition-colors text-center font-medium"
                    >
                      📺 YouTube Live
                    </a>
                    <a 
                      href="https://www.marketwatch.com/live" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-lg transition-colors text-center font-medium"
                    >
                      📺 MarketWatch
                    </a>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Video controls overlay */}
            <div className="absolute top-4 right-4 opacity-75 hover:opacity-100 transition-opacity">
              <div className="flex gap-2">
                <button 
                  onClick={() => {
                    const customPlayer = document.getElementById('custom-player');
                    if (customPlayer) {
                      customPlayer.style.display = customPlayer.style.display === 'none' ? 'flex' : 'none';
                    }
                  }}
                  className="bg-gray-800/80 hover:bg-gray-700 text-white px-2 py-1 rounded text-xs transition-colors"
                >
                  Sources
                </button>
              </div>
            </div>
          </div>
          

          
          <div className="flex justify-center mt-4 space-x-4 text-sm text-gray-400">
            <span>🔴 Live Coverage</span>
            <span>📈 Real-time Data</span>
            <span>🌍 Global Markets</span>
          </div>
        </div>
      </section>

      {/* Category Tabs */}
      <nav className="bg-trading-gray border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8 overflow-x-auto">
            {categories.map((category) => (
              <button
                key={category.key}
                onClick={() => setSelectedCategory(category.key)}
                className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                  selectedCategory === category.key
                    ? 'border-trading-light-blue text-trading-light-blue'
                    : 'border-transparent text-gray-400 hover:text-gray-300'
                }`}
              >
                {category.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Articles Grid */}
          <div className="flex-1">
            {isLoading ? (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {[...Array(9)].map((_, i) => (
                  <div key={i} className="bg-trading-card rounded-lg shadow-sm p-6 animate-pulse border border-gray-700">
                    <div className="h-4 bg-gray-700 rounded w-3/4 mb-3"></div>
                    <div className="h-3 bg-gray-700 rounded w-1/2 mb-4"></div>
                    <div className="space-y-2">
                      <div className="h-3 bg-gray-700 rounded"></div>
                      <div className="h-3 bg-gray-700 rounded w-5/6"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : newsData?.articles.length ? (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {newsData.articles.map((article) => (
                  <article
                    key={article.id}
                    className="bg-trading-card rounded-lg shadow-sm hover:shadow-lg transition-all duration-200 border border-gray-700 hover:border-gray-600 overflow-hidden"
                  >
                    {/* Article Image */}
                    {(article.image || articlesWithImages[article.url]) && (
                      <div className="relative h-48 overflow-hidden">
                        <img 
                          src={article.image || articlesWithImages[article.url]} 
                          alt={article.title}
                          className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform duration-200"
                          onClick={() => openArticleModal(article)}
                          onError={(e) => { 
                            console.log('Image failed to load:', e.currentTarget.src);
                            e.currentTarget.parentElement!.style.display = 'none'; 
                          }}
                          onLoad={(e) => {
                            console.log('Image loaded successfully:', e.currentTarget.src);
                          }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                        <div className="absolute bottom-3 left-3 right-3">
                          <div className="flex items-center gap-2 mb-2">
                            <img 
                              src={article.sourceFavicon} 
                              alt={article.source}
                              className="w-4 h-4"
                              onError={(e) => { e.currentTarget.style.display = 'none'; }}
                            />
                            <span className="text-sm text-white font-medium">{article.source}</span>
                            {article.sentiment && (
                              <div className={`w-2 h-2 rounded-full ${getSentimentColor(article.sentiment)}`}></div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="p-6">
                      {/* Header for articles without images */}
                      {!(article.image || articlesWithImages[article.url]) && (
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <img 
                              src={article.sourceFavicon} 
                              alt={article.source}
                              className="w-4 h-4"
                              onError={(e) => { e.currentTarget.style.display = 'none'; }}
                            />
                            <span className="text-sm text-gray-400">{article.source}</span>
                            {article.sentiment && (
                              <div className={`w-2 h-2 rounded-full ${getSentimentColor(article.sentiment)}`}></div>
                            )}
                          </div>
                          <span className="text-xs text-gray-500" title={new Date(article.publishedAt).toLocaleString()}>
                            {timeAgo(article.publishedAt)}
                          </span>
                        </div>
                      )}
                      
                      {/* Article Title - only for articles WITH images */}
                      {(article.image || articlesWithImages[article.url]) && (
                        <div className="mb-3">
                          <h3 
                            className="font-semibold text-white mb-2 line-clamp-2 cursor-pointer hover:text-trading-light-blue transition-colors"
                            onClick={() => openArticleModal(article)}
                          >
                            {article.title}
                          </h3>
                          <span className="text-xs text-gray-500" title={new Date(article.publishedAt).toLocaleString()}>
                            {timeAgo(article.publishedAt)}
                          </span>
                        </div>
                      )}
                      
                      {/* Article Title - only for articles WITHOUT images */}
                      {!(article.image || articlesWithImages[article.url]) && (
                        <h3 
                          className="font-semibold text-white mb-3 line-clamp-2 cursor-pointer hover:text-trading-light-blue transition-colors"
                          onClick={() => openArticleModal(article)}
                        >
                          {article.title}
                        </h3>
                      )}
                      
                      <p className="text-sm text-gray-300 mb-4 line-clamp-3">
                        {article.summary}
                      </p>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex flex-wrap gap-1">
                          <span className={`px-2 py-1 text-xs rounded-full ${getCategoryColor(article.category)}`}>
                            {article.category}
                          </span>
                          {article.tickers.slice(0, 3).map((ticker) => (
                            <span key={ticker} className="px-2 py-1 text-xs bg-gray-700 text-gray-300 rounded">
                              {ticker}
                            </span>
                          ))}
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => toggleBookmark(article.id)}
                            className={`p-1 rounded transition-colors ${bookmarkedArticles.includes(article.id) ? 'text-yellow-500' : 'text-gray-400 hover:text-yellow-500'}`}
                          >
                            <Star className="h-4 w-4" fill={bookmarkedArticles.includes(article.id) ? 'currentColor' : 'none'} />
                          </button>
                          
                          <button
                            onClick={() => toggleReadLater(article.id)}
                            className={`p-1 rounded transition-colors ${readLaterArticles.includes(article.id) ? 'text-trading-light-blue' : 'text-gray-400 hover:text-trading-light-blue'}`}
                          >
                            <Clock className="h-4 w-4" />
                          </button>
                          
                          <button
                            onClick={() => openArticleModal(article)}
                            className="p-1 text-gray-400 hover:text-trading-light-blue transition-colors"
                            title="Read article"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-400">No articles found. Try adjusting your filters or search terms.</p>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <aside className="w-full lg:w-80 space-y-6">
            {/* Trending Tickers */}
            <div className="bg-trading-card rounded-lg shadow-sm p-6 border border-gray-700">
              <h3 className="font-semibold text-white mb-4">Trending Tickers</h3>
              <div className="flex flex-wrap gap-2">
                {['SPY', 'QQQ', 'TSLA', 'AAPL', 'BTC', 'ETH', 'EUR/USD', 'GC', 'CL'].map((ticker) => (
                  <span key={ticker} className="px-3 py-1 bg-trading-light-blue/20 text-trading-light-blue rounded-full text-sm border border-trading-light-blue/30">
                    {ticker}
                  </span>
                ))}
              </div>
            </div>

            {/* Education Resources */}
            <div className="bg-trading-card rounded-lg shadow-sm p-6 border border-gray-700">
              <h3 className="font-semibold text-white mb-4">Education Resources</h3>
              <div className="space-y-3">
                <a href="https://www.cmegroup.com/education" target="_blank" rel="noopener noreferrer" 
                   className="block text-sm text-trading-light-blue hover:text-white transition-colors">
                  CME Group Education (Futures)
                </a>
                <a href="https://www.cboe.com/education" target="_blank" rel="noopener noreferrer"
                   className="block text-sm text-trading-light-blue hover:text-white transition-colors">
                  CBOE Options Institute
                </a>
                <a href="https://www.dailyfx.com/education" target="_blank" rel="noopener noreferrer"
                   className="block text-sm text-trading-light-blue hover:text-white transition-colors">
                  DailyFX Education (Forex)
                </a>
                <a href="https://www.investopedia.com/options-basics-tutorial-4583012" target="_blank" rel="noopener noreferrer"
                   className="block text-sm text-trading-light-blue hover:text-white transition-colors">
                  Investopedia Options Basics
                </a>
              </div>
            </div>
          </aside>
        </div>
      </main>

      {/* Filters Modal */}
      {showFilters && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-trading-card rounded-lg p-6 w-full max-w-md border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Filters</h3>
              <button onClick={() => setShowFilters(false)}>
                <X className="h-5 w-5 text-gray-400 hover:text-white transition-colors" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Time Range
                </label>
                <select
                  value={timeRange}
                  onChange={(e) => setTimeRange(e.target.value as TimeRange)}
                  className="w-full bg-trading-dark border border-gray-600 rounded-md px-3 py-2 text-white"
                >
                  <option value="1h">Last 1 hour</option>
                  <option value="24h">Last 24 hours</option>
                  <option value="7d">Last 7 days</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Sources
                </label>
                <div className="space-y-2">
                  {newsData?.sources.map((source) => (
                    <label key={source} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={selectedSources.includes(source)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedSources([...selectedSources, source]);
                          } else {
                            setSelectedSources(selectedSources.filter(s => s !== source));
                          }
                        }}
                        className="mr-2 accent-trading-light-blue"
                      />
                      <span className="text-sm text-gray-300">{source}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowFilters(false)}
                className="px-4 py-2 text-sm bg-gray-700 text-gray-300 rounded-md hover:bg-gray-600 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bookmarks Modal */}
      {showBookmarks && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-trading-card rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Bookmarks & Read Later</h3>
              <button onClick={() => setShowBookmarks(false)}>
                <X className="h-5 w-5 text-gray-400 hover:text-white transition-colors" />
              </button>
            </div>
            
            <div className="space-y-4">
              {bookmarkedArticles.length === 0 && readLaterArticles.length === 0 ? (
                <p className="text-gray-400 text-center py-8">No saved articles yet.</p>
              ) : (
                <div className="space-y-2">
                  {newsData?.articles
                    .filter(article => bookmarkedArticles.includes(article.id) || readLaterArticles.includes(article.id))
                    .map(article => (
                      <div key={article.id} className="p-3 border border-gray-700 rounded-lg bg-trading-dark">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium text-white text-sm mb-1">{article.title}</h4>
                            <p className="text-xs text-gray-400">{article.source} • {timeAgo(article.publishedAt)}</p>
                          </div>
                          <button
                            onClick={() => openArticleModal(article)}
                            className="ml-2 p-1 text-gray-400 hover:text-trading-light-blue transition-colors"
                            title="Read article"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  }
                </div>
              )}
            </div>
            
            <div className="flex justify-end mt-6">
              <button
                onClick={() => setShowBookmarks(false)}
                className="px-4 py-2 text-sm bg-gray-700 text-gray-300 rounded-md hover:bg-gray-600 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Article Reader Modal */}
      {selectedArticle && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setSelectedArticle(null);
            }
          }}
        >
          <div className="bg-trading-card rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden border border-gray-700">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-700">
              <div className="flex items-center gap-3">
                <img 
                  src={selectedArticle.sourceFavicon} 
                  alt={selectedArticle.source}
                  className="w-5 h-5"
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
                <span className="text-gray-400 text-sm">{selectedArticle.source}</span>
                <span className="text-gray-500 text-xs">•</span>
                <span className="text-gray-500 text-xs" title={new Date(selectedArticle.publishedAt).toLocaleString()}>
                  {timeAgo(selectedArticle.publishedAt)}
                </span>
                {selectedArticle.sentiment && (
                  <>
                    <span className="text-gray-500 text-xs">•</span>
                    <div className={`w-2 h-2 rounded-full ${getSentimentColor(selectedArticle.sentiment)}`}></div>
                  </>
                )}
              </div>
              <button 
                onClick={() => setSelectedArticle(null)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="overflow-y-auto max-h-[calc(90vh-200px)]">
              <div className="p-6">
                <h1 className="text-2xl font-bold text-white mb-4 leading-tight">
                  {selectedArticle.title}
                </h1>
                
                <div className="flex flex-wrap gap-2 mb-6">
                  <span className={`px-3 py-1 text-sm rounded-full ${getCategoryColor(selectedArticle.category)}`}>
                    {selectedArticle.category}
                  </span>
                  {selectedArticle.tickers.map((ticker) => (
                    <span key={ticker} className="px-3 py-1 text-sm bg-gray-700 text-gray-300 rounded-full">
                      {ticker}
                    </span>
                  ))}
                </div>

                <div className="prose prose-invert max-w-none">
                  <p className="text-gray-300 text-lg leading-relaxed mb-6">
                    {selectedArticle.summary}
                  </p>
                  
                  {/* Article content */}
                  <div className="bg-trading-dark rounded-lg border border-gray-700 overflow-hidden">
                    <div className="p-4 border-b border-gray-700 flex items-center justify-between">
                      <span className="text-sm text-gray-400">Full Article Content</span>
                      <a
                        href={selectedArticle.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-trading-light-blue hover:text-white transition-colors flex items-center gap-1"
                      >
                        Open Original <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                    <div className="p-6 min-h-96 max-h-96 overflow-y-auto">
                      {loadingContent ? (
                        <div className="flex items-center justify-center h-full">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-trading-light-blue"></div>
                          <span className="ml-3 text-gray-400">Loading article content...</span>
                        </div>
                      ) : (
                        <div 
                          className="prose prose-invert max-w-none text-gray-300 leading-relaxed"
                          dangerouslySetInnerHTML={{ __html: articleContent }}
                        />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between p-6 border-t border-gray-700 bg-trading-dark/50">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => toggleBookmark(selectedArticle.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                    bookmarkedArticles.includes(selectedArticle.id) 
                      ? 'bg-yellow-600/20 text-yellow-400 border border-yellow-500/30' 
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  <Star className="h-4 w-4" fill={bookmarkedArticles.includes(selectedArticle.id) ? 'currentColor' : 'none'} />
                  {bookmarkedArticles.includes(selectedArticle.id) ? 'Bookmarked' : 'Bookmark'}
                </button>
                
                <button
                  onClick={() => toggleReadLater(selectedArticle.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                    readLaterArticles.includes(selectedArticle.id) 
                      ? 'bg-trading-light-blue/20 text-trading-light-blue border border-trading-light-blue/30' 
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  <Clock className="h-4 w-4" />
                  {readLaterArticles.includes(selectedArticle.id) ? 'Saved for Later' : 'Read Later'}
                </button>
              </div>
              
              <div className="flex items-center gap-2">
                <a
                  href={selectedArticle.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-trading-light-blue text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2"
                >
                  Open Original <ExternalLink className="h-4 w-4" />
                </a>
                <button
                  onClick={() => setSelectedArticle(null)}
                  className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}