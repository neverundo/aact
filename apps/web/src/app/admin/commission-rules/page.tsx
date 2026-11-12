"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/shell/PageHeader";
import { useShell } from "@/components/shell/ShellProvider";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { apiFetch } from "@/lib/api";
import { fetchMe } from "@/lib/auth";

type Business = { id: number; name: string };
type Website = { id: number; name: string; business_id: number };
type Rule = {
  id: number;
  name: string;
  event_type: string;
  rate_bps: number;
  flat_minor: number;
  priority: number;
  version: number;
  is_active: boolean;
  business_id: number;
  website_id: number | null;
  business?: { id: number; name: string };
  website?: { id: number; name: string } | null;
};

export default function AdminCommissionRulesPage() {
  const tCommon = useTranslations("common");
  return (
    <Suspense
      fallback={<p className="text-sm text-stone-500">{tCommon("loading")}</p>}
    >
      <AdminCommissionRulesInner />
    </Suspense>
  );
}

function AdminCommissionRulesInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { openDrawer, closeDrawer } = useShell();
  const t = useTranslations("admin.commissionRules");
  const tCommon = useTranslations("common");
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [websites, setWebsites] = useState<Website[]>([]);
  const [rules, setRules] = useState<Rule[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const prefillBusinessId = searchParams.get("business_id");
  const prefillWebsiteId = searchParams.get("website_id");

  async function load() {
    const [biz, sites, list] = await Promise.all([
      apiFetch<{ data: Business[] }>("/api/v1/admin/businesses"),
      apiFetch<{ data: Website[] }>("/api/v1/admin/websites"),
      apiFetch<{ data: Rule[] }>("/api/v1/admin/commission-rules"),
    ]);
    setBusinesses(biz.data);
    setWebsites(sites.data);
    setRules(list.data);
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
        if (prefillBusinessId) {
          openCreateDrawer(
            Number(prefillBusinessId),
            prefillWebsiteId ? Number(prefillWebsiteId) : undefined,
          );
        }
      } catch (err) {
        const status = (err as { status?: number }).status;
        if (status === 401) router.replace("/login");
        else setError(err instanceof Error ? err.message : tCommon("noAccess"));
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  function openCreateDrawer(businessId?: number, websiteId?: number) {
    openDrawer({
      id: "create-rule",
      title: t("createDrawerTitle"),
      description: t("createDrawerDescription"),
      content: (
        <CreateRuleForm
          businesses={businesses}
          websites={websites}
          initialBusinessId={businessId}
          initialWebsiteId={websiteId}
          onSuccess={async () => {
            setMessage(t("created"));
            setError(null);
            closeDrawer();
            await load();
          }}
          onError={setError}
        />
      ),
    });
  }

  async function deactivate(id: number) {
    if (!window.confirm(t("confirmDeactivate"))) return;
    setError(null);
    try {
      await apiFetch(`/api/v1/admin/commission-rules/${id}/deactivate`, {
        method: "POST",
      });
      setMessage(t("deactivated"));
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("deactivateFailed"));
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("title")}
        description={t("description")}
        helpKey="admin.commission-rules"
        actions={
          <button
            type="button"
            className="min-h-11 rounded-md bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700"
            onClick={() => openCreateDrawer()}
          >
            {t("create")}
          </button>
        }
      />

      {error ? (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
      {message ? <p className="text-sm text-emerald-800">{message}</p> : null}

      <CommissionRulesContent
        loading={loading}
        error={error}
        rules={rules}
        onCreate={() => openCreateDrawer()}
        onDeactivate={deactivate}
      />
    </div>
  );
}

function CommissionRulesContent({
  loading,
  error,
  rules,
  onCreate,
  onDeactivate,
}: Readonly<{
  loading: boolean;
  error: string | null;
  rules: Rule[];
  onCreate: () => void;
  onDeactivate: (id: number) => void;
}>) {
  const t = useTranslations("admin.commissionRules");
  const tCommon = useTranslations("common");
  const tEventType = useTranslations("enums.eventType");

  if (loading) {
    return <p className="text-sm text-stone-500">{tCommon("loading")}</p>;
  }

  if (rules.length === 0 && !error) {
    return (
      <EmptyState
        title={t("emptyTitle")}
        description={t("emptyDescription")}
        action={
          <button
            type="button"
            className="rounded-md border border-stone-300 px-4 py-2 text-sm font-medium hover:bg-stone-100"
            onClick={onCreate}
          >
            {t("create")}
          </button>
        }
      />
    );
  }

  return (
    <ul className="divide-y divide-stone-200 border-y border-stone-200 text-sm">
      {rules.map((rule) => {
        const scope = rule.website?.name
          ? t("scopeWebsite", { name: rule.website.name })
          : t("scopeBusiness");
        const statusLabel = rule.is_active
          ? t("statusActive")
          : t("statusInactive");
        return (
          <li key={rule.id} className="space-y-2 py-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-stone-900">
                    {rule.name} · v{rule.version}
                  </p>
                  <StatusBadge tone={rule.is_active ? "success" : "danger"}>
                    {statusLabel}
                  </StatusBadge>
                </div>
                <p className="text-stone-500">
                  {rule.business?.name ??
                    t("businessFallback", { id: rule.business_id })}{" "}
                  · {scope}
                </p>
                <p className="text-stone-500">
                  {t("details", {
                    eventType: tEventType.has(rule.event_type)
                      ? tEventType(rule.event_type)
                      : rule.event_type,
                    amount: rule.rate_bps,
                    flat: rule.flat_minor
                      ? t("flatSuffix", { amount: rule.flat_minor })
                      : "",
                    count: rule.priority,
                  })}
                </p>
              </div>
              {rule.is_active ? (
                <button
                  type="button"
                  className="min-h-11 rounded-md border border-stone-300 px-3 py-1.5 text-xs font-medium hover:bg-stone-100"
                  onClick={() => onDeactivate(rule.id)}
                >
                  {t("deactivate")}
                </button>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function CreateRuleForm({
  businesses,
  websites,
  initialBusinessId,
  initialWebsiteId,
  onSuccess,
  onError,
}: {
  businesses: Business[];
  websites: Website[];
  initialBusinessId?: number;
  initialWebsiteId?: number;
  onSuccess: () => void | Promise<void>;
  onError: (message: string) => void;
}) {
  const t = useTranslations("admin.commissionRules");
  const tCommon = useTranslations("common");
  const [businessId, setBusinessId] = useState<number | "">(
    initialBusinessId ?? "",
  );
  const [websiteId, setWebsiteId] = useState<number | "">(
    initialWebsiteId ?? "",
  );
  const [name, setName] = useState("Default sale");
  const [rateBps, setRateBps] = useState(1000);
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const selectedWebsite =
    websiteId === ""
      ? null
      : websites.find((w) => w.id === websiteId) ?? null;
  const selectedBusiness =
    businessId === ""
      ? null
      : businesses.find((b) => b.id === businessId) ?? null;

  async function onCreate(event: FormEvent) {
    event.preventDefault();
    setLocalError(null);
    setLoading(true);
    try {
      await apiFetch("/api/v1/admin/commission-rules", {
        method: "POST",
        body: JSON.stringify({
          business_id: businessId,
          website_id: websiteId || null,
          name,
          event_type: "sale",
          rate_bps: rateBps,
          flat_minor: 0,
          priority: 100,
          effective_from: new Date().toISOString(),
        }),
      });
      await onSuccess();
    } catch (err) {
      const msg = err instanceof Error ? err.message : t("createFailed");
      setLocalError(msg);
      onError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="flex flex-col gap-3" onSubmit={onCreate}>
      <label className="flex flex-col gap-1 text-sm">
        {t("business")}
        <select
          className="rounded-md border border-stone-300 px-3 py-2"
          value={businessId}
          onChange={(e) => {
            setBusinessId(e.target.value ? Number(e.target.value) : "");
            setWebsiteId("");
          }}
          required
        >
          <option value="">{tCommon("selecting")}</option>
          {businesses.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        {t("websiteOptional")}
        <select
          className="rounded-md border border-stone-300 px-3 py-2"
          value={websiteId}
          onChange={(e) =>
            setWebsiteId(e.target.value ? Number(e.target.value) : "")
          }
        >
          <option value="">{t("allWebsites")}</option>
          {websites
            .filter((w) => businessId === "" || w.business_id === businessId)
            .map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
        </select>
      </label>
      {selectedBusiness ? (
        <p className="rounded-md bg-stone-100 px-3 py-2 text-xs text-stone-600">
          {selectedWebsite
            ? t("scopePreviewWebsite", { name: selectedWebsite.name })
            : t("scopePreviewBusiness", { name: selectedBusiness.name })}
        </p>
      ) : null}
      <label className="flex flex-col gap-1 text-sm">
        {t("name")}
        <input
          className="rounded-md border border-stone-300 px-3 py-2"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        {t("rateBps")}
        <input
          type="number"
          min={0}
          max={10000}
          className="rounded-md border border-stone-300 px-3 py-2"
          value={rateBps}
          onChange={(e) => setRateBps(Number(e.target.value))}
          required
        />
      </label>
      {localError ? (
        <p className="text-sm text-red-700" role="alert">
          {localError}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={loading}
        className="min-h-11 rounded-md bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-60"
      >
        {loading ? tCommon("creating") : t("create")}
      </button>
    </form>
  );
}
