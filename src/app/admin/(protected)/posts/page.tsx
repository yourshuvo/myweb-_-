import type { Metadata } from "next";
import Link from "next/link";
import { PostActions } from "@/components/admin/post-actions";
import { getAdminPosts } from "@/lib/data";
import { formatDate } from "@/lib/markdown";

export const metadata: Metadata = { title: "Manage posts", robots: { index: false, follow: false } };

export default async function PostsPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  const { q = "", status = "all" } = await searchParams;
  const query = q.trim().toLowerCase();
  const safeStatus = status === "draft" || status === "published" ? status : "all";
  const posts = await getAdminPosts();
  const filtered = posts.filter((post) => {
    const matchesQuery = !query || post.title.toLowerCase().includes(query) || post.slug.toLowerCase().includes(query);
    const matchesStatus = safeStatus === "all" || post.status === safeStatus;
    return matchesQuery && matchesStatus;
  });

  return (
    <div className="admin-page admin-page--wide">
      <header className="admin-heading admin-heading--row">
        <div><p className="eyebrow">POST MANAGER</p><h1>Updates</h1><p>Find drafts quickly, duplicate useful structures, and publish without a redeploy.</p></div>
        <Link className="retro-button" href="/admin/posts/new">New post</Link>
      </header>
      <section className="admin-panel">
        <div className="admin-panel__title">Post library</div>
        <form className="admin-filter-bar" action="/admin/posts" method="get">
          <label><span>Search</span><input name="q" type="search" defaultValue={q} placeholder="Title or slug" /></label>
          <label><span>Status</span><select name="status" defaultValue={safeStatus}><option value="all">All posts</option><option value="draft">Drafts</option><option value="published">Published</option></select></label>
          <button className="retro-button" type="submit">Apply filters</button>
          {(query || safeStatus !== "all") && <Link href="/admin/posts">Clear</Link>}
        </form>
        <p className="admin-result-count" role="status">Showing {filtered.length} of {posts.length} posts</p>
        {filtered.length ? <div className="admin-table"><div className="admin-table__head"><span>Title</span><span>Status</span><span>Updated</span><span>Actions</span></div>{filtered.map((post) => <div className="admin-table__row" key={post.id}><div><strong>{post.title}</strong><small>/{post.slug}</small></div><span className={`status-badge is-${post.status}`}>{post.status}</span><time dateTime={new Date(post.updatedAt).toISOString()}>{formatDate(post.updatedAt)}</time><PostActions id={post.id} title={post.title} version={post.version} showEdit /></div>)}</div> : <div className="large-empty"><h2>No matching posts</h2><p>Change the search or status filter, or start a new draft.</p></div>}
      </section>
    </div>
  );
}
