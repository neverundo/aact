"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { NextIntlClientProvider } from "next-intl";
import {
  getLoginLocale,
  setLoginLocale,
  type AppLocale,
} from "@/lib/locale";

type LoginLocaleContextValue = {
  locale: AppLocale;
  setLocale: (locale: AppLocale) => void;
};

const LoginLocaleContext = createContext<LoginLocaleContextValue | null>(null);

export function useLoginLocale(): LoginLocaleContextValue {
  const value = useContext(LoginLocaleContext);
  if (!value) {
    throw new Error("useLoginLocale must be used within LoginLocaleProvider");
  }
  return value;
}

export function LoginLocaleProvider({
  messagesByLocale,
  children,
}: {
  messagesByLocale: Record<AppLocale, AbstractIntlMessages>;
  children: ReactNode;
}) {
  const [locale, setLocaleState] = useState<AppLocale>(() => getLoginLocale());

  const setLocale = useCallback((next: AppLocale) => {
    setLoginLocale(next);
    setLocaleState(next);
  }, []);

  const value = useMemo(
    () => ({ locale, setLocale }),
    [locale, setLocale],
  );

  return (
    <LoginLocaleContext.Provider value={value}>
      <NextIntlClientProvider
        locale={locale}
        messages={messagesByLocale[locale]}
        key={locale}
      >
        {children}
      </NextIntlClientProvider>
    </LoginLocaleContext.Provider>
  );
}

type AbstractIntlMessages = Record<string, unknown>;
