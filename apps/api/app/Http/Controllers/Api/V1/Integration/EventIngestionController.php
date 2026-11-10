<?php

namespace App\Http\Controllers\Api\V1\Integration;

use App\Http\Controllers\Controller;
use App\Http\Resources\CommercialEventResource;
use App\Http\Resources\CommissionResource;
use App\Services\Commission\CommissionReversalService;
use App\Services\Integration\EventIngestionService;
use App\Services\Integration\HmacRequestAuthenticator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class EventIngestionController extends Controller
{
    public function __construct(
        private readonly HmacRequestAuthenticator $authenticator,
        private readonly EventIngestionService $ingestion,
        private readonly CommissionReversalService $reversals,
    ) {}

    public function store(Request $request): JsonResponse
    {
        $credential = $this->authenticator->authenticate($request, 'events:write');

        $eventType = (string) $request->input('event_type');

        if (in_array($eventType, ['refund', 'chargeback'], true)) {
            $validated = $request->validate([
                'external_event_id' => ['required', 'string', 'max:191'],
                'event_type' => ['required', 'in:refund,chargeback'],
                'related_external_event_id' => ['required', 'string', 'max:191'],
                'occurred_at' => ['required', 'date'],
                'amount_minor' => ['required', 'integer', 'min:1'],
                'currency' => ['required', 'string', 'size:3'],
                'metadata' => ['nullable', 'array'],
            ]);

            $result = $this->reversals->reverse($credential, $validated, $request);

            return response()->json([
                'replayed' => $result['replayed'],
                'reversed_minor' => $result['reversed_minor'],
                'event' => (new CommercialEventResource($result['event']))->resolve(),
                'commission' => $result['commission']
                    ? (new CommissionResource($result['commission']))->resolve()
                    : null,
            ], $result['replayed'] ? 200 : 201);
        }

        $validated = $request->validate([
            'external_event_id' => ['required', 'string', 'max:191'],
            'event_type' => ['required', 'string', 'max:64'],
            'occurred_at' => ['required', 'date'],
            'amount_minor' => ['required', 'integer', 'min:1'],
            'currency' => ['required', 'string', 'size:3'],
            'referral_code' => ['nullable', 'string', 'max:64'],
            'metadata' => ['nullable', 'array'],
        ]);

        $result = $this->ingestion->ingest($credential, $validated, $request);

        return response()->json([
            'replayed' => $result['replayed'],
            'event' => (new CommercialEventResource($result['event']))->resolve(),
            'commission' => $result['commission']
                ? (new CommissionResource($result['commission']))->resolve()
                : null,
        ], $result['replayed'] ? 200 : 201);
    }
}
