"use client";

import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useEffect, useCallback } from "react";
import { usePusherChannel } from "@/hooks/usePusher";

interface ServerLayoutProps {
  children: React.ReactNode;
  locale: string;
  userName: string;
  userId: string;
}

export default function ServerLayoutClient({ children, locale, userName, userId }: ServerLayoutProps) {
  const t = useTranslations();
  const pathname = usePathname();
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);

  // Load unread count from sessionStorage
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem("rms-notifications");
      if (stored) {
        const notifications = JSON.parse(stored);
        const unread = notifications.filter((n: { read: boolean }) => !n.read).length;
        setUnreadCount(unread);
      }
    } catch { /* ignore */ }
  }, [pathname]);

  // Listen for real-time notifications to update badge
  const handleItemReady = useCallback(() => {
    setUnreadCount((prev) => prev + 1);
  }, []);

  usePusherChannel(
    userId ? `private-server-${userId}` : null,
    "item-ready",
    handleItemReady
  );

  const handleLogout = async () => {
    try { sessionStorage.removeItem("rms-notifications"); } catch { /* ignore */ }
    await fetch("/api/auth/logout", { method: "POST" });
    router.push(`/${locale}/pin-login`);
    router.refresh();
  };

  const navItems = [
    {
      href: `/${locale}/tables`,
      label: t("tables.title"),
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
        </svg>
      ),
    },
    {
      href: `/${locale}/notifications`,
      label: t("notifications.title"),
      badge: unreadCount,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
        </svg>
      ),
    },
  ];

  return (
    <div className="min-h-dvh flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between safe-area-top">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold text-blue-700">RMS</h1>
          <span className="text-sm text-gray-500 truncate max-w-[120px]">{userName}</span>
        </div>
        <div className="flex items-center gap-1">
          <LanguageToggle locale={locale} />
          <button
            onClick={handleLogout}
            className="h-10 px-3 text-sm text-gray-500 hover:text-red-600 active:text-red-700 rounded-lg touch-manipulation transition-colors"
            aria-label={t("auth.logout")}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
            </svg>
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-auto pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))]">
        {children}
      </main>

      {/* Bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex safe-area-bottom" style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <a
              key={item.href}
              href={item.href}
              className={`flex-1 flex flex-col items-center py-3 touch-manipulation transition-colors relative ${
                isActive ? "text-blue-600" : "text-gray-400"
              }`}
              aria-label={item.label}
              aria-current={isActive ? "page" : undefined}
            >
              <div className="relative">
                {item.icon}
                {"badge" in item && typeof item.badge === "number" && item.badge > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                    {item.badge > 99 ? "99+" : item.badge}
                  </span>
                )}
              </div>
              <span className={`text-[11px] mt-1 font-medium ${isActive ? "text-blue-600" : "text-gray-400"}`}>
                {item.label}
              </span>
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
    <div className="flex gap-0.5">
      <button
        onClick={() => switchLocale("es")}
        className={`h-10 px-3 rounded-lg text-sm font-medium touch-manipulation transition-colors ${
          locale === "es" ? "bg-blue-100 text-blue-700" : "text-gray-400 active:bg-gray-100"
        }`}
        aria-label="Espa\u00f1ol"
      >
        ES
      </button>
      <button
        onClick={() => switchLocale("en")}
        className={`h-10 px-3 rounded-lg text-sm font-medium touch-manipulation transition-colors ${
          locale === "en" ? "bg-blue-100 text-blue-700" : "text-gray-400 active:bg-gray-100"
        }`}
        aria-label="English"
      >
        EN
      </button>
    </div>
  );
}
