import type { Metadata } from "next";
import Link from "next/link";
import { W98Icon } from "@/components/desktop/w98-icon";
import { GuestbookForm } from "@/components/guestbook/guestbook-form";
import { PageShell } from "@/components/retro/page-shell";
import { getPublicProfile } from "@/lib/data";
import { hasGuestbookConfig } from "@/lib/env";
import { getGuestbookPage } from "@/lib/guestbook-data";
import { guestbookDateTime } from "@/lib/guestbook-format";
import { formatDate } from "@/lib/markdown";

export const metadata: Metadata = {
  title: "Guestbook",
  description: "Leave a note in this small-web guestbook.",
  alternates: { canonical: "/guestbook" },
  robots: { index: false, follow: true },
};

export default async function GuestbookPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string | string[] }>;
}) {
  const query = await searchParams;
  const pageValue = Array.isArray(query.page) ? query.page[0] : query.page;
  const requestedPage = Number.parseInt(pageValue || "1", 10);
  const [profile, guestbook] = await Promise.all([
    getPublicProfile(),
    getGuestbookPage(Number.isFinite(requestedPage) ? requestedPage : 1),
  ]);
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim();

  return (
    <PageShell profile={profile} title="Guestbook - Internet Explorer" showVisitorCount>
      <header className="page-heading guestbook-heading">
        <h1>Sign my guestbook</h1>
        <p>Leave a short note. Names are optional, and new messages appear immediately.</p>
        <p className="guestbook-private-link">Prefer to keep it private? <Link href="/ask">Send an anonymous message</Link>.</p>
      </header>
      <div className="guestbook-layout">
        <section className="guestbook-signing" aria-labelledby="guestbook-form-title">
          <div className="guestbook-section-title"><W98Icon icon="address-book" size={32} /><h2 id="guestbook-form-title">Add your message</h2></div>
          <GuestbookForm enabled={hasGuestbookConfig()} siteKey={siteKey} />
        </section>
        <section className="guestbook-entries" aria-labelledby="guestbook-entries-title">
          <div className="guestbook-section-title"><h2 id="guestbook-entries-title">Recent signatures</h2><span>{guestbook.total}</span></div>
          {guestbook.entries.length ? (
            <div className="guestbook-entry-list">
              {guestbook.entries.map((entry) => (
                <article key={entry.id}>
                  <header><strong>{entry.displayName || "Anonymous"}</strong><time dateTime={guestbookDateTime(entry.createdAt)}>{formatDate(entry.createdAt)}</time></header>
                  <p>{entry.message}</p>
                </article>
              ))}
            </div>
          ) : (
            <div className="large-empty guestbook-empty"><W98Icon icon="address-book" size={32} /><h3>No signatures yet</h3><p>The first message will appear here.</p></div>
          )}
          {guestbook.pageCount > 1 && (
            <nav className="guestbook-pagination" aria-label="Guestbook pages">
              {guestbook.page > 1 ? <Link className="retro-button" href={`/guestbook?page=${guestbook.page - 1}`} rel="prev">Previous</Link> : <span />}
              <span>Page {guestbook.page} of {guestbook.pageCount}</span>
              {guestbook.page < guestbook.pageCount ? <Link className="retro-button" href={`/guestbook?page=${guestbook.page + 1}`} rel="next">Next</Link> : <span />}
            </nav>
          )}
        </section>
      </div>
    </PageShell>
  );
}
