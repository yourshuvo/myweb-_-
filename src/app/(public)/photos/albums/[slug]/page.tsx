import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageShell } from "@/components/retro/page-shell";
import { getPublishedAlbum, getPublicProfile } from "@/lib/data";
import { toIsoDateTime } from "@/lib/date-values";
import { formatDate } from "@/lib/markdown";

type AlbumPageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: AlbumPageProps): Promise<Metadata> {
  const { slug } = await params;
  const album = await getPublishedAlbum(slug);
  if (!album) return { title: "Album not found" };
  const description = album.introduction || `${album.photoCount} photos in ${album.title}.`;
  return {
    title: album.title,
    description,
    alternates: { canonical: `/photos/albums/${album.slug}` },
    openGraph: {
      type: "website",
      title: album.title,
      description,
      url: `/photos/albums/${album.slug}`,
      images: album.cover ? [{
        url: album.cover.url,
        width: album.cover.width || 1200,
        height: album.cover.height || 900,
        alt: album.cover.altText || album.title,
      }] : undefined,
    },
  };
}

export default async function AlbumPage({ params }: AlbumPageProps) {
  const { slug } = await params;
  const [profile, album] = await Promise.all([getPublicProfile(), getPublishedAlbum(slug)]);
  if (!album) notFound();

  return (
    <PageShell profile={profile} title={`${album.title} - Windows Explorer`}>
      <article className="album-detail">
        <header>
          <p className="eyebrow">PHOTO ALBUM</p>
          <h1>{album.title}</h1>
          <div className="album-detail__meta">
            <time dateTime={toIsoDateTime(album.publishedAt)}>Published {formatDate(album.publishedAt)}</time>
            <span>{album.photoCount} {album.photoCount === 1 ? "photo" : "photos"}</span>
          </div>
          {album.introduction && <p className="album-detail__intro">{album.introduction}</p>}
        </header>
        <div className="album-gallery">
          {album.items.map((photo, index) => (
            <figure key={photo.id}>
              <Link className="album-gallery__image" href={`/photos/${photo.id}`} aria-label={`Open ${photo.displayCaption}`} data-photo-lightbox={photo.url} data-photo-lightbox-alt={photo.altText}>
                <Image
                  src={photo.url}
                  alt={photo.altText}
                  width={photo.width || 1000}
                  height={photo.height || 750}
                  sizes="(max-width: 760px) 100vw, 46vw"
                  priority={index === 0}
                />
              </Link>
              <figcaption>
                <strong>{photo.displayCaption}</strong>
                <time dateTime={new Date(photo.takenDate || photo.createdAt).toISOString()}>{formatDate(photo.takenDate || photo.createdAt)}</time>
              </figcaption>
            </figure>
          ))}
        </div>
        <nav className="photo-detail__links" aria-label="Album navigation">
          <Link className="retro-button" href="/photos/albums">Back to albums</Link>
          <Link className="retro-button" href="/photos">Open camera roll</Link>
        </nav>
      </article>
    </PageShell>
  );
}
