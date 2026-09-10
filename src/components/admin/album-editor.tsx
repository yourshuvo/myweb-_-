"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { saveAlbumAction } from "@/app/admin/actions";
import { W98Icon } from "@/components/desktop/w98-icon";
import type { MediaAsset } from "@/db/schema";
import type { AdminAlbumDetail } from "@/lib/data";
import { albumCaption, type AlbumEditorSnapshot } from "@/lib/albums";
import { slugify } from "@/lib/validation";

function initialSnapshot(album?: AdminAlbumDetail): AlbumEditorSnapshot {
  return {
    id: album?.id ?? "",
    title: album?.title ?? "",
    slug: album?.slug ?? "",
    introduction: album?.introduction ?? "",
    status: album?.status ?? "draft",
    coverMediaId: album?.coverMediaId ?? "",
    items: album?.items.map((item) => ({ mediaId: item.mediaId, caption: item.caption })) ?? [],
  };
}

export function AlbumEditor({ album, media }: { album?: AdminAlbumDetail; media: MediaAsset[] }) {
  const router = useRouter();
  const [initial, setInitial] = useState(() => initialSnapshot(album));
  const [snapshot, setSnapshot] = useState(initial);
  const [slugTouched, setSlugTouched] = useState(Boolean(album));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  const mediaById = useMemo(() => new Map(media.map((asset) => [asset.id, asset])), [media]);
  const dirty = JSON.stringify(snapshot) !== JSON.stringify(initial);

  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (dirty) event.preventDefault();
    };
    const linkClick = (event: MouseEvent) => {
      if (!dirty || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[href]") : null;
      if (!target || target.target === "_blank" || target.origin !== window.location.origin) return;
      if (!window.confirm("This album has unsaved changes. Leave the editor?")) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    const navigationRequest = (event: Event) => {
      if (dirty && !window.confirm("This album has unsaved changes. Leave the editor?")) event.preventDefault();
    };
    window.addEventListener("beforeunload", beforeUnload);
    window.addEventListener("admin:navigation-request", navigationRequest);
    document.addEventListener("click", linkClick, true);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      window.removeEventListener("admin:navigation-request", navigationRequest);
      document.removeEventListener("click", linkClick, true);
    };
  }, [dirty]);

  const update = <K extends keyof AlbumEditorSnapshot>(field: K, value: AlbumEditorSnapshot[K]) => {
    setSnapshot((current) => ({ ...current, [field]: value }));
  };

  const addMedia = (mediaId: string) => {
    setSnapshot((current) => current.items.some((item) => item.mediaId === mediaId)
      ? current
      : { ...current, items: [...current.items, { mediaId, caption: "" }] });
  };

  const removeMedia = (mediaId: string) => {
    setSnapshot((current) => ({
      ...current,
      coverMediaId: current.coverMediaId === mediaId ? "" : current.coverMediaId,
      items: current.items.filter((item) => item.mediaId !== mediaId),
    }));
  };

  const moveMedia = (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= snapshot.items.length) return;
    setSnapshot((current) => {
      const items = [...current.items];
      [items[index], items[nextIndex]] = [items[nextIndex], items[index]];
      return { ...current, items };
    });
  };

  const updateCaption = (mediaId: string, caption: string) => {
    setSnapshot((current) => ({
      ...current,
      items: current.items.map((item) => item.mediaId === mediaId ? { ...item, caption } : item),
    }));
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!event.currentTarget.reportValidity()) return;
    setSaving(true);
    setMessage("");
    setError(false);
    try {
      const result = await saveAlbumAction(snapshot);
      setMessage(result.message);
      if (result.status === "error") {
        setError(true);
        return;
      }
      const saved = { ...snapshot, id: result.albumId, slug: result.slug };
      setSnapshot(saved);
      setInitial(saved);
      if (!snapshot.id) router.replace(`/admin/albums/${result.albumId}`);
      router.refresh();
    } catch {
      setMessage("The album could not be saved. Check the connection and try again.");
      setError(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="album-editor" onSubmit={submit}>
      <section className="admin-panel album-editor__details">
        <div className="admin-panel__title">Album details</div>
        <div className="album-editor__fields">
          <label>Title<input value={snapshot.title} required maxLength={120} onChange={(event) => {
            const title = event.target.value;
            setSnapshot((current) => ({ ...current, title, slug: slugTouched ? current.slug : slugify(title) }));
          }} /></label>
          <label>Slug<input value={snapshot.slug} required maxLength={180} pattern="[a-z0-9]+(?:-[a-z0-9]+)*" onChange={(event) => { update("slug", event.target.value); setSlugTouched(true); }} /></label>
          <label>Status<select value={snapshot.status} onChange={(event) => update("status", event.target.value as AlbumEditorSnapshot["status"])}><option value="draft">Draft</option><option value="published">Published</option></select></label>
          <label>Cover photo<select value={snapshot.coverMediaId} onChange={(event) => update("coverMediaId", event.target.value)}><option value="">First photo (automatic)</option>{snapshot.items.map((item) => <option key={item.mediaId} value={item.mediaId}>{mediaById.get(item.mediaId)?.filename ?? item.mediaId}</option>)}</select></label>
          <label className="album-editor__introduction">Introduction<textarea rows={5} maxLength={2000} value={snapshot.introduction} onChange={(event) => update("introduction", event.target.value)} placeholder="A short plain-text note about this album..." /><small>{snapshot.introduction.length}/2000 characters</small></label>
        </div>
      </section>

      <section className="admin-panel album-editor__selection">
        <div className="admin-panel__title">Selected photos · {snapshot.items.length}</div>
        {snapshot.items.length ? <ol className="album-selected-list">{snapshot.items.map((item, index) => {
          const asset = mediaById.get(item.mediaId);
          if (!asset) return null;
          const fallback = albumCaption("", asset.caption, asset.filename);
          return <li key={item.mediaId}>
            <Image src={asset.url} alt={asset.altText} width={asset.width || 240} height={asset.height || 180} sizes="96px" />
            <div className="album-selected-list__content"><strong>{index + 1}. {asset.filename}</strong><label>Album caption<input value={item.caption} maxLength={500} placeholder={`Falls back to: ${fallback}`} onChange={(event) => updateCaption(item.mediaId, event.target.value)} /></label></div>
            <div className="album-selected-list__actions">
              <button type="button" disabled={index === 0} aria-label={`Move ${asset.filename} up`} onClick={() => moveMedia(index, -1)}>Up</button>
              <button type="button" disabled={index === snapshot.items.length - 1} aria-label={`Move ${asset.filename} down`} onClick={() => moveMedia(index, 1)}>Down</button>
              <button type="button" className="is-danger" aria-label={`Remove ${asset.filename} from album`} onClick={() => removeMedia(item.mediaId)}>Remove</button>
            </div>
          </li>;
        })}</ol> : <div className="large-empty"><W98Icon icon="folder" size={32} /><p>Add at least one photo before publishing. Incomplete drafts can still be saved.</p></div>}
      </section>

      <section className="admin-panel album-editor__library">
        <div className="admin-panel__title">Existing media library</div>
        {media.length ? <div className="album-media-picker">{media.map((asset) => {
          const selected = snapshot.items.some((item) => item.mediaId === asset.id);
          return <button type="button" key={asset.id} disabled={selected} onClick={() => addMedia(asset.id)}>
            <Image src={asset.url} alt={asset.altText} width={asset.width || 240} height={asset.height || 180} sizes="120px" />
            <span>{asset.filename}</span>
            <small>{selected ? "Already selected" : "Add photo"}</small>
          </button>;
        })}</div> : <div className="large-empty"><p>No media yet. <Link href="/admin/media">Upload photographs first.</Link></p></div>}
      </section>

      {message && <p className={`form-message ${error ? "is-error" : "is-success"}`} role="status">{message}</p>}
      <footer className="album-editor__footer">
        <span aria-live="polite">{dirty ? "Unsaved album changes" : "Album saved"}</span>
        <div><button className="retro-button" type="submit" disabled={saving}>{saving ? "Saving..." : snapshot.status === "published" ? "Publish album" : "Save draft"}</button></div>
      </footer>
    </form>
  );
}
