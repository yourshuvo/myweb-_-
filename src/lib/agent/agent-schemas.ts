import { z } from "zod";
import {
  albumEditorItemSchema,
  mediaUrlSchema,
  postSchema,
  profileSchema,
} from "@/lib/validation";

export const uuidParam = z.uuid("Invalid ID.");

export const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

/** Optional `?status=` query filters with typed results for drizzle `eq()`. */
const draftPublished = z.enum(["draft", "published"]);
export const draftPublishedParam = draftPublished.optional();
export const visibleHiddenParam = z.enum(["visible", "hidden"]).optional();
export const messageStatusParam = z.enum(["unread", "read", "archived"]).optional();

/** Parse an optional enum query param; returns undefined when absent. */
export function parseStatusParam<T extends z.ZodTypeAny>(
  schema: T,
  raw: string | null,
  label: string,
): { ok: true; value: z.infer<T> } | { ok: false; response: Response } {
  const parsed = schema.safeParse(raw ?? undefined);
  if (!parsed.success) {
    return {
      ok: false,
      response: Response.json({ error: label }, { status: 400, headers: { "Cache-Control": "private, no-store" } }),
    };
  }
  return { ok: true, value: parsed.data };
}

/** POST /api/agent/v1/posts */
export const agentCreatePostSchema = postSchema.omit({ id: true });

/** PATCH /api/agent/v1/posts/[id] — partial update with optimistic concurrency. */
export const agentUpdatePostSchema = postSchema
  .omit({ id: true })
  .partial()
  .extend({ version: z.number().int().nonnegative().optional() });

export type AgentUpdatePost = z.infer<typeof agentUpdatePostSchema>;

/** POST /api/agent/v1/albums */
export const agentCreateAlbumSchema = z
  .object({
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

/** PATCH /api/agent/v1/albums/[id] — partial update; `items` replaces the whole list. */
export const agentUpdateAlbumSchema = z
  .object({
    title: z.string().trim().min(1, "An album title is required.").max(120).optional(),
    slug: z
      .string()
      .trim()
      .min(1, "An album slug is required.")
      .max(180)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase words separated by hyphens.")
      .optional(),
    introduction: z.string().trim().max(2000, "Keep the introduction under 2,000 characters.").optional(),
    status: z.enum(["draft", "published"]).optional(),
    coverMediaId: z.union([z.literal(""), z.uuid()]).optional(),
    items: z.array(albumEditorItemSchema).max(250, "An album can contain up to 250 photos.").optional(),
  })
  .superRefine((album, context) => {
    if (album.items === undefined) return;
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

/** POST /api/agent/v1/media (JSON body: register an existing CDN upload) */
export const agentRegisterMediaSchema = mediaUrlSchema;

const tmdbIdOnlySchema = z.object({
  tmdbId: z.coerce.number().int().positive(),
  personalNote: z.string().trim().max(1500).optional().default(""),
  watchedAt: z.union([z.literal(""), z.iso.date()]).optional().default(""),
  status: draftPublished.optional().default("draft"),
});

const manualMovieSchema = z.object({
  title: z.string().trim().min(1).max(300),
  originalTitle: z.string().trim().max(300).optional().default(""),
  overview: z.string().trim().max(5000).optional().default(""),
  posterPath: z.string().trim().max(300).optional().default(""),
  backdropPath: z.string().trim().max(300).optional().default(""),
  releaseDate: z.union([z.literal(""), z.iso.date()]).optional().default(""),
  runtimeMinutes: z.coerce.number().int().positive().optional(),
  genres: z.array(z.string().trim().max(60)).max(30).optional().default([]),
  tmdbId: z.coerce.number().int().positive().optional(),
  personalNote: z.string().trim().max(1500).optional().default(""),
  watchedAt: z.union([z.literal(""), z.iso.date()]).optional().default(""),
  status: draftPublished.optional().default("draft"),
});

/**
 * POST /api/agent/v1/movies — either `{ tmdbId }` (details fetched from TMDB)
 * or a full manual payload.
 */
export const agentCreateMovieSchema = z.union([tmdbIdOnlySchema, manualMovieSchema]);

/** PATCH /api/agent/v1/movies/[id] — agent-managed fields only. */
export const agentUpdateMovieSchema = z.object({
  personalNote: z.string().trim().max(1500).optional(),
  watchedAt: z.union([z.literal(""), z.iso.date(), z.null()]).optional(),
  status: draftPublished.optional(),
  title: z.string().trim().min(1).max(300).optional(),
  overview: z.string().trim().max(5000).optional(),
});

/** PATCH /api/agent/v1/guestbook/[id] */
export const agentGuestbookPatchSchema = z.object({
  status: z.enum(["visible", "hidden"]),
});

/** PATCH /api/agent/v1/messages/[id] */
export const agentMessagePatchSchema = z.object({
  operation: z.enum(["read", "unread", "archive", "restore"]),
});

/** PUT /api/agent/v1/profile — reuse the admin profile shape. */
export const agentProfileSchema = profileSchema;
