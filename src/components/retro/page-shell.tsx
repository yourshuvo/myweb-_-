import type { ReactNode } from "react";
import { Win98Window } from "@/components/desktop/win98-window";
import { VisitorTracker } from "@/components/guestbook/visitor-tracker";
import type { PublicProfile } from "@/lib/data";
import { hasVisitorTrackingConfig } from "@/lib/env";

export function PageShell({ profile, title, children, showVisitorCount = false }: { profile: PublicProfile; title: string; children: ReactNode; showVisitorCount?: boolean }) {
  return (
    <Win98Window
      displayName={profile.displayName}
      showVisitorCount={showVisitorCount}
      title={title}
      visitorCounter={<VisitorTracker enabled={hasVisitorTrackingConfig()} showCount />}
    >
      {children}
    </Win98Window>
  );
}

