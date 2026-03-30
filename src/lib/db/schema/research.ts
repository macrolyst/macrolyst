import {
  pgTable,
  uuid,
  serial,
  integer,
  text,
  date,
  timestamp,
  jsonb,
  index,
  unique,
} from "drizzle-orm/pg-core";

export const researchReports = pgTable(
  "research_reports",
  {
    id: uuid().defaultRandom().primaryKey(),
    userId: text("user_id").notNull(),
    ticker: text().notNull(),
    companyName: text("company_name"),
    data: jsonb().notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
    expiresAt: timestamp("expires_at", { mode: "date" }).notNull(),
  },
  (table) => [
    index("research_reports_user_idx").on(table.userId, table.createdAt),
    index("research_reports_ticker_idx").on(table.ticker, table.createdAt),
    index("research_reports_expires_idx").on(table.expiresAt),
  ]
);

export const researchLimits = pgTable(
  "research_limits",
  {
    id: serial().primaryKey(),
    userId: text("user_id").notNull(),
    date: date().notNull(),
    count: integer().default(0),
  },
  (table) => [
    unique("research_limits_user_date_uniq").on(table.userId, table.date),
  ]
);
