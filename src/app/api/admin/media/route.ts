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

export async function POST(request: Request) {
  try {
    await requireAdmin();
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const apiKey = getServerEnv("HACKCLUB_CDN_API_KEY");
  if (!apiKey) return Response.json({ error: "HACKCLUB_CDN_API_KEY is not configured." }, { status: 503 });

  const body = await request.formData();
  const file = body.get("file");
  const altText = String(body.get("altText") || "").trim();
  const caption = String(body.get("caption") || "").trim();
  const takenDate = String(body.get("takenDate") || "") || null;
  const showInPhotoLog = body.get("showInPhotoLog") === "on";
  if (!(file instanceof File)) return Response.json({ error: "Choose an image file." }, { status: 400 });
  if (!altText || altText.length > 300) return Response.json({ error: "Alt text is required and must be under 300 characters." }, { status: 400 });
  if (!allowedTypes.has(file.type)) return Response.json({ error: "Only JPEG, PNG, and WebP images are accepted." }, { status: 415 });
  if (file.size > MAX_UPLOAD_BYTES) return Response.json({ error: "The optimized image must be below 3.9 MB." }, { status: 413 });

  const bytes = Buffer.from(await file.arrayBuffer());
  let metadata: { width?: number; height?: number };
  try {
    metadata = await sharp(bytes).metadata();
  } catch {
    return Response.json({ error: "The uploaded file is not a readable image." }, { status: 422 });
  }
  if (!metadata.width || !metadata.height || metadata.width > 2400 || metadata.height > 2400) {
    return Response.json({ error: "The optimized image dimensions must be between 1 and 2400 pixels." }, { status: 422 });
  }

  const uploadBody = new FormData();
  uploadBody.append("file", new Blob([bytes], { type: file.type }), file.name);
  const cdnResponse = await fetch("https://cdn.hackclub.com/api/v4/upload", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: uploadBody,
  });
  const cdnJson: unknown = await cdnResponse.json().catch(() => ({}));
  if (!cdnResponse.ok) {
    const error = typeof cdnJson === "object" && cdnJson && "error" in cdnJson ? String(cdnJson.error) : "Hack Club CDN rejected the upload.";
    return Response.json({ error }, { status: cdnResponse.status });
  }
  const parsed = cdnResponseSchema.safeParse(cdnJson);
  if (!parsed.success) return Response.json({ error: "Hack Club CDN returned an unexpected response." }, { status: 502 });

  const [asset] = await requireDb().insert(mediaAssets).values({
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
  revalidateTag("photos", { expire: 0 });
  return Response.json({ asset }, { status: 201 });
}
