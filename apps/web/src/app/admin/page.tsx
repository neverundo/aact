"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/shell/PageHeader";
import { useRequireAuth } from "@/hooks/useRequireAuth";

const shortcuts = [
  { href: "/admin/businesses", labelKey: "shortcutBusinesses" },
  { href: "/admin/invitations", labelKey: "shortcutInvitations" },
  { href: "/admin/memberships", labelKey: "shortcutMemberships" },
  { href: "/admin/events", labelKey: "shortcutEvents" },
  { href: "/admin/payout-requests", labelKey: "shortcutPayouts" },
] as const;

export default function AdminHomePage() {
  const { user, ready } = useRequireAuth();
  const t = useTranslations("admin.home");
  const tCommon = useTranslations("common");

  if (!ready || !user) {
    return <p className="text-stone-600">{tCommon("loading")}</p>;
  }

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title={t("title")}
        description={t("greeting", { name: user.name })}
      />

      <section className="space-y-3">
        <h2 className="text-sm font-medium tracking-wide text-stone-500 uppercase">
          {t("shortcuts")}
        </h2>
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {shortcuts.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="flex min-h-11 items-center rounded-md border border-stone-200 bg-white px-4 text-sm font-medium text-stone-900 hover:bg-stone-100"
              >
                {t(item.labelKey)}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
