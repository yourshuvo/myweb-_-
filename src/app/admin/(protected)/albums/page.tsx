import type { Metadata } from "next";
import Link from "next/link";
import { AlbumActions } from "@/components/admin/album-actions";
import { getAdminAlbums } from "@/lib/data";
import { formatDate } from "@/lib/markdown";

export const metadata: Metadata = { title: "Manage photo albums", robots: { index: false, follow: false } };

export default async function AlbumsPage() {
  const albums = await getAdminAlbums();
  return (
    <div className="admin-page admin-page--wide">
      <header className="admin-heading admin-heading--row">
        <div><p className="eyebrow">ALBUM MANAGER</p><h1>Photo albums</h1><p>Reuse media, arrange each gallery, and publish without duplicating CDN files.</p></div>
        <Link className="retro-button" href="/admin/albums/new">New album</Link>
      </header>
      <section className="admin-panel">
        <div className="admin-panel__title">Album library · {albums.length}</div>
        {albums.length ? <div className="admin-table admin-album-table">
          <div className="admin-table__head"><span>Title</span><span>Status</span><span>Photos</span><span>Updated</span><span>Actions</span></div>
          {albums.map((album) => <div className="admin-table__row" key={album.id}>
            <div><strong>{album.title}</strong><small>/{album.slug}</small></div>
            <span className={`status-badge is-${album.status}`}>{album.status}</span>
            <span>{album.photoCount}</span>
            <time dateTime={new Date(album.updatedAt).toISOString()}>{formatDate(album.updatedAt)}</time>
            <AlbumActions id={album.id} title={album.title} showEdit />
          </div>)}
        </div> : <div className="large-empty"><h2>No albums yet</h2><p>Create a draft and arrange existing photos into a story.</p><Link className="retro-button" href="/admin/albums/new">Create the first album</Link></div>}
      </section>
    </div>
  );
}
