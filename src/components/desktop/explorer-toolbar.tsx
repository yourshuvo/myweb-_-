import Link from "next/link";
import { W98Icon } from "@/components/desktop/w98-icon";

export function ExplorerToolbar({ current, items }: { current: string; items: Array<{ href: string; label: string }> }) {
  return (
    <nav className="explorer-toolbar" aria-label="Folder views">
      {items.map((item) => (
        <Link aria-current={current === item.href ? "page" : undefined} href={item.href} key={item.href}>
          <W98Icon icon={current === item.href ? "folder-open" : "folder"} size={16} />
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

