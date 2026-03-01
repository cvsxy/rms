"use client";

import { useTranslations } from "next-intl";
import GuideLayout from "@/components/guide/GuideLayout";
import GuideSection from "@/components/guide/GuideSection";
import GuideCallout from "@/components/guide/GuideCallout";
import ServerGuideSections from "@/components/guide/ServerGuideSections";

function H3({ children }: { children: React.ReactNode }) {
  return <h3 className="text-lg font-semibold text-gray-800 mb-2 mt-6">{children}</h3>;
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="text-gray-700 leading-relaxed">{children}</p>;
}

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

const ADMIN_SECTIONS = [
  { id: "admin-dashboard", titleKey: "admin.dashboard.title" },
  { id: "admin-servers", titleKey: "admin.servers.title" },
  { id: "admin-menu", titleKey: "admin.menu.title" },
  { id: "admin-tables", titleKey: "admin.tables.title" },
  { id: "admin-inventory", titleKey: "admin.inventory.title" },
  { id: "admin-reports", titleKey: "admin.reports.title" },
  { id: "admin-operations", titleKey: "admin.operations.title" },
  { id: "admin-discounts", titleKey: "admin.discounts.title" },
  { id: "admin-audit", titleKey: "admin.audit.title" },
  { id: "admin-displays", titleKey: "admin.displays.title" },
];

export default function AdminGuidePage() {
  const t = useTranslations("guide");

  const sections = [
    ...SERVER_SECTIONS.map((s) => ({
      id: s.id,
      title: t(s.titleKey),
      group: "server",
    })),
    ...ADMIN_SECTIONS.map((s) => ({
      id: s.id,
      title: t(s.titleKey),
      group: "admin",
    })),
  ];

  return (
    <GuideLayout
      title={t("adminGuideTitle")}
      sections={sections}
      groupLabels={{
        server: t("serverSectionsHeader"),
        admin: t("adminSectionsHeader"),
      }}
    >
      {/* Server sections (shared) */}
      <ServerGuideSections />

      {/* Divider between server and admin sections */}
      <div className="my-12 flex items-center gap-4">
        <div className="flex-1 border-t-2 border-indigo-200" />
        <span className="text-sm font-semibold text-indigo-600 uppercase tracking-wider whitespace-nowrap">
          {t("adminSectionsHeader")}
        </span>
        <div className="flex-1 border-t-2 border-indigo-200" />
      </div>

      {/* 9. Dashboard */}
      <GuideSection id="admin-dashboard" title={t("admin.dashboard.title")}>
        <P>{t("admin.dashboard.intro")}</P>
        <H3>{t("admin.dashboard.statsTitle")}</H3>
        <P>{t("admin.dashboard.statsBody")}</P>
        <H3>{t("admin.dashboard.widgetsTitle")}</H3>
        <P>{t("admin.dashboard.widgetsBody")}</P>
        <H3>{t("admin.dashboard.chartsTitle")}</H3>
        <P>{t("admin.dashboard.chartsBody")}</P>
        <H3>{t("admin.dashboard.leaderboardTitle")}</H3>
        <P>{t("admin.dashboard.leaderboardBody")}</P>
        <H3>{t("admin.dashboard.dailyCloseTitle")}</H3>
        <P>{t("admin.dashboard.dailyCloseBody")}</P>
        <H3>{t("admin.dashboard.queueTitle")}</H3>
        <P>{t("admin.dashboard.queueBody")}</P>
      </GuideSection>

      {/* 10. Managing Servers */}
      <GuideSection id="admin-servers" title={t("admin.servers.title")}>
        <P>{t("admin.servers.intro")}</P>
        <H3>{t("admin.servers.addingTitle")}</H3>
        <P>{t("admin.servers.addingBody")}</P>
        <H3>{t("admin.servers.pinsTitle")}</H3>
        <P>{t("admin.servers.pinsBody")}</P>
        <H3>{t("admin.servers.editingTitle")}</H3>
        <P>{t("admin.servers.editingBody")}</P>
      </GuideSection>

      {/* 11. Managing the Menu */}
      <GuideSection id="admin-menu" title={t("admin.menu.title")}>
        <P>{t("admin.menu.intro")}</P>
        <H3>{t("admin.menu.categoriesTitle")}</H3>
        <P>{t("admin.menu.categoriesBody")}</P>
        <H3>{t("admin.menu.itemsTitle")}</H3>
        <P>{t("admin.menu.itemsBody")}</P>
        <H3>{t("admin.menu.modifiersTitle")}</H3>
        <P>{t("admin.menu.modifiersBody")}</P>
        <H3>{t("admin.menu.ingredientsTitle")}</H3>
        <P>{t("admin.menu.ingredientsBody")}</P>
        <H3>{t("admin.menu.bilingualTitle")}</H3>
        <P>{t("admin.menu.bilingualBody")}</P>
        <H3>{t("admin.menu.eightySixTitle")}</H3>
        <P>{t("admin.menu.eightySixBody")}</P>
        <H3>{t("admin.menu.autoEightySixTitle")}</H3>
        <P>{t("admin.menu.autoEightySixBody")}</P>
        <GuideCallout type="tip">{t("admin.menu.autoEightySixTip")}</GuideCallout>
      </GuideSection>

      {/* 12. Managing Tables */}
      <GuideSection id="admin-tables" title={t("admin.tables.title")}>
        <P>{t("admin.tables.intro")}</P>
        <H3>{t("admin.tables.listViewTitle")}</H3>
        <P>{t("admin.tables.listViewBody")}</P>
        <H3>{t("admin.tables.addingTitle")}</H3>
        <P>{t("admin.tables.addingBody")}</P>
        <H3>{t("admin.tables.layoutViewTitle")}</H3>
        <P>{t("admin.tables.layoutViewBody")}</P>
        <H3>{t("admin.tables.enableLayoutTitle")}</H3>
        <P>{t("admin.tables.enableLayoutBody")}</P>
      </GuideSection>

      {/* 13. Inventory */}
      <GuideSection id="admin-inventory" title={t("admin.inventory.title")}>
        <P>{t("admin.inventory.intro")}</P>
        <H3>{t("admin.inventory.addingTitle")}</H3>
        <P>{t("admin.inventory.addingBody")}</P>
        <H3>{t("admin.inventory.stockLevelsTitle")}</H3>
        <P>{t("admin.inventory.stockLevelsBody")}</P>
        <H3>{t("admin.inventory.deliveryTitle")}</H3>
        <P>{t("admin.inventory.deliveryBody")}</P>
        <H3>{t("admin.inventory.autoDeductTitle")}</H3>
        <P>{t("admin.inventory.autoDeductBody")}</P>
        <H3>{t("admin.inventory.autoEightySixTitle")}</H3>
        <P>{t("admin.inventory.autoEightySixBody")}</P>
        <H3>{t("admin.inventory.lowStockTitle")}</H3>
        <P>{t("admin.inventory.lowStockBody")}</P>
        <H3>{t("admin.inventory.costTitle")}</H3>
        <P>{t("admin.inventory.costBody")}</P>
      </GuideSection>

      {/* 14. Reports */}
      <GuideSection id="admin-reports" title={t("admin.reports.title")}>
        <P>{t("admin.reports.intro")}</P>
        <H3>{t("admin.reports.dateRangeTitle")}</H3>
        <P>{t("admin.reports.dateRangeBody")}</P>
        <H3>{t("admin.reports.overviewTitle")}</H3>
        <P>{t("admin.reports.overviewBody")}</P>
        <H3>{t("admin.reports.taxTitle")}</H3>
        <P>{t("admin.reports.taxBody")}</P>
        <H3>{t("admin.reports.costAnalysisTitle")}</H3>
        <P>{t("admin.reports.costAnalysisBody")}</P>
        <H3>{t("admin.reports.serverPerfTitle")}</H3>
        <P>{t("admin.reports.serverPerfBody")}</P>
        <H3>{t("admin.reports.dailyCloseTitle")}</H3>
        <P>{t("admin.reports.dailyCloseBody")}</P>
        <H3>{t("admin.reports.exportTitle")}</H3>
        <P>{t("admin.reports.exportBody")}</P>
      </GuideSection>

      {/* 15. Live Operations */}
      <GuideSection id="admin-operations" title={t("admin.operations.title")}>
        <P>{t("admin.operations.intro")}</P>
        <H3>{t("admin.operations.statsTitle")}</H3>
        <P>{t("admin.operations.statsBody")}</P>
        <H3>{t("admin.operations.queuesTitle")}</H3>
        <P>{t("admin.operations.queuesBody")}</P>
        <H3>{t("admin.operations.serverWorkloadTitle")}</H3>
        <P>{t("admin.operations.serverWorkloadBody")}</P>
        <H3>{t("admin.operations.eightySixAlertTitle")}</H3>
        <P>{t("admin.operations.eightySixAlertBody")}</P>
        <H3>{t("admin.operations.refreshTitle")}</H3>
        <P>{t("admin.operations.refreshBody")}</P>
      </GuideSection>

      {/* 16. Discounts */}
      <GuideSection id="admin-discounts" title={t("admin.discounts.title")}>
        <P>{t("admin.discounts.intro")}</P>
        <H3>{t("admin.discounts.creatingTitle")}</H3>
        <P>{t("admin.discounts.creatingBody")}</P>
        <H3>{t("admin.discounts.typesTitle")}</H3>
        <P>{t("admin.discounts.typesBody")}</P>
        <H3>{t("admin.discounts.applyingTitle")}</H3>
        <P>{t("admin.discounts.applyingBody")}</P>
        <H3>{t("admin.discounts.trackingTitle")}</H3>
        <P>{t("admin.discounts.trackingBody")}</P>
      </GuideSection>

      {/* 17. Audit Log */}
      <GuideSection id="admin-audit" title={t("admin.audit.title")}>
        <P>{t("admin.audit.intro")}</P>
        <H3>{t("admin.audit.filteringTitle")}</H3>
        <P>{t("admin.audit.filteringBody")}</P>
        <H3>{t("admin.audit.actionsTitle")}</H3>
        <P>{t("admin.audit.actionsBody")}</P>
        <H3>{t("admin.audit.readingTitle")}</H3>
        <P>{t("admin.audit.readingBody")}</P>
        <H3>{t("admin.audit.usageTitle")}</H3>
        <P>{t("admin.audit.usageBody")}</P>
      </GuideSection>

      {/* 18. Kitchen & Bar Displays */}
      <GuideSection id="admin-displays" title={t("admin.displays.title")}>
        <P>{t("admin.displays.intro")}</P>
        <H3>{t("admin.displays.accessTitle")}</H3>
        <P>{t("admin.displays.accessBody")}</P>
        <H3>{t("admin.displays.whatShowsTitle")}</H3>
        <P>{t("admin.displays.whatShowsBody")}</P>
        <H3>{t("admin.displays.timerTitle")}</H3>
        <P>{t("admin.displays.timerBody")}</P>
        <H3>{t("admin.displays.markReadyTitle")}</H3>
        <P>{t("admin.displays.markReadyBody")}</P>
        <H3>{t("admin.displays.collapsibleTitle")}</H3>
        <P>{t("admin.displays.collapsibleBody")}</P>
      </GuideSection>
    </GuideLayout>
  );
}
