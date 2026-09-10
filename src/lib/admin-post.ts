export const POST_RECOVERY_PREFIX = "admin-post-recovery:v1";
export const POST_RECOVERY_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1_000;

export type PostEditorSnapshot = {
  id: string;
  version: number;
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  status: "draft" | "published";
  coverMediaId: string;
  thumbnailMediaId: string;
  publishedAt: string;
};

export type PostRecoveryRecord = {
  savedAt: number;
  snapshot: PostEditorSnapshot;
};

export type PostSaveResult =
  | {
      status: "success";
      message: string;
      postId: string;
      version: number;
      savedAt: string;
      persistedStatus: "draft" | "published";
    }
  | {
      status: "conflict";
      message: string;
      serverVersion: number;
      serverUpdatedAt: string;
      serverStatus: "draft" | "published";
    }
  | { status: "error"; message: string; field?: keyof PostEditorSnapshot };

export function postRecoveryKey(postId: string) {
  return `${POST_RECOVERY_PREFIX}:${postId || "new"}`;
}

export function snapshotContent(snapshot: PostEditorSnapshot) {
  return JSON.stringify({
    title: snapshot.title,
    slug: snapshot.slug,
    excerpt: snapshot.excerpt,
    body: snapshot.body,
    status: snapshot.status,
    coverMediaId: snapshot.coverMediaId,
    thumbnailMediaId: snapshot.thumbnailMediaId,
    publishedAt: snapshot.publishedAt,
  });
}

export function parsePostRecovery(value: string | null, now = Date.now()): PostRecoveryRecord | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as Partial<PostRecoveryRecord>;
    if (
      typeof parsed.savedAt !== "number" ||
      !parsed.snapshot ||
      typeof parsed.snapshot !== "object" ||
      now - parsed.savedAt > POST_RECOVERY_MAX_AGE_MS
    ) {
      return null;
    }
    const snapshot = parsed.snapshot as Partial<PostEditorSnapshot>;
    if (
      typeof snapshot.id !== "string" ||
      typeof snapshot.version !== "number" ||
      typeof snapshot.title !== "string" ||
      typeof snapshot.slug !== "string" ||
      typeof snapshot.excerpt !== "string" ||
      typeof snapshot.body !== "string" ||
      (snapshot.status !== "draft" && snapshot.status !== "published") ||
      typeof snapshot.coverMediaId !== "string" ||
      (snapshot.thumbnailMediaId !== undefined && typeof snapshot.thumbnailMediaId !== "string") ||
      typeof snapshot.publishedAt !== "string"
    ) {
      return null;
    }
    return {
      savedAt: parsed.savedAt,
      snapshot: {
        ...snapshot,
        thumbnailMediaId: snapshot.thumbnailMediaId ?? "",
      } as PostEditorSnapshot,
    };
  } catch {
    return null;
  }
}

export function isAutosaveReady(snapshot: PostEditorSnapshot) {
  return Boolean(
    snapshot.title.trim() &&
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(snapshot.slug.trim()) &&
      snapshot.status === "draft",
  );
}

export function postWritingStats(body: string) {
  const words = body.trim() ? body.trim().split(/\s+/).length : 0;
  return { words, readingMinutes: words ? Math.max(1, Math.ceil(words / 200)) : 0 };
}

export function nextCopySlug(sourceSlug: string, existingSlugs: Iterable<string>) {
  const taken = new Set(existingSlugs);
  const base = `${sourceSlug}-copy`.slice(0, 180).replace(/-+$/, "");
  if (!taken.has(base)) return base;
  let suffix = 2;
  while (true) {
    const ending = `-${suffix}`;
    const candidate = `${base.slice(0, 180 - ending.length).replace(/-+$/, "")}${ending}`;
    if (!taken.has(candidate)) return candidate;
    suffix += 1;
  }
}
