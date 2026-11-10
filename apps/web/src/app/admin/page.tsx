"use client";

import Link from "next/link";
import { PageHeader } from "@/components/shell/PageHeader";
import { useRequireAuth } from "@/hooks/useRequireAuth";

const shortcuts = [
  { href: "/admin/businesses", label: "Businesses" },
  { href: "/admin/invitations", label: "Convites" },
  { href: "/admin/memberships", label: "Memberships" },
  { href: "/admin/events", label: "Eventos" },
  { href: "/admin/payout-requests", label: "Payouts" },
] as const;

export default function AdminHomePage() {
  const { user, ready } = useRequireAuth();

  if (!ready || !user) {
    return <p className="text-stone-600">A carregar…</p>;
  }

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Área administrativa"
        description={`Olá, ${user.name}. Use a barra lateral para navegar. Policies e MFA são enforced no backend.`}
      />

      <section className="space-y-3">
        <h2 className="text-sm font-medium tracking-wide text-stone-500 uppercase">
          Atalhos
        </h2>
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {shortcuts.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="flex min-h-11 items-center rounded-md border border-stone-200 bg-white px-4 text-sm font-medium text-stone-900 hover:bg-stone-100"
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
