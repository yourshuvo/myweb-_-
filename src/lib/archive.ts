export type ArchiveItemType = "update" | "photo";
export type ArchiveTypeFilter = "all" | "updates" | "photos";
export type ArchiveSort = "date-desc" | "date-asc" | "name-asc" | "name-desc" | "type-asc" | "type-desc";

export type ArchiveSelection = {
  year?: string;
  month?: string;
};

export type ArchiveItem = {
  id: string;
  name: string;
  type: ArchiveItemType;
  date: Date;
  href: string;
  year: string;
  month: string;
};

export type ArchiveMonth = {
  month: string;
  label: string;
  count: number;
};

export type ArchiveYear = {
  year: string;
  count: number;
  months: ArchiveMonth[];
};

type ArchivePostSource = {
  id: string;
  slug: string;
  title: string;
  status: "draft" | "published";
  publishedAt: Date | string | null;
  createdAt: Date | string;
};

type ArchivePhotoSource = {
  id: string;
  filename: string;
  caption: string;
  showInPhotoLog: boolean;
  takenDate: Date | string | null;
  createdAt: Date | string;
};

const monthFormatter = new Intl.DateTimeFormat("en", { month: "long", timeZone: "UTC" });

function normalizedDate(value: Date | string) {
  const date = value instanceof Date ? new Date(value) : new Date(value.length === 10 ? `${value}T00:00:00.000Z` : value);
  if (Number.isNaN(date.getTime())) throw new Error("Archive item has an invalid date.");
  return date;
}

export function archiveSelectionFromDate(value: Date | string): Required<ArchiveSelection> {
  const date = normalizedDate(value);
  return {
    year: String(date.getUTCFullYear()).padStart(4, "0"),
    month: String(date.getUTCMonth() + 1).padStart(2, "0"),
  };
}

export function normalizeArchiveItems(posts: ArchivePostSource[], photos: ArchivePhotoSource[]) {
  const updateItems: ArchiveItem[] = posts
    .filter((post) => post.status === "published")
    .map((post) => {
      const date = normalizedDate(post.publishedAt || post.createdAt);
      const folder = archiveSelectionFromDate(date);
      return {
        id: `update:${post.id}`,
        name: post.title,
        type: "update",
        date,
        href: `/updates/${post.slug}`,
        ...folder,
      };
    });

  const photoItems: ArchiveItem[] = photos
    .filter((photo) => photo.showInPhotoLog)
    .map((photo) => {
      const date = normalizedDate(photo.takenDate || photo.createdAt);
      const folder = archiveSelectionFromDate(date);
      return {
        id: `photo:${photo.id}`,
        name: photo.caption.trim() || photo.filename,
        type: "photo",
        date,
        href: `/photos/${photo.id}`,
        ...folder,
      };
    });

  return [...updateItems, ...photoItems];
}

export function getArchiveFolders(items: ArchiveItem[]): ArchiveYear[] {
  const years = new Map<string, Map<string, number>>();
  for (const item of items) {
    const months = years.get(item.year) || new Map<string, number>();
    months.set(item.month, (months.get(item.month) || 0) + 1);
    years.set(item.year, months);
  }

  return [...years.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([year, months]) => ({
      year,
      count: [...months.values()].reduce((total, count) => total + count, 0),
      months: [...months.entries()]
        .sort(([a], [b]) => b.localeCompare(a))
        .map(([month, count]) => ({ month, count, label: monthLabel(month) })),
    }));
}

export function parseArchiveSelection(segments?: string[]): ArchiveSelection | null {
  if (!segments?.length) return {};
  if (segments.length > 2) return null;
  const [year, month] = segments;
  if (!/^\d{4}$/.test(year)) return null;
  if (month && !/^(0[1-9]|1[0-2])$/.test(month)) return null;
  return month ? { year, month } : { year };
}

export function archiveFolderExists(items: ArchiveItem[], selection: ArchiveSelection) {
  if (!selection.year) return true;
  return items.some((item) => item.year === selection.year && (!selection.month || item.month === selection.month));
}

export function parseArchiveType(value: string | string[] | undefined): ArchiveTypeFilter {
  const first = Array.isArray(value) ? value[0] : value;
  return first === "updates" || first === "photos" ? first : "all";
}

export function parseArchiveSort(value: string | string[] | undefined): ArchiveSort {
  const first = Array.isArray(value) ? value[0] : value;
  return first === "date-asc" || first === "name-asc" || first === "name-desc" || first === "type-asc" || first === "type-desc"
    ? first
    : "date-desc";
}

export function selectArchiveItems(
  items: ArchiveItem[],
  selection: ArchiveSelection,
  type: ArchiveTypeFilter,
  sort: ArchiveSort,
) {
  const selected = items.filter((item) => {
    if (selection.year && item.year !== selection.year) return false;
    if (selection.month && item.month !== selection.month) return false;
    if (type === "updates" && item.type !== "update") return false;
    if (type === "photos" && item.type !== "photo") return false;
    return true;
  });

  return selected.toSorted((a, b) => {
    if (sort.startsWith("name")) {
      const result = a.name.localeCompare(b.name, "en", { sensitivity: "base" });
      return sort === "name-desc" ? -result : result;
    }
    if (sort.startsWith("type")) {
      const result = a.type.localeCompare(b.type) || a.name.localeCompare(b.name, "en", { sensitivity: "base" });
      return sort === "type-desc" ? -result : result;
    }
    const result = a.date.getTime() - b.date.getTime() || a.name.localeCompare(b.name, "en", { sensitivity: "base" });
    return sort === "date-asc" ? result : -result;
  });
}

export function archivePath(selection: ArchiveSelection = {}) {
  if (!selection.year) return "/archive";
  return selection.month ? `/archive/${selection.year}/${selection.month}` : `/archive/${selection.year}`;
}

export function buildArchiveUrl(
  selection: ArchiveSelection,
  type: ArchiveTypeFilter = "all",
  sort: ArchiveSort = "date-desc",
) {
  const query = new URLSearchParams();
  if (type !== "all") query.set("type", type);
  if (sort !== "date-desc") query.set("sort", sort);
  const value = query.toString();
  return `${archivePath(selection)}${value ? `?${value}` : ""}`;
}

export function getArchiveBreadcrumbs(selection: ArchiveSelection) {
  const breadcrumbs = [{ label: "Archive", selection: {} as ArchiveSelection }];
  if (selection.year) breadcrumbs.push({ label: selection.year, selection: { year: selection.year } });
  if (selection.year && selection.month) {
    breadcrumbs.push({ label: monthLabel(selection.month), selection: { year: selection.year, month: selection.month } });
  }
  return breadcrumbs;
}

export function archiveFolderLabel(selection: ArchiveSelection) {
  if (!selection.year) return "All files";
  return selection.month ? `${monthLabel(selection.month)} ${selection.year}` : selection.year;
}

export function monthLabel(month: string) {
  return monthFormatter.format(new Date(Date.UTC(2000, Number(month) - 1, 1)));
}
