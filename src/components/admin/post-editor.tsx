"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { autosavePostDraftAction, savePostExplicitAction } from "@/app/admin/actions";
import { W98Icon } from "@/components/desktop/w98-icon";
import { MarkdownRenderer } from "@/components/markdown-renderer";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { MediaAsset, Post } from "@/db/schema";
import {
  isAutosaveReady,
  parsePostRecovery,
  postRecoveryKey,
  postWritingStats,
  snapshotContent,
  type PostEditorSnapshot,
  type PostRecoveryRecord,
  type PostSaveResult,
} from "@/lib/admin-post";
import { slugify } from "@/lib/validation";

type EditablePost = Pick<Post, "id" | "version" | "title" | "slug" | "excerpt" | "body" | "status" | "coverMediaId" | "thumbnailMediaId" | "publishedAt" | "updatedAt">;
type SaveIndicator = "saved" | "unsaved" | "local" | "saving" | "offline" | "waiting" | "conflict" | "error";
type SaveMode = "autosave" | "explicit";

function localDateTime(value: Date | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

function initialSnapshot(post?: EditablePost): PostEditorSnapshot {
  return {
    id: post?.id ?? "",
    version: post?.version ?? 0,
    title: post?.title ?? "",
    slug: post?.slug ?? "",
    excerpt: post?.excerpt ?? "",
    body: post?.body ?? "",
    status: post?.status ?? "draft",
    coverMediaId: post?.coverMediaId ?? "",
    thumbnailMediaId: post?.thumbnailMediaId ?? "",
    publishedAt: localDateTime(post?.publishedAt),
  };
}

function saveLabel(indicator: SaveIndicator, savedAt: Date | null) {
  const time = savedAt?.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  switch (indicator) {
    case "saving": return "Saving to Neon...";
    case "local": return "Saved in this browser";
    case "offline": return "Offline. Saved in this browser";
    case "waiting": return "Waiting for a valid title and slug";
    case "conflict": return "Save conflict";
    case "error": return "Save failed. Recovery copy kept";
    case "unsaved": return "Unsaved changes";
    default: return time ? `Saved to Neon at ${time}` : "All changes saved";
  }
}

export function PostEditor({ post, media }: { post?: EditablePost; media: MediaAsset[] }) {
  const [initial] = useState<PostEditorSnapshot>(() => initialSnapshot(post));
  const [snapshot, setSnapshot] = useState<PostEditorSnapshot>(initial);
  const [serverContent, setServerContent] = useState(() => snapshotContent(initial));
  const [serverStatus, setServerStatus] = useState<"draft" | "published">(post?.status ?? "draft");
  const [indicator, setIndicator] = useState<SaveIndicator>("saved");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(() => post ? new Date(post.updatedAt) : null);
  const [message, setMessage] = useState("");
  const [recovery, setRecovery] = useState<PostRecoveryRecord | null>(null);
  const [recoveryChecked, setRecoveryChecked] = useState(false);
  const [conflict, setConflict] = useState<Extract<PostSaveResult, { status: "conflict" }> | null>(null);
  const [slugTouched, setSlugTouched] = useState(Boolean(post));
  const [activeTab, setActiveTab] = useState("write");
  const [mediaQuery, setMediaQuery] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const latestRef = useRef(snapshot);
  const indicatorRef = useRef(indicator);
  const inFlightRef = useRef(false);
  const queuedModeRef = useRef<SaveMode | null>(null);
  const runSaveRef = useRef<(mode: SaveMode, candidate?: PostEditorSnapshot) => Promise<void>>(async () => undefined);
  const content = snapshotContent(snapshot);
  const dirty = content !== serverContent;
  const stats = postWritingStats(snapshot.body);
  const effectiveIndicator = dirty && indicator === "saved" ? "unsaved" : indicator;
  const normalizedMediaQuery = mediaQuery.trim().toLowerCase();
  const filteredMedia = normalizedMediaQuery
    ? media.filter((asset) => `${asset.filename} ${asset.altText} ${asset.caption}`.toLowerCase().includes(normalizedMediaQuery))
    : media;

  const updateSnapshot = <K extends keyof PostEditorSnapshot>(field: K, value: PostEditorSnapshot[K]) => {
    setSnapshot((current) => ({ ...current, [field]: value }));
  };

  const runSave = useCallback(async (mode: SaveMode, candidate = latestRef.current) => {
    if (inFlightRef.current) {
      if (mode === "explicit" || !queuedModeRef.current) queuedModeRef.current = mode;
      return;
    }
    if (mode === "autosave" && !isAutosaveReady(candidate)) return;
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setIndicator("offline");
      return;
    }

    inFlightRef.current = true;
    setIndicator("saving");
    setMessage("");
    try {
      const result = mode === "autosave"
        ? await autosavePostDraftAction(candidate)
        : await savePostExplicitAction(candidate);

      if (result.status === "conflict") {
        setConflict(result);
        setIndicator("conflict");
        return;
      }
      if (result.status === "error") {
        setMessage(result.message);
        setIndicator("error");
        return;
      }

      const confirmedContent = snapshotContent(candidate);
      setServerContent(confirmedContent);
      setServerStatus(result.persistedStatus);
      setLastSavedAt(new Date(result.savedAt));
      setMessage(result.message);
      const previousKey = postRecoveryKey(candidate.id);
      const nextSnapshot = { ...latestRef.current, id: result.postId, version: result.version };
      latestRef.current = nextSnapshot;
      setSnapshot(nextSnapshot);
      window.dispatchEvent(new CustomEvent("admin-post-version", { detail: { id: result.postId, version: result.version } }));

      try {
        if (snapshotContent(nextSnapshot) === confirmedContent) {
          localStorage.removeItem(previousKey);
          localStorage.removeItem(postRecoveryKey(result.postId));
          setIndicator("saved");
        } else {
          localStorage.setItem(postRecoveryKey(result.postId), JSON.stringify({ savedAt: Date.now(), snapshot: nextSnapshot }));
          if (previousKey !== postRecoveryKey(result.postId)) localStorage.removeItem(previousKey);
          setIndicator("local");
        }
      } catch {
        setIndicator("error");
      }

      if (!candidate.id) {
        window.history.replaceState(null, "", `/admin/posts/${result.postId}`);
      }
    } catch {
      setIndicator(typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "error");
      setMessage("The save request could not be completed. Refresh this page and restore the browser recovery copy; your writing is safe.");
    } finally {
      inFlightRef.current = false;
      const queuedMode = queuedModeRef.current;
      queuedModeRef.current = null;
      if (queuedMode) queueMicrotask(() => void runSaveRef.current(queuedMode, latestRef.current));
    }
  }, []);
  useEffect(() => { latestRef.current = snapshot; }, [snapshot]);
  useEffect(() => { indicatorRef.current = indicator; }, [indicator]);
  useEffect(() => { runSaveRef.current = runSave; }, [runSave]);

  useEffect(() => {
    if (recoveryChecked) return;
    const timer = window.setTimeout(() => {
      const key = postRecoveryKey(initial.id);
      const storedValue = localStorage.getItem(key);
      const stored = parsePostRecovery(storedValue);
      if (stored && snapshotContent(stored.snapshot) !== serverContent) {
        setRecovery(stored);
      } else if (storedValue) {
        localStorage.removeItem(key);
      }
      setRecoveryChecked(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [initial.id, recoveryChecked, serverContent]);

  useEffect(() => {
    if (!recoveryChecked || recovery) return;
    if (!dirty) {
      localStorage.removeItem(postRecoveryKey(snapshot.id));
      return;
    }
    const timer = window.setTimeout(() => {
      try {
        localStorage.setItem(postRecoveryKey(snapshot.id), JSON.stringify({ savedAt: Date.now(), snapshot }));
        if (indicatorRef.current !== "conflict" && indicatorRef.current !== "saving") {
          setIndicator(!isAutosaveReady(snapshot) && snapshot.status === "draft" ? "waiting" : navigator.onLine ? "local" : "offline");
        }
      } catch {
        setIndicator("error");
        setMessage("Browser recovery storage is unavailable. Save before leaving this page.");
      }
    }, 500);
    return () => window.clearTimeout(timer);
  }, [dirty, recovery, recoveryChecked, snapshot]);

  useEffect(() => {
    if (!recoveryChecked || recovery || conflict || !dirty || serverStatus === "published") return;
    if (!isAutosaveReady(snapshot)) return;
    const timer = window.setTimeout(() => void runSave("autosave", snapshot), 3_000);
    return () => window.clearTimeout(timer);
  }, [conflict, dirty, recovery, recoveryChecked, runSave, serverStatus, snapshot]);

  useEffect(() => {
    const handleOnline = () => {
      if (snapshotContent(latestRef.current) !== serverContent && serverStatus === "draft" && isAutosaveReady(latestRef.current)) {
        void runSaveRef.current("autosave", latestRef.current);
      }
    };
    const handleOffline = () => setIndicator("offline");
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [serverContent, serverStatus]);

  useEffect(() => {
    const shouldWarn = () => snapshotContent(latestRef.current) !== serverContent;
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (shouldWarn()) event.preventDefault();
    };
    const linkClick = (event: MouseEvent) => {
      if (!shouldWarn() || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[href]") : null;
      if (!target || target.target === "_blank" || target.origin !== window.location.origin) return;
      if (!window.confirm("This post has changes saved only in this browser. Leave the editor?")) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    const navigationRequest = (event: Event) => {
      if (shouldWarn() && !window.confirm("This post has changes saved only in this browser. Leave the editor?")) event.preventDefault();
    };
    window.addEventListener("beforeunload", beforeUnload);
    window.addEventListener("admin:navigation-request", navigationRequest);
    document.addEventListener("click", linkClick, true);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      window.removeEventListener("admin:navigation-request", navigationRequest);
      document.removeEventListener("click", linkClick, true);
    };
  }, [serverContent]);

  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        if (formRef.current?.reportValidity()) void runSaveRef.current("explicit", latestRef.current);
      }
    };
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  }, []);

  const insertImage = (asset: MediaAsset) => {
    const syntax = `![${asset.altText || asset.filename}](${asset.url})`;
    const textarea = textareaRef.current;
    const start = textarea?.selectionStart ?? snapshot.body.length;
    const end = textarea?.selectionEnd ?? start;
    const before = snapshot.body.slice(0, start);
    const after = snapshot.body.slice(end);
    const leading = before && !before.endsWith("\n") ? "\n" : "";
    const trailing = after && !after.startsWith("\n") ? "\n" : "";
    const insertion = `${leading}${syntax}${trailing}`;
    updateSnapshot("body", `${before}${insertion}${after}`);
    setActiveTab("write");
    requestAnimationFrame(() => {
      textarea?.focus();
      const caret = start + insertion.length;
      textarea?.setSelectionRange(caret, caret);
    });
  };

  const formatSelection = (prefix: string, suffix: string, placeholder: string) => {
    const textarea = textareaRef.current;
    const start = textarea?.selectionStart ?? snapshot.body.length;
    const end = textarea?.selectionEnd ?? start;
    const selected = snapshot.body.slice(start, end);
    const content = selected || placeholder;
    const replacement = `${prefix}${content}${suffix}`;
    updateSnapshot("body", `${snapshot.body.slice(0, start)}${replacement}${snapshot.body.slice(end)}`);
    requestAnimationFrame(() => {
      textarea?.focus();
      const selectionStart = start + prefix.length;
      textarea?.setSelectionRange(selectionStart, selectionStart + content.length);
    });
  };

  const prefixLines = (prefix: string, placeholder: string) => {
    const textarea = textareaRef.current;
    const start = textarea?.selectionStart ?? snapshot.body.length;
    const end = textarea?.selectionEnd ?? start;
    const selected = snapshot.body.slice(start, end) || placeholder;
    const replacement = selected.split("\n").map((line) => `${prefix}${line}`).join("\n");
    updateSnapshot("body", `${snapshot.body.slice(0, start)}${replacement}${snapshot.body.slice(end)}`);
    requestAnimationFrame(() => {
      textarea?.focus();
      textarea?.setSelectionRange(start + prefix.length, start + replacement.length);
    });
  };

  const restoreRecovery = () => {
    if (!recovery) return;
    const restored = {
      ...recovery.snapshot,
      id: initial.id || recovery.snapshot.id,
    };
    latestRef.current = restored;
    setSnapshot(restored);
    setServerStatus(post?.status ?? "draft");
    setIndicator("local");
    setRecovery(null);
  };

  const discardRecovery = () => {
    localStorage.removeItem(postRecoveryKey(initial.id));
    setRecovery(null);
    setIndicator("saved");
  };

  const overwriteConflict = () => {
    if (!conflict) return;
    const recovered = { ...latestRef.current, version: conflict.serverVersion };
    latestRef.current = recovered;
    setSnapshot(recovered);
    setConflict(null);
    void runSave("explicit", recovered);
  };

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (event.currentTarget.reportValidity()) void runSave("explicit", latestRef.current);
  };

  const primaryLabel = snapshot.status === "published"
    ? serverStatus === "published" ? "Update published post" : "Publish post"
    : "Save draft";

  return (
    <>
      <form ref={formRef} className="post-editor" onSubmit={submit}>
        <section className="editor-document-header" aria-label="Post identity">
          <label className="editor-title-field"><span>Title</span><input name="title" value={snapshot.title} onChange={(event) => {
            const title = event.target.value;
            setSnapshot((current) => ({ ...current, title, slug: slugTouched ? current.slug : slugify(title) }));
          }} required maxLength={180} placeholder="Give this update a clear title" aria-label="Title" /><small>This appears at the top of the post and in browser tabs.</small></label>
          <label className="editor-slug-field"><span>Slug</span><span className="editor-slug-control"><span aria-hidden="true">/updates/</span><input name="slug" value={snapshot.slug} onChange={(event) => { updateSnapshot("slug", event.target.value); setSlugTouched(true); }} required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" maxLength={180} aria-label="Slug" aria-describedby="editor-slug-help" /></span><small id="editor-slug-help">Lowercase letters, numbers, and hyphens only.</small></label>
          <label className="editor-excerpt"><span>Excerpt</span><textarea name="excerpt" value={snapshot.excerpt} onChange={(event) => updateSnapshot("excerpt", event.target.value)} maxLength={320} rows={3} placeholder="Summarize the update in one or two sentences." /><small>{snapshot.excerpt.length}/320 characters</small></label>
        </section>

        <details className="editor-settings">
          <summary><span>Post settings</span><small>{snapshot.status === "published" ? "Published" : "Draft"} - date, cover, and sharing image</small></summary>
          <div className="editor-meta">
            <label>Status<select name="status" value={snapshot.status} onChange={(event) => updateSnapshot("status", event.target.value as PostEditorSnapshot["status"])}><option value="draft">Draft</option><option value="published">Published</option></select><small>Published posts become public only after the main save button is used.</small></label>
            <label>Publish date<input name="publishedAt" type="datetime-local" value={snapshot.publishedAt} onChange={(event) => updateSnapshot("publishedAt", event.target.value)} /><small>Leave blank to use the publish time.</small></label>
            <label>Cover image<select name="coverMediaId" value={snapshot.coverMediaId} onChange={(event) => updateSnapshot("coverMediaId", event.target.value)}><option value="">No cover</option>{media.map((asset) => <option key={asset.id} value={asset.id}>{asset.filename}</option>)}</select><small>Shown at the top of the full post.</small></label>
            <label>Social thumbnail<select name="thumbnailMediaId" value={snapshot.thumbnailMediaId} onChange={(event) => updateSnapshot("thumbnailMediaId", event.target.value)}><option value="">Use cover image</option>{media.map((asset) => <option key={asset.id} value={asset.id}>{asset.filename}</option>)}</select><small>Used in update lists and social cards. 1200 x 630 works best.</small></label>
          </div>
        </details>

        <section className="editor-compose" aria-labelledby="editor-compose-title">
          <header><div><h2 id="editor-compose-title">Post content</h2><p>Write in Markdown, preview the final formatting, or insert an uploaded image.</p></div><span>{stats.words} words</span></header>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="editor-tabs">
            <TabsList><TabsTrigger value="write">Write</TabsTrigger><TabsTrigger value="preview">Preview</TabsTrigger><TabsTrigger value="media">Images</TabsTrigger></TabsList>
            <TabsContent value="write">
              <div className="editor-format-toolbar" role="toolbar" aria-label="Markdown formatting">
                <button type="button" onClick={() => formatSelection("**", "**", "bold text")} title="Bold"><strong>B</strong><span className="sr-only">Bold</span></button>
                <button type="button" onClick={() => formatSelection("*", "*", "italic text")} title="Italic"><em>I</em><span className="sr-only">Italic</span></button>
                <button type="button" onClick={() => prefixLines("## ", "Section heading")} title="Heading level 2">H2<span className="sr-only">Heading level 2</span></button>
                <button type="button" onClick={() => formatSelection("[", "](https://example.com)", "link text")} title="Link">Link</button>
                <button type="button" onClick={() => prefixLines("> ", "Quoted text")} title="Block quote">Quote</button>
                <button type="button" onClick={() => prefixLines("- ", "List item")} title="Bulleted list">Bullets</button>
              </div>
              <textarea ref={textareaRef} className="markdown-editor" name="body" aria-label="Post body" value={snapshot.body} onChange={(event) => updateSnapshot("body", event.target.value)} rows={24} maxLength={100_000} placeholder="Write naturally. Markdown is supported..." spellCheck />
              <details className="editor-markdown-help"><summary>Markdown quick reference</summary><p><code>## Heading</code> <code>**bold**</code> <code>*italic*</code> <code>[link](https://...)</code> <code>- list item</code></p></details>
            </TabsContent>
            <TabsContent value="preview"><div className="editor-preview">{snapshot.body ? <MarkdownRenderer markdown={snapshot.body} /> : <p className="editor-placeholder">Your formatted preview will appear here.</p>}</div></TabsContent>
            <TabsContent value="media">
              {media.length ? <><label className="media-picker-search">Find an image<input type="search" value={mediaQuery} onChange={(event) => setMediaQuery(event.target.value)} placeholder="Search filename, caption, or alt text" /></label><div className="media-picker">{filteredMedia.length ? filteredMedia.map((asset) => <button type="button" key={asset.id} onClick={() => insertImage(asset)}><Image src={asset.url} alt={asset.altText} width={asset.width || 400} height={asset.height || 300} sizes="160px" /><span>{asset.filename}</span><small>Insert at cursor</small></button>) : <div className="large-empty"><W98Icon icon="pictures" size={32} /><p>No images match that search.</p></div>}</div></> : <div className="large-empty"><W98Icon icon="pictures" size={32} /><p>Upload an image to the media library first.</p></div>}
            </TabsContent>
          </Tabs>
        </section>
        <div className="editor-writing-stats" aria-label="Writing statistics"><span>{stats.words} words</span><span>{stats.readingMinutes ? `${stats.readingMinutes} min read` : "No reading time yet"}</span><span>Ctrl/Cmd+S to save</span></div>
        {message && <p className={`form-message ${effectiveIndicator === "error" || effectiveIndicator === "conflict" ? "is-error" : "is-success"}`} role="status">{message}</p>}
        <div className="editor-footer">
          <div><span className={`editor-save-status is-${effectiveIndicator}`} role="status" aria-live="polite">{saveLabel(effectiveIndicator, lastSavedAt)}</span><small>{serverStatus === "published" ? "Background autosave will not change the public post." : "Browser recovery runs while you write."}</small></div>
          <button className="retro-button" type="submit" disabled={effectiveIndicator === "saving"}>{effectiveIndicator === "saving" ? "Saving..." : primaryLabel}</button>
        </div>
      </form>

      <Dialog open={Boolean(recovery)} onOpenChange={() => undefined}>
        <DialogContent className="retro-dialog" showCloseButton={false}>
          <DialogHeader><DialogTitle>Recover unsaved writing?</DialogTitle></DialogHeader>
          <DialogDescription>A newer browser recovery copy was found for this post. Restore it or discard it and keep the Neon copy.</DialogDescription>
          <DialogFooter><button className="retro-button" type="button" onClick={discardRecovery}>Discard recovery</button><button className="retro-button" type="button" onClick={restoreRecovery}>Restore writing</button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(conflict)} onOpenChange={() => undefined}>
        <DialogContent className="retro-dialog" showCloseButton={false}>
          <DialogHeader><DialogTitle>Another copy was saved</DialogTitle></DialogHeader>
          <DialogDescription>The Neon copy changed in another tab or device. Reload it, or explicitly overwrite it with the recovery copy in this editor.</DialogDescription>
          <DialogFooter><button className="retro-button" type="button" onClick={() => { localStorage.removeItem(postRecoveryKey(snapshot.id)); window.location.reload(); }}>Reload Neon copy</button><button className="danger-button" type="button" onClick={overwriteConflict}>Keep my copy</button></DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
