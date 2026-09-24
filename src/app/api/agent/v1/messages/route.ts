import { desc, eq } from "drizzle-orm";
import { requireDb } from "@/db";
import { anonymousMessages } from "@/db/schema";
import { agentJson, denyUnlessAgent, firstValidationError } from "@/lib/agent/auth";
import { messageStatusParam, paginationSchema, parseStatusParam } from "@/lib/agent/agent-schemas";

export const runtime = "nodejs";

function dbUnavailable() {
  return agentJson({ error: "DATABASE_URL is not configured." }, { status: 503 });
}

/**
 * GET /api/agent/v1/messages?status=unread|read|archived&limit=20&offset=0
 * List anonymous inbox messages, newest first.
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
  const statusResult = parseStatusParam(messageStatusParam, params.get("status"), 'status must be "unread", "read", or "archived".');
  if (!statusResult.ok) return statusResult.response;
  const status = statusResult.value;
  try {
    const rows = await db
      .select()
      .from(anonymousMessages)
      .where(status ? eq(anonymousMessages.status, status) : undefined)
      .orderBy(desc(anonymousMessages.createdAt))
      .limit(pagination.data.limit)
      .offset(pagination.data.offset);
    return agentJson({ messages: rows });
  } catch (error) {
    console.error("[agent/v1/messages] list failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return agentJson({ error: "The messages could not be listed." }, { status: 500 });
  }
}
