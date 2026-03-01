"use client";

import { useTranslations } from "next-intl";
import GuideSection from "./GuideSection";
import GuideCallout from "./GuideCallout";

function H3({ children }: { children: React.ReactNode }) {
  return <h3 className="text-lg font-semibold text-gray-800 mb-2 mt-6">{children}</h3>;
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="text-gray-700 leading-relaxed">{children}</p>;
}

function ColorBadge({ color, children }: { color: string; children: React.ReactNode }) {
  const colors: Record<string, string> = {
    green: "bg-green-100 text-green-800 border-green-200",
    red: "bg-red-100 text-red-800 border-red-200",
    yellow: "bg-amber-100 text-amber-800 border-amber-200",
    blue: "bg-blue-100 text-blue-800 border-blue-200",
    gray: "bg-gray-100 text-gray-800 border-gray-200",
    purple: "bg-purple-100 text-purple-800 border-purple-200",
  };
  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium ${colors[color] || colors.gray}`}>
      <span className={`w-2.5 h-2.5 rounded-full ${color === "green" ? "bg-green-500" : color === "red" ? "bg-red-500" : color === "yellow" ? "bg-amber-500" : color === "blue" ? "bg-blue-500" : color === "gray" ? "bg-gray-500" : "bg-purple-500"}`} />
      {children}
    </div>
  );
}

export default function ServerGuideSections() {
  const t = useTranslations("guide");

  return (
    <>
      {/* 1. Getting Started */}
      <GuideSection id="getting-started" title={t("gettingStarted.title")}>
        <P>{t("gettingStarted.intro")}</P>
        <H3>{t("gettingStarted.loginTitle")}</H3>
        <P>{t("gettingStarted.loginBody")}</P>
        <GuideCallout type="tip">{t("gettingStarted.loginTip")}</GuideCallout>
        <H3>{t("gettingStarted.languageTitle")}</H3>
        <P>{t("gettingStarted.languageBody")}</P>
        <H3>{t("gettingStarted.layoutTitle")}</H3>
        <P>{t("gettingStarted.layoutBody")}</P>
      </GuideSection>

      {/* 2. Tables */}
      <GuideSection id="tables" title={t("tables.title")}>
        <P>{t("tables.intro")}</P>
        <H3>{t("tables.colorsTitle")}</H3>
        <div className="flex flex-wrap gap-3 mb-4">
          <ColorBadge color="green">{t("tables.colorsGreen")}</ColorBadge>
        </div>
        <div className="flex flex-wrap gap-3 mb-4">
          <ColorBadge color="red">{t("tables.colorsRed")}</ColorBadge>
        </div>
        <div className="flex flex-wrap gap-3 mb-4">
          <ColorBadge color="yellow">{t("tables.colorsYellow")}</ColorBadge>
        </div>
        <H3>{t("tables.openingTitle")}</H3>
        <P>{t("tables.openingBody")}</P>
        <H3>{t("tables.viewingTitle")}</H3>
        <P>{t("tables.viewingBody")}</P>
        <H3>{t("tables.layoutTitle")}</H3>
        <P>{t("tables.layoutBody")}</P>
        <GuideCallout type="note">{t("tables.refreshNote")}</GuideCallout>
      </GuideSection>

      {/* 3. Taking Orders */}
      <GuideSection id="taking-orders" title={t("takingOrders.title")}>
        <P>{t("takingOrders.intro")}</P>
        <H3>{t("takingOrders.categoriesTitle")}</H3>
        <P>{t("takingOrders.categoriesBody")}</P>
        <H3>{t("takingOrders.searchTitle")}</H3>
        <P>{t("takingOrders.searchBody")}</P>
        <H3>{t("takingOrders.itemDetailTitle")}</H3>
        <P>{t("takingOrders.itemDetailBody")}</P>
        <H3>{t("takingOrders.modifiersTitle")}</H3>
        <P>{t("takingOrders.modifiersBody")}</P>
        <H3>{t("takingOrders.seatPickerTitle")}</H3>
        <P>{t("takingOrders.seatPickerBody")}</P>
        <H3>{t("takingOrders.notesTitle")}</H3>
        <P>{t("takingOrders.notesBody")}</P>
        <H3>{t("takingOrders.cartTitle")}</H3>
        <P>{t("takingOrders.cartBody")}</P>
        <H3>{t("takingOrders.clearCartTitle")}</H3>
        <P>{t("takingOrders.clearCartBody")}</P>
        <H3>{t("takingOrders.sendingTitle")}</H3>
        <P>{t("takingOrders.sendingBody")}</P>
        <GuideCallout type="tip">{t("takingOrders.sendingTip")}</GuideCallout>
        <H3>{t("takingOrders.eightySixTitle")}</H3>
        <P>{t("takingOrders.eightySixBody")}</P>
      </GuideSection>

      {/* 4. Managing Orders */}
      <GuideSection id="managing-orders" title={t("managingOrders.title")}>
        <P>{t("managingOrders.intro")}</P>
        <H3>{t("managingOrders.viewingTitle")}</H3>
        <P>{t("managingOrders.viewingBody")}</P>
        <H3>{t("managingOrders.statusesTitle")}</H3>
        <div className="space-y-2 mb-4">
          <div className="flex items-start gap-3">
            <ColorBadge color="yellow">Pending</ColorBadge>
            <P>{t("managingOrders.statusPending")}</P>
          </div>
          <div className="flex items-start gap-3">
            <ColorBadge color="blue">Preparing</ColorBadge>
            <P>{t("managingOrders.statusPreparing")}</P>
          </div>
          <div className="flex items-start gap-3">
            <ColorBadge color="green">Ready</ColorBadge>
            <P>{t("managingOrders.statusReady")}</P>
          </div>
          <div className="flex items-start gap-3">
            <ColorBadge color="gray">Served</ColorBadge>
            <P>{t("managingOrders.statusServed")}</P>
          </div>
        </div>
        <H3>{t("managingOrders.markServedTitle")}</H3>
        <P>{t("managingOrders.markServedBody")}</P>
        <H3>{t("managingOrders.voidingTitle")}</H3>
        <P>{t("managingOrders.voidingBody")}</P>
        <GuideCallout type="important">{t("managingOrders.voidingTip")}</GuideCallout>
        <H3>{t("managingOrders.cancelTitle")}</H3>
        <P>{t("managingOrders.cancelBody")}</P>
      </GuideSection>

      {/* 5. Bills & Payment */}
      <GuideSection id="bills-payment" title={t("billsPayment.title")}>
        <P>{t("billsPayment.intro")}</P>
        <H3>{t("billsPayment.viewingBillTitle")}</H3>
        <P>{t("billsPayment.viewingBillBody")}</P>
        <H3>{t("billsPayment.seatFilterTitle")}</H3>
        <P>{t("billsPayment.seatFilterBody")}</P>
        <H3>{t("billsPayment.tipsTitle")}</H3>
        <P>{t("billsPayment.tipsBody")}</P>
        <H3>{t("billsPayment.discountsTitle")}</H3>
        <P>{t("billsPayment.discountsBody")}</P>
        <H3>{t("billsPayment.paymentTitle")}</H3>
        <P>{t("billsPayment.paymentBody")}</P>
        <GuideCallout type="important">{t("billsPayment.paymentTip")}</GuideCallout>
      </GuideSection>

      {/* 6. Notifications */}
      <GuideSection id="notifications" title={t("notifications.title")}>
        <P>{t("notifications.intro")}</P>
        <H3>{t("notifications.realtimeTitle")}</H3>
        <P>{t("notifications.realtimeBody")}</P>
        <H3>{t("notifications.pushTitle")}</H3>
        <P>{t("notifications.pushBody")}</P>
        <GuideCallout type="note">{t("notifications.pushBlockedNote")}</GuideCallout>
        <H3>{t("notifications.managingTitle")}</H3>
        <P>{t("notifications.managingBody")}</P>
      </GuideSection>

      {/* 7. My Orders */}
      <GuideSection id="my-orders" title={t("myOrders.title")}>
        <P>{t("myOrders.intro")}</P>
        <P>{t("myOrders.historyBody")}</P>
        <P>{t("myOrders.datePickerBody")}</P>
      </GuideSection>

      {/* 8. Tips & Tricks */}
      <GuideSection id="tips-tricks" title={t("tipsTricks.title")}>
        <div className="space-y-4">
          <div>
            <H3>{t("tipsTricks.tip1Title")}</H3>
            <P>{t("tipsTricks.tip1")}</P>
          </div>
          <div>
            <H3>{t("tipsTricks.tip2Title")}</H3>
            <P>{t("tipsTricks.tip2")}</P>
          </div>
          <div>
            <H3>{t("tipsTricks.tip3Title")}</H3>
            <P>{t("tipsTricks.tip3")}</P>
          </div>
          <div>
            <H3>{t("tipsTricks.tip4Title")}</H3>
            <P>{t("tipsTricks.tip4")}</P>
          </div>
          <div>
            <H3>{t("tipsTricks.tip5Title")}</H3>
            <P>{t("tipsTricks.tip5")}</P>
          </div>
          <div>
            <H3>{t("tipsTricks.tip6Title")}</H3>
            <P>{t("tipsTricks.tip6")}</P>
          </div>
        </div>
      </GuideSection>
    </>
  );
}
