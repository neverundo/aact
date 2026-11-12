import type { DocLocale, DocPage } from "../types";

/** Minimal TypeScript client — sign exact raw body bytes, then POST. */
const typescriptClient = `import { createHmac, randomBytes } from "node:crypto";

type AactConfig = {
  baseUrl: string; // e.g. http://localhost:18080
  token: string;
  hmacSecret: string;
};

export async function postAactEvent(
  config: AactConfig,
  body: Record<string, unknown>,
): Promise<{ status: number; json: unknown }> {
  const rawBody = JSON.stringify(body);
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = randomBytes(16).toString("hex");
  const signature = createHmac("sha256", config.hmacSecret)
    .update(\`\${timestamp}.\${nonce}.\${rawBody}\`)
    .digest("hex");

  const res = await fetch(\`\${config.baseUrl}/api/v1/integration/events\`, {
    method: "POST",
    headers: {
      Authorization: \`Bearer \${config.token}\`,
      "Content-Type": "application/json",
      Accept: "application/json",
      "X-AACT-Timestamp": timestamp,
      "X-AACT-Nonce": nonce,
      "X-AACT-Signature": signature,
    },
    body: rawBody, // must be the same string that was signed
  });

  return { status: res.status, json: await res.json() };
}`;

const typescriptNotifier = `// Call after your PSP webhook confirms the sale is paid.
export async function notifyAactSale(input: {
  orderId: string;
  amountMinor: number;
  currency: string;
  referralCode?: string | null;
  paidAt: Date;
}) {
  const config = {
    baseUrl: process.env.AACT_URL!,
    token: process.env.AACT_TOKEN!,
    hmacSecret: process.env.AACT_HMAC_SECRET!,
  };

  const body = {
    external_event_id: \`ord-\${input.orderId}\`,
    event_type: "sale",
    occurred_at: input.paidAt.toISOString(),
    amount_minor: input.amountMinor,
    currency: input.currency.toUpperCase(),
    referral_code: input.referralCode ?? undefined,
    metadata: { channel: "node_checkout" },
  };

  // Prefer a queue/job in production — do not fail the paid sale if AACT is down.
  const { status, json } = await postAactEvent(config, body);
  if (status !== 200 && status !== 201) {
    throw new Error(\`AACT sale failed: \${status} \${JSON.stringify(json)}\`);
  }
  return json;
}`;

const phpClient = `<?php

final class AactClient
{
    public function __construct(
        private readonly string $baseUrl,
        private readonly string $token,
        private readonly string $hmacSecret,
    ) {}

    /** @param array<string, mixed> $body */
    public function postEvent(array $body): array
    {
        $rawBody = json_encode($body, JSON_THROW_ON_ERROR | JSON_UNESCAPED_SLASHES);
        $timestamp = (string) time();
        $nonce = bin2hex(random_bytes(16));
        $signature = hash_hmac('sha256', $timestamp.'.'.$nonce.'.'.$rawBody, $this->hmacSecret);

        $ch = curl_init(rtrim($this->baseUrl, '/').'/api/v1/integration/events');
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => [
                'Authorization: Bearer '.$this->token,
                'Content-Type: application/json',
                'Accept: application/json',
                'X-AACT-Timestamp: '.$timestamp,
                'X-AACT-Nonce: '.$nonce,
                'X-AACT-Signature: '.$signature,
            ],
            CURLOPT_POSTFIELDS => $rawBody,
            CURLOPT_TIMEOUT => 15,
        ]);

        $response = curl_exec($ch);
        $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        if ($response === false) {
            throw new RuntimeException('AACT request failed: '.curl_error($ch));
        }
        curl_close($ch);

        return [
            'status' => $status,
            'body' => json_decode($response, true, 512, JSON_THROW_ON_ERROR),
        ];
    }
}`;

const phpNotifier = `<?php

/** Call after your PSP confirms the payment is paid (never on checkout start). */
final class AactSaleNotifier
{
    public function __construct(private readonly AactClient $client) {}

    public function notifyPaidSale(
        string $orderId,
        int $amountMinor,
        string $currency,
        ?string $referralCode,
        \\DateTimeInterface $paidAt,
    ): ?array {
        $body = [
            'external_event_id' => 'ord-'.$orderId,
            'event_type' => 'sale',
            'occurred_at' => $paidAt->format(DATE_ATOM),
            'amount_minor' => $amountMinor,
            'currency' => strtoupper($currency),
            'metadata' => ['channel' => 'node_checkout'],
        ];
        if ($referralCode !== null && $referralCode !== '') {
            $body['referral_code'] = $referralCode;
        }

        // Dispatch to a queue in production so AACT downtime cannot unwind a paid sale.
        $result = $this->client->postEvent($body);
        if (! in_array($result['status'], [200, 201], true)) {
            throw new RuntimeException('AACT sale failed with HTTP '.$result['status']);
        }

        return $result;
    }
}`;

const pages: Record<DocLocale, DocPage> = {
  en: {
    slug: "/docs/integrations/client",
    title: "Client & notifier",
    description:
      "Minimal PHP and TypeScript helpers to sign requests and notify AACT after payment confirmation.",
    sections: [
      {
        id: "overview",
        title: "What to build",
        blocks: [
          {
            type: "paragraph",
            text: "On the origin backend, keep two small pieces: a client that signs and POSTs events, and a notifier/hook invoked only after the PSP confirms the sale is paid. Prefer a queue around the notifier so AACT outages never reverse a paid order.",
          },
          {
            type: "list",
            items: [
              "Client: build raw JSON → HMAC → POST /api/v1/integration/events",
              "Notifier: map your order/payment fields into sale (and later refund) payloads",
              "Hook: call the notifier from the paid webhook / provider-evidence path",
            ],
          },
          {
            type: "callout",
            tone: "warning",
            title: "Server only",
            text: "Keep AACT_TOKEN and AACT_HMAC_SECRET out of the browser. Sign the exact raw body string you send.",
          },
        ],
      },
      {
        id: "env",
        title: "Environment",
        blocks: [
          {
            type: "code",
            language: "bash",
            caption: "origin backend",
            code: `AACT_URL=http://localhost:18080
AACT_TOKEN=aact_…
AACT_HMAC_SECRET=…`,
          },
          {
            type: "paragraph",
            text: "Create the credential under Admin → Integrations (step-up password). Use a stable source such as node_checkout.",
          },
        ],
      },
      {
        id: "typescript-client",
        title: "TypeScript client",
        blocks: [
          {
            type: "code",
            language: "typescript",
            caption: "postAactEvent",
            code: typescriptClient,
          },
        ],
      },
      {
        id: "typescript-notifier",
        title: "TypeScript notifier (hook target)",
        blocks: [
          {
            type: "code",
            language: "typescript",
            caption: "notifyAactSale",
            code: typescriptNotifier,
          },
          {
            type: "paragraph",
            text: "Wire notifyAactSale into your paid webhook handler (or a job it dispatches). Reuse the same external_event_id on retries; mint a new timestamp and nonce each attempt.",
          },
        ],
      },
      {
        id: "php-client",
        title: "PHP client",
        blocks: [
          {
            type: "code",
            language: "php",
            caption: "AactClient",
            code: phpClient,
          },
        ],
      },
      {
        id: "php-notifier",
        title: "PHP notifier (hook target)",
        blocks: [
          {
            type: "code",
            language: "php",
            caption: "AactSaleNotifier",
            code: phpNotifier,
          },
          {
            type: "code",
            language: "php",
            caption: "after paid confirmation",
            code: `// Inside your PSP "paid" handler, after local persistence:
$notifier = new AactSaleNotifier(
    new AactClient(
        getenv('AACT_URL') ?: '',
        getenv('AACT_TOKEN') ?: '',
        getenv('AACT_HMAC_SECRET') ?: '',
    ),
);

$notifier->notifyPaidSale(
    orderId: $order->id,
    amountMinor: $order->amount_cents,
    currency: $order->currency,
    referralCode: $order->referral_code,
    paidAt: $order->paid_at,
);`,
          },
        ],
      },
      {
        id: "refunds",
        title: "Refund sketch",
        blocks: [
          {
            type: "paragraph",
            text: "Use a new external_event_id and point related_external_event_id at the original sale id.",
          },
          {
            type: "code",
            language: "typescript",
            code: `await postAactEvent(config, {
  external_event_id: \`refund-\${refundId}\`,
  event_type: "refund",
  related_external_event_id: \`ord-\${orderId}\`,
  occurred_at: new Date().toISOString(),
  amount_minor: refundAmountMinor,
  currency: "EUR",
});`,
          },
        ],
      },
      {
        id: "next",
        title: "Next",
        blocks: [
          {
            type: "linkList",
            items: [
              {
                href: "/docs/integrations/checkout",
                label: "Checkout narrative",
                description: "End-to-end flow and origin env",
              },
              {
                href: "/docs/integrations/authentication",
                label: "Authentication",
                description: "Headers and signing rules",
              },
              {
                href: "/docs/integrations/idempotency",
                label: "Idempotency",
                description: "Retries and replay behaviour",
              },
            ],
          },
        ],
      },
    ],
  },
  pt: {
    slug: "/docs/integrations/client",
    title: "Cliente e notifier",
    description:
      "Helpers mínimos em PHP e TypeScript para assinar pedidos e notificar a AACT após confirmação de pagamento.",
    sections: [
      {
        id: "overview",
        title: "O que construir",
        blocks: [
          {
            type: "paragraph",
            text: "No backend de origem, mantenha duas peças pequenas: um client que assina e faz POST dos eventos, e um notifier/hook invocado só depois do PSP confirmar que a venda está paga. Prefira uma queue à volta do notifier para que falhas da AACT nunca revertam uma encomenda paga.",
          },
          {
            type: "list",
            items: [
              "Client: construir JSON raw → HMAC → POST /api/v1/integration/events",
              "Notifier: mapear campos da encomenda/pagamento para payloads sale (e depois refund)",
              "Hook: chamar o notifier a partir do webhook paid / evidence do fornecedor",
            ],
          },
          {
            type: "callout",
            tone: "warning",
            title: "Só no servidor",
            text: "Mantenha AACT_TOKEN e AACT_HMAC_SECRET fora do browser. Assine exactamente a string raw body que envia.",
          },
        ],
      },
      {
        id: "env",
        title: "Ambiente",
        blocks: [
          {
            type: "code",
            language: "bash",
            caption: "backend de origem",
            code: `AACT_URL=http://localhost:18080
AACT_TOKEN=aact_…
AACT_HMAC_SECRET=…`,
          },
          {
            type: "paragraph",
            text: "Crie a credencial em Admin → Integrations (palavra-passe de step-up). Use um source estável como node_checkout.",
          },
        ],
      },
      {
        id: "typescript-client",
        title: "Cliente TypeScript",
        blocks: [
          {
            type: "code",
            language: "typescript",
            caption: "postAactEvent",
            code: typescriptClient,
          },
        ],
      },
      {
        id: "typescript-notifier",
        title: "Notifier TypeScript (alvo do hook)",
        blocks: [
          {
            type: "code",
            language: "typescript",
            caption: "notifyAactSale",
            code: typescriptNotifier,
          },
          {
            type: "paragraph",
            text: "Ligue notifyAactSale ao handler do webhook paid (ou a um job que ele despacha). Reutilize o mesmo external_event_id nos retries; novo timestamp e nonce em cada tentativa.",
          },
        ],
      },
      {
        id: "php-client",
        title: "Cliente PHP",
        blocks: [
          {
            type: "code",
            language: "php",
            caption: "AactClient",
            code: phpClient,
          },
        ],
      },
      {
        id: "php-notifier",
        title: "Notifier PHP (alvo do hook)",
        blocks: [
          {
            type: "code",
            language: "php",
            caption: "AactSaleNotifier",
            code: phpNotifier,
          },
          {
            type: "code",
            language: "php",
            caption: "após confirmação paid",
            code: `// Dentro do handler "paid" do PSP, após persistência local:
$notifier = new AactSaleNotifier(
    new AactClient(
        getenv('AACT_URL') ?: '',
        getenv('AACT_TOKEN') ?: '',
        getenv('AACT_HMAC_SECRET') ?: '',
    ),
);

$notifier->notifyPaidSale(
    orderId: $order->id,
    amountMinor: $order->amount_cents,
    currency: $order->currency,
    referralCode: $order->referral_code,
    paidAt: $order->paid_at,
);`,
          },
        ],
      },
      {
        id: "refunds",
        title: "Esboço de refund",
        blocks: [
          {
            type: "paragraph",
            text: "Use um novo external_event_id e aponte related_external_event_id para o id da sale original.",
          },
          {
            type: "code",
            language: "typescript",
            code: `await postAactEvent(config, {
  external_event_id: \`refund-\${refundId}\`,
  event_type: "refund",
  related_external_event_id: \`ord-\${orderId}\`,
  occurred_at: new Date().toISOString(),
  amount_minor: refundAmountMinor,
  currency: "EUR",
});`,
          },
        ],
      },
      {
        id: "next",
        title: "Seguinte",
        blocks: [
          {
            type: "linkList",
            items: [
              {
                href: "/docs/integrations/checkout",
                label: "Narrativa de checkout",
                description: "Fluxo completo e env de origem",
              },
              {
                href: "/docs/integrations/authentication",
                label: "Autenticação",
                description: "Headers e regras de assinatura",
              },
              {
                href: "/docs/integrations/idempotency",
                label: "Idempotência",
                description: "Retries e comportamento de replay",
              },
            ],
          },
        ],
      },
    ],
  },
};

export function getIntegrationClientPage(locale: DocLocale): DocPage {
  return pages[locale];
}
