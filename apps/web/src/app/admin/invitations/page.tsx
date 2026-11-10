"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shell/PageHeader";
import { useShell } from "@/components/shell/ShellProvider";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge, toneForStatus } from "@/components/ui/StatusBadge";
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

function invitationStatusLabel(
  invite: Pick<Invitation, "accepted" | "revoked" | "expired">,
): string {
  if (invite.accepted) return "aceite";
  if (invite.revoked) return "revogado";
  if (invite.expired) return "expirado";
  return "ativo";
}

export default function AdminInvitationsPage() {
  const router = useRouter();
  const { openDrawer, closeDrawer } = useShell();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [websites, setWebsites] = useState<Website[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [lastToken, setLastToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  function openCreateDrawer() {
    openDrawer({
      id: "create-invitation",
      title: "Criar convite",
      description:
        "O token em texto só é mostrado no momento da criação; o canal principal é o email.",
      content: (
        <CreateInvitationForm
          businesses={businesses}
          websites={websites}
          onSuccess={async (email, token) => {
            setLastToken(token);
            setMessage(`Convite criado para ${email}.`);
            setError(null);
            closeDrawer();
            await load();
          }}
          onError={(msg) => setError(msg)}
        />
      ),
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Convites"
        description="Convide referrers para um business. O token em texto só aparece na criação."
        actions={
          <button
            type="button"
            className="min-h-11 rounded-md bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700"
            onClick={openCreateDrawer}
          >
            Criar convite
          </button>
        }
      />

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

      {loading ? (
        <p className="text-sm text-stone-500">A carregar…</p>
      ) : invitations.length === 0 && !error ? (
        <EmptyState
          title="Sem convites"
          description="Crie o primeiro convite para onboarding de referrers."
          action={
            <button
              type="button"
              className="rounded-md border border-stone-300 px-4 py-2 text-sm font-medium hover:bg-stone-100"
              onClick={openCreateDrawer}
            >
              Criar convite
            </button>
          }
        />
      ) : (
        <ul className="divide-y divide-stone-200 border-y border-stone-200">
          {invitations.map((invite) => {
            const status = invitationStatusLabel(invite);
            return (
              <li key={invite.uuid} className="space-y-1 py-3 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-stone-900">
                    {invite.email} · {invite.business.name}
                  </p>
                  <StatusBadge tone={toneForStatus(status)}>{status}</StatusBadge>
                </div>
                <p className="text-stone-500">
                  expira {new Date(invite.expires_at).toLocaleString("pt-PT")}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function CreateInvitationForm({
  businesses,
  websites,
  onSuccess,
  onError,
}: {
  businesses: Business[];
  websites: Website[];
  onSuccess: (email: string, token: string) => void | Promise<void>;
  onError: (message: string) => void;
}) {
  const [businessId, setBusinessId] = useState<number | "">("");
  const [websiteIds, setWebsiteIds] = useState<number[]>([]);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const filteredWebsites = useMemo(
    () =>
      businessId === ""
        ? []
        : websites.filter((website) => website.business_id === businessId),
    [businessId, websites],
  );

  async function onCreate(event: FormEvent) {
    event.preventDefault();
    setLocalError(null);
    setLoading(true);
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
      await onSuccess(response.invitation.email, response.token);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Falha ao criar convite.";
      setLocalError(msg);
      onError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
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
          <label key={website.id} className="flex min-h-11 items-center gap-2">
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
        {loading ? "A criar…" : "Criar convite"}
      </button>
    </form>
  );
}
