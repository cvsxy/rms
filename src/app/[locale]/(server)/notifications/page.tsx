"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations, useLocale } from "next-intl";
import { usePusherChannel } from "@/hooks/usePusher";

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

export default function NotificationsPage() {
  const t = useTranslations();
  const locale = useLocale();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  // Get current user ID for Pusher channel
  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((data) => {
        if (data.userId) setUserId(data.userId);
      })
      .catch(() => {});
  }, []);

  const handleItemReady = useCallback((data: unknown) => {
    const d = data as {
      orderItemId: string;
      itemName: string;
      itemNameEs: string;
      destination: string;
      tableNumber: number;
      tableName: string | null;
    };
    setNotifications((prev) => [
      {
        id: d.orderItemId + "-" + Date.now(),
        itemName: d.itemName,
        itemNameEs: d.itemNameEs,
        destination: d.destination,
        tableNumber: d.tableNumber,
        tableName: d.tableName,
        timestamp: Date.now(),
        read: false,
      },
      ...prev,
    ]);

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
  }

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
            <span className="bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </div>
        {notifications.length > 0 && (
          <button
            onClick={clearAll}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            {t("notifications.clearAll")}
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-6xl mb-4">
            <svg className="w-16 h-16 mx-auto text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </div>
          <p className="text-gray-400 text-lg">{t("notifications.empty")}</p>
          {!userId && (
            <p className="text-gray-300 text-sm mt-2">
              Pusher channel: waiting for session...
            </p>
          )}
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
                <div className="flex items-center gap-3 ml-4">
                  <span className="text-xs text-gray-400">
                    {formatTime(n.timestamp)}
                  </span>
                  {!n.read && (
                    <button
                      onClick={() => markRead(n.id)}
                      className="text-xs text-blue-600 hover:text-blue-800 font-medium whitespace-nowrap"
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
    </div>
  );
}
