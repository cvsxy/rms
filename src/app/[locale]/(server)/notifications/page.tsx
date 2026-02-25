"use client";

import { useTranslations } from "next-intl";

export default function NotificationsPage() {
  const t = useTranslations();
  return (
    <div className="p-4">
      <h2 className="text-xl font-bold text-gray-800 mb-4">{t("notifications.title")}</h2>
      <div className="text-center text-gray-400 py-12">{t("notifications.empty")}</div>
    </div>
  );
}
