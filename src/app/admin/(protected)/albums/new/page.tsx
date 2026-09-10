import type { Metadata } from "next";
import { AlbumEditor } from "@/components/admin/album-editor";
import { getAdminMedia } from "@/lib/data";

export const metadata: Metadata = { title: "New photo album", robots: { index: false, follow: false } };

export default async function NewAlbumPage() {
  const media = await getAdminMedia();
  return <div className="admin-page admin-page--wide"><header className="admin-heading"><p className="eyebrow">NEW PHOTO ALBUM</p><h1>Arrange a new folder.</h1><p>Drafts can be incomplete. Publishing requires a title, unique slug, and at least one selected photograph.</p></header><AlbumEditor media={media} /></div>;
}
