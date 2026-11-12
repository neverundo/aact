"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { PageHeader } from "@/components/shell/PageHeader";
import { PromptForm } from "@/components/shell/PromptForm";
import { useShell } from "@/components/shell/ShellProvider";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge, toneForStatus } from "@/components/ui/StatusBadge";
import { apiFetch } from "@/lib/api";
import { fetchMe } from "@/lib/auth";
import { formatMoney, type AppLocale } from "@/lib/locale";

type PayoutRequest = {
  id: number;
  business_id: number;
  amount_minor: number;
  currency: string;
  status: string;
  status_reason: string | null;
  external_reference: string | null;
  business?: { id: number; name: string; payout_threshold_minor: number };
  payment_method?: {
    id: number;
    method_type: string;
    display_mask: string;
  };
  documents?: Array<{
    uuid: string;
    original_filename: string;
    scan_status: string;
  }>;
};

export default function AdminPayoutRequestsPage() {
  const router = useRouter();
  const locale = useLocale() as AppLocale;
  const { openDrawer, closeDrawer } = useShell();
  const t = useTranslations("admin.payoutRequests");
  const tCommon = useTranslations("common");
  const [items, setItems] = useState<PayoutRequest[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    const response = await apiFetch<{ data: PayoutRequest[] }>(
      "/api/v1/admin/payout-requests",
    );
    setItems(response.data);
  }

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
  }, [router, tCommon]);

  async function approve(id: number) {
    setError(null);
    setMessage(null);
    try {
      await apiFetch(`/api/v1/admin/payout-requests/${id}/approve`, {
        method: "POST",
      });
      setMessage(t("approved", { id }));
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("approveFailed"));
    }
  }

  function openRejectDrawer(id: number) {
    openDrawer({
      id: `reject-payout-${id}`,
      title: t("rejectTitle", { id }),
      content: (
        <PromptForm
          label={t("rejectReason")}
          submitLabel={tCommon("reject")}
          onCancel={closeDrawer}
          onSubmit={async (reason) => {
            await apiFetch(`/api/v1/admin/payout-requests/${id}/reject`, {
              method: "POST",
              body: JSON.stringify({ reason }),
            });
            setMessage(t("rejected", { id }));
            setError(null);
            closeDrawer();
            await load();
          }}
        />
      ),
    });
  }

  function openMarkPaidDrawer(id: number) {
    openDrawer({
      id: `mark-paid-${id}`,
      title: t("markPaidTitle", { id }),
      description: t("markPaidDescription"),
      content: (
        <PromptForm
          label={t("markPaidLabel")}
          submitLabel={t("markPaidSubmit")}
          placeholder={t("markPaidPlaceholder")}
          onCancel={closeDrawer}
          onSubmit={async (externalReference) => {
            await apiFetch(`/api/v1/admin/payout-requests/${id}/mark-paid`, {
              method: "POST",
              body: JSON.stringify({ external_reference: externalReference }),
            });
            setMessage(t("paid", { id }));
            setError(null);
            closeDrawer();
            await load();
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
        helpKey="admin.payout-requests"
      />

      {error ? (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
      {message ? <p className="text-sm text-emerald-800">{message}</p> : null}

      <PayoutRequestsContent
        loading={loading}
        error={error}
        items={items}
        locale={locale}
        onApprove={approve}
        onReject={openRejectDrawer}
        onMarkPaid={openMarkPaidDrawer}
      />
    </div>
  );
}

function payoutMethodTypeLabel(
  paymentMethod: PayoutRequest["payment_method"],
  tPmType: { has: (key: string) => boolean; (key: string): string },
): string | null {
  if (!paymentMethod) return null;
  if (tPmType.has(paymentMethod.method_type)) {
    return tPmType(paymentMethod.method_type);
  }
  return paymentMethod.method_type;
}

function PayoutRequestsContent({
  loading,
  error,
  items,
  locale,
  onApprove,
  onReject,
  onMarkPaid,
}: Readonly<{
  loading: boolean;
  error: string | null;
  items: PayoutRequest[];
  locale: AppLocale;
  onApprove: (id: number) => void;
  onReject: (id: number) => void;
  onMarkPaid: (id: number) => void;
}>) {
  const t = useTranslations("admin.payoutRequests");
  const tCommon = useTranslations("common");
  const tStatus = useTranslations("enums.payoutRequestStatus");
  const tPmType = useTranslations("enums.paymentMethodType");

  if (loading) {
    return <p className="text-sm text-stone-500">{tCommon("loading")}</p>;
  }

  if (items.length === 0 && !error) {
    return (
      <EmptyState
        title={t("emptyTitle")}
        description={t("emptyDescription")}
      />
    );
  }

  return (
    <ul className="divide-y divide-stone-200 border-y border-stone-200">
      {items.map((item) => {
        const statusLabel = tStatus.has(item.status)
          ? tStatus(item.status)
          : item.status;
        const methodType = payoutMethodTypeLabel(item.payment_method, tPmType);
        return (
          <li key={item.id} className="space-y-2 py-4">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-stone-900">
                    {t("amountLine", {
                      id: item.id,
                      amount: formatMoney(
                        item.amount_minor,
                        item.currency,
                        locale,
                      ),
                    })}
                  </p>
                  <StatusBadge tone={toneForStatus(item.status)}>
                    {statusLabel}
                  </StatusBadge>
                </div>
                <p className="text-sm text-stone-600">
                  {item.business?.name ??
                    t("businessFallback", { id: item.business_id })}
                  {item.payment_method && methodType
                    ? ` · ${methodType} ${item.payment_method.display_mask}`
                    : null}
                </p>
                {item.status_reason ? (
                  <p className="text-sm text-stone-500">{item.status_reason}</p>
                ) : null}
                {item.external_reference ? (
                  <p className="font-mono text-xs text-stone-500">
                    {item.external_reference}
                  </p>
                ) : null}
                {(item.documents ?? []).length > 0 ? (
                  <p className="text-xs text-stone-500">
                    {t("documents", {
                      documents: (item.documents ?? [])
                        .map((d) => d.original_filename)
                        .join(", "),
                    })}
                  </p>
                ) : null}
              </div>
              <div className="flex shrink-0 flex-col gap-2">
                {item.status === "pending" ? (
                  <>
                    <button
                      type="button"
                      className="min-h-11 rounded-md bg-stone-900 px-3 py-1.5 text-sm text-white hover:bg-stone-700"
                      onClick={() => onApprove(item.id)}
                    >
                      {tCommon("approve")}
                    </button>
                    <button
                      type="button"
                      className="min-h-11 rounded-md border border-stone-300 px-3 py-1.5 text-sm hover:bg-stone-100"
                      onClick={() => onReject(item.id)}
                    >
                      {tCommon("reject")}
                    </button>
                  </>
                ) : null}
                {item.status === "approved" ? (
                  <>
                    <button
                      type="button"
                      className="min-h-11 rounded-md bg-stone-900 px-3 py-1.5 text-sm text-white hover:bg-stone-700"
                      onClick={() => onMarkPaid(item.id)}
                    >
                      {t("markPaidSubmit")}
                    </button>
                    <button
                      type="button"
                      className="min-h-11 rounded-md border border-stone-300 px-3 py-1.5 text-sm hover:bg-stone-100"
                      onClick={() => onReject(item.id)}
                    >
                      {tCommon("reject")}
                    </button>
                  </>
                ) : null}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
