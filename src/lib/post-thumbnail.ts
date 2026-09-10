export type PostThumbnailFields = {
  title: string;
  thumbnailUrl: string | null;
  thumbnailAltText: string | null;
  coverUrl: string | null;
  coverAltText: string | null;
};

export function resolvePostThumbnail(post: PostThumbnailFields) {
  if (post.thumbnailUrl) {
    return {
      url: post.thumbnailUrl,
      alt: post.thumbnailAltText || `Thumbnail for ${post.title}`,
      source: "thumbnail" as const,
    };
  }
  if (post.coverUrl) {
    return {
      url: post.coverUrl,
      alt: post.coverAltText || `Cover image for ${post.title}`,
      source: "cover" as const,
    };
  }
  return null;
}
