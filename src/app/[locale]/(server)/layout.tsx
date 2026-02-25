import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import ServerLayoutClient from "@/components/layouts/ServerLayout";

export default async function ServerLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await getSession();

  if (!session) {
    redirect(`/${locale}/pin-login`);
  }

  return (
    <ServerLayoutClient locale={locale} userName={session.name} userId={session.userId}>
      {children}
    </ServerLayoutClient>
  );
}
