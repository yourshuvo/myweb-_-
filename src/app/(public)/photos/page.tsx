import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { W98Icon } from "@/components/desktop/w98-icon";
import { ExplorerToolbar } from "@/components/desktop/explorer-toolbar";
import { PageShell } from "@/components/retro/page-shell";
import { getPhotoLog, getPublicProfile } from "@/lib/data";
import { formatDate } from "@/lib/markdown";

export const metadata: Metadata = {
  title: "Photo log",
  description: "A casual visual diary.",
  alternates: { canonical: "/photos" },
};

export default async function PhotosPage() {
  const [profile, photos] = await Promise.all([getPublicProfile(), getPhotoLog()]);
  return (
    <PageShell profile={profile} title="My Pictures - Windows Explorer">
      <header className="page-heading"><p className="eyebrow">CAMERA ROLL</p><h1>Photo log</h1><p>A loose collection of places, people, and passing moments.</p></header>
      <ExplorerToolbar current="/photos" items={[{ href: "/photos", label: "Camera roll" }, { href: "/photos/albums", label: "Albums" }]} />
      {photos.length ? (
        <div className="photo-grid">
          {photos.map((photo) => (
            <figure key={photo.id}>
              <Link className="photo-grid__image" href={`/photos/${photo.id}`} aria-label={`Open ${photo.caption || photo.filename}`}><Image src={photo.url} alt={photo.altText} width={photo.width || 900} height={photo.height || 675} sizes="(max-width: 760px) 100vw, 45vw" /></Link>
              <figcaption><strong>{photo.caption || photo.filename}</strong><time>{formatDate(photo.takenDate || photo.createdAt)}</time></figcaption>
            </figure>
          ))}
        </div>
      ) : (
        <div className="large-empty"><W98Icon icon="camera" size={32} /><h2>No photographs yet</h2><p>The photo log is ready for its first web-optimized image.</p></div>
      )}
    </PageShell>
  );
}
