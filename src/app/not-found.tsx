import Link from "next/link";

export default function NotFound() {
  return <main className="system-message"><div className="retro-window"><div className="retro-titlebar"><strong>Error</strong></div><div className="system-message__body"><span aria-hidden="true">⚠️</span><div><h1>Page not found</h1><p>This shortcut points somewhere that does not exist.</p><Link className="retro-button" href="/">Return to desktop</Link></div></div></div></main>;
}
