"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { W98Icon } from "@/components/desktop/w98-icon";
import type { MediaAsset } from "@/db/schema";
import type { MediaReference } from "@/lib/data";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type AdminMediaAsset = MediaAsset & { references: MediaReference[] };
type DeleteResult = { error?: string; canRemoveLocal?: boolean; deleted?: boolean; localOnly?: boolean };

export function MediaLibrary({ media }: { media: AdminMediaAsset[] }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [localOnlyDelete, setLocalOnlyDelete] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const pendingAsset = media.find((asset) => asset.id === pendingDelete);
  const localOnlyAsset = media.find((asset) => asset.id === localOnlyDelete);

  async function remove(id: string, mode: "cdn" | "local-only") {
    setDeleting(id);
    setStatus(mode === "cdn" ? "Deleting from Hack Club CDN..." : "Removing the library record...");
    try {
      const suffix = mode === "local-only" ? "?mode=local-only" : "";
      const response = await fetch(`/api/admin/media/${id}${suffix}`, { method: "DELETE", cache: "no-store" });
      const result = await response.json() as DeleteResult;
      if (!response.ok) {
        setStatus(result.error || "Deletion failed. The library record was preserved.");
        if (result.canRemoveLocal) {
          setPendingDelete(null);
          setLocalOnlyDelete(id);
        }
        return;
      }
      setPendingDelete(null);
      setLocalOnlyDelete(null);
      setStatus(mode === "cdn" ? "The CDN file and library record were permanently deleted." : "The library record was removed. No CDN deletion was performed.");
      router.refresh();
    } catch {
      setStatus("The delete request could not finish. The library record was preserved.");
    } finally {
      setDeleting(null);
    }
  }

  async function copyMarkdown(asset: AdminMediaAsset) {
    try {
      await navigator.clipboard.writeText(`![${asset.altText}](${asset.url})`);
      setStatus(`Markdown copied for ${asset.filename}.`);
    } catch {
      setStatus("Copy failed. Copy the CDN URL manually.");
    }
  }

  if (!media.length) {
    return <div className="large-empty"><W98Icon icon="pictures" size={32} /><h2>Media library is empty</h2><p>Upload the first optimized photograph above.</p></div>;
  }

  return (
    <>
      <p className="media-delete-status" role="status" aria-live="polite">{status}</p>
      <div className="media-library">
        {media.map((asset) => {
          const referenced = asset.references.length > 0;
          return (
            <article key={asset.id}>
              <div><Image src={asset.url} alt={asset.altText} width={asset.width || 500} height={asset.height || 375} sizes="(max-width: 760px) 50vw, 240px" /></div>
              <h3>{asset.filename}</h3>
              <p>{asset.altText}</p>
              <small>{asset.width && asset.height ? `${asset.width} × ${asset.height}` : "External dimensions"} · {(asset.byteSize / 1024).toFixed(0)} KB</small>
              {referenced && (
                <div className="media-reference-summary">
                  <strong>Deletion blocked — this image is in use:</strong>
                  <ul>
                    {asset.references.map((reference) => (
                      <li key={reference.key}><Link href={reference.href}>{reference.label} — edit</Link></li>
                    ))}
                  </ul>
                  <span>Remove every listed use, save the page, then return here to delete it.</span>
                </div>
              )}
              <div className="media-library__actions">
                <button type="button" onClick={() => copyMarkdown(asset)}>Copy Markdown</button>
                <button
                  className="is-danger"
                  type="button"
                  disabled={referenced || deleting === asset.id}
                  title={referenced ? "Remove every listed use before deleting this image." : undefined}
                  onClick={() => setPendingDelete(asset.id)}
                >
                  {deleting === asset.id ? "Deleting..." : referenced ? "In use — edit first" : "Delete from CDN"}
                </button>
              </div>
            </article>
          );
        })}
      </div>

      <Dialog open={Boolean(pendingDelete)} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <DialogContent className="retro-dialog" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Delete from Hack Club CDN?</DialogTitle>
            <DialogDescription>
              {pendingAsset?.filename || "This file"} will be permanently removed from Hack Club CDN. Its local media-library record is deleted only after Hack Club confirms the remote deletion. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild><button className="retro-button" type="button">Cancel</button></DialogClose>
            <button className="danger-button" type="button" disabled={Boolean(deleting)} onClick={() => pendingDelete && remove(pendingDelete, "cdn")}>Delete remote and local copies</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(localOnlyDelete)} onOpenChange={(open) => !open && setLocalOnlyDelete(null)}>
        <DialogContent className="retro-dialog" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Remove library record only?</DialogTitle>
            <DialogDescription>
              Hack Club could not find {localOnlyAsset?.filename || "this upload"} for the configured API key. Remove only the Neon library record if you have confirmed the remote file is absent or belongs to another key. This does not call the CDN deletion API.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild><button className="retro-button" type="button">Keep record</button></DialogClose>
            <button className="danger-button" type="button" disabled={Boolean(deleting)} onClick={() => localOnlyDelete && remove(localOnlyDelete, "local-only")}>Remove library record only</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
