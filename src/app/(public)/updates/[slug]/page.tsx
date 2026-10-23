import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { PostCommentForm } from "@/components/comments/post-comment-form";
import { PostCommentList } from "@/components/comments/post-comment-list";
import { MarkdownRenderer } from "@/components/markdown-renderer";
import { PostReader } from "@/components/posts/post-reader";
import { PostUnlockForm } from "@/components/posts/post-unlock-form";
import { PageShell } from "@/components/retro/page-shell";
import { getPostPasswordHashById, getPublishedPost, getPublicProfile } from "@/lib/data";
import { hasVisitorTrackingConfig } from "@/lib/env";
import { toIsoDateTime } from "@/lib/date-values";
import { formatDate } from "@/lib/markdown";
import { postWritingStats } from "@/lib/admin-post";
import { postUnlockCookieName, verifyPostUnlockToken } from "@/lib/post-password";
import { resolvePostThumbnail } from "@/lib/post-thumbnail";

type Props = { params: Promise<{ slug: string }> };

async function isUnlocked(postId: string, isPasswordProtected: boolean): Promise<boolean> {
  if (!isPasswordProtected) return true;
  const passwordHash = await getPostPasswordHashById(postId);
  if (!passwordHash) return false;
  const cookieStore = await cookies();
  const token = cookieStore.get(postUnlockCookieName(postId))?.value;
  return verifyPostUnlockToken(token, postId, passwordHash);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPublishedPost(slug);
  if (!post) return { title: "Update not found" };
  if (post.isPasswordProtected) {
    return {
      title: post.title,
      description: "Password protected update",
      alternates: { canonical: `/updates/${post.slug}` },
      openGraph: {
        type: "article",
        title: post.title,
        description: "Password protected update",
        url: `/updates/${post.slug}`,
        publishedTime: toIsoDateTime(post.publishedAt),
        modifiedTime: toIsoDateTime(post.updatedAt),
        images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "My corner of the internet" }],
      },
      twitter: {
        card: "summary_large_image",
        title: post.title,
        description: "Password protected update",
        images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "My corner of the internet" }],
      },
    };
  }
  const socialImage = resolvePostThumbnail(post);
  const socialImages = socialImage
    ? [{ url: socialImage.url, alt: socialImage.alt }]
    : [{ url: "/og-image.png", width: 1200, height: 630, alt: "My corner of the internet" }];
  return {
    title: post.title,
    description: post.excerpt,
    alternates: { canonical: `/updates/${post.slug}` },
    openGraph: {
      type: "article",
      title: post.title,
      description: post.excerpt,
      url: `/updates/${post.slug}`,
      publishedTime: toIsoDateTime(post.publishedAt),
      modifiedTime: toIsoDateTime(post.updatedAt),
      images: socialImages,
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.excerpt,
      images: socialImages,
    },
  };
}

export default async function UpdatePage({ params }: Props) {
  const { slug } = await params;
  const [profile, post] = await Promise.all([getPublicProfile(), getPublishedPost(slug)]);
  if (!post) notFound();
  const unlocked = await isUnlocked(post.id, post.isPasswordProtected);
  if (!unlocked) {
    return (
      <PageShell profile={profile} title={`${post.title} - WordPad`}>
        <article className="post-article">
          <header>
            <div className="post-article__meta"><time dateTime={toIsoDateTime(post.publishedAt)}>{formatDate(post.publishedAt)}</time><span>Password protected</span></div>
            <h1>{post.title}</h1>
          </header>
          <PostUnlockForm postId={post.id} />
          <footer className="post-article__footer"><Link href="/updates">Back to all updates</Link><span>{profile.displayName || profile.siteTitle}</span></footer>
        </article>
      </PageShell>
    );
  }
  const stats = postWritingStats(post.body);
  return (
    <PageShell profile={profile} title={`${post.title} - WordPad`}>
      <PostReader>
        <article className="post-article">
          <header>
            <div className="post-article__meta"><time dateTime={toIsoDateTime(post.publishedAt)}>{formatDate(post.publishedAt)}</time><span>{stats.readingMinutes ? `${stats.readingMinutes} min read` : "Short update"}</span></div>
            <h1>{post.title}</h1>
            {post.excerpt && <p>{post.excerpt}</p>}
          </header>
          {post.coverUrl && <figure className="post-article__cover"><Image src={post.coverUrl} alt={post.coverAltText || `Cover image for ${post.title}`} width={1200} height={800} sizes="(max-width: 800px) 100vw, 760px" data-photo-lightbox={post.coverUrl} data-photo-lightbox-alt={post.coverAltText || `Cover image for ${post.title}`} priority /></figure>}
          <MarkdownRenderer markdown={post.body} />
          <footer className="post-article__footer"><Link href="/updates">Back to all updates</Link><span>{profile.displayName || profile.siteTitle}</span></footer>
        </article>
      </PostReader>
      <section className="post-comments" aria-labelledby="post-comments-heading">
        <div className="guestbook-section-title">
          <h2 id="post-comments-heading">Join the discussion</h2>
        </div>
        <PostCommentForm postId={post.id} enabled={hasVisitorTrackingConfig()} />
        <PostCommentList postId={post.id} />
      </section>
    </PageShell>
  );
}
