---
name: yahoo-finance2 v3 usage
description: How to correctly instantiate and use yahoo-finance2 v3 in this Node 20 project
---

The installed version of yahoo-finance2 is v3, which requires class instantiation.

**Rule:** Import the default export as a class, then `new` it with options.

```typescript
import YahooFinanceLib from "yahoo-finance2";
const yf: any = new (YahooFinanceLib as any)({ suppressNotices: ["yahooSurvey", "ripHistorical"] });
// then use: yf.quote(symbol), yf.options(symbol), etc.
```

**Why:** v3 dropped the singleton default-export pattern. `yahooFinance.quote()` directly throws "Call new YahooFinance() first." The suppressNotices option only accepts "yahooSurvey" and "ripHistorical" — NOT "ripHistoricalRows" (crashes constructor). Node 20 works fine despite the "Requires Node >= 22" warning.

**How to apply:** Any time yahoo-finance2 is used in a new file or upgraded, use this class pattern.
