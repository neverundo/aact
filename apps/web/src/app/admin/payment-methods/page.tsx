"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { PageHeader } from "@/components/shell/PageHeader";
import { PromptForm } from "@/components/shell/PromptForm";
import { useShell } from "@/components/shell/ShellProvider";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge, toneForStatus } from "@/components/ui/StatusBadge";
import { apiFetch } from "@/lib/api";
import { fetchMe } from "@/lib/auth";
import { formatDateTime, type AppLocale } from "@/lib/locale";

type PaymentMethod = {
  id: number;
  uuid: string;
  method_type: string;
  display_mask: string;
  status: string;
  version: number;
  reviewed_at: string | null;
  review_notes: string | null;
  created_at: string | null;
  user?: { id: number; name: string; email: string };
  business?: { id: number; name: string };
};

const STATUS_FILTERS = [
  "pending_review",
  "approved",
  "rejected",
  "superseded",
  "all",
] as const;

export default function AdminPaymentMethodsPage() {
  const router = useRouter();
  const { openDrawer, closeDrawer } = useShell();
  const locale = useLocale() as AppLocale;
  const t = useTranslations("admin.paymentMethods");
  const tCommon = useTranslations("common");
  const tStatus = useTranslations("enums.paymentMethodStatus");
  const tType = useTranslations("enums.paymentMethodType");
  const [items, setItems] = useState<PaymentMethod[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("pending_review");
  const [error, setError] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<Record<number, unknown>>({});
  const [loading, setLoading] = useState(true);

  const filterLabels: Record<(typeof STATUS_FILTERS)[number], string> = {
    pending_review: t("filterPending"),
    approved: t("filterApproved"),
    rejected: t("filterRejected"),
    superseded: t("filterSuperseded"),
    all: t("filterAll"),
  };

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    const response = await apiFetch<{ data: PaymentMethod[] }>(
      `/api/v1/admin/payment-methods?${params.toString()}`,
    );
    setItems(response.data);
  }, [statusFilter]);

  useEffect(() => {
    void (async () => {
      try {
        const me = await fetchMe();
        if (me.session.mfa_setup_only) {
          router.replace("/admin/security?setup=1");
          return;
        }
        await load();
      } catch (err) {
        const status = (err as { status?: number }).status;
        if (status === 401) {
          router.replace("/login");
          return;
        }
        setError(err instanceof Error ? err.message : tCommon("noAccess"));
      } finally {
        setLoading(false);
      }
    })();
  }, [router, load, tCommon]);

  async function review(id: number, status: "approved" | "rejected") {
    setError(null);
    try {
      await apiFetch(`/api/v1/admin/payment-methods/${id}/review`, {
        method: "POST",
        body: JSON.stringify({ status }),
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("reviewFailed"));
    }
  }

  function openRevealDrawer(id: number) {
    openDrawer({
      id: `reveal-pm-${id}`,
      title: t("revealTitle"),
      description: t("revealDescription"),
      content: (
        <PromptForm
          label={t("password")}
          submitLabel={t("revealSubmit")}
          inputType="password"
          onCancel={closeDrawer}
          onSubmit={async (password) => {
            await apiFetch("/api/v1/auth/step-up", {
              method: "POST",
              body: JSON.stringify({ method: "password", password }),
            });
            const response = await apiFetch<{ payload: unknown }>(
              `/api/v1/admin/payment-methods/${id}/reveal`,
              { method: "POST" },
            );
            setRevealed((prev) => ({ ...prev, [id]: response.payload }));
            setError(null);
            closeDrawer();
          }}
        />
      ),
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("title")}
        description={t("description")}
        helpKey="admin.payment-methods"
      />

      <div
        className="flex flex-wrap gap-2"
        role="tablist"
        aria-label={t("filterAria")}
      >
        {STATUS_FILTERS.map((filter) => (
          <button
            key={filter}
            type="button"
            role="tab"
            aria-selected={statusFilter === filter}
            className={`min-h-11 rounded-md border px-3 py-1.5 text-sm font-medium ${
              statusFilter === filter
                ? "border-stone-900 bg-stone-900 text-white"
                : "border-stone-300 hover:bg-stone-100"
            }`}
            onClick={() => setStatusFilter(filter)}
          >
            {filterLabels[filter]}
          </button>
        ))}
      </div>

      {error ? (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="text-sm text-stone-500">{tCommon("loading")}</p>
      ) : items.length === 0 && !error ? (
        <EmptyState
          title={t("emptyTitle")}
          description={t("emptyDescription")}
        />
      ) : (
        <ul className="divide-y divide-stone-200 border-y border-stone-200">
          {items.map((item) => {
            const methodType = tType.has(item.method_type)
              ? tType(item.method_type)
              : item.method_type;
            const statusLabel = tStatus.has(item.status)
              ? tStatus(item.status)
              : item.status;
            return (
              <li key={item.id} className="space-y-2 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-stone-900">
                        {t("itemTitle", {
                          name:
                            item.user?.name ??
                            item.user?.email ??
                            `#${item.id}`,
                          code: methodType,
                          count: item.version,
                        })}
                      </p>
                      <StatusBadge tone={toneForStatus(item.status)}>
                        {statusLabel}
                      </StatusBadge>
                    </div>
                    <p className="text-sm text-stone-500">
                      {item.user?.email ?? tCommon("noEmail")} ·{" "}
                      {item.business?.name ?? tCommon("none")}
                    </p>
                    <p className="font-mono text-sm text-stone-600">
                      {item.display_mask}
                    </p>
                    {item.reviewed_at ? (
                      <p className="text-xs text-stone-500">
                        {item.review_notes
                          ? t("reviewedNotes", {
                              date: formatDateTime(item.reviewed_at, locale),
                              title: item.review_notes,
                            })
                          : tCommon("reviewedAt", {
                              date: formatDateTime(item.reviewed_at, locale),
                            })}
                      </p>
                    ) : item.created_at ? (
                      <p className="text-xs text-stone-500">
                        {tCommon("createdAt", {
                          date: formatDateTime(item.created_at, locale),
                        })}
                      </p>
                    ) : null}
                    {revealed[item.id] ? (
                      <pre className="mt-2 overflow-x-auto rounded bg-stone-100 p-2 text-xs">
                        {JSON.stringify(revealed[item.id], null, 2)}
                      </pre>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {item.status === "pending_review" ? (
                      <>
                        <button
                          type="button"
                          className="min-h-11 rounded-md bg-stone-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-stone-700"
                          onClick={() => review(item.id, "approved")}
                        >
                          {tCommon("approve")}
                        </button>
                        <button
                          type="button"
                          className="min-h-11 rounded-md border border-stone-300 px-3 py-1.5 text-xs font-medium hover:bg-stone-100"
                          onClick={() => review(item.id, "rejected")}
                        >
                          {tCommon("reject")}
                        </button>
                      </>
                    ) : null}
                    <button
                      type="button"
                      className="min-h-11 rounded-md border border-stone-300 px-3 py-1.5 text-xs font-medium hover:bg-stone-100"
                      onClick={() => openRevealDrawer(item.id)}
                    >
                      {tCommon("reveal")}
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
