"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslations, useLocale } from "next-intl";
import { usePusherChannel } from "@/hooks/usePusher";
import ConfirmModal from "@/components/common/ConfirmModal";

interface Notification {
  id: string;
  itemName: string;
  itemNameEs: string;
  destination: string;
  tableNumber: number;
  tableName: string | null;
  timestamp: number;
  read: boolean;
}

const STORAGE_KEY = "rms-notifications";
const PUSH_STATE_KEY = "rms-push-state";

function loadNotifications(): Notification[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch { /* ignore */ }
  return [];
}

function saveNotifications(notifications: Notification[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
  } catch { /* ignore */ }
}

export default function NotificationsPage() {
  const t = useTranslations();
  const locale = useLocale();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [pushState, setPushState] = useState<string | null>(null);
  const [pushSupported, setPushSupported] = useState(false);
  const lastFetchRef = useRef<number>(Date.now());

  // Load from localStorage on mount
  useEffect(() => {
    setNotifications(loadNotifications());

    // Check push support
    if ("serviceWorker" in navigator && "PushManager" in window && "Notification" in window) {
      setPushSupported(true);
    }
    try {
      setPushState(localStorage.getItem(PUSH_STATE_KEY));
    } catch { /* ignore */ }
  }, []);

  // Save to localStorage whenever notifications change
  useEffect(() => {
    saveNotifications(notifications);
  }, [notifications]);

  // Get current user ID for Pusher channel
  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((json) => {
        const d = json.data || json;
        if (d.userId) setUserId(d.userId);
      })
      .catch(() => {});
  }, []);

  // Catch up on missed notifications when app regains visibility
  const catchUpNotifications = useCallback(async () => {
    try {
      const since = lastFetchRef.current;
      const res = await fetch(`/api/notifications?since=${since}`);
      if (!res.ok) return;
      const { data } = await res.json();
      if (!data || data.length === 0) return;

      setNotifications((prev) => {
        const existingIds = new Set(prev.map((n) => n.id));
        const newOnes = (data as Notification[]).filter((n) => !existingIds.has(n.id));
        if (newOnes.length === 0) return prev;
        const updated = [...newOnes, ...prev];
        saveNotifications(updated);
        return updated;
      });
    } catch { /* ignore */ }
    lastFetchRef.current = Date.now();
  }, []);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        catchUpNotifications();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [catchUpNotifications]);

  const handleItemReady = useCallback((data: unknown) => {
    const d = data as {
      orderItemId: string;
      itemName: string;
      itemNameEs: string;
      destination: string;
      tableNumber: number;
      tableName: string | null;
    };
    const newNotification: Notification = {
      id: d.orderItemId + "-" + Date.now(),
      itemName: d.itemName,
      itemNameEs: d.itemNameEs,
      destination: d.destination,
      tableNumber: d.tableNumber,
      tableName: d.tableName,
      timestamp: Date.now(),
      read: false,
    };
    setNotifications((prev) => {
      const updated = [newNotification, ...prev];
      saveNotifications(updated);
      return updated;
    });
    lastFetchRef.current = Date.now();

    // Play notification sound
    try {
      const audio = new Audio("/notification.mp3");
      audio.volume = 0.5;
      audio.play().catch(() => {});
    } catch {
      // No audio available
    }
  }, []);

  usePusherChannel(
    userId ? `private-server-${userId}` : null,
    "item-ready",
    handleItemReady
  );

  function markRead(id: string) {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }

  function clearAll() {
    setNotifications([]);
    setShowClearConfirm(false);
  }

  const subscribeToPush = async () => {
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        localStorage.setItem(PUSH_STATE_KEY, "blocked");
        setPushState("blocked");
        return;
      }

      const reg = await navigator.serviceWorker.ready;
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidKey) return;

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
    } catch {
      // Subscription failed
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  function formatTime(timestamp: number) {
    const diff = Math.floor((Date.now() - timestamp) / 1000);
    if (diff < 60) return `${diff}s`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    return `${Math.floor(diff / 3600)}h`;
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-gray-800">
            {t("notifications.title")}
          </h2>
          {unreadCount > 0 && (
            <span className="bg-red-500 text-white text-xs font-bold rounded-full min-w-[24px] h-6 flex items-center justify-center px-1.5">
              {unreadCount}
            </span>
          )}
        </div>
        {notifications.length > 0 && (
          <button
            onClick={() => setShowClearConfirm(true)}
            className="h-10 px-4 text-sm text-gray-500 font-medium rounded-lg active:bg-gray-100 touch-manipulation transition-colors"
          >
            {t("notifications.clearAll")}
          </button>
        )}
      </div>

      {/* Push notification status */}
      {pushSupported && pushState !== "subscribed" && (
        <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <svg className="w-5 h-5 text-blue-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
              </svg>
              <p className="text-sm text-blue-800">
                {pushState === "blocked"
                  ? t("notifications.pushBlocked")
                  : t("notifications.enablePush")}
              </p>
            </div>
            {pushState !== "blocked" && (
              <button
                onClick={subscribeToPush}
                className="h-10 px-4 text-sm font-semibold text-white bg-blue-600 rounded-lg active:bg-blue-700 touch-manipulation shrink-0"
              >
                {t("common.confirm")}
              </button>
            )}
          </div>
        </div>
      )}

      {pushState === "subscribed" && (
        <div className="mb-4 rounded-xl border border-green-200 bg-green-50 p-3 flex items-center gap-2">
          <svg className="w-5 h-5 text-green-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <p className="text-sm text-green-700 font-medium">{t("notifications.pushEnabled")}</p>
        </div>
      )}

      {notifications.length === 0 ? (
        <div className="text-center py-16">
          <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          <p className="text-gray-400 text-lg">{t("notifications.empty")}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`rounded-xl p-4 border transition-colors ${
                n.read
                  ? "bg-white border-gray-200"
                  : "bg-green-50 border-green-200"
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">
                    {locale === "es" ? n.itemNameEs : n.itemName}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    {t("notifications.itemReady", {
                      item: locale === "es" ? n.itemNameEs : n.itemName,
                      destination: n.destination,
                    })}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    {t("tables.tableNumber", { number: n.tableNumber })}
                    {n.tableName && ` (${n.tableName})`}
                  </p>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <span className="text-xs text-gray-400">
                    {formatTime(n.timestamp)}
                  </span>
                  {!n.read && (
                    <button
                      onClick={() => markRead(n.id)}
                      className="h-9 px-3 text-xs text-blue-600 font-medium rounded-lg active:bg-blue-50 touch-manipulation whitespace-nowrap transition-colors"
                    >
                      {t("notifications.markRead")}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmModal
        open={showClearConfirm}
        title={t("notifications.clearAll")}
        message={t("notifications.clearAllConfirm")}
        confirmLabel={t("notifications.clearAll")}
        cancelLabel={t("common.cancel")}
        variant="danger"
        onConfirm={clearAll}
        onCancel={() => setShowClearConfirm(false)}
      />
    </div>
  );
}
