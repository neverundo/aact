import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { APP_LOCALE_COOKIE, normalizeLocale } from "./config";

export default getRequestConfig(async () => {
  const store = await cookies();
  const locale = normalizeLocale(store.get(APP_LOCALE_COOKIE)?.value);

  const base = (await import(`../../messages/${locale}.json`)).default;
  const help = (await import(`../../messages/help/${locale}.json`)).default;

  return {
    locale,
    messages: { ...base, help },
  };
});
