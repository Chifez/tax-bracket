CREATE TYPE "public"."file_status" AS ENUM('pending', 'processing', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."batch_status" AS ENUM('pending', 'processing', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."transaction_direction" AS ENUM('credit', 'debit');--> statement-breakpoint
CREATE TABLE "chats" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title" varchar(255) DEFAULT 'New Chat' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chat_id" uuid NOT NULL,
	"role" varchar(50) NOT NULL,
	"content" text NOT NULL,
	"attachments" json,
	"file_ids" json,
	"sections" json,
	"charts" json,
	"stats" json,
	"sources" json,
	"metadata" json,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"chat_id" uuid,
	"batch_id" uuid,
	"url" text NOT NULL,
	"status" "file_status" DEFAULT 'pending' NOT NULL,
	"extracted_text" text,
	"tax_year" integer,
	"bank_name" varchar(100),
	"statement_period_start" timestamp,
	"statement_period_end" timestamp,
	"metadata" json,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "upload_batches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"tax_year" integer NOT NULL,
	"label" varchar(255) DEFAULT 'Bank Statements',
	"status" "batch_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"file_id" uuid,
	"batch_id" uuid,
	"tax_year" integer NOT NULL,
	"date" timestamp NOT NULL,
	"description" varchar(500) NOT NULL,
	"amount" numeric(15, 2) NOT NULL,
	"direction" "transaction_direction" NOT NULL,
	"category" varchar(100) DEFAULT 'uncategorized' NOT NULL,
	"sub_category" varchar(100),
	"currency" varchar(3) DEFAULT 'NGN' NOT NULL,
	"bank_name" varchar(100),
	"raw_description" text,
	"normalized_description" varchar(500),
	"deduplication_hash" varchar(64) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tax_aggregates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"tax_year" integer NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"total_income" numeric(15, 2) DEFAULT '0' NOT NULL,
	"taxable_income" numeric(15, 2) DEFAULT '0' NOT NULL,
	"total_expenses" numeric(15, 2) DEFAULT '0' NOT NULL,
	"total_bank_charges" numeric(15, 2) DEFAULT '0' NOT NULL,
	"income_categories" json,
	"monthly_breakdown" json,
	"deductions" json,
	"tax_liability" json,
	"employment_classification" varchar(20) DEFAULT 'paye',
	"flags" json DEFAULT '[]'::json,
	"computed_at" timestamp DEFAULT now() NOT NULL,
	"invalidated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "tax_context" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"tax_year" integer NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"context_json" json NOT NULL,
	"token_estimate" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "chats" ADD CONSTRAINT "chats_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_chat_id_chats_id_fk" FOREIGN KEY ("chat_id") REFERENCES "public"."chats"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_chat_id_chats_id_fk" FOREIGN KEY ("chat_id") REFERENCES "public"."chats"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_batch_id_upload_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."upload_batches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "upload_batches" ADD CONSTRAINT "upload_batches_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_file_id_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."files"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_batch_id_upload_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."upload_batches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tax_aggregates" ADD CONSTRAINT "tax_aggregates_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tax_context" ADD CONSTRAINT "tax_context_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_transactions_user_year" ON "transactions" USING btree ("user_id","tax_year");--> statement-breakpoint
CREATE INDEX "idx_transactions_dedup" ON "transactions" USING btree ("deduplication_hash");--> statement-breakpoint
CREATE INDEX "idx_transactions_file" ON "transactions" USING btree ("file_id");--> statement-breakpoint
CREATE INDEX "idx_aggregates_user_year" ON "tax_aggregates" USING btree ("user_id","tax_year");--> statement-breakpoint
CREATE INDEX "idx_context_user_year" ON "tax_context" USING btree ("user_id","tax_year");