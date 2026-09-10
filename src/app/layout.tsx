import type { Metadata } from "next";
import { siteUrl } from "@/lib/env";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: "My corner of the internet",
    template: "%s - My corner of the internet",
  },
  description: "A personal place for life updates, photographs, and small-web notes.",
  icons: { icon: "/site-icon.svg" },
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    title: "My corner of the internet",
    description: "Life updates, photographs, and small-web notes.",
    url: "/",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "My corner of the internet" }],
  },
  twitter: { card: "summary_large_image", images: ["/og-image.png"] },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main-content">Skip to main content</a>
        {children}
      </body>
    </html>
  );
}
