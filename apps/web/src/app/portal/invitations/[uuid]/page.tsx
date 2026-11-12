"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { FormEvent, Suspense, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { fetchMe } from "@/lib/auth";
import { formatDateTime, type AppLocale } from "@/lib/locale";

type Invitation = {
  uuid: string;
  email: string;
  name: string | null;
  business: { id: number; name: string; slug: string };
  websites: Array<{ id: number; name: string; base_url: string }>;
  expires_at: string;
  accepted: boolean;
  revoked: boolean;
  expired: boolean;
};

function InvitationAcceptForm() {
  const params = useParams<{ uuid: string }>();
  const search = useSearchParams();
  const router = useRouter();
  const locale = useLocale() as AppLocale;
  const t = useTranslations("portal.invitation");
  const token = search.get("token") ?? "";

  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<"register" | "accept">("register");

  useEffect(() => {
    if (!token) {
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const response = await apiFetch<{ data: Invitation }>(
          `/api/v1/invitations/${params.uuid}?token=${encodeURIComponent(token)}`,
        );
        if (cancelled) return;
        setInvitation(response.data);
        setName(response.data.name ?? "");

        try {
          const me = await fetchMe();
          if (cancelled) return;
          if (me.email.toLowerCase() === response.data.email.toLowerCase()) {
            setMode("accept");
          }
        } catch {
          if (!cancelled) setMode("register");
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : t("unavailable"));
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [params.uuid, token, t]);

  const tokenError = token ? null : t("missingToken");
  const visibleError = tokenError ?? error;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!token) return;
    setBusy(true);
    setError(null);

    try {
      if (mode === "accept") {
        await apiFetch(`/api/v1/portal/invitations/${params.uuid}/accept`, {
          method: "POST",
          body: JSON.stringify({ token }),
        });
      } else {
        await apiFetch(`/api/v1/invitations/${params.uuid}/register`, {
          method: "POST",
          body: JSON.stringify({
            token,
            name,
            password,
            password_confirmation: passwordConfirmation,
          }),
        });
      }
      router.replace("/portal");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("acceptFailed"));
    } finally {
      setBusy(false);
    }
  }

  let submitLabel = t("registerAndAccept");
  if (busy) {
    submitLabel = t("processing");
  } else if (mode === "accept") {
    submitLabel = t("accept");
  }

  return (
    <>
      {visibleError ? (
        <p className="text-sm text-red-700" role="alert">
          {visibleError}
        </p>
      ) : null}

      {invitation ? (
        <section className="space-y-2 border-y border-stone-200 py-4 text-sm">
          <p>
            <span className="text-stone-500">{t("business")}</span>{" "}
            {invitation.business.name}
          </p>
          <p>
            <span className="text-stone-500">{t("email")}</span>{" "}
            {invitation.email}
          </p>
          <p>
            <span className="text-stone-500">{t("websites")}</span>{" "}
            {invitation.websites.map((w) => w.name).join(", ")}
          </p>
          <p>
            <span className="text-stone-500">{t("expires")}</span>{" "}
            {formatDateTime(invitation.expires_at, locale)}
          </p>
        </section>
      ) : null}

      {invitation &&
      !invitation.accepted &&
      !invitation.revoked &&
      !invitation.expired ? (
        <form className="flex flex-col gap-4" onSubmit={onSubmit}>
          {mode === "register" ? (
            <>
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
                  minLength={12}
                  required
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                {t("confirmPassword")}
                <input
                  type="password"
                  className="rounded-md border border-stone-300 px-3 py-2"
                  value={passwordConfirmation}
                  onChange={(e) => setPasswordConfirmation(e.target.value)}
                  minLength={12}
                  required
                />
              </label>
            </>
          ) : (
            <p className="text-sm text-stone-600">{t("authenticatedHint")}</p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="rounded-md bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-60"
          >
            {submitLabel}
          </button>
        </form>
      ) : null}
    </>
  );
}

export default function InvitationAcceptPage() {
  const t = useTranslations("portal.invitation");

  return (
    <main className="mx-auto flex min-h-full w-full max-w-xl flex-col gap-6 px-6 py-16">
      <p className="text-sm font-medium tracking-[0.2em] text-stone-500 uppercase">
        {t("pathLabel")}
      </p>
      <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
      <p className="text-stone-600">{t("description")}</p>

      <Suspense fallback={<p className="text-stone-600">{t("loading")}</p>}>
        <InvitationAcceptForm />
      </Suspense>

      <Link href="/login" className="text-sm underline-offset-2 hover:underline">
        {t("goLogin")}
      </Link>
    </main>
  );
}
