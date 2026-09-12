import { z } from "zod";
import { normalizeSpotifyPlaylistUrl } from "@/lib/spotify";

const optionalUrl = z.union([z.literal(""), z.url().max(500)]);

export const profileSchema = z.object({
  displayName: z.string().trim().min(1, "Add a display name.").max(80),
  siteTitle: z.string().trim().min(1, "Add a site title.").max(120),
  biography: z.string().trim().max(3000),
  avatarMediaId: z.union([z.literal(""), z.uuid()]),
  contactEmail: z.union([z.literal(""), z.email()]),
  website: optionalUrl,
  github: optionalUrl,
  instagram: optionalUrl,
  mastodon: optionalUrl,
  spotifyPlaylistTitle: z.string().trim().max(120),
  spotifyPlaylistUrl: z
    .string()
    .trim()
    .max(500)
    .refine((value) => value === "" || normalizeSpotifyPlaylistUrl(value) !== null, {
      message: "Use a public https://open.spotify.com/playlist/... URL.",
    }),
});

export const postSchema = z.object({
  id: z.union([z.literal(""), z.uuid()]),
  title: z.string().trim().min(1, "A title is required.").max(180),
  slug: z
    .string()
    .trim()
    .min(1, "A slug is required.")
    .max(180)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase words separated by hyphens."),
  excerpt: z.string().trim().max(320),
  body: z.string().max(100_000),
  status: z.enum(["draft", "published"]),
  coverMediaId: z.union([z.literal(""), z.uuid()]),
  thumbnailMediaId: z.union([z.literal(""), z.uuid()]),
  publishedAt: z.union([z.literal(""), z.iso.datetime({ local: true })]),
});

export const postEditorSnapshotSchema = postSchema.extend({
  version: z.number().int().nonnegative(),
});

export const albumEditorItemSchema = z.object({
  mediaId: z.uuid("Choose a valid media item."),
  caption: z.string().trim().max(500, "Keep album captions under 500 characters."),
});

export const albumEditorSchema = z
  .object({
    id: z.union([z.literal(""), z.uuid()]),
    title: z.string().trim().min(1, "An album title is required.").max(120),
    slug: z
      .string()
      .trim()
      .min(1, "An album slug is required.")
      .max(180)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase words separated by hyphens."),
    introduction: z.string().trim().max(2000, "Keep the introduction under 2,000 characters."),
    status: z.enum(["draft", "published"]),
    coverMediaId: z.union([z.literal(""), z.uuid()]),
    items: z.array(albumEditorItemSchema).max(250, "An album can contain up to 250 photos."),
  })
  .superRefine((album, context) => {
    const mediaIds = album.items.map((item) => item.mediaId);
    if (new Set(mediaIds).size !== mediaIds.length) {
      context.addIssue({ code: "custom", path: ["items"], message: "Each photo can appear only once in an album." });
    }
    if (album.status === "published" && album.items.length === 0) {
      context.addIssue({ code: "custom", path: ["items"], message: "Add at least one photo before publishing." });
    }
    if (album.coverMediaId && !mediaIds.includes(album.coverMediaId)) {
      context.addIssue({ code: "custom", path: ["coverMediaId"], message: "The cover must be one of the album photos." });
    }
  });

export const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
});

export const passwordResetRequestSchema = z.object({
  email: z.email("Enter a valid email address."),
});

export const passwordResetSchema = z
  .object({
    token: z.string().min(1, "Use the link from your password email.").max(512),
    password: z.string().min(8, "Use at least 8 characters.").max(128, "Use no more than 128 characters."),
    confirmPassword: z.string(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "The passwords do not match.",
    path: ["confirmPassword"],
  });

export const mediaUrlSchema = z.object({
  url: z.url().refine((url) => new URL(url).hostname === "cdn.hackclub.com", {
    message: "Use a cdn.hackclub.com URL.",
  }),
  altText: z.string().trim().min(1).max(300),
  caption: z.string().trim().max(500),
  showInPhotoLog: z.boolean(),
});

export const guestbookSchema = z.object({
  displayName: z.string().trim().max(40, "Keep the name under 40 characters."),
  message: z
    .string()
    .trim()
    .min(1, "Write a message before signing.")
    .max(500, "Keep the message under 500 characters."),
  company: z.string().max(0, "Automated submission rejected."),
});

export const guestbookEntryIdSchema = z.uuid("Invalid guestbook entry ID.");

export const anonymousMessageSchema = z.object({
  message: z
    .string()
    .trim()
    .min(1, "Write a message before sending.")
    .max(500, "Keep the message under 500 characters."),
  company: z.string().max(0, "Automated submission rejected."),
});

export const anonymousMessageIdSchema = z.uuid("Invalid anonymous message ID.");

export const tmdbSearchSchema = z.object({
  query: z.string().trim().min(2, "Enter at least two characters.").max(100, "Keep the search under 100 characters."),
});

export const movieRecommendationSchema = z.object({
  id: z.union([z.literal(""), z.uuid("Invalid recommendation ID.")]),
  tmdbId: z.coerce.number().int().positive("Choose a movie from the TMDB results."),
  personalNote: z.string().trim().max(1500, "Keep your recommendation under 1,500 characters."),
  watchedAt: z.union([z.literal(""), z.iso.date("Use a valid watched date.")]),
  status: z.enum(["draft", "published"]),
});

export const movieRecommendationIdSchema = z.uuid("Invalid recommendation ID.");

export function slugify(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 180);
}
