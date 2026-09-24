import { desc, eq } from "drizzle-orm";
import { updateTag } from "next/cache";
import { z } from "zod";
import { requireDb } from "@/db";
import { mediaAssets } from "@/db/schema";
import { agentJson, denyUnlessAgent, firstValidationError } from "@/lib/agent/auth";
import { agentRegisterMediaSchema, paginationSchema } from "@/lib/agent/agent-schemas";
import { getServerEnv } from "@/lib/env";
import { readImageDimensions } from "@/lib/image-dimensions";

export const runtime = "nodejs";

const MAX_UPLOAD_BYTES = Math.floor(3.9 * 1024 * 1024);
const MAX_DIMENSION = 2400;
const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const cdnResponseSchema = z.object({
  id: z.string().min(1),
  filename: z.string().min(1),
  size: z.number().int().nonnegative(),
  content_type: z.string().min(1),
  url: z.url(),
});

function dbUnavailable() {
  return agentJson({ error: "DATABASE_URL is not configured." }, { status: 503 });
}

/**
 * GET /api/agent/v1/media?limit=20&offset=0&showInPhotoLog=true
 * List media library assets, newest first.
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
  const showInPhotoLog = params.get("showInPhotoLog");
  if (showInPhotoLog && showInPhotoLog !== "true" && showInPhotoLog !== "false") {
    return agentJson({ error: 'showInPhotoLog must be "true" or "false".' }, { status: 400 });
  }
  try {
    const rows = await db
      .select()
      .from(mediaAssets)
      .where(showInPhotoLog ? eq(mediaAssets.showInPhotoLog, showInPhotoLog === "true") : undefined)
      .orderBy(desc(mediaAssets.createdAt))
      .limit(pagination.data.limit)
      .offset(pagination.data.offset);
    return agentJson({ media: rows });
  } catch (error) {
    console.error("[agent/v1/media] list failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return agentJson({ error: "The media library could not be listed." }, { status: 500 });
  }
}

async function registerCdnAsset(data: { url: string; altText: string; caption: string; showInPhotoLog: boolean }) {
  const url = new URL(data.url);
  const parts = url.pathname.split("/").filter(Boolean);
  const cdnId = parts[0];
  const filename = decodeURIComponent(parts.at(-1) || "image");
  if (!cdnId) return agentJson({ error: "That CDN URL is missing an upload ID." }, { status: 400 });
  const db = requireDb();
  const [asset] = await db
    .insert(mediaAssets)
    .values({
      cdnId,
      url: url.toString(),
      filename,
      mimeType: "image/unknown",
      byteSize: 0,
      altText: data.altText,
      caption: data.caption,
      showInPhotoLog: data.showInPhotoLog,
    })
    .onConflictDoNothing()
    .returning();
  updateTag("photos");
  return agentJson({ asset }, { status: 201 });
}

async function uploadImage(body: FormData) {
  const apiKey = getServerEnv("HACKCLUB_CDN_API_KEY");
  if (!apiKey) return agentJson({ error: "HACKCLUB_CDN_API_KEY is not configured." }, { status: 503 });
  const file = body.get("file");
  const altText = String(body.get("altText") || "").trim();
  const caption = String(body.get("caption") || "").trim();
  const takenDate = String(body.get("takenDate") || "") || null;
  const showInPhotoLog = body.get("showInPhotoLog") === "on" || body.get("showInPhotoLog") === "true";
  if (!(file instanceof File)) return agentJson({ error: "Provide an image file as multipart field \"file\"." }, { status: 400 });
  if (!altText || altText.length > 300) return agentJson({ error: "Alt text is required and must be under 300 characters." }, { status: 400 });
  if (caption.length > 500) return agentJson({ error: "Keep the caption under 500 characters." }, { status: 400 });
  if (!allowedTypes.has(file.type)) return agentJson({ error: "Only JPEG, PNG, and WebP images are accepted." }, { status: 415 });
  if (file.size > MAX_UPLOAD_BYTES) return agentJson({ error: "The image must be below 3.9 MB." }, { status: 413 });

  const bytes = Buffer.from(await file.arrayBuffer());
  const dimensions = readImageDimensions(bytes);
  if (!dimensions) return agentJson({ error: "The uploaded file is not a readable image." }, { status: 422 });
  if (dimensions.width > MAX_DIMENSION || dimensions.height > MAX_DIMENSION) {
    return agentJson({ error: "Image dimensions must be between 1 and 2400 pixels." }, { status: 422 });
  }

  const uploadBody = new FormData();
  uploadBody.append("file", new Blob([bytes], { type: file.type }), file.name);
  let cdnResponse: Response;
  try {
    cdnResponse = await fetch("https://cdn.hackclub.com/api/v4/upload", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: uploadBody,
      cache: "no-store",
      signal: AbortSignal.timeout(30_000),
    });
  } catch (error) {
    console.error("[agent/v1/media] Hack Club CDN upload request failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return agentJson({ error: "Hack Club CDN could not be reached. The image was not uploaded." }, { status: 502 });
  }
  const cdnJson: unknown = await cdnResponse.json().catch(() => ({}));
  if (!cdnResponse.ok) {
    const error = typeof cdnJson === "object" && cdnJson && "error" in cdnJson ? String(cdnJson.error) : "Hack Club CDN rejected the upload.";
    return agentJson({ error }, { status: cdnResponse.status });
  }
  const parsed = cdnResponseSchema.safeParse(cdnJson);
  if (!parsed.success) return agentJson({ error: "Hack Club CDN returned an unexpected response." }, { status: 502 });

  try {
    const [asset] = await requireDb()
      .insert(mediaAssets)
      .values({
        cdnId: parsed.data.id,
        url: parsed.data.url,
        filename: parsed.data.filename,
        mimeType: parsed.data.content_type,
        byteSize: parsed.data.size,
        width: dimensions.width,
        height: dimensions.height,
        altText,
        caption,
        takenDate,
        showInPhotoLog,
      })
      .returning();
    updateTag("photos");
    return agentJson({ asset }, { status: 201 });
  } catch (error) {
    console.error("[agent/v1/media] storing the uploaded image failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return agentJson({ error: "The image reached Hack Club CDN but could not be saved to the library." }, { status: 502 });
  }
}

/**
 * POST /api/agent/v1/media
 * - multipart/form-data with a `file` field: upload a new image via Hack Club CDN.
 * - application/json `{ url, altText, caption?, showInPhotoLog? }`: register an
 *   existing cdn.hackclub.com upload in the library.
 */
export async function POST(request: Request) {
  const denied = denyUnlessAgent(request);
  if (denied) return denied;
  try {
    requireDb();
  } catch {
    return dbUnavailable();
  }
  const contentType = request.headers.get("content-type") || "";
  try {
    if (contentType.includes("multipart/form-data")) {
      return await uploadImage(await request.formData());
    }
    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      return agentJson({ error: "Send multipart/form-data with a file, or JSON with a CDN URL." }, { status: 400 });
    }
    const parsed = agentRegisterMediaSchema.safeParse(payload);
    if (!parsed.success) return agentJson({ error: firstValidationError(parsed.error) }, { status: 400 });
    return await registerCdnAsset(parsed.data);
  } catch (error) {
    console.error("[agent/v1/media] create failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return agentJson({ error: "The media asset could not be created." }, { status: 500 });
  }
}
