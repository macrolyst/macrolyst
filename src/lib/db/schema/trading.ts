import {
  pgTable,
  uuid,
  serial,
  integer,
  text,
  date,
  timestamp,
  decimal,
  jsonb,
  index,
  unique,
} from "drizzle-orm/pg-core";

export const portfolios = pgTable("portfolios", {
  id: uuid().defaultRandom().primaryKey(),
  userId: text("user_id").notNull(),
  name: text().default("My Portfolio"),
  startingBalance: decimal("starting_balance", { precision: 12, scale: 2 }).default("100000.00"),
  currentCash: decimal("current_cash", { precision: 12, scale: 2 }).default("100000.00"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
});

export const trades = pgTable(
  "trades",
  {
    id: uuid().defaultRandom().primaryKey(),
    portfolioId: uuid("portfolio_id").notNull().references(() => portfolios.id, { onDelete: "cascade" }),
    ticker: text().notNull(),
    action: text().notNull(),
    shares: integer().notNull(),
    price: decimal({ precision: 10, scale: 2 }).notNull(),
    total: decimal({ precision: 12, scale: 2 }).notNull(),
    executedAt: timestamp("executed_at", { mode: "date" }).defaultNow(),
  },
  (table) => [
    index("trades_portfolio_executed_idx").on(table.portfolioId, table.executedAt),
  ]
);

export const challenges = pgTable("challenges", {
  id: uuid().defaultRandom().primaryKey(),
  userId: text("user_id").notNull(),
  portfolioId: uuid("portfolio_id").notNull().references(() => portfolios.id, { onDelete: "cascade" }),
  durationDays: integer("duration_days").notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  startingBalance: decimal("starting_balance", { precision: 12, scale: 2 }).default("100000.00"),
  algoPicks: jsonb("algo_picks"),
  status: text().default("active"),
  result: text(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
});

export const challengeSnapshots = pgTable(
  "challenge_snapshots",
  {
    id: serial().primaryKey(),
    challengeId: uuid("challenge_id").notNull().references(() => challenges.id, { onDelete: "cascade" }),
    date: date().notNull(),
    userPortfolioValue: decimal("user_portfolio_value", { precision: 12, scale: 2 }),
    algoPortfolioValue: decimal("algo_portfolio_value", { precision: 12, scale: 2 }),
  },
  (table) => [
    unique("challenge_snapshots_challenge_date_uniq").on(table.challengeId, table.date),
  ]
);

export const pendingOrders = pgTable(
  "pending_orders",
  {
    id: uuid().defaultRandom().primaryKey(),
    portfolioId: uuid("portfolio_id").notNull().references(() => portfolios.id, { onDelete: "cascade" }),
    ticker: text().notNull(),
    orderType: text("order_type").notNull(), // limit_buy, limit_sell, stop_loss
    targetPrice: decimal("target_price", { precision: 10, scale: 2 }).notNull(),
    shares: integer().notNull(),
    status: text().default("pending"), // pending, filled, cancelled
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
    filledAt: timestamp("filled_at", { mode: "date" }),
  },
  (table) => [
    index("pending_orders_portfolio_status_idx").on(table.portfolioId, table.status),
  ]
);

export const watchlist = pgTable(
  "watchlist",
  {
    id: serial().primaryKey(),
    userId: text("user_id").notNull(),
    ticker: text().notNull(),
    addedAt: timestamp("added_at", { mode: "date" }).defaultNow(),
  },
  (table) => [
    unique("watchlist_user_ticker_uniq").on(table.userId, table.ticker),
    index("watchlist_user_idx").on(table.userId),
  ]
);
