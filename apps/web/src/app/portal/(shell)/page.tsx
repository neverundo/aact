"use client";

import { useEffect, useRef, useState, type SyntheticEvent } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
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
import { formatMoney, type AppLocale } from "@/lib/locale";

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
  reserved_minor: number;
  available_minor: number;
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
  const locale = useLocale() as AppLocale;
  const t = useTranslations("portal.home");
  const tPayment = useTranslations("portal.payment");
  const tDocuments = useTranslations("portal.documents");
  const tPayout = useTranslations("portal.payout");
  const tReferral = useTranslations("portal.referral");
  const tCommon = useTranslations("common");
  const tMembershipStatus = useTranslations("enums.membershipStatus");
  const tPayoutStatus = useTranslations("enums.payoutRequestStatus");
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
      title: tPayment("drawerTitle"),
      description: tPayment("drawerDescription"),
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
            setMessage(tPayment("submitted"));
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
      title: tDocuments("drawerTitle"),
      description: tDocuments("drawerDescription"),
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
            setMessage(tDocuments("uploaded"));
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
      title: tPayout("drawerTitle"),
      description: tPayout("drawerDescription"),
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
            setMessage(tPayout("submitted"));
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
      setError(
        err instanceof Error ? err.message : tReferral("generateFailed"),
      );
    }
  }

  if (!user) {
    return <p className="text-stone-600">{tCommon("loading")}</p>;
  }

  const activeMembership = memberships.find((m) => m.id === selectedMembership);

  return (
    <div className="flex flex-col gap-10">
      <PageHeader
        title={t("title")}
        description={t("description", { email: user.email })}
        helpKey="portal.home"
      />

      {error ? (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
      {message ? <p className="text-sm text-emerald-800">{message}</p> : null}

      <section id="memberships" className="scroll-mt-20 space-y-3">
        <h2 className="text-lg font-semibold text-stone-900">
          {t("memberships")}
        </h2>
        {memberships.length === 0 ? (
          <EmptyState
            title={t("emptyMembershipsTitle")}
            description={t("emptyMembershipsDescription")}
          />
        ) : (
          <ul className="divide-y divide-stone-200 border-y border-stone-200">
            {memberships.map((membership) => {
              const selected = membership.id === selectedMembership;
              const statusLabel = tMembershipStatus.has(membership.status)
                ? tMembershipStatus(membership.status)
                : membership.status;
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
                      {statusLabel}
                    </StatusBadge>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {activeMembership ? (
        <PortalPaymentAndDocuments
          membership={activeMembership}
          documents={documents}
          onOpenPayment={openPaymentDrawer}
          onOpenDocuments={openDocumentDrawer}
        />
      ) : null}

      <section id="saldos" className="scroll-mt-20 space-y-3">
        <h2 className="text-lg font-semibold text-stone-900">
          {t("balancesTitle")}
        </h2>
        {balances.length === 0 ? (
          <EmptyState title={t("emptyBalances")} />
        ) : (
          <ul className="space-y-1 text-sm text-stone-600">
            {balances.map((balance) => {
              const currency = balance.currency ?? "EUR";
              return (
                <li key={balance.membership_id}>
                  {t("balanceLine", {
                    name: balance.business_name ?? `#${balance.membership_id}`,
                    amount: formatMoney(
                      balance.available_minor,
                      currency,
                      locale,
                    ),
                    payable: formatMoney(
                      balance.payable_minor,
                      currency,
                      locale,
                    ),
                    reserved: formatMoney(
                      balance.reserved_minor,
                      currency,
                      locale,
                    ),
                    count: formatMoney(
                      balance.payout_threshold_minor,
                      currency,
                      locale,
                    ),
                  })}
                </li>
              );
            })}
          </ul>
        )}
        {commissions.length === 0 ? (
          <EmptyState title={t("emptyCommissions")} />
        ) : (
          <ul className="divide-y divide-stone-200 border-y border-stone-200 text-sm">
            {commissions.slice(0, 8).map((commission) => (
              <li key={commission.id} className="py-2">
                {t("commissionLine", {
                  id: commission.id,
                  amount: formatMoney(
                    commission.commission_minor,
                    commission.currency,
                    locale,
                  ),
                  title: commission.status,
                  payments: formatMoney(
                    commission.basis_amount_minor,
                    commission.currency,
                    locale,
                  ),
                  documents: commission.reversed_minor
                    ? t("commissionReversed", {
                        amount: formatMoney(
                          commission.reversed_minor,
                          commission.currency,
                          locale,
                        ),
                      })
                    : "",
                })}
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
                {tPayout("title")}
              </h2>
              <p className="text-sm text-stone-600">{tPayout("description")}</p>
            </div>
            <button
              type="button"
              className="min-h-11 rounded-md bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700"
              onClick={openPayoutDrawer}
            >
              {tPayout("request")}
            </button>
          </div>
          {payouts.length === 0 ? (
            <EmptyState title={tPayout("empty")} />
          ) : (
            <ul className="divide-y divide-stone-200 border-y border-stone-200 text-sm">
              {payouts.map((payout) => {
                const statusLabel = tPayoutStatus.has(payout.status)
                  ? tPayoutStatus(payout.status)
                  : payout.status;
                return (
                  <li
                    key={payout.id}
                    className="flex flex-wrap items-center gap-2 py-2"
                  >
                    <span>
                      #{payout.id} ·{" "}
                      {formatMoney(
                        payout.amount_minor,
                        payout.currency,
                        locale,
                      )}
                    </span>
                    <StatusBadge tone={toneForStatus(payout.status)}>
                      {statusLabel}
                    </StatusBadge>
                    {payout.status_reason ? (
                      <span className="text-stone-500">
                        — {payout.status_reason}
                      </span>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      ) : null}

      <section id="referral" className="scroll-mt-20 space-y-3">
        <h2 className="text-lg font-semibold text-stone-900">
          {tReferral("title")}
        </h2>
        {codes.length === 0 ? (
          <EmptyState
            title={tReferral("emptyTitle")}
            description={tReferral("emptyDescription")}
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
                      {tReferral("generateLink")}
                    </button>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
        {linkUrl ? (
          <p className="break-all text-sm">
            {tReferral("linkLabel")}{" "}
            <a className="underline" href={linkUrl}>
              {tReferral("linkValue", { url: linkUrl })}
            </a>
          </p>
        ) : null}
        {qrSvg ? (
          <div
            className="max-w-xs"
            dangerouslySetInnerHTML={{ __html: qrSvg }}
          />
        ) : null}
        <p className="text-xs text-stone-500">{tReferral("note")}</p>
      </section>
    </div>
  );
}

function PortalPaymentAndDocuments({
  membership,
  documents,
  onOpenPayment,
  onOpenDocuments,
}: {
  membership: Membership;
  documents: PortalDocument[];
  onOpenPayment: () => void;
  onOpenDocuments: () => void;
}) {
  const tPayment = useTranslations("portal.payment");
  const tDocuments = useTranslations("portal.documents");
  const tPmStatus = useTranslations("enums.paymentMethodStatus");
  const tPmType = useTranslations("enums.paymentMethodType");
  const tScanStatus = useTranslations("enums.documentScanStatus");
  const paymentMethods = membership.payment_methods ?? [];

  return (
    <>
      <section id="pagamento" className="scroll-mt-20 space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-stone-900">
              {tPayment("title")}
            </h2>
            <p className="text-sm text-stone-600">{tPayment("description")}</p>
          </div>
          <button
            type="button"
            className="min-h-11 rounded-md bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700"
            onClick={onOpenPayment}
          >
            {tPayment("submitVersion")}
          </button>
        </div>
        {paymentMethods.length === 0 ? (
          <EmptyState title={tPayment("empty")} />
        ) : (
          <ul className="divide-y divide-stone-200 border-y border-stone-200 text-sm">
            {paymentMethods.map((pm) => {
              const typeLabel = tPmType.has(pm.method_type)
                ? tPmType(pm.method_type)
                : pm.method_type;
              const statusLabel = tPmStatus.has(pm.status)
                ? tPmStatus(pm.status)
                : pm.status;
              return (
                <li
                  key={pm.id}
                  className="flex flex-wrap items-center justify-between gap-2 py-3"
                >
                  <span>
                    v{pm.version} · {typeLabel} · {pm.display_mask}
                  </span>
                  <StatusBadge tone={toneForStatus(pm.status)}>
                    {statusLabel}
                  </StatusBadge>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section id="documentos" className="scroll-mt-20 space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h2 className="text-lg font-semibold text-stone-900">
            {tDocuments("title")}
          </h2>
          <button
            type="button"
            className="min-h-11 rounded-md border border-stone-300 px-4 py-2 text-sm font-medium hover:bg-stone-100"
            onClick={onOpenDocuments}
          >
            {tDocuments("send")}
          </button>
        </div>
        {documents.length === 0 ? (
          <EmptyState title={tDocuments("empty")} />
        ) : (
          <ul className="divide-y divide-stone-200 border-y border-stone-200 text-sm">
            {documents.map((doc) => {
              const scanLabel = tScanStatus.has(doc.scan_status)
                ? tScanStatus(doc.scan_status)
                : doc.scan_status;
              return (
                <li
                  key={doc.uuid}
                  className="flex flex-wrap items-center justify-between gap-2 py-3"
                >
                  <span>
                    {doc.original_filename} · {doc.purpose}
                  </span>
                  <StatusBadge tone={toneForStatus(doc.scan_status)}>
                    {scanLabel}
                    {doc.usable ? tDocuments("usableSuffix") : ""}
                  </StatusBadge>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
}

function ibanInputBorderClass(
  methodType: "iban" | "mbway",
  kind: ReturnType<typeof liveValidateIban>["kind"],
): string {
  if (methodType !== "iban" || kind === "empty") return "border-stone-300";
  if (kind === "valid") return "border-emerald-600";
  if (kind === "invalid") return "border-red-600";
  return "border-stone-300";
}

function ibanStatusTextClass(
  kind: ReturnType<typeof liveValidateIban>["kind"],
): string {
  if (kind === "valid") return "text-sm text-emerald-800";
  if (kind === "invalid") return "text-sm text-red-700";
  return "text-sm text-stone-500";
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
  const t = useTranslations("portal.payment");
  const tCommon = useTranslations("common");
  const tIban = useTranslations("validation.iban");
  const [methodType, setMethodType] = useState<"iban" | "mbway">("iban");
  const [iban, setIban] = useState("");
  const [phone, setPhone] = useState("");
  const [holderName, setHolderName] = useState(defaultHolderName);
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const ibanStatus = liveValidateIban(iban);
  const ibanBorderClass = ibanInputBorderClass(methodType, ibanStatus.kind);

  async function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setLocalError(null);

    if (methodType === "iban" && !isValidIban(iban)) {
      const hasIbanMessage =
        ibanStatus.kind === "invalid" || ibanStatus.kind === "incomplete";
      setLocalError(
        hasIbanMessage
          ? tIban(ibanStatus.messageKey, ibanStatus.values)
          : tIban("required"),
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
      setLocalError(err instanceof Error ? err.message : t("failed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="flex flex-col gap-3" onSubmit={handleSubmit} noValidate>
      <label className="flex flex-col gap-1 text-sm">
        {t("type")}
        <select
          className="rounded-md border border-stone-300 px-3 py-2"
          value={methodType}
          onChange={(e) => setMethodType(e.target.value as "iban" | "mbway")}
        >
          <option value="iban">{t("typeIban")}</option>
          <option value="mbway">{t("typeMbway")}</option>
        </select>
      </label>
      {methodType === "iban" ? (
        <div className="flex flex-col gap-1 text-sm">
          <label htmlFor="portal-iban" className="font-medium">
            {t("iban")}
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
              className={ibanStatusTextClass(ibanStatus.kind)}
            >
              {tIban(ibanStatus.messageKey, ibanStatus.values)}
            </p>
          ) : (
            <p id="portal-iban-status" className="sr-only">
              {t("ibanHint")}
            </p>
          )}
        </div>
      ) : (
        <label className="flex flex-col gap-1 text-sm">
          {t("phone")}
          <input
            className="rounded-md border border-stone-300 px-3 py-2"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />
        </label>
      )}
      <label className="flex flex-col gap-1 text-sm">
        {t("holder")}
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
        {loading ? tCommon("submitting") : t("submitVersion")}
      </button>
    </form>
  );
}

function DocumentUploadForm({
  onSubmit,
}: {
  onSubmit: (data: FormData) => Promise<void>;
}) {
  const t = useTranslations("portal.documents");
  const tCommon = useTranslations("common");
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    if (
      !data.get("file") ||
      !(data.get("file") instanceof File) ||
      !(data.get("file") as File).size
    ) {
      setLocalError(t("selectFile"));
      return;
    }
    setLocalError(null);
    setLoading(true);
    try {
      await onSubmit(data);
    } catch (err) {
      setLocalError(
        err instanceof Error ? err.message : tCommon("uploadFailed"),
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
      <label className="flex flex-col gap-1 text-sm">
        {t("purpose")}
        <input
          name="purpose"
          className="rounded-md border border-stone-300 px-3 py-2"
          defaultValue="identity"
          required
        />
      </label>
      <div className="flex flex-col gap-1 text-sm">
        <span id="portal-doc-file-label">{t("file")}</span>
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
            {t("browse")}
          </button>
          <p
            className="min-w-0 flex-1 truncate px-1 text-sm text-stone-600"
            aria-live="polite"
            aria-labelledby="portal-doc-file-label"
          >
            {fileName ?? t("noFile")}
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
        {loading ? t("sending") : t("sendSubmit")}
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
  const t = useTranslations("portal.payout");
  const tCommon = useTranslations("common");
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
      setLocalError(err instanceof Error ? err.message : t("failed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">{t("cleanDocs")}</legend>
        {usableDocs.length === 0 ? (
          <p className="text-sm text-stone-500">{t("noCleanDocs")}</p>
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
        {t("amountOptional")}
        <input
          className="rounded-md border border-stone-300 px-3 py-2"
          inputMode="numeric"
          value={payoutAmount}
          onChange={(e) => setPayoutAmount(e.target.value)}
          placeholder={t("amountPlaceholder")}
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
        {loading ? tCommon("submitting") : t("request")}
      </button>
    </form>
  );
}
