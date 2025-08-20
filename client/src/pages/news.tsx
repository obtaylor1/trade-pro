import { useState, useEffect, useRef } from 'react';
import { Search, RefreshCw, Bookmark, Clock, ExternalLink, Filter, X, Star } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

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
  const [timeRange, setTimeRange] = useState<TimeRange>('24h');
  const [autoRefresh, setAutoRefresh] = useState<AutoRefresh>('off');
  const [showFilters, setShowFilters] = useState(false);
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [bookmarkedArticles, setBookmarkedArticles] = useState<string[]>([]);
  const [readLaterArticles, setReadLaterArticles] = useState<string[]>([]);
  
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
    if (savedTimeRange) setTimeRange(savedTimeRange);
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
      
      const response = await apiRequest('GET', `/api/news?${params}`);
      return response.json() as Promise<NewsResponse>;
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
      case 'stocks': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'futures': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'forex': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'crypto': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'education': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Market News</h1>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search news..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 w-64 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <select
                value={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.value as AutoRefresh)}
                className="text-sm bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1"
              >
                <option value="off">Auto-refresh: Off</option>
                <option value="1m">Auto-refresh: 1min</option>
                <option value="5m">Auto-refresh: 5min</option>
                <option value="15m">Auto-refresh: 15min</option>
              </select>
              
              <button
                onClick={() => refetch()}
                className="p-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
              >
                <RefreshCw className="h-5 w-5" />
              </button>
              
              <button
                onClick={() => setShowFilters(true)}
                className="p-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
              >
                <Filter className="h-5 w-5" />
              </button>
              
              <button
                onClick={() => setShowBookmarks(true)}
                className="p-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
              >
                <Bookmark className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Category Tabs */}
      <nav className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8 overflow-x-auto">
            {categories.map((category) => (
              <button
                key={category.key}
                onClick={() => setSelectedCategory(category.key)}
                className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                  selectedCategory === category.key
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
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
                  <div key={i} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 animate-pulse">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-3"></div>
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-4"></div>
                    <div className="space-y-2">
                      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded"></div>
                      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : newsData?.articles.length ? (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {newsData.articles.map((article) => (
                  <article
                    key={article.id}
                    className="bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-shadow p-6"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <img 
                          src={article.sourceFavicon} 
                          alt={article.source}
                          className="w-4 h-4"
                          onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        />
                        <span className="text-sm text-gray-600 dark:text-gray-400">{article.source}</span>
                        {article.sentiment && (
                          <div className={`w-2 h-2 rounded-full ${getSentimentColor(article.sentiment)}`}></div>
                        )}
                      </div>
                      <span className="text-xs text-gray-500" title={new Date(article.publishedAt).toLocaleString()}>
                        {timeAgo(article.publishedAt)}
                      </span>
                    </div>
                    
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2">
                      {article.title}
                    </h3>
                    
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 line-clamp-3">
                      {article.summary}
                    </p>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex flex-wrap gap-1">
                        <span className={`px-2 py-1 text-xs rounded-full ${getCategoryColor(article.category)}`}>
                          {article.category}
                        </span>
                        {article.tickers.slice(0, 3).map((ticker) => (
                          <span key={ticker} className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded">
                            {ticker}
                          </span>
                        ))}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleBookmark(article.id)}
                          className={`p-1 rounded ${bookmarkedArticles.includes(article.id) ? 'text-yellow-500' : 'text-gray-400 hover:text-yellow-500'}`}
                        >
                          <Star className="h-4 w-4" fill={bookmarkedArticles.includes(article.id) ? 'currentColor' : 'none'} />
                        </button>
                        
                        <button
                          onClick={() => toggleReadLater(article.id)}
                          className={`p-1 rounded ${readLaterArticles.includes(article.id) ? 'text-blue-500' : 'text-gray-400 hover:text-blue-500'}`}
                        >
                          <Clock className="h-4 w-4" />
                        </button>
                        
                        <a
                          href={article.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 text-gray-400 hover:text-blue-500"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-500 dark:text-gray-400">No articles found. Try adjusting your filters or search terms.</p>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <aside className="w-full lg:w-80 space-y-6">
            {/* Trending Tickers */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Trending Tickers</h3>
              <div className="flex flex-wrap gap-2">
                {['SPY', 'QQQ', 'TSLA', 'AAPL', 'BTC', 'ETH', 'EUR/USD', 'GC', 'CL'].map((ticker) => (
                  <span key={ticker} className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-sm">
                    {ticker}
                  </span>
                ))}
              </div>
            </div>

            {/* Education Resources */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Education Resources</h3>
              <div className="space-y-3">
                <a href="https://www.cmegroup.com/education" target="_blank" rel="noopener noreferrer" 
                   className="block text-sm text-blue-600 dark:text-blue-400 hover:underline">
                  CME Group Education (Futures)
                </a>
                <a href="https://www.cboe.com/education" target="_blank" rel="noopener noreferrer"
                   className="block text-sm text-blue-600 dark:text-blue-400 hover:underline">
                  CBOE Options Institute
                </a>
                <a href="https://www.dailyfx.com/education" target="_blank" rel="noopener noreferrer"
                   className="block text-sm text-blue-600 dark:text-blue-400 hover:underline">
                  DailyFX Education (Forex)
                </a>
                <a href="https://www.investopedia.com/options-basics-tutorial-4583012" target="_blank" rel="noopener noreferrer"
                   className="block text-sm text-blue-600 dark:text-blue-400 hover:underline">
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
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Filters</h3>
              <button onClick={() => setShowFilters(false)}>
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Time Range
                </label>
                <select
                  value={timeRange}
                  onChange={(e) => setTimeRange(e.target.value as TimeRange)}
                  className="w-full bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2"
                >
                  <option value="1h">Last 1 hour</option>
                  <option value="24h">Last 24 hours</option>
                  <option value="7d">Last 7 days</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">{source}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowFilters(false)}
                className="px-4 py-2 text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600"
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
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Bookmarks & Read Later</h3>
              <button onClick={() => setShowBookmarks(false)}>
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            
            <div className="space-y-4">
              {bookmarkedArticles.length === 0 && readLaterArticles.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-center py-8">No saved articles yet.</p>
              ) : (
                <div className="space-y-2">
                  {newsData?.articles
                    .filter(article => bookmarkedArticles.includes(article.id) || readLaterArticles.includes(article.id))
                    .map(article => (
                      <div key={article.id} className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900 dark:text-white text-sm mb-1">{article.title}</h4>
                            <p className="text-xs text-gray-600 dark:text-gray-400">{article.source} • {timeAgo(article.publishedAt)}</p>
                          </div>
                          <a
                            href={article.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ml-2 p-1 text-gray-400 hover:text-blue-500"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
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
                className="px-4 py-2 text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}