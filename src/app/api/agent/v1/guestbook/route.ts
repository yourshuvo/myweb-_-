import { desc, eq } from "drizzle-orm";
import { requireDb } from "@/db";
import { guestbookEntries } from "@/db/schema";
import { agentJson, denyUnlessAgent, firstValidationError } from "@/lib/agent/auth";
import { paginationSchema, parseStatusParam, visibleHiddenParam } from "@/lib/agent/agent-schemas";

export const runtime = "nodejs";

function dbUnavailable() {
  return agentJson({ error: "DATABASE_URL is not configured." }, { status: 503 });
}

/**
 * GET /api/agent/v1/guestbook?status=visible|hidden&limit=20&offset=0
 * List guestbook entries, newest first.
 */
export async function GET(request: Request) {
  const denied = denyUnlessAgent(request);
  if (denied) return denied;
  let db;
  try {
    db = requireDb();
  } catch {
    return dbUnavailable();
  }
  const params = new URL(request.url).searchParams;
  const pagination = paginationSchema.safeParse({ limit: params.get("limit"), offset: params.get("offset") });
  if (!pagination.success) return agentJson({ error: firstValidationError(pagination.error) }, { status: 400 });
  const statusResult = parseStatusParam(visibleHiddenParam, params.get("status"), 'status must be "visible" or "hidden".');
  if (!statusResult.ok) return statusResult.response;
  const status = statusResult.value;
  try {
    const rows = await db
      .select()
      .from(guestbookEntries)
      .where(status ? eq(guestbookEntries.status, status) : undefined)
      .orderBy(desc(guestbookEntries.createdAt))
      .limit(pagination.data.limit)
      .offset(pagination.data.offset);
    return agentJson({ entries: rows });
  } catch (error) {
    console.error("[agent/v1/guestbook] list failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return agentJson({ error: "The guestbook entries could not be listed." }, { status: 500 });
  }
}
