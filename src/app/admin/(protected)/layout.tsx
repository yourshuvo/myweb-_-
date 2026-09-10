import { redirect } from "next/navigation";
import { connection } from "next/server";
import { AdminShell } from "@/components/admin/admin-shell";
import { getAdminUser } from "@/lib/auth/server";

export default async function ProtectedAdminLayout({ children }: { children: React.ReactNode }) {
  await connection();
  const user = await getAdminUser();
  if (!user) redirect("/admin/login");
  return <AdminShell email={user.email}>{children}</AdminShell>;
}
