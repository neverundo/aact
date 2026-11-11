"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { PageHeader } from "@/components/shell/PageHeader";
import { StatusBadge, toneForStatus } from "@/components/ui/StatusBadge";
import { apiFetch } from "@/lib/api";
import { fetchMe } from "@/lib/auth";
import { formatDateTime, type AppLocale } from "@/lib/locale";

type Branding = {
  business_id: number;
  display_name: string | null;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  has_logo: boolean;
  logo_url: string | null;
};

type Website = {
  id: number;
  name: string;
  base_url: string;
  is_active: boolean;
  favicon_url?: string | null;
  logo_url?: string | null;
  logo_fetched_at?: string | null;
};

type Business = {
  id: number;
  name: string;
  websites?: Website[];
};

export default function AdminBusinessBrandingPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const businessId = Number(params.id);
  const locale = useLocale() as AppLocale;
  const t = useTranslations("admin.branding");
  const tCommon = useTranslations("common");
  const [business, setBusiness] = useState<Business | null>(null);
  const [branding, setBranding] = useState<Branding | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const [biz, brand] = await Promise.all([
      apiFetch<{ data: Business }>(`/api/v1/admin/businesses/${businessId}`),
      apiFetch<{ data: Branding }>(
        `/api/v1/admin/businesses/${businessId}/branding`,
      ),
    ]);
    setBusiness(biz.data);
    setBranding(brand.data);
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
        setError(err instanceof Error ? err.message : tCommon("noAccess"));
      } finally {
        setLoading(false);
      }
    })();
  }, [router, load, tCommon]);

  async function saveColors(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!branding) return;
    setSaving(true);
    setError(null);
    try {
      const form = new FormData(event.currentTarget);
      const response = await apiFetch<{ data: Branding }>(
        `/api/v1/admin/businesses/${businessId}/branding`,
        {
          method: "PUT",
          body: JSON.stringify({
            display_name: String(form.get("display_name") ?? "") || null,
            primary_color: String(form.get("primary_color")),
            secondary_color: String(form.get("secondary_color")),
            accent_color: String(form.get("accent_color")),
          }),
        },
      );
      setBranding(response.data);
      setMessage(t("saved"));
    } catch (err) {
      setError(err instanceof Error ? err.message : tCommon("saveFailed"));
    } finally {
      setSaving(false);
    }
  }

  async function uploadLogo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fileInput = form.elements.namedItem("logo") as HTMLInputElement;
    const file = fileInput.files?.[0];
    if (!file) return;

    setError(null);
    try {
      const body = new FormData();
      body.append("logo", file);
      const response = await apiFetch<{ data: Branding }>(
        `/api/v1/admin/businesses/${businessId}/branding/logo`,
        { method: "POST", body },
      );
      setBranding(response.data);
      setMessage(t("logoUploaded"));
      form.reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : tCommon("uploadFailed"));
    }
  }

  async function fetchWebsiteAssets(websiteId: number) {
    setError(null);
    try {
      await apiFetch(`/api/v1/admin/websites/${websiteId}/fetch-brand-assets`, {
        method: "POST",
      });
      setMessage(t("assetsUpdated"));
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("assetsFailed"));
    }
  }

  if (loading) {
    return <p className="text-sm text-stone-500">{tCommon("loading")}</p>;
  }

  if (!business || !branding) {
    return (
      <p className="text-sm text-red-700" role="alert">
        {error ?? t("unavailable")}
      </p>
    );
  }

  const colorFields = [
    ["primary_color", "primaryColor", branding.primary_color],
    ["secondary_color", "secondaryColor", branding.secondary_color],
    ["accent_color", "accentColor", branding.accent_color],
  ] as const;

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title={t("title", { name: business.name })}
        description={t("description")}
        helpKey="admin.business-branding"
        actions={
          <Link
            href={`/admin/businesses/${business.id}`}
            className="min-h-11 rounded-md border border-stone-300 px-4 py-2 text-sm font-medium hover:bg-stone-100"
          >
            {t("backToBusiness")}
          </Link>
        }
      />

      {error ? (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
      {message ? <p className="text-sm text-emerald-800">{message}</p> : null}

      <section className="grid gap-6 lg:grid-cols-[1fr_240px]">
        <form className="grid max-w-xl gap-3" onSubmit={saveColors}>
          <label className="flex flex-col gap-1 text-sm">
            {t("displayName")}
            <input
              name="display_name"
              className="rounded-md border border-stone-300 px-3 py-2"
              defaultValue={branding.display_name ?? ""}
              placeholder={business.name}
            />
          </label>
          {colorFields.map(([name, labelKey, value]) => (
            <label key={name} className="flex flex-col gap-1 text-sm">
              {t(labelKey)}
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  name={name}
                  defaultValue={value}
                  className="h-11 w-14 cursor-pointer rounded border border-stone-300 bg-white p-1"
                />
                <span className="font-mono text-xs text-stone-500">{value}</span>
              </div>
            </label>
          ))}
          <button
            type="submit"
            disabled={saving}
            className="min-h-11 w-fit rounded-md bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-60"
          >
            {saving ? tCommon("saving") : t("saveColors")}
          </button>
        </form>

        <div
          className="rounded-md border border-stone-200 p-4"
          style={{
            background: branding.primary_color,
            color: "#fff",
          }}
        >
          <p className="text-xs uppercase tracking-wide opacity-80">
            {tCommon("preview")}
          </p>
          <p className="mt-2 text-lg font-semibold">
            {branding.display_name || business.name}
          </p>
          <button
            type="button"
            className="mt-4 min-h-11 rounded-md px-3 py-2 text-sm font-medium"
            style={{ background: branding.accent_color, color: "#fff" }}
          >
            {tCommon("cta")}
          </button>
          <p className="mt-3 text-xs" style={{ color: branding.secondary_color }}>
            {tCommon("secondaryText")}
          </p>
          {branding.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={branding.logo_url}
              alt={tCommon("logoAlt")}
              className="mt-4 max-h-16 max-w-full rounded bg-white/90 p-2"
            />
          ) : null}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">{t("logoSection")}</h2>
        <form className="flex flex-wrap items-end gap-3" onSubmit={uploadLogo}>
          <label className="flex flex-col gap-1 text-sm">
            {t("logoFile")}
            <input
              name="logo"
              type="file"
              accept="image/*"
              className="text-sm"
              required
            />
          </label>
          <button
            type="submit"
            className="min-h-11 rounded-md border border-stone-300 px-4 py-2 text-sm font-medium hover:bg-stone-100"
          >
            {t("uploadLogo")}
          </button>
        </form>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">{t("websiteAssets")}</h2>
        <ul className="divide-y divide-stone-200 border-y border-stone-200">
          {(business.websites ?? []).map((website) => {
            const activeLabel = website.is_active
              ? tCommon("active")
              : tCommon("inactive");
            return (
              <li
                key={website.id}
                className="flex flex-wrap items-center justify-between gap-4 py-4"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{website.name}</p>
                    <StatusBadge tone={toneForStatus(activeLabel)}>
                      {activeLabel}
                    </StatusBadge>
                  </div>
                  <p className="text-sm text-stone-500">{website.base_url}</p>
                  <div className="flex items-center gap-3 pt-1">
                    {website.favicon_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={website.favicon_url}
                        alt=""
                        className="h-8 w-8 rounded border border-stone-200 bg-white object-contain"
                      />
                    ) : (
                      <span className="text-xs text-stone-500">
                        {t("noFavicon")}
                      </span>
                    )}
                    {website.logo_fetched_at ? (
                      <span className="text-xs text-stone-500">
                        {tCommon("fetchedAt", {
                          date: formatDateTime(website.logo_fetched_at, locale),
                        })}
                      </span>
                    ) : null}
                  </div>
                </div>
                <button
                  type="button"
                  className="min-h-11 rounded-md border border-stone-300 px-3 py-1.5 text-xs font-medium hover:bg-stone-100"
                  onClick={() => fetchWebsiteAssets(website.id)}
                >
                  {t("fetchAssets")}
                </button>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
