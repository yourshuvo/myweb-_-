import { eq } from "drizzle-orm";
import { requireDb } from "@/db";
import { anonymousMessages } from "@/db/schema";
import { agentJson, denyUnlessAgent, firstValidationError } from "@/lib/agent/auth";
import { agentMessagePatchSchema, uuidParam } from "@/lib/agent/agent-schemas";
import { anonymousMessageTransition } from "@/lib/anonymous-message-model";

export const runtime = "nodejs";

function dbUnavailable() {
  return agentJson({ error: "DATABASE_URL is not configured." }, { status: 503 });
}

type RouteContext = { params: Promise<{ id: string }> };

/**
 * PATCH /api/agent/v1/messages/[id]
 * Body: { operation: "read" | "unread" | "archive" | "restore" }
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
  const parsed = agentMessagePatchSchema.safeParse(payload);
  if (!parsed.success) return agentJson({ error: firstValidationError(parsed.error) }, { status: 400 });
  try {
    const [updated] = await db
      .update(anonymousMessages)
      .set(anonymousMessageTransition(parsed.data.operation))
      .where(eq(anonymousMessages.id, id))
      .returning();
    if (!updated) return agentJson({ error: "Message not found." }, { status: 404 });
    return agentJson({ message: updated });
  } catch (error) {
    console.error("[agent/v1/messages] update failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return agentJson({ error: "The message could not be updated." }, { status: 500 });
  }
}

/** DELETE /api/agent/v1/messages/[id] */
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
    const [deleted] = await db.delete(anonymousMessages).where(eq(anonymousMessages.id, id)).returning({ id: anonymousMessages.id });
    if (!deleted) return agentJson({ error: "Message not found." }, { status: 404 });
    return agentJson({ deleted: true, id: deleted.id });
  } catch (error) {
    console.error("[agent/v1/messages] delete failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return agentJson({ error: "The message could not be deleted." }, { status: 500 });
  }
}
