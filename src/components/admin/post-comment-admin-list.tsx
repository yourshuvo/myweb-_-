"use client";

import { useMemo, useState } from "react";
import type { PostComment } from "@/db/schema";
import {
  deletePostCommentAction,
  hidePostCommentAction,
  restorePostCommentAction,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDate } from "@/lib/markdown";

export type PostCommentWithPost = PostComment & { postTitle: string | null; postSlug: string | null };

export function PostCommentAdminList({ visible, hidden }: { visible: PostCommentWithPost[]; hidden: PostCommentWithPost[] }) {
  const [postFilter, setPostFilter] = useState<string>("all");
  const postOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const entry of [...visible, ...hidden]) {
      if (!seen.has(entry.postId)) seen.set(entry.postId, entry.postTitle || entry.postSlug || entry.postId);
    }
    return [...seen.entries()].map(([id, label]) => ({ id, label }));
  }, [visible, hidden]);
  const visibleFiltered = useMemo(
    () => (postFilter === "all" ? visible : visible.filter((entry) => entry.postId === postFilter)),
    [visible, postFilter],
  );
  const hiddenFiltered = useMemo(
    () => (postFilter === "all" ? hidden : hidden.filter((entry) => entry.postId === postFilter)),
    [hidden, postFilter],
  );

  return (
    <Tabs defaultValue="visible" className="admin-guestbook-tabs">
      <TabsList className="retro-tabs-list">
        <TabsTrigger value="visible">Visible ({visibleFiltered.length})</TabsTrigger>
        <TabsTrigger value="hidden">Hidden ({hiddenFiltered.length})</TabsTrigger>
      </TabsList>
      {postOptions.length > 1 ? (
        <div className="admin-filter-bar">
          <label>
            <span>Filter by post</span>
            <select value={postFilter} onChange={(event) => setPostFilter(event.target.value)}>
              <option value="all">All posts ({visible.length + hidden.length})</option>
              {postOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      ) : null}
      <TabsContent value="visible">
        <EntryList entries={visibleFiltered} mode="visible" />
      </TabsContent>
      <TabsContent value="hidden">
        <EntryList entries={hiddenFiltered} mode="hidden" />
      </TabsContent>
    </Tabs>
  );
}

function EntryList({ entries, mode }: { entries: PostCommentWithPost[]; mode: "visible" | "hidden" }) {
  if (!entries.length) {
    return <div className="admin-panel guestbook-admin-empty"><strong>No {mode} comments</strong><p>Post comments in this state will appear here.</p></div>;
  }

  return (
    <div className="guestbook-admin-list">
      {entries.map((entry) => (
        <article className="admin-panel guestbook-admin-entry" key={entry.id}>
          <header>
            <div>
              <strong>{entry.displayName || "Anonymous"}</strong>
              <time>{formatDate(entry.createdAt)}</time>
              {entry.postSlug ? <span> on {entry.postTitle || entry.postSlug}</span> : null}
            </div>
            <span>{mode}</span>
          </header>
          <p>{entry.message}</p>
          <footer>
            <form action={mode === "visible" ? hidePostCommentAction : restorePostCommentAction}>
              <input type="hidden" name="id" value={entry.id} />
              <button className="retro-button" type="submit">{mode === "visible" ? "Hide" : "Restore"}</button>
            </form>
            <AlertDialog>
              <AlertDialogTrigger asChild><button className="retro-button retro-button--danger" type="button">Delete</button></AlertDialogTrigger>
              <AlertDialogContent className="retro-confirm-dialog">
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this comment?</AlertDialogTitle>
                  <AlertDialogDescription>This permanently removes the comment and cannot be undone.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="retro-button">Cancel</AlertDialogCancel>
                  <form action={deletePostCommentAction}>
                    <input type="hidden" name="id" value={entry.id} />
                    <AlertDialogAction asChild><button className="retro-button retro-button--danger" type="submit">Delete permanently</button></AlertDialogAction>
                  </form>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </footer>
        </article>
      ))}
    </div>
  );
}
