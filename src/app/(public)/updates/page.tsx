import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { W98Icon } from "@/components/desktop/w98-icon";
import { PageShell } from "@/components/retro/page-shell";
import { getPublicProfile, getPublishedPosts } from "@/lib/data";
import { formatDate } from "@/lib/markdown";
import { resolvePostThumbnail } from "@/lib/post-thumbnail";

export const metadata: Metadata = {
  title: "Life updates",
  description: "Published notes and life updates.",
  alternates: { canonical: "/updates" },
};

export default async function UpdatesPage() {
  const [profile, posts] = await Promise.all([getPublicProfile(), getPublishedPosts()]);
  return (
    <PageShell profile={profile} title="Life Updates - Windows Explorer">
      <header className="page-heading"><p className="eyebrow">THE LOG FILE</p><h1>Life updates</h1><p>Notes, things I learned, and ordinary days worth remembering.</p></header>
      {posts.length ? (
        <ol className="post-index">
          {posts.map((post, index) => {
            const thumbnail = resolvePostThumbnail(post);
            return (
              <li key={post.id}>
                <span className="post-index__number">{String(index + 1).padStart(2, "0")}</span>
                <div><time>{formatDate(post.publishedAt)}</time><h2><Link href={`/updates/${post.slug}`}>{post.title}</Link></h2><p>{post.excerpt || "Open this update to read more."}</p></div>
                <Link className={`post-index__thumbnail${thumbnail ? "" : " is-empty"}`} href={`/updates/${post.slug}`} aria-label={`Read ${post.title}`}>
                  {thumbnail ? <Image src={thumbnail.url} alt={thumbnail.alt} width={380} height={214} sizes="(max-width: 760px) 280px, 190px" /> : <span aria-hidden="true">TXT</span>}
                </Link>
              </li>
            );
          })}
        </ol>
      ) : (
        <div className="large-empty"><W98Icon icon="notepad-file" size={32} /><h2>No published updates</h2><p>The first note will appear here as soon as it is published from the owner area.</p></div>
      )}
    </PageShell>
  );
}
