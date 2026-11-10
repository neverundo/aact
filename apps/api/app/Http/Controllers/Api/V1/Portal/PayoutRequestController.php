<?php

namespace App\Http\Controllers\Api\V1\Portal;

use App\Http\Controllers\Controller;
use App\Http\Resources\PayoutRequestResource;
use App\Models\BusinessMembership;
use App\Models\PayoutRequest;
use App\Services\Settlement\PayoutRequestService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class PayoutRequestController extends Controller
{
    public function __construct(private readonly PayoutRequestService $payouts) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $items = PayoutRequest::query()
            ->with(['documents', 'paymentMethodVersion', 'business'])
            ->where('user_id', $request->user()->id)
            ->latest('id')
            ->paginate(25);

        return PayoutRequestResource::collection($items);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'membership_id' => ['required', 'integer', 'exists:business_memberships,id'],
            'document_uuids' => ['required', 'array', 'min:1'],
            'document_uuids.*' => ['uuid'],
            'amount_minor' => ['nullable', 'integer', 'min:1'],
        ]);

        $membership = BusinessMembership::query()->findOrFail($validated['membership_id']);

        $payout = $this->payouts->request(
            $request->user(),
            $membership,
            $validated['document_uuids'],
            $validated['amount_minor'] ?? null,
            $request,
        );

        return (new PayoutRequestResource($payout))
            ->response()
            ->setStatusCode(201);
    }
}
