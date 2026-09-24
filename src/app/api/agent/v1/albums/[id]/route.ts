import { eq, inArray } from "drizzle-orm";
import { revalidateTag } from "next/cache";
import { requireDb } from "@/db";
import { mediaAssets, photoAlbumItems, photoAlbums } from "@/db/schema";
import { agentJson, denyUnlessAgent, firstValidationError } from "@/lib/agent/auth";
import { agentUpdateAlbumSchema, uuidParam } from "@/lib/agent/agent-schemas";
import { normalizeAlbumItems } from "@/lib/albums";

export const runtime = "nodejs";

function dbUnavailable() {
  return agentJson({ error: "DATABASE_URL is not configured." }, { status: 503 });
}

type RouteContext = { params: Promise<{ id: string }> };

async function albumWithItems(albumId: string) {
  const db = requireDb();
  const [album] = await db.select().from(photoAlbums).where(eq(photoAlbums.id, albumId)).limit(1);
  if (!album) return null;
  const items = await db
    .select({
      mediaId: photoAlbumItems.mediaId,
      caption: photoAlbumItems.caption,
      position: photoAlbumItems.position,
      url: mediaAssets.url,
      filename: mediaAssets.filename,
      altText: mediaAssets.altText,
    })
    .from(photoAlbumItems)
    .innerJoin(mediaAssets, eq(photoAlbumItems.mediaId, mediaAssets.id))
    .where(eq(photoAlbumItems.albumId, albumId))
    .orderBy(photoAlbumItems.position);
  return { ...album, items, photoCount: items.length };
}

/** GET /api/agent/v1/albums/[id] — album with its items. */
export async function GET(request: Request, context: RouteContext) {
  const denied = denyUnlessAgent(request);
  if (denied) return denied;
  try {
    requireDb();
  } catch {
    return dbUnavailable();
  }
  const { id } = await context.params;
  if (!uuidParam.safeParse(id).success) return agentJson({ error: "Invalid ID." }, { status: 400 });
  try {
    const album = await albumWithItems(id);
    if (!album) return agentJson({ error: "Album not found." }, { status: 404 });
    return agentJson({ album });
  } catch (error) {
    console.error("[agent/v1/albums] fetch failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return agentJson({ error: "The album could not be loaded." }, { status: 500 });
  }
}

/**
 * PATCH /api/agent/v1/albums/[id]
 * Partial update. Passing `items` replaces the whole item list (positions are
 * re-derived from array order); omit it to keep the current items.
 */
export async function PATCH(request: Request, context: RouteContext) {
  const denied = denyUnlessAgent(request);
  if (denied) return denied;
  let db;
  try {
    db = requireDb();
  } catch {
    return dbUnavailable();
  }
  const { id } = await context.params;
  if (!uuidParam.safeParse(id).success) return agentJson({ error: "Invalid ID." }, { status: 400 });
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return agentJson({ error: "The request body must be valid JSON." }, { status: 400 });
  }
  const parsed = agentUpdateAlbumSchema.safeParse(payload);
  if (!parsed.success) return agentJson({ error: firstValidationError(parsed.error) }, { status: 400 });
  const { items: rawItems, ...fields } = parsed.data;
  const items = rawItems === undefined ? undefined : normalizeAlbumItems(rawItems);
  if (items && items.length) {
    const existing = await db
      .select({ id: mediaAssets.id })
      .from(mediaAssets)
      .where(inArray(mediaAssets.id, items.map((item) => item.mediaId)));
    if (existing.length !== items.length) {
      return agentJson({ error: "One or more selected photos no longer exist." }, { status: 400 });
    }
  }
  const now = new Date();
  try {
    const [existing] = await db
      .select({ status: photoAlbums.status, publishedAt: photoAlbums.publishedAt, coverMediaId: photoAlbums.coverMediaId })
      .from(photoAlbums)
      .where(eq(photoAlbums.id, id))
      .limit(1);
    if (!existing) return agentJson({ error: "Album not found." }, { status: 404 });
    if (items !== undefined) {
      const effectiveCover = fields.coverMediaId !== undefined ? fields.coverMediaId || null : existing.coverMediaId;
      if (effectiveCover && !items.some((item) => item.mediaId === effectiveCover)) {
        return agentJson({ error: "The cover must be one of the album photos." }, { status: 400 });
      }
    }

    const set: Record<string, unknown> = { updatedAt: now };
    if (fields.title !== undefined) set.title = fields.title;
    if (fields.slug !== undefined) set.slug = fields.slug;
    if (fields.introduction !== undefined) set.introduction = fields.introduction;
    if (fields.status !== undefined) {
      set.status = fields.status;
      set.publishedAt = fields.status === "published" ? existing.publishedAt || now : null;
    }
    if (fields.coverMediaId !== undefined) set.coverMediaId = fields.coverMediaId || null;

    await db.transaction(async (tx) => {
      await tx.update(photoAlbums).set(set).where(eq(photoAlbums.id, id));
      if (items !== undefined) {
        await tx.delete(photoAlbumItems).where(eq(photoAlbumItems.albumId, id));
        if (items.length) {
          await tx.insert(photoAlbumItems).values(
            items.map((item, position) => ({
              albumId: id,
              mediaId: item.mediaId,
              caption: item.caption,
              position,
            })),
          );
        }
      }
    });
    if (existing.status === "published" || fields.status === "published") {
      revalidateTag("albums");
      revalidateTag("photos");
    }
    return agentJson({ album: await albumWithItems(id) });
  } catch (error) {
    const message = error instanceof Error && error.message.includes("photo_albums_slug_unique")
      ? "That album slug is already in use."
      : "The album could not be updated.";
    return agentJson({ error: message }, { status: message.startsWith("That album slug") ? 409 : 500 });
  }
}

/** DELETE /api/agent/v1/albums/[id] */
export async function DELETE(request: Request, context: RouteContext) {
  const denied = denyUnlessAgent(request);
  if (denied) return denied;
  let db;
  try {
    db = requireDb();
  } catch {
    return dbUnavailable();
  }
  const { id } = await context.params;
  if (!uuidParam.safeParse(id).success) return agentJson({ error: "Invalid ID." }, { status: 400 });
  try {
    const [deleted] = await db.delete(photoAlbums).where(eq(photoAlbums.id, id)).returning({ id: photoAlbums.id, status: photoAlbums.status });
    if (!deleted) return agentJson({ error: "Album not found." }, { status: 404 });
    if (deleted.status === "published") {
      revalidateTag("albums");
      revalidateTag("photos");
    }
    return agentJson({ deleted: true, id: deleted.id });
  } catch (error) {
    console.error("[agent/v1/albums] delete failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return agentJson({ error: "The album could not be deleted." }, { status: 500 });
  }
}
