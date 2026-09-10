"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { deletePostAction, duplicatePostAction, type DeletePostState } from "@/app/admin/actions";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function PostActions({ id, title, version, showEdit = false }: { id: string; title: string; version: number; showEdit?: boolean }) {
  const [currentVersion, setCurrentVersion] = useState(version);
  const [deleteState, deleteAction, deletePending] = useActionState<DeletePostState, FormData>(deletePostAction, {
    status: "idle",
    message: "",
  });
  useEffect(() => {
    const updateVersion = (event: Event) => {
      const detail = (event as CustomEvent<{ id: string; version: number }>).detail;
      if (detail?.id === id) setCurrentVersion(detail.version);
    };
    window.addEventListener("admin-post-version", updateVersion);
    return () => window.removeEventListener("admin-post-version", updateVersion);
  }, [id]);

  return (
    <div className="post-actions">
      {showEdit && <Link href={`/admin/posts/${id}`}>Edit</Link>}
      <form action={duplicatePostAction}>
        <input type="hidden" name="id" value={id} />
        <button type="submit">Duplicate</button>
      </form>
      <AlertDialog>
        <AlertDialogTrigger asChild><button className="is-danger" type="button">Delete</button></AlertDialogTrigger>
        <AlertDialogContent className="retro-confirm-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{title}”?</AlertDialogTitle>
            <AlertDialogDescription>This permanently removes the post. This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          {deleteState.status === "error" && <p className="form-message is-error" role="alert">{deleteState.message}</p>}
          <AlertDialogFooter>
            <AlertDialogCancel className="retro-button" disabled={deletePending}>Cancel</AlertDialogCancel>
            <form action={deleteAction}>
              <input type="hidden" name="id" value={id} />
              <input type="hidden" name="version" value={currentVersion} />
              <button className="danger-button" type="submit" disabled={deletePending}>
                {deletePending ? "Deleting…" : "Delete permanently"}
              </button>
            </form>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
