import { count } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";
import type { getDb } from "@/db";
import {
  anonymousMessages,
  guestbookEntries,
  mediaAssets,
  movieRecommendations,
  photoAlbums,
  posts,
  siteStats,
} from "@/db/schema";
import { hasAuthConfig, hasDatabaseConfig, hasTmdbConfig, hasVisitorTrackingConfig, getServerEnv } from "@/lib/env";

export const AGENT_API_VERSION = "v1";

type AgentDb = NonNullable<ReturnType<typeof getDb>>;

async function tableCount(db: AgentDb, table: PgTable): Promise<number | null> {
  try {
    const [row] = await db.select({ count: count() }).from(table);
    return row?.count ?? null;
  } catch {
    return null;
  }
}

export type AgentStatus = {
  ok: true;
  version: typeof AGENT_API_VERSION;
  time: string;
  dbConfigured: boolean;
  tmdbConfigured: boolean;
  /** Mirrors the admin dashboard "Service check" panel (booleans only, no secrets). */
  services: {
    auth: boolean;
    uploads: boolean;
    tmdb: boolean;
    visitorTracking: boolean;
  };
  counts: Record<string, number | null> | null;
  visitorTotal: number | null;
};

/** Read-only status snapshot for the agent API health endpoint. */
export async function getAgentStatus(db: AgentDb | null): Promise<AgentStatus> {
  const dbConfigured = hasDatabaseConfig() && db !== null;
  let counts: Record<string, number | null> | null = null;
  let visitorTotal: number | null = null;
  if (db) {
    counts = {
      posts: await tableCount(db, posts),
      albums: await tableCount(db, photoAlbums),
      media: await tableCount(db, mediaAssets),
      movies: await tableCount(db, movieRecommendations),
      guestbook: await tableCount(db, guestbookEntries),
      anonymousMessages: await tableCount(db, anonymousMessages),
    };
    try {
      const [row] = await db.select({ total: siteStats.visitorCount }).from(siteStats);
      visitorTotal = row?.total ?? null;
    } catch {
      visitorTotal = null;
    }
  }
  return {
    ok: true,
    version: AGENT_API_VERSION,
    time: new Date().toISOString(),
    dbConfigured,
    tmdbConfigured: hasTmdbConfig(),
    services: {
      auth: hasAuthConfig(),
      uploads: Boolean(getServerEnv("HACKCLUB_CDN_API_KEY")),
      tmdb: hasTmdbConfig(),
      visitorTracking: hasVisitorTrackingConfig(),
    },
    counts,
    visitorTotal,
  };
}
