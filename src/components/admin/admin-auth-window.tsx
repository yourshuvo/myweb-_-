import Link from "next/link";
import type { ReactNode } from "react";
import { W98Icon } from "@/components/desktop/w98-icon";
import type { W98IconName } from "@/lib/public-apps";

export function AdminAuthWindow({ children, icon, title }: { children: ReactNode; icon: W98IconName; title: string }) {
  return (
    <main id="main-content" className="admin-auth-desktop">
      <section className="admin-logon-window" aria-labelledby="admin-logon-title">
        <div className="admin-window-titlebar">
          <span><W98Icon icon={icon} size={16} /><strong>{title}</strong></span>
          <span className="admin-window-controls"><Link href="/" aria-label="Close and return to the public desktop">×</Link></span>
        </div>
        <div className="login-window__body">
          <div className="login-badge" aria-hidden="true"><W98Icon icon={icon} size={32} /></div>
          <div className="admin-logon-copy"><h1 id="admin-logon-title">{title}</h1></div>
          {children}
        </div>
      </section>
      <footer className="admin-auth-taskbar">
        <Link className="admin-start-button" href="/"><span className="start-mark" aria-hidden="true"><i /><i /><i /><i /></span><strong>Start</strong></Link>
        <span className="admin-auth-task"><W98Icon icon={icon} size={16} />{title}</span>
      </footer>
    </main>
  );
}
