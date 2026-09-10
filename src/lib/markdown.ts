const HACK_CLUB_IMAGE = /!\[[^\]]*\]\((https:\/\/cdn\.hackclub\.com\/[^\s)]+)(?:\s+["'][^"']*["'])?\)/g;

export function extractHackClubMediaUrls(markdown: string) {
  return Array.from(markdown.matchAll(HACK_CLUB_IMAGE), (match) => match[1]);
}

export function isSafeHref(href: string) {
  if (href.startsWith("/") || href.startsWith("#")) return true;
  try {
    const url = new URL(href);
    return url.protocol === "https:" || url.protocol === "mailto:";
  } catch {
    return false;
  }
}

export function formatDate(value: Date | string | null | undefined) {
  if (!value) return "Unpublished";
  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(value));
}
