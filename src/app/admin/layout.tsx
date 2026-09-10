import localFont from "next/font/local";

const w95fa = localFont({
  src: "../fonts/w95fa.woff2",
  display: "swap",
  variable: "--font-w95fa",
});

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div className={w95fa.variable}>{children}</div>;
}
