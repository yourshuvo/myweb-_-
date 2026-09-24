import { eq } from "drizzle-orm";
import { revalidateTag } from "next/cache";
import { requireDb } from "@/db";
import { postComments } from "@/db/schema";
import { agentJson, denyUnlessAgent, firstValidationError } from "@/lib/agent/auth";
import { agentPostCommentPatchSchema, uuidParam } from "@/lib/agent/agent-schemas";

export const runtime = "nodejs";

function dbUnavailable() {
  return agentJson({ error: "DATABASE_URL is not configured." }, { status: 503 });
}

type RouteContext = { params: Promise<{ id: string }> };

/**
 * PATCH /api/agent/v1/comments/[id]
 * Body: { status: "visible" | "hidden" } — moderate a comment.
 */
export async function PATCH(request: Request, context: RouteContext) {
  const denied = denyUnlessAgent(request);
  if (denied) return denied;
  const { id } = await context.params;
  if (!uuidParam.safeParse(id).success) return agentJson({ error: "Invalid ID." }, { status: 400 });
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return agentJson({ error: "The request body must be valid JSON." }, { status: 400 });
  }
  const parsed = agentPostCommentPatchSchema.safeParse(payload);
  if (!parsed.success) return agentJson({ error: firstValidationError(parsed.error) }, { status: 400 });
  let db;
  try {
    db = requireDb();
  } catch {
    return dbUnavailable();
  }
  try {
    const [updated] = await db
      .update(postComments)
      .set({
        status: parsed.data.status,
        hiddenAt: parsed.data.status === "hidden" ? new Date() : null,
      })
      .where(eq(postComments.id, id))
      .returning();
    if (!updated) return agentJson({ error: "Comment not found." }, { status: 404 });
    revalidateTag("post-comments", { expire: 0 });
    return agentJson({ comment: updated });
  } catch (error) {
    console.error("[agent/v1/comments] update failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return agentJson({ error: "The comment could not be updated." }, { status: 500 });
  }
}

/** DELETE /api/agent/v1/comments/[id] */
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
    const [deleted] = await db.delete(postComments).where(eq(postComments.id, id)).returning({ id: postComments.id });
    if (!deleted) return agentJson({ error: "Comment not found." }, { status: 404 });
    revalidateTag("post-comments", { expire: 0 });
    return agentJson({ deleted: true, id: deleted.id });
  } catch (error) {
    console.error("[agent/v1/comments] delete failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return agentJson({ error: "The comment could not be deleted." }, { status: 500 });
  }
}
