import { desc, eq, inArray } from "drizzle-orm";
import { revalidateTag } from "next/cache";
import { requireDb } from "@/db";
import { mediaAssets, photoAlbumItems, photoAlbums } from "@/db/schema";
import { agentJson, denyUnlessAgent, firstValidationError } from "@/lib/agent/auth";
import { agentCreateAlbumSchema, draftPublishedParam, paginationSchema, parseStatusParam } from "@/lib/agent/agent-schemas";
import { normalizeAlbumItems } from "@/lib/albums";

export const runtime = "nodejs";

function dbUnavailable() {
  return agentJson({ error: "DATABASE_URL is not configured." }, { status: 503 });
}

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

async function assertMediaExist(mediaIds: string[]) {
  if (!mediaIds.length) return true;
  const rows = await requireDb()
    .select({ id: mediaAssets.id })
    .from(mediaAssets)
    .where(inArray(mediaAssets.id, mediaIds));
  return rows.length === mediaIds.length;
}

/**
 * GET /api/agent/v1/albums?status=draft|published&limit=20&offset=0
 * List photo albums, newest first.
 */
export async function GET(request: Request) {
  const denied = denyUnlessAgent(request);
  if (denied) return denied;
  let db;
  try {
    db = requireDb();
  } catch {
    return dbUnavailable();
  }
  const params = new URL(request.url).searchParams;
  const pagination = paginationSchema.safeParse({ limit: params.get("limit"), offset: params.get("offset") });
  if (!pagination.success) return agentJson({ error: firstValidationError(pagination.error) }, { status: 400 });
  const statusResult = parseStatusParam(draftPublishedParam, params.get("status"), 'status must be "draft" or "published".');
  if (!statusResult.ok) return statusResult.response;
  const status = statusResult.value;
  try {
    const rows = await db
      .select()
      .from(photoAlbums)
      .where(status ? eq(photoAlbums.status, status) : undefined)
      .orderBy(desc(photoAlbums.updatedAt))
      .limit(pagination.data.limit)
      .offset(pagination.data.offset);
    return agentJson({ albums: rows });
  } catch (error) {
    console.error("[agent/v1/albums] list failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return agentJson({ error: "The albums could not be listed." }, { status: 500 });
  }
}

/**
 * POST /api/agent/v1/albums
 * Create an album with an optional items array [{ mediaId, caption }].
 */
export async function POST(request: Request) {
  const denied = denyUnlessAgent(request);
  if (denied) return denied;
  let db;
  try {
    db = requireDb();
  } catch {
    return dbUnavailable();
  }
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return agentJson({ error: "The request body must be valid JSON." }, { status: 400 });
  }
  const parsed = agentCreateAlbumSchema.safeParse(payload);
  if (!parsed.success) return agentJson({ error: firstValidationError(parsed.error) }, { status: 400 });
  const data = { ...parsed.data, items: normalizeAlbumItems(parsed.data.items) };
  if (!(await assertMediaExist(data.items.map((item) => item.mediaId)))) {
    return agentJson({ error: "One or more selected photos no longer exist." }, { status: 400 });
  }
  const now = new Date();
  try {
    const createdId = await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(photoAlbums)
        .values({
          title: data.title,
          slug: data.slug,
          introduction: data.introduction,
          status: data.status,
          coverMediaId: data.coverMediaId || null,
          publishedAt: data.status === "published" ? now : null,
          updatedAt: now,
        })
        .returning({ id: photoAlbums.id });
      if (!created) throw new Error("Album insert returned no row.");
      if (data.items.length) {
        await tx.insert(photoAlbumItems).values(
          data.items.map((item, position) => ({
            albumId: created.id,
            mediaId: item.mediaId,
            caption: item.caption,
            position,
          })),
        );
      }
      return created.id;
    });
    if (data.status === "published") {
      revalidateTag("albums");
      revalidateTag("photos");
    }
    return agentJson({ album: await albumWithItems(createdId) }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error && error.message.includes("photo_albums_slug_unique")
      ? "That album slug is already in use."
      : "The album could not be created.";
    return agentJson({ error: message }, { status: message.startsWith("That album slug") ? 409 : 500 });
  }
}
