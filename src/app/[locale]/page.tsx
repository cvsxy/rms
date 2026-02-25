import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const session = await getSession();

  if (session) {
    if (session.role === "ADMIN") {
      redirect(`/${locale}/admin`);
    }
    redirect(`/${locale}/tables`);
  }

  redirect(`/${locale}/pin-login`);
}
