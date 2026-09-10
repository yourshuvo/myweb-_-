CREATE TYPE "public"."anonymous_message_status" AS ENUM('unread', 'read', 'archived');--> statement-breakpoint
CREATE TABLE "anonymous_message_rate_limits" (
	"visitor_hash" text PRIMARY KEY NOT NULL,
	"window_started_at" timestamp with time zone NOT NULL,
	"submission_count" integer DEFAULT 1 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "anonymous_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"message" text NOT NULL,
	"status" "anonymous_message_status" DEFAULT 'unread' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"read_at" timestamp with time zone,
	"archived_at" timestamp with time zone
);
--> statement-breakpoint
CREATE INDEX "anonymous_messages_status_created_idx" ON "anonymous_messages" USING btree ("status","created_at");