import { and, desc, eq } from "drizzle-orm";
import { revalidateTag } from "next/cache";
import { requireDb } from "@/db";
import { postComments, posts } from "@/db/schema";
import { agentJson, denyUnlessAgent, firstValidationError } from "@/lib/agent/auth";
import {
  agentCreatePostCommentSchema,
  paginationSchema,
  parseStatusParam,
  uuidParam,
  visibleHiddenParam,
} from "@/lib/agent/agent-schemas";

export const runtime = "nodejs";

function dbUnavailable() {
  return agentJson({ error: "DATABASE_URL is not configured." }, { status: 503 });
}

type RouteContext = { params: Promise<{ id: string }> };

async function findPost(id: string) {
  const [row] = await requireDb().select({ id: posts.id }).from(posts).where(eq(posts.id, id)).limit(1);
  return row;
}

/**
 * GET /api/agent/v1/posts/[id]/comments?status=visible|hidden&limit=20&offset=0
 * List comments on a post, newest first.
 */
export async function GET(request: Request, context: RouteContext) {
  const denied = denyUnlessAgent(request);
  if (denied) return denied;
  const { id } = await context.params;
  if (!uuidParam.safeParse(id).success) return agentJson({ error: "Invalid post ID." }, { status: 400 });
  const params = new URL(request.url).searchParams;
  const pagination = paginationSchema.safeParse({ limit: params.get("limit"), offset: params.get("offset") });
  if (!pagination.success) return agentJson({ error: firstValidationError(pagination.error) }, { status: 400 });
  const statusResult = parseStatusParam(visibleHiddenParam, params.get("status"), 'status must be "visible" or "hidden".');
  if (!statusResult.ok) return statusResult.response;
  const status = statusResult.value;
  let db;
  try {
    db = requireDb();
  } catch {
    return dbUnavailable();
  }
  try {
    if (!(await findPost(id))) return agentJson({ error: "Post not found." }, { status: 404 });
    const filters = [eq(postComments.postId, id)];
    if (status) filters.push(eq(postComments.status, status));
    const rows = await db
      .select()
      .from(postComments)
      .where(and(...filters))
      .orderBy(desc(postComments.createdAt))
      .limit(pagination.data.limit)
      .offset(pagination.data.offset);
    return agentJson({ comments: rows });
  } catch (error) {
    console.error("[agent/v1/posts/comments] list failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return agentJson({ error: "The post comments could not be listed." }, { status: 500 });
  }
}

/**
 * POST /api/agent/v1/posts/[id]/comments
 * Body: { displayName?, message } — create a comment as the agent.
 */
export async function POST(request: Request, context: RouteContext) {
  const denied = denyUnlessAgent(request);
  if (denied) return denied;
  const { id } = await context.params;
  if (!uuidParam.safeParse(id).success) return agentJson({ error: "Invalid post ID." }, { status: 400 });
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return agentJson({ error: "The request body must be valid JSON." }, { status: 400 });
  }
  const parsed = agentCreatePostCommentSchema.safeParse(payload);
  if (!parsed.success) return agentJson({ error: firstValidationError(parsed.error) }, { status: 400 });
  let db;
  try {
    db = requireDb();
  } catch {
    return dbUnavailable();
  }
  try {
    if (!(await findPost(id))) return agentJson({ error: "Post not found." }, { status: 404 });
    const [comment] = await db
      .insert(postComments)
      .values({
        postId: id,
        displayName: parsed.data.displayName?.trim() || null,
        message: parsed.data.message,
        status: "visible",
      })
      .returning();
    revalidateTag("post-comments", { expire: 0 });
    return agentJson({ comment }, { status: 201 });
  } catch (error) {
    console.error("[agent/v1/posts/comments] create failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return agentJson({ error: "The comment could not be created." }, { status: 500 });
  }
}
