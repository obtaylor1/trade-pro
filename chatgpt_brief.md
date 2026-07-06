# Trade Pro — App Project Brief & Context for ChatGPT

This brief provides a comprehensive summary of the **Trade Pro** application, its tech stack, architecture, database patterns, and custom design layouts. Paste this directly into ChatGPT to bring it up to speed on the codebase.

---

## 1. Project Overview

**Trade Pro** is a premium fintech paper trading and decision-support web application. It is designed to act as a **guided decision tool** for beginner-to-intermediate traders rather than a professional trading terminal. 

The core user experience revolves around the **"Choose a Trade"** flow:
1. **Choose a Market** (Forex, Stocks, Crypto, Commodities)
2. **Choose a Duration** (Quick Trade/Minutes, Short-Term/Days, Long-Term/Weeks+)
3. **Choose an Amount** (Presets like $0.25 to $25, or Custom Input)
4. **Get Recommendations**: The app immediately finds the best trade setups matching these options, calculates exact win/loss outcomes, projects return on investment, and lets users execute paper trades.

---

## 2. Technical Stack

* **Frontend**: React.js (Vite environment), TypeScript, TailwindCSS for responsive layout styles, TanStack Query (React Query) for state fetching, Lucide & Font Awesome 6 for icons.
* **Backend**: Node.js, Express.js server, TypeScript.
* **Database**: Drizzle ORM mapping to PostgreSQL.
* **Database Connectivity**: Implements a dual-driver system in `server/db.ts` that dynamically binds local Postgres client pools (`pg` library) or Neon Serverless HTTP/Websocket clients depending on the `DATABASE_URL` format.

---

## 3. Key Pages & Routes

* **`/` (Dashboard)**: Displays user balance, active positions summary, watchlists, and market trend charts.
* **`/markets` (Choose a Trade)**: The core guided trading selector. Features step selectors, a safety alert banner, a featured **Best Match** card, and a grid of secondary trade suggestions.
* **`/trades` (My Trades)**: Lists active and closed paper trades with realistic profit/loss calculators.
* **`/watchlist` & `/news`**: Tracks saved tickers and lists market articles (backed by a dynamic simulated RSS parser fallback to prevent blank lists).

---

## 4. Redesigned markets page ("Choose a Trade")

The `/markets` page has been redesigned to match a highly optimized, high-density dashboard widget system:

### Selector Steps Layout
* Wrapped in three distinct card boxes:
  * **Step 1 (Market Selector)**: 4 vertical cards (Forex, Stocks, Crypto, Commodities) displaying circular borders and large icons.
  * **Step 2 (Duration Selector)**: 3 vertical cards (Quick Trade/Minutes, Short-Term/Days, Long-Term/Weeks+) detailing trading horizons.
  * **Step 3 (Amount Selector)**: Preset amount buttons and a custom amount numeric input field.
* **Protection Shield Bar**: A centered warning notice placed directly under Steps 1 and 2: *"We only show trades that fit your amount. Your practice money is always protected."*

### Featured "Best Match" Card
A high-density horizontal card styled with a deep navy gradient, green borders, glowing shadow effects, and a top-left "Best Match for You" green ribbon. It is divided into 4 columns:
* **Column 1 (Identity)**: Displays rank badge `#1`, large overlapping circular flag graphics (e.g. EU/US flags for EUR/USD), pair symbols (36px text), action badge (BUY/SELL), and simple summary.
* **Column 2 (Outcomes & Timeline)**: Visual profit/loss boxes showing exact return amounts based on investment alongside a vertical green-dot timeline.
* **Column 3 (Trade Score)**: Centers a large semi-circular SVG arch gauge with score numbers (e.g. 75/100) and setup quality ratings.
* **Column 4 (Execution)**: Best times to trade, why-this-trade rationales, and the primary blue gradient **"Review Best Trade"** action button (50px height).

---

## 5. Key Architecture Features

* **Bearer Token Binding**: React Query binds authentication headers automatically on query clients.
* **Fallback News Feeds**: Prevents API empty states if external RSS feeds fail.
* **Flexible Durations Mapper**: Maps timeframes and backend styles (`SCALP`, `SWING`, `POSITION`) to frontend tabs (`quick`, `shortTerm`, `longTerm`), ensuring choices load recommendations dynamically without showing empty screens.
