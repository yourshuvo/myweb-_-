import { eq } from "drizzle-orm";
import { requireDb } from "@/db";
import { anonymousMessages } from "@/db/schema";
import { agentJson, denyUnlessAgent } from "@/lib/agent/auth";
import { uuidParam } from "@/lib/agent/agent-schemas";
import { renderAnonymousStoryImage } from "@/lib/story-image-render";

export const runtime = "nodejs";

function dbUnavailable() {
  return agentJson({ error: "DATABASE_URL is not configured." }, { status: 503 });
}

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET /api/agent/v1/messages/[id]/story
 * Render the Windows 98 story card (1080x1920 PNG download) for an
 * anonymous message. Same image the admin dashboard generates.
 */
export async function GET(request: Request, context: RouteContext) {
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
    const [message] = await db
      .select()
      .from(anonymousMessages)
      .where(eq(anonymousMessages.id, id))
      .limit(1);
    if (!message) return agentJson({ error: "Message not found." }, { status: 404 });
    return await renderAnonymousStoryImage(message, request);
  } catch (error) {
    console.error("[agent/v1/messages] story failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return agentJson({ error: "The story image could not be rendered." }, { status: 500 });
  }
}
