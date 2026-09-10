import {
  bigint,
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const postStatus = pgEnum("post_status", ["draft", "published"]);
export const albumStatus = pgEnum("album_status", ["draft", "published"]);
export const movieStatus = pgEnum("movie_status", ["draft", "published"]);
export const guestbookStatus = pgEnum("guestbook_status", ["visible", "hidden"]);
export const anonymousMessageStatus = pgEnum("anonymous_message_status", ["unread", "read", "archived"]);

export const mediaAssets = pgTable(
  "media_assets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    cdnId: text("cdn_id").notNull(),
    url: text("url").notNull(),
    filename: text("filename").notNull(),
    mimeType: text("mime_type").notNull(),
    byteSize: integer("byte_size").notNull(),
    width: integer("width"),
    height: integer("height"),
    altText: text("alt_text").default("").notNull(),
    caption: text("caption").default("").notNull(),
    takenDate: date("taken_date"),
    showInPhotoLog: boolean("show_in_photo_log").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex("media_assets_cdn_id_unique").on(table.cdnId)],
);

export const posts = pgTable(
  "posts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    excerpt: text("excerpt").default("").notNull(),
    body: text("body").default("").notNull(),
    status: postStatus("status").default("draft").notNull(),
    coverMediaId: uuid("cover_media_id").references(() => mediaAssets.id, {
      onDelete: "set null",
    }),
    thumbnailMediaId: uuid("thumbnail_media_id").references(() => mediaAssets.id, {
      onDelete: "set null",
    }),
    authorId: text("author_id").notNull(),
    version: integer("version").default(1).notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("posts_slug_unique").on(table.slug),
    index("posts_status_published_idx").on(table.status, table.publishedAt),
  ],
);

export const postMedia = pgTable(
  "post_media",
  {
    postId: uuid("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    mediaId: uuid("media_id")
      .notNull()
      .references(() => mediaAssets.id, { onDelete: "restrict" }),
  },
  (table) => [uniqueIndex("post_media_unique").on(table.postId, table.mediaId)],
);

export const photoAlbums = pgTable(
  "photo_albums",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    introduction: text("introduction").default("").notNull(),
    status: albumStatus("status").default("draft").notNull(),
    coverMediaId: uuid("cover_media_id").references(() => mediaAssets.id, {
      onDelete: "set null",
    }),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("photo_albums_slug_unique").on(table.slug),
    index("photo_albums_status_published_idx").on(table.status, table.publishedAt),
  ],
);

export const photoAlbumItems = pgTable(
  "photo_album_items",
  {
    albumId: uuid("album_id")
      .notNull()
      .references(() => photoAlbums.id, { onDelete: "cascade" }),
    mediaId: uuid("media_id")
      .notNull()
      .references(() => mediaAssets.id, { onDelete: "restrict" }),
    position: integer("position").default(0).notNull(),
    caption: text("caption").default("").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("photo_album_items_album_media_unique").on(table.albumId, table.mediaId),
    index("photo_album_items_album_position_idx").on(table.albumId, table.position),
    index("photo_album_items_media_idx").on(table.mediaId),
  ],
);

export const movieRecommendations = pgTable(
  "movie_recommendations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tmdbId: integer("tmdb_id").notNull(),
    title: text("title").notNull(),
    originalTitle: text("original_title").default("").notNull(),
    overview: text("overview").default("").notNull(),
    posterPath: text("poster_path"),
    backdropPath: text("backdrop_path"),
    releaseDate: date("release_date"),
    runtimeMinutes: integer("runtime_minutes"),
    genres: jsonb("genres").$type<string[]>().default([]).notNull(),
    personalNote: text("personal_note").default("").notNull(),
    watchedAt: date("watched_at"),
    status: movieStatus("status").default("draft").notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("movie_recommendations_tmdb_id_unique").on(table.tmdbId),
    index("movie_recommendations_status_published_idx").on(table.status, table.publishedAt),
  ],
);

export type SocialLinks = {
  website?: string;
  github?: string;
  instagram?: string;
  mastodon?: string;
};

export const siteProfile = pgTable("site_profile", {
  id: integer("id").primaryKey().default(1),
  displayName: text("display_name").default("").notNull(),
  siteTitle: text("site_title").default("My corner of the internet").notNull(),
  biography: text("biography").default("").notNull(),
  avatarMediaId: uuid("avatar_media_id").references(() => mediaAssets.id, {
    onDelete: "set null",
  }),
  contactEmail: text("contact_email").default("").notNull(),
  socialLinks: jsonb("social_links").$type<SocialLinks>().default({}).notNull(),
  spotifyPlaylistTitle: text("spotify_playlist_title").default("").notNull(),
  spotifyPlaylistUrl: text("spotify_playlist_url").default("").notNull(),
  onboardedAt: timestamp("onboarded_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const guestbookEntries = pgTable(
  "guestbook_entries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    displayName: text("display_name"),
    message: text("message").notNull(),
    status: guestbookStatus("status").default("visible").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    hiddenAt: timestamp("hidden_at", { withTimezone: true }),
  },
  (table) => [index("guestbook_status_created_idx").on(table.status, table.createdAt)],
);

export const guestbookRateLimits = pgTable("guestbook_rate_limits", {
  visitorHash: text("visitor_hash").primaryKey(),
  windowStartedAt: timestamp("window_started_at", { withTimezone: true }).notNull(),
  submissionCount: integer("submission_count").default(1).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const anonymousMessages = pgTable(
  "anonymous_messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    message: text("message").notNull(),
    status: anonymousMessageStatus("status").default("unread").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    readAt: timestamp("read_at", { withTimezone: true }),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
  },
  (table) => [index("anonymous_messages_status_created_idx").on(table.status, table.createdAt)],
);

export const anonymousMessageRateLimits = pgTable("anonymous_message_rate_limits", {
  visitorHash: text("visitor_hash").primaryKey(),
  windowStartedAt: timestamp("window_started_at", { withTimezone: true }).notNull(),
  submissionCount: integer("submission_count").default(1).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const siteStats = pgTable("site_stats", {
  id: integer("id").primaryKey().default(1),
  visitorCount: bigint("visitor_count", { mode: "number" }).default(0).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type Post = typeof posts.$inferSelect;
export type MediaAsset = typeof mediaAssets.$inferSelect;
export type PhotoAlbum = typeof photoAlbums.$inferSelect;
export type PhotoAlbumItem = typeof photoAlbumItems.$inferSelect;
export type MovieRecommendation = typeof movieRecommendations.$inferSelect;
export type SiteProfile = typeof siteProfile.$inferSelect;
export type GuestbookEntry = typeof guestbookEntries.$inferSelect;
export type AnonymousMessage = typeof anonymousMessages.$inferSelect;
