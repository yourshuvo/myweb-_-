import type { Metadata } from "next";
import { ProfileForm } from "@/components/admin/profile-form";
import { getAdminMedia, getPublicProfile } from "@/lib/data";

export const metadata: Metadata = { title: "Profile settings", robots: { index: false, follow: false } };

export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ onboarding?: string }> }) {
  const [{ onboarding }, profile, media] = await Promise.all([searchParams, getPublicProfile(), getAdminMedia()]);
  return <div className="admin-page"><header className="admin-heading"><p className="eyebrow">PROFILE SETTINGS</p><h1>{onboarding ? "Make it yours." : "Public identity"}</h1><p>This information powers the desktop welcome, about page, and contact links.</p></header><section className="admin-panel"><div className="admin-panel__title">Profile properties</div><ProfileForm profile={profile} media={media} onboarding={onboarding === "1" || !profile.onboarded} /></section></div>;
}
