"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { fetchMe } from "@/lib/auth";

type Business = { id: number; name: string };
type Website = { id: number; name: string; business_id: number; base_url: string };
type Invitation = {
  uuid: string;
  email: string;
  name: string | null;
  business: { id: number; name: string };
  websites: Array<{ id: number; name: string }>;
  expires_at: string;
  accepted: boolean;
  revoked: boolean;
  expired: boolean;
};

export default function AdminInvitationsPage() {
  const router = useRouter();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [websites, setWebsites] = useState<Website[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [businessId, setBusinessId] = useState<number | "">("");
  const [websiteIds, setWebsiteIds] = useState<number[]>([]);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [lastToken, setLastToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    const [biz, invites, sites] = await Promise.all([
      apiFetch<{ data: Business[] }>("/api/v1/admin/businesses"),
      apiFetch<{ data: Invitation[] }>("/api/v1/admin/invitations"),
      apiFetch<{ data: Website[] }>("/api/v1/admin/websites"),
    ]);
    setBusinesses(biz.data);
    setInvitations(invites.data);
    setWebsites(sites.data);
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
        setError(err instanceof Error ? err.message : "Sem acesso.");
      }
    })();
  }, [router]);

  const filteredWebsites = useMemo(
    () =>
      businessId === ""
        ? []
        : websites.filter((website) => website.business_id === businessId),
    [businessId, websites],
  );

  async function onCreate(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setLastToken(null);
    try {
      const response = await apiFetch<{
        invitation: Invitation;
        token: string;
      }>("/api/v1/admin/invitations", {
        method: "POST",
        body: JSON.stringify({
          business_id: businessId,
          email,
          name: name || null,
          website_ids: websiteIds,
        }),
      });
      setLastToken(response.token);
      setMessage(`Convite criado para ${response.invitation.email}.`);
      setEmail("");
      setName("");
      setWebsiteIds([]);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao criar convite.");
    }
  }

  return (
    <main className="mx-auto flex min-h-full w-full max-w-3xl flex-col gap-8 px-6 py-16">
      <div className="space-y-2">
        <p className="text-sm font-medium tracking-[0.2em] text-stone-500 uppercase">
          /admin/invitations
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">Convites</h1>
        <p className="text-stone-600">
          O token em texto só é mostrado aqui no momento da criação; o canal
          principal é o email.
        </p>
      </div>

      {error ? (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
      {message ? <p className="text-sm text-emerald-800">{message}</p> : null}
      {lastToken ? (
        <p className="break-all rounded-md bg-stone-100 p-3 font-mono text-xs">
          token: {lastToken}
        </p>
      ) : null}

      <form className="flex flex-col gap-3" onSubmit={onCreate}>
        <label className="flex flex-col gap-1 text-sm">
          Business
          <select
            className="rounded-md border border-stone-300 px-3 py-2"
            value={businessId}
            onChange={(e) => {
              setBusinessId(e.target.value ? Number(e.target.value) : "");
              setWebsiteIds([]);
            }}
            required
          >
            <option value="">Selecionar…</option>
            {businesses.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Email do referrer
          <input
            type="email"
            className="rounded-md border border-stone-300 px-3 py-2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Nome (opcional)
          <input
            className="rounded-md border border-stone-300 px-3 py-2"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <fieldset className="space-y-2 text-sm">
          <legend>Websites</legend>
          {filteredWebsites.map((website) => (
            <label key={website.id} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={websiteIds.includes(website.id)}
                onChange={(e) => {
                  setWebsiteIds((prev) =>
                    e.target.checked
                      ? [...prev, website.id]
                      : prev.filter((id) => id !== website.id),
                  );
                }}
              />
              {website.name}
            </label>
          ))}
          {businessId !== "" && filteredWebsites.length === 0 ? (
            <p className="text-stone-500">Sem websites neste business.</p>
          ) : null}
        </fieldset>
        <button
          type="submit"
          className="rounded-md bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700"
        >
          Criar convite
        </button>
      </form>

      <ul className="divide-y divide-stone-200 border-y border-stone-200">
        {invitations.map((invite) => (
          <li key={invite.uuid} className="space-y-1 py-3 text-sm">
            <p className="font-medium">
              {invite.email} · {invite.business.name}
            </p>
            <p className="text-stone-500">
              {invite.accepted
                ? "aceite"
                : invite.revoked
                  ? "revogado"
                  : invite.expired
                    ? "expirado"
                    : "ativo"}{" "}
              · expira {new Date(invite.expires_at).toLocaleString("pt-PT")}
            </p>
          </li>
        ))}
        {invitations.length === 0 ? (
          <li className="py-6 text-sm text-stone-500">Sem convites.</li>
        ) : null}
      </ul>

      <Link href="/admin" className="text-sm underline-offset-2 hover:underline">
        Voltar
      </Link>
    </main>
  );
}
