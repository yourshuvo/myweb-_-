import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AlbumActions } from "@/components/admin/album-actions";
import { AlbumEditor } from "@/components/admin/album-editor";
import { getAdminAlbum, getAdminMedia } from "@/lib/data";

export const metadata: Metadata = { title: "Edit photo album", robots: { index: false, follow: false } };

export default async function EditAlbumPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [album, media] = await Promise.all([getAdminAlbum(id), getAdminMedia()]);
  if (!album) notFound();
  return <div className="admin-page admin-page--wide"><header className="admin-heading admin-heading--row"><div><p className="eyebrow">EDIT PHOTO ALBUM</p><h1>{album.title}</h1><p>Membership, captions, cover, and visibility are saved together as one transaction.</p></div><AlbumActions id={album.id} title={album.title} /></header><AlbumEditor album={album} media={media} /></div>;
}
