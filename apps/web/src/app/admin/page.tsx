"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  AdminShortcutCard,
  AdminShortcutPreviewRow,
} from "@/components/admin/AdminShortcutCard";
import { PageHeader } from "@/components/shell/PageHeader";
import { StatusBadge, toneForStatus } from "@/components/ui/StatusBadge";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { apiFetch } from "@/lib/api";
import { formatDateTime, formatMoney, type AppLocale } from "@/lib/locale";
import { navIcons } from "@/lib/navIcons";

type Paginated<T> = {
  data: T[];
  meta?: { total?: number };
};

type BusinessRow = {
  id: number;
  name: string;
  is_active: boolean;
  created_at: string | null;
  websites?: Array<{ id: number }>;
};

type InvitationRow = {
  uuid: string;
  email: string;
  business: { id: number; name: string };
  expires_at: string;
  accepted: boolean;
  revoked: boolean;
  expired: boolean;
};

type MembershipRow = {
  id: number;
  role: string;
  status: string;
  user?: { id: number; name: string; email: string };
  business?: { id: number; name: string };
};

type EventRow = {
  id: number;
  source: string;
  event_type: string;
  amount_minor: number;
  currency: string;
  status: string;
};

type PayoutRow = {
  id: number;
  amount_minor: number;
  currency: string;
  status: string;
  business?: { id: number; name: string };
};

type CardState<T> = {
  total: number;
  items: T[];
  error: string | null;
};

function emptyCard<T>(): CardState<T> {
  return { total: 0, items: [], error: null };
}

function invitationStatusKey(
  invite: Pick<InvitationRow, "accepted" | "revoked" | "expired">,
): "statusAccepted" | "statusRevoked" | "statusExpired" | "statusActive" {
  if (invite.accepted) return "statusAccepted";
  if (invite.revoked) return "statusRevoked";
  if (invite.expired) return "statusExpired";
  return "statusActive";
}

function totalFrom(response: Paginated<unknown>): number {
  return response.meta?.total ?? response.data.length;
}

async function loadCard<T>(
  path: string,
  mapItems: (data: T[]) => T[],
): Promise<CardState<T>> {
  try {
    const response = await apiFetch<Paginated<T>>(path);
    return {
      total: totalFrom(response),
      items: mapItems(response.data).slice(0, 1),
      error: null,
    };
  } catch (err) {
    return {
      total: 0,
      items: [],
      error: err instanceof Error ? err.message : "error",
    };
  }
}

export default function AdminHomePage() {
  const { user, ready } = useRequireAuth();
  const locale = useLocale() as AppLocale;
  const t = useTranslations("admin.home");
  const tCommon = useTranslations("common");
  const tInvites = useTranslations("admin.invitations");
  const tBusinesses = useTranslations("admin.businesses");
  const tRole = useTranslations("enums.membershipRole");
  const tMembershipStatus = useTranslations("enums.membershipStatus");
  const tEventStatus = useTranslations("enums.commercialEventStatus");
  const tEventType = useTranslations("enums.eventType");
  const tPayoutStatus = useTranslations("enums.payoutRequestStatus");
  const [loading, setLoading] = useState(true);
  const [businesses, setBusinesses] = useState<CardState<BusinessRow>>(emptyCard);
  const [invitations, setInvitations] =
    useState<CardState<InvitationRow>>(emptyCard);
  const [memberships, setMemberships] =
    useState<CardState<MembershipRow>>(emptyCard);
  const [events, setEvents] = useState<CardState<EventRow>>(emptyCard);
  const [payouts, setPayouts] = useState<CardState<PayoutRow>>(emptyCard);

  useEffect(() => {
    if (!ready || !user) return;

    void (async () => {
      setLoading(true);
      const [
        businessesCard,
        invitationsCard,
        membershipsCard,
        eventsCard,
        payoutsListCard,
        payoutsPendingCard,
      ] = await Promise.all([
        loadCard<BusinessRow>("/api/v1/admin/businesses", (data) =>
          [...data].sort((a, b) => {
            const aTime = a.created_at ? Date.parse(a.created_at) : 0;
            const bTime = b.created_at ? Date.parse(b.created_at) : 0;
            return bTime - aTime;
          }),
        ),
        loadCard<InvitationRow>("/api/v1/admin/invitations", (data) => data),
        loadCard<MembershipRow>("/api/v1/admin/memberships", (data) => data),
        loadCard<EventRow>("/api/v1/admin/commercial-events", (data) => data),
        loadCard<PayoutRow>("/api/v1/admin/payout-requests", (data) => data),
        loadCard<PayoutRow>(
          "/api/v1/admin/payout-requests?status=pending",
          (data) => data,
        ),
      ]);

      setBusinesses(businessesCard);
      setInvitations(invitationsCard);
      setMemberships(membershipsCard);
      setEvents(eventsCard);
      setPayouts({
        total: payoutsPendingCard.error
          ? payoutsListCard.total
          : payoutsPendingCard.total,
        items: payoutsListCard.items,
        error: payoutsListCard.error,
      });
      setLoading(false);
    })();
  }, [ready, user]);

  if (!ready || !user) {
    return <p className="text-stone-600">{tCommon("loading")}</p>;
  }

  function cardError(error: string | null): string | null {
    if (!error) return null;
    if (error === "error") return t("cardError");
    return error;
  }

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title={t("title")}
        description={t("greeting", { name: user.name })}
      />

      <section className="space-y-3">
        <h2 className="text-sm font-medium tracking-wide text-stone-500 uppercase">
          {t("shortcuts")}
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <AdminShortcutCard
            href="/admin/businesses"
            icon={navIcons.building}
            title={t("shortcutBusinesses")}
            subtitle={t("subtitleTotal")}
            total={businesses.total}
            loading={loading}
            loadingLabel={tCommon("loading")}
            emptyLabel={t("previewEmpty")}
            error={cardError(businesses.error)}
          >
            {businesses.items.map((item) => (
              <AdminShortcutPreviewRow
                key={item.id}
                primary={item.name}
                badge={
                  <StatusBadge tone={item.is_active ? "success" : "danger"}>
                    {item.is_active
                      ? tCommon("active")
                      : tCommon("inactive")}
                  </StatusBadge>
                }
                secondary={tBusinesses("websiteCount", {
                  count: item.websites?.length ?? 0,
                })}
              />
            ))}
          </AdminShortcutCard>

          <AdminShortcutCard
            href="/admin/invitations"
            icon={navIcons.envelope}
            title={t("shortcutInvitations")}
            subtitle={t("subtitleLatestInvitations")}
            total={invitations.total}
            loading={loading}
            loadingLabel={tCommon("loading")}
            emptyLabel={t("previewEmpty")}
            error={cardError(invitations.error)}
          >
            {invitations.items.map((item) => {
              const statusKey = invitationStatusKey(item);
              return (
                <AdminShortcutPreviewRow
                  key={item.uuid}
                  primary={item.email}
                  secondary={item.business.name}
                  badge={
                    <StatusBadge tone={toneForStatus(statusKey)}>
                      {tInvites(statusKey)}
                    </StatusBadge>
                  }
                  meta={tCommon("expiresAt", {
                    date: formatDateTime(item.expires_at, locale),
                  })}
                />
              );
            })}
          </AdminShortcutCard>

          <AdminShortcutCard
            href="/admin/memberships"
            icon={navIcons.users}
            title={t("shortcutMemberships")}
            subtitle={t("subtitleTotal")}
            total={memberships.total}
            loading={loading}
            loadingLabel={tCommon("loading")}
            emptyLabel={t("previewEmpty")}
            error={cardError(memberships.error)}
          >
            {memberships.items.map((item) => (
              <AdminShortcutPreviewRow
                key={item.id}
                primary={item.user?.name ?? item.user?.email ?? tCommon("none")}
                secondary={
                  item.business?.name
                    ? `${item.business.name} · ${
                        tRole.has(item.role) ? tRole(item.role) : item.role
                      }`
                    : tRole.has(item.role)
                      ? tRole(item.role)
                      : item.role
                }
                badge={
                  <StatusBadge tone={toneForStatus(item.status)}>
                    {tMembershipStatus.has(item.status)
                      ? tMembershipStatus(item.status)
                      : item.status}
                  </StatusBadge>
                }
              />
            ))}
          </AdminShortcutCard>

          <AdminShortcutCard
            href="/admin/events"
            icon={navIcons.calendar}
            title={t("shortcutEvents")}
            subtitle={t("subtitleLatestEvents")}
            total={events.total}
            loading={loading}
            loadingLabel={tCommon("loading")}
            emptyLabel={t("previewEmpty")}
            error={cardError(events.error)}
          >
            {events.items.map((item) => (
              <AdminShortcutPreviewRow
                key={item.id}
                primary={`${tEventType.has(item.event_type) ? tEventType(item.event_type) : item.event_type} · ${item.source}`}
                secondary={formatMoney(
                  item.amount_minor,
                  item.currency,
                  locale,
                )}
                badge={
                  <StatusBadge tone={toneForStatus(item.status)}>
                    {tEventStatus.has(item.status)
                      ? tEventStatus(item.status)
                      : item.status}
                  </StatusBadge>
                }
              />
            ))}
          </AdminShortcutCard>

          <AdminShortcutCard
            href="/admin/payout-requests"
            icon={navIcons.money}
            title={t("shortcutPayouts")}
            subtitle={t("subtitlePendingPayouts")}
            total={payouts.total}
            loading={loading}
            loadingLabel={tCommon("loading")}
            emptyLabel={t("previewEmpty")}
            error={cardError(payouts.error)}
          >
            {payouts.items.map((item) => (
              <AdminShortcutPreviewRow
                key={item.id}
                primary={formatMoney(
                  item.amount_minor,
                  item.currency,
                  locale,
                )}
                secondary={item.business?.name ?? tCommon("business")}
                badge={
                  <StatusBadge tone={toneForStatus(item.status)}>
                    {tPayoutStatus.has(item.status)
                      ? tPayoutStatus(item.status)
                      : item.status}
                  </StatusBadge>
                }
              />
            ))}
          </AdminShortcutCard>
        </ul>
      </section>
    </div>
  );
}
