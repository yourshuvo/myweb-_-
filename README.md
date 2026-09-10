# 🪟 Windows 98 Personal Blog & Web Desktop

> **A nostalgic personal sanctuary on the small web.** An authentic Windows 98 desktop environment and blog platform built with Next.js 15, React 19, Tailwind CSS, Drizzle ORM, and local WebAssembly games.

<div align="center">

![Next.js 15](https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js)
![React 19](https://img.shields.io/badge/React-19-blue?style=for-the-badge&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-38B2AC?style=for-the-badge&logo=tailwind-css)
![Drizzle ORM](https://img.shields.io/badge/Drizzle-ORM-C5F74F?style=for-the-badge&logo=drizzle)
![Stockfish 18](https://img.shields.io/badge/Stockfish-WASM-orange?style=for-the-badge&logo=webassembly)

</div>

<p align="center">
  <img src="docs/screenshots/home-desktop.png" alt="Windows 98 Desktop Interface" width="100%" />
</p>

---

## 🌟 Overview

**Windows 98 Personal Blog** combines the retro charm of 90s computing with a modern, production-grade web stack. It's not just a theme—it's a fully functional personal OS in the browser, featuring draggable windows, a functioning taskbar and Start menu, built-in retro games powered by WebAssembly, a Markdown blogging system, a vintage guestbook, photo albums, and a secure private admin command center.

On desktop, visitors experience an authentic multi-window desktop interface. On mobile, the app automatically switches to an ergonomic, fast, stacked retro layout with zero window collisions.

---

## ✨ Features

### 🪟 Authentic Windows 98 Desktop Environment
- **Window Management**: Movable, focusable, minimizable, and maximizable retro windows with authentic 3D beveled borders.
- **Taskbar & Start Menu**: Dynamic active application tabs, system tray clock, and Start menu with quick-launch shortcuts.
- **Retro Aesthetic**: Authentic pixel fonts (`W95FA`), classic icons, teal tiled wallpaper, and retro UI controls.
- **Dual-Mode Responsive Design**: Switches seamlessly from a freeform multi-window desktop on desktop screens to an optimized stacked reading flow on mobile devices.
- **Motion & Accessibility**: GSAP-powered retro window lifecycle animations with strict respect for `prefers-reduced-motion`.

---

### 🕹️ Built-in Retro Entertainment Pack

| Game | Preview | Description |
| :--- | :--- | :--- |
| **My AI Chess** | <img src="docs/screenshots/play-chess.png" width="360" alt="Stockfish AI Chess" /> | Play White or Black against a real **Stockfish 18 Lite** chess engine running client-side inside a WebAssembly worker. Multiple difficulty levels, legal move validation, undo turn, and local game saving. |
| **Klondike Solitaire** | <img src="docs/screenshots/play-solitaire.png" width="360" alt="Klondike Solitaire" /> | Classic draw-one Solitaire with drag-and-drop, double-click auto-move to foundations, card recycling, move history undo, and score tracking. |
| **Minesweeper** | Classic 9x9 / 16x16 boards | Authentic Minesweeper featuring first-click-safe generation, flagging, digital timer, and local best-time records. |
| **Retro Media Player** | Retro Winamp-style player | Spotify embed with explicit per-session consent gating (no third-party tracking scripts loaded until granted). |

---

### 📝 Small-Web Content & Social Features

#### 🗂️ Archive Explorer & Photo Albums
Browse through published updates and photo logs using an authentic **Windows Explorer** tree-view interface organized by Year and Month.

<p align="center">
  <img src="docs/screenshots/archive.png" alt="Archive Explorer" width="85%" />
</p>

- **Photo Log & Albums**: Indexable albums with reusable media, owner captions, and responsive delivery via Hack Club CDN.
- **Markdown Updates**: Full-featured articles and life notes with syntax highlighting, writing statistics, reading time, and tags.
- **Syndication**: Auto-generated RSS feed (`/feed.xml`), `sitemap.xml`, `robots.txt`, and OpenGraph social preview cards.

#### 📖 Retro Guestbook & Anonymous Ask Box
- **Vintage Guestbook**: Allows visitors to leave public notes with customizable handles, displayed in an Internet Explorer styled window.
- **Anti-Spam Protection**: Cloudflare Turnstile bot verification combined with a hidden honeypot and a 3-message-per-24h rate limit per browser.
- **Privacy-First Visitor Tracking**: 6-digit retro visitor counter powered by signed, HttpOnly HMAC-hashed cookies (zero raw IPs stored).
- **Anonymous Q&A (`/ask`)**: Visitors can ask anonymous questions. The owner can publish responses with an auto-generated Instagram-story-style graphic generator.

<p align="center">
  <img src="docs/screenshots/guestbook.png" alt="Guestbook" width="85%" />
</p>

---

### 📱 Responsive Mobile Layout

When viewed on smaller screens or smartphones, the site transforms into a clean, lightweight stacked layout while preserving the nostalgic retro design:

<p align="center">
  <img src="docs/screenshots/home-mobile.png" alt="Mobile Stacked View" width="320" />
</p>

---

### 🛡️ Private Admin Command Center (`/admin`)

Behind a secure login lies a private dashboard designed for the site owner:
- **Authentication**: Powered by Neon Auth with strict `ADMIN_EMAIL` allowlist authorization on all Server Actions and route handlers.
- **Resilient Post Editor**: Real-time writing statistics, cursor-aware media insertions, and dual-layer draft recovery (500ms browser backup + 3-second Neon database autosave).
- **Media Library**: Upload and manage assets with client-side 2400px image optimization and direct Hack Club CDN integration.
- **Guestbook Moderation**: Review, hide, restore, or permanently remove guestbook submissions.

---

## 🛠️ Tech Stack

- **Framework**: [Next.js 15](https://nextjs.org/) (App Router, Server Components, Server Actions)
- **Runtime & Language**: Node.js 20+, [TypeScript 5](https://www.typescriptlang.org/)
- **UI Library**: [React 19](https://react.dev/), [Tailwind CSS 4](https://tailwindcss.com/)
- **Database**: [Neon Serverless Postgres](https://neon.tech/)
- **ORM & Migrations**: [Drizzle ORM](https://orm.drizzle.team/) & Drizzle Kit
- **Authentication**: [Neon Auth](https://neon.tech/docs/guides/auth) / `@neondatabase/auth`
- **Animations**: [GSAP](https://gsap.com/) & `@gsap/react`
- **WASM Chess Engine**: [Stockfish 18](https://stockfishchess.org/) compiled to WebAssembly
- **CDN & Media**: Hack Club CDN
- **Anti-Bot Security**: [Cloudflare Turnstile](https://www.cloudflare.com/products/turnstile/)
- **Testing**: [Vitest](https://vitest.dev/) (Unit/Integration) & [Playwright](https://playwright.dev/) (E2E)

---

## 🚀 Getting Started

### Prerequisites
- Node.js 20+ installed
- A Neon Postgres database (with Neon Auth enabled)
- A Cloudflare Turnstile account (free)
- A Hack Club CDN API key (for media hosting)

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/yourshuvo/myweb-_-.git
   cd myweb-_-
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment variables**:
   ```bash
   cp .env.example .env.local
   ```
   Fill in the required values in `.env.local`:

   ```env
   # Database & Auth
   DATABASE_URL=postgresql://user:pass@ep-xyz.neon.tech/dbname?sslmode=require
   NEON_AUTH_BASE_URL=https://ep-xyz.neon.tech/auth
   NEON_AUTH_COOKIE_SECRET=your-random-32-char-secret
   ADMIN_EMAIL=your-email@example.com

   # Media Hosting
   HACKCLUB_CDN_API_KEY=your-hackclub-cdn-key

   # Anti-Spam & Cookies
   NEXT_PUBLIC_TURNSTILE_SITE_KEY=your-turnstile-site-key
   TURNSTILE_SECRET_KEY=your-turnstile-secret-key
   GUESTBOOK_COOKIE_SECRET=your-random-32-char-secret

   # Site Configuration
   NEXT_PUBLIC_SITE_URL=http://localhost:3000
   ```

4. **Apply database migrations**:
   ```bash
   npm run db:migrate
   ```

5. **Start development server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) to view your Windows 98 desktop!

---

## 📜 Available Scripts

| Command | Action |
| :--- | :--- |
| `npm run dev` | Start the local Next.js development server |
| `npm run build` | Create an optimized production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint across code |
| `npm run typecheck` | Validate TypeScript types without emit |
| `npm test` | Run unit and component test suites via Vitest |
| `npm run test:e2e` | Run end-to-end browser tests via Playwright |
| `npm run db:migrate` | Apply Drizzle database migrations to Neon |
| `npm run db:generate` | Generate Drizzle migration files from schema |

---

## 🔒 Security & Privacy Practices

- **Zero IP Storage**: Visitor logs, rates, and counters use cryptographic HMAC signatures with rotating salt secrets; visitor IP addresses are never persisted.
- **Sanitized Markdown**: Strict HTML escaping and whitelist-only link protocols (`https:`, `mailto:`, relative paths).
- **Owner Verification**: Every Server Action and API handler verifies the active owner session independently.
- **Content Security**: Inline images are strictly restricted to trusted CDN origins.

---

## 📄 License & Credits

- **Font**: [W95FA](https://github.com/lucas-c/w95fa) licensed under SIL Open Font License.
- **Icons**: Classic Windows 98 retro icons.
- **Chess Engine**: [Stockfish 18](https://stockfishchess.org/) licensed under GNU GPLv3.

---

<div align="center">
  <sub>Built with nostalgic care for the small web.</sub>
</div>
