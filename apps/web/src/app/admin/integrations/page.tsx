"use client";

import { FormEvent, Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { PageHeader } from "@/components/shell/PageHeader";
import { PromptForm } from "@/components/shell/PromptForm";
import { useShell } from "@/components/shell/ShellProvider";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { apiFetch } from "@/lib/api";
import { fetchMe } from "@/lib/auth";
import { formatDateTime, type AppLocale } from "@/lib/locale";

async function stepUpWithPassword(password: string): Promise<void> {
  await apiFetch("/api/v1/auth/step-up", {
    method: "POST",
    body: JSON.stringify({ method: "password", password }),
  });
}

type Business = { id: number; name: string };
type Website = { id: number; name: string; business_id: number };
type Credential = {
  id: number;
  source: string;
  name: string;
  website_id: number;
  business_id: number;
  revoked_at: string | null;
  last_used_at: string | null;
  business?: { id: number; name: string };
  website?: { id: number; name: string };
};

const SOURCE_PRESET_VALUES = [
  "node_checkout",
  "demo_checkout",
  "offline_pos",
  "__custom",
] as const;

export default function AdminIntegrationsPage() {
  const tCommon = useTranslations("common");
  return (
    <Suspense
      fallback={<p className="text-sm text-stone-500">{tCommon("loading")}</p>}
    >
      <AdminIntegrationsInner />
    </Suspense>
  );
}

function AdminIntegrationsInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { openDrawer, closeDrawer } = useShell();
  const locale = useLocale() as AppLocale;
  const t = useTranslations("admin.integrations");
  const tCommon = useTranslations("common");
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [websites, setWebsites] = useState<Website[]>([]);
  const [items, setItems] = useState<Credential[]>([]);
  const [secrets, setSecrets] = useState<{ token: string; hmac: string } | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showGuide, setShowGuide] = useState(false);

  const prefillBusinessId = searchParams.get("business_id");
  const prefillWebsiteId = searchParams.get("website_id");

  async function load() {
    const [biz, sites, creds] = await Promise.all([
      apiFetch<{ data: Business[] }>("/api/v1/admin/businesses"),
      apiFetch<{ data: Website[] }>("/api/v1/admin/websites"),
      apiFetch<{ data: Credential[] }>("/api/v1/admin/integrations"),
    ]);
    setBusinesses(biz.data);
    setWebsites(sites.data);
    setItems(creds.data);
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
        if (prefillBusinessId && prefillWebsiteId) {
          openCreateDrawer(
            Number(prefillBusinessId),
            Number(prefillWebsiteId),
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
    // Intentionally run once on mount for prefill.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  function openCreateDrawer(businessId?: number, websiteId?: number) {
    openDrawer({
      id: "create-integration",
      title: t("createDrawerTitle"),
      description: t("createDrawerDescription"),
      content: (
        <CreateIntegrationForm
          businesses={businesses}
          websites={websites}
          initialBusinessId={businessId}
          initialWebsiteId={websiteId}
          onSuccess={async (nextSecrets) => {
            setSecrets(nextSecrets);
            setError(null);
            setMessage(t("created"));
            closeDrawer();
            await load();
          }}
          onError={setError}
        />
      ),
    });
  }

  function openRotateDrawer(id: number) {
    openDrawer({
      id: `rotate-integration-${id}`,
      title: t("rotateDrawerTitle"),
      description: t("rotateDrawerDescription"),
      content: (
        <PromptForm
          label={t("password")}
          submitLabel={t("rotateSubmit")}
          inputType="password"
          onCancel={closeDrawer}
          onSubmit={async (password) => {
            await stepUpWithPassword(password);
            const response = await apiFetch<{
              token: string;
              hmac_secret: string;
            }>(`/api/v1/admin/integrations/${id}/rotate`, { method: "POST" });
            setSecrets({ token: response.token, hmac: response.hmac_secret });
            setMessage(t("rotated"));
            setError(null);
            closeDrawer();
            await load();
          }}
        />
      ),
    });
  }

  async function revoke(id: number) {
    if (!window.confirm(t("confirmRevoke"))) {
      return;
    }
    setError(null);
    try {
      await apiFetch(`/api/v1/admin/integrations/${id}/revoke`, {
        method: "POST",
      });
      setMessage(t("revoked"));
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("revokeFailed"));
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("title")}
        description={t("description")}
        helpKey="admin.integrations"
        actions={
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="min-h-11 rounded-md border border-stone-300 px-4 py-2 text-sm font-medium hover:bg-stone-100"
              onClick={() => setShowGuide((v) => !v)}
            >
              {showGuide ? t("hideGuide") : t("showGuide")}
            </button>
            <button
              type="button"
              className="min-h-11 rounded-md bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700"
              onClick={() => openCreateDrawer()}
            >
              {t("create")}
            </button>
          </div>
        }
      />

      {showGuide ? <IntegrationGuide /> : null}

      {error ? (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
      {message ? <p className="text-sm text-emerald-800">{message}</p> : null}
      {secrets ? (
        <pre className="overflow-x-auto rounded-md bg-stone-100 p-3 text-xs">
          {JSON.stringify(secrets, null, 2)}
        </pre>
      ) : null}

      <IntegrationsContent
        loading={loading}
        error={error}
        items={items}
        locale={locale}
        onCreate={() => openCreateDrawer()}
        onRotate={openRotateDrawer}
        onRevoke={revoke}
      />
    </div>
  );
}

function IntegrationsContent({
  loading,
  error,
  items,
  locale,
  onCreate,
  onRotate,
  onRevoke,
}: Readonly<{
  loading: boolean;
  error: string | null;
  items: Credential[];
  locale: AppLocale;
  onCreate: () => void;
  onRotate: (id: number) => void;
  onRevoke: (id: number) => void;
}>) {
  const t = useTranslations("admin.integrations");
  const tCommon = useTranslations("common");

  if (loading) {
    return <p className="text-sm text-stone-500">{tCommon("loading")}</p>;
  }

  if (items.length === 0 && !error) {
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
      {items.map((item) => (
        <li key={item.id} className="space-y-2 py-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium text-stone-900">
                  {item.name} · {item.source}
                </p>
                <StatusBadge tone={item.revoked_at ? "danger" : "success"}>
                  {item.revoked_at ? t("statusRevoked") : t("statusActive")}
                </StatusBadge>
              </div>
              <p className="text-stone-500">
                {t("businessWebsite", {
                  name:
                    item.business?.name ??
                    t("businessFallback", { id: item.business_id }),
                  title:
                    item.website?.name ??
                    t("websiteFallback", { id: item.website_id }),
                })}
              </p>
              <p className="text-stone-500">
                {item.last_used_at
                  ? t("lastUsed", {
                      date: formatDateTime(item.last_used_at, locale),
                    })
                  : t("neverUsed")}
              </p>
            </div>
            {!item.revoked_at ? (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="min-h-11 rounded-md border border-stone-300 px-3 py-1.5 text-xs font-medium hover:bg-stone-100"
                  onClick={() => onRotate(item.id)}
                >
                  {t("rotate")}
                </button>
                <button
                  type="button"
                  className="min-h-11 rounded-md border border-stone-300 px-3 py-1.5 text-xs font-medium hover:bg-stone-100"
                  onClick={() => onRevoke(item.id)}
                >
                  {t("revoke")}
                </button>
              </div>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}

function IntegrationGuide() {
  const t = useTranslations("admin.integrations");
  return (
    <section
      className="space-y-3 rounded-md border border-stone-200 bg-stone-50 p-4 text-sm text-stone-700"
      aria-labelledby="integration-guide-heading"
    >
      <h2 id="integration-guide-heading" className="font-semibold text-stone-900">
        {t("guideTitle")}
      </h2>
      <ol className="list-decimal space-y-2 pl-5">
        <li>{t("guideStep1")}</li>
        <li>{t("guideStep2")}</li>
        <li>{t("guideStep3")}</li>
        <li>{t("guideStep4")}</li>
      </ol>
      <p>{t("guideFooter")}</p>
    </section>
  );
}

function CreateIntegrationForm({
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
  onSuccess: (secrets: { token: string; hmac: string }) => void | Promise<void>;
  onError: (message: string) => void;
}) {
  const t = useTranslations("admin.integrations");
  const tCommon = useTranslations("common");
  const [businessId, setBusinessId] = useState<number | "">(
    initialBusinessId ?? "",
  );
  const [websiteId, setWebsiteId] = useState<number | "">(
    initialWebsiteId ?? "",
  );
  const [sourcePreset, setSourcePreset] = useState<string>("node_checkout");
  const [customSource, setCustomSource] = useState("");
  const [name, setName] = useState("Checkout");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const source = useMemo(
    () => (sourcePreset === "__custom" ? customSource : sourcePreset),
    [sourcePreset, customSource],
  );

  const sourceLabels: Record<(typeof SOURCE_PRESET_VALUES)[number], string> = {
    node_checkout: t("sourcePresetNode"),
    demo_checkout: t("sourcePresetDemo"),
    offline_pos: t("sourcePresetPos"),
    __custom: t("sourcePresetOther"),
  };

  async function onCreate(event: FormEvent) {
    event.preventDefault();
    setLocalError(null);
    setLoading(true);
    try {
      await stepUpWithPassword(password);
      const response = await apiFetch<{
        token: string;
        hmac_secret: string;
      }>("/api/v1/admin/integrations", {
        method: "POST",
        body: JSON.stringify({
          business_id: businessId,
          website_id: websiteId,
          source,
          name,
        }),
      });
      await onSuccess({ token: response.token, hmac: response.hmac_secret });
    } catch (err) {
      const msg = err instanceof Error ? err.message : tCommon("createFailed");
      setLocalError(msg);
      onError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="flex flex-col gap-3" onSubmit={onCreate}>
      <label className="flex flex-col gap-1 text-sm">
        {tCommon("business")}
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
        {tCommon("website")}
        <select
          className="rounded-md border border-stone-300 px-3 py-2"
          value={websiteId}
          onChange={(e) =>
            setWebsiteId(e.target.value ? Number(e.target.value) : "")
          }
          required
        >
          <option value="">{tCommon("selecting")}</option>
          {websites
            .filter((w) => businessId === "" || w.business_id === businessId)
            .map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        {t("source")}
        <select
          className="rounded-md border border-stone-300 px-3 py-2"
          value={sourcePreset}
          onChange={(e) => setSourcePreset(e.target.value)}
        >
          {SOURCE_PRESET_VALUES.map((value) => (
            <option key={value} value={value}>
              {sourceLabels[value]}
            </option>
          ))}
        </select>
      </label>
      {sourcePreset === "__custom" ? (
        <label className="flex flex-col gap-1 text-sm">
          {t("sourceCustom")}
          <input
            className="rounded-md border border-stone-300 px-3 py-2"
            value={customSource}
            onChange={(e) => setCustomSource(e.target.value)}
            placeholder={t("sourceCustomPlaceholder")}
            required
          />
        </label>
      ) : null}
      <p className="text-xs text-stone-500">{t("sourceHint")}</p>
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
        {t("password")}
        <input
          type="password"
          className="rounded-md border border-stone-300 px-3 py-2"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
        />
      </label>
      <p className="text-xs text-stone-500">{t("stepUpHint")}</p>
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
