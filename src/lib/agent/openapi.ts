import { AGENT_API_VERSION } from "@/lib/agent/status";

/**
 * Hand-written OpenAPI 3.1 description of the agent-control API.
 * Kept in sync with the routes under src/app/api/agent/v1 by hand —
 * update this file whenever an endpoint is added or changed.
 */

const SECURITY = [{ bearerAuth: [] }, { agentKeyHeader: [] }];

const PAGINATION_PARAMS = [
  {
    name: "limit",
    in: "query",
    required: true,
    description: "Required (1-100); omitting it returns 400.",
    schema: { type: "integer", minimum: 1, maximum: 100 },
  },
  { name: "offset", in: "query", schema: { type: "integer", minimum: 0, default: 0 } },
];

const ERROR_RESPONSES = {
  "400": { description: "Validation failed.", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
  "401": { description: "Missing, invalid, or unconfigured API key.", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
  "404": { description: "Not found.", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
  "409": { description: "Conflict (optimistic-concurrency mismatch, duplicate slug, or referenced media).", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
  "500": { description: "Server error.", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
  "503": { description: "Required service (database, TMDB, uploads) is not configured.", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
};

export const agentOpenApiSpec = {
  openapi: "3.1.0",
  info: {
    title: "Agent Control API",
    version: AGENT_API_VERSION,
    description:
      "Full agent control over the site: blog posts, photo albums, media library, guestbook, anonymous messages, movie recommendations, site profile, and health/activity reads. Every response carries `Cache-Control: private, no-store`. Mutating endpoints invalidate the same Next.js cache tags as the admin dashboard, so the public site updates immediately.",
  },
  security: SECURITY,
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        description: "Send `Authorization: Bearer <AGENT_API_KEY>`. Compared in constant time; never logged.",
      },
      agentKeyHeader: {
        type: "apiKey",
        in: "header",
        name: "X-Agent-Key",
        description: "Alternative to the bearer token: send the raw key as the `X-Agent-Key` header.",
      },
    },
    schemas: {
      Error: { type: "object", required: ["error"], properties: { error: { type: "string" } } },
      Post: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          title: { type: "string" },
          slug: { type: "string" },
          excerpt: { type: "string" },
          body: { type: "string", description: "Markdown body." },
          status: { type: "string", enum: ["draft", "published"] },
          coverMediaId: { type: ["string", "null"], format: "uuid" },
          thumbnailMediaId: { type: ["string", "null"], format: "uuid" },
          publishedAt: { type: ["string", "null"], format: "date-time" },
          version: { type: "integer", description: "Optimistic-concurrency token for PATCH." },
        },
      },
      Album: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          title: { type: "string" },
          slug: { type: "string" },
          introduction: { type: "string" },
          status: { type: "string", enum: ["draft", "published"] },
          coverMediaId: { type: ["string", "null"], format: "uuid" },
        },
      },
      MediaAsset: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          filename: { type: "string" },
          url: { type: "string", format: "uri" },
          contentType: { type: "string" },
          sizeBytes: { type: "integer" },
          width: { type: ["integer", "null"] },
          height: { type: ["integer", "null"] },
          showInPhotoLog: { type: "boolean" },
        },
      },
      GuestbookEntry: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          displayName: { type: ["string", "null"] },
          message: { type: "string" },
          status: { type: "string", enum: ["visible", "hidden"] },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      AnonymousMessage: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          message: { type: "string" },
          status: { type: "string", enum: ["unread", "read", "archived"] },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      MovieRecommendation: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          tmdbId: { type: ["integer", "null"] },
          title: { type: "string" },
          overview: { type: "string" },
          posterPath: { type: "string" },
          releaseDate: { type: ["string", "null"] },
          personalNote: { type: "string" },
          watchedAt: { type: ["string", "null"] },
          status: { type: "string", enum: ["draft", "published"] },
        },
      },
      SiteProfile: {
        type: "object",
        properties: {
          displayName: { type: "string" },
          siteTitle: { type: "string" },
          biography: { type: "string" },
          avatarMediaId: { type: ["string", "null"], format: "uuid", description: "Upload via POST /media first, then reference here." },
          contactEmail: { type: "string" },
          socialLinks: { type: "object", properties: { website: { type: "string" }, github: { type: "string" }, instagram: { type: "string" }, mastodon: { type: "string" } } },
          spotifyPlaylistTitle: { type: "string" },
          spotifyPlaylistUrl: { type: "string" },
        },
      },
      ActivityItem: {
        type: "object",
        properties: {
          type: { type: "string", enum: ["post", "media", "album", "movie", "guestbook", "message"] },
          id: { type: "string" },
          label: { type: "string" },
          detail: { type: "string" },
          date: { type: "string", format: "date-time" },
        },
      },
    },
  },
  paths: {
    "/api/agent/v1/status": {
      get: {
        operationId: "getStatus",
        summary: "Health snapshot",
        description: "Version, config flags, per-table counts, visitor total, and the admin dashboard service checks.",
        responses: {
          "200": {
            description: "Status snapshot.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    ok: { type: "boolean" },
                    version: { type: "string" },
                    time: { type: "string", format: "date-time" },
                    dbConfigured: { type: "boolean" },
                    tmdbConfigured: { type: "boolean" },
                    services: {
                      type: "object",
                      properties: {
                        auth: { type: "boolean" },
                        uploads: { type: "boolean" },
                        tmdb: { type: "boolean" },
                        visitorTracking: { type: "boolean" },
                      },
                    },
                    counts: { type: "object", additionalProperties: { type: ["integer", "null"] } },
                    visitorTotal: { type: ["integer", "null"] },
                  },
                },
              },
            },
          },
          "401": ERROR_RESPONSES["401"],
          "500": ERROR_RESPONSES["500"],
        },
      },
    },
    "/api/agent/v1/activity": {
      get: {
        operationId: "getActivity",
        summary: "Recent activity feed",
        description: "Latest activity across posts, media, albums, movies, guestbook, and messages, newest first (mirrors the admin dashboard).",
        parameters: [{ name: "limit", in: "query", required: true, description: "Required (1-50); omitting it returns 400.", schema: { type: "integer", minimum: 1, maximum: 50 } }],
        responses: {
          "200": {
            description: "Activity items.",
            content: { "application/json": { schema: { type: "object", properties: { activity: { type: "array", items: { $ref: "#/components/schemas/ActivityItem" } } } } } },
          },
          "400": ERROR_RESPONSES["400"],
          "401": ERROR_RESPONSES["401"],
          "503": ERROR_RESPONSES["503"],
        },
      },
    },
    "/api/agent/v1/openapi.json": {
      get: {
        operationId: "getOpenApi",
        summary: "This OpenAPI document",
        responses: {
          "200": { description: "The machine-readable API description." },
          "401": ERROR_RESPONSES["401"],
        },
      },
    },
    "/api/agent/v1/posts": {
      get: {
        operationId: "listPosts",
        summary: "List blog posts",
        parameters: [
          { name: "status", in: "query", schema: { type: "string", enum: ["draft", "published"] } },
          ...PAGINATION_PARAMS,
        ],
        responses: {
          "200": { description: "Posts, newest first.", content: { "application/json": { schema: { type: "object", properties: { posts: { type: "array", items: { $ref: "#/components/schemas/Post" } } } } } } },
          "400": ERROR_RESPONSES["400"],
          "401": ERROR_RESPONSES["401"],
          "503": ERROR_RESPONSES["503"],
        },
      },
      post: {
        operationId: "createPost",
        summary: "Create a blog post",
        description: "publishedAt defaults to now when status is published. CDN images referenced in the body are re-linked.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["title", "slug", "status"],
                properties: {
                  title: { type: "string", maxLength: 180 },
                  slug: { type: "string", pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$" },
                  excerpt: { type: "string", maxLength: 320 },
                  body: { type: "string", maxLength: 100000 },
                  status: { type: "string", enum: ["draft", "published"] },
                  coverMediaId: { type: "string", format: "uuid" },
                  thumbnailMediaId: { type: "string", format: "uuid" },
                  publishedAt: { type: "string", format: "date-time" },
                },
              },
            },
          },
        },
        responses: {
          "201": { description: "Created.", content: { "application/json": { schema: { type: "object", properties: { post: { $ref: "#/components/schemas/Post" } } } } } } ,
          "400": ERROR_RESPONSES["400"],
          "401": ERROR_RESPONSES["401"],
          "409": ERROR_RESPONSES["409"],
          "503": ERROR_RESPONSES["503"],
        },
      },
    },
    "/api/agent/v1/posts/{id}": {
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
      get: {
        operationId: "getPost",
        summary: "Get a blog post",
        responses: {
          "200": { description: "The post.", content: { "application/json": { schema: { type: "object", properties: { post: { $ref: "#/components/schemas/Post" } } } } } } ,
          "401": ERROR_RESPONSES["401"],
          "404": ERROR_RESPONSES["404"],
          "503": ERROR_RESPONSES["503"],
        },
      },
      patch: {
        operationId: "updatePost",
        summary: "Update a blog post",
        description: "Partial update. Pass `version` for optimistic concurrency — 409 when it no longer matches.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  slug: { type: "string" },
                  excerpt: { type: "string" },
                  body: { type: "string" },
                  status: { type: "string", enum: ["draft", "published"] },
                  coverMediaId: { type: "string", format: "uuid" },
                  thumbnailMediaId: { type: "string", format: "uuid" },
                  publishedAt: { type: "string", format: "date-time" },
                  version: { type: "integer", description: "Must match the post's current version." },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Updated.", content: { "application/json": { schema: { type: "object", properties: { post: { $ref: "#/components/schemas/Post" } } } } } },
          "400": ERROR_RESPONSES["400"],
          "401": ERROR_RESPONSES["401"],
          "404": ERROR_RESPONSES["404"],
          "409": ERROR_RESPONSES["409"],
          "503": ERROR_RESPONSES["503"],
        },
      },
      delete: {
        operationId: "deletePost",
        summary: "Delete a blog post",
        responses: {
          "200": { description: "Deleted." },
          "401": ERROR_RESPONSES["401"],
          "404": ERROR_RESPONSES["404"],
          "503": ERROR_RESPONSES["503"],
        },
      },
    },
    "/api/agent/v1/posts/{id}/duplicate": {
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
      post: {
        operationId: "duplicatePost",
        summary: "Duplicate a post as a new draft",
        description: "Transactional copy with a uniquified slug, 'Copy of' title, and copied cover/thumbnail/media references.",
        responses: {
          "201": { description: "The new draft.", content: { "application/json": { schema: { type: "object", properties: { post: { $ref: "#/components/schemas/Post" } } } } } } ,
          "401": ERROR_RESPONSES["401"],
          "404": ERROR_RESPONSES["404"],
          "503": ERROR_RESPONSES["503"],
        },
      },
    },
    "/api/agent/v1/albums": {
      get: {
        operationId: "listAlbums",
        summary: "List photo albums",
        parameters: [
          { name: "status", in: "query", schema: { type: "string", enum: ["draft", "published"] } },
          ...PAGINATION_PARAMS,
        ],
        responses: {
          "200": { description: "Albums.", content: { "application/json": { schema: { type: "object", properties: { albums: { type: "array", items: { $ref: "#/components/schemas/Album" } } } } } } },
          "400": ERROR_RESPONSES["400"],
          "401": ERROR_RESPONSES["401"],
          "503": ERROR_RESPONSES["503"],
        },
      },
      post: {
        operationId: "createAlbum",
        summary: "Create a photo album",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["title", "slug", "introduction", "status", "coverMediaId", "items"],
                properties: {
                  title: { type: "string", maxLength: 120 },
                  slug: { type: "string", pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$" },
                  introduction: { type: "string", maxLength: 2000 },
                  status: { type: "string", enum: ["draft", "published"] },
                  coverMediaId: { type: "string", description: "UUID of a media asset, or empty string. Must be one of the items." },
                  items: {
                    type: "array",
                    maxItems: 250,
                    items: { type: "object", required: ["mediaId"], properties: { mediaId: { type: "string", format: "uuid" }, caption: { type: "string", maxLength: 500 } } },
                  },
                },
              },
            },
          },
        },
        responses: {
          "201": { description: "Created.", content: { "application/json": { schema: { type: "object", properties: { album: { $ref: "#/components/schemas/Album" } } } } } } ,
          "400": ERROR_RESPONSES["400"],
          "401": ERROR_RESPONSES["401"],
          "503": ERROR_RESPONSES["503"],
        },
      },
    },
    "/api/agent/v1/albums/{id}": {
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
      get: {
        operationId: "getAlbum",
        summary: "Get a photo album with its items",
        responses: {
          "200": { description: "The album.", content: { "application/json": { schema: { type: "object" } } } },
          "401": ERROR_RESPONSES["401"],
          "404": ERROR_RESPONSES["404"],
          "503": ERROR_RESPONSES["503"],
        },
      },
      patch: {
        operationId: "updateAlbum",
        summary: "Update a photo album",
        description: "Partial update; `items` replaces the whole photo list when present.",
        requestBody: { required: true, content: { "application/json": { schema: { type: "object" } } } },
        responses: {
          "200": { description: "Updated." },
          "400": ERROR_RESPONSES["400"],
          "401": ERROR_RESPONSES["401"],
          "404": ERROR_RESPONSES["404"],
          "503": ERROR_RESPONSES["503"],
        },
      },
      delete: {
        operationId: "deleteAlbum",
        summary: "Delete a photo album",
        responses: {
          "200": { description: "Deleted." },
          "401": ERROR_RESPONSES["401"],
          "404": ERROR_RESPONSES["404"],
          "503": ERROR_RESPONSES["503"],
        },
      },
    },
    "/api/agent/v1/media": {
      get: {
        operationId: "listMedia",
        summary: "List media library assets",
        parameters: [
          ...PAGINATION_PARAMS,
          { name: "showInPhotoLog", in: "query", schema: { type: "string", enum: ["true", "false"] } },
        ],
        responses: {
          "200": { description: "Assets, newest first.", content: { "application/json": { schema: { type: "object", properties: { media: { type: "array", items: { $ref: "#/components/schemas/MediaAsset" } } } } } } },
          "400": ERROR_RESPONSES["400"],
          "401": ERROR_RESPONSES["401"],
          "503": ERROR_RESPONSES["503"],
        },
      },
      post: {
        operationId: "uploadMedia",
        summary: "Upload or register media",
        description: "Multipart `file` upload (JPEG/PNG/WebP, max ~3.9MB, via Hack Club CDN) or a JSON body registering an existing CDN URL.",
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": { schema: { type: "object", properties: { file: { type: "string", format: "binary" } } } },
            "application/json": { schema: { type: "object", properties: { url: { type: "string", format: "uri" } } } },
          },
        },
        responses: {
          "201": { description: "Registered.", content: { "application/json": { schema: { type: "object", properties: { media: { $ref: "#/components/schemas/MediaAsset" } } } } } } ,
          "400": ERROR_RESPONSES["400"],
          "401": ERROR_RESPONSES["401"],
          "503": ERROR_RESPONSES["503"],
        },
      },
    },
    "/api/agent/v1/media/{id}": {
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
      get: {
        operationId: "getMedia",
        summary: "Get a media asset",
        responses: {
          "200": { description: "The asset.", content: { "application/json": { schema: { type: "object", properties: { media: { $ref: "#/components/schemas/MediaAsset" } } } } } } ,
          "401": ERROR_RESPONSES["401"],
          "404": ERROR_RESPONSES["404"],
          "503": ERROR_RESPONSES["503"],
        },
      },
      delete: {
        operationId: "deleteMedia",
        summary: "Delete a media asset",
        description: "409 while the asset is referenced by posts, albums, or the profile. `?mode=local-only` deletes just the local record.",
        parameters: [{ name: "mode", in: "query", schema: { type: "string", enum: ["local-only"] } }],
        responses: {
          "200": { description: "Deleted." },
          "401": ERROR_RESPONSES["401"],
          "404": ERROR_RESPONSES["404"],
          "409": ERROR_RESPONSES["409"],
          "503": ERROR_RESPONSES["503"],
        },
      },
    },
    "/api/agent/v1/guestbook": {
      get: {
        operationId: "listGuestbookEntries",
        summary: "List guestbook entries",
        parameters: [
          { name: "status", in: "query", schema: { type: "string", enum: ["visible", "hidden"] } },
          ...PAGINATION_PARAMS,
        ],
        responses: {
          "200": { description: "Entries.", content: { "application/json": { schema: { type: "object", properties: { entries: { type: "array", items: { $ref: "#/components/schemas/GuestbookEntry" } } } } } } },
          "400": ERROR_RESPONSES["400"],
          "401": ERROR_RESPONSES["401"],
          "503": ERROR_RESPONSES["503"],
        },
      },
    },
    "/api/agent/v1/guestbook/{id}": {
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
      patch: {
        operationId: "moderateGuestbookEntry",
        summary: "Show or hide a guestbook entry",
        requestBody: {
          required: true,
          content: { "application/json": { schema: { type: "object", required: ["status"], properties: { status: { type: "string", enum: ["visible", "hidden"] } } } } },
        },
        responses: {
          "200": { description: "Updated." },
          "400": ERROR_RESPONSES["400"],
          "401": ERROR_RESPONSES["401"],
          "404": ERROR_RESPONSES["404"],
          "503": ERROR_RESPONSES["503"],
        },
      },
      delete: {
        operationId: "deleteGuestbookEntry",
        summary: "Delete a guestbook entry",
        responses: {
          "200": { description: "Deleted." },
          "401": ERROR_RESPONSES["401"],
          "404": ERROR_RESPONSES["404"],
          "503": ERROR_RESPONSES["503"],
        },
      },
    },
    "/api/agent/v1/messages": {
      get: {
        operationId: "listMessages",
        summary: "List anonymous messages (ask inbox)",
        parameters: [
          { name: "status", in: "query", schema: { type: "string", enum: ["unread", "read", "archived"] } },
          ...PAGINATION_PARAMS,
        ],
        responses: {
          "200": { description: "Messages.", content: { "application/json": { schema: { type: "object", properties: { messages: { type: "array", items: { $ref: "#/components/schemas/AnonymousMessage" } } } } } } },
          "400": ERROR_RESPONSES["400"],
          "401": ERROR_RESPONSES["401"],
          "503": ERROR_RESPONSES["503"],
        },
      },
    },
    "/api/agent/v1/messages/{id}": {
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
      patch: {
        operationId: "updateMessage",
        summary: "Change a message's state",
        requestBody: {
          required: true,
          content: { "application/json": { schema: { type: "object", required: ["operation"], properties: { operation: { type: "string", enum: ["read", "unread", "archive", "restore"] } } } } },
        },
        responses: {
          "200": { description: "Updated." },
          "400": ERROR_RESPONSES["400"],
          "401": ERROR_RESPONSES["401"],
          "404": ERROR_RESPONSES["404"],
          "503": ERROR_RESPONSES["503"],
        },
      },
      delete: {
        operationId: "deleteMessage",
        summary: "Delete an anonymous message",
        responses: {
          "200": { description: "Deleted." },
          "401": ERROR_RESPONSES["401"],
          "404": ERROR_RESPONSES["404"],
          "503": ERROR_RESPONSES["503"],
        },
      },
    },
    "/api/agent/v1/messages/{id}/story": {
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
      get: {
        operationId: "renderMessageStory",
        summary: "Render the Windows 98 story-card PNG for a message",
        description: "1080×1920 PNG, byte-identical to the admin dashboard story image.",
        responses: {
          "200": { description: "The PNG image.", content: { "image/png": { schema: { type: "string", format: "binary" } } } },
          "401": ERROR_RESPONSES["401"],
          "404": ERROR_RESPONSES["404"],
          "503": ERROR_RESPONSES["503"],
        },
      },
    },
    "/api/agent/v1/movies": {
      get: {
        operationId: "listMovies",
        summary: "List movie recommendations",
        parameters: [
          { name: "status", in: "query", schema: { type: "string", enum: ["draft", "published"] } },
          ...PAGINATION_PARAMS,
        ],
        responses: {
          "200": { description: "Recommendations.", content: { "application/json": { schema: { type: "object", properties: { movies: { type: "array", items: { $ref: "#/components/schemas/MovieRecommendation" } } } } } } },
          "400": ERROR_RESPONSES["400"],
          "401": ERROR_RESPONSES["401"],
          "503": ERROR_RESPONSES["503"],
        },
      },
      post: {
        operationId: "createMovie",
        summary: "Add a movie recommendation",
        description: "Either `{ tmdbId }` (details fetched from TMDB) or a full manual payload.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  tmdbId: { type: "integer" },
                  title: { type: "string", maxLength: 300 },
                  originalTitle: { type: "string" },
                  overview: { type: "string", maxLength: 5000 },
                  posterPath: { type: "string" },
                  backdropPath: { type: "string" },
                  releaseDate: { type: "string", format: "date" },
                  runtimeMinutes: { type: "integer" },
                  genres: { type: "array", items: { type: "string" }, maxItems: 30 },
                  personalNote: { type: "string", maxLength: 1500 },
                  watchedAt: { type: "string", format: "date" },
                  status: { type: "string", enum: ["draft", "published"] },
                },
              },
            },
          },
        },
        responses: {
          "201": { description: "Created.", content: { "application/json": { schema: { type: "object", properties: { movie: { $ref: "#/components/schemas/MovieRecommendation" } } } } } } ,
          "400": ERROR_RESPONSES["400"],
          "401": ERROR_RESPONSES["401"],
          "502": { description: "TMDB lookup failed." },
          "503": ERROR_RESPONSES["503"],
        },
      },
    },
    "/api/agent/v1/movies/search": {
      get: {
        operationId: "searchMovies",
        summary: "Search TMDB for movies",
        parameters: [{ name: "q", in: "query", required: true, schema: { type: "string", minLength: 2 } }],
        responses: {
          "200": { description: "TMDB results.", content: { "application/json": { schema: { type: "object", properties: { results: { type: "array", items: { type: "object" } } } } } } } ,
          "400": ERROR_RESPONSES["400"],
          "401": ERROR_RESPONSES["401"],
          "502": { description: "TMDB request failed." },
          "503": ERROR_RESPONSES["503"],
        },
      },
    },
    "/api/agent/v1/movies/{id}": {
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
      get: {
        operationId: "getMovie",
        summary: "Get a movie recommendation",
        responses: {
          "200": { description: "The recommendation.", content: { "application/json": { schema: { type: "object", properties: { movie: { $ref: "#/components/schemas/MovieRecommendation" } } } } } }  ,
          "401": ERROR_RESPONSES["401"],
          "404": ERROR_RESPONSES["404"],
          "503": ERROR_RESPONSES["503"],
        },
      },
      patch: {
        operationId: "updateMovie",
        summary: "Update a movie recommendation",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  title: { type: "string", maxLength: 300 },
                  overview: { type: "string", maxLength: 5000 },
                  personalNote: { type: "string", maxLength: 1500 },
                  watchedAt: { type: "string", format: "date" },
                  status: { type: "string", enum: ["draft", "published"] },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Updated." },
          "400": ERROR_RESPONSES["400"],
          "401": ERROR_RESPONSES["401"],
          "404": ERROR_RESPONSES["404"],
          "503": ERROR_RESPONSES["503"],
        },
      },
      delete: {
        operationId: "deleteMovie",
        summary: "Delete a movie recommendation",
        responses: {
          "200": { description: "Deleted." },
          "401": ERROR_RESPONSES["401"],
          "404": ERROR_RESPONSES["404"],
          "503": ERROR_RESPONSES["503"],
        },
      },
    },
    "/api/agent/v1/profile": {
      get: {
        operationId: "getProfile",
        summary: "Get the site profile",
        responses: {
          "200": { description: "The profile.", content: { "application/json": { schema: { type: "object", properties: { profile: { $ref: "#/components/schemas/SiteProfile" } } } } } } ,
          "401": ERROR_RESPONSES["401"],
          "503": ERROR_RESPONSES["503"],
        },
      },
      put: {
        operationId: "updateProfile",
        summary: "Replace the site profile",
        description: "Full replacement (upsert). `onboardedAt` is set only on first creation.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  displayName: { type: "string" },
                  siteTitle: { type: "string" },
                  biography: { type: "string" },
                  avatarMediaId: { type: "string", format: "uuid" },
                  contactEmail: { type: "string" },
                  website: { type: "string" },
                  github: { type: "string" },
                  instagram: { type: "string" },
                  mastodon: { type: "string" },
                  spotifyPlaylistTitle: { type: "string" },
                  spotifyPlaylistUrl: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Saved.", content: { "application/json": { schema: { type: "object", properties: { profile: { $ref: "#/components/schemas/SiteProfile" } } } } } } ,
          "400": ERROR_RESPONSES["400"],
          "401": ERROR_RESPONSES["401"],
          "503": ERROR_RESPONSES["503"],
        },
      },
    },
  },
} as const;

export type AgentOpenApiSpec = typeof agentOpenApiSpec;
