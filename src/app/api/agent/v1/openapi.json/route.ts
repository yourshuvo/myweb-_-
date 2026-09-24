import { agentJson, denyUnlessAgent } from "@/lib/agent/auth";
import { agentOpenApiSpec } from "@/lib/agent/openapi";

export const runtime = "nodejs";

/**
 * GET /api/agent/v1/openapi.json
 * Machine-readable OpenAPI 3.1 description of the agent-control API.
 */
export async function GET(request: Request) {
  const denied = denyUnlessAgent(request);
  if (denied) return denied;
  return agentJson(agentOpenApiSpec);
}
