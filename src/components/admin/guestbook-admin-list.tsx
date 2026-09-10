"use client";

import type { GuestbookEntry } from "@/db/schema";
import {
  deleteGuestbookEntryAction,
  hideGuestbookEntryAction,
  restoreGuestbookEntryAction,
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

export function GuestbookAdminList({ visible, hidden }: { visible: GuestbookEntry[]; hidden: GuestbookEntry[] }) {
  return (
    <Tabs defaultValue="visible" className="admin-guestbook-tabs">
      <TabsList className="retro-tabs-list">
        <TabsTrigger value="visible">Visible ({visible.length})</TabsTrigger>
        <TabsTrigger value="hidden">Hidden ({hidden.length})</TabsTrigger>
      </TabsList>
      <TabsContent value="visible">
        <EntryList entries={visible} mode="visible" />
      </TabsContent>
      <TabsContent value="hidden">
        <EntryList entries={hidden} mode="hidden" />
      </TabsContent>
    </Tabs>
  );
}

function EntryList({ entries, mode }: { entries: GuestbookEntry[]; mode: "visible" | "hidden" }) {
  if (!entries.length) {
    return <div className="admin-panel guestbook-admin-empty"><strong>No {mode} messages</strong><p>Guestbook entries in this state will appear here.</p></div>;
  }

  return (
    <div className="guestbook-admin-list">
      {entries.map((entry) => (
        <article className="admin-panel guestbook-admin-entry" key={entry.id}>
          <header><div><strong>{entry.displayName || "Anonymous"}</strong><time>{formatDate(entry.createdAt)}</time></div><span>{mode}</span></header>
          <p>{entry.message}</p>
          <footer>
            <form action={mode === "visible" ? hideGuestbookEntryAction : restoreGuestbookEntryAction}>
              <input type="hidden" name="id" value={entry.id} />
              <button className="retro-button" type="submit">{mode === "visible" ? "Hide" : "Restore"}</button>
            </form>
            <AlertDialog>
              <AlertDialogTrigger asChild><button className="retro-button retro-button--danger" type="button">Delete</button></AlertDialogTrigger>
              <AlertDialogContent className="retro-confirm-dialog">
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this guestbook message?</AlertDialogTitle>
                  <AlertDialogDescription>This permanently removes the message and cannot be undone.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="retro-button">Cancel</AlertDialogCancel>
                  <form action={deleteGuestbookEntryAction}>
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
