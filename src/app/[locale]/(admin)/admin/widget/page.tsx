"use client";

import { useTranslations, useLocale } from "next-intl";
import { useState, useEffect, useRef } from "react";

export default function WidgetSettingsPage() {
  const t = useTranslations("widgetSettings");
  const locale = useLocale();

  const [maxPartySize, setMaxPartySize] = useState("12");
  const [advanceDays, setAdvanceDays] = useState("30");
  const [widgetEnabled, setWidgetEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copiedEmbed, setCopiedEmbed] = useState(false);
  const embedRef = useRef<HTMLTextAreaElement>(null);

  // The public URL for the widget
  const baseUrl =
    typeof window !== "undefined"
      ? `${window.location.protocol}//${window.location.host}`
      : "";
  const widgetUrl = `${baseUrl}/${locale}/reserve`;
  const embedCode = `<iframe src="${widgetUrl}" style="width:100%;min-height:500px;border:none;" allow="clipboard-write"></iframe>`;

  // Load current settings
  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch("/api/settings");
        if (res.ok) {
          const json = await res.json();
          const data = json.data || {};
          if (data.widget_max_party_size) setMaxPartySize(data.widget_max_party_size);
          if (data.widget_advance_days) setAdvanceDays(data.widget_advance_days);
          if (data.widget_enabled !== undefined) setWidgetEnabled(data.widget_enabled !== "false");
        }
      } catch {
        // Use defaults
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  async function saveSetting(key: string, value: string) {
    await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, value }),
    });
  }

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    try {
      await Promise.all([
        saveSetting("widget_max_party_size", maxPartySize),
        saveSetting("widget_advance_days", advanceDays),
        saveSetting("widget_enabled", String(widgetEnabled)),
      ]);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      // Error handling
    } finally {
      setSaving(false);
    }
  }

  function copyEmbed() {
    if (embedRef.current) {
      embedRef.current.select();
      navigator.clipboard.writeText(embedCode);
      setCopiedEmbed(true);
      setTimeout(() => setCopiedEmbed(false), 2000);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-xl font-semibold text-gray-900">{t("title")}</h1>
        <div className="admin-card p-6 flex justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-indigo-600 border-t-transparent" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">{t("title")}</h1>
        <p className="mt-1 text-sm text-gray-500">{t("subtitle")}</p>
      </div>

      {/* Embed Code */}
      <div className="admin-card p-6 space-y-4">
        <h2 className="text-base font-semibold text-gray-900">{t("embedCode")}</h2>
        <p className="text-sm text-gray-500">{t("embedDescription")}</p>

        <div className="relative">
          <textarea
            ref={embedRef}
            readOnly
            value={embedCode}
            rows={3}
            className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2.5 text-sm font-mono text-gray-700 focus:outline-none"
          />
          <button
            type="button"
            onClick={copyEmbed}
            className="absolute top-2 right-2 rounded-md bg-white border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors shadow-sm"
          >
            {copiedEmbed ? t("copied") : t("copy")}
          </button>
        </div>

        <div className="rounded-lg bg-indigo-50 px-3 py-2 text-sm text-indigo-700">
          {t("widgetUrl")}: <a href={widgetUrl} target="_blank" rel="noopener noreferrer" className="font-medium underline">{widgetUrl}</a>
        </div>
      </div>

      {/* Settings */}
      <div className="admin-card p-6 space-y-5">
        <h2 className="text-base font-semibold text-gray-900">{t("settings")}</h2>

        {/* Enabled toggle */}
        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-medium text-gray-700">{t("enabled")}</label>
            <p className="text-xs text-gray-500">{t("enabledDescription")}</p>
          </div>
          <button
            type="button"
            onClick={() => setWidgetEnabled(!widgetEnabled)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              widgetEnabled ? "bg-indigo-600" : "bg-gray-300"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                widgetEnabled ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>

        {/* Max party size */}
        <div>
          <label className="admin-label">{t("maxPartySize")}</label>
          <p className="text-xs text-gray-500 mb-1.5">{t("maxPartySizeDescription")}</p>
          <input
            type="number"
            min={1}
            max={50}
            value={maxPartySize}
            onChange={(e) => setMaxPartySize(e.target.value)}
            className="admin-input w-24"
          />
        </div>

        {/* Advance days */}
        <div>
          <label className="admin-label">{t("advanceDays")}</label>
          <p className="text-xs text-gray-500 mb-1.5">{t("advanceDaysDescription")}</p>
          <input
            type="number"
            min={1}
            max={365}
            value={advanceDays}
            onChange={(e) => setAdvanceDays(e.target.value)}
            className="admin-input w-24"
          />
        </div>

        {/* Save button */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60 transition-colors"
          >
            {saving ? t("saving") : t("save")}
          </button>
          {saved && (
            <span className="text-sm text-emerald-600 font-medium">{t("saved")}</span>
          )}
        </div>
      </div>

      {/* Preview */}
      <div className="admin-card p-6 space-y-4">
        <h2 className="text-base font-semibold text-gray-900">{t("preview")}</h2>
        <p className="text-sm text-gray-500">{t("previewDescription")}</p>

        <div className="rounded-xl border border-gray-200 overflow-hidden bg-white">
          <iframe
            src={widgetUrl}
            className="w-full border-none"
            style={{ minHeight: 520 }}
            title="Reservation Widget Preview"
          />
        </div>
      </div>
    </div>
  );
}
