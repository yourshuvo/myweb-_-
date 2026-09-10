import { createNeonAuth } from "@neondatabase/auth/next/server";
import { headers } from "next/headers";
import { getServerEnv, hasAuthConfig } from "@/lib/env";

let authInstance: ReturnType<typeof createNeonAuth> | null | undefined;

export function getAuth() {
  if (authInstance !== undefined) return authInstance;
  if (!hasAuthConfig()) return (authInstance = null);

  authInstance = createNeonAuth({
    baseUrl: getServerEnv("NEON_AUTH_BASE_URL")!,
    cookies: {
      secret: getServerEnv("NEON_AUTH_COOKIE_SECRET")!,
      sessionDataTtl: 300,
      sameSite: "lax",
    },
  });
  return authInstance;
}

export async function getAdminUser() {
  const baseUrl = getServerEnv("NEON_AUTH_BASE_URL");
  const adminEmail = getServerEnv("ADMIN_EMAIL")?.toLowerCase();
  if (!baseUrl || !adminEmail) return null;

  const requestHeaders = await headers();
  const cookie = requestHeaders.get("cookie");
  if (!cookie) return null;
  const upstreamHeaders = new Headers({
    cookie,
    "x-neon-auth-proxy": "nextjs",
  });
  const origin = requestHeaders.get("origin") || requestHeaders.get("referer")?.split("/").slice(0, 3).join("/");
  if (origin) upstreamHeaders.set("origin", origin);

  let response: Response;
  try {
    response = await fetch(new URL("get-session", baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`), {
      headers: upstreamHeaders,
      cache: "no-store",
    });
  } catch {
    return null;
  }
  if (!response.ok) return null;
  const data = await response.json().catch(() => null) as { user?: { id: string; email: string; name?: string | null } } | null;
  const user = data?.user;
  if (!user || user.email.toLowerCase() !== adminEmail) return null;
  return user;
}

export async function requireAdmin() {
  const user = await getAdminUser();
  if (!user) throw new Error("Unauthorized");
  return user;
}
