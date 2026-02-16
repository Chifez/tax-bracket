-- Credit Transactions Ledger Migration
-- All credit changes (purchases, usage, refunds, weekly grants) are tracked here
-- Balance is calculated as SUM(amount) WHERE user_id = X

-- Create the enum type for transaction types
DO $$ BEGIN
    CREATE TYPE "credit_transaction_type" AS ENUM('purchase', 'usage', 'refund', 'weekly_grant');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint

-- Create the credit_transactions table
CREATE TABLE IF NOT EXISTS "credit_transactions" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "user_id" uuid NOT NULL,
    "amount" integer NOT NULL,
    "type" "credit_transaction_type" NOT NULL,
    "reference" varchar(255) NOT NULL,
    "metadata" jsonb,
    "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint

-- Add foreign key constraint
DO $$ BEGIN
    ALTER TABLE "credit_transactions" ADD CONSTRAINT "credit_transactions_user_id_users_id_fk" 
        FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS "credit_transactions_user_id_idx" ON "credit_transactions"("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "credit_transactions_reference_idx" ON "credit_transactions"("reference");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "credit_transactions_created_at_idx" ON "credit_transactions"("created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "credit_transactions_user_type_idx" ON "credit_transactions"("user_id", "type");
