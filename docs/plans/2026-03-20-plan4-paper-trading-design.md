# Plan 4: Paper Trading + Real-Time Prices -- Design Spec

## Overview

Add paper trading to Macrolyst. Users create a portfolio with simulated cash, search for any US stock, and buy/sell at near-real-time prices with realistic slippage. Holdings and watchlist show live-updating prices during market hours via client-side polling.

## Architecture

### Price API Layer (new)

Three API routes that wrap Finnhub:

- `GET /api/prices/quote?symbol=AAPL` -- returns current quote (price, change, high, low, volume) for any US ticker. Used when user selects a stock to trade.
- `GET /api/prices/batch?symbols=AAPL,MSFT,GOOG` -- returns quotes for multiple tickers in one call. Used to update holdings and watchlist prices.
- `GET /api/search?q=apple` -- returns matching tickers/names from Finnhub symbol search. Used for the ticker search input on the trading page.

All three use in-memory caching (5-second TTL for quotes, 1-hour for search results) to stay within Finnhub free tier limits (60 calls/minute).

### Client-Side Polling

- Trading page and watchlist page poll `/api/prices/batch` every 5 seconds with the user's held/watched tickers.
- Polling starts on page mount, stops on unmount.
- During off-hours (before 9:30 AM / after 4 PM ET, weekends), polling stops and prices show last close with a "Market Closed" indicator.
- Price changes animate with a brief green/red flash.

### Server Actions (new)

- `createPortfolio(startingBalance)` -- creates portfolio for current user with chosen balance ($10k, $50k, $100k). One portfolio per user.
- `executeTrade(portfolioId, ticker, action, shares, currentPrice)` -- validates cash (buy) or shares (sell), applies slippage (0.01-0.05% random spread), creates trade record, updates portfolio cash. Runs in a DB transaction.
- `addToWatchlist(ticker)` / `removeFromWatchlist(ticker)` -- manages user's watchlist.

### Market Hours Detection

Utility function `isMarketOpen()` checks if current time is within 9:30 AM - 4:00 PM Eastern, Monday-Friday. Used by:
- Polling logic (poll only during market hours)
- Trade execution (use real-time price during hours, last close off-hours)
- UI (show "Market Closed" / "Market Open" badge)

## Pages

### Trading Page (`/dashboard/trading`)

**First visit (no portfolio):**
- "Start Paper Trading" card with balance selection ($10k, $50k, $100k)
- Brief explanation of paper trading

**With portfolio:**

Top section -- portfolio summary cards:
- Total Value (cash + holdings at current prices)
- Cash Available
- Total Gain/Loss ($ and %)
- Day's Change

Holdings table:
- Ticker, Name, Shares, Avg Cost, Current Price, Market Value, Gain/Loss ($, %)
- Current Price updates every 5 seconds with green/red flash
- Click a holding row to pre-fill sell form

Buy/Sell form:
- Ticker search input (Finnhub symbol search, autocomplete)
- Once ticker selected: show current price (live updating), company name
- Shares input (whole numbers only)
- Estimated total display (shares x current price)
- Buy / Sell toggle
- Execute button
- Slippage notice: "Executed at market price with simulated spread"

Trade history:
- Date, Ticker, Action (Buy/Sell), Shares, Price, Total
- Most recent first
- Paginated or scrollable

### Watchlist Page (`/dashboard/watchlist`)

- List of watched tickers with: Ticker, Name, Current Price, Day Change (%), Our Score (if in S&P 500)
- Prices poll every 5 seconds during market hours
- Add ticker via search input (same Finnhub search)
- Remove button per ticker
- "Buy" button per ticker navigates to trading page with ticker pre-filled
- Empty state with explanation

### Buy Buttons on Existing Pages

- Recommendations page: "Buy" button in expanded stock detail
- Scanners page: "Buy" button per scanner result row
- Both navigate to `/dashboard/trading?buy=TICKER`

## Trade Execution Flow

1. User selects ticker, enters shares, clicks Buy
2. Client sends `executeTrade(portfolioId, ticker, "buy", shares, currentPrice)`
3. Server action:
   a. Fetch fresh price from Finnhub (don't trust client price)
   b. Apply slippage: `price * (1 + random(0.0001, 0.0005))` for buy, `price * (1 - random(0.0001, 0.0005))` for sell
   c. Calculate total = shares * slipped price
   d. Validate: total <= current_cash (buy) or shares <= held_shares (sell)
   e. In a DB transaction: insert trade record, update portfolio current_cash
4. Return success with executed price and total
5. Client refreshes portfolio display

## Holdings Computation

Holdings are computed on-read, not stored (per spec):

```sql
SELECT ticker,
  SUM(CASE WHEN action='buy' THEN shares ELSE -shares END) AS shares,
  SUM(CASE WHEN action='buy' THEN total ELSE 0 END) /
    NULLIF(SUM(CASE WHEN action='buy' THEN shares ELSE 0 END), 0) AS avg_cost
FROM trades
WHERE portfolio_id = ?
GROUP BY ticker
HAVING SUM(CASE WHEN action='buy' THEN shares ELSE -shares END) > 0
```

## Slippage Model

Random spread between 0.01% and 0.05%:
- Buy: executed price = market price * (1 + spread)
- Sell: executed price = market price * (1 - spread)

This simulates bid-ask spread without overcomplicating. The spread is small enough to not frustrate users but large enough to prevent unrealistic perfect-price fills.

## Database

Existing tables used (no schema changes):
- `portfolios` -- id, user_id, name, starting_balance, current_cash, created_at
- `trades` -- id, portfolio_id, ticker, action, shares, price, total, executed_at
- `watchlist` -- id, user_id, ticker, added_at

## API Rate Limits

Finnhub free tier: 60 API calls/minute.

Budget per user on trading page:
- Batch price poll: 1 call every 5 seconds = 12 calls/min
- Ticker search: ~2-3 calls/min while typing

With server-side caching (5-sec TTL), multiple users polling the same tickers share cached results. For a small user base this is fine. If scaling becomes an issue, increase cache TTL or upgrade Finnhub plan.

## Off-Hours Behavior

- `isMarketOpen()` returns false outside 9:30 AM - 4:00 PM ET, Mon-Fri
- No polling, show "Market Closed" badge
- Prices show previous close (from Finnhub quote's `pc` field or from our DB)
- Trades still allowed at last close price (with slippage) -- users can place paper trades anytime
