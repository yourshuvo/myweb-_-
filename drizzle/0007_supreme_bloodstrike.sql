CREATE TYPE "public"."movie_status" AS ENUM('draft', 'published');--> statement-breakpoint
CREATE TABLE "movie_recommendations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tmdb_id" integer NOT NULL,
	"title" text NOT NULL,
	"original_title" text DEFAULT '' NOT NULL,
	"overview" text DEFAULT '' NOT NULL,
	"poster_path" text,
	"backdrop_path" text,
	"release_date" date,
	"runtime_minutes" integer,
	"genres" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"personal_note" text DEFAULT '' NOT NULL,
	"watched_at" date,
	"status" "movie_status" DEFAULT 'draft' NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "movie_recommendations_tmdb_id_unique" ON "movie_recommendations" USING btree ("tmdb_id");--> statement-breakpoint
CREATE INDEX "movie_recommendations_status_published_idx" ON "movie_recommendations" USING btree ("status","published_at");