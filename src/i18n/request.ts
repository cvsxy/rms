import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;
  if (!locale || !routing.locales.includes(locale as "es" | "en")) {
    locale = routing.defaultLocale;
  }
  const main = (await import(`../messages/${locale}.json`)).default;
  const guide = (await import(`../messages/guide-${locale}.json`)).default;
  return {
    locale,
    messages: { ...main, ...guide },
  };
});
