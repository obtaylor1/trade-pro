interface MarketSelectorProps {
  selectedMarket: "stocks" | "commodities" | "crypto" | "options" | "forex";
  onSelectMarket: (market: "stocks" | "commodities" | "crypto" | "options" | "forex") => void;
}

export default function MarketSelector({ selectedMarket, onSelectMarket }: MarketSelectorProps) {
  const markets = [
    {
      id: "commodities" as const,
      name: "Commodities", 
      icon: "fas fa-coins",
      description: "Gold, Oil, Silver"
    },
    {
      id: "crypto" as const,
      name: "Crypto",
      icon: "fab fa-bitcoin", 
      description: "BTC, ETH, SOL"
    },
    {
      id: "stocks" as const,
      name: "Stocks",
      icon: "fas fa-chart-bar",
      description: "S&P 500, NASDAQ"
    },
    {
      id: "options" as const,
      name: "Options",
      icon: "fas fa-chart-line",
      description: "Calls, Puts, Leverage"
    },
    {
      id: "forex" as const,
      name: "Forex",
      icon: "fas fa-dollar-sign",
      description: "USD, EUR, GBP"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
      {markets.map((market) => {
        const isSelected = selectedMarket === market.id;
        
        return (
          <button
            key={market.id}
            onClick={() => onSelectMarket(market.id)}
            className={`font-semibold py-4 px-6 rounded-xl transition-all duration-300 border-2 shadow-lg transform hover:scale-105 ${
              isSelected 
                ? "bg-trading-blue hover:bg-blue-700 text-white border-trading-blue animate-pulse-glow" 
                : "bg-trading-gray hover:bg-gray-600 text-white border-gray-600"
            }`}
          >
            <i className={`${market.icon} text-2xl mb-2 block`}></i>
            <span className="text-lg">{market.name}</span>
            <div className={`text-sm mt-1 ${isSelected ? "text-blue-200" : "text-gray-400"}`}>
              {market.description}
            </div>
          </button>
        );
      })}
    </div>
  );
}
