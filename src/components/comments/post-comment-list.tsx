import { W98Icon } from "@/components/desktop/w98-icon";
import { getPostComments } from "@/lib/post-comments-data";
import { guestbookDateTime } from "@/lib/guestbook-format";
import { formatDate } from "@/lib/markdown";

export async function PostCommentList({ postId }: { postId: string }) {
  const comments = await getPostComments(postId);

  return (
    <div className="post-comment-list-wrap">
      <div className="guestbook-section-title">
        <h2 id="post-comments-title">Comments</h2>
        <span>{comments.length}</span>
      </div>
      {comments.length ? (
        <div className="guestbook-entry-list post-comment-list">
          {comments.map((comment) => (
            <article key={comment.id}>
              <header>
                <strong>{comment.displayName || "Anonymous"}</strong>
                <time dateTime={guestbookDateTime(comment.createdAt)}>{formatDate(comment.createdAt)}</time>
              </header>
              <p>{comment.message}</p>
            </article>
          ))}
        </div>
      ) : (
        <div className="large-empty post-comment-empty">
          <W98Icon icon="address-book" size={32} />
          <h3>No comments yet</h3>
          <p>Be the first to share your thoughts on this post.</p>
        </div>
      )}
    </div>
  );
}
