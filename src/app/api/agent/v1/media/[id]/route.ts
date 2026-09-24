import { eq } from "drizzle-orm";
import { revalidateTag } from "next/cache";
import { requireDb } from "@/db";
import { mediaAssets } from "@/db/schema";
import { agentJson, denyUnlessAgent } from "@/lib/agent/auth";
import { uuidParam } from "@/lib/agent/agent-schemas";
import { mediaIsReferenced } from "@/lib/data";
import { getServerEnv } from "@/lib/env";
import { interpretHackClubDeleteResponse } from "@/lib/hackclub-cdn";

export const runtime = "nodejs";

function dbUnavailable() {
  return agentJson({ error: "DATABASE_URL is not configured." }, { status: 503 });
}

type RouteContext = { params: Promise<{ id: string }> };

/** GET /api/agent/v1/media/[id] */
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
    const [asset] = await requireDb().select().from(mediaAssets).where(eq(mediaAssets.id, id)).limit(1);
    if (!asset) return agentJson({ error: "Media file not found." }, { status: 404 });
    return agentJson({ asset });
  } catch (error) {
    console.error("[agent/v1/media] fetch failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return agentJson({ error: "The media file could not be loaded." }, { status: 500 });
  }
}

/**
 * DELETE /api/agent/v1/media/[id]?mode=local-only
 * Deletes the library record and, unless mode=local-only, the Hack Club CDN upload.
 * Refuses with 409 while the asset is referenced by posts, albums, or the profile.
 */
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
    const [asset] = await db.select().from(mediaAssets).where(eq(mediaAssets.id, id)).limit(1);
    if (!asset) return agentJson({ error: "Media file not found." }, { status: 404 });
    if (await mediaIsReferenced(id)) {
      return agentJson(
        { error: "This image is still used by a post, thumbnail, album, cover, or the profile. Remove every reference first." },
        { status: 409 },
      );
    }
    const mode = new URL(request.url).searchParams.get("mode");
    if (mode === "local-only") {
      await db.delete(mediaAssets).where(eq(mediaAssets.id, id));
      revalidateTag("photos", { expire: 0 });
      return agentJson({ deleted: true, id, localOnly: true });
    }
    const apiKey = getServerEnv("HACKCLUB_CDN_API_KEY");
    if (!apiKey) return agentJson({ error: "HACKCLUB_CDN_API_KEY is not configured." }, { status: 503 });

    let cdnResponse: Response;
    try {
      cdnResponse = await fetch(`https://cdn.hackclub.com/api/v4/upload/${encodeURIComponent(asset.cdnId)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${apiKey}` },
        cache: "no-store",
        signal: AbortSignal.timeout(10_000),
      });
    } catch (error) {
      console.error("[agent/v1/media] Hack Club CDN delete request failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      return agentJson({ error: "Hack Club CDN could not be reached. The library record was preserved." }, { status: 502 });
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
    if (deleteResult.kind !== "deleted") {
      return agentJson(
        {
          error: "Hack Club CDN did not confirm deletion. The library record was preserved.",
          canRemoveLocal: deleteResult.kind === "missing",
        },
        { status: deleteResult.kind === "missing" ? 404 : 502 },
      );
    }
    await db.delete(mediaAssets).where(eq(mediaAssets.id, id));
    revalidateTag("photos", { expire: 0 });
    return agentJson({ deleted: true, id, cdnId: deleteResult.id });
  } catch (error) {
    console.error("[agent/v1/media] delete failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return agentJson({ error: "The media file could not be deleted." }, { status: 500 });
  }
}
