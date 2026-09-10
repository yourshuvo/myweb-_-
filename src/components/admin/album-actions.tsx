"use client";

import Link from "next/link";
import { deleteAlbumAction } from "@/app/admin/actions";
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

export function AlbumActions({ id, title, showEdit = false }: { id: string; title: string; showEdit?: boolean }) {
  return (
    <div className="post-actions">
      {showEdit && <Link href={`/admin/albums/${id}`}>Edit</Link>}
      <AlertDialog>
        <AlertDialogTrigger asChild><button className="is-danger" type="button">Delete</button></AlertDialogTrigger>
        <AlertDialogContent className="retro-confirm-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &quot;{title}&quot;?</AlertDialogTitle>
            <AlertDialogDescription>The album and its ordering will be removed. Media files will remain in the library.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="retro-button">Cancel</AlertDialogCancel>
            <form action={deleteAlbumAction}>
              <input type="hidden" name="id" value={id} />
              <AlertDialogAction asChild><button className="danger-button" type="submit">Delete permanently</button></AlertDialogAction>
            </form>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
