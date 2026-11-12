"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { PageHeader } from "@/components/shell/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge, toneForStatus } from "@/components/ui/StatusBadge";
import { apiFetch } from "@/lib/api";
import { fetchMe } from "@/lib/auth";
import { formatMoney, type AppLocale } from "@/lib/locale";

type EventRow = {
  id: number;
  external_event_id: string;
  source: string;
  event_type: string;
  amount_minor: number;
  currency: string;
  referral_code: string | null;
  status: string;
  status_reason: string | null;
  commission?: { commission_minor: number } | null;
};

export default function AdminEventsPage() {
  const router = useRouter();
  const locale = useLocale() as AppLocale;
  const t = useTranslations("admin.events");
  const tCommon = useTranslations("common");
  const tEnums = useTranslations("enums.commercialEventStatus");
  const tEventType = useTranslations("enums.eventType");
  const [events, setEvents] = useState<EventRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const me = await fetchMe();
        if (me.session.mfa_setup_only) {
          router.replace("/admin/security?setup=1");
          return;
        }
        const response = await apiFetch<{ data: EventRow[] }>(
          "/api/v1/admin/commercial-events",
        );
        setEvents(response.data);
      } catch (err) {
        const status = (err as { status?: number }).status;
        if (status === 401) router.replace("/login");
        else setError(err instanceof Error ? err.message : tCommon("noAccess"));
      } finally {
        setLoading(false);
      }
    })();
  }, [router, tCommon]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("title")}
        description={t("description")}
        helpKey="admin.events"
      />

      {error ? (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="text-sm text-stone-500">{tCommon("loading")}</p>
      ) : events.length === 0 && !error ? (
        <EmptyState
          title={t("emptyTitle")}
          description={t("emptyDescription")}
        />
      ) : (
        <ul className="divide-y divide-stone-200 border-y border-stone-200 text-sm">
          {events.map((event) => (
            <li key={event.id} className="space-y-1 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium text-stone-900">
                  {event.external_event_id} · {event.source}
                </p>
                <StatusBadge tone={toneForStatus(event.status)}>
                  {tEnums.has(event.status)
                    ? tEnums(event.status)
                    : event.status}
                </StatusBadge>
              </div>
              <p className="text-stone-500">
                {t("line", {
                  eventType: tEventType.has(event.event_type)
                    ? tEventType(event.event_type)
                    : event.event_type,
                  amount: formatMoney(
                    event.amount_minor,
                    event.currency,
                    locale,
                  ),
                })}
                {event.referral_code
                  ? t("withRef", { code: event.referral_code })
                  : ""}
                {event.commission
                  ? t("withCommission", {
                      amount: formatMoney(
                        event.commission.commission_minor,
                        event.currency,
                        locale,
                      ),
                    })
                  : ""}
              </p>
              {event.status_reason ? (
                <p className="text-xs text-stone-500">{event.status_reason}</p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
