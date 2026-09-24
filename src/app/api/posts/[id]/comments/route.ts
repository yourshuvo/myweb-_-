import { revalidateTag } from "next/cache";
import { z } from "zod";
import { getPublishedPostById } from "@/lib/data";
import { hasVisitorTrackingConfig } from "@/lib/env";
import { incrementVisitorCount } from "@/lib/guestbook-data";
import { createPostComment, reservePostCommentSubmission } from "@/lib/post-comments-data";
import { postCommentSchema } from "@/lib/validation";
import { getOrCreateVisitorIdentity } from "@/lib/visitor-cookie";

export const runtime = "nodejs";

const postIdParam = z.uuid("Invalid post ID.");

type RouteContext = { params: Promise<{ id: string }> };

function jsonError(error: string, status: number) {
  return Response.json({ error }, { status });
}

/**
 * POST /api/posts/[id]/comments
 * Submit a public comment on a published post. The display name is optional;
 * a blank name is shown as "Anonymous". Protected by the honeypot field, a
 * signed visitor cookie, and a three-per-day per-browser limit.
 */
export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  if (!postIdParam.safeParse(id).success) return jsonError("Invalid post ID.", 400);

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return jsonError("The request body must be valid JSON.", 400);
  }
  const parsed = postCommentSchema.safeParse(payload);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message || "Check the comment fields.", 400);
  }

  if (!hasVisitorTrackingConfig()) {
    return jsonError("Comments are temporarily unavailable.", 503);
  }

  const post = await getPublishedPostById(id);
  if (!post) return jsonError("Post not found.", 404);

  try {
    const identity = await getOrCreateVisitorIdentity();
    if (identity.isNew) await incrementVisitorCount();
    if (!(await reservePostCommentSubmission(identity.visitorHash))) {
      return jsonError("This browser has reached the three-comment daily limit.", 429);
    }
    const comment = await createPostComment(id, parsed.data.displayName || null, parsed.data.message);
    if (!comment) return jsonError("The comment could not be saved.", 500);
    revalidateTag("post-comments", { expire: 0 });
    return Response.json(
      { ok: true, id: comment.id, message: "Your comment is now on this post." },
      { status: 201 },
    );
  } catch {
    return jsonError("The comment could not be saved. Please try again.", 500);
  }
}
