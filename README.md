# Windows 98 Personal Blog & Web Desktop

A nostalgic corner of the small web inspired by Windows 98. It features a functioning retro desktop environment, classic games running locally with WebAssembly, a Markdown blog, photo albums, and a guestbook—built with a modern stack including Next.js 15, React 19, Tailwind CSS, and Drizzle ORM.

<p align="center">
  <img src="docs/screenshots/home-desktop.png" alt="Windows 98 Desktop Interface" width="100%" />
</p>

---

## Why I Built This

I grew up during the era of dial-up tones, gray beveled window borders, pixelated icons, and personal homepages that felt distinct and quirky. The modern web is sleek and fast, but it often lacks that sense of individuality and playful personality that made early personal websites so memorable.

I wanted to build a digital space that felt like having your own vintage PC on the web. It's not just a retro skin or static screenshot:
- The desktop has movable, minimizable, and maximizable windows.
- The games run real logic right in your browser without tracking or bloat (including a full Stockfish chess engine compiled to WebAssembly).
- The blog and archives use an authentic Windows Explorer tree view.
- When visited on a phone, it gracefully switches to an ergonomic, responsive reading layout so it remains comfortable to read anywhere.

---

## Highlights & Features

### The Desktop Environment
- **Window Management**: Draggable, focusable, minimizable, and maximizable windows with classic 3D bevels and titlebars.
- **Taskbar & Start Menu**: Real-time clock in the system tray, active window indicators, and a Start menu with system shortcuts.
- **Responsive Dual Mode**: Multi-window desktop on laptops and monitors; clean, stacked retro layout on mobile devices.
- **Classic Styling**: Uses the authentic W95FA pixel font, retro icons, and the iconic teal desktop background.

---

### Built-in Games (The Entertainment Pack)

| Game | Preview | Description |
| :--- | :--- | :--- |
| **My AI Chess** | <img src="docs/screenshots/play-chess.png" width="340" alt="Stockfish AI Chess" /> | Play as White or Black against **Stockfish 18 Lite** running client-side in a WebAssembly worker. Includes difficulty levels, move validation, undo, and local persistence. |
| **Klondike Solitaire** | <img src="docs/screenshots/play-solitaire.png" width="340" alt="Klondike Solitaire" /> | Classic draw-one Solitaire with drag-and-drop, double-click auto-move, stock recycling, and undo history. |
| **Minesweeper** | Classic retro board | Authentic Minesweeper featuring first-click safe boards, timer, flagging, and personal best records. |
| **Retro Media Player** | Retro media player | Spotify player with explicit per-session consent (no third-party tracking scripts loaded without permission). |

---

### Blog, Photos & Guestbook

<p align="center">
  <img src="docs/screenshots/archive.png" alt="Archive Explorer" width="85%" />
</p>

- **Archive Explorer**: Navigate through past updates and photo logs using a Windows Explorer directory tree organized by Year and Month.
- **Photo Albums**: Shareable galleries with responsive image delivery powered by Hack Club CDN.
- **Markdown Notes**: Life updates with writing stats, reading estimates, and clean retro formatting.
- **Retro Guestbook**: An Internet Explorer styled guestbook where visitors can leave a note. Protected against bots using Cloudflare Turnstile and signed HMAC visitor cookies with zero IP logging.
- **Anonymous Q&A**: Ask-me-anything portal with a generator that formats answered questions into story-ready images.

<p align="center">
  <img src="docs/screenshots/guestbook.png" alt="Guestbook" width="85%" />
</p>

---

### Mobile Layout

On smaller screens, the window manager gives way to a clean stacked view:

<p align="center">
  <img src="docs/screenshots/home-mobile.png" alt="Mobile Stacked View" width="300" />
</p>

---

### Owner Dashboard (`/admin`)

For managing the site:
- **Authentication**: Neon Auth with strict `ADMIN_EMAIL` allowlisting.
- **Draft Recovery**: Continuous 500ms browser backup combined with 3-second database autosave so writing is never lost.
- **Media Manager**: Client-side image compression (2400px / 3.7MB) before direct upload to Hack Club CDN.
- **Guestbook Moderation**: Moderate, hide, restore, or remove visitor entries.

---

## Tech Stack

- **Framework**: Next.js 15 (App Router, Server Actions, Server Components)
- **Frontend**: React 19, Tailwind CSS 4, Lucide & Hugeicons
- **Database**: Neon Serverless Postgres
- **ORM**: Drizzle ORM
- **Authentication**: Neon Auth (`@neondatabase/auth`)
- **Chess Engine**: Stockfish 18 Lite (WebAssembly)
- **Media Hosting**: Hack Club CDN
- **Anti-bot Protection**: Cloudflare Turnstile
- **Testing**: Vitest & Playwright

---

## Getting Started

### Prerequisites
- Node.js 20+
- A Neon Postgres database with Neon Auth enabled
- Cloudflare Turnstile keys (free)
- Hack Club CDN API key (for photo uploads)

### Local Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourshuvo/myweb-_-.git
   cd myweb-_-
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   ```bash
   cp .env.example .env.local
   ```
   Add your keys to `.env.local`:
   ```env
   DATABASE_URL=postgresql://user:password@ep-xyz.neon.tech/dbname?sslmode=require
   NEON_AUTH_BASE_URL=https://ep-xyz.neon.tech/auth
   NEON_AUTH_COOKIE_SECRET=your-random-32-char-secret
   ADMIN_EMAIL=your-email@example.com

   HACKCLUB_CDN_API_KEY=your-key
   NEXT_PUBLIC_TURNSTILE_SITE_KEY=your-site-key
   TURNSTILE_SECRET_KEY=your-secret-key
   GUESTBOOK_COOKIE_SECRET=your-random-32-char-secret
   NEXT_PUBLIC_SITE_URL=http://localhost:3000
   ```

4. Push the database schema:
   ```bash
   npm run db:migrate
   ```

5. Run the dev server:
   ```bash
   npm run dev
   ```
   Visit [http://localhost:3000](http://localhost:3000).

---

## Useful Scripts

- `npm run dev`: Starts local development server
- `npm run build`: Production build
- `npm run lint`: Code linting
- `npm run typecheck`: TypeScript verification
- `npm test`: Run unit tests with Vitest
- `npm run test:e2e`: Run Playwright end-to-end tests

---

## Privacy & Security

- **No IP Logging**: Visitor counts and rate limits use salted HMAC signatures; no raw IP addresses are ever saved.
- **Sanitized Markdown**: Strict HTML escaping with whitelisted URL schemes (`https:`, `mailto:`, relative paths).
- **Session Protection**: Every Server Action and API endpoint verifies the owner's session independently.

---

## Credits

- **Font**: [W95FA](https://github.com/lucas-c/w95fa) under SIL Open Font License.
- **Stockfish Engine**: [Stockfish 18](https://stockfishchess.org/) under GPLv3.
- Windows 98 icons and visual styling inspired by classic Microsoft Windows 98 design.

---

Made by [Shuvo](https://github.com/yourshuvo) for the small web.
