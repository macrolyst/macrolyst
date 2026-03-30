/**
 * Research data fetching — pulls from Finnhub, FMP, and our DB in parallel.
 * All results assembled into a single ResearchPayload stored as JSONB.
 */

const FINNHUB_BASE = "https://finnhub.io/api/v1";
const FINNHUB_KEY = process.env.FINNHUB_API_KEY;
const FMP_BASE = "https://financialmodelingprep.com/api/v3";
const FMP_KEY = process.env.FMP_API_KEY || "";

async function finnhub<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${FINNHUB_BASE}${path}&token=${FINNHUB_KEY}`, { cache: "no-store" });
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

async function fmp<T>(path: string): Promise<T | null> {
  if (!FMP_KEY) return null;
  try {
    const sep = path.includes("?") ? "&" : "?";
    const res = await fetch(`${FMP_BASE}${path}${sep}apikey=${FMP_KEY}`, { cache: "no-store" });
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

// ── Individual fetchers ──

async function fetchCompanyProfile(ticker: string) {
  const [fmpProfile, finnhubProfile] = await Promise.all([
    fmp<Record<string, unknown>[]>(`/profile/${ticker}`),
    finnhub<Record<string, unknown>>(`/stock/profile2?symbol=${ticker}`),
  ]);
  const p = fmpProfile?.[0] || {};
  const f = finnhubProfile || {};
  return {
    name: (p.companyName || f.name || ticker) as string,
    description: (p.description || "") as string,
    sector: (p.sector || f.finnhubIndustry || "") as string,
    industry: (p.industry || "") as string,
    ceo: (p.ceo || "") as string,
    employees: (p.fullTimeEmployees || 0) as number,
    ipoDate: (p.ipoDate || "") as string,
    website: (p.website || f.weburl || "") as string,
    logo: (p.image || f.logo || "") as string,
    exchange: (p.exchangeShortName || f.exchange || "") as string,
    country: (p.country || f.country || "") as string,
    marketCap: (p.mktCap || f.marketCapitalization || 0) as number,
  };
}

async function fetchQuote(ticker: string) {
  const d = await finnhub<Record<string, number>>(`/quote?symbol=${ticker}`);
  if (!d || !d.c) return null;
  return {
    price: d.c,
    change: d.d,
    changePercent: d.dp,
    high: d.h,
    low: d.l,
    open: d.o,
    previousClose: d.pc,
  };
}

async function fetchKeyMetrics(ticker: string) {
  const d = await finnhub<{ metric: Record<string, number | null> }>(`/stock/metric?symbol=${ticker}&metric=all`);
  const m = d?.metric || {};
  return {
    peRatio: m["peBasicExclExtraTTM"] ?? m["peTTM"] ?? null,
    eps: m["epsBasicExclExtraItemsTTM"] ?? m["epsTTM"] ?? null,
    beta: m["beta"] ?? null,
    high52w: m["52WeekHigh"] ?? null,
    low52w: m["52WeekLow"] ?? null,
    dividendYield: m["dividendYieldIndicatedAnnual"] ?? null,
    avgVolume: m["10DayAverageTradingVolume"] ?? null,
    roe: m["roeTTM"] ?? null,
    roa: m["roaTTM"] ?? null,
    revenuePerShare: m["revenuePerShareTTM"] ?? null,
    bookValue: m["bookValuePerShareQuarterly"] ?? null,
    currentRatio: m["currentRatioQuarterly"] ?? null,
    debtEquity: m["totalDebt/totalEquityQuarterly"] ?? null,
    grossMargin: m["grossMarginTTM"] ?? null,
    netMargin: m["netProfitMarginTTM"] ?? null,
    operatingMargin: m["operatingMarginTTM"] ?? null,
  };
}

async function fetchAnalystConsensus(ticker: string) {
  const [recs, target] = await Promise.all([
    finnhub<{ buy: number; hold: number; sell: number; strongBuy: number; strongSell: number; period: string }[]>(`/stock/recommendation?symbol=${ticker}`),
    finnhub<{ targetHigh: number; targetLow: number; targetMean: number; targetMedian: number; lastUpdated: string }>(`/stock/price-target?symbol=${ticker}`),
  ]);
  const latest = recs?.[0] || null;
  return {
    recommendations: latest ? {
      strongBuy: latest.strongBuy,
      buy: latest.buy,
      hold: latest.hold,
      sell: latest.sell,
      strongSell: latest.strongSell,
      period: latest.period,
    } : null,
    priceTarget: target ? {
      high: target.targetHigh,
      low: target.targetLow,
      mean: target.targetMean,
      median: target.targetMedian,
      lastUpdated: target.lastUpdated,
    } : null,
  };
}

async function fetchCompanyNews(ticker: string) {
  const to = new Date().toISOString().split("T")[0];
  const from = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];
  const articles = await finnhub<{ headline: string; source: string; url: string; datetime: number; summary: string; image: string }[]>(
    `/company-news?symbol=${ticker}&from=${from}&to=${to}`
  );
  return (articles || []).slice(0, 10).map((a) => ({
    headline: a.headline,
    source: a.source,
    url: a.url,
    datetime: a.datetime,
    summary: (a.summary || "").slice(0, 200),
    image: a.image,
  }));
}

async function fetchPeers(ticker: string) {
  const peers = await finnhub<string[]>(`/stock/peers?symbol=${ticker}`);
  if (!peers || peers.length === 0) return [];
  const filtered = peers.filter((p) => p !== ticker).slice(0, 5);
  // Batch quotes only — no extra profile calls
  const results = await Promise.all(
    filtered.map(async (p) => {
      const q = await finnhub<Record<string, number>>(`/quote?symbol=${p}`);
      return q?.c ? { ticker: p, price: q.c, changePercent: q.dp } : null;
    })
  );
  return results.filter(Boolean);
}

async function fetchFinancials(ticker: string) {
  type FinReport = {
    year: number;
    quarter: number;
    report: {
      ic?: { concept: string; label: string; value: number; unit: string }[];
      bs?: { concept: string; label: string; value: number; unit: string }[];
      cf?: { concept: string; label: string; value: number; unit: string }[];
    };
  };

  const [annualData, quarterlyData] = await Promise.all([
    finnhub<{ data: FinReport[] }>(`/stock/financials-reported?symbol=${ticker}&freq=annual`),
    finnhub<{ data: FinReport[] }>(`/stock/financials-reported?symbol=${ticker}&freq=quarterly`),
  ]);

  const findVal = (items: { concept: string; value: number }[] | undefined, ...concepts: string[]) => {
    if (!items) return null;
    for (const c of concepts) {
      const found = items.find((i) => i.concept.toLowerCase().includes(c.toLowerCase()));
      if (found) return found.value;
    }
    return null;
  };

  const mapReport = (entry: FinReport) => ({
    year: entry.year,
    quarter: entry.quarter,
    period: entry.quarter === 0 ? `FY ${entry.year}` : `Q${entry.quarter} ${entry.year}`,
    revenue: findVal(entry.report.ic, "Revenue", "Revenues", "SalesRevenue"),
    netIncome: findVal(entry.report.ic, "NetIncomeLoss", "ProfitLoss"),
    grossProfit: findVal(entry.report.ic, "GrossProfit"),
    operatingIncome: findVal(entry.report.ic, "OperatingIncomeLoss"),
    eps: findVal(entry.report.ic, "EarningsPerShareBasic", "EarningsPerShare"),
    totalAssets: findVal(entry.report.bs, "Assets"),
    totalLiabilities: findVal(entry.report.bs, "Liabilities"),
    totalEquity: findVal(entry.report.bs, "StockholdersEquity", "Equity"),
    cash: findVal(entry.report.bs, "CashAndCashEquivalents", "Cash"),
    totalDebt: findVal(entry.report.bs, "LongTermDebt", "DebtCurrent"),
    operatingCashFlow: findVal(entry.report.cf, "OperatingActivities", "NetCashProvided"),
    capex: findVal(entry.report.cf, "CapitalExpenditure", "PaymentsToAcquireProperty"),
  });

  const annual = (annualData?.data || []).slice(0, 4).map(mapReport);
  const quarterly = (quarterlyData?.data || []).slice(0, 4).map(mapReport);

  return { annual, quarterly };
}

async function fetchInsiderTransactions(ticker: string) {
  const data = await finnhub<{
    data: { name: string; share: number; change: number; filingDate: string; transactionCode: string; transactionPrice: number }[];
  }>(`/stock/insider-transactions?symbol=${ticker}`);

  return (data?.data || []).slice(0, 10).map((t) => ({
    name: t.name,
    shares: t.change,
    price: t.transactionPrice,
    date: t.filingDate,
    type: t.transactionCode === "P" ? "Buy" : t.transactionCode === "S" ? "Sell" : t.transactionCode,
  }));
}

async function fetchEarningsHistory(ticker: string) {
  const data = await finnhub<{ actual: number; estimate: number; period: string; quarter: number; surprise: number; surprisePercent: number }[]>(
    `/stock/earnings?symbol=${ticker}`
  );
  return (data || []).slice(0, 8).map((e) => ({
    period: e.period,
    quarter: e.quarter,
    actual: e.actual,
    estimate: e.estimate,
    surprise: e.surprise,
    surprisePercent: e.surprisePercent,
    beat: e.actual > e.estimate,
  }));
}

async function fetchSecFilings(ticker: string) {
  const data = await finnhub<{ accessNumber: string; symbol: string; form: string; filedDate: string; reportUrl: string; filingUrl: string }[]>(
    `/stock/filings?symbol=${ticker}`
  );
  // Prioritize major filings, exclude noise like form 4 (insider) which we already show separately
  const major = ["10-K", "10-Q", "8-K", "DEF 14A", "S-1", "S-3"];
  const majorFilings = (data || []).filter((f) => major.some((form) => f.form === form));
  // If not enough major filings, include others but not form 4/3/144
  const minor = (data || []).filter((f) => !["4", "4/A", "3", "144", "144/A"].includes(f.form) && !majorFilings.includes(f));
  const combined = [...majorFilings, ...minor].slice(0, 10);
  return combined.map((f) => ({
    form: f.form,
    date: f.filedDate?.split(" ")[0] || f.filedDate,
    url: f.filingUrl || f.reportUrl,
  }));
}

// ── Main research function ──

export type ResearchPayload = {
  ticker: string;
  fetchedAt: string;
  profile: Awaited<ReturnType<typeof fetchCompanyProfile>>;
  quote: Awaited<ReturnType<typeof fetchQuote>>;
  metrics: Awaited<ReturnType<typeof fetchKeyMetrics>>;
  analyst: Awaited<ReturnType<typeof fetchAnalystConsensus>>;
  news: Awaited<ReturnType<typeof fetchCompanyNews>>;
  peers: Awaited<ReturnType<typeof fetchPeers>>;
  financials: Awaited<ReturnType<typeof fetchFinancials>>;
  insiders: Awaited<ReturnType<typeof fetchInsiderTransactions>>;
  earnings: Awaited<ReturnType<typeof fetchEarningsHistory>>;
  filings: Awaited<ReturnType<typeof fetchSecFilings>>;
};

export async function generateResearch(ticker: string): Promise<ResearchPayload> {
  const symbol = ticker.toUpperCase();

  const [profile, quote, metrics, analyst, news, peers, financials, insiders, earnings, filings] =
    await Promise.all([
      fetchCompanyProfile(symbol),
      fetchQuote(symbol),
      fetchKeyMetrics(symbol),
      fetchAnalystConsensus(symbol),
      fetchCompanyNews(symbol),
      fetchPeers(symbol),
      fetchFinancials(symbol),
      fetchInsiderTransactions(symbol),
      fetchEarningsHistory(symbol),
      fetchSecFilings(symbol),
    ]);

  return {
    ticker: symbol,
    fetchedAt: new Date().toISOString(),
    profile,
    quote,
    metrics,
    analyst,
    news,
    peers,
    financials,
    insiders,
    earnings,
    filings,
  };
}
