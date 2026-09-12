import type { Metadata } from "next";
import Link from "next/link";
import { AnonymousMessageForm } from "@/components/anonymous/anonymous-message-form";
import { W98Icon } from "@/components/desktop/w98-icon";
import { PageShell } from "@/components/retro/page-shell";
import { getPublicProfile } from "@/lib/data";
import { hasVisitorTrackingConfig } from "@/lib/env";

export const metadata: Metadata = {
  title: "Send an anonymous message",
  description: "Send a private anonymous message to the site owner.",
  alternates: { canonical: "/ask" },
  robots: { index: false, follow: false, nocache: true },
};

export default async function AskPage() {
  const profile = await getPublicProfile();
  const recipientName = profile.displayName?.trim() || "the site owner";

  return (
    <PageShell profile={profile} title="Private Message - Internet Explorer">
      <div className="ask-page">
        <header className="ask-hero">
          <span className="ask-hero__icon" aria-hidden="true">
            <W98Icon icon="address-book" size={32} />
          </span>
          <div className="ask-hero__copy">
            <span className="ask-hero__label">Private inbox</span>
            <h1>Say anything. Stay anonymous.</h1>
            <p>Send a private note without sharing your name, email, or social account.</p>
          </div>
        </header>

        <div className="ask-workspace">
          <aside className="ask-details" aria-labelledby="ask-details-title">
            <div className="ask-panel-title">
              <W98Icon icon="user-computer" size={16} />
              <h2 id="ask-details-title">Message details</h2>
            </div>
            <dl>
              <div><dt>To</dt><dd>{recipientName}</dd></div>
              <div><dt>Your identity</dt><dd>Not requested</dd></div>
              <div><dt>Visibility</dt><dd>Owner only</dd></div>
              <div><dt>Daily limit</dt><dd>3 messages</dd></div>
            </dl>
            <div className="ask-privacy-note">
              <strong>Your privacy</strong>
              <p>Your message is stored without a name, email address, social account, or location.</p>
              <Link href="/privacy">Read the privacy notes</Link>
            </div>
          </aside>

          <section className="ask-composer" aria-labelledby="ask-form-title">
            <div className="ask-panel-title ask-panel-title--active">
              <W98Icon icon="notepad-file" size={16} />
              <h2 id="ask-form-title">Write a private message</h2>
            </div>
            <AnonymousMessageForm enabled={hasVisitorTrackingConfig()} />
          </section>
        </div>

        <footer className="ask-footer">
          <Link href="/guestbook">Back to the public Guestbook</Link>
          <span>Private messages are plain text only.</span>
        </footer>
      </div>
    </PageShell>
  );
}
