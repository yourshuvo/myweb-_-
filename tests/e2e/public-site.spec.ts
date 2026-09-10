import { expect, test } from "@playwright/test";

test("public desktop shell supports authentic route-window controls", async ({ page }, testInfo) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/corner of the internet/i);
  await expect(page.locator(".win98-desktop")).toBeVisible();
  await expect(page.getByRole("region", { name: "Welcome.txt" })).toBeVisible();
  await expect(page.locator(".retro-titlebar")).toHaveCSS("height", "18px");
  await expect(page.locator(".taskbar")).toHaveCSS("height", "28px");
  if (testInfo.project.name.startsWith("desktop")) {
    const desktop = page.getByRole("navigation", { name: "Desktop shortcuts" });
    const photosShortcut = desktop.getByRole("button", { name: "Photos" });
    await photosShortcut.click();
    await expect(page).toHaveURL("/");
    await expect(photosShortcut).toHaveAttribute("aria-pressed", "true");
    await photosShortcut.dblclick();
    await expect(page).toHaveURL(/\/photos$/);
    const photosWindow = page.getByRole("region", { name: "My Pictures - Windows Explorer" });
    await expect(photosWindow).toBeVisible();
    await page.getByRole("button", { name: "Minimize My Pictures - Windows Explorer" }).click();
    await expect(photosWindow).toBeHidden();
    await page.getByRole("button", { name: "My Pictures - Windows Explorer", exact: true }).click();
    await expect(photosWindow).toBeVisible();
    await page.getByRole("button", { name: "Close My Pictures - Windows Explorer" }).click();
    await expect(page).toHaveURL("/");

    const archiveShortcut = desktop.getByRole("button", { name: "Archive" });
    await archiveShortcut.focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/archive$/);
    await expect(page.getByRole("region", { name: "Archive Explorer" })).toBeVisible();
  } else {
    await expect(page.getByRole("navigation", { name: "Desktop shortcuts" })).toBeHidden();
    await expect(page.locator(".retro-titlebar__controls")).toBeHidden();
    await page.getByRole("button", { name: "Start" }).click();
    await expect(page.getByRole("menuitem", { name: "Guestbook" })).toBeVisible();
    await expect(page.getByRole("menuitem", { name: "Chess" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("menu")).toBeHidden();
  }
});

test("Start menu is keyboard navigable", async ({ page }) => {
  await page.goto("/");
  const start = page.getByRole("button", { name: "Start" });
  await start.click();
  await expect(page.getByRole("menuitem", { name: /Home/ })).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("menuitem", { name: "Updates" })).toBeFocused();
  await page.keyboard.press("End");
  await expect(page.getByRole("menuitem", { name: "Owner sign in" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(start).toBeFocused();
});

test("public routes and machine-readable files respond", async ({ page, request }) => {
  for (const path of ["/updates", "/photos", "/photos/albums", "/archive", "/movies", "/about", "/guestbook", "/ask", "/play", "/play/music", "/play/minesweeper", "/play/solitaire", "/play/chess", "/privacy"]) {
    const response = await page.goto(path);
    expect(response?.ok()).toBeTruthy();
  }
  for (const path of ["/feed.xml", "/sitemap.xml", "/robots.txt"]) {
    const response = await request.get(path);
    expect(response.ok()).toBeTruthy();
  }
});

test("movie suggestions are indexable and use the Win98 library shell", async ({ page, request }) => {
  await page.goto("/movies");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/movies$/);
  await expect(page.getByRole("region", { name: "Movie Suggestions - Windows Explorer" })).toBeVisible();
  await expect(page.getByText("This product uses the TMDB API but is not endorsed or certified by TMDB.")).toBeVisible();
  const sitemap = await (await request.get("/sitemap.xml")).text();
  expect(sitemap).toContain("/movies");
});

test("photo albums directory is indexable and linked from the camera roll", async ({ page, request }) => {
  await page.goto("/photos");
  await expect(page.getByRole("navigation", { name: "Folder views" }).getByRole("link", { name: "Albums" })).toBeVisible();
  await page.getByRole("navigation", { name: "Folder views" }).getByRole("link", { name: "Albums" }).click();
  await expect(page).toHaveURL(/\/photos\/albums$/);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/photos\/albums$/);
  await expect(page.getByRole("heading", { name: "Albums", exact: true })).toBeVisible();

  const sitemap = await (await request.get("/sitemap.xml")).text();
  const feed = await (await request.get("/feed.xml")).text();
  expect(sitemap).toContain("/photos/albums");
  expect(feed).not.toContain("/photos/albums");
});

test("entertainment routes have canonical metadata and sitemap entries", async ({ page, request }) => {
  for (const path of ["/play", "/play/music", "/play/minesweeper", "/play/solitaire", "/play/chess"]) {
    await page.goto(path);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", new RegExp(`${path}$`));
  }
  const sitemap = await (await request.get("/sitemap.xml")).text();
  for (const path of ["/play", "/play/music", "/play/minesweeper", "/play/solitaire", "/play/chess"]) expect(sitemap).toContain(path);
  await page.goto("/play");
  await expect(page.getByRole("link", { name: /Minesweeper/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /Solitaire/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /My AI Chess/i })).toBeVisible();
  await page.getByRole("button", { name: "Start" }).click();
  await expect(page.getByRole("menuitem", { name: "Privacy" })).toBeVisible();
});

test("My AI Chess loads Stockfish and saves the reply locally", async ({ page }) => {
  test.setTimeout(45_000);
  await page.goto("/play/chess");
  await expect(page.getByText("Stockfish 18 Lite")).toBeVisible();
  await page.getByRole("gridcell", { name: /^e2, white pawn/ }).click();
  await page.getByRole("gridcell", { name: /^e4, empty, legal destination/ }).click();
  await expect(page.getByText(/Stockfish is thinking/i)).toBeVisible();
  await expect.poll(() => page.evaluate(() => {
    const value = localStorage.getItem("w98:chess:v1");
    return value ? JSON.parse(value).state.moves : 0;
  }), { timeout: 30_000 }).toBe(2);
  await expect(page.getByText(/Your move as white/i)).toBeVisible();
});

test("My AI Chess repairs oversized history and survives a storage quota error", async ({ page }) => {
  test.setTimeout(45_000);
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.addInitScript(() => {
    const originalSetItem = Storage.prototype.setItem;
    let rejectedOnce = false;
    Storage.prototype.setItem = function setItem(key, value) {
      if (key === "w98:chess:v1" && !rejectedOnce) {
        const parsed = JSON.parse(String(value)) as { state?: { moves?: number; history?: unknown[] } };
        if ((parsed.state?.moves || 0) >= 1 && (parsed.state?.history?.length || 0) > 0) {
          rejectedOnce = true;
          throw new DOMException("Storage full", "QuotaExceededError");
        }
      }
      return originalSetItem.call(this, key, value);
    };
  });

  await page.goto("/play/chess");
  await expect(page.getByText("Stockfish 18 Lite")).toBeVisible();
  await page.evaluate(() => {
    const key = "w98:chess:v1";
    const envelope = JSON.parse(localStorage.getItem(key) || "null");
    const recursiveSnapshot = { ...envelope.state, history: envelope.state.history, padding: "x".repeat(2_000) };
    envelope.state.history = Array.from({ length: 60 }, () => recursiveSnapshot);
    localStorage.setItem(key, JSON.stringify(envelope));
  });
  await page.reload();
  await expect.poll(() => page.evaluate(() => {
    const raw = localStorage.getItem("w98:chess:v1") || "";
    const envelope = JSON.parse(raw);
    return raw.length < 500_000 && envelope.state.history.every((snapshot: Record<string, unknown>) => !("history" in snapshot));
  })).toBe(true);

  await page.getByRole("gridcell", { name: /^e2, white pawn/ }).click();
  await page.getByRole("gridcell", { name: /^e4, empty, legal destination/ }).click();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("w98:chess:v1") || "null").state.moves), { timeout: 30_000 }).toBe(2);
  expect(pageErrors).toEqual([]);
});

test("Minesweeper and Solitaire restore local progress", async ({ page }) => {
  await page.goto("/play/minesweeper");
  const firstCell = page.locator(".mine-board .mine-cell:visible").first();
  await firstCell.click();
  await expect.poll(() => page.evaluate(() => Boolean(localStorage.getItem("w98:minesweeper:v1")))).toBe(true);
  await page.reload();
  await expect(page.locator(".mine-board .mine-cell:visible").first()).not.toHaveAttribute("aria-label", /covered$/);

  await page.goto("/play/solitaire");
  await page.getByRole("button", { name: /Draw from stock/ }).click();
  await expect.poll(() => page.evaluate(() => {
    const value = localStorage.getItem("w98:solitaire:v1");
    return value ? JSON.parse(value).state.waste.length : 0;
  })).toBe(1);
  await page.reload();
  await expect(page.getByRole("button", { name: /23 cards remain/ })).toBeVisible();
});

test("Spotify stays disconnected until session consent", async ({ page }) => {
  await page.goto("/play/music");
  await expect(page.locator('script[src*="spotify"]')).toHaveCount(0);
  await expect(page.locator('iframe[src*="spotify"]')).toHaveCount(0);
  const consent = page.getByRole("button", { name: "Load Spotify player" });
  if (await consent.isVisible()) {
    await consent.click();
    await expect.poll(() => page.evaluate(() => sessionStorage.getItem("w98:spotify-consent"))).toBe("1");
    await expect(page.locator('script[src*="spotify"]')).toHaveCount(1);
  } else {
    await expect(page.getByText("No featured playlist yet")).toBeVisible();
  }
});

test("archive is indexable, filterable, and rejects invalid folders", async ({ page, request }) => {
  await page.goto("/archive?type=photos&sort=name-asc");
  await expect(page).toHaveTitle(/archive explorer/i);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/archive$/);
  await expect(page.getByRole("navigation", { name: "Filter archive by type" }).getByRole("link", { name: "Photos" })).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("region", { name: "Archive Explorer" })).toBeVisible();

  expect((await request.get("/archive/not-a-year")).status()).toBe(404);
  expect((await request.get("/archive/2099")).status()).toBe(404);
  expect((await request.get("/photos/not-a-photo-id")).status()).toBe(404);

  const sitemap = await (await request.get("/sitemap.xml")).text();
  const feed = await (await request.get("/feed.xml")).text();
  expect(sitemap).toContain("/archive");
  expect(feed).not.toContain("/archive");
});

test("archive desktop window still opens under reduced motion", async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.startsWith("desktop"));
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.getByRole("navigation", { name: "Desktop shortcuts" }).getByRole("button", { name: "Archive" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("region", { name: "Archive Explorer" })).toBeVisible();
});

test("public content remains readable without JavaScript", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("/updates");
  await expect(page.getByRole("heading", { name: "Life updates" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Life Updates - Windows Explorer" })).toBeVisible();
  await context.close();
});

test("guestbook is public, unindexed, and excluded from machine-readable feeds", async ({ page, request }) => {
  await page.goto("/guestbook");
  await expect(page).toHaveTitle(/guestbook/i);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex, follow/i);
  const disabledNotice = page.getByText(/form will open after the database and anti-spam keys are connected/i);
  if (await disabledNotice.isVisible()) {
    await expect(disabledNotice).toBeVisible();
  } else {
    await expect(page.getByRole("button", { name: "Sign guestbook" })).toBeVisible();
  }

  const sitemap = await (await request.get("/sitemap.xml")).text();
  const feed = await (await request.get("/feed.xml")).text();
  expect(sitemap).not.toContain("/guestbook");
  expect(feed).not.toContain("/guestbook");
});

test("private anonymous inbox is unindexed and separate from the guestbook", async ({ page, request }) => {
  await page.goto("/guestbook");
  await page.getByRole("link", { name: "Send an anonymous message" }).click();
  await expect(page).toHaveURL(/\/ask$/);
  await expect(page.getByRole("heading", { name: "Say anything. Stay anonymous." })).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex, nofollow/i);
  await expect(page.getByLabel("Your anonymous message")).toBeVisible();
  await expect(page.getByLabel("Your name (optional)")).toHaveCount(0);

  const sitemap = await (await request.get("/sitemap.xml")).text();
  const feed = await (await request.get("/feed.xml")).text();
  expect(sitemap).not.toContain("/ask");
  expect(feed).not.toContain("/ask");
});

test("anonymous owner access is redirected", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login/);
  await expect(page.getByRole("heading", { name: "Owner sign in" })).toBeVisible();
  await expect(page.locator(".admin-auth-desktop")).toHaveCSS("background-color", "rgb(0, 128, 128)");
  await expect(page.locator(".admin-auth-taskbar")).toHaveCSS("height", "28px");
});

test("owner can open the public password setup route", async ({ page }) => {
  await page.goto("/admin/login");
  await page.getByRole("link", { name: "Set or reset the password" }).click();
  await expect(page).toHaveURL(/\/admin\/password$/);
  await expect(page.getByRole("heading", { name: "Get a password link" })).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex, nofollow/i);
  await expect(page.getByRole("button", { name: "Email me a password link" })).toBeVisible();
});
