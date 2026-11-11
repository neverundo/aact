export const locales = ["pt", "en"] as const;

export type AppLocale = (typeof locales)[number];

export const defaultLocale: AppLocale = "pt";

export const APP_LOCALE_COOKIE = "NEXT_LOCALE";
export const LOGIN_LOCALE_COOKIE = "aact.login_locale";

export const htmlLangByLocale: Record<AppLocale, string> = {
  pt: "pt-PT",
  en: "en-GB",
};

export const intlLocaleByAppLocale: Record<AppLocale, string> = {
  pt: "pt-PT",
  en: "en-GB",
};

export function isAppLocale(value: string | null | undefined): value is AppLocale {
  return value === "pt" || value === "en";
}

export function normalizeLocale(
  value: string | null | undefined,
): AppLocale {
  return isAppLocale(value) ? value : defaultLocale;
}
