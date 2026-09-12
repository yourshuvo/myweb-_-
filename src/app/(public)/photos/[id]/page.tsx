import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageShell } from "@/components/retro/page-shell";
import { archivePath, archiveSelectionFromDate, monthLabel } from "@/lib/archive";
import { getPublicPhoto, getPublicProfile } from "@/lib/data";
import { formatDate } from "@/lib/markdown";

type PhotoPageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: PhotoPageProps): Promise<Metadata> {
  const { id } = await params;
  const photo = await getPublicPhoto(id);
  if (!photo) return { title: "Photo not found" };
  const title = photo.caption.trim() || photo.filename;
  const description = photo.altText.trim() || photo.caption.trim() || "A photo from the personal photo log.";
  return {
    title,
    description,
    alternates: { canonical: `/photos/${photo.id}` },
    openGraph: {
      type: "website",
      title,
      description,
      url: `/photos/${photo.id}`,
      images: [{
        url: photo.url,
        width: photo.width || 1200,
        height: photo.height || 900,
        alt: photo.altText || title,
      }],
    },
  };
}

export default async function PhotoPage({ params }: PhotoPageProps) {
  const { id } = await params;
  const [profile, photo] = await Promise.all([getPublicProfile(), getPublicPhoto(id)]);
  if (!photo) notFound();

  const date = photo.takenDate || photo.createdAt;
  const folder = photo.showInPhotoLog ? archiveSelectionFromDate(date) : null;
  const title = photo.caption.trim() || photo.filename;
  return (
    <PageShell profile={profile} title="Photo - Imaging">
      <article className="photo-detail">
        <header>
          <p className="eyebrow">PHOTO LOG</p>
          <h1>{title}</h1>
          <time dateTime={new Date(date).toISOString()}>{formatDate(date)}</time>
        </header>
        <figure>
          <div className="photo-detail__image">
            <Image
              src={photo.url}
              alt={photo.altText}
              width={photo.width || 1200}
              height={photo.height || 900}
              sizes="(max-width: 760px) 100vw, 940px"
              data-photo-lightbox={photo.url}
              data-photo-lightbox-alt={photo.altText}
              priority
            />
          </div>
          <figcaption>
            {photo.caption && <p>{photo.caption}</p>}
            <span>{photo.filename}</span>
          </figcaption>
        </figure>
        {photo.albums.length > 0 && (
          <section className="photo-album-links" aria-labelledby="photo-album-links-title">
            <h2 id="photo-album-links-title">Appears in</h2>
            <div>{photo.albums.map((album) => <Link href={`/photos/albums/${album.slug}`} key={album.id}>{album.title}</Link>)}</div>
          </section>
        )}
        <nav className="photo-detail__links" aria-label="Photo navigation">
          {folder && <Link className="retro-button" href={archivePath(folder)}>Browse {monthLabel(folder.month)} {folder.year}</Link>}
          <Link className="retro-button" href="/photos">Open photo log</Link>
          <Link className="retro-button" href="/photos/albums">Browse albums</Link>
        </nav>
      </article>
    </PageShell>
  );
}
