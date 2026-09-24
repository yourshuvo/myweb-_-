import { revalidateTag } from "next/cache";
import { requireDb } from "@/db";
import { siteProfile } from "@/db/schema";
import { agentJson, denyUnlessAgent, firstValidationError } from "@/lib/agent/auth";
import { agentProfileSchema } from "@/lib/agent/agent-schemas";
import { normalizeSpotifyPlaylistUrl } from "@/lib/spotify";

export const runtime = "nodejs";

function dbUnavailable() {
  return agentJson({ error: "DATABASE_URL is not configured." }, { status: 503 });
}

/** GET /api/agent/v1/profile — the site profile (about text, links, Spotify). */
export async function GET(request: Request) {
  const denied = denyUnlessAgent(request);
  if (denied) return denied;
  try {
    requireDb();
  } catch {
    return dbUnavailable();
  }
  try {
    const [profile] = await requireDb().select().from(siteProfile).limit(1);
    return agentJson({ profile: profile || null });
  } catch (error) {
    console.error("[agent/v1/profile] fetch failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return agentJson({ error: "The profile could not be loaded." }, { status: 500 });
  }
}

/**
 * PUT /api/agent/v1/profile — replace the site profile (upsert).
 * Body: { displayName, siteTitle, biography, avatarMediaId, contactEmail,
 *         website, github, instagram, mastodon, spotifyPlaylistTitle, spotifyPlaylistUrl }
 */
export async function PUT(request: Request) {
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
  const parsed = agentProfileSchema.safeParse(payload);
  if (!parsed.success) return agentJson({ error: firstValidationError(parsed.error) }, { status: 400 });
  const data = parsed.data;
  const spotifyPlaylistUrl = normalizeSpotifyPlaylistUrl(data.spotifyPlaylistUrl) || "";
  try {
    const values = {
      displayName: data.displayName,
      siteTitle: data.siteTitle,
      biography: data.biography,
      avatarMediaId: data.avatarMediaId || null,
      contactEmail: data.contactEmail,
      socialLinks: {
        website: data.website || undefined,
        github: data.github || undefined,
        instagram: data.instagram || undefined,
        mastodon: data.mastodon || undefined,
      },
      spotifyPlaylistTitle: data.spotifyPlaylistTitle,
      spotifyPlaylistUrl,
      updatedAt: new Date(),
    };
    const [profile] = await db
      .insert(siteProfile)
      // onboardedAt is set only on first creation; updates must preserve it.
      .values({ id: 1, ...values, onboardedAt: new Date() })
      .onConflictDoUpdate({ target: siteProfile.id, set: values })
      .returning();
    revalidateTag("profile", { expire: 0 });
    return agentJson({ profile });
  } catch (error) {
    console.error("[agent/v1/profile] save failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return agentJson({ error: "The profile could not be saved." }, { status: 500 });
  }
}
