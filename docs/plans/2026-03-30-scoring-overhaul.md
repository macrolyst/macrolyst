# Scoring Algorithm Overhaul — Complete Plan

## Problem

Current win rate: **27.5%** (11 of 40 picks). Average return: **-2.38%**. The system recommends 10 buys every day regardless of market conditions, uses 12-month analyst targets as the heaviest factor for 1-day predictions, ignores risk metrics, ignores macro data, and has no market regime awareness.

## Root Causes

1. **No market regime filter.** Recommends 10 longs into a falling market.
2. **Analyst upside dominates (30%)** but is a 12-month signal used for 1-day predictions.
3. **Risk metrics calculated but never used in scoring** — volatility, Sharpe, max drawdown are display-only.
4. **Macro data collected but never used** — VIX, Treasury yields, Fed funds just sit in market_summary.
5. **No mean reversion signal** — doesn't identify oversold bounce candidates properly.
6. **Binary technical thresholds** — RSI 5 and RSI 29 score identically.
7. **No minimum quality gate** — all 10 picks could score 30/100.
8. **No sector diversification** — all 10 could be from one sector.
9. **Momentum rewards chasing** — buying stocks already up favors buying the top.
10. **No relative strength** — doesn't compare stocks to SPY/market.
11. **Earnings history ignored** — past beat/miss rates not used.
12. **Sector momentum ignored** — hot/cold sectors not factored in.
13. **Gap analysis missing** — overnight gaps that mean-revert not detected.
14. **Volume doesn't confirm price** — volume and price moves scored independently.

## Data Already Available But Unused in Scoring

| Data | Source | Currently | Should Be |
|---|---|---|---|
| VIX | FRED | Display only | Market regime filter |
| Treasury 10Y/2Y | FRED | Display only | Risk environment signal |
| Fed Funds Rate | FRED | Display only | Macro context |
| Annual Volatility | Calculated | Display only | Risk penalty in score |
| Sharpe Ratio | Calculated | Display only | Quality filter |
| Max Drawdown | Calculated | Display only | Risk penalty |
| Market Breadth | Calculated | Display only | Market regime filter |
| Advancers/Decliners | Calculated | Display only | Market regime filter |
| Earnings Calendar | Finnhub | Display only | Earnings proximity flag |
| Past Earnings Results | Finnhub | Display only | Earnings consistency signal |
| SPY Daily Prices | yfinance | Catalyst only | Relative strength benchmark |
| SPY Hourly Bars | yfinance | Catalyst only | Market direction signal |
| 200-day SMA | Calculated | Stored but unused | Long-term trend signal |
| Forward P/E | yfinance | Stored but unused | Valuation signal |
| Dividend Yield | yfinance | Stored but unused | Defensive signal |
| 52-week High/Low | yfinance | Scanner only | Range position signal |
| Sector Performance | Calculated | Display only | Sector rotation signal |
| Open Price | yfinance | Stored | Gap analysis signal |
| Previous Close | yfinance | Stored | Gap analysis signal |

---

## New Scoring Architecture

### 10 Scoring Factors (up from 5)

Always 10 picks. Every piece of available data feeds into the score.

```python
WEIGHTS = {
    "technical":          0.20,  # Continuous RSI, MACD, MA, Bollinger
    "mean_reversion":     0.15,  # Oversold bounce with fundamental support
    "relative_strength":  0.12,  # Performance vs SPY (market-relative)
    "momentum":           0.10,  # Price momentum with chase penalty
    "volume_confirmed":   0.10,  # Volume confirming price direction
    "sector_rotation":    0.08,  # Favor hot sectors, avoid cold ones
    "analyst_upside":     0.08,  # Analyst targets with confidence weighting
    "risk_quality":       0.07,  # Volatility, Sharpe, drawdown penalty
    "news_sentiment":     0.05,  # Keyword sentiment weighted by count/recency
    "earnings_edge":      0.05,  # Earnings beat history + proximity risk
}
# Total: 100%
```

---

## Phase 1: Market Regime Layer

Before scoring individual stocks, assess the market environment. This adjusts the scoring weights dynamically.

### Market Regime Score (0-100)

```python
regime_score = (
    vix_signal         * 0.25 +   # Fear gauge
    breadth_signal     * 0.30 +   # Market breadth (advancers vs decliners)
    spy_trend_signal   * 0.25 +   # SPY trend + momentum
    yield_curve_signal * 0.20     # 10Y-2Y spread
)
```

**VIX Signal (0-100) — continuous interpolation:**
```python
# Continuous: VIX 12=95, 15=80, 20=60, 25=40, 30=20, 35+=5
vix_signal = clip(100 - (vix - 10) * 4, 5, 95)
```

**Breadth Signal (0-100):**
```python
breadth_ratio = advancers / total_stocks
breadth_signal = breadth_ratio * 100
```

**SPY Trend Signal (0-100):**
```python
spy_signal = 0
if spy_close > spy_sma_50:  spy_signal += 30    # Above short-term trend
if spy_close > spy_sma_200: spy_signal += 25    # Above long-term trend
spy_5d_change = ((spy_close / spy_close_5d_ago) - 1) * 100
spy_signal += clip(spy_5d_change * 5 + 25, 0, 45)  # Recent momentum, up to 45 pts
```

**Yield Curve Signal (0-100):**
```python
spread = treasury_10y - treasury_2y
yield_signal = clip(spread * 30 + 50, 10, 90)
# Positive spread = bullish, inverted = bearish
```

### Regime Weight Adjustments

Always pick 10 stocks. Regime shifts which factors dominate.

| Regime Score | Label | Key Weight Shifts |
|---|---|---|
| 75-100 | **Strong Bull** | Momentum +5%, Mean reversion -5% |
| 55-74 | **Mild Bull** | Standard weights |
| 40-54 | **Neutral** | Risk quality +3%, Momentum -3% |
| 25-39 | **Mild Bear** | Mean reversion +10%, Momentum -5%, Analyst -5% |
| 0-24 | **Strong Bear** | Mean reversion +15%, Risk quality +5%, Momentum -10%, Analyst -5%, Sector rotation -5% |

Store in `market_summary`: `regime_score`, `regime_label`.

---

## Phase 2: All 10 Sub-Score Formulas

### A. Technical Score (0-100) — Continuous Signals

```python
# RSI component (0-35 points) — continuous curve
if rsi <= 15:
    rsi_pts = 35                                # Extremely oversold
elif rsi <= 50:
    rsi_pts = 35 * (50 - rsi) / 35             # Linear decline
elif rsi <= 70:
    rsi_pts = 0                                 # Neutral
else:
    rsi_pts = -15 * min((rsi - 70) / 30, 1.0)  # Overbought penalty (max -15)

# MACD component (0-25 points)
if macd_hist > 0 and prev_macd_hist <= 0:
    macd_pts = 25                     # Fresh bullish crossover
elif macd_hist > 0:
    macd_pts = 15                     # Sustained bullish
elif macd_hist > prev_macd_hist:
    macd_pts = 10                     # Converging (improving)
else:
    macd_pts = 0                      # Bearish

# Trend component (0-20 points)
above_sma50 = 10 if close > sma_50 else 0
above_sma200 = 10 if close > sma_200 else 0
trend_pts = above_sma50 + above_sma200

# Bollinger component (0-15 points) — continuous position
bb_width = bb_upper - bb_lower
bb_position = (close - bb_lower) / bb_width if bb_width > 0 else 0.5
if bb_position < 0:
    bb_pts = 15                       # Below lower band
elif bb_position < 0.2:
    bb_pts = 10                       # Near lower band
elif bb_position > 0.8:
    bb_pts = -5                       # Near upper band (stretched)
else:
    bb_pts = 0

# 52-week range position bonus (0-5 points)
range_52w = week52_high - week52_low
if range_52w > 0:
    range_pos = (close - week52_low) / range_52w
    range_pts = 5 if range_pos < 0.25 else 0  # Near 52-week low = value
else:
    range_pts = 0

score_technical = clip(rsi_pts + macd_pts + trend_pts + bb_pts + range_pts, 0, 100)
```

### B. Mean Reversion Score (0-100) — Oversold Bounce Detection

```python
# Oversold depth (0-30 points) — how far has it fallen?
drop_5d = -change_5d  # Positive if stock dropped
depth_pts = clip(drop_5d * 3, 0, 30)  # 10% drop = 30 pts, continuous

# Fundamental support (0-25 points) — is the drop overdone?
upside_pts = clip(upside_pct / 20 * 12, 0, 12)     # Analyst upside
value_pts = 8 if (pe_ratio and forward_pe and forward_pe < pe_ratio) else 0  # Forward P/E improving
pe_discount = 5 if (pe_ratio and sector_pe_avg and pe_ratio < sector_pe_avg * 0.8) else 0
fundamental_pts = upside_pts + value_pts + pe_discount

# Technical bounce signals (0-25 points)
rsi_bounce = clip((40 - rsi) * 0.8, 0, 15) if rsi < 40 else 0
bb_bounce = 10 if bb_position < 0.15 else (5 if bb_position < 0.3 else 0)
bounce_pts = rsi_bounce + bb_bounce

# Gap down reversal (0-20 points)
# If stock gapped down (open << prev close) but has support, likely bounces
gap_pct = ((open_today - prev_close) / prev_close) * 100 if prev_close else 0
gap_pts = clip(-gap_pct * 3, 0, 20)  # 5% gap down = 15 pts

score_mean_reversion = clip(depth_pts + fundamental_pts + bounce_pts + gap_pts, 0, 100)
```

### C. Relative Strength Score (0-100) — Performance vs SPY

How the stock performs relative to the market. Stocks that outperform SPY on down days and keep up on up days are stronger.

```python
# 5-day relative strength
stock_5d = change_5d
spy_5d = spy_change_5d
relative_5d = stock_5d - spy_5d  # Positive = outperforming SPY

# 20-day relative strength
stock_20d = change_20d
spy_20d = spy_change_20d
relative_20d = stock_20d - spy_20d

# Blended relative strength
relative_blend = relative_5d * 0.6 + relative_20d * 0.4

# Normalize: +10% relative = 100, -10% relative = 0
score_relative = clip((relative_blend + 10) / 20 * 100, 0, 100)

# Bonus: Outperforming on down days is extra bullish
if spy_5d < -2 and relative_5d > 0:
    score_relative = min(score_relative + 15, 100)  # Held up while market dropped
```

### D. Momentum Score (0-100) — With Chase Penalty

```python
short_mom = change_5d
long_mom = change_20d

# Acceleration: is momentum increasing or fading?
acceleration = short_mom - (long_mom * 5 / 20)

# Chase penalty — buying stocks up 15%+ in 5 days is dangerous
chase_penalty = 0
if short_mom > 15:
    chase_penalty = -25
elif short_mom > 10:
    chase_penalty = -15
elif short_mom > 7:
    chase_penalty = -5

# Base momentum
raw = short_mom * 0.4 + long_mom * 0.3 + acceleration * 0.3
score_momentum = clip((raw + 10) / 20 * 100 + chase_penalty, 0, 100)
```

### E. Volume-Confirmed Score (0-100) — Volume Validates Price

Volume alone means nothing. Volume confirming a price move is the real signal.

```python
import math

# Base volume score — smooth log curve (no discontinuity)
base_vol = clip(35 * math.log2(vol_ratio + 1), 0, 70) if vol_ratio > 0 else 0

# Volume-price confirmation bonus (0-30 points)
# High volume + price up = accumulation (bullish)
# High volume + price down = distribution (bearish for longs)
# Low volume + price move = weak/unreliable

if vol_ratio >= 1.5 and change_1d > 0:
    confirmation = 30     # Strong buying on high volume
elif vol_ratio >= 1.5 and change_1d < -2:
    confirmation = -15    # Heavy selling = bearish (penalty)
elif vol_ratio < 0.7 and abs(change_1d) > 2:
    confirmation = -10    # Big move on low volume = unreliable
else:
    confirmation = 0

score_volume_confirmed = clip(base_vol + confirmation, 0, 100)
```

### F. Sector Rotation Score (0-100) — Ride Hot Sectors

```python
# sector_avg_change = average 1-day change for this stock's sector (already calculated)
# market_avg_change = average 1-day change of all stocks

sector_relative = sector_avg_change - market_avg_change

# Sector momentum (is this sector outperforming?)
# +2% relative = strong, -2% = weak
sector_momentum_pts = clip((sector_relative + 2) / 4 * 60, 0, 60)

# Sector breadth (what % of sector is advancing?)
sector_advance_pct = sector_advancers / sector_stock_count * 100
sector_breadth_pts = clip(sector_advance_pct / 100 * 40, 0, 40)

score_sector_rotation = clip(sector_momentum_pts + sector_breadth_pts, 0, 100)
```

### G. Analyst Upside Score (0-100) — With Confidence

```python
upside_pct = ((target_mean / close) - 1) * 100

# Base upside score (20% upside = 100)
base = clip(upside_pct / 20 * 100, 0, 100)

# Confidence multiplier based on analyst coverage
if num_analysts >= 20:    confidence = 1.0
elif num_analysts >= 10:  confidence = 0.85
elif num_analysts >= 5:   confidence = 0.7
elif num_analysts >= 2:   confidence = 0.5
else:                     confidence = 0.3

# Consensus tightness bonus
if target_high and target_low and target_mean > 0:
    spread = (target_high - target_low) / target_mean
    consensus_bonus = 10 if spread < 0.3 else (5 if spread < 0.5 else 0)
else:
    consensus_bonus = 0

# Wall Street recommendation boost
rec_boost = 0
if recommendation in ("strong_buy", "buy"):
    rec_boost = 10
elif recommendation == "hold":
    rec_boost = 0
elif recommendation in ("sell", "strong_sell"):
    rec_boost = -15

score_analyst = clip(base * confidence + consensus_bonus + rec_boost, 0, 100)
```

### H. Risk Quality Score (0-100) — Penalize Risky Stocks

```python
# Volatility (0-35 points) — lower = better, continuous
vol_pts = clip(35 - (annual_volatility - 10) * 0.7, 0, 35)

# Sharpe ratio (0-30 points) — continuous
sharpe_pts = clip(sharpe_ratio * 15, 0, 30)

# Max drawdown (0-20 points) — smaller drawdown = higher score
dd_pts = clip(20 - max_drawdown_pct, 0, 20)

# Dividend yield bonus (0-15 points) — stable dividend payers
div_pts = 0
if dividend_yield and dividend_yield > 0:
    div_pts = clip(dividend_yield * 5, 0, 15)  # 3% yield = 15 pts

score_risk = clip(vol_pts + sharpe_pts + dd_pts + div_pts, 0, 100)
```

### I. News Sentiment Score (0-100) — Weighted by Count & Recency

```python
if has_company_news and len(company_articles) > 0:
    # Sort articles newest first (already sorted by datetime)
    sentiments = [a.sentiment for a in company_articles]

    # Exponential decay weights — recent articles matter more
    decay_weights = [0.85 ** i for i in range(len(sentiments))]
    weighted_sent = sum(s * w for s, w in zip(sentiments, decay_weights)) / sum(decay_weights)

    # Base score from weighted sentiment (-1 to +1 → 0 to 80)
    base = (weighted_sent + 1) / 2 * 80

    # Article count confidence boost (0-20)
    count_boost = min(len(company_articles), 5) * 4  # Up to +20 for 5+ articles

    score_news = clip(base + count_boost, 0, 100)

elif has_market_news:
    # Fallback: use overall market news sentiment
    market_sent = avg_market_sentiment
    score_news = clip((market_sent + 1) / 2 * 60 + 20, 20, 70)  # Narrower range

else:
    score_news = 50  # Neutral — no news
```

### J. Earnings Edge Score (0-100) — History + Proximity Risk

Uses past earnings beat/miss data and upcoming earnings calendar.

```python
# Earnings beat history (0-60 points)
# Look at this stock's past earnings in our data
past_earnings_for_ticker = [e for e in past_earnings if e.ticker == ticker]

if len(past_earnings_for_ticker) >= 2:
    beats = sum(1 for e in past_earnings_for_ticker if e.surprise_pct > 0)
    total = len(past_earnings_for_ticker)
    beat_rate = beats / total

    # Consistent beater = higher score
    beat_pts = clip(beat_rate * 60, 0, 60)

    # Average surprise magnitude bonus
    avg_surprise = mean(e.surprise_pct for e in past_earnings_for_ticker)
    surprise_bonus = clip(avg_surprise * 2, -10, 20)

    earnings_history_pts = beat_pts + surprise_bonus
elif len(past_earnings_for_ticker) == 1:
    e = past_earnings_for_ticker[0]
    earnings_history_pts = 40 if e.surprise_pct > 0 else 20
else:
    earnings_history_pts = 35  # No data, neutral

# Earnings proximity risk (0 to -30 penalty)
has_earnings_soon = ticker in upcoming_earnings_next_2_days
if has_earnings_soon:
    proximity_penalty = -30  # High risk of big gap
else:
    proximity_penalty = 0

# Post-earnings drift bonus (0-10 points)
# If stock just beat earnings in last 5 days, momentum may continue
just_beat = any(
    e.surprise_pct > 5 and days_since(e.date) <= 5
    for e in past_earnings_for_ticker
)
drift_bonus = 10 if just_beat else 0

score_earnings = clip(earnings_history_pts + proximity_penalty + drift_bonus, 0, 100)
```

---

## Phase 3: Sector Diversification

After scoring, enforce diversity:

```python
# Always pick exactly 10, but diversify across sectors
picks = []
sector_counts = {}
MAX_PER_SECTOR = 3

for stock in ranked_stocks:
    if len(picks) >= 10:
        break
    sector = stock.sector
    if sector_counts.get(sector, 0) >= MAX_PER_SECTOR:
        continue
    picks.append(stock)
    sector_counts[sector] = sector_counts.get(sector, 0) + 1

# If diversity filter left us short, fill from top-ranked skipped
if len(picks) < 10:
    for stock in ranked_stocks:
        if len(picks) >= 10:
            break
        if stock not in picks:
            picks.append(stock)
```

---

## Phase 4: Fix Return Evaluation

Lock 5d/10d/20d returns at exact trading day offsets:

```python
# 1-day: Lock to next trading day's close (already works)
# 5-day: Lock at exactly 5 trading days after pick
# 10-day: Lock at exactly 10 trading days after pick
# 20-day: Lock at exactly 20 trading days after pick

# Only set return if:
#   1. Exact N trading days have passed
#   2. Return is currently NULL (never overwrite a locked return)

if return_5d is NULL and trading_days_since_pick >= 5:
    close_on_day_5 = get_close_at_offset(pick_date, 5)
    return_5d = ((close_on_day_5 / price_at_pick) - 1) * 100
    # Locked forever
```

---

## Phase 5: Enhanced Reason Generation

Update reason strings to reflect new factors:

```python
reasons = []

# Market regime context
reasons.append(f"Market regime: {regime_label} (score {regime_score}/100)")

# Top contributing factors (show top 3 by weighted contribution)
contributions = sorted([
    ("Technical", score_technical * weight_technical),
    ("Mean Reversion", score_mean_reversion * weight_mean_reversion),
    ("Relative Strength", score_relative * weight_relative),
    # ... all 10
], key=lambda x: x[1], reverse=True)

for name, contrib in contributions[:3]:
    reasons.append(f"Strong signal: {name} ({contrib:.1f} weighted pts)")

# Specific highlights
if rsi < 30: reasons.append(f"RSI oversold at {rsi:.1f}")
if relative_5d > 3: reasons.append(f"Outperforming SPY by {relative_5d:.1f}% over 5 days")
if vol_ratio > 2 and change_1d > 0: reasons.append(f"Accumulation: {vol_ratio:.1f}x volume on up day")
if has_earnings_soon: reasons.append("⚠ Earnings within 2 days — elevated risk")
if beat_rate > 0.8: reasons.append(f"Consistent earnings beater ({beat_rate*100:.0f}% beat rate)")
if sector_relative > 1: reasons.append(f"Sector ({sector}) outperforming market")
if gap_pct < -3: reasons.append(f"Gap down {gap_pct:.1f}% — potential reversal")
if dividend_yield > 2: reasons.append(f"Dividend yield {dividend_yield:.1f}%")
```

---

## Implementation Order

### Step 1: Config Updates
**File:** `scripts/config.py`
- New 10-factor weight dictionary
- Regime weight adjustment tables
- New constants: MAX_PER_SECTOR=3, regime thresholds

### Step 2: Market Regime Calculation
**File:** `scripts/03_transform.py`
- Add `calculate_market_regime()` using VIX, breadth, SPY trend, yield curve
- Store in market_summary output
- Returns regime_label and adjusted weights

### Step 3: SPY Benchmark Data
**File:** `scripts/03_transform.py`
- Calculate SPY 5d/20d changes from daily_prices (SPY is already fetched)
- Calculate SPY SMA50/SMA200
- Pass to relative strength calculation

### Step 4: New Sub-Score Functions
**File:** `scripts/03_transform.py`
- Rewrite `score_technical` — continuous RSI, MACD states, dual MA, BB position, 52w range
- Add `score_mean_reversion` — drop depth, fundamental support, gap reversal
- Add `score_relative_strength` — vs SPY 5d/20d, down-day outperformance bonus
- Rewrite `score_momentum` — chase penalty, acceleration
- Add `score_volume_confirmed` — volume-price confirmation
- Add `score_sector_rotation` — sector relative momentum + breadth
- Rewrite `score_analyst` — confidence, consensus, recommendation
- Add `score_risk_quality` — volatility, Sharpe, drawdown, dividend
- Rewrite `score_news` — recency weighting, count boost, market fallback
- Add `score_earnings_edge` — beat history, proximity penalty, post-earnings drift

### Step 5: Composite Score Assembly
**File:** `scripts/03_transform.py`
- Apply regime-adjusted weights to all 10 factors
- Rank all stocks
- Apply sector diversification (max 3 per sector)
- Select top 10

### Step 6: Enhanced Reason Generation
**File:** `scripts/03_transform.py`
- Show regime context
- Top 3 contributing factors
- Specific technical/fundamental highlights

### Step 7: DB Write Updates
**File:** `scripts/04_write_db.py`
- Write new score columns to stock_scores
- Write regime to market_summary
- Fix return locking for 5d/10d/20d

### Step 8: Schema Updates
**File:** `src/lib/db/schema/analysis.ts` (macrolyst repo)
- Add to stock_scores: `score_mean_reversion`, `score_risk_quality`, `score_relative_strength`, `score_sector_rotation`, `score_volume_confirmed`, `score_earnings_edge`
- Add to market_summary: `regime_score`, `regime_label`
- Add to picks_history: `regime_label`, `composite_score_at_pick`
- Run `npx drizzle-kit generate && npx drizzle-kit push`

### Step 9: Frontend Updates (macrolyst repo)
- Show regime label on dashboard
- Update score breakdown to show 10 factors (or top 7 with "show more")
- Show earnings warning flag on picks
- Display relative strength and sector rotation info

---

## Expected Impact

| Problem | Fix | Expected Improvement |
|---|---|---|
| Blind longs in crash | Regime shifts weights to mean reversion | Picks bounce candidates on down days |
| 27.5% win rate | 10 factors using all data | Target 45-55% win rate |
| All picks from 1 sector | Max 3 per sector | Better diversification |
| Analyst targets dominate | Reduced to 8%, add confidence | More relevant signals |
| Binary thresholds | Continuous scoring | Better precision |
| No risk awareness | Risk quality factor | Fewer blowup picks |
| Earnings surprises | Proximity penalty + beat history | Fewer gap-down surprises |
| Chasing tops | Chase penalty in momentum | Avoid buying peaks |
| No market comparison | Relative strength vs SPY | Find true outperformers |
| Volume noise | Volume-price confirmation | Only reward meaningful volume |
| Sector blindness | Sector rotation signal | Ride hot sectors |
| Gap reversals missed | Gap analysis in mean reversion | Catch overnight overreactions |

---

## What This Does NOT Change

- Pipeline schedule (still runs 6 AM CDT weekdays)
- Data sources (still yfinance, Finnhub, FRED — no new APIs)
- Number of stocks analyzed (still full S&P 500)
- Always 10 picks per day
- Data retention (still 45 days)
- Frontend architecture and existing pages
- Paper trading mechanics
- Scanner logic (separate from scoring)

This is a scoring algorithm overhaul in `03_transform.py`, `04_write_db.py`, and `config.py` in the pipeline repo, plus minor schema additions and frontend display updates in the macrolyst repo.
