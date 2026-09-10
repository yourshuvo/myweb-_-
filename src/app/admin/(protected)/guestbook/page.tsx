import { AnonymousMessageAdmin, AskLinkTools } from "@/components/admin/anonymous-message-admin";
import { GuestbookAdminList } from "@/components/admin/guestbook-admin-list";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getAdminAnonymousMessages } from "@/lib/anonymous-messages";
import { siteUrl } from "@/lib/env";
import { getAdminGuestbookEntries } from "@/lib/guestbook-data";

export default async function AdminGuestbookPage() {
  const [visible, hidden, unread, read, archived] = await Promise.all([
    getAdminGuestbookEntries("visible"),
    getAdminGuestbookEntries("hidden"),
    getAdminAnonymousMessages("unread"),
    getAdminAnonymousMessages("read"),
    getAdminAnonymousMessages("archived"),
  ]);

  return (
    <div className="admin-page">
      <header className="admin-heading">
        <p className="eyebrow">MESSAGES</p>
        <h1>Guestbook and private inbox</h1>
        <p>Moderate public Guestbook entries and review anonymous messages that never appear on the site.</p>
      </header>
      <AskLinkTools askUrl={`${siteUrl()}/ask`} />
      <Tabs defaultValue="anonymous" className="messages-application-tabs">
        <TabsList className="retro-tabs-list">
          <TabsTrigger value="anonymous">Anonymous Inbox ({unread.length})</TabsTrigger>
          <TabsTrigger value="guestbook">Public Guestbook ({visible.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="anonymous"><AnonymousMessageAdmin unread={unread} read={read} archived={archived} /></TabsContent>
        <TabsContent value="guestbook"><GuestbookAdminList visible={visible} hidden={hidden} /></TabsContent>
      </Tabs>
    </div>
  );
}
