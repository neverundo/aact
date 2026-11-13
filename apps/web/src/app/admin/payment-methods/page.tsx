"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { PageHeader } from "@/components/shell/PageHeader";
import { PromptForm } from "@/components/shell/PromptForm";
import { useShell } from "@/components/shell/ShellProvider";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge, toneForStatus } from "@/components/ui/StatusBadge";
import { apiFetch, apiFetchBlob } from "@/lib/api";
import { fetchMe } from "@/lib/auth";
import { formatDateTime, type AppLocale } from "@/lib/locale";

type BankProofDocument = {
  uuid: string;
  purpose: string;
  original_filename: string;
  mime: string;
  size_bytes: number;
  scan_status: string;
  usable: boolean;
  created_at: string | null;
};

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
  has_bank_proof?: boolean;
  bank_proof_ready?: boolean;
  documents?: BankProofDocument[];
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
    if (statusFilter && statusFilter !== "all") {
      params.set("status", statusFilter);
    }
    const query = params.toString();
    const path = query
      ? `/api/v1/admin/payment-methods?${query}`
      : "/api/v1/admin/payment-methods";
    const response = await apiFetch<{ data: PaymentMethod[] }>(path);
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

  async function downloadDocument(doc: BankProofDocument) {
    setError(null);
    try {
      const blob = await apiFetchBlob(
        `/api/v1/portal/documents/${doc.uuid}/download`,
      );
      // Treat proof as untrusted opaque bytes — never preview/inline.
      const safeBlob = new Blob([await blob.arrayBuffer()], {
        type: "application/octet-stream",
      });
      const url = URL.createObjectURL(safeBlob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = doc.original_filename || "bank-proof.bin";
      anchor.rel = "noopener";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("downloadFailed"));
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

  function openReviewDrawer(
    item: PaymentMethod,
    decision: "approved" | "rejected",
  ) {
    const label =
      item.user?.name ?? item.user?.email ?? t("itemFallback", { id: item.id });
    openDrawer({
      id: `review-pm-${item.id}-${decision}`,
      title:
        decision === "approved"
          ? t("approveTitle", { name: label })
          : t("rejectTitle", { name: label }),
      description:
        decision === "approved"
          ? t("approveDescription")
          : t("rejectDescription"),
      content: (
        <PaymentMethodReviewForm
          decision={decision}
          onCancel={closeDrawer}
          onSubmit={async ({ password, code, notes }) => {
            await apiFetch(`/api/v1/admin/payment-methods/${item.id}/review`, {
              method: "POST",
              body: JSON.stringify({
                status: decision,
                password,
                code,
                ...(decision === "rejected" ? { notes } : {}),
              }),
            });
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

      <PaymentMethodsContent
        loading={loading}
        error={error}
        items={items}
        revealed={revealed}
        locale={locale}
        onReview={openReviewDrawer}
        onReveal={openRevealDrawer}
        onDownload={downloadDocument}
      />
    </div>
  );
}

function PaymentMethodReviewForm({
  decision,
  onSubmit,
  onCancel,
}: Readonly<{
  decision: "approved" | "rejected";
  onSubmit: (values: {
    password: string;
    code: string;
    notes?: string;
  }) => void | Promise<void>;
  onCancel: () => void;
}>) {
  const t = useTranslations("admin.paymentMethods");
  const tCommon = useTranslations("common");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLocalError(null);
    setLoading(true);
    try {
      await onSubmit({
        password,
        code,
        ...(decision === "rejected" ? { notes } : {}),
      });
    } catch (err) {
      setLocalError(
        err instanceof Error ? err.message : tCommon("submitFailed"),
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
      {decision === "rejected" ? (
        <label className="flex flex-col gap-1 text-sm">
          {t("rejectReason")}
          <textarea
            className="min-h-24 rounded-md border border-stone-300 px-3 py-2"
            value={notes}
            required
            maxLength={1000}
            onChange={(e) => setNotes(e.target.value)}
          />
        </label>
      ) : null}
      <label className="flex flex-col gap-1 text-sm">
        {t("password")}
        <input
          type="password"
          className="min-h-11 rounded-md border border-stone-300 px-3 py-2"
          value={password}
          required
          autoComplete="current-password"
          onChange={(e) => setPassword(e.target.value)}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        {t("totpCode")}
        <input
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          className="min-h-11 rounded-md border border-stone-300 px-3 py-2"
          value={code}
          required
          onChange={(e) => setCode(e.target.value)}
        />
      </label>
      <p className="text-xs text-stone-500">{t("sensitiveHint")}</p>
      {localError ? (
        <p className="text-sm text-red-700" role="alert">
          {localError}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={loading}
          className="min-h-11 rounded-md bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-60"
        >
          {loading
            ? tCommon("processing")
            : decision === "approved"
              ? tCommon("approve")
              : tCommon("reject")}
        </button>
        <button
          type="button"
          className="min-h-11 rounded-md border border-stone-300 px-4 py-2 text-sm font-medium hover:bg-stone-100"
          onClick={onCancel}
        >
          {tCommon("cancel")}
        </button>
      </div>
    </form>
  );
}

function PaymentMethodMeta({
  item,
  locale,
}: Readonly<{
  item: PaymentMethod;
  locale: AppLocale;
}>) {
  const t = useTranslations("admin.paymentMethods");
  const tCommon = useTranslations("common");

  if (item.reviewed_at) {
    const date = formatDateTime(item.reviewed_at, locale);
    return (
      <p className="text-xs text-stone-500">
        {item.review_notes
          ? t("reviewedNotes", { date, title: item.review_notes })
          : tCommon("reviewedAt", { date })}
      </p>
    );
  }

  if (item.created_at) {
    return (
      <p className="text-xs text-stone-500">
        {tCommon("createdAt", {
          date: formatDateTime(item.created_at, locale),
        })}
      </p>
    );
  }

  return null;
}

function PaymentMethodsContent({
  loading,
  error,
  items,
  revealed,
  locale,
  onReview,
  onReveal,
  onDownload,
}: Readonly<{
  loading: boolean;
  error: string | null;
  items: PaymentMethod[];
  revealed: Record<number, unknown>;
  locale: AppLocale;
  onReview: (item: PaymentMethod, decision: "approved" | "rejected") => void;
  onReveal: (id: number) => void;
  onDownload: (doc: BankProofDocument) => void;
}>) {
  const t = useTranslations("admin.paymentMethods");
  const tCommon = useTranslations("common");
  const tStatus = useTranslations("enums.paymentMethodStatus");
  const tType = useTranslations("enums.paymentMethodType");
  const tScan = useTranslations("enums.documentScanStatus");

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
        const methodType = tType.has(item.method_type)
          ? tType(item.method_type)
          : item.method_type;
        const statusLabel = tStatus.has(item.status)
          ? tStatus(item.status)
          : item.status;
        const docs = item.documents ?? [];
        const canApprove = Boolean(item.bank_proof_ready);

        return (
          <li key={item.id} className="space-y-3 py-4">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-stone-900">
                    {t("itemTitle", {
                      name:
                        item.user?.name ?? item.user?.email ?? `#${item.id}`,
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
                <PaymentMethodMeta item={item} locale={locale} />
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
                      disabled={!canApprove}
                      title={
                        canApprove ? undefined : t("approveDisabledHint")
                      }
                      className="min-h-11 rounded-md bg-stone-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-stone-700 disabled:cursor-not-allowed disabled:opacity-50"
                      onClick={() => onReview(item, "approved")}
                    >
                      {tCommon("approve")}
                    </button>
                    <button
                      type="button"
                      className="min-h-11 rounded-md border border-stone-300 px-3 py-1.5 text-xs font-medium hover:bg-stone-100"
                      onClick={() => onReview(item, "rejected")}
                    >
                      {tCommon("reject")}
                    </button>
                  </>
                ) : null}
                <button
                  type="button"
                  className="min-h-11 rounded-md border border-stone-300 px-3 py-1.5 text-xs font-medium hover:bg-stone-100"
                  onClick={() => onReveal(item.id)}
                >
                  {tCommon("reveal")}
                </button>
              </div>
            </div>

            <div className="space-y-2 rounded-md border border-stone-200 bg-stone-50 p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-stone-500">
                {t("bankProofHeading")}
              </p>
              {docs.length === 0 ? (
                <p className="text-sm text-amber-800">{t("bankProofMissing")}</p>
              ) : (
                <ul className="space-y-2">
                  {docs.map((doc) => {
                    const scanLabel = tScan.has(doc.scan_status)
                      ? tScan(doc.scan_status)
                      : doc.scan_status;
                    return (
                      <li
                        key={doc.uuid}
                        className="flex flex-wrap items-center justify-between gap-2"
                      >
                        <div className="flex min-w-0 flex-wrap items-center gap-2">
                          <span className="truncate text-sm text-stone-800">
                            {doc.original_filename}
                          </span>
                          <StatusBadge tone={toneForStatus(doc.scan_status)}>
                            {scanLabel}
                          </StatusBadge>
                        </div>
                        {doc.usable ? (
                          <button
                            type="button"
                            className="min-h-11 rounded-md border border-stone-300 px-3 py-1.5 text-xs font-medium hover:bg-white"
                            onClick={() => onDownload(doc)}
                          >
                            {t("download")}
                          </button>
                        ) : (
                          <span className="text-xs text-stone-500">
                            {t("downloadUnavailable")}
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
              {item.status === "pending_review" && !item.bank_proof_ready ? (
                <p className="text-xs text-amber-800">
                  {t("approveDisabledHint")}
                </p>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
