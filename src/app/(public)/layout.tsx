import localFont from "next/font/local";
import { PublicDesktopLayout } from "@/components/desktop/public-desktop-layout";
import { getPublicProfile } from "@/lib/data";

const w95fa = localFont({
  src: "../fonts/w95fa.woff2",
  display: "swap",
  variable: "--font-w95fa",
});

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const profile = await getPublicProfile();
  return (
    <div className={w95fa.variable}>
      <PublicDesktopLayout siteTitle={profile.siteTitle}>{children}</PublicDesktopLayout>
    </div>
  );
}

