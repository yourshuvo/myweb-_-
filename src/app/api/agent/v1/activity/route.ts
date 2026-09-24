import { requireDb } from "@/db";
import { getAdminAnonymousMessages } from "@/lib/anonymous-messages";
import { agentJson, denyUnlessAgent, firstValidationError } from "@/lib/agent/auth";
import { getAdminAlbums, getAdminMedia, getAdminMovieRecommendations, getAdminPosts } from "@/lib/data";
import { getAdminGuestbookEntries } from "@/lib/guestbook-data";
import { z } from "zod";

export const runtime = "nodejs";

function dbUnavailable() {
  return agentJson({ error: "DATABASE_URL is not configured." }, { status: 503 });
}

const limitSchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

type ActivityItem = {
  type: "post" | "media" | "album" | "movie" | "guestbook" | "message";
  id: string;
  label: string;
  detail: string;
  date: string;
};

/**
 * GET /api/agent/v1/activity?limit=10
 * Recent activity across all content types, newest first — mirrors the
 * admin dashboard "Recent activity" panel.
 */
export async function GET(request: Request) {
  const denied = denyUnlessAgent(request);
  if (denied) return denied;
  try {
    requireDb();
  } catch {
    return dbUnavailable();
  }
  const params = new URL(request.url).searchParams;
  const parsed = limitSchema.safeParse({ limit: params.get("limit") });
  if (!parsed.success) return agentJson({ error: firstValidationError(parsed.error) }, { status: 400 });
  try {
    const [posts, media, albums, movies, visibleGuestbook, hiddenGuestbook, unreadMessages, readMessages, archivedMessages] =
      await Promise.all([
        getAdminPosts(),
        getAdminMedia(),
        getAdminAlbums(),
        getAdminMovieRecommendations(),
        getAdminGuestbookEntries("visible"),
        getAdminGuestbookEntries("hidden"),
        getAdminAnonymousMessages("unread"),
        getAdminAnonymousMessages("read"),
        getAdminAnonymousMessages("archived"),
      ]);
    const items: ActivityItem[] = [
      ...posts.map((post) => ({
        type: "post" as const,
        id: post.id,
        label: post.title,
        detail: `${post.status} post`,
        date: new Date(post.updatedAt).toISOString(),
      })),
      ...media.map((asset) => ({
        type: "media" as const,
        id: asset.id,
        label: asset.filename,
        detail: "media added",
        date: new Date(asset.createdAt).toISOString(),
      })),
      ...albums.map((album) => ({
        type: "album" as const,
        id: album.id,
        label: album.title,
        detail: `${album.status} album`,
        date: new Date(album.updatedAt).toISOString(),
      })),
      ...movies.map((movie) => ({
        type: "movie" as const,
        id: movie.id,
        label: movie.title,
        detail: `${movie.status} movie suggestion`,
        date: new Date(movie.updatedAt).toISOString(),
      })),
      ...[...visibleGuestbook, ...hiddenGuestbook].map((entry) => ({
        type: "guestbook" as const,
        id: entry.id,
        label: entry.displayName || "Anonymous",
        detail: `${entry.status} guestbook message`,
        date: new Date(entry.createdAt).toISOString(),
      })),
      ...[...unreadMessages, ...readMessages, ...archivedMessages].map((entry) => ({
        type: "message" as const,
        id: entry.id,
        label: "Anonymous message",
        detail: `${entry.status} private message`,
        date: new Date(entry.createdAt).toISOString(),
      })),
    ];
    items.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
    return agentJson({ activity: items.slice(0, parsed.data.limit) });
  } catch (error) {
    console.error("[agent/v1/activity] activity feed failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return agentJson({ error: "The activity feed could not be loaded." }, { status: 500 });
  }
}
