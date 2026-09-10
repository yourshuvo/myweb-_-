import type { Metadata } from "next";
import { FileUploader } from "@/components/admin/file-uploader";
import { ManualMediaForm } from "@/components/admin/manual-media-form";
import { MediaLibrary } from "@/components/admin/media-library";
import { getAdminMedia, getAdminMediaReferenceMap } from "@/lib/data";

export const metadata: Metadata = { title: "Media library", robots: { index: false, follow: false } };

export default async function MediaPage() {
  const [media, references] = await Promise.all([getAdminMedia(), getAdminMediaReferenceMap()]);
  return (
    <div className="admin-page admin-page--wide">
      <header className="admin-heading">
        <p className="eyebrow">MEDIA MANAGER</p>
        <h1>Photographs</h1>
        <p>Web-optimized copies are stored on Hack Club CDN and described for accessibility.</p>
      </header>
      <div className="media-admin-grid">
        <section className="admin-panel"><div className="admin-panel__title">Upload a new image</div><FileUploader /></section>
        <section className="admin-panel"><div className="admin-panel__title">Add a larger original by URL</div><ManualMediaForm /></section>
      </div>
      <section className="admin-panel media-panel">
        <div className="admin-panel__title">Media library · {media.length} files</div>
        <MediaLibrary media={media.map((asset) => ({ ...asset, references: references[asset.id] || [] }))} />
      </section>
    </div>
  );
}
