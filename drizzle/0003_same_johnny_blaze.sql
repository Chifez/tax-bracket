ALTER TABLE "users" ADD COLUMN "credits_used" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "credits_limit" integer DEFAULT 1000 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "week_start_date" timestamp DEFAULT (date_trunc('week', now()) + interval '1 day') NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "last_reset_date" timestamp;