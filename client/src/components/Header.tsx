export default function Header() {
  return (
    <header className="bg-trading-gray border-b border-gray-700 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0 flex items-center">
              <i className="fas fa-chart-line text-trading-light-blue text-2xl mr-3"></i>
              <span className="text-xl font-bold text-white">TradePro</span>
              <span className="text-sm text-gray-400 ml-2">Simulator</span>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <a 
              href="/learn-options" 
              className="text-sm text-blue-400 hover:text-blue-300 transition-colors flex items-center space-x-1"
            >
              <span>📚</span>
              <span>Learn Options</span>
            </a>
            <div className="text-sm text-gray-300">
              <span>Portfolio: $10,000</span>
            </div>
            <div className="text-sm text-trading-success">
              <span>+$250 (2.5%)</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
