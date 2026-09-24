import { headers } from "next/headers";
import { AnonymousMessageAdmin, AskLinkTools } from "@/components/admin/anonymous-message-admin";
import { GuestbookAdminList } from "@/components/admin/guestbook-admin-list";
import { PostCommentAdminList } from "@/components/admin/post-comment-admin-list";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getAdminAnonymousMessages } from "@/lib/anonymous-messages";
import { siteUrl } from "@/lib/env";
import { getAdminGuestbookEntries } from "@/lib/guestbook-data";
import { getAdminPostCommentsWithPosts } from "@/lib/post-comments-data";

export default async function AdminGuestbookPage() {
  const [visible, hidden, unread, read, archived, commentVisible, commentHidden, requestHeaders] = await Promise.all([
    getAdminGuestbookEntries("visible"),
    getAdminGuestbookEntries("hidden"),
    getAdminAnonymousMessages("unread"),
    getAdminAnonymousMessages("read"),
    getAdminAnonymousMessages("archived"),
    getAdminPostCommentsWithPosts("visible"),
    getAdminPostCommentsWithPosts("hidden"),
    headers(),
  ]);

  const host = requestHeaders.get("x-forwarded-host") || requestHeaders.get("host");
  const proto = requestHeaders.get("x-forwarded-proto") || "https";
  const askUrl = host ? `${proto}://${host}/ask` : `${siteUrl()}/ask`;

  return (
    <div className="admin-page">
      <header className="admin-heading">
        <p className="eyebrow">MESSAGES</p>
        <h1>Guestbook and private inbox</h1>
        <p>Moderate public Guestbook entries, post comments, and review anonymous messages that never appear on the site.</p>
      </header>
      <AskLinkTools askUrl={askUrl} />
      <Tabs defaultValue="anonymous" className="messages-application-tabs">
        <TabsList className="retro-tabs-list">
          <TabsTrigger value="anonymous">Anonymous Inbox ({unread.length})</TabsTrigger>
          <TabsTrigger value="guestbook">Public Guestbook ({visible.length})</TabsTrigger>
          <TabsTrigger value="comments">Post Comments ({commentVisible.length + commentHidden.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="anonymous"><AnonymousMessageAdmin unread={unread} read={read} archived={archived} /></TabsContent>
        <TabsContent value="guestbook"><GuestbookAdminList visible={visible} hidden={hidden} /></TabsContent>
        <TabsContent value="comments"><PostCommentAdminList visible={commentVisible} hidden={commentHidden} /></TabsContent>
      </Tabs>
    </div>
  );
}
