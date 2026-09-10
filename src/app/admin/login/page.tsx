import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminAuthWindow } from "@/components/admin/admin-auth-window";
import { LoginForm } from "@/components/admin/login-form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { getAdminUser } from "@/lib/auth/server";
import { missingConfiguration } from "@/lib/env";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Owner sign in", robots: { index: false, follow: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ reset?: string }> }) {
  if (await getAdminUser()) redirect("/admin");
  const { reset } = await searchParams;
  const missing = missingConfiguration().filter((name) => name !== "HACKCLUB_CDN_API_KEY");
  return (
    <AdminAuthWindow icon="user-computer" title="Owner sign in">
      <div><p>Registration is disabled. Only the email configured as <code>ADMIN_EMAIL</code> can enter.</p></div>
      {reset === "1" && <Alert className="setup-alert"><AlertTitle>Password saved</AlertTitle><AlertDescription>You can sign in with your new password now.</AlertDescription></Alert>}
      {missing.length > 0 && <Alert className="setup-alert"><AlertTitle>Setup required</AlertTitle><AlertDescription>Add these environment values before signing in: {missing.join(", ")}.</AlertDescription></Alert>}
      <LoginForm />
      <Link href="/admin/password">Set or reset the password</Link>
      <Link href="/">Back to the public desktop</Link>
    </AdminAuthWindow>
  );
}
