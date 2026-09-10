export type AlbumStatus = "draft" | "published";

export type AlbumEditorItem = {
  mediaId: string;
  caption: string;
};

export type AlbumEditorSnapshot = {
  id: string;
  title: string;
  slug: string;
  introduction: string;
  status: AlbumStatus;
  coverMediaId: string;
  items: AlbumEditorItem[];
};

export type AlbumSaveResult =
  | {
      status: "success";
      message: string;
      albumId: string;
      slug: string;
      savedAt: string;
      persistedStatus: AlbumStatus;
    }
  | { status: "error"; message: string; field?: keyof AlbumEditorSnapshot };

export function normalizeAlbumItems(items: AlbumEditorItem[]) {
  const seen = new Set<string>();
  return items.flatMap((item) => {
    if (seen.has(item.mediaId)) return [];
    seen.add(item.mediaId);
    return [{ mediaId: item.mediaId, caption: item.caption.trim() }];
  });
}

export function albumCaption(override: string, mediaCaption: string, filename: string) {
  return override.trim() || mediaCaption.trim() || filename;
}

export function albumCoverMediaId(coverMediaId: string | null, items: Array<{ mediaId: string }>) {
  return coverMediaId && items.some((item) => item.mediaId === coverMediaId)
    ? coverMediaId
    : items[0]?.mediaId ?? null;
}

export function photoIsPublic(showInPhotoLog: boolean, publishedAlbumCount: number) {
  return showInPhotoLog || publishedAlbumCount > 0;
}
