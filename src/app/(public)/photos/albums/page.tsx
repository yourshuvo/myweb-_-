import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ExplorerToolbar } from "@/components/desktop/explorer-toolbar";
import { W98Icon } from "@/components/desktop/w98-icon";
import { PageShell } from "@/components/retro/page-shell";
import { getPublishedAlbums, getPublicProfile } from "@/lib/data";
import { toIsoDateTime } from "@/lib/date-values";
import { formatDate } from "@/lib/markdown";

export const metadata: Metadata = {
  title: "Photo albums",
  description: "Browse published photo stories and collections.",
  alternates: { canonical: "/photos/albums" },
};

export default async function AlbumsPage() {
  const [profile, albums] = await Promise.all([getPublicProfile(), getPublishedAlbums()]);
  return (
    <PageShell profile={profile} title="Photo Albums - Windows Explorer">
      <header className="page-heading album-heading">
        <p className="eyebrow">PHOTO ALBUMS</p>
        <h1>Albums</h1>
        <p>Open a folder to browse a story in the owner&apos;s chosen order.</p>
      </header>
      <ExplorerToolbar current="/photos/albums" items={[{ href: "/photos", label: "Camera roll" }, { href: "/photos/albums", label: "Albums" }]} />
      {albums.length ? (
        <section className="album-explorer" aria-label="Published photo albums">
          <div className="album-explorer__head" aria-hidden="true">
            <span>Name</span><span>Photos</span><span>Published</span>
          </div>
          <div className="album-folder-list">
            {albums.map((album) => (
              <Link className="album-folder-row" href={`/photos/albums/${album.slug}`} key={album.id}>
                <span className="album-folder-row__identity">
                  <span className="album-folder-row__cover">
                    {album.cover ? (
                      <Image src={album.cover.url} alt="" width={album.cover.width || 160} height={album.cover.height || 120} sizes="72px" />
                    ) : <W98Icon icon="folder" size={32} />}
                  </span>
                  <span><strong>{album.title}</strong><small>{album.introduction || "Photo album"}</small></span>
                </span>
                <span>{album.photoCount}</span>
                <time dateTime={toIsoDateTime(album.publishedAt)}>{formatDate(album.publishedAt)}</time>
              </Link>
            ))}
          </div>
          <div className="album-explorer__status"><span>{albums.length} {albums.length === 1 ? "folder" : "folders"}</span><span>Ready</span></div>
        </section>
      ) : (
        <div className="large-empty album-empty">
          <W98Icon icon="folder" size={32} />
          <h2>No published albums yet</h2>
          <p>The camera roll remains available while the first album is being arranged.</p>
          <Link className="retro-button" href="/photos">Open camera roll</Link>
        </div>
      )}
    </PageShell>
  );
}
