import { eq } from "drizzle-orm";
import { updateTag } from "next/cache";
import { requireDb } from "@/db";
import { guestbookEntries } from "@/db/schema";
import { agentJson, denyUnlessAgent, firstValidationError } from "@/lib/agent/auth";
import { agentGuestbookPatchSchema, uuidParam } from "@/lib/agent/agent-schemas";

export const runtime = "nodejs";

function dbUnavailable() {
  return agentJson({ error: "DATABASE_URL is not configured." }, { status: 503 });
}

type RouteContext = { params: Promise<{ id: string }> };

/**
 * PATCH /api/agent/v1/guestbook/[id]
 * Body: { status: "visible" | "hidden" } — moderate an entry.
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
  const parsed = agentGuestbookPatchSchema.safeParse(payload);
  if (!parsed.success) return agentJson({ error: firstValidationError(parsed.error) }, { status: 400 });
  try {
    const [updated] = await db
      .update(guestbookEntries)
      .set({
        status: parsed.data.status,
        hiddenAt: parsed.data.status === "hidden" ? new Date() : null,
      })
      .where(eq(guestbookEntries.id, id))
      .returning();
    if (!updated) return agentJson({ error: "Guestbook entry not found." }, { status: 404 });
    updateTag("guestbook");
    return agentJson({ entry: updated });
  } catch (error) {
    console.error("[agent/v1/guestbook] update failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return agentJson({ error: "The guestbook entry could not be updated." }, { status: 500 });
  }
}

/** DELETE /api/agent/v1/guestbook/[id] */
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
    const [deleted] = await db.delete(guestbookEntries).where(eq(guestbookEntries.id, id)).returning({ id: guestbookEntries.id });
    if (!deleted) return agentJson({ error: "Guestbook entry not found." }, { status: 404 });
    updateTag("guestbook");
    return agentJson({ deleted: true, id: deleted.id });
  } catch (error) {
    console.error("[agent/v1/guestbook] delete failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return agentJson({ error: "The guestbook entry could not be deleted." }, { status: 500 });
  }
}
