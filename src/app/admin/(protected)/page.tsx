import Link from "next/link";
import { redirect } from "next/navigation";
import { W98Icon } from "@/components/desktop/w98-icon";
import { getAdminAnonymousMessages } from "@/lib/anonymous-messages";
import { getAdminAlbums, getAdminMedia, getAdminMovieRecommendations, getAdminPosts, getPublicProfile } from "@/lib/data";
import { getAdminGuestbookEntries, getVisitorCount } from "@/lib/guestbook-data";
import { getServerEnv, hasAuthConfig, hasGuestbookConfig, hasTmdbConfig, hasVisitorTrackingConfig } from "@/lib/env";
import { formatDate } from "@/lib/markdown";

type ActivityItem = { id: string; label: string; detail: string; date: Date; href: string };

export default async function AdminPage() {
  const [profile, posts, media, albums, movies, visibleGuestbook, hiddenGuestbook, unreadAnonymous, visitorCount] = await Promise.all([
    getPublicProfile(),
    getAdminPosts(),
    getAdminMedia(),
    getAdminAlbums(),
    getAdminMovieRecommendations(),
    getAdminGuestbookEntries("visible"),
    getAdminGuestbookEntries("hidden"),
    getAdminAnonymousMessages("unread"),
    getVisitorCount(),
  ]);
  if (!profile.onboarded) redirect("/admin/profile?onboarding=1");

  const published = posts.filter((post) => post.status === "published").length;
  const drafts = posts.filter((post) => post.status === "draft");
  const latestDraft = drafts[0];
  const activity: ActivityItem[] = [
    ...posts.slice(0, 5).map((post) => ({ id: `post-${post.id}`, label: post.title, detail: `${post.status} post`, date: new Date(post.updatedAt), href: `/admin/posts/${post.id}` })),
    ...media.slice(0, 5).map((asset) => ({ id: `media-${asset.id}`, label: asset.filename, detail: "media added", date: new Date(asset.createdAt), href: "/admin/media" })),
    ...albums.slice(0, 5).map((album) => ({ id: `album-${album.id}`, label: album.title, detail: `${album.status} album`, date: new Date(album.updatedAt), href: `/admin/albums/${album.id}` })),
    ...movies.slice(0, 5).map((movie) => ({ id: `movie-${movie.id}`, label: movie.title, detail: `${movie.status} movie suggestion`, date: new Date(movie.updatedAt), href: "/admin/movies" })),
    ...[...visibleGuestbook, ...hiddenGuestbook].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5).map((entry) => ({ id: `guestbook-${entry.id}`, label: entry.displayName || "Anonymous", detail: `${entry.status} guestbook message`, date: new Date(entry.createdAt), href: "/admin/guestbook" })),
    ...unreadAnonymous.slice(0, 5).map((entry) => ({ id: `anonymous-${entry.id}`, label: "Anonymous message", detail: "unread private message", date: new Date(entry.createdAt), href: "/admin/guestbook" })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 6);

  const checks = [
    { label: "Neon Auth", configured: hasAuthConfig() },
    { label: "Hack Club uploads", configured: Boolean(getServerEnv("HACKCLUB_CDN_API_KEY")) },
    { label: "TMDB movie data", configured: hasTmdbConfig() },
    { label: "Guestbook anti-spam", configured: hasGuestbookConfig() },
    { label: "Visitor cookie", configured: hasVisitorTrackingConfig() },
  ];
  const missingChecks = checks.filter((check) => !check.configured);

  return (
    <div className="admin-page admin-page--wide">
      <header className="admin-heading"><p className="eyebrow">CONTROL PANEL</p><h1>Site overview</h1><p>Resume a draft, review recent activity, or make a public update from one place.</p></header>

      <div className="admin-stat-strip admin-stat-strip--eight" aria-label="Site totals">
        <div><span>{published}</span><small>Published</small></div>
        <div><span>{drafts.length}</span><small>Drafts</small></div>
        <div><span>{media.length}</span><small>Media</small></div>
        <div><span>{albums.length}</span><small>Albums</small></div>
        <div><span>{movies.length}</span><small>Movies</small></div>
        <div><span>{visibleGuestbook.length}</span><small>Guestbook</small></div>
        <div><span>{unreadAnonymous.length}</span><small>Unread</small></div>
        <div><span>{visitorCount}</span><small>Visitors</small></div>
      </div>

      {latestDraft && <section className="resume-draft"><div><W98Icon icon="notepad-file" size={32} /><div><small>Latest draft</small><strong>{latestDraft.title}</strong><span>Last edited {formatDate(latestDraft.updatedAt)}</span></div></div><Link className="retro-button" href={`/admin/posts/${latestDraft.id}`}>Resume writing</Link></section>}

      <div className="admin-actions admin-actions--six">
        <Link className="admin-action-card" href="/admin/posts/new"><W98Icon icon="notepad-file" size={32} /><strong>Write an update</strong><span>Start a recoverable draft</span></Link>
        <Link className="admin-action-card" href="/admin/media"><W98Icon icon="camera" size={32} /><strong>Add photographs</strong><span>Open the media library</span></Link>
        <Link className="admin-action-card" href="/admin/albums/new"><W98Icon icon="pictures" size={32} /><strong>Build an album</strong><span>Arrange existing photos</span></Link>
        <Link className="admin-action-card" href="/admin/movies"><W98Icon icon="media-player" size={32} /><strong>Suggest a movie</strong><span>Search TMDB and add your note</span></Link>
        <Link className="admin-action-card" href="/admin/guestbook"><W98Icon icon="address-book" size={32} /><strong>Review messages</strong><span>{unreadAnonymous.length} unread, {hiddenGuestbook.length} hidden</span></Link>
        <Link className="admin-action-card" href="/" target="_blank"><W98Icon icon="computer" size={32} /><strong>View the site</strong><span>Open the public desktop</span></Link>
      </div>

      <div className="dashboard-columns">
        <section className="admin-panel">
          <div className="admin-panel__title">Recent activity</div>
          {activity.length ? <div className="activity-list">{activity.map((item) => <Link key={item.id} href={item.href}><div><strong>{item.label}</strong><span>{item.detail}</span></div><time dateTime={item.date.toISOString()}>{formatDate(item.date)}</time></Link>)}</div> : <div className="dashboard-empty"><strong>No activity yet</strong><p>Your saved posts, albums, media, and guestbook entries will appear here.</p></div>}
        </section>
        <section className="admin-panel">
          <div className="admin-panel__title">Service check</div>
          {missingChecks.length ? <div className="service-list">{checks.map((check) => <div key={check.label}><span className={check.configured ? "is-ready" : "is-missing"}>{check.configured ? "Ready" : "Needs setup"}</span><strong>{check.label}</strong></div>)}</div> : <div className="dashboard-empty"><strong>All core services are ready</strong><p>Authentication, uploads, movie data, guestbook protection, and visitor counting are configured.</p></div>}
        </section>
      </div>
    </div>
  );
}
