const serverEnvNames = [
  "DATABASE_URL",
  "NEON_AUTH_BASE_URL",
  "NEON_AUTH_COOKIE_SECRET",
  "ADMIN_EMAIL",
  "HACKCLUB_CDN_API_KEY",
  "TMDB_API_KEY",
  "GUESTBOOK_COOKIE_SECRET",
  "AGENT_API_KEY",
] as const;

export type ServerEnvName = (typeof serverEnvNames)[number];

export function getServerEnv(name: ServerEnvName) {
  return process.env[name]?.trim() || undefined;
}

export function hasDatabaseConfig() {
  return Boolean(getServerEnv("DATABASE_URL"));
}

export function hasAuthConfig() {
  const secret = getServerEnv("NEON_AUTH_COOKIE_SECRET");
  return Boolean(getServerEnv("NEON_AUTH_BASE_URL") && secret && secret.length >= 32);
}

export function hasVisitorTrackingConfig() {
  const cookieSecret = getServerEnv("GUESTBOOK_COOKIE_SECRET");
  return Boolean(hasDatabaseConfig() && cookieSecret && cookieSecret.length >= 32);
}

export function hasTmdbConfig() {
  return Boolean(getServerEnv("TMDB_API_KEY"));
}

export function missingConfiguration() {
  return serverEnvNames.filter((name) => !getServerEnv(name));
}

export function siteUrl() {
  const vercelProductionUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  return (process.env.NEXT_PUBLIC_SITE_URL || (vercelProductionUrl ? `https://${vercelProductionUrl}` : "http://localhost:3000")).replace(/\/$/, "");
}
