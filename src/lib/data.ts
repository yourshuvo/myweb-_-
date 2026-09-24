import "server-only";

import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { unstable_cache } from "next/cache";
import { connection } from "next/server";
import { getDb, requireDb } from "@/db";
import {
  mediaAssets,
  movieRecommendations,
  photoAlbumItems,
  photoAlbums,
  postMedia,
  posts,
  siteProfile,
  type MediaAsset,
  type MovieRecommendation,
  type PhotoAlbum,
  type SocialLinks,
} from "@/db/schema";
import { albumCaption } from "@/lib/albums";
import { toDate } from "@/lib/date-values";

const postThumbnailMedia = alias(mediaAssets, "post_thumbnail_media");

export type PublicProfile = {
  displayName: string;
  siteTitle: string;
  biography: string;
  contactEmail: string;
  socialLinks: SocialLinks;
  avatarMediaId: string | null;
  avatarUrl: string | null;
  spotifyPlaylistTitle: string;
  spotifyPlaylistUrl: string;
  onboarded: boolean;
};

export type PublicPost = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  status: "draft" | "published";
  coverMediaId: string | null;
  coverUrl: string | null;
  coverAltText: string | null;
  thumbnailMediaId: string | null;
  thumbnailUrl: string | null;
  thumbnailAltText: string | null;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type PublicAlbumItem = MediaAsset & {
  position: number;
  albumCaption: string;
  displayCaption: string;
};

export type PublicAlbum = PhotoAlbum & {
  items: PublicAlbumItem[];
  cover: PublicAlbumItem | null;
  photoCount: number;
};

export type PublicPhotoAlbumLink = {
  id: string;
  slug: string;
  title: string;
};

export type PublicPhoto = MediaAsset & {
  albums: PublicPhotoAlbumLink[];
};

export type AdminAlbum = PhotoAlbum & {
  photoCount: number;
};

export type AdminAlbumDetail = PhotoAlbum & {
  items: Array<{
    mediaId: string;
    caption: string;
    position: number;
    media: MediaAsset;
  }>;
};

export type PublicMovieRecommendation = MovieRecommendation;

const emptyProfile: PublicProfile = {
  displayName: "",
  siteTitle: "My corner of the internet",
  biography: "",
  contactEmail: "",
  socialLinks: {},
  avatarMediaId: null,
  avatarUrl: null,
  spotifyPlaylistTitle: "",
  spotifyPlaylistUrl: "",
  onboarded: false,
};

async function queryProfile() {
  const db = getDb();
  if (!db) return emptyProfile;
  const [row] = await db
    .select({
      displayName: siteProfile.displayName,
      siteTitle: siteProfile.siteTitle,
      biography: siteProfile.biography,
      contactEmail: siteProfile.contactEmail,
      socialLinks: siteProfile.socialLinks,
      avatarMediaId: siteProfile.avatarMediaId,
      avatarUrl: mediaAssets.url,
      spotifyPlaylistTitle: siteProfile.spotifyPlaylistTitle,
      spotifyPlaylistUrl: siteProfile.spotifyPlaylistUrl,
      onboardedAt: siteProfile.onboardedAt,
    })
    .from(siteProfile)
    .leftJoin(mediaAssets, eq(siteProfile.avatarMediaId, mediaAssets.id))
    .limit(1);
  if (!row) return emptyProfile;
  return { ...row, onboarded: Boolean(row.onboardedAt) } satisfies PublicProfile & { onboardedAt: Date | null };
}

async function queryPublishedPosts() {
  const db = getDb();
  if (!db) return [];
  return db
    .select({
      id: posts.id,
      slug: posts.slug,
      title: posts.title,
      excerpt: posts.excerpt,
      body: posts.body,
      status: posts.status,
      coverMediaId: posts.coverMediaId,
      coverUrl: mediaAssets.url,
      coverAltText: mediaAssets.altText,
      thumbnailMediaId: posts.thumbnailMediaId,
      thumbnailUrl: postThumbnailMedia.url,
      thumbnailAltText: postThumbnailMedia.altText,
      publishedAt: posts.publishedAt,
      createdAt: posts.createdAt,
      updatedAt: posts.updatedAt,
    })
    .from(posts)
    .leftJoin(mediaAssets, eq(posts.coverMediaId, mediaAssets.id))
    .leftJoin(postThumbnailMedia, eq(posts.thumbnailMediaId, postThumbnailMedia.id))
    .where(eq(posts.status, "published"))
    .orderBy(desc(posts.publishedAt), desc(posts.createdAt));
}

export const getPublicProfile = unstable_cache(queryProfile, ["public-profile"], {
  tags: ["profile"],
});

const getCachedPublishedPosts = unstable_cache(queryPublishedPosts, ["published-posts"], {
  tags: ["posts"],
});

export async function getPublishedPosts(): Promise<PublicPost[]> {
  const cached = await getCachedPublishedPosts();
  return cached.map((post) => ({
    ...post,
    publishedAt: post.publishedAt ? toDate(post.publishedAt) : null,
    createdAt: toDate(post.createdAt),
    updatedAt: toDate(post.updatedAt),
  }));
}

export async function getPublishedPost(slug: string) {
  const all = await getPublishedPosts();
  return all.find((post) => post.slug === slug) ?? null;
}

export async function getPublishedPostById(id: string) {
  const all = await getPublishedPosts();
  return all.find((post) => post.id === id) ?? null;
}

const getCachedPhotoLog = unstable_cache(
  async () => {
    const db = getDb();
    if (!db) return [];
    return db
      .select()
      .from(mediaAssets)
      .where(eq(mediaAssets.showInPhotoLog, true))
      .orderBy(desc(mediaAssets.takenDate), desc(mediaAssets.createdAt));
  },
  ["photo-log"],
  { tags: ["photos"] },
);

export async function getPhotoLog(): Promise<MediaAsset[]> {
  const cached = await getCachedPhotoLog();
  return cached.map((photo) => ({ ...photo, createdAt: toDate(photo.createdAt) }));
}

async function queryPublishedAlbums(): Promise<PublicAlbum[]> {
  const db = getDb();
  if (!db) return [];
  const albums = await db
    .select()
    .from(photoAlbums)
    .where(eq(photoAlbums.status, "published"))
    .orderBy(desc(photoAlbums.publishedAt), desc(photoAlbums.createdAt));
  if (!albums.length) return [];

  const rows = await db
    .select({
      albumId: photoAlbumItems.albumId,
      position: photoAlbumItems.position,
      albumCaption: photoAlbumItems.caption,
      media: mediaAssets,
    })
    .from(photoAlbumItems)
    .innerJoin(mediaAssets, eq(photoAlbumItems.mediaId, mediaAssets.id))
    .where(inArray(photoAlbumItems.albumId, albums.map((album) => album.id)))
    .orderBy(asc(photoAlbumItems.albumId), asc(photoAlbumItems.position), asc(photoAlbumItems.createdAt));

  const itemsByAlbum = new Map<string, PublicAlbumItem[]>();
  for (const row of rows) {
    const items = itemsByAlbum.get(row.albumId) || [];
    items.push({
      ...row.media,
      position: row.position,
      albumCaption: row.albumCaption,
      displayCaption: albumCaption(row.albumCaption, row.media.caption, row.media.filename),
    });
    itemsByAlbum.set(row.albumId, items);
  }

  return albums.map((album) => {
    const items = itemsByAlbum.get(album.id) || [];
    const cover = items.find((item) => item.id === album.coverMediaId) || items[0] || null;
    return { ...album, items, cover, photoCount: items.length };
  });
}

const getCachedPublishedAlbums = unstable_cache(queryPublishedAlbums, ["published-photo-albums"], {
  tags: ["albums", "photos"],
});

export async function getPublishedAlbums(): Promise<PublicAlbum[]> {
  const cached = await getCachedPublishedAlbums();
  return cached.map((album) => {
    const items = album.items.map((item) => ({ ...item, createdAt: toDate(item.createdAt) }));
    return {
      ...album,
      publishedAt: album.publishedAt ? toDate(album.publishedAt) : null,
      createdAt: toDate(album.createdAt),
      updatedAt: toDate(album.updatedAt),
      items,
      cover: album.cover ? items.find((item) => item.id === album.cover!.id) || null : null,
    };
  });
}

export async function getPublishedAlbum(slug: string) {
  const albums = await getPublishedAlbums();
  return albums.find((album) => album.slug === slug) ?? null;
}

const getCachedPublicPhotos = unstable_cache(
  async (): Promise<PublicPhoto[]> => {
    const db = getDb();
    if (!db) return [];
    const [photoLog, memberships] = await Promise.all([
      db.select().from(mediaAssets).where(eq(mediaAssets.showInPhotoLog, true)),
      db
        .select({
          albumId: photoAlbums.id,
          albumSlug: photoAlbums.slug,
          albumTitle: photoAlbums.title,
          media: mediaAssets,
        })
        .from(photoAlbumItems)
        .innerJoin(photoAlbums, eq(photoAlbumItems.albumId, photoAlbums.id))
        .innerJoin(mediaAssets, eq(photoAlbumItems.mediaId, mediaAssets.id))
        .where(eq(photoAlbums.status, "published")),
    ]);

    const publicPhotos = new Map<string, PublicPhoto>();
    for (const media of photoLog) publicPhotos.set(media.id, { ...media, albums: [] });
    for (const row of memberships) {
      const photo = publicPhotos.get(row.media.id) || { ...row.media, albums: [] };
      if (!photo.albums.some((album) => album.id === row.albumId)) {
        photo.albums.push({ id: row.albumId, slug: row.albumSlug, title: row.albumTitle });
      }
      publicPhotos.set(photo.id, photo);
    }
    return [...publicPhotos.values()].sort((a, b) => {
      const aDate = new Date(a.takenDate || a.createdAt).getTime();
      const bDate = new Date(b.takenDate || b.createdAt).getTime();
      return bDate - aDate;
    });
  },
  ["public-photos"],
  { tags: ["photos", "albums"] },
);

export async function getPublicPhotos(): Promise<PublicPhoto[]> {
  const cached = await getCachedPublicPhotos();
  return cached.map((photo) => ({ ...photo, createdAt: toDate(photo.createdAt) }));
}

export async function getPublicPhoto(id: string) {
  const photos = await getPublicPhotos();
  return photos.find((photo) => photo.id === id) ?? null;
}

const getCachedPublishedMovieRecommendations = unstable_cache(
  async () => {
    const db = getDb();
    if (!db) return [];
    return db
      .select()
      .from(movieRecommendations)
      .where(eq(movieRecommendations.status, "published"))
      .orderBy(desc(movieRecommendations.publishedAt), desc(movieRecommendations.createdAt));
  },
  ["published-movie-recommendations"],
  { tags: ["movies"] },
);

export async function getPublishedMovieRecommendations(): Promise<PublicMovieRecommendation[]> {
  const cached = await getCachedPublishedMovieRecommendations();
  return cached.map((movie) => ({
    ...movie,
    publishedAt: movie.publishedAt ? toDate(movie.publishedAt) : null,
    createdAt: toDate(movie.createdAt),
    updatedAt: toDate(movie.updatedAt),
  }));
}

export async function getAdminMovieRecommendations() {
  await connection();
  return requireDb().select().from(movieRecommendations).orderBy(desc(movieRecommendations.updatedAt));
}

export async function getAdminPosts() {
  await connection();
  return requireDb().select().from(posts).orderBy(desc(posts.updatedAt));
}

export async function getAdminPost(id: string) {
  await connection();
  const [post] = await requireDb().select().from(posts).where(eq(posts.id, id)).limit(1);
  return post ?? null;
}

export async function getAdminMedia() {
  await connection();
  return requireDb().select().from(mediaAssets).orderBy(desc(mediaAssets.createdAt));
}

export type MediaReference = {
  key: string;
  label: string;
  href: string;
};

export type MediaReferenceMap = Record<string, MediaReference[]>;

export async function getAdminMediaReferenceMap(): Promise<MediaReferenceMap> {
  await connection();
  const db = requireDb();
  const [inlineRows, postRows, albumItemRows, albumRows, profileRows] = await Promise.all([
    db
      .select({ mediaId: postMedia.mediaId, postId: posts.id, postTitle: posts.title })
      .from(postMedia)
      .innerJoin(posts, eq(postMedia.postId, posts.id)),
    db.select({ postId: posts.id, postTitle: posts.title, coverMediaId: posts.coverMediaId, thumbnailMediaId: posts.thumbnailMediaId }).from(posts),
    db
      .select({ mediaId: photoAlbumItems.mediaId, albumId: photoAlbums.id, albumTitle: photoAlbums.title })
      .from(photoAlbumItems)
      .innerJoin(photoAlbums, eq(photoAlbumItems.albumId, photoAlbums.id)),
    db.select({ albumId: photoAlbums.id, albumTitle: photoAlbums.title, coverMediaId: photoAlbums.coverMediaId }).from(photoAlbums),
    db.select({ avatarMediaId: siteProfile.avatarMediaId }).from(siteProfile),
  ]);
  const references = new Map<string, MediaReference[]>();
  const add = (mediaId: string | null, reference: MediaReference) => {
    if (!mediaId) return;
    const current = references.get(mediaId) || [];
    if (!current.some((item) => item.key === reference.key)) current.push(reference);
    references.set(mediaId, current);
  };
  const postName = (title: string) => title.trim() || "Untitled post";
  const albumName = (title: string) => title.trim() || "Untitled album";
  for (const row of inlineRows) add(row.mediaId, {
    key: `post:${row.postId}:body`,
    label: `Post body: ${postName(row.postTitle)}`,
    href: `/admin/posts/${row.postId}`,
  });
  for (const row of postRows) {
    add(row.coverMediaId, {
      key: `post:${row.postId}:cover`,
      label: `Post cover: ${postName(row.postTitle)}`,
      href: `/admin/posts/${row.postId}`,
    });
    add(row.thumbnailMediaId, {
      key: `post:${row.postId}:thumbnail`,
      label: `Social thumbnail: ${postName(row.postTitle)}`,
      href: `/admin/posts/${row.postId}`,
    });
  }
  for (const row of albumItemRows) add(row.mediaId, {
    key: `album:${row.albumId}:photo`,
    label: `Album photo: ${albumName(row.albumTitle)}`,
    href: `/admin/albums/${row.albumId}`,
  });
  for (const row of albumRows) add(row.coverMediaId, {
    key: `album:${row.albumId}:cover`,
    label: `Album cover: ${albumName(row.albumTitle)}`,
    href: `/admin/albums/${row.albumId}`,
  });
  for (const row of profileRows) add(row.avatarMediaId, {
    key: "profile:avatar",
    label: "Profile avatar",
    href: "/admin/profile",
  });

  return Object.fromEntries(references);
}

export async function getAdminAlbums(): Promise<AdminAlbum[]> {
  await connection();
  const db = requireDb();
  const [albums, items] = await Promise.all([
    db.select().from(photoAlbums).orderBy(desc(photoAlbums.updatedAt)),
    db.select({ albumId: photoAlbumItems.albumId }).from(photoAlbumItems),
  ]);
  const counts = new Map<string, number>();
  for (const item of items) counts.set(item.albumId, (counts.get(item.albumId) || 0) + 1);
  return albums.map((album) => ({ ...album, photoCount: counts.get(album.id) || 0 }));
}

export async function getAdminAlbum(id: string): Promise<AdminAlbumDetail | null> {
  await connection();
  const db = requireDb();
  const [album] = await db.select().from(photoAlbums).where(eq(photoAlbums.id, id)).limit(1);
  if (!album) return null;
  const items = await db
    .select({
      mediaId: photoAlbumItems.mediaId,
      caption: photoAlbumItems.caption,
      position: photoAlbumItems.position,
      media: mediaAssets,
    })
    .from(photoAlbumItems)
    .innerJoin(mediaAssets, eq(photoAlbumItems.mediaId, mediaAssets.id))
    .where(eq(photoAlbumItems.albumId, id))
    .orderBy(asc(photoAlbumItems.position), asc(photoAlbumItems.createdAt));
  return { ...album, items };
}

export async function mediaIsReferenced(mediaId: string) {
  const db = requireDb();
  const [inlineReference] = await db
    .select({ mediaId: postMedia.mediaId })
    .from(postMedia)
    .where(eq(postMedia.mediaId, mediaId))
    .limit(1);
  const [coverReference] = await db
    .select({ id: posts.id })
    .from(posts)
    .where(eq(posts.coverMediaId, mediaId))
    .limit(1);
  const [thumbnailReference] = await db
    .select({ id: posts.id })
    .from(posts)
    .where(eq(posts.thumbnailMediaId, mediaId))
    .limit(1);
  const [avatarReference] = await db
    .select({ id: siteProfile.id })
    .from(siteProfile)
    .where(eq(siteProfile.avatarMediaId, mediaId))
    .limit(1);
  const [albumItemReference] = await db
    .select({ mediaId: photoAlbumItems.mediaId })
    .from(photoAlbumItems)
    .where(eq(photoAlbumItems.mediaId, mediaId))
    .limit(1);
  const [albumCoverReference] = await db
    .select({ id: photoAlbums.id })
    .from(photoAlbums)
    .where(eq(photoAlbums.coverMediaId, mediaId))
    .limit(1);
  return Boolean(inlineReference || coverReference || thumbnailReference || avatarReference || albumItemReference || albumCoverReference);
}

export async function findMediaByUrl(url: string) {
  const [asset] = await requireDb()
    .select({ id: mediaAssets.id })
    .from(mediaAssets)
    .where(and(eq(mediaAssets.url, url)))
    .limit(1);
  return asset ?? null;
}
