"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/shell/PageHeader";
import { useShell } from "@/components/shell/ShellProvider";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge, toneForStatus } from "@/components/ui/StatusBadge";
import { apiFetch } from "@/lib/api";
import { fetchMe } from "@/lib/auth";

type Website = {
  id: number;
  name: string;
  base_url: string;
  is_active: boolean;
  favicon_url?: string | null;
  logo_url?: string | null;
};

type Business = {
  id: number;
  name: string;
  slug: string;
  currency: string;
  payout_threshold_minor: number;
  is_active: boolean;
  websites?: Website[];
};

export default function AdminBusinessDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const businessId = Number(params.id);
  const { openDrawer, closeDrawer } = useShell();
  const t = useTranslations("admin.businessDetail");
  const tWebsites = useTranslations("admin.websites");
  const tBranding = useTranslations("admin.branding");
  const tCommon = useTranslations("common");
  const [business, setBusiness] = useState<Business | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const response = await apiFetch<{ data: Business }>(
      `/api/v1/admin/businesses/${businessId}`,
    );
    setBusiness(response.data);
  }, [businessId]);

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
        if (status === 404) {
          setError(t("notFound"));
        } else {
          setError(err instanceof Error ? err.message : tCommon("noAccess"));
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [router, load, t, tCommon]);

  async function saveBusiness(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!business) return;
    setSaving(true);
    setError(null);
    try {
      const form = new FormData(event.currentTarget);
      const response = await apiFetch<{ data: Business }>(
        `/api/v1/admin/businesses/${business.id}`,
        {
          method: "PUT",
          body: JSON.stringify({
            name: String(form.get("name") ?? ""),
            slug: String(form.get("slug") ?? ""),
            currency: String(form.get("currency") ?? "").toUpperCase(),
            payout_threshold_minor: Number(form.get("payout_threshold_minor")),
            is_active: form.get("is_active") === "on",
          }),
        },
      );
      setBusiness(response.data);
      setMessage(t("updated"));
    } catch (err) {
      setError(err instanceof Error ? err.message : tCommon("saveFailed"));
    } finally {
      setSaving(false);
    }
  }

  function openCreateWebsiteDrawer() {
    if (!business) return;
    openDrawer({
      id: "create-website",
      title: tWebsites("createDrawerTitle"),
      description: tWebsites("createDrawerDescription"),
      content: (
        <WebsiteForm
          submitLabel={tWebsites("createSubmit")}
          onSubmit={async (payload) => {
            await apiFetch("/api/v1/admin/websites", {
              method: "POST",
              body: JSON.stringify({
                business_id: business.id,
                ...payload,
              }),
            });
            setMessage(tWebsites("created"));
            setError(null);
            closeDrawer();
            await load();
          }}
          onError={setError}
        />
      ),
    });
  }

  function openEditWebsiteDrawer(website: Website) {
    openDrawer({
      id: `edit-website-${website.id}`,
      title: tWebsites("editTitle", { name: website.name }),
      content: (
        <WebsiteForm
          initial={website}
          submitLabel={tWebsites("saveSubmit")}
          onSubmit={async (payload) => {
            await apiFetch(`/api/v1/admin/websites/${website.id}`, {
              method: "PUT",
              body: JSON.stringify(payload),
            });
            setMessage(tWebsites("updated"));
            setError(null);
            closeDrawer();
            await load();
          }}
          onError={setError}
        />
      ),
    });
  }

  async function deleteWebsite(website: Website) {
    if (!window.confirm(tWebsites("confirmRemove", { name: website.name }))) {
      return;
    }
    setError(null);
    try {
      await apiFetch(`/api/v1/admin/websites/${website.id}`, {
        method: "DELETE",
      });
      setMessage(tWebsites("removed"));
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : tCommon("removeFailed"));
    }
  }

  if (loading) {
    return <p className="text-sm text-stone-500">{tCommon("loading")}</p>;
  }

  if (!business) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-red-700" role="alert">
          {error ?? t("notFound")}
        </p>
        <Link href="/admin/businesses" className="text-sm underline">
          {t("backToList")}
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title={business.name}
        description={t("meta", {
          code: business.slug,
          title: business.currency,
        })}
        helpKey="admin.business-detail"
        actions={
          <Link
            href="/admin/businesses"
            className="min-h-11 rounded-md border border-stone-300 px-4 py-2 text-sm font-medium hover:bg-stone-100"
          >
            {tCommon("back")}
          </Link>
        }
      />

      {error ? (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
      {message ? <p className="text-sm text-emerald-800">{message}</p> : null}

      <section className="space-y-4" aria-labelledby="business-edit-heading">
        <h2 id="business-edit-heading" className="text-lg font-semibold">
          {t("sectionTitle")}
        </h2>
        <form className="grid max-w-xl gap-3" onSubmit={saveBusiness}>
          <label className="flex flex-col gap-1 text-sm">
            {t("name")}
            <input
              name="name"
              className="rounded-md border border-stone-300 px-3 py-2"
              defaultValue={business.name}
              required
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            {t("slug")}
            <input
              name="slug"
              className="rounded-md border border-stone-300 px-3 py-2"
              defaultValue={business.slug}
              required
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            {t("currency")}
            <input
              name="currency"
              className="rounded-md border border-stone-300 px-3 py-2 uppercase"
              defaultValue={business.currency}
              maxLength={3}
              required
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            {t("payoutThreshold")}
            <input
              name="payout_threshold_minor"
              type="number"
              min={0}
              className="rounded-md border border-stone-300 px-3 py-2"
              defaultValue={business.payout_threshold_minor}
              required
            />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              name="is_active"
              type="checkbox"
              defaultChecked={business.is_active}
            />
            {t("active")}
          </label>
          <button
            type="submit"
            disabled={saving}
            className="min-h-11 w-fit rounded-md bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-60"
          >
            {saving ? tCommon("saving") : t("save")}
          </button>
        </form>
      </section>

      <section className="space-y-4" aria-labelledby="websites-heading">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="websites-heading" className="text-lg font-semibold">
            {tWebsites("sectionTitle")}
          </h2>
          <button
            type="button"
            className="min-h-11 rounded-md bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700"
            onClick={openCreateWebsiteDrawer}
          >
            {tWebsites("add")}
          </button>
        </div>

        {(business.websites?.length ?? 0) === 0 ? (
          <EmptyState
            title={tWebsites("emptyTitle")}
            description={tWebsites("emptyDescription")}
            action={
              <button
                type="button"
                className="rounded-md border border-stone-300 px-4 py-2 text-sm font-medium hover:bg-stone-100"
                onClick={openCreateWebsiteDrawer}
              >
                {tWebsites("add")}
              </button>
            }
          />
        ) : (
          <ul className="divide-y divide-stone-200 border-y border-stone-200">
            {business.websites?.map((website) => {
              const activeLabel = website.is_active
                ? tCommon("active")
                : tCommon("inactive");
              return (
                <li
                  key={website.id}
                  className="flex flex-wrap items-start justify-between gap-4 py-4"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-stone-900">{website.name}</p>
                      <StatusBadge tone={toneForStatus(activeLabel)}>
                        {activeLabel}
                      </StatusBadge>
                    </div>
                    <p className="text-sm text-stone-500">{website.base_url}</p>
                    <div className="flex flex-wrap gap-2 pt-1 text-xs">
                      <Link
                        href={`/admin/integrations?business_id=${business.id}&website_id=${website.id}`}
                        className="underline underline-offset-2"
                      >
                        {tWebsites("createCredential")}
                      </Link>
                      <Link
                        href={`/admin/commission-rules?business_id=${business.id}&website_id=${website.id}`}
                        className="underline underline-offset-2"
                      >
                        {tWebsites("createRule")}
                      </Link>
                      <Link
                        href={`/admin/businesses/${business.id}/branding`}
                        className="underline underline-offset-2"
                      >
                        {tWebsites("branding")}
                      </Link>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="min-h-11 rounded-md border border-stone-300 px-3 py-1.5 text-xs font-medium hover:bg-stone-100"
                      onClick={() => openEditWebsiteDrawer(website)}
                    >
                      {tCommon("edit")}
                    </button>
                    <button
                      type="button"
                      className="min-h-11 rounded-md border border-stone-300 px-3 py-1.5 text-xs font-medium hover:bg-stone-100"
                      onClick={() => deleteWebsite(website)}
                    >
                      {tCommon("remove")}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">{tBranding("sectionFromBusiness")}</h2>
        <p className="text-sm text-stone-600">
          {tBranding("sectionFromBusinessDescription")}
        </p>
        <Link
          href={`/admin/businesses/${business.id}/branding`}
          className="inline-flex min-h-11 items-center rounded-md border border-stone-300 px-4 py-2 text-sm font-medium hover:bg-stone-100"
        >
          {tBranding("open")}
        </Link>
      </section>
    </div>
  );
}

function WebsiteForm({
  initial,
  submitLabel,
  onSubmit,
  onError,
}: {
  initial?: Website;
  submitLabel: string;
  onSubmit: (payload: {
    name: string;
    base_url: string;
    is_active: boolean;
  }) => Promise<void>;
  onError: (message: string) => void;
}) {
  const tWebsites = useTranslations("admin.websites");
  const tCommon = useTranslations("common");
  const [name, setName] = useState(initial?.name ?? "");
  const [baseUrl, setBaseUrl] = useState(initial?.base_url ?? "https://");
  const [isActive, setIsActive] = useState(initial?.is_active ?? true);
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLocalError(null);
    setLoading(true);
    try {
      await onSubmit({ name, base_url: baseUrl, is_active: isActive });
    } catch (err) {
      const msg = err instanceof Error ? err.message : tCommon("saveFailed");
      setLocalError(msg);
      onError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
      <label className="flex flex-col gap-1 text-sm">
        {tWebsites("name")}
        <input
          className="rounded-md border border-stone-300 px-3 py-2"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        {tWebsites("baseUrl")}
        <input
          type="url"
          className="rounded-md border border-stone-300 px-3 py-2"
          value={baseUrl}
          onChange={(e) => setBaseUrl(e.target.value)}
          required
        />
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
        />
        {tWebsites("active")}
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
        {loading ? tCommon("saving") : submitLabel}
      </button>
    </form>
  );
}
