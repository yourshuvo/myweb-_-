import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return <main className="system-message" aria-live="polite"><div className="retro-window"><div className="retro-titlebar"><strong>Loading</strong></div><div className="system-message__body loading-stack"><div className="retro-progress"><span /></div><Skeleton className="h-4 w-48 rounded-none" /><p>Opening this page…</p></div></div></main>;
}
