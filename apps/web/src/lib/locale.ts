import {
  APP_LOCALE_COOKIE,
  LOGIN_LOCALE_COOKIE,
  defaultLocale,
  htmlLangByLocale,
  intlLocaleByAppLocale,
  isAppLocale,
  normalizeLocale,
  type AppLocale,
} from "@/i18n/config";

export {
  APP_LOCALE_COOKIE,
  LOGIN_LOCALE_COOKIE,
  defaultLocale,
  htmlLangByLocale,
  intlLocaleByAppLocale,
  isAppLocale,
  normalizeLocale,
  type AppLocale,
};

function readCookie(name: string): string | null {
  if (typeof document === "undefined") {
    return null;
  }

  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${name}=`));

  return match ? decodeURIComponent(match.split("=").slice(1).join("=")) : null;
}

function writeCookie(name: string, value: string): void {
  if (typeof document === "undefined") {
    return;
  }

  const maxAge = 60 * 60 * 24 * 365;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; samesite=lax`;
}

export function getAppLocale(): AppLocale {
  return normalizeLocale(readCookie(APP_LOCALE_COOKIE));
}

export function setAppLocale(locale: AppLocale): void {
  writeCookie(APP_LOCALE_COOKIE, locale);
  if (typeof document !== "undefined") {
    document.documentElement.lang = htmlLangByLocale[locale];
  }
}

export function getLoginLocale(): AppLocale {
  return normalizeLocale(readCookie(LOGIN_LOCALE_COOKIE));
}

export function setLoginLocale(locale: AppLocale): void {
  writeCookie(LOGIN_LOCALE_COOKIE, locale);
  if (typeof document !== "undefined") {
    document.documentElement.lang = htmlLangByLocale[locale];
  }
}

export function formatDateTime(
  value: string | Date,
  locale: AppLocale = getAppLocale(),
): string {
  const date = value instanceof Date ? value : new Date(value);
  return date.toLocaleString(intlLocaleByAppLocale[locale]);
}

function currencyFractionDigits(currency: string, intlLocale: string): number {
  try {
    return (
      new Intl.NumberFormat(intlLocale, {
        style: "currency",
        currency,
      }).resolvedOptions().maximumFractionDigits ?? 2
    );
  } catch {
    return 2;
  }
}

/** Format ledger minor units (e.g. cents) as a localized currency string. */
export function formatMoney(
  amountMinor: number,
  currency: string,
  locale: AppLocale = getAppLocale(),
): string {
  const intlLocale = intlLocaleByAppLocale[locale];
  const code = (currency || "EUR").toUpperCase();
  const digits = currencyFractionDigits(code, intlLocale);
  const major = amountMinor / 10 ** digits;

  try {
    return new Intl.NumberFormat(intlLocale, {
      style: "currency",
      currency: code,
    }).format(major);
  } catch {
    return `${major.toFixed(digits)} ${code}`;
  }
}
