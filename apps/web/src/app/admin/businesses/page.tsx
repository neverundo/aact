"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shell/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge, toneForStatus } from "@/components/ui/StatusBadge";
import { apiFetch } from "@/lib/api";
import { fetchMe } from "@/lib/auth";

type Business = {
  id: number;
  name: string;
  slug: string;
  currency: string;
  is_active: boolean;
};

export default function AdminBusinessesPage() {
  const router = useRouter();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const me = await fetchMe();
        if (me.session.mfa_setup_only) {
          router.replace("/admin/security?setup=1");
          return;
        }
        const response = await apiFetch<{ data: Business[] }>(
          "/api/v1/admin/businesses",
        );
        setBusinesses(response.data);
      } catch (err) {
        const status = (err as { status?: number }).status;
        if (status === 401) {
          router.replace("/login");
          return;
        }
        setError(err instanceof Error ? err.message : "Sem acesso.");
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Businesses"
        description="Listagem isolada por membership. A autorização efetiva está no Laravel."
      />

      {error ? (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="text-sm text-stone-500">A carregar…</p>
      ) : businesses.length === 0 && !error ? (
        <EmptyState
          title="Sem businesses"
          description="Quando tiver acesso a um business, aparece aqui."
        />
      ) : (
        <ul className="divide-y divide-stone-200 border-y border-stone-200">
          {businesses.map((business) => (
            <li
              key={business.id}
              className="flex items-center justify-between gap-4 py-3"
            >
              <div>
                <p className="font-medium text-stone-900">{business.name}</p>
                <p className="text-sm text-stone-500">
                  {business.slug} · {business.currency}
                </p>
              </div>
              <StatusBadge
                tone={toneForStatus(business.is_active ? "ativo" : "inativo")}
              >
                {business.is_active ? "ativo" : "inativo"}
              </StatusBadge>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
