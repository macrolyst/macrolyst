import type { StockScore } from "@/lib/db/queries";
import { formatCurrency, formatMarketCap } from "@/lib/format";
import { ChangeBadge } from "@/components/ui/change-badge";
import Link from "next/link";
import { ScoreBar } from "@/components/ui/score-bar";

function getRsiExplanation(rsi: number | null): { text: string; color: string } {
  if (rsi === null) return { text: "No RSI data available", color: "#94a3b8" };
  if (rsi < 30) return { text: "Sold aggressively -- bounce potential coming", color: "#F87171" };
  if (rsi < 40) return { text: "Close to oversold -- worth watching for entry", color: "#FBBF24" };
  if (rsi > 70) return { text: "Bought heavily -- easy gains may be over", color: "#F87171" };
  if (rsi > 60) return { text: "Leaning overbought -- momentum is strong but watch for pullback", color: "#FBBF24" };
  return { text: "Neutral zone -- no extreme momentum signal", color: "#94a3b8" };
}

function getMacdExplanation(macd: number | null): { text: string; color: string } {
  if (macd === null) return { text: "No MACD data available", color: "#94a3b8" };
  if (macd > 0) return { text: "Buying momentum stronger than selling -- bullish signal", color: "#34D399" };
  return { text: "Selling momentum currently stronger -- bearish pressure", color: "#F87171" };
}

function getMaExplanation(price: number | null, sma50: number | null): { text: string; color: string } {
  if (!price || !sma50) return { text: "Insufficient moving average data", color: "#94a3b8" };
  if (price > sma50) return { text: "Price above 50-day MA -- short-term trend is positive", color: "#34D399" };
  return { text: "Price below 50-day MA -- short-term trend weak but can signal value", color: "#FBBF24" };
}

function getVolumeExplanation(volRatio: number | null): { text: string; color: string } {
  if (volRatio === null) return { text: "No volume data available", color: "#94a3b8" };
  if (volRatio >= 2) return { text: "Volume significantly above average -- big players are active", color: "#FBBF24" };
  if (volRatio >= 1.5) return { text: "Volume elevated -- increased interest in this stock", color: "#34D399" };
  return { text: "Volume near normal levels -- no unusual activity", color: "#94a3b8" };
}

function getBollingerExplanation(price: number | null, bbUpper: number | null, bbLower: number | null): { label: string; text: string; color: string } {
  if (!price || !bbUpper || !bbLower) return { label: "N/A", text: "Insufficient Bollinger data", color: "#94a3b8" };
  if (price < bbLower) return { label: "Below Lower Band", text: "Statistically oversold -- bounce is likely but not guaranteed", color: "#F87171" };
  if (price > bbUpper) return { label: "Above Upper Band", text: "Strong breakout but price may be stretched -- watch for pullback", color: "#FBBF24" };
  return { label: "Within Bands", text: "Trading in normal statistical range", color: "#94a3b8" };
}

function getTrendExplanation(price: number | null, sma50: number | null): { label: string; color: string; text: string } {
  if (!price || !sma50) return { label: "Unknown", color: "#94a3b8", text: "Insufficient data for trend analysis" };
  if (price > sma50) return { label: "Bullish", color: "#34D399", text: "Price above 50-day moving average -- short-term trend is positive" };
  return { label: "Bearish", color: "#F87171", text: "Price below 50-day moving average -- short-term trend is weak" };
}

function getReturnExplanation(ret: number | null): { text: string; color: string } {
  if (ret === null) return { text: "No return data available", color: "#94a3b8" };
  if (ret > 20) return { text: "Strong performer -- momentum tends to persist", color: "#34D399" };
  if (ret > 0) return { text: "Positive but modest -- stock has held up", color: "#34D399" };
  return { text: "Negative returns -- room to recover if conditions improve", color: "#FBBF24" };
}

function getSharpeExplanation(sharpe: number | null): { text: string; color: string } {
  if (sharpe === null) return { text: "No risk-adjusted return data", color: "#94a3b8" };
  if (sharpe > 1) return { text: "Excellent risk-adjusted returns -- getting paid well for the risk taken", color: "#34D399" };
  if (sharpe > 0) return { text: "Positive but modest risk-adjusted returns -- acceptable", color: "#FBBF24" };
  return { text: "Negative risk-adjusted returns -- risk is not being compensated", color: "#F87171" };
}

function get52wPosition(price: number | null, low: number | null, high: number | null): number {
  if (!price || !low || !high || high === low) return 50;
  return Math.max(0, Math.min(100, ((price - low) / (high - low)) * 100));
}

function TechnicalCard({ title, value, explanation, color }: { title: string; value: string; explanation: string; color: string }) {
  return (
    <div className="rounded-lg bg-(--surface-1) border border-(--border) p-3">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs text-(--text-secondary) uppercase tracking-wider">{title}</span>
        <span className="text-sm font-mono font-semibold" style={{ color }}>{value}</span>
      </div>
      <p className="text-xs text-(--text-secondary) leading-relaxed">{explanation}</p>
    </div>
  );
}

export function StockDetail({ stock }: { stock: StockScore }) {
  const rsiInfo = getRsiExplanation(stock.rsi);
  const macdInfo = getMacdExplanation(stock.macdHist);
  const maInfo = getMaExplanation(stock.price, stock.sma50);
  const volInfo = getVolumeExplanation(stock.volRatio);
  const bbInfo = getBollingerExplanation(stock.price, stock.bbUpper, stock.bbLower);
  const trendInfo = getTrendExplanation(stock.price, stock.sma50);
  const returnInfo = getReturnExplanation(stock.return1y);
  const sharpeInfo = getSharpeExplanation(stock.sharpeRatio);
  const rangePos = get52wPosition(stock.price, stock.yearLow, stock.yearHigh);

  return (
    <div className="mx-2 mb-2 rounded-lg bg-(--surface-2) border border-(--border) border-l-3 border-l-(--accent)/40 px-4 pb-5">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 py-5">

        {/* LEFT COLUMN */}
        <div className="space-y-5">

          {/* Buy button */}
          <Link
            href={`/dashboard/trading?buy=${stock.ticker}`}
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-(--up)/15 text-(--up) text-sm font-medium hover:bg-(--up)/25 transition-colors"
          >
            Buy {stock.ticker}
          </Link>

          {/* Score Breakdown */}
          <div>
            <p className="text-xs text-(--text-secondary) uppercase tracking-wider mb-3">Score Breakdown</p>
            <div className="space-y-2">
              <ScoreBar label="Analyst" value={stock.scoreAnalyst} color="#60A5FA" />
              <ScoreBar label="Technical" value={stock.scoreTechnical} color="#A78BFA" />
              <ScoreBar label="Momentum" value={stock.scoreMomentum} color="#34D399" />
              <ScoreBar label="Volume" value={stock.scoreVolume} color="#FBBF24" />
              <ScoreBar label="News" value={stock.scoreNews} color="#F472B6" />
            </div>
          </div>

          {/* Sector Position */}
          {stock.sectorRank && stock.sectorCount && (
            <div>
              <p className="text-xs text-(--text-secondary) uppercase tracking-wider mb-2">Sector Position</p>
              <p className="text-sm text-white">
                #{stock.sectorRank} of {stock.sectorCount} in <span className="text-(--accent)">{stock.sector}</span>
              </p>
              {stock.peRatio && stock.sectorPeAvg && (
                <p className="text-xs text-(--text-secondary) mt-1">
                  P/E {stock.peRatio.toFixed(1)} vs sector median {stock.sectorPeAvg.toFixed(1)}
                  {stock.peRatio < stock.sectorPeAvg
                    ? <span className="text-(--up) ml-1">-- trading at a discount</span>
                    : <span className="text-(--down) ml-1">-- trading at a premium</span>
                  }
                </p>
              )}
            </div>
          )}

          {/* Risk Profile */}
          <div>
            <p className="text-xs text-(--text-secondary) uppercase tracking-wider mb-2">Risk Profile</p>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg bg-(--surface-1) border border-(--border) p-2.5 text-center">
                <p className="text-[10px] text-(--text-secondary) uppercase">Volatility</p>
                <p className="text-sm font-semibold text-white mt-0.5">{stock.annualVolatility?.toFixed(1) ?? "--"}%</p>
              </div>
              <div className="rounded-lg bg-(--surface-1) border border-(--border) p-2.5 text-center">
                <p className="text-[10px] text-(--text-secondary) uppercase">Sharpe</p>
                <p className="text-sm font-semibold mt-0.5" style={{ color: sharpeInfo.color }}>
                  {stock.sharpeRatio?.toFixed(2) ?? "--"}
                </p>
              </div>
              <div className="rounded-lg bg-(--surface-1) border border-(--border) p-2.5 text-center">
                <p className="text-[10px] text-(--text-secondary) uppercase">Max Drop</p>
                <p className="text-sm font-semibold text-(--down) mt-0.5">
                  {stock.maxDrawdownPct ? `-${stock.maxDrawdownPct.toFixed(1)}%` : "--"}
                </p>
              </div>
            </div>
            <p className="text-xs text-(--text-secondary) mt-2 leading-relaxed">{sharpeInfo.text}</p>
          </div>

          {/* Why This Stock */}
          {stock.reasons && stock.reasons.length > 0 && (
            <div>
              <p className="text-xs text-(--text-secondary) uppercase tracking-wider mb-2">Why This Stock</p>
              <ul className="space-y-1.5">
                {stock.reasons.map((reason, i) => (
                  <li key={i} className="text-xs text-(--text-primary) flex gap-2 leading-relaxed">
                    <span className="text-(--accent) shrink-0 mt-0.5">&#x2192;</span>
                    {reason}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Key Fundamentals */}
          <div>
            <p className="text-xs text-(--text-secondary) uppercase tracking-wider mb-2">Key Fundamentals</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-(--surface-1) border border-(--border) p-2.5">
                <p className="text-[10px] text-(--text-secondary) uppercase">Target Price</p>
                <p className="text-sm font-semibold text-white mt-0.5">{formatCurrency(stock.targetMean)}</p>
              </div>
              <div className="rounded-lg bg-(--surface-1) border border-(--border) p-2.5">
                <p className="text-[10px] text-(--text-secondary) uppercase">Market Cap</p>
                <p className="text-sm font-semibold text-white mt-0.5">{formatMarketCap(stock.marketCap)}</p>
              </div>
              <div className="rounded-lg bg-(--surface-1) border border-(--border) p-2.5">
                <p className="text-[10px] text-(--text-secondary) uppercase">P/E Ratio</p>
                <p className="text-sm font-semibold text-white mt-0.5">{stock.peRatio?.toFixed(1) ?? "--"}</p>
              </div>
              <div className="rounded-lg bg-(--surface-1) border border-(--border) p-2.5">
                <p className="text-[10px] text-(--text-secondary) uppercase">Wall St. Rating</p>
                <p className="text-sm font-semibold text-white mt-0.5 capitalize">{stock.recommendation?.replace("_", " ") ?? "--"}</p>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Technical Indicators */}
        <div className="space-y-3">
          <p className="text-xs text-(--text-secondary) uppercase tracking-wider mb-1">Technical Indicators Explained</p>

          <TechnicalCard
            title="RSI (Relative Strength Index)"
            value={stock.rsi?.toFixed(1) ?? "--"}
            explanation={rsiInfo.text}
            color={rsiInfo.color}
          />

          <TechnicalCard
            title="MACD Momentum"
            value={stock.macdHist?.toFixed(3) ?? "--"}
            explanation={macdInfo.text}
            color={macdInfo.color}
          />

          <TechnicalCard
            title="Moving Averages"
            value={stock.sma50 ? `50d: $${stock.sma50.toFixed(0)}` : "--"}
            explanation={maInfo.text}
            color={maInfo.color}
          />

          <TechnicalCard
            title="Volume"
            value={stock.volRatio ? `${stock.volRatio.toFixed(2)}x avg` : "--"}
            explanation={volInfo.text}
            color={volInfo.color}
          />

          {/* 60-Day Range with visual slider */}
          <div className="rounded-lg bg-(--surface-1) border border-(--border) p-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-(--text-secondary) uppercase tracking-wider">60-Day Range</span>
            </div>
            <div className="flex items-center gap-2 text-xs mb-2">
              <span className="text-(--text-secondary) font-mono">{formatCurrency(stock.yearLow)}</span>
              <div className="flex-1 relative h-1.5 rounded-full bg-(--surface-3)">
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-(--accent) border-2 border-(--surface-1)"
                  style={{ left: `${rangePos}%` }}
                />
              </div>
              <span className="text-(--text-secondary) font-mono">{formatCurrency(stock.yearHigh)}</span>
            </div>
            <p className="text-xs text-(--text-secondary) leading-relaxed">
              {rangePos < 25
                ? "Near bottom of range -- deep value or ongoing trouble?"
                : rangePos > 75
                ? "Near top of range -- strong momentum but less upside room"
                : "Mid-range -- no extreme position in either direction"}
            </p>
          </div>

          <TechnicalCard
            title="Bollinger Bands"
            value={bbInfo.label}
            explanation={bbInfo.text}
            color={bbInfo.color}
          />

          <TechnicalCard
            title="Trend Direction"
            value={trendInfo.label}
            explanation={trendInfo.text}
            color={trendInfo.color}
          />

          <TechnicalCard
            title="1-Year Return"
            value={stock.return1y ? `${stock.return1y > 0 ? "+" : ""}${stock.return1y.toFixed(1)}%` : "--"}
            explanation={returnInfo.text}
            color={returnInfo.color}
          />

          {/* Recent Performance */}
          <div className="rounded-lg bg-(--surface-1) border border-(--border) p-3">
            <span className="text-xs text-(--text-secondary) uppercase tracking-wider">Recent Performance</span>
            <div className="grid grid-cols-2 gap-3 mt-2">
              <div>
                <p className="text-[10px] text-(--text-secondary)">5-Day Change</p>
                <ChangeBadge value={stock.change5d} className="text-sm font-semibold" />
              </div>
              <div>
                <p className="text-[10px] text-(--text-secondary)">20-Day Change</p>
                <ChangeBadge value={stock.change20d} className="text-sm font-semibold" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
