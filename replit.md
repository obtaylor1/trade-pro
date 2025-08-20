# Trading Application Simulator

## Overview

This is a comprehensive web-based trading application simulator built as a paper-trading platform. The application allows users to simulate sophisticated trading bot functionality by selecting different markets (commodities, crypto, stocks), viewing AI-generated trading opportunities, and executing simulated trades. The entire system is designed to provide a realistic trading experience without real financial risk, making it perfect for educational purposes and strategy testing.

The application features a modern, responsive interface with real-time market data integration, professional trading card layouts, comprehensive feedback systems, and detailed trading rationales. Each trading opportunity includes expert analysis explaining why it's the optimal choice at the current moment, covering technical indicators, market conditions, and fundamental factors. The system uses live market data from Alpha Vantage API combined with innovative micro and nano trading contracts, providing users with an intuitive way to understand trading concepts and strategies.

**Key Features:**
- **Professional Futures Trading**: Full contract specifications for major exchanges (CME, NYMEX, CBOT, ICE)
- **Advanced Trading Strategies**: Trend following, supply-demand analysis, weather risk, and seasonal patterns
- **Risk Management Tools**: Stop-loss and take-profit levels with real-time margin calculations
- **User Authentication**: Email-based registration and login for persistent trading accounts
- **Dynamic Portfolio Balance**: Real-time calculations based on user's starting capital and trading performance
- **Micro Options Trading**: Affordable options contracts ($0.25-$0.90) with 1 share per contract instead of 100
- **Real-Time Options Charts**: Professional charting with 30-minute, 4-hour, and daily timeframes
- **Options Duration Selection**: Weekly and monthly expiration choices with different risk/reward profiles
- **Enhanced UI Readability**: Positioned trading windows with gradient backgrounds and improved contrast
- **Professional Trading Interface**: Specialized cards for futures vs options vs stocks with appropriate details
- **Greeks Integration**: Real-time Delta, Theta, Gamma, and Vega calculations for option pricing
- **Real-Time Data**: Live market prices from Alpha Vantage API with intelligent fallback simulation
- **Trade History Tracking**: Complete audit trail tied to individual user accounts
- **Educational Focus**: Trading rationales and professional risk management strategies

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Enhancements (August 2025)

**Learn to Trade Educational Module:**
- Created comprehensive single-page trading education platform at /learn-options
- Built 5 core options strategy sections with interactive payoff charts and real-time calculations
- Added practice calculator with dynamic inputs for all trading strategies
- Implemented 5-question quiz system with instant feedback and explanations
- Included market examples across stocks, futures, forex, and crypto markets
- Added prominent "Learn to Trade" button with gradient styling and animations
- Designed beginner-friendly interface with glossary and professional trading safety tips

**Professional Futures Trading Implementation:**
- Completely redesigned commodities market to focus on professional futures contracts
- Added full contract specifications: margin requirements, tick values, leverage ratios, expiration dates
- Implemented advanced trading strategies: Trend Following, Supply-Demand Analysis, Weather Risk, Seasonal Patterns
- Created specialized FuturesTradeCard component with comprehensive contract details
- Added stop-loss and take-profit levels for professional risk management
- Integrated real exchange symbols (GC, CL, NG, KC, C, ES) from CME, NYMEX, CBOT, ICE
- Enhanced schema to support futures-specific fields: marginRequired, tickValue, leverage, strategy, stopLoss, takeProfit

**Forex Trading Implementation:**
- Added forex as fifth market option with $50 minimum requirement
- Implemented professional forex strategies: Trend Following, Breakout Trading, Carry Trade, Range Trading, Swing Trading
- Integrated authentic regulated broker data: OANDA, FOREX.com (StoneX), Interactive Brokers, IG, Pepperstone, IC Markets, FxPro, XTB
- Added major currency pairs: EUR/USD, GBP/USD, USD/JPY, AUD/USD, USD/CAD with real-time pricing
- Enhanced broker selection system with forex-specific features and regulatory information
- Updated market selector, broker dashboard, and user authentication to support forex trading

**Portfolio Integration & Reset Functionality:**
- All configure & execute buttons now properly update user portfolio balance with real-time invalidation
- Added comprehensive reset portfolio functionality with both frontend button and backend API endpoint
- Enhanced balance tracking system across all trading components (stocks, options, commodities, crypto, forex)
- Implemented proper query invalidation for real-time balance updates after trade execution

**Options Trading Interface Improvements:**
- Enhanced positioned options trade window spanning first two trading cards area
- Fixed positioning and scrolling issues for better user experience
- Added gradient backgrounds and improved contrast for all information sections  
- Created weekly/monthly duration selection with dynamic pricing calculations
- Implemented proper overlay window system that closes after trade execution

## System Architecture

### Frontend Architecture
The client-side is built using **React 18** with TypeScript, providing a modern component-based architecture. The application uses **Wouter** for lightweight client-side routing and **TanStack Query** for efficient state management and data fetching. The UI is styled with **Tailwind CSS** and enhanced with **shadcn/ui** components for a consistent, professional design system.

Key architectural decisions:
- **Component-based design**: Modular components like `MarketSelector`, `TradeCard`, and `TradingOpportunities` promote reusability and maintainability
- **Custom hook integration**: Uses React hooks for state management and side effects
- **Responsive design**: Mobile-first approach with Tailwind CSS utilities
- **TypeScript integration**: Provides type safety across all components and API interactions

### Backend Architecture
The server-side uses **Node.js** with **Express** as a lightweight REST API framework. The architecture follows a clean separation of concerns with dedicated modules for routing, storage, and server configuration.

Key architectural decisions:
- **RESTful API design**: Clear endpoints for fetching opportunities and executing trades
- **In-memory storage**: Uses a memory-based storage system with mock data for simplicity and development speed
- **Modular routing**: Centralized route registration with proper error handling
- **Development optimization**: Integrated Vite middleware for hot reloading during development

### Data Storage Solutions
The application uses a **PostgreSQL database** for persistent data storage combined with real-world market data integration.

Storage architecture:
- **PostgreSQL Database**: Stores user accounts, trade history, and portfolio performance data
- **User Authentication**: Email-based registration with custom starting capital and broker selection
- **Real-time Balance Calculations**: Dynamic portfolio values based on starting capital plus trade P&L
- **Trade Audit Trail**: Complete record of all trades tied to specific user accounts
- **Real-time market data**: Alpha Vantage API integration with realistic market simulation fallback for continuous availability
- **Smart caching layer**: 5-minute cache duration to respect API rate limits while maintaining fresh data
- **Type-safe schemas**: Zod validation ensures data integrity across the application

### Authentication and Authorization
Currently, the application operates without authentication to maintain simplicity and focus on core trading simulation features. This design choice supports the educational and demonstration purposes of the platform.

### UI Component System
The application leverages **shadcn/ui** components built on top of **Radix UI** primitives, providing:
- **Accessible components**: ARIA-compliant UI elements
- **Consistent theming**: CSS variables for easy customization
- **Dark mode support**: Built-in theming system
- **Professional appearance**: Financial industry-appropriate styling with custom trading-specific colors
- **Advanced Charting**: Integration with lightweight-charts for professional trading visualizations
- **Options Trading Interface**: Specialized modals for duration selection and contract configuration

## External Dependencies

### Core Framework Dependencies
- **React & React DOM**: Frontend framework for component-based UI development
- **Express**: Lightweight Node.js web framework for API development
- **TypeScript**: Type safety and enhanced development experience
- **Vite**: Modern build tool with hot module replacement

### UI and Styling
- **Tailwind CSS**: Utility-first CSS framework for responsive design
- **shadcn/ui**: Pre-built accessible component library
- **Radix UI**: Primitive components for complex UI patterns
- **Lucide React**: Modern icon library
- **Font Awesome**: Additional icon resources

### State Management and Data Fetching
- **TanStack Query**: Powerful data synchronization for React applications
- **React Hook Form**: Performant forms with easy validation
- **Hookform Resolvers**: Integration between React Hook Form and validation libraries

### Development and Build Tools
- **tsx**: TypeScript execution for Node.js development
- **esbuild**: Fast JavaScript bundler for production builds
- **PostCSS & Autoprefixer**: CSS processing and vendor prefixing

### Validation and Schema Management
- **Zod**: TypeScript-first schema validation
- **Drizzle-zod**: Integration between Drizzle ORM and Zod schemas

### Database Infrastructure
- **Drizzle ORM**: Type-safe SQL toolkit and query builder
- **@neondatabase/serverless**: PostgreSQL-compatible serverless database driver
- **Drizzle-kit**: Database migration and management tools

### Additional Utilities
- **date-fns**: Modern JavaScript date utility library
- **clsx**: Utility for constructing className strings conditionally
- **class-variance-authority**: Utility for managing CSS class variations
- **nanoid**: Secure URL-friendly unique string ID generator