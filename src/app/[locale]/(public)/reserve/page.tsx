"use client";

import { useTranslations } from "next-intl";
import { useState, useEffect, useRef, useCallback } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface TimeSlot {
  time: string;
  available: boolean;
  tablesAvailable: number;
}

interface WidgetSettings {
  widget_enabled: boolean;
  widget_max_party_size: number;
  widget_advance_days: number;
}

type Step = 1 | 2 | 3 | "confirmed";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function todayISO(): string {
  const d = new Date();
  return d.toISOString().split("T")[0];
}

function maxDateISO(advanceDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + advanceDays);
  return d.toISOString().split("T")[0];
}

function formatDateDisplay(iso: string, locale: string): string {
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString(locale === "es" ? "es-MX" : "en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatTime12(time24: string): string {
  const [h, m] = time24.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 || 12;
  return `${hour12}:${m.toString().padStart(2, "0")} ${period}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function ReserveWidgetPage() {
  const t = useTranslations("widget");

  // ---- Settings -----------------------------------------------------------
  const [settings, setSettings] = useState<WidgetSettings>({
    widget_enabled: true,
    widget_max_party_size: 12,
    widget_advance_days: 30,
  });
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  // ---- Step & selection state ---------------------------------------------
  const [step, setStep] = useState<Step>(1);
  const [date, setDate] = useState(todayISO());
  const [partySize, setPartySize] = useState(2);
  const [showCustomSize, setShowCustomSize] = useState(false);
  const [customSize, setCustomSize] = useState("");
  const [selectedTime, setSelectedTime] = useState("");

  // ---- Availability -------------------------------------------------------
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // ---- Guest form ---------------------------------------------------------
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestNotes, setGuestNotes] = useState("");
  const [honeypot, setHoneypot] = useState("");

  // ---- UI state -----------------------------------------------------------
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // ---- Confirmed reservation data -----------------------------------------
  const [confirmedData, setConfirmedData] = useState<{
    date: string;
    time: string;
    partySize: number;
    guestName: string;
  } | null>(null);

  // ---- Refs ---------------------------------------------------------------
  const bodyRef = useRef<HTMLDivElement>(null);

  // ---- Detect locale from path --------------------------------------------
  const locale =
    typeof window !== "undefined"
      ? window.location.pathname.split("/")[1] || "es"
      : "es";

  // =========================================================================
  // Effects
  // =========================================================================

  // Fetch widget settings on mount
  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch("/api/settings");
        if (res.ok) {
          const json = await res.json();
          const data = json.data || {};
          setSettings({
            widget_enabled: data.widget_enabled !== "false",
            widget_max_party_size: data.widget_max_party_size
              ? parseInt(data.widget_max_party_size)
              : 12,
            widget_advance_days: data.widget_advance_days
              ? parseInt(data.widget_advance_days)
              : 30,
          });
        }
      } catch {
        // Use defaults if settings fail to load
      } finally {
        setSettingsLoaded(true);
      }
    }
    loadSettings();
  }, []);

  // ResizeObserver for iframe integration
  useEffect(() => {
    if (typeof window === "undefined" || !bodyRef.current) return;

    const sendHeight = () => {
      const height = document.body.scrollHeight;
      window.parent.postMessage({ type: "rms:resize", height }, "*");
    };

    const observer = new ResizeObserver(() => sendHeight());
    observer.observe(bodyRef.current);
    sendHeight();

    return () => observer.disconnect();
  }, [step]);

  // =========================================================================
  // Handlers
  // =========================================================================

  const fetchAvailability = useCallback(async () => {
    setLoadingSlots(true);
    setError("");
    try {
      const res = await fetch(
        `/api/reservations/availability?date=${date}&partySize=${partySize}`
      );
      if (res.status === 429) {
        setError(t("rateLimitError"));
        return;
      }
      if (!res.ok) {
        setError(t("genericError"));
        return;
      }
      const json = await res.json();
      setSlots(json.data?.slots || []);
      setStep(2);
    } catch {
      setError(t("genericError"));
    } finally {
      setLoadingSlots(false);
    }
  }, [date, partySize, t]);

  const handleCheckAvailability = (e: React.FormEvent) => {
    e.preventDefault();
    fetchAvailability();
  };

  const handleSelectTime = (time: string) => {
    setSelectedTime(time);
    setError("");
    setStep(3);
  };

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();

    // Honeypot check
    if (honeypot) return;

    if (!guestName.trim() || !guestPhone.trim()) {
      setError(t("requiredFields"));
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/reservations/public", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guestName: guestName.trim(),
          guestPhone: guestPhone.trim(),
          guestEmail: guestEmail.trim() || undefined,
          date,
          time: selectedTime,
          partySize,
          notes: guestNotes.trim() || undefined,
          source: "WEBSITE",
        }),
      });

      if (res.status === 429) {
        setError(t("rateLimitError"));
        setLoading(false);
        return;
      }

      if (res.status === 409) {
        setError(t("slotTaken"));
        setStep(2);
        setLoading(false);
        // Re-fetch availability
        fetchAvailability();
        return;
      }

      if (!res.ok) {
        const json = await res.json().catch(() => null);
        setError(json?.error || t("genericError"));
        setLoading(false);
        return;
      }

      const confirmed = {
        date,
        time: selectedTime,
        partySize,
        guestName: guestName.trim(),
      };
      setConfirmedData(confirmed);
      setStep("confirmed");

      // Notify parent frame
      window.parent.postMessage(
        { type: "rms:reservation-confirmed", reservation: confirmed },
        "*"
      );
    } catch {
      setError(t("genericError"));
    } finally {
      setLoading(false);
    }
  };

  const goBack = (toStep: Step) => {
    setError("");
    setStep(toStep);
  };

  const handleCustomPartySize = () => {
    const size = parseInt(customSize);
    if (size > 0 && size <= settings.widget_max_party_size) {
      setPartySize(size);
      setShowCustomSize(false);
      setCustomSize("");
    }
  };

  // =========================================================================
  // Loading / disabled states
  // =========================================================================

  if (!settingsLoaded) {
    return (
      <div ref={bodyRef} className="flex items-center justify-center p-8">
        <div className="h-8 w-8 animate-spin rounded-full border-3 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  if (!settings.widget_enabled) {
    return (
      <div ref={bodyRef} className="px-4 py-12 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
          <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
        </div>
        <p className="text-base font-medium text-gray-600">{t("widgetDisabled")}</p>
      </div>
    );
  }

  // =========================================================================
  // Render
  // =========================================================================
  return (
    <div ref={bodyRef} className="mx-auto max-w-md px-4 py-6">
      {/* ================================================================= */}
      {/* Step 1 — Party Details                                            */}
      {/* ================================================================= */}
      {step === 1 && (
        <form onSubmit={handleCheckAvailability} className="space-y-5">
          <h1 className="text-xl font-semibold text-gray-900">{t("title")}</h1>

          {/* Date picker */}
          <div>
            <label htmlFor="res-date" className="mb-1.5 block text-sm font-medium text-gray-700">
              {t("dateLabel")}
            </label>
            <input
              id="res-date"
              type="date"
              value={date}
              min={todayISO()}
              max={maxDateISO(settings.widget_advance_days)}
              onChange={(e) => setDate(e.target.value)}
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
            />
          </div>

          {/* Party size */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              {t("partySizeLabel")}
            </label>

            {!showCustomSize ? (
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: 8 }, (_, i) => i + 1).map((n) => (
                  <button
                    type="button"
                    key={n}
                    onClick={() => setPartySize(n)}
                    className={`flex h-11 w-11 items-center justify-center rounded-lg border text-base font-medium transition-colors ${
                      partySize === n
                        ? "border-indigo-600 bg-indigo-600 text-white"
                        : "border-gray-300 bg-white text-gray-700 hover:border-indigo-300 hover:bg-indigo-50"
                    }`}
                  >
                    {n}
                  </button>
                ))}
                {settings.widget_max_party_size > 8 && (
                  <button
                    type="button"
                    onClick={() => setShowCustomSize(true)}
                    className={`flex h-11 w-11 items-center justify-center rounded-lg border text-base font-medium transition-colors ${
                      partySize > 8
                        ? "border-indigo-600 bg-indigo-600 text-white"
                        : "border-gray-300 bg-white text-gray-700 hover:border-indigo-300 hover:bg-indigo-50"
                    }`}
                    title={t("largerParty")}
                  >
                    {partySize > 8 ? partySize : "+"}
                  </button>
                )}
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  type="number"
                  min={9}
                  max={settings.widget_max_party_size}
                  value={customSize}
                  onChange={(e) => setCustomSize(e.target.value)}
                  placeholder={`9-${settings.widget_max_party_size}`}
                  autoFocus
                  className="w-24 rounded-lg border border-gray-300 px-3 py-2.5 text-base text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleCustomPartySize}
                  className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
                >
                  {t("set")}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCustomSize(false);
                    setCustomSize("");
                    if (partySize > 8) setPartySize(2);
                  }}
                  className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  {t("cancelCustomSize")}
                </button>
              </div>
            )}
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loadingSlots}
            className="flex h-12 w-full items-center justify-center rounded-lg bg-indigo-600 text-base font-semibold text-white transition-colors hover:bg-indigo-700 disabled:opacity-60"
          >
            {loadingSlots ? (
              <span className="flex items-center gap-2">
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                {t("checking")}
              </span>
            ) : (
              t("checkAvailability")
            )}
          </button>
        </form>
      )}

      {/* ================================================================= */}
      {/* Step 2 — Time Selection                                           */}
      {/* ================================================================= */}
      {step === 2 && (
        <div className="space-y-5">
          <div>
            <button
              type="button"
              onClick={() => goBack(1)}
              className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-700"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              {t("back")}
            </button>
            <h2 className="text-lg font-semibold text-gray-900">{t("selectTime")}</h2>
            <p className="mt-1 text-sm text-gray-500">
              {formatDateDisplay(date, locale)} &middot;{" "}
              {t("partyOf", { count: partySize })}
            </p>
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          {slots.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-500">
              {t("noSlots")}
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {slots.map((slot) => (
                <button
                  key={slot.time}
                  type="button"
                  disabled={!slot.available}
                  onClick={() => slot.available && handleSelectTime(slot.time)}
                  className={`h-11 rounded-lg border text-sm font-medium transition-colors ${
                    slot.available
                      ? selectedTime === slot.time
                        ? "border-indigo-600 bg-indigo-600 text-white"
                        : "border-gray-300 bg-white text-gray-700 hover:border-indigo-400 hover:bg-indigo-50"
                      : "cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400 line-through"
                  }`}
                >
                  {formatTime12(slot.time)}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ================================================================= */}
      {/* Step 3 — Guest Info + Confirm                                     */}
      {/* ================================================================= */}
      {step === 3 && (
        <form onSubmit={handleConfirm} className="space-y-5">
          <div>
            <button
              type="button"
              onClick={() => goBack(2)}
              className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-700"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              {t("back")}
            </button>
            <h2 className="text-lg font-semibold text-gray-900">{t("guestDetails")}</h2>
            <p className="mt-1 text-sm text-gray-500">
              {t("partyOf", { count: partySize })} &middot;{" "}
              {formatDateDisplay(date, locale)} &middot; {formatTime12(selectedTime)}
            </p>
          </div>

          {/* Honeypot */}
          <input
            type="text"
            name="website"
            className="hidden"
            tabIndex={-1}
            autoComplete="off"
            value={honeypot}
            onChange={(e) => setHoneypot(e.target.value)}
          />

          {/* Name */}
          <div>
            <label htmlFor="guest-name" className="mb-1.5 block text-sm font-medium text-gray-700">
              {t("nameLabel")} <span className="text-red-500">*</span>
            </label>
            <input
              id="guest-name"
              type="text"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              required
              maxLength={100}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
            />
          </div>

          {/* Phone */}
          <div>
            <label htmlFor="guest-phone" className="mb-1.5 block text-sm font-medium text-gray-700">
              {t("phoneLabel")} <span className="text-red-500">*</span>
            </label>
            <input
              id="guest-phone"
              type="tel"
              value={guestPhone}
              onChange={(e) => setGuestPhone(e.target.value)}
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
            />
          </div>

          {/* Email */}
          <div>
            <label htmlFor="guest-email" className="mb-1.5 block text-sm font-medium text-gray-700">
              {t("emailLabel")}
            </label>
            <input
              id="guest-email"
              type="email"
              value={guestEmail}
              onChange={(e) => setGuestEmail(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
            />
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="guest-notes" className="mb-1.5 block text-sm font-medium text-gray-700">
              {t("notesLabel")}
            </label>
            <textarea
              id="guest-notes"
              value={guestNotes}
              onChange={(e) => setGuestNotes(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder={t("notesPlaceholder")}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none resize-none"
            />
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex h-12 w-full items-center justify-center rounded-lg bg-indigo-600 text-base font-semibold text-white transition-colors hover:bg-indigo-700 disabled:opacity-60"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                {t("confirming")}
              </span>
            ) : (
              t("confirmReservation")
            )}
          </button>
        </form>
      )}

      {/* ================================================================= */}
      {/* Confirmation Screen                                               */}
      {/* ================================================================= */}
      {step === "confirmed" && confirmedData && (
        <div className="space-y-6 py-4 text-center">
          {/* Checkmark icon */}
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
            <svg className="h-8 w-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-gray-900">{t("confirmed")}</h2>
            <p className="mt-1 text-sm text-gray-500">{t("pendingMessage")}</p>
          </div>

          {/* Reservation details card */}
          <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-4 text-left">
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-500">{t("nameLabel")}</dt>
                <dd className="font-medium text-gray-900">{confirmedData.guestName}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">{t("dateLabel")}</dt>
                <dd className="font-medium text-gray-900">
                  {formatDateDisplay(confirmedData.date, locale)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">{t("timeLabel")}</dt>
                <dd className="font-medium text-gray-900">
                  {formatTime12(confirmedData.time)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">{t("partySizeLabel")}</dt>
                <dd className="font-medium text-gray-900">{confirmedData.partySize}</dd>
              </div>
            </dl>
          </div>

          <button
            type="button"
            onClick={() => {
              setStep(1);
              setDate(todayISO());
              setPartySize(2);
              setSelectedTime("");
              setGuestName("");
              setGuestPhone("");
              setGuestEmail("");
              setGuestNotes("");
              setError("");
              setConfirmedData(null);
            }}
            className="inline-flex h-11 items-center justify-center rounded-lg border border-gray-300 px-6 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            {t("newReservation")}
          </button>
        </div>
      )}
    </div>
  );
}
