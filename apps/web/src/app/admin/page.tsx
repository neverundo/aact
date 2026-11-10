"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchMe, logout, type AuthUser } from "@/lib/auth";

export default function AdminHomePage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    fetchMe()
      .then((me) => {
        if (me.session.mfa_setup_only) {
          router.replace("/admin/security?setup=1");
          return;
        }
        setUser(me);
      })
      .catch(() => router.replace("/login"));
  }, [router]);

  if (!user) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-16 text-stone-600">
        A carregar…
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-full w-full max-w-3xl flex-col gap-6 px-6 py-16">
      <p className="text-sm font-medium tracking-[0.2em] text-stone-500 uppercase">
        /admin
      </p>
      <h1 className="text-3xl font-semibold tracking-tight text-stone-900">
        Área administrativa
      </h1>
      <p className="text-stone-600">
        Olá, {user.name}. A UI só orienta; policies e MFA são enforced no
        backend.
      </p>

      <nav className="flex flex-wrap gap-3" aria-label="Admin">
        <Link
          href="/admin/businesses"
          className="rounded-md bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700"
        >
          Businesses
        </Link>
        <Link
          href="/admin/invitations"
          className="rounded-md border border-stone-300 px-4 py-2 text-sm font-medium hover:bg-stone-100"
        >
          Convites
        </Link>
        <Link
          href="/admin/memberships"
          className="rounded-md border border-stone-300 px-4 py-2 text-sm font-medium hover:bg-stone-100"
        >
          Memberships
        </Link>
        <Link
          href="/admin/payment-methods"
          className="rounded-md border border-stone-300 px-4 py-2 text-sm font-medium hover:bg-stone-100"
        >
          Pagamentos
        </Link>
        <Link
          href="/admin/integrations"
          className="rounded-md border border-stone-300 px-4 py-2 text-sm font-medium hover:bg-stone-100"
        >
          Integrações
        </Link>
        <Link
          href="/admin/commission-rules"
          className="rounded-md border border-stone-300 px-4 py-2 text-sm font-medium hover:bg-stone-100"
        >
          Regras
        </Link>
        <Link
          href="/admin/events"
          className="rounded-md border border-stone-300 px-4 py-2 text-sm font-medium hover:bg-stone-100"
        >
          Eventos
        </Link>
        <Link
          href="/admin/payout-requests"
          className="rounded-md border border-stone-300 px-4 py-2 text-sm font-medium hover:bg-stone-100"
        >
          Payouts
        </Link>
        <Link
          href="/admin/security"
          className="rounded-md border border-stone-300 px-4 py-2 text-sm font-medium hover:bg-stone-100"
        >
          Segurança
        </Link>
        <button
          type="button"
          className="rounded-md px-4 py-2 text-sm font-medium text-stone-700 underline-offset-2 hover:underline"
          onClick={async () => {
            await logout();
            router.replace("/login");
          }}
        >
          Terminar sessão
        </button>
      </nav>
    </main>
  );
}
