import "server-only";

import { count, desc, eq, lt, lte, or, sql } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { connection } from "next/server";
import { getDb, requireDb } from "@/db";
import { guestbookEntries, guestbookRateLimits, siteStats } from "@/db/schema";

export const GUESTBOOK_PAGE_SIZE = 20;
export const GUESTBOOK_DAILY_LIMIT = 3;

export type PublicGuestbookEntry = {
  id: string;
  displayName: string | null;
  message: string;
  createdAt: Date | string;
};

const publicSelection = {
  id: guestbookEntries.id,
  displayName: guestbookEntries.displayName,
  message: guestbookEntries.message,
  createdAt: guestbookEntries.createdAt,
};

export const getLatestGuestbookEntries = unstable_cache(
  async () => {
    const db = getDb();
    if (!db) return [];
    return db
      .select(publicSelection)
      .from(guestbookEntries)
      .where(eq(guestbookEntries.status, "visible"))
      .orderBy(desc(guestbookEntries.createdAt))
      .limit(3);
  },
  ["latest-guestbook-entries"],
  { tags: ["guestbook"] },
);

export const getGuestbookPage = unstable_cache(
  async (page: number) => {
    const db = getDb();
    if (!db) return { entries: [] as PublicGuestbookEntry[], total: 0, page: 1, pageCount: 1 };
    const requestedPage = Math.max(1, Math.floor(page));
    const [totalRow] = await db
      .select({ total: count() })
      .from(guestbookEntries)
      .where(eq(guestbookEntries.status, "visible"));
    const total = totalRow?.total ?? 0;
    const pageCount = Math.max(1, Math.ceil(total / GUESTBOOK_PAGE_SIZE));
    const safePage = Math.min(requestedPage, pageCount);
    const entries = await db
      .select(publicSelection)
      .from(guestbookEntries)
      .where(eq(guestbookEntries.status, "visible"))
      .orderBy(desc(guestbookEntries.createdAt))
      .limit(GUESTBOOK_PAGE_SIZE)
      .offset((safePage - 1) * GUESTBOOK_PAGE_SIZE);
    return { entries, total, page: safePage, pageCount };
  },
  ["guestbook-page"],
  { tags: ["guestbook"] },
);

export async function getAdminGuestbookEntries(status: "visible" | "hidden") {
  await connection();
  return requireDb()
    .select()
    .from(guestbookEntries)
    .where(eq(guestbookEntries.status, status))
    .orderBy(desc(guestbookEntries.createdAt));
}

export async function reserveGuestbookSubmission(visitorHash: string, now = new Date()) {
  const db = requireDb();
  const cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1_000);
  const [slot] = await db
    .insert(guestbookRateLimits)
    .values({ visitorHash, windowStartedAt: now, submissionCount: 1, updatedAt: now })
    .onConflictDoUpdate({
      target: guestbookRateLimits.visitorHash,
      set: {
        windowStartedAt: sql`case when ${guestbookRateLimits.windowStartedAt} <= ${cutoff} then ${now} else ${guestbookRateLimits.windowStartedAt} end`,
        submissionCount: sql`case when ${guestbookRateLimits.windowStartedAt} <= ${cutoff} then 1 else ${guestbookRateLimits.submissionCount} + 1 end`,
        updatedAt: now,
      },
      setWhere: or(
        lte(guestbookRateLimits.windowStartedAt, cutoff),
        lt(guestbookRateLimits.submissionCount, GUESTBOOK_DAILY_LIMIT),
      ),
    })
    .returning({ submissionCount: guestbookRateLimits.submissionCount });
  return Boolean(slot);
}

export async function createGuestbookEntry(displayName: string | null, message: string) {
  const [entry] = await requireDb()
    .insert(guestbookEntries)
    .values({ displayName, message, status: "visible" })
    .returning({ id: guestbookEntries.id });
  return entry ?? null;
}

export async function incrementVisitorCount() {
  const now = new Date();
  const [stats] = await requireDb()
    .insert(siteStats)
    .values({ id: 1, visitorCount: 1, updatedAt: now })
    .onConflictDoUpdate({
      target: siteStats.id,
      set: { visitorCount: sql`${siteStats.visitorCount} + 1`, updatedAt: now },
    })
    .returning({ total: siteStats.visitorCount });
  return stats?.total ?? 0;
}

export async function getVisitorCount() {
  const [stats] = await requireDb().select({ total: siteStats.visitorCount }).from(siteStats).where(eq(siteStats.id, 1)).limit(1);
  return stats?.total ?? 0;
}
