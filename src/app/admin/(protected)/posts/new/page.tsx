import type { Metadata } from "next";
import { PostEditor } from "@/components/admin/post-editor";
import { getAdminMedia } from "@/lib/data";

export const metadata: Metadata = { title: "New post", robots: { index: false, follow: false } };

export default async function NewPostPage() {
  const media = await getAdminMedia();
  return <div className="admin-page admin-page--wide"><header className="admin-heading"><p className="eyebrow">NEW UPDATE</p><h1>Write something down.</h1><p>Your browser protects incomplete writing, then valid drafts autosave to Neon. Preview uses the same safe renderer as the public post.</p></header><PostEditor media={media} /></div>;
}
