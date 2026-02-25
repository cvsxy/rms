"use client";

import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

interface ServerLayoutProps {
  children: React.ReactNode;
  locale: string;
  userName: string;
  userId: string;
}

export default function ServerLayoutClient({ children, locale, userName }: ServerLayoutProps) {
  const t = useTranslations();
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push(`/${locale}/pin-login`);
    router.refresh();
  };

  const navItems = [
    { href: `/${locale}/tables`, label: t("tables.title"), icon: "🍽️" },
    { href: `/${locale}/notifications`, label: t("notifications.title"), icon: "🔔" },
  ];

  return (
    <div className="min-h-dvh flex flex-col bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold text-blue-700">RMS</h1>
          <span className="text-sm text-gray-500">{userName}</span>
        </div>
        <div className="flex items-center gap-2">
          <LanguageToggle locale={locale} />
          <button onClick={handleLogout} className="text-sm text-gray-500 hover:text-red-600 px-2 py-1 touch-manipulation">
            {t("auth.logout")}
          </button>
        </div>
      </header>
      <main className="flex-1 overflow-auto pb-20">{children}</main>
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <a key={item.href} href={item.href} className={`flex-1 flex flex-col items-center py-3 touch-manipulation ${isActive ? "text-blue-600" : "text-gray-500"}`}>
              <span className="text-xl">{item.icon}</span>
              <span className="text-xs mt-0.5">{item.label}</span>
            </a>
          );
        })}
      </nav>
    </div>
  );
}

function LanguageToggle({ locale }: { locale: string }) {
  const router = useRouter();
  const switchLocale = (newLocale: string) => {
    const path = window.location.pathname;
    const newPath = path.replace(`/${locale}`, `/${newLocale}`);
    router.push(newPath);
    router.refresh();
  };
  return (
    <div className="flex gap-0.5 text-xs">
      <button onClick={() => switchLocale("es")} className={`px-1.5 py-0.5 rounded touch-manipulation ${locale === "es" ? "bg-blue-100 text-blue-700 font-medium" : "text-gray-400"}`}>ES</button>
      <button onClick={() => switchLocale("en")} className={`px-1.5 py-0.5 rounded touch-manipulation ${locale === "en" ? "bg-blue-100 text-blue-700 font-medium" : "text-gray-400"}`}>EN</button>
    </div>
  );
}
