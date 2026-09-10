import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArchiveExplorer } from "@/components/archive/archive-explorer";
import { PageShell } from "@/components/retro/page-shell";
import {
  archiveFolderExists,
  archiveFolderLabel,
  archivePath,
  getArchiveFolders,
  normalizeArchiveItems,
  parseArchiveSelection,
  parseArchiveSort,
  parseArchiveType,
} from "@/lib/archive";
import { getPhotoLog, getPublicProfile, getPublishedPosts } from "@/lib/data";

type ArchivePageProps = {
  params: Promise<{ segments?: string[] }>;
  searchParams: Promise<{ type?: string | string[]; sort?: string | string[] }>;
};

async function loadArchive() {
  const [posts, photos] = await Promise.all([getPublishedPosts(), getPhotoLog()]);
  const items = normalizeArchiveItems(posts, photos);
  return { items, folders: getArchiveFolders(items) };
}

export async function generateMetadata({ params }: ArchivePageProps): Promise<Metadata> {
  const { segments } = await params;
  const selection = parseArchiveSelection(segments);
  if (!selection) notFound();
  const { items } = await loadArchive();
  if (!archiveFolderExists(items, selection)) notFound();
  const label = archiveFolderLabel(selection);
  const path = archivePath(selection);
  return {
    title: selection.year ? `Archive: ${label}` : "Archive Explorer",
    description: `Browse published updates and photo-log images in ${label.toLowerCase()}.`,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      title: selection.year ? `Archive: ${label}` : "Archive Explorer",
      description: `Browse published updates and photo-log images in ${label.toLowerCase()}.`,
      url: path,
    },
  };
}

export default async function ArchivePage({ params, searchParams }: ArchivePageProps) {
  const [{ segments }, query] = await Promise.all([params, searchParams]);
  const selection = parseArchiveSelection(segments);
  if (!selection) notFound();

  const [profile, archive] = await Promise.all([getPublicProfile(), loadArchive()]);
  if (!archiveFolderExists(archive.items, selection)) notFound();

  const type = parseArchiveType(query.type);
  const sort = parseArchiveSort(query.sort);
  return (
    <PageShell profile={profile} title="Archive - Windows Explorer">
      <header className="page-heading archive-heading">
        <h1>Archive Explorer</h1>
        <p>Published updates and photo-log images, arranged into folders by date.</p>
      </header>
      <ArchiveExplorer allItems={archive.items} folders={archive.folders} selection={selection} type={type} sort={sort} />
    </PageShell>
  );
}
