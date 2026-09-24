import { getDb } from "@/db";
import { agentJson, denyUnlessAgent } from "@/lib/agent/auth";
import { getAgentStatus } from "@/lib/agent/status";

export const runtime = "nodejs";

/**
 * GET /api/agent/v1/status
 * Read-only health snapshot: version, config flags, and per-table counts.
 */
export async function GET(request: Request) {
  const denied = denyUnlessAgent(request);
  if (denied) return denied;
  try {
    return agentJson(await getAgentStatus(getDb()));
  } catch (error) {
    console.error("[agent/v1/status] status check failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return agentJson({ error: "The status check could not be completed." }, { status: 500 });
  }
}
