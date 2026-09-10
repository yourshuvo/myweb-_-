# Windows 98 Personal Blog

A small-web personal site with a Windows 98 desktop, a normal stacked mobile layout, Markdown updates, a photo log, and a private owner area. Public pages work without credentials and intentionally show empty states until the owner adds real content.

## What is implemented

- Accessible desktop icons, focus, minimize, close, Start menu, taskbar, and clock
- Mobile route navigation with no overlapping windows
- Once-per-session GSAP reveal and lifecycle motion, disabled for reduced motion
- Public updates, individual posts, photo log, about page, RSS, sitemap, robots, canonical and social metadata
- Neon Postgres schema and Drizzle migration for posts, media, media references, and the singleton profile
- Neon Auth proxy, handler, email/password login, `ADMIN_EMAIL` allowlist, and authorization inside every Server Action and upload/delete handler
- First-login profile onboarding and a Win98 command-center dashboard with content totals, recent activity, quick actions, service checks, and resume-draft access
- Hybrid post recovery with 500 ms browser backups, three-second Neon draft autosave, explicit published updates, reconnect retry, keyboard save, and optimistic conflict protection
- Markdown editing with safe shared preview, cursor-aware media insertion, writing statistics, post search/status filters, duplication, and confirmed version-safe deletion
- A retro adaptation of the extend-hq/21st file-uploader contract without the modern border-beam treatment
- Client-side 2400px / 3.7 MB image optimization and server-side type, byte-size, and dimension validation
- Server-only Hack Club CDN upload/delete, manual CDN URL entry, and protected deletion for referenced files
- Tagged public query caches with immediate invalidation after owner changes
- Public guestbook with optional names, text-only 500-character messages, newest-first pagination, and a home-screen preview
- Explicit Cloudflare Turnstile validation, a honeypot, and an atomic three-message-per-browser 24-hour limit
- Privacy-friendly signed visitor cookies and a six-digit guestbook-only visitor counter, with no raw IP storage
- Owner guestbook moderation with visible/hidden views and protected hide, restore, and permanent-delete actions
- Indexable Archive Explorer with real year/month folders, type filters, sortable file details, and desktop/mobile navigation
- Shareable photo-detail pages with canonical metadata, responsive Hack Club CDN images, and links back to dated archive folders
- Indexable Windows Explorer-style photo albums with reusable media, owner-defined ordering, cover fallbacks, album captions, and photo-detail backlinks
- Transactional album drafts and publishing in the owner area, including protected reordering, unpublishing, deletion, and media-reference safeguards
- Indexable Entertainment Pack routes for Music, Minesweeper, draw-one Klondike Solitaire, and My AI Chess
- Per-session Spotify consent with no autoplay, no iframe or third-party script before consent, and an external-link fallback
- First-click-safe Minesweeper with two difficulties, keyboard controls, local best times, and versioned browser persistence
- Klondike Solitaire with legal move validation, stock recycling, undo, double-click auto-move, keyboard access, local statistics, and saved progress
- My AI Chess with Stockfish 18 Lite running in a local WebAssembly worker, play-as-white/black controls, two strengths, full legal move validation, undo, local statistics, and saved progress
- A public privacy note covering the visitor cookie, local game data, Turnstile, Spotify, Neon submissions, and CDN images

## Local setup

1. Copy `.env.example` to `.env.local` and add values. Never commit this file.
2. Generate a cookie secret with at least 32 characters.
3. Apply the checked-in migration with `npm run db:migrate`.
4. Start with `npm run dev`.

Required names:

```dotenv
DATABASE_URL=
NEON_AUTH_BASE_URL=
NEON_AUTH_COOKIE_SECRET=
ADMIN_EMAIL=
HACKCLUB_CDN_API_KEY=
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_TURNSTILE_SITE_KEY=
TURNSTILE_SECRET_KEY=
GUESTBOOK_COOKIE_SECRET=
```

In Neon, enable Auth for the database, provision one email/password account, and set the same address as `ADMIN_EMAIL`. Registration has no public route, and a signed-in account still fails authorization unless its email matches.

Create the Hack Club CDN key from the CDN dashboard. The app sends it only from Node.js route handlers to `https://cdn.hackclub.com/api/v4/*`; it is never exposed to the client.

Create separate Cloudflare Turnstile widgets for local/preview and production hostnames. The guestbook intentionally stays read-only when the database, site key, secret key, or 32-character cookie secret is missing. Turnstile is rendered explicitly in the browser and every token is verified again on the server for the exact `guestbook` action and configured hostname.

## Vercel and Neon

The directory is linked to the Vercel project `windows98-personal-blog`. Before enabling the owner flow:

1. Accept the Neon Marketplace terms in Vercel and install the Neon integration.
2. Create/connect the Neon resource to this Vercel project and enable Neon Auth.
3. Pull the integration values locally with `vercel env pull .env.local`.
4. Add `NEON_AUTH_COOKIE_SECRET`, `ADMIN_EMAIL`, `HACKCLUB_CDN_API_KEY`, `NEXT_PUBLIC_SITE_URL`, the Turnstile keys, and `GUESTBOOK_COOKIE_SECRET` for Preview and Production.
5. Run `npm run db:migrate` against the connected database.
6. Deploy a preview, exercise sign in, onboarding, upload, draft, preview, and publish, then promote that tested deployment.

The public shell can deploy without secrets, but `/admin` remains intentionally unavailable until Neon Auth and the database are connected.

## Verification

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
npm run verify:browser
```

The browser verifier writes desktop and mobile screenshots for core public routes. Playwright covers Archive Explorer navigation, photo-album discovery, reduced motion, guestbook noindex behavior, machine-readable routes, desktop windows, Play routes, local game restoration, the browser Stockfish reply flow, Spotify consent gating, mobile overflow, missing-credential failure states, and anonymous owner redirects.

## Security notes

- Raw HTML is not enabled in Markdown.
- Links allow local paths, fragments, HTTPS, and email only.
- Managed inline images are restricted to Hack Club CDN URLs.
- The server rechecks the owner session for every write and every media request.
- The visitor cookie is signed, HttpOnly, SameSite=Lax, and expires after 365 days; rate-limit rows store only an HMAC hash.
- Guestbook messages are rendered as React text nodes, so submitted HTML is escaped rather than executed.
- Uploads stay below both the app's 3.9 MB handler cap and Vercel's 4.5 MB request-body limit.
- `better-auth`, `@better-auth/passkey`, and PostCSS are overridden to patched compatible releases while Neon Auth remains in beta.

## 21st component note

The authenticated 21st CLI located `extend-hq/file-upload` (component ID `15587`), but the account's retrieval quota was exhausted during implementation. The project includes a local, purpose-built retro uploader with the same required upload interaction and no copied locked source. When the quota resets, the original can be retrieved and compared without changing the server API.
