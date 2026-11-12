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

type Business = { id: number; name: string };

type Membership = {
  id: number;
  role: string;
  status: string;
  status_reason: string | null;
  approved_at: string | null;
  user?: { id: number; name: string; email: string };
  business?: { id: number; name: string; slug: string };
  websites?: Array<{ id: number; name: string; base_url: string }>;
  payment_methods?: Array<{
    id: number;
    status: string;
    display_mask: string;
    version: number;
    method_type: string;
  }>;
  referral_codes?: Array<{ id: number; code: string; is_active: boolean }>;
};

const STATUS_FILTERS = [
  "",
  "pending",
  "approved",
  "rejected",
  "suspended",
] as const;

export default function AdminMembershipsPage() {
  const router = useRouter();
  const { openDrawer, closeDrawer } = useShell();
  const locale = useLocale() as AppLocale;
  const t = useTranslations("admin.memberships");
  const tCommon = useTranslations("common");
  const tStatus = useTranslations("enums.membershipStatus");
  const tRole = useTranslations("enums.membershipRole");
  const tPmStatus = useTranslations("enums.paymentMethodStatus");
  const tPmType = useTranslations("enums.paymentMethodType");
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [businessFilter, setBusinessFilter] = useState<number | "">("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const filterLabels: Record<(typeof STATUS_FILTERS)[number], string> = {
    "": t("filterAll"),
    pending: t("filterPending"),
    approved: t("filterApproved"),
    rejected: t("filterRejected"),
    suspended: t("filterSuspended"),
  };

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    if (businessFilter !== "") params.set("business_id", String(businessFilter));
    const query = params.toString();
    const membershipsPath = query
      ? `/api/v1/admin/memberships?${query}`
      : "/api/v1/admin/memberships";
    const [list, biz] = await Promise.all([
      apiFetch<{ data: Membership[] }>(membershipsPath),
      apiFetch<{ data: Business[] }>("/api/v1/admin/businesses"),
    ]);
    setMemberships(list.data);
    setBusinesses(biz.data);
  }, [statusFilter, businessFilter]);

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

  async function approve(id: number) {
    setError(null);
    setMessage(null);
    try {
      await apiFetch(`/api/v1/admin/memberships/${id}/approve`, {
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
      id: `reject-membership-${id}`,
      title: t("rejectTitle", { id }),
      description: t("rejectDescription"),
      content: (
        <PromptForm
          label={t("rejectReason")}
          submitLabel={tCommon("reject")}
          onCancel={closeDrawer}
          onSubmit={async (reason) => {
            await apiFetch(`/api/v1/admin/memberships/${id}/reject`, {
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

  function openSuspendDrawer(id: number) {
    openDrawer({
      id: `suspend-membership-${id}`,
      title: t("suspendTitle", { id }),
      description: t("suspendDescription"),
      content: (
        <PromptForm
          label={t("suspendReason")}
          submitLabel={tCommon("suspend")}
          onCancel={closeDrawer}
          onSubmit={async (reason) => {
            await apiFetch(`/api/v1/admin/memberships/${id}/suspend`, {
              method: "POST",
              body: JSON.stringify({ reason }),
            });
            setMessage(t("suspended", { id }));
            setError(null);
            closeDrawer();
            await load();
          }}
        />
      ),
    });
  }

  function openDetailDrawer(membership: Membership) {
    const roleLabel = tRole.has(membership.role)
      ? tRole(membership.role)
      : membership.role;
    const statusLabel = tStatus.has(membership.status)
      ? tStatus(membership.status)
      : membership.status;

    openDrawer({
      id: `membership-detail-${membership.id}`,
      title:
        membership.user?.name ??
        t("membershipFallback", { id: membership.id }),
      description: membership.user?.email ?? t("detailFallback"),
      content: (
        <div className="space-y-4 text-sm">
          <dl className="space-y-2">
            <div>
              <dt className="text-stone-500">{tCommon("business")}</dt>
              <dd className="font-medium text-stone-900">
                {membership.business?.name ?? tCommon("none")}
              </dd>
            </div>
            <div>
              <dt className="text-stone-500">{t("roleStatus")}</dt>
              <dd className="font-medium text-stone-900">
                {roleLabel} · {statusLabel}
              </dd>
            </div>
            {membership.status_reason ? (
              <div>
                <dt className="text-stone-500">{t("reason")}</dt>
                <dd>{membership.status_reason}</dd>
              </div>
            ) : null}
            {membership.approved_at ? (
              <div>
                <dt className="text-stone-500">{t("approvedAt")}</dt>
                <dd>{formatDateTime(membership.approved_at, locale)}</dd>
              </div>
            ) : null}
          </dl>

          <div>
            <p className="mb-1 font-medium text-stone-900">{t("websites")}</p>
            {(membership.websites?.length ?? 0) === 0 ? (
              <p className="text-stone-500">{t("noWebsitesAssigned")}</p>
            ) : (
              <ul className="list-inside list-disc text-stone-600">
                {membership.websites?.map((w) => (
                  <li key={w.id}>
                    {w.name} ({w.base_url})
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <p className="mb-1 font-medium text-stone-900">
              {t("paymentMethods")}
            </p>
            {(membership.payment_methods?.length ?? 0) === 0 ? (
              <p className="text-stone-500">{t("noPaymentMethods")}</p>
            ) : (
              <ul className="space-y-1 text-stone-600">
                {membership.payment_methods?.map((p) => (
                  <li key={p.id}>
                    v{p.version} ·{" "}
                    {tPmType.has(p.method_type)
                      ? tPmType(p.method_type)
                      : p.method_type}{" "}
                    ·{" "}
                    {tPmStatus.has(p.status) ? tPmStatus(p.status) : p.status} ·{" "}
                    <span className="font-mono">{p.display_mask}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <p className="mb-1 font-medium text-stone-900">{t("referralCodes")}</p>
            {(membership.referral_codes?.length ?? 0) === 0 ? (
              <p className="text-stone-500">{t("noReferralCodes")}</p>
            ) : (
              <ul className="space-y-1 text-stone-600">
                {membership.referral_codes?.map((c) => (
                  <li key={c.id}>
                    <span className="font-mono">{c.code}</span> ·{" "}
                    {c.is_active ? tCommon("active") : tCommon("inactive")}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <button
            type="button"
            className="min-h-11 w-full rounded-md border border-stone-300 px-3 py-2 text-sm font-medium hover:bg-stone-100"
            onClick={closeDrawer}
          >
            {tCommon("close")}
          </button>
        </div>
      ),
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("title")}
        description={t("description")}
        helpKey="admin.memberships"
      />

      <div className="flex flex-wrap gap-3">
        <label className="flex flex-col gap-1 text-sm">
          {tCommon("status")}
          <select
            className="min-h-11 rounded-md border border-stone-300 px-3 py-2"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            {STATUS_FILTERS.map((f) => (
              <option key={f || "all"} value={f}>
                {filterLabels[f]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          {tCommon("business")}
          <select
            className="min-h-11 rounded-md border border-stone-300 px-3 py-2"
            value={businessFilter}
            onChange={(e) =>
              setBusinessFilter(e.target.value ? Number(e.target.value) : "")
            }
          >
            <option value="">{t("filterAll")}</option>
            {businesses.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error ? (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
      {message ? <p className="text-sm text-emerald-800">{message}</p> : null}

      <MembershipsContent
        loading={loading}
        error={error}
        memberships={memberships}
        onDetail={openDetailDrawer}
        onApprove={approve}
        onReject={openRejectDrawer}
        onSuspend={openSuspendDrawer}
      />
    </div>
  );
}

function paymentStatusFragment(
  version: number,
  status: string,
  tPmStatus: { has: (key: string) => boolean; (key: string): string },
): string {
  const statusLabel = tPmStatus.has(status) ? tPmStatus(status) : status;
  return `v${version}:${statusLabel}`;
}

function MembershipsContent({
  loading,
  error,
  memberships,
  onDetail,
  onApprove,
  onReject,
  onSuspend,
}: Readonly<{
  loading: boolean;
  error: string | null;
  memberships: Membership[];
  onDetail: (membership: Membership) => void;
  onApprove: (id: number) => void;
  onReject: (id: number) => void;
  onSuspend: (id: number) => void;
}>) {
  const t = useTranslations("admin.memberships");
  const tCommon = useTranslations("common");
  const tStatus = useTranslations("enums.membershipStatus");
  const tRole = useTranslations("enums.membershipRole");
  const tPmStatus = useTranslations("enums.paymentMethodStatus");

  if (loading) {
    return <p className="text-sm text-stone-500">{tCommon("loading")}</p>;
  }

  if (memberships.length === 0 && !error) {
    return (
      <EmptyState
        title={t("emptyTitle")}
        description={t("emptyDescription")}
      />
    );
  }

  return (
    <ul className="divide-y divide-stone-200 border-y border-stone-200">
      {memberships.map((membership) => {
        const memberLabel =
          membership.user?.name ??
          membership.user?.email ??
          t("membershipFallback", { id: membership.id });
        const websiteNames =
          membership.websites?.map((w) => w.name).join(", ") ||
          tCommon("noWebsites");
        const roleLabel = tRole.has(membership.role)
          ? tRole(membership.role)
          : membership.role;
        const statusLabel = tStatus.has(membership.status)
          ? tStatus(membership.status)
          : membership.status;
        const payments =
          (membership.payment_methods ?? [])
            .map((p) => paymentStatusFragment(p.version, p.status, tPmStatus))
            .join(", ") || tCommon("noneListed");

        return (
          <li key={membership.id} className="space-y-2 py-4">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    className="text-left font-medium text-stone-900 underline-offset-2 hover:underline"
                    onClick={() => onDetail(membership)}
                  >
                    {memberLabel}
                  </button>
                  <StatusBadge tone={toneForStatus(membership.status)}>
                    {statusLabel}
                  </StatusBadge>
                </div>
                <p className="text-sm text-stone-500">
                  {t("metaLine", {
                    email: membership.user?.email ?? tCommon("noEmail"),
                    name: membership.business?.name ?? tCommon("none"),
                    code: roleLabel,
                    title: websiteNames,
                  })}
                </p>
                {membership.status_reason ? (
                  <p className="text-sm text-stone-500">
                    {membership.status_reason}
                  </p>
                ) : null}
                <p className="text-sm text-stone-500">
                  {t("paymentsLine", { payments })}
                </p>
                {(membership.referral_codes?.length ?? 0) > 0 ? (
                  <p className="text-sm text-stone-500">
                    {t("codesLine", {
                      codes:
                        membership.referral_codes
                          ?.map((c) => c.code)
                          .join(", ") ?? "",
                    })}
                  </p>
                ) : null}
              </div>
              <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  className="min-h-11 rounded-md border border-stone-300 px-3 py-1.5 text-xs font-medium hover:bg-stone-100"
                  onClick={() => onDetail(membership)}
                >
                  {tCommon("detail")}
                </button>
                {membership.status === "pending" ? (
                  <>
                    <button
                      type="button"
                      className="min-h-11 rounded-md bg-stone-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-stone-700"
                      onClick={() => onApprove(membership.id)}
                    >
                      {tCommon("approve")}
                    </button>
                    <button
                      type="button"
                      className="min-h-11 rounded-md border border-stone-300 px-3 py-1.5 text-xs font-medium hover:bg-stone-100"
                      onClick={() => onReject(membership.id)}
                    >
                      {tCommon("reject")}
                    </button>
                  </>
                ) : null}
                {membership.status === "approved" ? (
                  <button
                    type="button"
                    className="min-h-11 rounded-md border border-stone-300 px-3 py-1.5 text-xs font-medium hover:bg-stone-100"
                    onClick={() => onSuspend(membership.id)}
                  >
                    {tCommon("suspend")}
                  </button>
                ) : null}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
