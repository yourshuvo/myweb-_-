import sharp from "sharp";
import { z } from "zod";
import { revalidateTag } from "next/cache";
import { mediaAssets } from "@/db/schema";
import { requireDb } from "@/db";
import { requireAdmin } from "@/lib/auth/server";
import { getServerEnv } from "@/lib/env";

export const runtime = "nodejs";

const MAX_UPLOAD_BYTES = Math.floor(3.9 * 1024 * 1024);
const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const cdnResponseSchema = z.object({
  id: z.string().min(1),
  filename: z.string().min(1),
  size: z.number().int().nonnegative(),
  content_type: z.string().min(1),
  url: z.url(),
});

function privateJson(body: object, init?: ResponseInit) {
  const headers = new Headers(init?.headers);
  headers.set("Cache-Control", "private, no-store");
  return Response.json(body, { ...init, headers });
}

export async function POST(request: Request) {
  try {
    await requireAdmin();
  } catch {
    return privateJson({ error: "Unauthorized" }, { status: 401 });
  }
  const apiKey = getServerEnv("HACKCLUB_CDN_API_KEY");
  if (!apiKey) return privateJson({ error: "HACKCLUB_CDN_API_KEY is not configured." }, { status: 503 });

  try {
    const body = await request.formData();
    const file = body.get("file");
    const altText = String(body.get("altText") || "").trim();
    const caption = String(body.get("caption") || "").trim();
    const takenDate = String(body.get("takenDate") || "") || null;
    const showInPhotoLog = body.get("showInPhotoLog") === "on";
    if (!(file instanceof File)) return privateJson({ error: "Choose an image file." }, { status: 400 });
    if (!altText || altText.length > 300) return privateJson({ error: "Alt text is required and must be under 300 characters." }, { status: 400 });
    if (!allowedTypes.has(file.type)) return privateJson({ error: "Only JPEG, PNG, and WebP images are accepted." }, { status: 415 });
    if (file.size > MAX_UPLOAD_BYTES) return privateJson({ error: "The optimized image must be below 3.9 MB." }, { status: 413 });

    const bytes = Buffer.from(await file.arrayBuffer());
    let metadata: { width?: number; height?: number };
    try {
      metadata = await sharp(bytes).metadata();
    } catch {
      return privateJson({ error: "The uploaded file is not a readable image." }, { status: 422 });
    }
    if (!metadata.width || !metadata.height || metadata.width > 2400 || metadata.height > 2400) {
      return privateJson({ error: "The optimized image dimensions must be between 1 and 2400 pixels." }, { status: 422 });
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
      console.error("[admin/media] Hack Club CDN upload request failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      return privateJson({ error: "Hack Club CDN could not be reached. The image was not uploaded." }, { status: 502 });
    }
    const cdnJson: unknown = await cdnResponse.json().catch(() => ({}));
    if (!cdnResponse.ok) {
      const error = typeof cdnJson === "object" && cdnJson && "error" in cdnJson ? String(cdnJson.error) : "Hack Club CDN rejected the upload.";
      return privateJson({ error }, { status: cdnResponse.status });
    }
    const parsed = cdnResponseSchema.safeParse(cdnJson);
    if (!parsed.success) return privateJson({ error: "Hack Club CDN returned an unexpected response." }, { status: 502 });

    let asset;
    try {
      [asset] = await requireDb().insert(mediaAssets).values({
        cdnId: parsed.data.id,
        url: parsed.data.url,
        filename: parsed.data.filename,
        mimeType: parsed.data.content_type,
        byteSize: parsed.data.size,
        width: metadata.width,
        height: metadata.height,
        altText,
        caption,
        takenDate,
        showInPhotoLog,
      }).returning();
    } catch (error) {
      console.error("[admin/media] Storing the uploaded image failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      return privateJson({ error: "The image reached Hack Club CDN but could not be saved to the library. Try again." }, { status: 502 });
    }
    revalidateTag("photos", { expire: 0 });
    return privateJson({ asset }, { status: 201 });
  } catch (error) {
    console.error("[admin/media] Upload failed unexpectedly", {
      error: error instanceof Error ? error.message : String(error),
    });
    return privateJson({ error: "The upload could not be completed. Please try again." }, { status: 500 });
  }
}
