import "server-only";

import { count, desc, eq, lt, lte, or, sql } from "drizzle-orm";
import { connection } from "next/server";
import { requireDb } from "@/db";
import { anonymousMessageRateLimits, anonymousMessages } from "@/db/schema";

export const ANONYMOUS_MESSAGE_DAILY_LIMIT = 3;
export type AnonymousMessageStatus = "unread" | "read" | "archived";

export async function reserveAnonymousMessageSubmission(visitorHash: string, now = new Date()) {
  const db = requireDb();
  const cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1_000);
  const [slot] = await db
    .insert(anonymousMessageRateLimits)
    .values({ visitorHash, windowStartedAt: now, submissionCount: 1, updatedAt: now })
    .onConflictDoUpdate({
      target: anonymousMessageRateLimits.visitorHash,
      set: {
        windowStartedAt: sql`case when ${anonymousMessageRateLimits.windowStartedAt} <= ${cutoff} then ${now} else ${anonymousMessageRateLimits.windowStartedAt} end`,
        submissionCount: sql`case when ${anonymousMessageRateLimits.windowStartedAt} <= ${cutoff} then 1 else ${anonymousMessageRateLimits.submissionCount} + 1 end`,
        updatedAt: now,
      },
      setWhere: or(
        lte(anonymousMessageRateLimits.windowStartedAt, cutoff),
        lt(anonymousMessageRateLimits.submissionCount, ANONYMOUS_MESSAGE_DAILY_LIMIT),
      ),
    })
    .returning({ submissionCount: anonymousMessageRateLimits.submissionCount });
  return Boolean(slot);
}

export async function createAnonymousMessage(message: string) {
  const [created] = await requireDb()
    .insert(anonymousMessages)
    .values({ message, status: "unread" })
    .returning({ id: anonymousMessages.id });
  return created ?? null;
}

export async function getAdminAnonymousMessages(status: AnonymousMessageStatus) {
  await connection();
  return requireDb()
    .select()
    .from(anonymousMessages)
    .where(eq(anonymousMessages.status, status))
    .orderBy(desc(anonymousMessages.createdAt));
}

export async function getAnonymousMessageById(id: string) {
  await connection();
  const [message] = await requireDb()
    .select()
    .from(anonymousMessages)
    .where(eq(anonymousMessages.id, id))
    .limit(1);
  return message ?? null;
}

export async function getUnreadAnonymousMessageCount() {
  await connection();
  const [row] = await requireDb()
    .select({ total: count() })
    .from(anonymousMessages)
    .where(eq(anonymousMessages.status, "unread"));
  return row?.total ?? 0;
}
