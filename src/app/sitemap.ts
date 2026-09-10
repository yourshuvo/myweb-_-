import type { MetadataRoute } from "next";
import { getPhotoLog, getPublicPhotos, getPublishedAlbums, getPublishedMovieRecommendations, getPublishedPosts } from "@/lib/data";
import { siteUrl } from "@/lib/env";
import { archivePath, getArchiveFolders, normalizeArchiveItems, selectArchiveItems } from "@/lib/archive";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const [posts, photos, publicPhotos, albums, movies] = await Promise.all([getPublishedPosts(), getPhotoLog(), getPublicPhotos(), getPublishedAlbums(), getPublishedMovieRecommendations()]);
  const archiveItems = normalizeArchiveItems(posts, photos);
  const folders = getArchiveFolders(archiveItems);
  const staticRoutes = ["", "/updates", "/photos", "/photos/albums", "/archive", "/movies", "/about", "/play", "/play/music", "/play/minesweeper", "/play/solitaire", "/play/chess", "/privacy"].map((path) => ({
    url: `${base}${path}`,
    lastModified: path === "/movies" ? movies[0]?.updatedAt || new Date() : new Date(),
    changeFrequency: path === "" ? "weekly" as const : "monthly" as const,
    priority: path === "" ? 1 : 0.7,
  }));
  const archiveRoutes = folders.flatMap((year) => {
    const yearSelection = { year: year.year };
    const yearItems = selectArchiveItems(archiveItems, yearSelection, "all", "date-desc");
    return [
      { url: `${base}${archivePath(yearSelection)}`, lastModified: yearItems[0]?.date, changeFrequency: "monthly" as const, priority: 0.6 },
      ...year.months.map((month) => {
        const selection = { year: year.year, month: month.month };
        const monthItems = selectArchiveItems(archiveItems, selection, "all", "date-desc");
        return { url: `${base}${archivePath(selection)}`, lastModified: monthItems[0]?.date, changeFrequency: "monthly" as const, priority: 0.5 };
      }),
    ];
  });
  const postRoutes = posts.map((post) => ({ url: `${base}/updates/${post.slug}`, lastModified: post.updatedAt, changeFrequency: "monthly" as const, priority: 0.8 }));
  const photoRoutes = publicPhotos.map((photo) => ({
    url: `${base}/photos/${photo.id}`,
    lastModified: photo.createdAt,
    changeFrequency: "yearly" as const,
    priority: 0.6,
    images: [photo.url],
  }));
  const albumRoutes = albums.map((album) => ({
    url: `${base}/photos/albums/${album.slug}`,
    lastModified: album.updatedAt,
    changeFrequency: "monthly" as const,
    priority: 0.7,
    images: album.cover ? [album.cover.url] : undefined,
  }));
  return [...staticRoutes, ...archiveRoutes, ...postRoutes, ...albumRoutes, ...photoRoutes];
}
