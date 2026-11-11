import { LoginLocaleProvider } from "@/components/LoginLocaleProvider";
import type { AppLocale } from "@/i18n/config";
import en from "../../../messages/en.json";
import pt from "../../../messages/pt.json";

const messagesByLocale = {
  pt,
  en,
} as Record<AppLocale, Record<string, unknown>>;

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <LoginLocaleProvider messagesByLocale={messagesByLocale}>
      {children}
    </LoginLocaleProvider>
  );
}
