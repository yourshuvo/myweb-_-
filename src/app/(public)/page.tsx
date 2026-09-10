import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { W98Icon } from "@/components/desktop/w98-icon";
import { PageShell } from "@/components/retro/page-shell";
import { getLatestGuestbookEntries } from "@/lib/guestbook-data";
import { getPhotoLog, getPublicProfile, getPublishedAlbums, getPublishedMovieRecommendations, getPublishedPosts } from "@/lib/data";
import { formatDate } from "@/lib/markdown";
import { resolvePostThumbnail } from "@/lib/post-thumbnail";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default async function Home() {
  const [profile, posts, photos, albums, movies, guestbookEntries] = await Promise.all([
    getPublicProfile(),
    getPublishedPosts(),
    getPhotoLog(),
    getPublishedAlbums(),
    getPublishedMovieRecommendations(),
    getLatestGuestbookEntries(),
  ]);
  const latestPost = posts[0];
  const latestThumbnail = latestPost ? resolvePostThumbnail(latestPost) : null;

  return (
    <PageShell profile={profile} title="Welcome.txt">
      <div className="welcome-program">
        <section className="welcome-program__intro">
          <W98Icon icon="computer" size={32} />
          <div>
            <p className="eyebrow">PERSONAL HOME PAGE</p>
            <h1>{profile.displayName ? `Hi, I’m ${profile.displayName}.` : "Welcome to my corner of the internet."}</h1>
            <p>{profile.biography || "Life updates, photographs, and ordinary moments will collect here."}</p>
          </div>
        </section>

        <section className="welcome-program__latest" aria-labelledby="latest-update-heading">
          <div className="welcome-program__section-title"><W98Icon icon="notepad-file" size={16} /><h2 id="latest-update-heading">Latest update</h2></div>
          {latestPost ? (
            <Link className="welcome-latest-file" href={`/updates/${latestPost.slug}`}>
              <span className="welcome-latest-file__preview">
                {latestThumbnail ? <Image src={latestThumbnail.url} alt="" width={180} height={102} /> : <W98Icon icon="notepad-file" size={32} />}
              </span>
              <span><strong>{latestPost.title}</strong><time>{formatDate(latestPost.publishedAt)}</time><small>{latestPost.excerpt || "Open this update to read more."}</small></span>
            </Link>
          ) : (
            <p className="win98-inline-empty">No updates have been published yet.</p>
          )}
        </section>

        <nav className="welcome-program__folders" aria-label="Website folders">
          <Link href="/updates"><W98Icon icon="notepad-file" size={32} /><span><strong>Updates</strong><small>{posts.length} files</small></span></Link>
          <Link href="/photos"><W98Icon icon="camera" size={32} /><span><strong>Photos</strong><small>{photos.length} pictures</small></span></Link>
          <Link href="/photos/albums"><W98Icon icon="pictures" size={32} /><span><strong>Albums</strong><small>{albums.length} folders</small></span></Link>
          <Link href="/movies"><W98Icon icon="media-player" size={32} /><span><strong>Movies</strong><small>{movies.length} suggestions</small></span></Link>
          <Link href="/guestbook"><W98Icon icon="address-book" size={32} /><span><strong>Guestbook</strong><small>{guestbookEntries.length ? "Recent messages available" : "Be the first to sign"}</small></span></Link>
        </nav>
      </div>
    </PageShell>
  );
}
