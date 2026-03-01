"use client";

import { useTranslations } from "next-intl";
import GuideLayout from "@/components/guide/GuideLayout";
import ServerGuideSections from "@/components/guide/ServerGuideSections";

const SERVER_SECTIONS = [
  { id: "getting-started", titleKey: "gettingStarted.title" },
  { id: "tables", titleKey: "tables.title" },
  { id: "taking-orders", titleKey: "takingOrders.title" },
  { id: "managing-orders", titleKey: "managingOrders.title" },
  { id: "bills-payment", titleKey: "billsPayment.title" },
  { id: "notifications", titleKey: "notifications.title" },
  { id: "my-orders", titleKey: "myOrders.title" },
  { id: "tips-tricks", titleKey: "tipsTricks.title" },
];

export default function ServerGuidePage() {
  const t = useTranslations("guide");

  const sections = SERVER_SECTIONS.map((s) => ({
    id: s.id,
    title: t(s.titleKey),
  }));

  return (
    <GuideLayout title={t("serverGuideTitle")} sections={sections} isServer>
      <ServerGuideSections />
    </GuideLayout>
  );
}
