"use server";

import { and, eq, inArray, sql } from "drizzle-orm";
import { refresh, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { anonymousMessages, guestbookEntries, mediaAssets, movieRecommendations, photoAlbumItems, photoAlbums, postComments, postMedia, posts, siteProfile } from "@/db/schema";
import { requireDb } from "@/db";
import { normalizeAlbumItems, type AlbumEditorSnapshot, type AlbumSaveResult } from "@/lib/albums";
import { anonymousMessageTransition } from "@/lib/anonymous-message-model";
import { nextCopySlug, type PostEditorSnapshot, type PostSaveResult } from "@/lib/admin-post";
import { requireAdmin } from "@/lib/auth/server";
import { extractHackClubMediaUrls } from "@/lib/markdown";
import { normalizeSpotifyPlaylistUrl } from "@/lib/spotify";
import { getTmdbMovie, TmdbRequestError } from "@/lib/tmdb";
import { albumEditorSchema, anonymousMessageIdSchema, guestbookEntryIdSchema, mediaUrlSchema, movieRecommendationIdSchema, movieRecommendationSchema, postCommentIdSchema, postEditorSnapshotSchema, profileSchema } from "@/lib/validation";

export type FormState = { status: "idle" | "error" | "success"; message: string };
export type MovieMutationState = FormState & { recommendationId?: string };

export async function saveProfileAction(_state: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const parsed = profileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message || "Check the profile fields." };
  const db = requireDb();
  const data = parsed.data;
  const spotifyPlaylistUrl = normalizeSpotifyPlaylistUrl(data.spotifyPlaylistUrl) || "";
  await db
    .insert(siteProfile)
    .values({
      id: 1,
      displayName: data.displayName,
      siteTitle: data.siteTitle,
      biography: data.biography,
      avatarMediaId: data.avatarMediaId || null,
      contactEmail: data.contactEmail,
      socialLinks: { website: data.website || undefined, github: data.github || undefined, instagram: data.instagram || undefined, mastodon: data.mastodon || undefined },
      spotifyPlaylistTitle: data.spotifyPlaylistTitle,
      spotifyPlaylistUrl,
      onboardedAt: new Date(),
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: siteProfile.id,
      set: {
        displayName: data.displayName,
        siteTitle: data.siteTitle,
        biography: data.biography,
        avatarMediaId: data.avatarMediaId || null,
        contactEmail: data.contactEmail,
        socialLinks: { website: data.website || undefined, github: data.github || undefined, instagram: data.instagram || undefined, mastodon: data.mastodon || undefined },
        spotifyPlaylistTitle: data.spotifyPlaylistTitle,
        spotifyPlaylistUrl,
        onboardedAt: new Date(),
        updatedAt: new Date(),
      },
    });
  updateTag("profile");
  return { status: "success", message: "Profile saved." };
}

async function latestPostConflict(postId: string): Promise<PostSaveResult> {
  const [latest] = await requireDb()
    .select({ version: posts.version, updatedAt: posts.updatedAt, status: posts.status })
    .from(posts)
    .where(eq(posts.id, postId))
    .limit(1);
  if (!latest) return { status: "error", message: "This post no longer exists." };
  return {
    status: "conflict",
    message: "A newer copy of this post exists on the server.",
    serverVersion: latest.version,
    serverUpdatedAt: latest.updatedAt.toISOString(),
    serverStatus: latest.status,
  };
}

async function persistPost(input: PostEditorSnapshot, mode: "autosave" | "explicit"): Promise<PostSaveResult> {
  const user = await requireAdmin();
  const parsed = postEditorSnapshotSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const field = typeof issue?.path[0] === "string" ? issue.path[0] as keyof PostEditorSnapshot : undefined;
    return { status: "error", message: issue?.message || "Check the post fields.", field };
  }
  const data = parsed.data;
  if (mode === "autosave" && data.status !== "draft") {
    return { status: "error", message: "Published changes require an explicit save." };
  }

  const db = requireDb();
  const now = new Date();
  let previousStatus: "draft" | "published" | null = null;

  try {
    const saved = await db.transaction(async (tx) => {
      let row: { id: string; version: number; status: "draft" | "published" } | undefined;
      const publishedAt = data.status === "published" ? (data.publishedAt ? new Date(data.publishedAt) : now) : null;

      if (data.id) {
        const [existing] = await tx
          .select({ version: posts.version, status: posts.status })
          .from(posts)
          .where(eq(posts.id, data.id))
          .limit(1);
        if (!existing || existing.version !== data.version || (mode === "autosave" && existing.status !== "draft")) return null;
        previousStatus = existing.status;
        [row] = await tx
          .update(posts)
          .set({
            title: data.title,
            slug: data.slug,
            excerpt: data.excerpt,
            body: data.body,
            status: data.status,
            coverMediaId: data.coverMediaId || null,
            thumbnailMediaId: data.thumbnailMediaId || null,
            publishedAt,
            updatedAt: now,
            version: sql`${posts.version} + 1`,
          })
          .where(and(eq(posts.id, data.id), eq(posts.version, data.version)))
          .returning({ id: posts.id, version: posts.version, status: posts.status });
      } else {
        [row] = await tx
          .insert(posts)
          .values({
            title: data.title,
            slug: data.slug,
            excerpt: data.excerpt,
            body: data.body,
            status: data.status,
            coverMediaId: data.coverMediaId || null,
            thumbnailMediaId: data.thumbnailMediaId || null,
            authorId: user.id,
            publishedAt,
            updatedAt: now,
          })
          .returning({ id: posts.id, version: posts.version, status: posts.status });
      }
      if (!row) return null;

      await tx.delete(postMedia).where(eq(postMedia.postId, row.id));
      const urls = [...new Set(extractHackClubMediaUrls(data.body))];
      if (urls.length) {
        const assets = await tx.select({ id: mediaAssets.id }).from(mediaAssets).where(inArray(mediaAssets.url, urls));
        if (assets.length) {
          await tx.insert(postMedia).values(assets.map((asset) => ({ postId: row!.id, mediaId: asset.id }))).onConflictDoNothing();
        }
      }
      return row;
    });

    if (!saved) return data.id ? latestPostConflict(data.id) : { status: "error", message: "The post could not be saved." };
    if (previousStatus === "published" || saved.status === "published") updateTag("posts");
    return {
      status: "success",
      message: saved.status === "published" ? "Published. The public site is up to date." : mode === "autosave" ? "Draft autosaved." : "Draft saved.",
      postId: saved.id,
      version: saved.version,
      savedAt: now.toISOString(),
      persistedStatus: saved.status,
    };
  } catch (error) {
    console.error("[admin/posts] post persistence failed", {
      error: error instanceof Error ? error.message : String(error),
      mode,
      postId: data.id || "new",
      version: data.version,
    });
    const message = error instanceof Error && error.message.includes("posts_slug_unique") ? "That slug is already in use." : "The post could not be saved.";
    return { status: "error", message, field: message.startsWith("That slug") ? "slug" : undefined };
  }
}

export async function autosavePostDraftAction(input: PostEditorSnapshot): Promise<PostSaveResult> {
  try {
    return await persistPost(input, "autosave");
  } catch (error) {
    console.error("[admin/posts] autosave request failed", {
      error: error instanceof Error ? error.message : String(error),
      postId: input.id || "new",
      version: input.version,
    });
    throw error;
  }
}

export async function savePostExplicitAction(input: PostEditorSnapshot): Promise<PostSaveResult> {
  try {
    return await persistPost(input, "explicit");
  } catch (error) {
    console.error("[admin/posts] explicit save request failed", {
      error: error instanceof Error ? error.message : String(error),
      postId: input.id || "new",
      version: input.version,
    });
    throw error;
  }
}

export async function duplicatePostAction(formData: FormData) {
  const user = await requireAdmin();
  const id = String(formData.get("id") || "");
  if (!id) throw new Error("Missing post ID.");
  const db = requireDb();
  const [source] = await db.select().from(posts).where(eq(posts.id, id)).limit(1);
  if (!source) throw new Error("Post not found.");
  const existingSlugs = await db.select({ slug: posts.slug }).from(posts);
  const slug = nextCopySlug(source.slug, existingSlugs.map((row) => row.slug));
  const title = `Copy of ${source.title}`.slice(0, 180);
  const copyId = await db.transaction(async (tx) => {
    const [copy] = await tx
      .insert(posts)
      .values({
        title,
        slug,
        excerpt: source.excerpt,
        body: source.body,
        status: "draft",
        coverMediaId: source.coverMediaId,
        thumbnailMediaId: source.thumbnailMediaId,
        authorId: user.id,
        publishedAt: null,
      })
      .returning({ id: posts.id });
    if (!copy) throw new Error("The duplicate could not be created.");
    const references = await tx.select({ mediaId: postMedia.mediaId }).from(postMedia).where(eq(postMedia.postId, source.id));
    if (references.length) {
      await tx.insert(postMedia).values(references.map((reference) => ({ postId: copy.id, mediaId: reference.mediaId }))).onConflictDoNothing();
    }
    return copy.id;
  });
  redirect(`/admin/posts/${copyId}`);
}

export type DeletePostState = { status: "idle" | "error"; message: string };

export async function deletePostAction(_state: DeletePostState, formData: FormData): Promise<DeletePostState> {
  await requireAdmin();
  const id = String(formData.get("id") || "");
  const version = Number(formData.get("version"));
  if (!id || !Number.isInteger(version) || version < 1) {
    console.warn("[admin/posts] delete rejected because its identity or version was missing", { postId: id || "missing" });
    return { status: "error", message: "The delete request was incomplete. Reload the post and try again." };
  }
  const [deleted] = await requireDb().delete(posts).where(and(eq(posts.id, id), eq(posts.version, version))).returning({ id: posts.id });
  if (!deleted) {
    console.warn("[admin/posts] delete rejected by version check", { postId: id, version });
    return { status: "error", message: "This post changed after the delete dialog opened. Reload it, then try again." };
  }
  console.info("[admin/posts] post deleted", { postId: deleted.id, version });
  updateTag("posts");
  redirect("/admin/posts");
}

export async function saveAlbumAction(input: AlbumEditorSnapshot): Promise<AlbumSaveResult> {
  await requireAdmin();
  const parsed = albumEditorSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const field = typeof issue?.path[0] === "string" ? issue.path[0] as keyof AlbumEditorSnapshot : undefined;
    return { status: "error", message: issue?.message || "Check the album fields.", field };
  }

  const data = { ...parsed.data, items: normalizeAlbumItems(parsed.data.items) };
  const db = requireDb();
  if (data.items.length) {
    const existingMedia = await db
      .select({ id: mediaAssets.id })
      .from(mediaAssets)
      .where(inArray(mediaAssets.id, data.items.map((item) => item.mediaId)));
    if (existingMedia.length !== data.items.length) {
      return { status: "error", message: "One or more selected photos no longer exist.", field: "items" };
    }
  }

  const now = new Date();
  let previousStatus: "draft" | "published" | null = null;
  try {
    const saved = await db.transaction(async (tx) => {
      let albumId = data.id;
      let publishedAt: Date | null = data.status === "published" ? now : null;

      if (data.id) {
        const [existing] = await tx
          .select({ status: photoAlbums.status, publishedAt: photoAlbums.publishedAt })
          .from(photoAlbums)
          .where(eq(photoAlbums.id, data.id))
          .limit(1);
        if (!existing) return null;
        previousStatus = existing.status;
        publishedAt = data.status === "published" ? existing.publishedAt || now : null;
        const [updated] = await tx
          .update(photoAlbums)
          .set({
            title: data.title,
            slug: data.slug,
            introduction: data.introduction,
            status: data.status,
            coverMediaId: data.coverMediaId || null,
            publishedAt,
            updatedAt: now,
          })
          .where(eq(photoAlbums.id, data.id))
          .returning({ id: photoAlbums.id });
        if (!updated) return null;
      } else {
        const [created] = await tx
          .insert(photoAlbums)
          .values({
            title: data.title,
            slug: data.slug,
            introduction: data.introduction,
            status: data.status,
            coverMediaId: data.coverMediaId || null,
            publishedAt,
            updatedAt: now,
          })
          .returning({ id: photoAlbums.id });
        if (!created) return null;
        albumId = created.id;
      }

      await tx.delete(photoAlbumItems).where(eq(photoAlbumItems.albumId, albumId));
      if (data.items.length) {
        await tx.insert(photoAlbumItems).values(data.items.map((item, position) => ({
          albumId,
          mediaId: item.mediaId,
          caption: item.caption,
          position,
        })));
      }
      return { id: albumId };
    });

    if (!saved) return { status: "error", message: "The album no longer exists." };
    if (previousStatus === "published" || data.status === "published") {
      updateTag("albums");
      updateTag("photos");
    }
    return {
      status: "success",
      message: data.status === "published" ? "Album published. The public site is up to date." : "Album draft saved.",
      albumId: saved.id,
      slug: data.slug,
      savedAt: now.toISOString(),
      persistedStatus: data.status,
    };
  } catch (error) {
    const message = error instanceof Error && error.message.includes("photo_albums_slug_unique")
      ? "That album slug is already in use."
      : "The album could not be saved.";
    return { status: "error", message, field: message.startsWith("That album slug") ? "slug" : undefined };
  }
}

export async function deleteAlbumAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") || "");
  if (!id) throw new Error("Missing album ID.");
  const db = requireDb();
  const [album] = await db.select({ status: photoAlbums.status }).from(photoAlbums).where(eq(photoAlbums.id, id)).limit(1);
  if (!album) throw new Error("Album not found.");
  await db.delete(photoAlbums).where(eq(photoAlbums.id, id));
  if (album.status === "published") {
    updateTag("albums");
    updateTag("photos");
  }
  redirect("/admin/albums");
}

export async function saveMovieRecommendationAction(_state: MovieMutationState, formData: FormData): Promise<MovieMutationState> {
  await requireAdmin();
  const parsed = movieRecommendationSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message || "Check the recommendation fields." };

  let tmdbMovie;
  try {
    tmdbMovie = await getTmdbMovie(parsed.data.tmdbId);
  } catch (error) {
    return {
      status: "error",
      message: error instanceof TmdbRequestError ? error.message : "The movie details could not be loaded from TMDB.",
    };
  }

  const db = requireDb();
  const now = new Date();
  const data = parsed.data;
  try {
    let recommendationId = data.id;
    let previousStatus: "draft" | "published" | null = null;
    let publishedAt: Date | null = data.status === "published" ? now : null;

    if (data.id) {
      const [existing] = await db
        .select({ status: movieRecommendations.status, publishedAt: movieRecommendations.publishedAt })
        .from(movieRecommendations)
        .where(eq(movieRecommendations.id, data.id))
        .limit(1);
      if (!existing) return { status: "error", message: "This recommendation no longer exists." };
      previousStatus = existing.status;
      publishedAt = data.status === "published" ? existing.publishedAt || now : null;
      const [updated] = await db
        .update(movieRecommendations)
        .set({
          tmdbId: tmdbMovie.id,
          title: tmdbMovie.title,
          originalTitle: tmdbMovie.originalTitle,
          overview: tmdbMovie.overview,
          posterPath: tmdbMovie.posterPath,
          backdropPath: tmdbMovie.backdropPath,
          releaseDate: tmdbMovie.releaseDate,
          runtimeMinutes: tmdbMovie.runtimeMinutes,
          genres: tmdbMovie.genres,
          personalNote: data.personalNote,
          watchedAt: data.watchedAt || null,
          status: data.status,
          publishedAt,
          updatedAt: now,
        })
        .where(eq(movieRecommendations.id, data.id))
        .returning({ id: movieRecommendations.id });
      if (!updated) return { status: "error", message: "This recommendation could not be saved." };
    } else {
      const [created] = await db
        .insert(movieRecommendations)
        .values({
          tmdbId: tmdbMovie.id,
          title: tmdbMovie.title,
          originalTitle: tmdbMovie.originalTitle,
          overview: tmdbMovie.overview,
          posterPath: tmdbMovie.posterPath,
          backdropPath: tmdbMovie.backdropPath,
          releaseDate: tmdbMovie.releaseDate,
          runtimeMinutes: tmdbMovie.runtimeMinutes,
          genres: tmdbMovie.genres,
          personalNote: data.personalNote,
          watchedAt: data.watchedAt || null,
          status: data.status,
          publishedAt,
          updatedAt: now,
        })
        .returning({ id: movieRecommendations.id });
      if (!created) return { status: "error", message: "This recommendation could not be created." };
      recommendationId = created.id;
    }

    if (previousStatus === "published" || data.status === "published") updateTag("movies");
    refresh();
    return {
      status: "success",
      message: data.status === "published" ? "Recommendation published." : "Recommendation saved as a draft.",
      recommendationId,
    };
  } catch (error) {
    const duplicate = error instanceof Error && error.message.includes("movie_recommendations_tmdb_id_unique");
    return { status: "error", message: duplicate ? "That movie is already in your recommendation library." : "The recommendation could not be saved." };
  }
}

export async function deleteMovieRecommendationAction(_state: MovieMutationState, formData: FormData): Promise<MovieMutationState> {
  await requireAdmin();
  const parsed = movieRecommendationIdSchema.safeParse(String(formData.get("id") || ""));
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message || "The delete request was invalid." };
  const db = requireDb();
  const [existing] = await db
    .select({ status: movieRecommendations.status })
    .from(movieRecommendations)
    .where(eq(movieRecommendations.id, parsed.data))
    .limit(1);
  if (!existing) return { status: "error", message: "This recommendation no longer exists." };
  await db.delete(movieRecommendations).where(eq(movieRecommendations.id, parsed.data));
  if (existing.status === "published") updateTag("movies");
  refresh();
  return { status: "success", message: "Recommendation deleted." };
}

export async function addManualMediaAction(_state: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const parsed = mediaUrlSchema.safeParse({
    url: formData.get("url"),
    altText: formData.get("altText"),
    caption: formData.get("caption"),
    showInPhotoLog: formData.get("showInPhotoLog") === "on",
  });
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message || "Check the media fields." };
  const url = new URL(parsed.data.url);
  const parts = url.pathname.split("/").filter(Boolean);
  const cdnId = parts[0];
  const filename = decodeURIComponent(parts.at(-1) || "image");
  if (!cdnId) return { status: "error", message: "That CDN URL is missing an upload ID." };
  await requireDb().insert(mediaAssets).values({ cdnId, url: url.toString(), filename, mimeType: "image/unknown", byteSize: 0, altText: parsed.data.altText, caption: parsed.data.caption, showInPhotoLog: parsed.data.showInPhotoLog }).onConflictDoNothing();
  updateTag("photos");
  return { status: "success", message: "CDN image added to the media library." };
}

export async function hideGuestbookEntryAction(formData: FormData) {
  await requireAdmin();
  const id = guestbookEntryIdSchema.parse(String(formData.get("id") || ""));
  await requireDb().update(guestbookEntries).set({ status: "hidden", hiddenAt: new Date() }).where(eq(guestbookEntries.id, id));
  updateTag("guestbook");
  refresh();
}

export async function restoreGuestbookEntryAction(formData: FormData) {
  await requireAdmin();
  const id = guestbookEntryIdSchema.parse(String(formData.get("id") || ""));
  await requireDb().update(guestbookEntries).set({ status: "visible", hiddenAt: null }).where(eq(guestbookEntries.id, id));
  updateTag("guestbook");
  refresh();
}

export async function deleteGuestbookEntryAction(formData: FormData) {
  await requireAdmin();
  const id = guestbookEntryIdSchema.parse(String(formData.get("id") || ""));
  await requireDb().delete(guestbookEntries).where(eq(guestbookEntries.id, id));
  updateTag("guestbook");
  refresh();
}

export async function hidePostCommentAction(formData: FormData) {
  await requireAdmin();
  const id = postCommentIdSchema.parse(String(formData.get("id") || ""));
  await requireDb().update(postComments).set({ status: "hidden", hiddenAt: new Date() }).where(eq(postComments.id, id));
  updateTag("post-comments");
  refresh();
}

export async function restorePostCommentAction(formData: FormData) {
  await requireAdmin();
  const id = postCommentIdSchema.parse(String(formData.get("id") || ""));
  await requireDb().update(postComments).set({ status: "visible", hiddenAt: null }).where(eq(postComments.id, id));
  updateTag("post-comments");
  refresh();
}

export async function deletePostCommentAction(formData: FormData) {
  await requireAdmin();
  const id = postCommentIdSchema.parse(String(formData.get("id") || ""));
  await requireDb().delete(postComments).where(eq(postComments.id, id));
  updateTag("post-comments");
  refresh();
}

export async function markAnonymousMessageReadAction(formData: FormData) {
  await requireAdmin();
  const id = anonymousMessageIdSchema.parse(String(formData.get("id") || ""));
  await requireDb()
    .update(anonymousMessages)
    .set(anonymousMessageTransition("read"))
    .where(eq(anonymousMessages.id, id));
  refresh();
}

export async function markAnonymousMessageUnreadAction(formData: FormData) {
  await requireAdmin();
  const id = anonymousMessageIdSchema.parse(String(formData.get("id") || ""));
  await requireDb()
    .update(anonymousMessages)
    .set(anonymousMessageTransition("unread"))
    .where(eq(anonymousMessages.id, id));
  refresh();
}

export async function archiveAnonymousMessageAction(formData: FormData) {
  await requireAdmin();
  const id = anonymousMessageIdSchema.parse(String(formData.get("id") || ""));
  await requireDb()
    .update(anonymousMessages)
    .set(anonymousMessageTransition("archive"))
    .where(eq(anonymousMessages.id, id));
  refresh();
}

export async function restoreAnonymousMessageAction(formData: FormData) {
  await requireAdmin();
  const id = anonymousMessageIdSchema.parse(String(formData.get("id") || ""));
  await requireDb()
    .update(anonymousMessages)
    .set(anonymousMessageTransition("restore"))
    .where(eq(anonymousMessages.id, id));
  refresh();
}

export async function deleteAnonymousMessageAction(formData: FormData) {
  await requireAdmin();
  const id = anonymousMessageIdSchema.parse(String(formData.get("id") || ""));
  await requireDb().delete(anonymousMessages).where(eq(anonymousMessages.id, id));
  refresh();
}
