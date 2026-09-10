import { describe, expect, it } from "vitest";
import {
  archiveFolderExists,
  archiveFolderLabel,
  archivePath,
  buildArchiveUrl,
  getArchiveBreadcrumbs,
  getArchiveFolders,
  normalizeArchiveItems,
  parseArchiveSelection,
  parseArchiveSort,
  parseArchiveType,
  selectArchiveItems,
} from "@/lib/archive";

const posts = [
  { id: "p1", slug: "february-note", title: "February note", status: "published" as const, publishedAt: new Date("2026-02-15T12:00:00Z"), createdAt: new Date("2025-01-01T00:00:00Z") },
  { id: "p2", slug: "year-end", title: "Year end", status: "published" as const, publishedAt: null, createdAt: new Date("2025-12-31T23:00:00Z") },
  { id: "p3", slug: "private", title: "Private draft", status: "draft" as const, publishedAt: null, createdAt: new Date("2026-03-01T00:00:00Z") },
];

const photos = [
  { id: "m1", filename: "snow.jpg", caption: "Morning snow", showInPhotoLog: true, takenDate: "2026-02-01", createdAt: new Date("2026-04-01T00:00:00Z") },
  { id: "m2", filename: "street.jpg", caption: "", showInPhotoLog: true, takenDate: null, createdAt: new Date("2024-06-10T23:30:00Z") },
  { id: "m3", filename: "hidden.jpg", caption: "Hidden photo", showInPhotoLog: false, takenDate: "2026-02-20", createdAt: new Date("2026-02-20T00:00:00Z") },
];

const items = normalizeArchiveItems(posts, photos);

describe("archive normalization and folders", () => {
  it("uses publication and taken dates with creation-date fallbacks", () => {
    expect(items.map((item) => [item.id, item.year, item.month])).toEqual([
      ["update:p1", "2026", "02"],
      ["update:p2", "2025", "12"],
      ["photo:m1", "2026", "02"],
      ["photo:m2", "2024", "06"],
    ]);
  });

  it("excludes drafts and photos hidden from the photo log", () => {
    expect(items.some((item) => item.id === "update:p3")).toBe(false);
    expect(items.some((item) => item.id === "photo:m3")).toBe(false);
  });

  it("builds descending UTC year and month folders with stable counts", () => {
    expect(getArchiveFolders(items)).toEqual([
      { year: "2026", count: 2, months: [{ month: "02", label: "February", count: 2 }] },
      { year: "2025", count: 1, months: [{ month: "12", label: "December", count: 1 }] },
      { year: "2024", count: 1, months: [{ month: "06", label: "June", count: 1 }] },
    ]);
  });
});

describe("archive routing", () => {
  it("accepts only root, year, and zero-padded month folders", () => {
    expect(parseArchiveSelection()).toEqual({});
    expect(parseArchiveSelection(["2026"])).toEqual({ year: "2026" });
    expect(parseArchiveSelection(["2026", "02"])).toEqual({ year: "2026", month: "02" });
    expect(parseArchiveSelection(["26"])).toBeNull();
    expect(parseArchiveSelection(["2026", "2"])).toBeNull();
    expect(parseArchiveSelection(["2026", "13"])).toBeNull();
    expect(parseArchiveSelection(["2026", "02", "extra"])).toBeNull();
  });

  it("detects populated folders and creates canonical paths", () => {
    expect(archiveFolderExists(items, { year: "2026", month: "02" })).toBe(true);
    expect(archiveFolderExists(items, { year: "2026", month: "03" })).toBe(false);
    expect(archivePath({ year: "2026", month: "02" })).toBe("/archive/2026/02");
    expect(archiveFolderLabel({ year: "2026", month: "02" })).toBe("February 2026");
  });

  it("builds breadcrumbs and query-backed filter URLs", () => {
    expect(getArchiveBreadcrumbs({ year: "2026", month: "02" }).map((item) => item.label)).toEqual(["Archive", "2026", "February"]);
    expect(buildArchiveUrl({ year: "2026" }, "photos", "name-asc")).toBe("/archive/2026?type=photos&sort=name-asc");
    expect(buildArchiveUrl({}, "all", "date-desc")).toBe("/archive");
  });
});

describe("archive filters and sorting", () => {
  it("filters by folder and media type", () => {
    expect(selectArchiveItems(items, { year: "2026" }, "photos", "date-desc").map((item) => item.id)).toEqual(["photo:m1"]);
    expect(selectArchiveItems(items, { year: "2026", month: "02" }, "all", "date-desc").map((item) => item.id)).toEqual(["update:p1", "photo:m1"]);
  });

  it("sorts by name, date, and type", () => {
    expect(selectArchiveItems(items, {}, "all", "name-asc").map((item) => item.name)).toEqual(["February note", "Morning snow", "street.jpg", "Year end"]);
    expect(selectArchiveItems(items, {}, "all", "date-asc").map((item) => item.id)).toEqual(["photo:m2", "update:p2", "photo:m1", "update:p1"]);
    expect(selectArchiveItems(items, {}, "all", "type-asc").map((item) => item.type)).toEqual(["photo", "photo", "update", "update"]);
  });

  it("falls back safely for unknown query values", () => {
    expect(parseArchiveType("anything")).toBe("all");
    expect(parseArchiveSort("anything")).toBe("date-desc");
  });
});
