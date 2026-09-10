import Link from "next/link";
import { W98Icon } from "@/components/desktop/w98-icon";
import {
  archiveFolderLabel,
  buildArchiveUrl,
  getArchiveBreadcrumbs,
  selectArchiveItems,
  type ArchiveItem,
  type ArchiveSelection,
  type ArchiveSort,
  type ArchiveTypeFilter,
  type ArchiveYear,
} from "@/lib/archive";
import { formatDate } from "@/lib/markdown";

type ArchiveExplorerProps = {
  allItems: ArchiveItem[];
  folders: ArchiveYear[];
  selection: ArchiveSelection;
  type: ArchiveTypeFilter;
  sort: ArchiveSort;
};

const typeFilters: Array<{ value: ArchiveTypeFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "updates", label: "Updates" },
  { value: "photos", label: "Photos" },
];

export function ArchiveExplorer({ allItems, folders, selection, type, sort }: ArchiveExplorerProps) {
  const items = selectArchiveItems(allItems, selection, type, sort);
  const breadcrumbs = getArchiveBreadcrumbs(selection);

  return (
    <section className="archive-explorer" aria-label="Archive Explorer">
      <div className="archive-addressbar">
        <strong>Address</strong>
        <nav aria-label="Archive breadcrumb">
          {breadcrumbs.map((breadcrumb, index) => (
            <span key={`${breadcrumb.label}-${index}`}>
              {index > 0 && <span aria-hidden="true">\</span>}
              <Link href={buildArchiveUrl(breadcrumb.selection, type, sort)} aria-current={index === breadcrumbs.length - 1 ? "page" : undefined}>
                {breadcrumb.label}
              </Link>
            </span>
          ))}
        </nav>
      </div>

      <div className="archive-explorer__body">
        <aside className="archive-tree">
          <h2>Folders</h2>
          <nav aria-label="Archive folders">
            <ul>
              <li>
                <FolderLink
                  href={buildArchiveUrl({}, type, sort)}
                  label="Archive"
                  count={allItems.length}
                  active={!selection.year}
                  open={!selection.year}
                />
                <ul>
                  {folders.map((year) => (
                    <li key={year.year}>
                      <FolderLink
                        href={buildArchiveUrl({ year: year.year }, type, sort)}
                        label={year.year}
                        count={year.count}
                        active={selection.year === year.year && !selection.month}
                        open={selection.year === year.year}
                      />
                      <ul>
                        {year.months.map((month) => (
                          <li key={`${year.year}-${month.month}`}>
                            <FolderLink
                              href={buildArchiveUrl({ year: year.year, month: month.month }, type, sort)}
                              label={month.label}
                              count={month.count}
                              active={selection.year === year.year && selection.month === month.month}
                              open={selection.year === year.year && selection.month === month.month}
                            />
                          </li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ul>
              </li>
            </ul>
          </nav>
        </aside>

        <div className="archive-file-pane">
          <header className="archive-file-pane__header">
            <div>
              <W98Icon icon="folder-open" size={32} />
              <h2>{archiveFolderLabel(selection)}</h2>
            </div>
            <span>{items.length} {items.length === 1 ? "object" : "objects"}</span>
          </header>

          <nav className="archive-type-filter" aria-label="Filter archive by type">
            {typeFilters.map((filter) => (
              <Link
                key={filter.value}
                href={buildArchiveUrl(selection, filter.value, sort)}
                aria-current={type === filter.value ? "page" : undefined}
              >
                {filter.label}
              </Link>
            ))}
          </nav>

          {items.length ? (
            <div className="archive-table-wrap">
              <table className="archive-table">
                <caption>Files in {archiveFolderLabel(selection)}</caption>
                <thead>
                  <tr>
                    <SortableHeading label="Name" field="name" selection={selection} type={type} sort={sort} />
                    <SortableHeading label="Type" field="type" selection={selection} type={type} sort={sort} />
                    <SortableHeading label="Date" field="date" selection={selection} type={type} sort={sort} />
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td data-label="Name">
                        <Link className="archive-file-link" href={item.href}>
                          <W98Icon icon={item.type === "update" ? "notepad-file" : "pictures"} size={16} />
                          <span>{item.name}</span>
                        </Link>
                      </td>
                      <td data-label="Type">{item.type === "update" ? "Update" : "Photo"}</td>
                      <td data-label="Date"><time dateTime={item.date.toISOString()}>{formatDate(item.date)}</time></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="archive-empty">
              <W98Icon icon="folder-open" size={32} />
              <h3>No matching files</h3>
              <p>{allItems.length ? "Choose another folder or content type." : "Published updates and photo-log images will appear here."}</p>
            </div>
          )}
        </div>
      </div>

      <footer className="archive-explorer__status">
        <span>{items.length} {items.length === 1 ? "object" : "objects"}</span>
        <span><span aria-hidden="true">↕</span> Sorted by {sortLabel(sort)}</span>
      </footer>
    </section>
  );
}

function FolderLink({ href, label, count, active, open }: { href: string; label: string; count: number; active: boolean; open: boolean }) {
  return (
    <Link className="archive-folder-link" href={href} aria-current={active ? "page" : undefined}>
      <W98Icon icon={open ? "folder-open" : "folder"} size={16} />
      <span>{label}</span>
      <small>{count}</small>
    </Link>
  );
}

function SortableHeading({
  label,
  field,
  selection,
  type,
  sort,
}: {
  label: string;
  field: "name" | "type" | "date";
  selection: ArchiveSelection;
  type: ArchiveTypeFilter;
  sort: ArchiveSort;
}) {
  const next = nextSort(field, sort);
  const active = sort.startsWith(field);
  const direction = active ? (sort.endsWith("asc") ? "ascending" : "descending") : "none";
  return (
    <th scope="col" aria-sort={direction}>
      <Link
        href={buildArchiveUrl(selection, type, next)}
        aria-label={`Sort by ${label} ${next.endsWith("asc") ? "ascending" : "descending"}`}
      >
        {label}
        {active && <span aria-hidden="true">{direction === "ascending" ? "↑" : "↓"}</span>}
      </Link>
    </th>
  );
}

function nextSort(field: "name" | "type" | "date", current: ArchiveSort): ArchiveSort {
  if (field === "name") return current === "name-asc" ? "name-desc" : "name-asc";
  if (field === "type") return current === "type-asc" ? "type-desc" : "type-asc";
  return current === "date-desc" ? "date-asc" : "date-desc";
}

function sortLabel(sort: ArchiveSort) {
  const [field, direction] = sort.split("-");
  const label = field === "date" ? "date" : field;
  return `${label} ${direction === "asc" ? "ascending" : "descending"}`;
}
