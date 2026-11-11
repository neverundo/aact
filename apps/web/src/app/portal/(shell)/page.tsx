"use client";

import { useEffect, useRef, useState, type SyntheticEvent } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shell/PageHeader";
import { useShell } from "@/components/shell/ShellProvider";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge, toneForStatus } from "@/components/ui/StatusBadge";
import { apiFetch } from "@/lib/api";
import { fetchMe, type AuthUser } from "@/lib/auth";
import {
  formatIbanInput,
  isValidIban,
  liveValidateIban,
  normalizeIban,
} from "@/lib/iban";

type Membership = {
  id: number;
  status: string;
  business?: { id: number; name: string };
  websites?: Array<{ id: number; name: string; base_url: string }>;
  payment_methods?: Array<{
    id: number;
    method_type: string;
    display_mask: string;
    status: string;
    version: number;
  }>;
  referral_codes?: Array<{ id: number; code: string; website_id: number | null }>;
};

type ReferralCode = {
  id: number;
  code: string;
  website_id: number | null;
};

type Commission = {
  id: number;
  commission_minor: number;
  reversed_minor?: number;
  currency: string;
  status: string;
  basis_amount_minor: number;
};

type Balance = {
  membership_id: number;
  business_name: string | null;
  currency: string | null;
  payable_minor: number;
  payout_threshold_minor: number;
};

type PortalDocument = {
  uuid: string;
  purpose: string;
  original_filename: string;
  scan_status: string;
  usable: boolean;
};

type PayoutRequest = {
  id: number;
  amount_minor: number;
  currency: string;
  status: string;
  status_reason: string | null;
};

async function fetchPortalSnapshot() {
  const [
    me,
    membershipResponse,
    codeResponse,
    commissionResponse,
    balanceResponse,
    payoutResponse,
  ] = await Promise.all([
    fetchMe(),
    apiFetch<{ data: Membership[] }>("/api/v1/portal/memberships"),
    apiFetch<{ data: ReferralCode[] }>("/api/v1/portal/referral-codes").catch(
      () => ({ data: [] as ReferralCode[] }),
    ),
    apiFetch<{ data: Commission[] }>("/api/v1/portal/commissions").catch(
      () => ({ data: [] as Commission[] }),
    ),
    apiFetch<{ data: Balance[] }>("/api/v1/portal/balances").catch(() => ({
      data: [] as Balance[],
    })),
    apiFetch<{ data: PayoutRequest[] }>("/api/v1/portal/payout-requests").catch(
      () => ({ data: [] as PayoutRequest[] }),
    ),
  ]);

  return {
    me,
    memberships: membershipResponse.data,
    codes: codeResponse.data,
    commissions: commissionResponse.data,
    balances: balanceResponse.data,
    payouts: payoutResponse.data,
  };
}

export default function PortalHomePage() {
  const router = useRouter();
  const { openDrawer, closeDrawer } = useShell();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [codes, setCodes] = useState<ReferralCode[]>([]);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [balances, setBalances] = useState<Balance[]>([]);
  const [documents, setDocuments] = useState<PortalDocument[]>([]);
  const [payouts, setPayouts] = useState<PayoutRequest[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [selectedMembership, setSelectedMembership] = useState<number | "">("");
  const [linkUrl, setLinkUrl] = useState<string | null>(null);
  const [qrSvg, setQrSvg] = useState<string | null>(null);

  async function loadDocuments(membershipId: number) {
    const response = await apiFetch<{ data: PortalDocument[] }>(
      `/api/v1/portal/memberships/${membershipId}/documents`,
    ).catch(() => ({ data: [] as PortalDocument[] }));
    setDocuments(response.data);
  }

  function applySnapshot(snapshot: Awaited<ReturnType<typeof fetchPortalSnapshot>>) {
    setUser(snapshot.me);
    setMemberships(snapshot.memberships);
    setCodes(snapshot.codes);
    setCommissions(snapshot.commissions);
    setBalances(snapshot.balances);
    setPayouts(snapshot.payouts);
  }

  async function refresh() {
    const snapshot = await fetchPortalSnapshot();
    applySnapshot(snapshot);
    if (selectedMembership === "" && snapshot.memberships[0]) {
      setSelectedMembership(snapshot.memberships[0].id);
      await loadDocuments(snapshot.memberships[0].id);
    } else if (selectedMembership !== "") {
      await loadDocuments(selectedMembership);
    }
  }

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const snapshot = await fetchPortalSnapshot();
        if (cancelled) return;
        applySnapshot(snapshot);
        if (snapshot.memberships[0]) {
          setSelectedMembership(snapshot.memberships[0].id);
          const docs = await apiFetch<{ data: PortalDocument[] }>(
            `/api/v1/portal/memberships/${snapshot.memberships[0].id}/documents`,
          ).catch(() => ({ data: [] as PortalDocument[] }));
          if (!cancelled) setDocuments(docs.data);
        }
      } catch {
        if (!cancelled) router.replace("/login");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  function openPaymentDrawer() {
    if (selectedMembership === "" || !user) return;
    openDrawer({
      id: "portal-payment",
      title: "Submeter método de pagamento",
      description:
        "Cada submissão cria uma nova versão encriptada. Versões pendentes anteriores ficam superseded.",
      content: (
        <PaymentForm
          defaultHolderName={user.name}
          onSubmit={async (payload) => {
            await apiFetch(
              `/api/v1/portal/memberships/${selectedMembership}/payment-methods`,
              {
                method: "POST",
                body: JSON.stringify(payload),
              },
            );
            setMessage("Método de pagamento submetido para revisão.");
            setError(null);
            closeDrawer();
            await refresh();
          }}
        />
      ),
    });
  }

  function openDocumentDrawer() {
    if (selectedMembership === "") return;
    openDrawer({
      id: "portal-document",
      title: "Enviar documento",
      description: "PDF/JPG/PNG — o ficheiro entra em quarentena/scan.",
      content: (
        <DocumentUploadForm
          onSubmit={async (formData) => {
            await apiFetch(
              `/api/v1/portal/memberships/${selectedMembership}/documents`,
              {
                method: "POST",
                body: formData,
              },
            );
            setMessage("Documento enviado para quarentena/scan.");
            setError(null);
            closeDrawer();
            await loadDocuments(selectedMembership);
          }}
        />
      ),
    });
  }

  function openPayoutDrawer() {
    if (selectedMembership === "") return;
    openDrawer({
      id: "portal-payout",
      title: "Pedir payout",
      description:
        "Requer método aprovado, documentos clean e saldo ≥ limiar do business.",
      content: (
        <PayoutRequestForm
          documents={documents}
          onSubmit={async (payload) => {
            await apiFetch("/api/v1/portal/payout-requests", {
              method: "POST",
              body: JSON.stringify({
                membership_id: selectedMembership,
                ...payload,
              }),
            });
            setMessage("Pedido de payout submetido.");
            setError(null);
            closeDrawer();
            await refresh();
          }}
        />
      ),
    });
  }

  async function buildLink(codeId: number, websiteId: number) {
    setError(null);
    try {
      const response = await apiFetch<{ url: string; qr_svg?: string }>(
        `/api/v1/portal/referral-codes/${codeId}/qr`,
        {
          method: "POST",
          body: JSON.stringify({ website_id: websiteId }),
        },
      );
      setLinkUrl(response.url);
      setQrSvg(response.qr_svg ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao gerar link.");
    }
  }

  if (!user) {
    return <p className="text-stone-600">A carregar…</p>;
  }

  const activeMembership = memberships.find((m) => m.id === selectedMembership);

  return (
    <div className="flex flex-col gap-10">
      <PageHeader
        title="Portal do referrer"
        description={`Sessão de ${user.email}. Complete pagamento e documentos enquanto a membership estiver pendente; códigos só após aprovação.`}
        helpKey="portal.home"
      />

      {error ? (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
      {message ? <p className="text-sm text-emerald-800">{message}</p> : null}

      <section id="memberships" className="scroll-mt-20 space-y-3">
        <h2 className="text-lg font-semibold text-stone-900">Memberships</h2>
        {memberships.length === 0 ? (
          <EmptyState
            title="Sem memberships"
            description="Aceite um convite para começar."
          />
        ) : (
          <ul className="divide-y divide-stone-200 border-y border-stone-200">
            {memberships.map((membership) => {
              const selected = membership.id === selectedMembership;
              return (
                <li key={membership.id} className="py-3 text-sm">
                  <button
                    type="button"
                    className={[
                      "flex w-full min-h-11 items-center justify-between gap-3 rounded-md px-2 text-left",
                      selected ? "bg-stone-100" : "hover:bg-stone-50",
                    ].join(" ")}
                    onClick={() => {
                      setSelectedMembership(membership.id);
                      void loadDocuments(membership.id);
                    }}
                  >
                    <span className="font-medium text-stone-900">
                      {membership.business?.name ?? `#${membership.id}`}
                    </span>
                    <StatusBadge tone={toneForStatus(membership.status)}>
                      {membership.status}
                    </StatusBadge>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {activeMembership ? (
        <>
          <section id="pagamento" className="scroll-mt-20 space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-stone-900">
                  Método de pagamento
                </h2>
                <p className="text-sm text-stone-600">
                  Versões encriptadas; só a máscara é visível aqui.
                </p>
              </div>
              <button
                type="button"
                className="min-h-11 rounded-md bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700"
                onClick={openPaymentDrawer}
              >
                Submeter versão
              </button>
            </div>
            {(activeMembership.payment_methods ?? []).length === 0 ? (
              <EmptyState title="Sem métodos submetidos" />
            ) : (
              <ul className="divide-y divide-stone-200 border-y border-stone-200 text-sm">
                {(activeMembership.payment_methods ?? []).map((pm) => (
                  <li
                    key={pm.id}
                    className="flex flex-wrap items-center justify-between gap-2 py-3"
                  >
                    <span>
                      v{pm.version} · {pm.method_type} · {pm.display_mask}
                    </span>
                    <StatusBadge tone={toneForStatus(pm.status)}>
                      {pm.status}
                    </StatusBadge>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section id="documentos" className="scroll-mt-20 space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <h2 className="text-lg font-semibold text-stone-900">
                Documentos
              </h2>
              <button
                type="button"
                className="min-h-11 rounded-md border border-stone-300 px-4 py-2 text-sm font-medium hover:bg-stone-100"
                onClick={openDocumentDrawer}
              >
                Enviar documento
              </button>
            </div>
            {documents.length === 0 ? (
              <EmptyState title="Sem documentos nesta membership" />
            ) : (
              <ul className="divide-y divide-stone-200 border-y border-stone-200 text-sm">
                {documents.map((doc) => (
                  <li
                    key={doc.uuid}
                    className="flex flex-wrap items-center justify-between gap-2 py-3"
                  >
                    <span>
                      {doc.original_filename} · {doc.purpose}
                    </span>
                    <StatusBadge tone={toneForStatus(doc.scan_status)}>
                      {doc.scan_status}
                      {doc.usable ? " · usable" : ""}
                    </StatusBadge>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      ) : null}

      <section id="saldos" className="scroll-mt-20 space-y-3">
        <h2 className="text-lg font-semibold text-stone-900">
          Saldos e comissões
        </h2>
        {balances.length === 0 ? (
          <EmptyState title="Sem saldo ledger ainda" />
        ) : (
          <ul className="space-y-1 text-sm text-stone-600">
            {balances.map((balance) => (
              <li key={balance.membership_id}>
                {balance.business_name ?? `#${balance.membership_id}`}:{" "}
                {balance.payable_minor} {balance.currency} (limiar payout{" "}
                {balance.payout_threshold_minor})
              </li>
            ))}
          </ul>
        )}
        {commissions.length === 0 ? (
          <EmptyState title="Sem comissões" />
        ) : (
          <ul className="divide-y divide-stone-200 border-y border-stone-200 text-sm">
            {commissions.slice(0, 8).map((commission) => (
              <li key={commission.id} className="py-2">
                #{commission.id} · {commission.commission_minor}{" "}
                {commission.currency} · {commission.status} (base{" "}
                {commission.basis_amount_minor}
                {commission.reversed_minor
                  ? `; revertido ${commission.reversed_minor}`
                  : ""}
                )
              </li>
            ))}
          </ul>
        )}
      </section>

      {activeMembership ? (
        <section id="payouts" className="scroll-mt-20 space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-stone-900">
                Pedidos de payout
              </h2>
              <p className="text-sm text-stone-600">
                O pagamento é externo; aqui só pedimos e registamos settlement.
              </p>
            </div>
            <button
              type="button"
              className="min-h-11 rounded-md bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700"
              onClick={openPayoutDrawer}
            >
              Pedir payout
            </button>
          </div>
          {payouts.length === 0 ? (
            <EmptyState title="Sem pedidos" />
          ) : (
            <ul className="divide-y divide-stone-200 border-y border-stone-200 text-sm">
              {payouts.map((payout) => (
                <li key={payout.id} className="flex flex-wrap items-center gap-2 py-2">
                  <span>
                    #{payout.id} · {payout.amount_minor} {payout.currency}
                  </span>
                  <StatusBadge tone={toneForStatus(payout.status)}>
                    {payout.status}
                  </StatusBadge>
                  {payout.status_reason ? (
                    <span className="text-stone-500">
                      — {payout.status_reason}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      <section id="referral" className="scroll-mt-20 space-y-3">
        <h2 className="text-lg font-semibold text-stone-900">
          Códigos de referral
        </h2>
        {codes.length === 0 ? (
          <EmptyState
            title="Sem códigos"
            description="Disponíveis apenas após aprovação da membership."
          />
        ) : (
          <ul className="space-y-2 text-sm">
            {codes.map((code) => {
              const websiteId =
                code.website_id ??
                activeMembership?.websites?.[0]?.id ??
                null;
              return (
                <li
                  key={code.id}
                  className="flex flex-wrap items-center gap-3 border-b border-stone-200 py-2"
                >
                  <code className="font-mono">{code.code}</code>
                  {websiteId ? (
                    <button
                      type="button"
                      className="min-h-11 underline-offset-2 hover:underline"
                      onClick={() => buildLink(code.id, websiteId)}
                    >
                      Gerar link + QR
                    </button>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
        {linkUrl ? (
          <p className="break-all text-sm">
            Link:{" "}
            <a className="underline" href={linkUrl}>
              {linkUrl}
            </a>
          </p>
        ) : null}
        {qrSvg ? (
          <div
            className="max-w-xs"
            dangerouslySetInnerHTML={{ __html: qrSvg }}
          />
        ) : null}
        <p className="text-xs text-stone-500">
          Passar ?ref=CODE no site externo não atribui automaticamente; o
          sistema externo tem de enviar o código nos eventos de conversão.
        </p>
      </section>
    </div>
  );
}

function PaymentForm({
  defaultHolderName,
  onSubmit,
}: {
  defaultHolderName: string;
  onSubmit: (payload: {
    method_type: "iban" | "mbway";
    iban?: string;
    phone?: string;
    holder_name: string;
  }) => Promise<void>;
}) {
  const [methodType, setMethodType] = useState<"iban" | "mbway">("iban");
  const [iban, setIban] = useState("");
  const [phone, setPhone] = useState("");
  const [holderName, setHolderName] = useState(defaultHolderName);
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const ibanStatus = liveValidateIban(iban);
  const ibanBorderClass =
    methodType !== "iban" || ibanStatus.kind === "empty"
      ? "border-stone-300"
      : ibanStatus.kind === "valid"
        ? "border-emerald-600"
        : ibanStatus.kind === "invalid"
          ? "border-red-600"
          : "border-stone-300";

  async function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setLocalError(null);

    if (methodType === "iban" && !isValidIban(iban)) {
      setLocalError(
        ibanStatus.kind === "invalid" || ibanStatus.kind === "incomplete"
          ? ibanStatus.message
          : "Indique um IBAN válido.",
      );
      return;
    }

    setLoading(true);
    try {
      await onSubmit({
        method_type: methodType,
        iban: methodType === "iban" ? normalizeIban(iban) : undefined,
        phone: methodType === "mbway" ? phone : undefined,
        holder_name: holderName,
      });
    } catch (err) {
      setLocalError(
        err instanceof Error ? err.message : "Falha no pagamento.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="flex flex-col gap-3" onSubmit={handleSubmit} noValidate>
      <label className="flex flex-col gap-1 text-sm">
        Tipo
        <select
          className="rounded-md border border-stone-300 px-3 py-2"
          value={methodType}
          onChange={(e) => setMethodType(e.target.value as "iban" | "mbway")}
        >
          <option value="iban">IBAN</option>
          <option value="mbway">MB WAY</option>
        </select>
      </label>
      {methodType === "iban" ? (
        <div className="flex flex-col gap-1 text-sm">
          <label htmlFor="portal-iban" className="font-medium">
            IBAN
          </label>
          <input
            id="portal-iban"
            name="iban"
            autoComplete="off"
            spellCheck={false}
            inputMode="text"
            className={`rounded-md border bg-white px-3 py-2 font-mono uppercase tracking-wide outline-none focus:border-stone-900 ${ibanBorderClass}`}
            value={iban}
            aria-invalid={ibanStatus.kind === "invalid"}
            aria-describedby="portal-iban-status"
            onChange={(e) => {
              setIban(formatIbanInput(e.target.value));
              setLocalError(null);
            }}
            required
          />
          {ibanStatus.kind !== "empty" ? (
            <p
              id="portal-iban-status"
              role={ibanStatus.kind === "invalid" ? "alert" : "status"}
              className={
                ibanStatus.kind === "valid"
                  ? "text-sm text-emerald-800"
                  : ibanStatus.kind === "invalid"
                    ? "text-sm text-red-700"
                    : "text-sm text-stone-500"
              }
            >
              {ibanStatus.message}
            </p>
          ) : (
            <p id="portal-iban-status" className="sr-only">
              Introduza o IBAN; as letras são convertidas para maiúsculas.
            </p>
          )}
        </div>
      ) : (
        <label className="flex flex-col gap-1 text-sm">
          Telemóvel MB WAY
          <input
            className="rounded-md border border-stone-300 px-3 py-2"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />
        </label>
      )}
      <label className="flex flex-col gap-1 text-sm">
        Titular
        <input
          className="rounded-md border border-stone-300 px-3 py-2"
          value={holderName}
          onChange={(e) => setHolderName(e.target.value)}
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
        disabled={
          loading || (methodType === "iban" && ibanStatus.kind !== "valid")
        }
        className="min-h-11 cursor-pointer rounded-md bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "A submeter…" : "Submeter versão"}
      </button>
    </form>
  );
}

function DocumentUploadForm({
  onSubmit,
}: {
  onSubmit: (data: FormData) => Promise<void>;
}) {
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    if (!data.get("file") || !(data.get("file") instanceof File) || !(data.get("file") as File).size) {
      setLocalError("Seleccione um ficheiro PDF, JPG ou PNG.");
      return;
    }
    setLocalError(null);
    setLoading(true);
    try {
      await onSubmit(data);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Falha no upload.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
      <label className="flex flex-col gap-1 text-sm">
        Finalidade
        <input
          name="purpose"
          className="rounded-md border border-stone-300 px-3 py-2"
          defaultValue="identity"
          required
        />
      </label>
      <div className="flex flex-col gap-1 text-sm">
        <span id="portal-doc-file-label">Ficheiro (PDF/JPG/PNG)</span>
        <input
          ref={fileInputRef}
          id="portal-doc-file"
          name="file"
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
          required
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0] ?? null;
            setFileName(file?.name ?? null);
            setLocalError(null);
          }}
        />
        <div className="flex min-h-11 items-center gap-2 rounded-md border border-stone-300 bg-white p-1.5">
          <button
            type="button"
            className="inline-flex min-h-9 shrink-0 cursor-pointer items-center rounded-md bg-stone-900 px-3 text-sm font-medium text-white hover:bg-stone-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-900"
            aria-controls="portal-doc-file"
            onClick={() => fileInputRef.current?.click()}
          >
            Browse
          </button>
          <p
            className="min-w-0 flex-1 truncate px-1 text-sm text-stone-600"
            aria-live="polite"
            aria-labelledby="portal-doc-file-label"
          >
            {fileName ?? "Nenhum ficheiro seleccionado"}
          </p>
        </div>
      </div>
      {localError ? (
        <p className="text-sm text-red-700" role="alert">
          {localError}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={loading}
        className="min-h-11 cursor-pointer rounded-md border border-stone-300 px-4 py-2 text-sm font-medium hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "A enviar…" : "Enviar"}
      </button>
    </form>
  );
}

function PayoutRequestForm({
  documents,
  onSubmit,
}: {
  documents: PortalDocument[];
  onSubmit: (payload: {
    document_uuids: string[];
    amount_minor?: number;
  }) => Promise<void>;
}) {
  const usableDocs = documents.filter((d) => d.usable);
  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
  const [payoutAmount, setPayoutAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  async function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setLocalError(null);
    setLoading(true);
    try {
      await onSubmit({
        document_uuids: selectedDocs,
        amount_minor: payoutAmount ? Number(payoutAmount) : undefined,
      });
    } catch (err) {
      setLocalError(
        err instanceof Error ? err.message : "Falha no pedido de payout.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Documentos clean</legend>
        {usableDocs.length === 0 ? (
          <p className="text-sm text-stone-500">
            Sem documentos clean nesta membership.
          </p>
        ) : (
          usableDocs.map((doc) => (
            <label
              key={doc.uuid}
              className="flex min-h-11 items-center gap-2 text-sm"
            >
              <input
                type="checkbox"
                checked={selectedDocs.includes(doc.uuid)}
                onChange={() =>
                  setSelectedDocs((prev) =>
                    prev.includes(doc.uuid)
                      ? prev.filter((id) => id !== doc.uuid)
                      : [...prev, doc.uuid],
                  )
                }
              />
              {doc.original_filename} · {doc.purpose}
            </label>
          ))
        )}
      </fieldset>
      <label className="flex flex-col gap-1 text-sm">
        Montante (minor units, opcional = saldo total)
        <input
          className="rounded-md border border-stone-300 px-3 py-2"
          inputMode="numeric"
          value={payoutAmount}
          onChange={(e) => setPayoutAmount(e.target.value)}
          placeholder="ex. 5000"
        />
      </label>
      {localError ? (
        <p className="text-sm text-red-700" role="alert">
          {localError}
        </p>
      ) : null}
      <button
        type="submit"
        className="min-h-11 rounded-md bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-60"
        disabled={loading || selectedDocs.length === 0}
      >
        {loading ? "A submeter…" : "Pedir payout"}
      </button>
    </form>
  );
}
