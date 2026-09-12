import type { Metadata } from "next";
import Image from "next/image";
import { PageShell } from "@/components/retro/page-shell";
import { getPublicProfile } from "@/lib/data";

export const metadata: Metadata = {
  title: "About",
  description: "About the person behind this small website.",
  alternates: { canonical: "/about" },
};

export default async function AboutPage() {
  const profile = await getPublicProfile();
  const links = Object.entries(profile.socialLinks).filter((entry): entry is [string, string] => Boolean(entry[1]));
  return (
    <PageShell profile={profile} title="About me - Properties">
      <div className="about-layout">
        <aside className="about-card">
          <div className="about-avatar">{profile.avatarUrl ? <Image src={profile.avatarUrl} alt={`${profile.displayName} portrait`} width={500} height={500} sizes="250px" data-photo-lightbox={profile.avatarUrl} data-photo-lightbox-alt={`${profile.displayName} portrait`} /> : <span aria-hidden="true">?</span>}</div>
          <h1>{profile.displayName || "Profile pending"}</h1><p>{profile.siteTitle}</p>
        </aside>
        <div className="about-copy"><p className="eyebrow">README.TXT</p><h2>A little about me</h2>{profile.biography ? profile.biography.split("\n").filter(Boolean).map((paragraph) => <p key={paragraph}>{paragraph}</p>) : <p>The owner has not added a biography yet. This page will stay honest and quiet until they do.</p>}
          {(profile.contactEmail || links.length > 0) && <section className="contact-box"><h3>Elsewhere on the web</h3>{profile.contactEmail && <a href={`mailto:${profile.contactEmail}`}>{profile.contactEmail}</a>}{links.map(([label, url]) => <a key={label} href={url} rel="me noreferrer">{label}</a>)}</section>}
          <section className="contact-box"><h3>Movie data</h3><p>This product uses the TMDB API but is not endorsed or certified by TMDB.</p></section>
        </div>
      </div>
    </PageShell>
  );
}
