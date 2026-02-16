-- Add purchased credits fields to users table
ALTER TABLE "users" ADD COLUMN "purchased_credits" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "total_credits_purchased" integer DEFAULT 0 NOT NULL;--> statement-breakpoint

-- Create purchase status enum
DO $$ BEGIN
    CREATE TYPE "purchase_status" AS ENUM ('pending', 'completed', 'failed', 'refunded');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

-- Create credit purchases table
CREATE TABLE IF NOT EXISTS "credit_purchases" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "user_id" uuid NOT NULL,
    "polar_payment_id" varchar(255) UNIQUE,
    "polar_checkout_id" varchar(255),
    "amount_usd" numeric(10, 2) NOT NULL,
    "credits_purchased" integer NOT NULL,
    "status" "purchase_status" DEFAULT 'pending' NOT NULL,
    "metadata" jsonb,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "completed_at" timestamp,
    "refunded_at" timestamp
);--> statement-breakpoint

-- Add foreign key constraint
DO $$ BEGIN
    ALTER TABLE "credit_purchases" ADD CONSTRAINT "credit_purchases_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS "credit_purchases_user_id_idx" ON "credit_purchases" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "credit_purchases_status_idx" ON "credit_purchases" ("status");
