"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/shell/PageHeader";
import { StatusBadge, toneForStatus } from "@/components/ui/StatusBadge";
import { apiFetch } from "@/lib/api";
import { fetchMe } from "@/lib/auth";

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
        setError(err instanceof Error ? err.message : "Sem acesso.");
      } finally {
        setLoading(false);
      }
    })();
  }, [router, load]);

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
      setMessage("Branding guardado.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao guardar.");
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
      setMessage("Logotipo carregado.");
      form.reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha no upload.");
    }
  }

  async function fetchWebsiteAssets(websiteId: number) {
    setError(null);
    try {
      await apiFetch(`/api/v1/admin/websites/${websiteId}/fetch-brand-assets`, {
        method: "POST",
      });
      setMessage("Assets do website atualizados (quando disponíveis).");
      await load();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível obter favicon/logo.",
      );
    }
  }

  if (loading) {
    return <p className="text-sm text-stone-500">A carregar…</p>;
  }

  if (!business || !branding) {
    return (
      <p className="text-sm text-red-700" role="alert">
        {error ?? "Branding indisponível."}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title={`Branding · ${business.name}`}
        description="Cores e logotipo aplicados ao portal do referrer e à página de convite."
        helpKey="admin.business-branding"
        actions={
          <Link
            href={`/admin/businesses/${business.id}`}
            className="min-h-11 rounded-md border border-stone-300 px-4 py-2 text-sm font-medium hover:bg-stone-100"
          >
            Voltar ao business
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
            Nome de apresentação (opcional)
            <input
              name="display_name"
              className="rounded-md border border-stone-300 px-3 py-2"
              defaultValue={branding.display_name ?? ""}
              placeholder={business.name}
            />
          </label>
          {(
            [
              ["primary_color", "Cor primária", branding.primary_color],
              ["secondary_color", "Cor secundária", branding.secondary_color],
              ["accent_color", "Cor de destaque", branding.accent_color],
            ] as const
          ).map(([name, label, value]) => (
            <label key={name} className="flex flex-col gap-1 text-sm">
              {label}
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
            {saving ? "A guardar…" : "Guardar cores"}
          </button>
        </form>

        <div
          className="rounded-md border border-stone-200 p-4"
          style={{
            background: branding.primary_color,
            color: "#fff",
          }}
        >
          <p className="text-xs uppercase tracking-wide opacity-80">Preview</p>
          <p className="mt-2 text-lg font-semibold">
            {branding.display_name || business.name}
          </p>
          <button
            type="button"
            className="mt-4 min-h-11 rounded-md px-3 py-2 text-sm font-medium"
            style={{ background: branding.accent_color, color: "#fff" }}
          >
            CTA
          </button>
          <p className="mt-3 text-xs" style={{ color: branding.secondary_color }}>
            Texto secundário
          </p>
          {branding.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={branding.logo_url}
              alt="Logotipo"
              className="mt-4 max-h-16 max-w-full rounded bg-white/90 p-2"
            />
          ) : null}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Logotipo do business</h2>
        <form className="flex flex-wrap items-end gap-3" onSubmit={uploadLogo}>
          <label className="flex flex-col gap-1 text-sm">
            Ficheiro (PNG/JPG/SVG, máx. 2MB)
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
            Carregar logo
          </button>
        </form>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Assets por website</h2>
        <ul className="divide-y divide-stone-200 border-y border-stone-200">
          {(business.websites ?? []).map((website) => (
            <li
              key={website.id}
              className="flex flex-wrap items-center justify-between gap-4 py-4"
            >
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{website.name}</p>
                  <StatusBadge
                    tone={toneForStatus(website.is_active ? "ativo" : "inativo")}
                  >
                    {website.is_active ? "ativo" : "inativo"}
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
                    <span className="text-xs text-stone-500">sem favicon</span>
                  )}
                  {website.logo_fetched_at ? (
                    <span className="text-xs text-stone-500">
                      obtido{" "}
                      {new Date(website.logo_fetched_at).toLocaleString("pt-PT")}
                    </span>
                  ) : null}
                </div>
              </div>
              <button
                type="button"
                className="min-h-11 rounded-md border border-stone-300 px-3 py-1.5 text-xs font-medium hover:bg-stone-100"
                onClick={() => fetchWebsiteAssets(website.id)}
              >
                Obter favicon/logo
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
