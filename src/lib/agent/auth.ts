import { timingSafeEqual } from "node:crypto";
import { getServerEnv } from "@/lib/env";

export const AGENT_API_KEY_HEADER = "x-agent-key";

/** The configured agent key, or undefined when the agent API is disabled. */
export function getAgentApiKey() {
  return getServerEnv("AGENT_API_KEY");
}

function extractProvidedKey(request: Request): string | null {
  const authorization = request.headers.get("authorization");
  if (authorization) {
    const [scheme, ...rest] = authorization.split(" ");
    if (scheme?.toLowerCase() === "bearer") {
      const token = rest.join(" ").trim();
      if (token) return token;
    }
  }
  const headerKey = request.headers.get(AGENT_API_KEY_HEADER)?.trim();
  return headerKey || null;
}

/**
 * Constant-time comparison of the request credential against AGENT_API_KEY.
 * Never logs the key. Returns false when the API is not configured.
 */
export function isAgentAuthorized(request: Request): boolean {
  const expected = getAgentApiKey();
  if (!expected) return false;
  const provided = extractProvidedKey(request);
  if (!provided) return false;
  const expectedBuffer = Buffer.from(expected, "utf8");
  const providedBuffer = Buffer.from(provided, "utf8");
  if (expectedBuffer.length !== providedBuffer.length) return false;
  return timingSafeEqual(expectedBuffer, providedBuffer);
}

/** JSON responses for the agent API: always private and never cached. */
export function agentJson(body: object, init?: ResponseInit) {
  const headers = new Headers(init?.headers);
  headers.set("Cache-Control", "private, no-store");
  return Response.json(body, { ...init, headers });
}

export function agentUnauthorized() {
  return agentJson({ error: "Unauthorized" }, { status: 401 });
}

/**
 * Returns a 401 JSON response when the request is not agent-authorized,
 * or null when it is. Usage: `const denied = denyUnlessAgent(request); if (denied) return denied;`
 */
export function denyUnlessAgent(request: Request): Response | null {
  return isAgentAuthorized(request) ? null : agentUnauthorized();
}

export function firstValidationError(error: { issues: Array<{ message: string }> }) {
  return error.issues[0]?.message || "The request was invalid.";
}
