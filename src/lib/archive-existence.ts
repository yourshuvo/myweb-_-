import "server-only";

import { and, eq, gte, isNull, lt, or } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { getDb } from "@/db";
import { mediaAssets, photoAlbumItems, photoAlbums, posts } from "@/db/schema";
import type { ArchiveSelection } from "@/lib/archive";

function archiveRange(selection: Required<Pick<ArchiveSelection, "year">> & Pick<ArchiveSelection, "month">) {
  const year = Number(selection.year);
  const monthIndex = selection.month ? Number(selection.month) - 1 : 0;
  const endMonthIndex = selection.month ? monthIndex + 1 : 12;
  const start = new Date(Date.UTC(year, monthIndex, 1));
  const end = new Date(Date.UTC(year, endMonthIndex, 1));
  return {
    start,
    end,
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  };
}

const cachedArchiveFolderExists = unstable_cache(
  async (year: string, month?: string) => {
    const db = getDb();
    if (!db) return false;
    const range = archiveRange({ year, month });
    const [post, photo] = await Promise.all([
      db
        .select({ id: posts.id })
        .from(posts)
        .where(and(
          eq(posts.status, "published"),
          or(
            and(gte(posts.publishedAt, range.start), lt(posts.publishedAt, range.end)),
            and(isNull(posts.publishedAt), gte(posts.createdAt, range.start), lt(posts.createdAt, range.end)),
          ),
        ))
        .limit(1),
      db
        .select({ id: mediaAssets.id })
        .from(mediaAssets)
        .where(and(
          eq(mediaAssets.showInPhotoLog, true),
          or(
            and(gte(mediaAssets.takenDate, range.startDate), lt(mediaAssets.takenDate, range.endDate)),
            and(isNull(mediaAssets.takenDate), gte(mediaAssets.createdAt, range.start), lt(mediaAssets.createdAt, range.end)),
          ),
        ))
        .limit(1),
    ]);
    return Boolean(post[0] || photo[0]);
  },
  ["public-archive-folder-exists"],
  { tags: ["posts", "photos"] },
);

const cachedPublicPhotoExists = unstable_cache(
  async (id: string) => {
    const db = getDb();
    if (!db) return false;
    const [cameraRoll, publishedAlbum] = await Promise.all([
      db
        .select({ id: mediaAssets.id })
        .from(mediaAssets)
        .where(and(eq(mediaAssets.id, id), eq(mediaAssets.showInPhotoLog, true)))
        .limit(1),
      db
        .select({ id: mediaAssets.id })
        .from(photoAlbumItems)
        .innerJoin(photoAlbums, eq(photoAlbumItems.albumId, photoAlbums.id))
        .innerJoin(mediaAssets, eq(photoAlbumItems.mediaId, mediaAssets.id))
        .where(and(eq(mediaAssets.id, id), eq(photoAlbums.status, "published")))
        .limit(1),
    ]);
    return Boolean(cameraRoll[0] || publishedAlbum[0]);
  },
  ["public-photo-exists"],
  { tags: ["photos", "albums"] },
);

export async function publicArchiveFolderExists(selection: ArchiveSelection) {
  if (!selection.year) return true;
  return cachedArchiveFolderExists(selection.year, selection.month);
}

export function publicPhotoExists(id: string) {
  return cachedPublicPhotoExists(id);
}
