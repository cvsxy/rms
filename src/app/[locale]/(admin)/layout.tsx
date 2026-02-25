import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import AdminLayoutClient from "@/components/layouts/AdminLayout";

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await getSession();

  if (!session || session.role !== "ADMIN") {
    redirect(`/${locale}/admin-login`);
  }

  return (
    <AdminLayoutClient userName={session.name}>
      {children}
    </AdminLayoutClient>
  );
}
