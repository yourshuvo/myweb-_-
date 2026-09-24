import "server-only";

import { and, count, desc, eq, lt, lte, or, sql } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { connection } from "next/server";
import { getDb, requireDb } from "@/db";
import { postCommentRateLimits, postComments, posts } from "@/db/schema";

export const POST_COMMENT_DAILY_LIMIT = 3;

export type PublicPostComment = {
  id: string;
  displayName: string | null;
  message: string;
  createdAt: Date | string;
};

const publicSelection = {
  id: postComments.id,
  displayName: postComments.displayName,
  message: postComments.message,
  createdAt: postComments.createdAt,
};

async function queryPostComments(postId: string) {
  const db = getDb();
  if (!db) return [] as PublicPostComment[];
  return db
    .select(publicSelection)
    .from(postComments)
    .where(and(eq(postComments.postId, postId), eq(postComments.status, "visible")))
    .orderBy(desc(postComments.createdAt));
}

export const getPostComments = unstable_cache(
  async (postId: string) => queryPostComments(postId),
  ["post-comments"],
  { tags: ["post-comments"] },
);

export async function getPostCommentCount(postId: string) {
  const db = getDb();
  if (!db) return 0;
  const [row] = await db
    .select({ total: count() })
    .from(postComments)
    .where(and(eq(postComments.postId, postId), eq(postComments.status, "visible")));
  return row?.total ?? 0;
}

export async function getAdminPostComments(status: "visible" | "hidden", postId?: string) {
  await connection();
  const db = requireDb();
  const filters = [eq(postComments.status, status)];
  if (postId) filters.push(eq(postComments.postId, postId));
  return db
    .select()
    .from(postComments)
    .where(and(...filters))
    .orderBy(desc(postComments.createdAt));
}

export async function getAdminPostCommentsWithPosts(status: "visible" | "hidden") {
  await connection();
  const db = requireDb();
  return db
    .select({
      id: postComments.id,
      postId: postComments.postId,
      displayName: postComments.displayName,
      message: postComments.message,
      status: postComments.status,
      createdAt: postComments.createdAt,
      hiddenAt: postComments.hiddenAt,
      postTitle: posts.title,
      postSlug: posts.slug,
    })
    .from(postComments)
    .leftJoin(posts, eq(postComments.postId, posts.id))
    .where(eq(postComments.status, status))
    .orderBy(desc(postComments.createdAt));
}

export async function getAdminPostCommentCounts() {
  await connection();
  const db = requireDb();
  const [visible] = await db
    .select({ total: count() })
    .from(postComments)
    .where(eq(postComments.status, "visible"));
  const [hidden] = await db
    .select({ total: count() })
    .from(postComments)
    .where(eq(postComments.status, "hidden"));
  return { visible: visible?.total ?? 0, hidden: hidden?.total ?? 0 };
}

export async function reservePostCommentSubmission(visitorHash: string, now = new Date()) {
  const db = requireDb();
  const cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1_000);
  const [slot] = await db
    .insert(postCommentRateLimits)
    .values({ visitorHash, windowStartedAt: now, submissionCount: 1, updatedAt: now })
    .onConflictDoUpdate({
      target: postCommentRateLimits.visitorHash,
      set: {
        windowStartedAt: sql`case when ${postCommentRateLimits.windowStartedAt} <= ${cutoff} then ${now} else ${postCommentRateLimits.windowStartedAt} end`,
        submissionCount: sql`case when ${postCommentRateLimits.windowStartedAt} <= ${cutoff} then 1 else ${postCommentRateLimits.submissionCount} + 1 end`,
        updatedAt: now,
      },
      setWhere: or(
        lte(postCommentRateLimits.windowStartedAt, cutoff),
        lt(postCommentRateLimits.submissionCount, POST_COMMENT_DAILY_LIMIT),
      ),
    })
    .returning({ submissionCount: postCommentRateLimits.submissionCount });
  return Boolean(slot);
}

export async function createPostComment(postId: string, displayName: string | null, message: string) {
  const [comment] = await requireDb()
    .insert(postComments)
    .values({ postId, displayName, message, status: "visible" })
    .returning({ id: postComments.id });
  return comment ?? null;
}
