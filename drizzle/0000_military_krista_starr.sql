CREATE TABLE "analysis_runs" (
	"id" serial PRIMARY KEY NOT NULL,
	"run_date" date NOT NULL,
	"generated_at" timestamp,
	"market_date" date,
	"data_status" jsonb,
	"status" text DEFAULT 'complete',
	CONSTRAINT "analysis_runs_run_date_unique" UNIQUE("run_date")
);
--> statement-breakpoint
CREATE TABLE "backtest_results" (
	"id" serial PRIMARY KEY NOT NULL,
	"run_id" integer NOT NULL,
	"sim_start_date" date,
	"sim_end_date" date,
	"lookback_days" integer,
	"portfolio_return" numeric(8, 2),
	"benchmark_return" numeric(8, 2),
	"outperformance" numeric(8, 2),
	"picks" jsonb,
	CONSTRAINT "backtest_results_run_id_unique" UNIQUE("run_id")
);
--> statement-breakpoint
CREATE TABLE "catalyst_hours" (
	"id" serial PRIMARY KEY NOT NULL,
	"timeline_id" integer NOT NULL,
	"time" text NOT NULL,
	"open" numeric(10, 2),
	"close" numeric(10, 2),
	"high" numeric(10, 2),
	"low" numeric(10, 2),
	"volume" bigint,
	"change_from_open" numeric(6, 2),
	"hourly_change" numeric(6, 2),
	"significant" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE "catalyst_news" (
	"id" serial PRIMARY KEY NOT NULL,
	"hour_id" integer NOT NULL,
	"headline" text,
	"source" text,
	"url" text,
	"time" text
);
--> statement-breakpoint
CREATE TABLE "catalyst_timeline" (
	"id" serial PRIMARY KEY NOT NULL,
	"run_id" integer NOT NULL,
	"date" date NOT NULL,
	"narrative" text,
	"day_change_pct" numeric(6, 2),
	"open" numeric(10, 2),
	"close" numeric(10, 2),
	"high" numeric(10, 2),
	"low" numeric(10, 2),
	"high_time" text,
	"low_time" text,
	CONSTRAINT "catalyst_timeline_run_id_unique" UNIQUE("run_id")
);
--> statement-breakpoint
CREATE TABLE "daily_prices" (
	"id" serial PRIMARY KEY NOT NULL,
	"run_id" integer NOT NULL,
	"date" date NOT NULL,
	"ticker" text NOT NULL,
	"open" numeric(10, 2),
	"high" numeric(10, 2),
	"low" numeric(10, 2),
	"close" numeric(10, 2),
	"volume" bigint
);
--> statement-breakpoint
CREATE TABLE "earnings_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"run_id" integer NOT NULL,
	"type" text NOT NULL,
	"ticker" text NOT NULL,
	"name" text,
	"event_date" date,
	"hour" text,
	"estimate_eps" numeric(10, 4),
	"actual_eps" numeric(10, 4),
	"surprise_pct" numeric(8, 2),
	"revenue_estimate" bigint,
	"actual_revenue" bigint
);
--> statement-breakpoint
CREATE TABLE "market_summary" (
	"id" serial PRIMARY KEY NOT NULL,
	"run_id" integer NOT NULL,
	"market_breadth" text,
	"avg_change" numeric(8, 4),
	"advancers" integer,
	"decliners" integer,
	"breadth_ratio" numeric(5, 2),
	"vix" numeric(6, 2),
	"treasury_10y" numeric(5, 2),
	"treasury_2y" numeric(5, 2),
	"fed_funds" numeric(5, 2),
	CONSTRAINT "market_summary_run_id_unique" UNIQUE("run_id")
);
--> statement-breakpoint
CREATE TABLE "news_articles" (
	"id" serial PRIMARY KEY NOT NULL,
	"run_id" integer NOT NULL,
	"type" text NOT NULL,
	"ticker" text,
	"headline" text,
	"source" text,
	"url" text,
	"summary" text,
	"sentiment" numeric(4, 2),
	"published" timestamp
);
--> statement-breakpoint
CREATE TABLE "scanner_results" (
	"id" serial PRIMARY KEY NOT NULL,
	"run_id" integer NOT NULL,
	"scanner_type" text NOT NULL,
	"ticker" text NOT NULL,
	"name" text,
	"value" numeric(10, 4)
);
--> statement-breakpoint
CREATE TABLE "sector_performance" (
	"id" serial PRIMARY KEY NOT NULL,
	"run_id" integer NOT NULL,
	"sector" text NOT NULL,
	"avg_change" numeric(8, 4),
	"stock_count" integer,
	"advancers" integer,
	"color" text
);
--> statement-breakpoint
CREATE TABLE "stock_scores" (
	"id" serial PRIMARY KEY NOT NULL,
	"run_id" integer NOT NULL,
	"rank" integer,
	"ticker" text NOT NULL,
	"name" text,
	"sector" text,
	"price" numeric(10, 2),
	"change_1d" numeric(8, 4),
	"change_5d" numeric(8, 4),
	"change_20d" numeric(8, 4),
	"target_mean" numeric(10, 2),
	"upside_pct" numeric(8, 2),
	"composite_score" numeric(5, 1),
	"score_analyst" numeric(5, 1),
	"score_technical" numeric(5, 1),
	"score_momentum" numeric(5, 1),
	"score_volume" numeric(5, 1),
	"score_news" numeric(5, 1),
	"rsi" numeric(6, 2),
	"macd_hist" numeric(10, 4),
	"sma_50" numeric(10, 2),
	"sma_200" numeric(10, 2),
	"vol_ratio" numeric(6, 2),
	"bb_upper" numeric(10, 2),
	"bb_lower" numeric(10, 2),
	"pe_ratio" numeric(10, 2),
	"market_cap" bigint,
	"recommendation" text,
	"sector_rank" integer,
	"sector_count" integer,
	"sector_relative_score" numeric(5, 1),
	"sector_pe_avg" numeric(10, 2),
	"annual_volatility" numeric(6, 1),
	"sharpe_ratio" numeric(6, 2),
	"max_drawdown_pct" numeric(6, 1),
	"return_1y" numeric(8, 2),
	"year_high" numeric(10, 2),
	"year_low" numeric(10, 2),
	"reasons" jsonb
);
--> statement-breakpoint
CREATE TABLE "challenge_snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"challenge_id" uuid NOT NULL,
	"date" date NOT NULL,
	"user_portfolio_value" numeric(12, 2),
	"algo_portfolio_value" numeric(12, 2),
	CONSTRAINT "challenge_snapshots_challenge_date_uniq" UNIQUE("challenge_id","date")
);
--> statement-breakpoint
CREATE TABLE "challenges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"portfolio_id" uuid NOT NULL,
	"duration_days" integer NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"starting_balance" numeric(12, 2) DEFAULT '100000.00',
	"algo_picks" jsonb,
	"status" text DEFAULT 'active',
	"result" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "portfolios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"name" text DEFAULT 'My Portfolio',
	"starting_balance" numeric(12, 2) DEFAULT '100000.00',
	"current_cash" numeric(12, 2) DEFAULT '100000.00',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "trades" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"portfolio_id" uuid NOT NULL,
	"ticker" text NOT NULL,
	"action" text NOT NULL,
	"shares" integer NOT NULL,
	"price" numeric(10, 2) NOT NULL,
	"total" numeric(12, 2) NOT NULL,
	"executed_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "watchlist" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"ticker" text NOT NULL,
	"added_at" timestamp DEFAULT now(),
	CONSTRAINT "watchlist_user_ticker_uniq" UNIQUE("user_id","ticker")
);
--> statement-breakpoint
ALTER TABLE "backtest_results" ADD CONSTRAINT "backtest_results_run_id_analysis_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."analysis_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalyst_hours" ADD CONSTRAINT "catalyst_hours_timeline_id_catalyst_timeline_id_fk" FOREIGN KEY ("timeline_id") REFERENCES "public"."catalyst_timeline"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalyst_news" ADD CONSTRAINT "catalyst_news_hour_id_catalyst_hours_id_fk" FOREIGN KEY ("hour_id") REFERENCES "public"."catalyst_hours"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalyst_timeline" ADD CONSTRAINT "catalyst_timeline_run_id_analysis_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."analysis_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_prices" ADD CONSTRAINT "daily_prices_run_id_analysis_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."analysis_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "earnings_events" ADD CONSTRAINT "earnings_events_run_id_analysis_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."analysis_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "market_summary" ADD CONSTRAINT "market_summary_run_id_analysis_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."analysis_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "news_articles" ADD CONSTRAINT "news_articles_run_id_analysis_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."analysis_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scanner_results" ADD CONSTRAINT "scanner_results_run_id_analysis_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."analysis_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sector_performance" ADD CONSTRAINT "sector_performance_run_id_analysis_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."analysis_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_scores" ADD CONSTRAINT "stock_scores_run_id_analysis_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."analysis_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "challenge_snapshots" ADD CONSTRAINT "challenge_snapshots_challenge_id_challenges_id_fk" FOREIGN KEY ("challenge_id") REFERENCES "public"."challenges"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "challenges" ADD CONSTRAINT "challenges_portfolio_id_portfolios_id_fk" FOREIGN KEY ("portfolio_id") REFERENCES "public"."portfolios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trades" ADD CONSTRAINT "trades_portfolio_id_portfolios_id_fk" FOREIGN KEY ("portfolio_id") REFERENCES "public"."portfolios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "daily_prices_run_ticker_date_idx" ON "daily_prices" USING btree ("run_id","ticker","date");--> statement-breakpoint
CREATE INDEX "daily_prices_ticker_date_idx" ON "daily_prices" USING btree ("ticker","date");--> statement-breakpoint
CREATE INDEX "news_articles_run_type_idx" ON "news_articles" USING btree ("run_id","type");--> statement-breakpoint
CREATE INDEX "news_articles_run_ticker_idx" ON "news_articles" USING btree ("run_id","ticker");--> statement-breakpoint
CREATE INDEX "scanner_results_run_type_idx" ON "scanner_results" USING btree ("run_id","scanner_type");--> statement-breakpoint
CREATE INDEX "stock_scores_run_ticker_idx" ON "stock_scores" USING btree ("run_id","ticker");--> statement-breakpoint
CREATE INDEX "stock_scores_run_rank_idx" ON "stock_scores" USING btree ("run_id","rank");--> statement-breakpoint
CREATE INDEX "trades_portfolio_executed_idx" ON "trades" USING btree ("portfolio_id","executed_at");--> statement-breakpoint
CREATE INDEX "watchlist_user_idx" ON "watchlist" USING btree ("user_id");