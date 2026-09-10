CREATE TYPE "public"."album_status" AS ENUM('draft', 'published');--> statement-breakpoint
CREATE TABLE "photo_album_items" (
	"album_id" uuid NOT NULL,
	"media_id" uuid NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"caption" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "photo_albums" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"introduction" text DEFAULT '' NOT NULL,
	"status" "album_status" DEFAULT 'draft' NOT NULL,
	"cover_media_id" uuid,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "photo_album_items" ADD CONSTRAINT "photo_album_items_album_id_photo_albums_id_fk" FOREIGN KEY ("album_id") REFERENCES "public"."photo_albums"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "photo_album_items" ADD CONSTRAINT "photo_album_items_media_id_media_assets_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media_assets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "photo_albums" ADD CONSTRAINT "photo_albums_cover_media_id_media_assets_id_fk" FOREIGN KEY ("cover_media_id") REFERENCES "public"."media_assets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "photo_album_items_album_media_unique" ON "photo_album_items" USING btree ("album_id","media_id");--> statement-breakpoint
CREATE INDEX "photo_album_items_album_position_idx" ON "photo_album_items" USING btree ("album_id","position");--> statement-breakpoint
CREATE INDEX "photo_album_items_media_idx" ON "photo_album_items" USING btree ("media_id");--> statement-breakpoint
CREATE UNIQUE INDEX "photo_albums_slug_unique" ON "photo_albums" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "photo_albums_status_published_idx" ON "photo_albums" USING btree ("status","published_at");