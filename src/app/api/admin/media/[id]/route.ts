import { eq } from "drizzle-orm";
import { revalidateTag } from "next/cache";
import { requireDb } from "@/db";
import { mediaAssets } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/server";
import { mediaIsReferenced } from "@/lib/data";
import { getServerEnv } from "@/lib/env";
import { interpretHackClubDeleteResponse } from "@/lib/hackclub-cdn";

function privateJson(body: object, init?: ResponseInit) {
  const headers = new Headers(init?.headers);
  headers.set("Cache-Control", "private, no-store");
  return Response.json(body, { ...init, headers });
}

async function removeLibraryRecord(id: string) {
  await requireDb().delete(mediaAssets).where(eq(mediaAssets.id, id));
  revalidateTag("photos", { expire: 0 });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
  } catch {
    return privateJson({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const db = requireDb();
  const [asset] = await db.select().from(mediaAssets).where(eq(mediaAssets.id, id)).limit(1);
  if (!asset) return privateJson({ error: "Media file not found." }, { status: 404 });
  if (await mediaIsReferenced(id)) {
    return privateJson({ error: "This image is still used by a post, thumbnail, album, cover, or the profile. Remove every reference first." }, { status: 409 });
  }

  const mode = new URL(request.url).searchParams.get("mode");
  if (mode === "local-only") {
    await removeLibraryRecord(id);
    return privateJson({ deleted: true, localOnly: true });
  }

  const apiKey = getServerEnv("HACKCLUB_CDN_API_KEY");
  if (!apiKey) return privateJson({ error: "HACKCLUB_CDN_API_KEY is not configured." }, { status: 503 });

  let cdnResponse: Response;
  try {
    cdnResponse = await fetch(`https://cdn.hackclub.com/api/v4/upload/${encodeURIComponent(asset.cdnId)}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${apiKey}` },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
  } catch (error) {
    console.error("[admin/media] Hack Club CDN delete request failed", {
      error: error instanceof Error ? error.message : String(error),
      mediaId: id,
    });
    return privateJson({ error: "Hack Club CDN could not be reached. The library record was preserved." }, { status: 502 });
  }

  const responseText = await cdnResponse.text();
  let responseBody: unknown = null;
  if (responseText) {
    try {
      responseBody = JSON.parse(responseText);
    } catch {
      responseBody = null;
    }
  }
  const deleteResult = interpretHackClubDeleteResponse(cdnResponse.status, responseBody);

  if (deleteResult.kind === "missing") {
    console.warn("[admin/media] CDN upload is absent or belongs to another API key", {
      mediaId: id,
      upstreamStatus: cdnResponse.status,
    });
    return privateJson({
      error: "Hack Club could not find this upload for the configured API key. It may already be absent or owned by another key. The library record was preserved.",
      canRemoveLocal: true,
    }, { status: 404 });
  }

  if (deleteResult.kind === "unauthorized") {
    console.error("[admin/media] Hack Club rejected the configured CDN API key", { mediaId: id });
    return privateJson({
      error: "Hack Club rejected the configured CDN API key. Update HACKCLUB_CDN_API_KEY before trying again. The library record was preserved.",
    }, { status: 502 });
  }

  if (deleteResult.kind === "upstream-error") {
    console.error("[admin/media] Hack Club CDN rejected the delete request", {
      mediaId: id,
      upstreamStatus: deleteResult.status,
    });
    return privateJson({
      error: `Hack Club CDN could not delete this upload (status ${deleteResult.status}). The library record was preserved.`,
    }, { status: 502 });
  }

  if (deleteResult.kind === "invalid-response") {
    console.error("[admin/media] Hack Club CDN returned an invalid delete response", {
      mediaId: id,
      upstreamStatus: cdnResponse.status,
    });
    return privateJson({ error: "Hack Club did not confirm deletion. The library record was preserved." }, { status: 502 });
  }

  await removeLibraryRecord(id);
  return privateJson({ deleted: true, cdnId: deleteResult.id });
}
