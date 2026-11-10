"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { fetchMe } from "@/lib/auth";

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
  const [events, setEvents] = useState<EventRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
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
        else setError(err instanceof Error ? err.message : "Sem acesso.");
      }
    })();
  }, [router]);

  return (
    <main className="mx-auto flex min-h-full w-full max-w-3xl flex-col gap-6 px-6 py-16">
      <div className="space-y-2">
        <p className="text-sm font-medium tracking-[0.2em] text-stone-500 uppercase">
          /admin/events
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">
          Eventos comerciais
        </h1>
        <p className="text-stone-600">
          Ingestão idempotente por (business, source, external_event_id).
        </p>
      </div>

      {error ? (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      <ul className="divide-y divide-stone-200 border-y border-stone-200 text-sm">
        {events.map((event) => (
          <li key={event.id} className="space-y-1 py-3">
            <p className="font-medium">
              {event.external_event_id} · {event.source}
            </p>
            <p className="text-stone-500">
              {event.event_type} · {event.amount_minor} {event.currency} ·{" "}
              {event.status}
              {event.referral_code ? ` · ref ${event.referral_code}` : ""}
              {event.commission
                ? ` · comissão ${event.commission.commission_minor}`
                : ""}
            </p>
            {event.status_reason ? (
              <p className="text-xs text-stone-500">{event.status_reason}</p>
            ) : null}
          </li>
        ))}
        {events.length === 0 ? (
          <li className="py-6 text-stone-500">Sem eventos.</li>
        ) : null}
      </ul>

      <Link href="/admin" className="text-sm underline-offset-2 hover:underline">
        Voltar
      </Link>
    </main>
  );
}
