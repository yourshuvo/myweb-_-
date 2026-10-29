import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PostActions } from "@/components/admin/post-actions";
import { PostEditor } from "@/components/admin/post-editor";
import { getAdminMedia, getAdminPost } from "@/lib/data";

export const metadata: Metadata = { title: "Edit post", robots: { index: false, follow: false } };

export default async function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [post, media] = await Promise.all([getAdminPost(id), getAdminMedia()]);
  if (!post) notFound();
  // Never send the password hash to the client editor — only whether one is set.
  const { passwordHash, ...postWithoutHash } = post;
  const editablePost = { ...postWithoutHash, passwordProtected: Boolean(passwordHash) };
  return <div className="admin-page admin-page--wide"><header className="admin-heading admin-heading--row"><div><p className="eyebrow">EDIT UPDATE</p><h1>{post.title}</h1><p>Drafts autosave to Neon. Published changes remain private until you update them explicitly.</p></div><PostActions id={post.id} title={post.title} version={post.version} /></header><PostEditor post={editablePost} media={media} /></div>;
}
