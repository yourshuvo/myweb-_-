import type { Metadata } from "next";
import Link from "next/link";
import { AdminAuthWindow } from "@/components/admin/admin-auth-window";
import { PasswordRequestForm } from "@/components/admin/password-request-form";
import { PasswordResetForm } from "@/components/admin/password-reset-form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Set owner password", robots: { index: false, follow: false } };

type PasswordPageSearchParams = Promise<{ token?: string | string[]; error?: string | string[] }>;

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function PasswordPage({ searchParams }: { searchParams: PasswordPageSearchParams }) {
  const params = await searchParams;
  const token = firstValue(params.token);
  const error = firstValue(params.error);

  return (
    <AdminAuthWindow icon="computer" title="Owner password setup">
      <div>
        <h2>{token ? "Choose your password" : "Get a password link"}</h2>
        <p>{token ? "This link can be used once. Choose at least 8 characters." : "Neon Auth will email a secure link to the configured owner account. No public registration is available."}</p>
      </div>
      {error === "INVALID_TOKEN" && (
        <Alert className="setup-alert" variant="destructive">
          <AlertTitle>Link expired or invalid</AlertTitle>
          <AlertDescription>Request a fresh password link below.</AlertDescription>
        </Alert>
      )}
      {token ? <PasswordResetForm token={token} /> : <PasswordRequestForm />}
      <Link href="/admin/login">Back to owner sign in</Link>
    </AdminAuthWindow>
  );
}
