import { getPublicProfile, getPublishedPosts } from "@/lib/data";
import { siteUrl } from "@/lib/env";

function escapeXml(value: string) {
  return value.replace(/[<>&'"]/g, (character) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[character]!);
}

export async function GET() {
  const [profile, posts] = await Promise.all([getPublicProfile(), getPublishedPosts()]);
  const base = siteUrl();
  const items = posts.map((post) => `<item><title>${escapeXml(post.title)}</title><link>${base}/updates/${encodeURIComponent(post.slug)}</link><guid isPermaLink="true">${base}/updates/${encodeURIComponent(post.slug)}</guid><description>${escapeXml(post.excerpt)}</description>${post.publishedAt ? `<pubDate>${post.publishedAt.toUTCString()}</pubDate>` : ""}</item>`).join("");
  const xml = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>${escapeXml(profile.siteTitle)}</title><link>${base}</link><description>Life updates and small-web notes.</description><language>en</language><lastBuildDate>${new Date().toUTCString()}</lastBuildDate>${items}</channel></rss>`;
  return new Response(xml, { headers: { "Content-Type": "application/rss+xml; charset=utf-8", "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400" } });
}
