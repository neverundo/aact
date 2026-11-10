"use client";

import Link from "next/link";
import { useEffect, useState, type ComponentProps, type SyntheticEvent } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { fetchMe, logout, type AuthUser } from "@/lib/auth";

type FormSubmitHandler = NonNullable<ComponentProps<"form">["onSubmit"]>;

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
  const [user, setUser] = useState<AuthUser | null>(null);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [codes, setCodes] = useState<ReferralCode[]>([]);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [balances, setBalances] = useState<Balance[]>([]);
  const [documents, setDocuments] = useState<PortalDocument[]>([]);
  const [payouts, setPayouts] = useState<PayoutRequest[]>([]);
  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
  const [payoutAmount, setPayoutAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [selectedMembership, setSelectedMembership] = useState<number | "">("");
  const [methodType, setMethodType] = useState<"iban" | "mbway">("iban");
  const [iban, setIban] = useState("");
  const [phone, setPhone] = useState("");
  const [holderName, setHolderName] = useState("");
  const [linkUrl, setLinkUrl] = useState<string | null>(null);
  const [qrSvg, setQrSvg] = useState<string | null>(null);

  async function loadDocuments(membershipId: number) {
    const response = await apiFetch<{ data: PortalDocument[] }>(
      `/api/v1/portal/memberships/${membershipId}/documents`,
    ).catch(() => ({ data: [] as PortalDocument[] }));
    setDocuments(response.data);
    setSelectedDocs([]);
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
      setHolderName(snapshot.me.name);
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
          setHolderName(snapshot.me.name);
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

  async function submitPayment(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    if (selectedMembership === "") return;
    setError(null);
    setMessage(null);
    try {
      await apiFetch(
        `/api/v1/portal/memberships/${selectedMembership}/payment-methods`,
        {
          method: "POST",
          body: JSON.stringify({
            method_type: methodType,
            iban: methodType === "iban" ? iban : undefined,
            phone: methodType === "mbway" ? phone : undefined,
            holder_name: holderName,
          }),
        },
      );
      setMessage("Método de pagamento submetido para revisão.");
      setIban("");
      setPhone("");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha no pagamento.");
    }
  }

  async function uploadDocument(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    if (selectedMembership === "") return;
    const form = event.currentTarget;
    const data = new FormData(form);
    setError(null);
    try {
      await apiFetch(
        `/api/v1/portal/memberships/${selectedMembership}/documents`,
        {
          method: "POST",
          body: data,
        },
      );
      setMessage("Documento enviado para quarentena/scan.");
      form.reset();
      await loadDocuments(selectedMembership);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha no upload.");
    }
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

  async function requestPayout(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    if (selectedMembership === "") return;
    setError(null);
    setMessage(null);
    try {
      await apiFetch("/api/v1/portal/payout-requests", {
        method: "POST",
        body: JSON.stringify({
          membership_id: selectedMembership,
          document_uuids: selectedDocs,
          amount_minor: payoutAmount ? Number(payoutAmount) : undefined,
        }),
      });
      setMessage("Pedido de payout submetido.");
      setPayoutAmount("");
      setSelectedDocs([]);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha no pedido de payout.");
    }
  }

  function toggleDoc(uuid: string) {
    setSelectedDocs((prev) =>
      prev.includes(uuid) ? prev.filter((id) => id !== uuid) : [...prev, uuid],
    );
  }

  if (!user) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-16 text-stone-600">
        A carregar…
      </main>
    );
  }

  const activeMembership = memberships.find((m) => m.id === selectedMembership);

  return (
    <main className="mx-auto flex min-h-full w-full max-w-3xl flex-col gap-8 px-6 py-16">
      <div className="space-y-2">
        <p className="text-sm font-medium tracking-[0.2em] text-stone-500 uppercase">
          /portal
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-stone-900">
          Portal do referrer
        </h1>
        <p className="text-stone-600">
          Sessão de {user.email}. Complete pagamento e documentos enquanto a
          membership estiver pendente; códigos só após aprovação.
        </p>
      </div>

      {error ? (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
      {message ? <p className="text-sm text-emerald-800">{message}</p> : null}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Memberships</h2>
        <ul className="divide-y divide-stone-200 border-y border-stone-200">
          {memberships.map((membership) => (
            <li key={membership.id} className="py-3 text-sm">
              <button
                type="button"
                className="text-left"
                onClick={() => {
                  setSelectedMembership(membership.id);
                  void loadDocuments(membership.id);
                }}
              >
                <span className="font-medium">
                  {membership.business?.name ?? `#${membership.id}`}
                </span>
                <span className="text-stone-500"> · {membership.status}</span>
              </button>
            </li>
          ))}
          {memberships.length === 0 ? (
            <li className="py-6 text-sm text-stone-500">
              Sem memberships. Aceite um convite para começar.
            </li>
          ) : null}
        </ul>
      </section>

      {activeMembership ? (
        <PaymentAndDocumentsSection
          membership={activeMembership}
          methodType={methodType}
          iban={iban}
          phone={phone}
          holderName={holderName}
          onMethodTypeChange={setMethodType}
          onIbanChange={setIban}
          onPhoneChange={setPhone}
          onHolderNameChange={setHolderName}
          onSubmitPayment={(event) => {
            void submitPayment(event);
          }}
          onUploadDocument={(event) => {
            void uploadDocument(event);
          }}
        />
      ) : null}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Saldos e comissões</h2>
        <ul className="text-sm text-stone-600">
          {balances.map((balance) => (
            <li key={balance.membership_id}>
              {balance.business_name ?? `#${balance.membership_id}`}:{" "}
              {balance.payable_minor} {balance.currency} (limiar payout{" "}
              {balance.payout_threshold_minor})
            </li>
          ))}
          {balances.length === 0 ? (
            <li>Sem saldo ledger ainda.</li>
          ) : null}
        </ul>
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
          {commissions.length === 0 ? (
            <li className="py-4 text-stone-500">Sem comissões.</li>
          ) : null}
        </ul>
      </section>

      {activeMembership ? (
        <PayoutSection
          documents={documents}
          selectedDocs={selectedDocs}
          payoutAmount={payoutAmount}
          payouts={payouts}
          onToggleDoc={toggleDoc}
          onPayoutAmountChange={setPayoutAmount}
          onRequestPayout={(event) => {
            void requestPayout(event);
          }}
        />
      ) : null}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Códigos de referral</h2>
        {codes.length === 0 ? (
          <p className="text-sm text-stone-500">
            Disponíveis apenas após aprovação da membership.
          </p>
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
                      className="underline-offset-2 hover:underline"
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

      <div className="flex flex-wrap gap-3">
        <Link
          href="/admin/security"
          className="rounded-md border border-stone-300 px-4 py-2 text-sm font-medium hover:bg-stone-100"
        >
          Segurança da conta
        </Link>
        <button
          type="button"
          className="rounded-md px-4 py-2 text-sm font-medium text-stone-700 underline-offset-2 hover:underline"
          onClick={async () => {
            await logout();
            router.replace("/login");
          }}
        >
          Terminar sessão
        </button>
      </div>
    </main>
  );
}

function PaymentAndDocumentsSection({
  membership,
  methodType,
  iban,
  phone,
  holderName,
  onMethodTypeChange,
  onIbanChange,
  onPhoneChange,
  onHolderNameChange,
  onSubmitPayment,
  onUploadDocument,
}: Readonly<{
  membership: Membership;
  methodType: "iban" | "mbway";
  iban: string;
  phone: string;
  holderName: string;
  onMethodTypeChange: (value: "iban" | "mbway") => void;
  onIbanChange: (value: string) => void;
  onPhoneChange: (value: string) => void;
  onHolderNameChange: (value: string) => void;
  onSubmitPayment: FormSubmitHandler;
  onUploadDocument: FormSubmitHandler;
}>) {
  return (
    <>
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Método de pagamento</h2>
        <p className="text-sm text-stone-600">
          Cada submissão cria uma nova versão encriptada. Versões pendentes
          anteriores ficam superseded.
        </p>
        <ul className="text-sm text-stone-600">
          {(membership.payment_methods ?? []).map((pm) => (
            <li key={pm.id}>
              v{pm.version} · {pm.method_type} · {pm.display_mask} · {pm.status}
            </li>
          ))}
        </ul>
        <form className="flex flex-col gap-3" onSubmit={onSubmitPayment}>
          <label className="flex flex-col gap-1 text-sm">
            Tipo
            <select
              className="rounded-md border border-stone-300 px-3 py-2"
              value={methodType}
              onChange={(e) =>
                onMethodTypeChange(e.target.value as "iban" | "mbway")
              }
            >
              <option value="iban">IBAN</option>
              <option value="mbway">MB WAY</option>
            </select>
          </label>
          {methodType === "iban" ? (
            <label className="flex flex-col gap-1 text-sm">
              IBAN
              <input
                className="rounded-md border border-stone-300 px-3 py-2"
                value={iban}
                onChange={(e) => onIbanChange(e.target.value)}
                required
              />
            </label>
          ) : (
            <label className="flex flex-col gap-1 text-sm">
              Telemóvel MB WAY
              <input
                className="rounded-md border border-stone-300 px-3 py-2"
                value={phone}
                onChange={(e) => onPhoneChange(e.target.value)}
                required
              />
            </label>
          )}
          <label className="flex flex-col gap-1 text-sm">
            Titular
            <input
              className="rounded-md border border-stone-300 px-3 py-2"
              value={holderName}
              onChange={(e) => onHolderNameChange(e.target.value)}
              required
            />
          </label>
          <button
            type="submit"
            className="rounded-md bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700"
          >
            Submeter versão
          </button>
        </form>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Documentos</h2>
        <form className="flex flex-col gap-3" onSubmit={onUploadDocument}>
          <label className="flex flex-col gap-1 text-sm">
            Finalidade
            <input
              name="purpose"
              className="rounded-md border border-stone-300 px-3 py-2"
              defaultValue="identity"
              required
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Ficheiro (PDF/JPG/PNG)
            <input name="file" type="file" accept=".pdf,.jpg,.jpeg,.png" required />
          </label>
          <button
            type="submit"
            className="rounded-md border border-stone-300 px-4 py-2 text-sm font-medium hover:bg-stone-100"
          >
            Enviar
          </button>
        </form>
      </section>
    </>
  );
}

function PayoutSection({
  documents,
  selectedDocs,
  payoutAmount,
  payouts,
  onToggleDoc,
  onPayoutAmountChange,
  onRequestPayout,
}: Readonly<{
  documents: PortalDocument[];
  selectedDocs: string[];
  payoutAmount: string;
  payouts: PayoutRequest[];
  onToggleDoc: (uuid: string) => void;
  onPayoutAmountChange: (value: string) => void;
  onRequestPayout: FormSubmitHandler;
}>) {
  const usableDocs = documents.filter((d) => d.usable);

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">Pedido de payout</h2>
      <p className="text-sm text-stone-600">
        Requer método aprovado, documentos clean e saldo ≥ limiar do business. O
        pagamento é externo; aqui só pedimos e registamos settlement.
      </p>
      <form className="flex flex-col gap-3" onSubmit={onRequestPayout}>
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Documentos clean</legend>
          {usableDocs.length === 0 ? (
            <p className="text-sm text-stone-500">
              Sem documentos clean nesta membership.
            </p>
          ) : (
            usableDocs.map((doc) => (
              <label key={doc.uuid} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={selectedDocs.includes(doc.uuid)}
                  onChange={() => onToggleDoc(doc.uuid)}
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
            onChange={(e) => onPayoutAmountChange(e.target.value)}
            placeholder="ex. 5000"
          />
        </label>
        <button
          type="submit"
          className="rounded-md bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700"
          disabled={selectedDocs.length === 0}
        >
          Pedir payout
        </button>
      </form>
      <ul className="divide-y divide-stone-200 border-y border-stone-200 text-sm">
        {payouts.map((payout) => (
          <li key={payout.id} className="py-2">
            #{payout.id} · {payout.amount_minor} {payout.currency} ·{" "}
            {payout.status}
            {payout.status_reason ? ` — ${payout.status_reason}` : ""}
          </li>
        ))}
        {payouts.length === 0 ? (
          <li className="py-4 text-stone-500">Sem pedidos.</li>
        ) : null}
      </ul>
    </section>
  );
}
