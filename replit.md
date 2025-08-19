# Trading Application Simulator

## Overview

This is a comprehensive web-based trading application simulator built as a paper-trading platform. The application allows users to simulate sophisticated trading bot functionality by selecting different markets (commodities, crypto, stocks), viewing AI-generated trading opportunities, and executing simulated trades. The entire system is designed to provide a realistic trading experience without real financial risk, making it perfect for educational purposes and strategy testing.

The application features a modern, responsive interface with real-time market data integration, professional trading card layouts, comprehensive feedback systems, and detailed trading rationales. Each trading opportunity includes expert analysis explaining why it's the optimal choice at the current moment, covering technical indicators, market conditions, and fundamental factors. The system uses live market data from Alpha Vantage API combined with innovative micro and nano trading contracts, providing users with an intuitive way to understand trading concepts and strategies.

**Key Features:**
- **User Authentication**: Email-based registration and login for persistent trading accounts
- **Dynamic Portfolio Balance**: Real-time calculations based on user's starting capital and trading performance
- **Micro Trading**: Fractional commodity contracts (1/10th to 1/250th standard size) starting from $0.30
- **Micro Crypto Futures**: 0.1 BTC and 0.1 ETH contracts based on real market prices
- **Micro Options Trading**: Affordable options contracts ($0.25-$0.90) with 1 share per contract instead of 100
- **Real-Time Options Charts**: Professional charting with 30-minute, 4-hour, and daily timeframes
- **Options Duration Selection**: Weekly and monthly expiration choices with different risk/reward profiles
- **Greeks Integration**: Real-time Delta, Theta, Gamma, and Vega calculations for option pricing
- **Real-Time Data**: Live stock prices from Alpha Vantage API with intelligent fallback to realistic market simulation
- **Trade History Tracking**: Complete audit trail tied to individual user accounts
- **Educational Focus**: Trading rationales and risk management for all experience levels

## User Preferences

Preferred communication style: Simple, everyday language.

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