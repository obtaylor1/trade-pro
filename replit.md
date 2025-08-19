# Trading Application Simulator

## Overview

This is a comprehensive web-based trading application simulator built as a paper-trading platform. The application allows users to simulate sophisticated trading bot functionality by selecting different markets (commodities, stocks, crypto), viewing AI-generated trading opportunities, and executing simulated trades. The entire system is designed to provide a realistic trading experience without real financial risk, making it perfect for educational purposes and strategy testing.

The application features a modern, responsive interface with real-time-like updates, professional trading card layouts, and comprehensive feedback systems. It uses mock data to simulate market analysis and trading opportunities, providing users with an intuitive way to understand trading concepts and strategies.

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
The application uses an **in-memory storage system** implemented through a custom `MemStorage` class. This approach was chosen for simplicity and to eliminate external dependencies while providing realistic trading simulation data.

Storage architecture:
- **Mock data generation**: Pre-populated trading opportunities across three market categories
- **Runtime state management**: Temporary storage of trade executions and results
- **Type-safe schemas**: Zod validation ensures data integrity across the application
- **Scalable design**: Storage interface allows for easy migration to persistent databases

### Authentication and Authorization
Currently, the application operates without authentication to maintain simplicity and focus on core trading simulation features. This design choice supports the educational and demonstration purposes of the platform.

### UI Component System
The application leverages **shadcn/ui** components built on top of **Radix UI** primitives, providing:
- **Accessible components**: ARIA-compliant UI elements
- **Consistent theming**: CSS variables for easy customization
- **Dark mode support**: Built-in theming system
- **Professional appearance**: Financial industry-appropriate styling with custom trading-specific colors

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