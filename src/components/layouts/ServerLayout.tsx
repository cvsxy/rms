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

const NOTIFICATION_KEY = "rms-notifications";
const PUSH_STATE_KEY = "rms-push-state"; // "subscribed" | "dismissed" | null

export default function ServerLayoutClient({ children, locale, userName, userId }: ServerLayoutProps) {
  const t = useTranslations();
  const pathname = usePathname();
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);
  const [pushState, setPushState] = useState<string | null>(null);
  const [showPushBanner, setShowPushBanner] = useState(false);

  // Load unread count from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(NOTIFICATION_KEY);
      if (stored) {
        const notifications = JSON.parse(stored);
        const unread = notifications.filter((n: { read: boolean }) => !n.read).length;
        setUnreadCount(unread);
      }
    } catch { /* ignore */ }
  }, [pathname]);

  // Check push notification state
  useEffect(() => {
    try {
      const state = localStorage.getItem(PUSH_STATE_KEY);
      setPushState(state);

      // Show banner if not yet subscribed and not dismissed, and browser supports push
      if (
        !state &&
        "serviceWorker" in navigator &&
        "PushManager" in window &&
        "Notification" in window
      ) {
        setShowPushBanner(true);
      }
    } catch { /* ignore */ }
  }, []);

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
    try { localStorage.removeItem(NOTIFICATION_KEY); } catch { /* ignore */ }
    await fetch("/api/auth/logout", { method: "POST" });
    router.push(`/${locale}/pin-login`);
    router.refresh();
  };

  const subscribeToPush = async () => {
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        localStorage.setItem(PUSH_STATE_KEY, "dismissed");
        setPushState("dismissed");
        setShowPushBanner(false);
        return;
      }

      const reg = await navigator.serviceWorker.ready;
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidKey) {
        setShowPushBanner(false);
        return;
      }

      // Convert VAPID public key to Uint8Array
      const urlBase64ToUint8Array = (base64String: string) => {
        const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
        const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
        const rawData = atob(base64);
        const outputArray = new Uint8Array(rawData.length);
        for (let i = 0; i < rawData.length; ++i) {
          outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
      };

      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });

      const json = subscription.toJSON();
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: json.endpoint,
          auth: json.keys?.auth,
          p256dh: json.keys?.p256dh,
        }),
      });

      localStorage.setItem(PUSH_STATE_KEY, "subscribed");
      setPushState("subscribed");
      setShowPushBanner(false);
    } catch {
      // Subscription failed — silently dismiss
      setShowPushBanner(false);
    }
  };

  const dismissPushBanner = () => {
    localStorage.setItem(PUSH_STATE_KEY, "dismissed");
    setPushState("dismissed");
    setShowPushBanner(false);
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
      href: `/${locale}/my-orders`,
      label: t("orders.myOrders"),
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
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

      {/* Push notification banner */}
      {showPushBanner && pushState !== "subscribed" && (
        <div className="bg-blue-50 border-b border-blue-200 px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <svg className="w-5 h-5 text-blue-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
            </svg>
            <p className="text-sm text-blue-800 truncate">{t("notifications.enablePush")}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={subscribeToPush}
              className="h-9 px-4 text-sm font-semibold text-white bg-blue-600 rounded-lg active:bg-blue-700 touch-manipulation"
            >
              {t("common.confirm")}
            </button>
            <button
              onClick={dismissPushBanner}
              className="h-9 w-9 flex items-center justify-center text-blue-400 active:text-blue-600 touch-manipulation"
              aria-label={t("common.cancel")}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

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
        aria-label="Espa&#241;ol"
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
