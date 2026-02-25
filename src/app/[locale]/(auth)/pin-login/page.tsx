"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";

export default function PinLoginPage() {
  const t = useTranslations("auth");
  const locale = useLocale();
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleDigit = (digit: string) => {
    if (pin.length < 6) {
      setPin((prev) => prev + digit);
      setError("");
    }
  };

  const handleBackspace = () => {
    setPin((prev) => prev.slice(0, -1));
    setError("");
  };

  const handleSubmit = async () => {
    if (pin.length < 4) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });

      if (res.ok) {
        router.push(`/${locale}/tables`);
        router.refresh();
      } else {
        setError(t("invalidPin"));
        setPin("");
      }
    } catch {
      setError(t("invalidPin"));
      setPin("");
    } finally {
      setLoading(false);
    }
  };

  const digits = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", ""];

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-blue-700 mb-2">RMS</h1>
          <p className="text-gray-600 text-lg">{t("enterPin")}</p>
        </div>

        {/* PIN dots */}
        <div className="flex justify-center gap-3 mb-6">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className={`w-4 h-4 rounded-full border-2 transition-colors ${
                i < pin.length
                  ? "bg-blue-600 border-blue-600"
                  : "border-gray-300 bg-white"
              }`}
            />
          ))}
        </div>

        {error && (
          <p className="text-red-500 text-center text-sm mb-4">{error}</p>
        )}

        {/* Number pad */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          {digits.map((digit, i) => {
            if (digit === "" && i === 9) {
              return <div key="empty-left" />;
            }
            if (digit === "" && i === 11) {
              return (
                <button
                  key="backspace"
                  onClick={handleBackspace}
                  className="h-16 rounded-xl bg-gray-200 text-gray-700 text-xl font-medium active:bg-gray-300 touch-manipulation"
                >
                  ⌫
                </button>
              );
            }
            return (
              <button
                key={digit}
                onClick={() => handleDigit(digit)}
                className="h-16 rounded-xl bg-white border border-gray-200 text-2xl font-medium text-gray-800 active:bg-blue-50 active:border-blue-300 touch-manipulation shadow-sm"
              >
                {digit}
              </button>
            );
          })}
        </div>

        {/* Submit button */}
        <button
          onClick={handleSubmit}
          disabled={pin.length < 4 || loading}
          className="w-full h-14 rounded-xl bg-blue-600 text-white text-lg font-semibold disabled:opacity-40 active:bg-blue-700 touch-manipulation transition-colors"
        >
          {loading ? "..." : t("login")}
        </button>

        {/* Admin login link + language toggle */}
        <div className="flex items-center justify-between mt-6">
          <a
            href={`/${locale}/admin-login`}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            {t("adminLogin")}
          </a>
          <LanguageToggle />
        </div>
      </div>
    </div>
  );
}

function LanguageToggle() {
  const locale = useLocale();
  const router = useRouter();

  const switchLocale = (newLocale: string) => {
    const path = window.location.pathname;
    const newPath = path.replace(`/${locale}`, `/${newLocale}`);
    router.push(newPath);
    router.refresh();
  };

  return (
    <div className="flex gap-1 text-sm">
      <button
        onClick={() => switchLocale("es")}
        className={`px-2 py-1 rounded touch-manipulation ${
          locale === "es" ? "bg-blue-100 text-blue-700 font-medium" : "text-gray-500"
        }`}
      >
        ES
      </button>
      <button
        onClick={() => switchLocale("en")}
        className={`px-2 py-1 rounded touch-manipulation ${
          locale === "en" ? "bg-blue-100 text-blue-700 font-medium" : "text-gray-500"
        }`}
      >
        EN
      </button>
    </div>
  );
}
