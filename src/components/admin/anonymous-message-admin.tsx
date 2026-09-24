"use client";

import Image from "next/image";
import { useEffect, useState, useTransition } from "react";
import type { AnonymousMessage } from "@/db/schema";
import {
  archiveAnonymousMessageAction,
  deleteAnonymousMessageAction,
  markAnonymousMessageReadAction,
  markAnonymousMessageUnreadAction,
  restoreAnonymousMessageAction,
} from "@/app/admin/actions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { anonymousStoryFilename } from "@/lib/story-image";
import { formatDate } from "@/lib/markdown";

export function AskLinkTools({ askUrl }: { askUrl: string }) {
  const [status, setStatus] = useState("");
  const [effectiveUrl] = useState(() =>
    typeof window !== "undefined" && window.location.origin ? `${window.location.origin}/ask` : askUrl,
  );

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(effectiveUrl);
      setStatus("Link copied.");
    } catch {
      setStatus("Copy failed. Select the URL and copy it manually.");
    }
  }

  async function shareLink() {
    if (!navigator.share) {
      await copyLink();
      return;
    }
    try {
      await navigator.share({ title: "Send me an anonymous message", url: effectiveUrl });
      setStatus("Share sheet opened.");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setStatus("Sharing is unavailable. Use Copy Link instead.");
    }
  }

  return (
    <section className="admin-panel anonymous-share-panel" aria-labelledby="anonymous-share-title">
      <div className="admin-panel__title" id="anonymous-share-title">Share your private inbox</div>
      <p>Post this link with Instagram&apos;s Link sticker. Instagram does not allow this site to add the sticker or publish a Story automatically.</p>
      <div className="anonymous-share-link">
        <input aria-label="Anonymous message URL" readOnly value={effectiveUrl} onFocus={(event) => event.currentTarget.select()} />
        <button className="retro-button" type="button" onClick={copyLink}>Copy Link</button>
        <button className="retro-button" type="button" onClick={shareLink}>Share Link</button>
      </div>
      <p className="inline-status" role="status" aria-live="polite">{status}</p>
    </section>
  );
}

export function AnonymousMessageAdmin({
  unread,
  read,
  archived,
}: {
  unread: AnonymousMessage[];
  read: AnonymousMessage[];
  archived: AnonymousMessage[];
}) {
  const [activeTab, setActiveTab] = useState<AnonymousMessageMode>("unread");
  const [selected, setSelected] = useState<{ entry: AnonymousMessage; source: AnonymousMessageMode } | null>(null);
  const [, startTransition] = useTransition();

  function openMessage(entry: AnonymousMessage, source: AnonymousMessageMode) {
    setSelected({ entry, source });
    if (source !== "unread") return;

    const formData = new FormData();
    formData.set("id", entry.id);
    startTransition(() => markAnonymousMessageReadAction(formData));
  }

  function handleDialogOpenChange(nextOpen: boolean) {
    if (nextOpen) return;
    if (selected?.source === "unread") setActiveTab("read");
    setSelected(null);
  }

  return (
    <>
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as AnonymousMessageMode)} className="admin-guestbook-tabs anonymous-inbox-tabs">
        <TabsList className="retro-tabs-list">
          <TabsTrigger value="unread">Unread ({unread.length})</TabsTrigger>
          <TabsTrigger value="read">Read ({read.length})</TabsTrigger>
          <TabsTrigger value="archived">Archived ({archived.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="unread"><AnonymousMessageList entries={unread} mode="unread" onOpen={openMessage} /></TabsContent>
        <TabsContent value="read"><AnonymousMessageList entries={read} mode="read" onOpen={openMessage} /></TabsContent>
        <TabsContent value="archived"><AnonymousMessageList entries={archived} mode="archived" onOpen={openMessage} /></TabsContent>
      </Tabs>

      {selected && (
        <Dialog open onOpenChange={handleDialogOpenChange}>
          <DialogContent className="retro-confirm-dialog anonymous-message-dialog" showCloseButton={false}>
            <DialogHeader>
              <DialogTitle>Anonymous message</DialogTitle>
              <DialogDescription>
                Received {formatDate(selected.entry.createdAt)}.
                {selected.source === "unread" && " This message is now kept in the Read tab."}
              </DialogDescription>
            </DialogHeader>
            <blockquote>{selected.entry.message}</blockquote>
            <AnonymousStoryTools messageId={selected.entry.id} />
            <DialogFooter>
              <DialogClose asChild><button className="retro-button" type="button">Close</button></DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

type AnonymousMessageMode = "unread" | "read" | "archived";

function AnonymousMessageList({ entries, mode, onOpen }: { entries: AnonymousMessage[]; mode: AnonymousMessageMode; onOpen: (entry: AnonymousMessage, mode: AnonymousMessageMode) => void }) {
  if (!entries.length) {
    return (
      <div className="admin-panel guestbook-admin-empty">
        <strong>No {mode} anonymous messages</strong>
        <p>Messages in this state will appear here.</p>
      </div>
    );
  }

  return (
    <div className="guestbook-admin-list anonymous-admin-list">
      {entries.map((entry) => <AnonymousMessageItem entry={entry} key={entry.id} mode={mode} onOpen={onOpen} />)}
    </div>
  );
}

function AnonymousMessageItem({ entry, mode, onOpen }: { entry: AnonymousMessage; mode: AnonymousMessageMode; onOpen: (entry: AnonymousMessage, mode: AnonymousMessageMode) => void }) {
  return (
    <article className="admin-panel guestbook-admin-entry anonymous-admin-entry">
      <header>
        <div><strong>Anonymous message</strong><time dateTime={new Date(entry.createdAt).toISOString()}>{formatDate(entry.createdAt)}</time></div>
        <span>{mode}</span>
      </header>
      <p className="anonymous-message-preview">{entry.message}</p>
      <footer>
        <button className="retro-button" type="button" onClick={() => onOpen(entry, mode)}>Open</button>
        {mode === "unread" ? (
          <MessageAction action={markAnonymousMessageReadAction} id={entry.id} label="Mark read" />
        ) : mode === "read" ? (
          <MessageAction action={markAnonymousMessageUnreadAction} id={entry.id} label="Mark unread" />
        ) : (
          <MessageAction action={restoreAnonymousMessageAction} id={entry.id} label="Restore" />
        )}
        {mode !== "archived" && <MessageAction action={archiveAnonymousMessageAction} id={entry.id} label="Archive" />}
        <AlertDialog>
          <AlertDialogTrigger asChild><button className="retro-button retro-button--danger" type="button">Delete</button></AlertDialogTrigger>
          <AlertDialogContent className="retro-confirm-dialog">
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this anonymous message?</AlertDialogTitle>
              <AlertDialogDescription>This permanently removes the private message. It cannot be recovered.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="retro-button">Cancel</AlertDialogCancel>
              <form action={deleteAnonymousMessageAction}>
                <input type="hidden" name="id" value={entry.id} />
                <AlertDialogAction asChild><button className="retro-button retro-button--danger" type="submit">Delete permanently</button></AlertDialogAction>
              </form>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </footer>
    </article>
  );
}

function MessageAction({ action, id, label }: { action: (formData: FormData) => Promise<void>; id: string; label: string }) {
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <button className="retro-button" type="submit">{label}</button>
    </form>
  );
}

function AnonymousStoryTools({ messageId }: { messageId: string }) {
  const storyUrl = `/api/admin/anonymous-messages/${messageId}/story`;
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  async function loadStory() {
    const response = await fetch(storyUrl, { cache: "no-store" });
    if (!response.ok) throw new Error("The Story image could not be generated.");
    return response.blob();
  }

  function saveBlob(blob: Blob) {
    const href = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.download = anonymousStoryFilename(messageId);
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(href), 1_000);
  }

  async function preview() {
    setBusy(true);
    setStatus("Generating preview...");
    try {
      const blob = await loadStory();
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(URL.createObjectURL(blob));
      setStatus("Preview ready.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "The preview could not be generated.");
    } finally {
      setBusy(false);
    }
  }

  async function download() {
    setBusy(true);
    setStatus("Generating PNG...");
    try {
      saveBlob(await loadStory());
      setStatus("Story PNG downloaded.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "The download could not start.");
    } finally {
      setBusy(false);
    }
  }

  async function share() {
    setBusy(true);
    setStatus("Preparing Story image...");
    try {
      const blob = await loadStory();
      const file = new File([blob], anonymousStoryFilename(messageId), { type: "image/png" });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "Anonymous message" });
        setStatus("Share sheet opened.");
      } else {
        saveBlob(blob);
        setStatus("File sharing is unavailable, so the PNG was downloaded.");
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setStatus(error instanceof Error ? error.message : "The Story image could not be shared.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="anonymous-story-tools" aria-label="Instagram Story image">
      <p>The PNG leaves space at the top and bottom for Instagram controls and your typed response.</p>
      <div className="anonymous-story-actions">
        <button className="retro-button" type="button" onClick={preview} disabled={busy}>Preview</button>
        <button className="retro-button" type="button" onClick={download} disabled={busy}>Download PNG</button>
        <button className="retro-button" type="button" onClick={share} disabled={busy}>Share Story Image</button>
      </div>
      {previewUrl && <Image className="anonymous-story-preview" src={previewUrl} width={270} height={480} alt="Preview of the generated anonymous-message Story image" unoptimized />}
      <p className="inline-status" role="status" aria-live="polite">{status}</p>
    </section>
  );
}
