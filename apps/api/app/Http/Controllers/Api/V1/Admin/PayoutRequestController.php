<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\PayoutRequestResource;
use App\Models\PayoutRequest;
use App\Services\Settlement\PayoutRequestService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class PayoutRequestController extends Controller
{
    public function __construct(private readonly PayoutRequestService $payouts) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $user = $request->user();
        $query = PayoutRequest::query()
            ->with(['documents', 'paymentMethodVersion', 'business', 'membership'])
            ->latest('id');

        if (! $user->isPlatformAdmin()) {
            $query->whereIn('business_id', $user->accessibleBusinessIds());
        }

        if ($request->filled('status')) {
            $query->where('status', $request->string('status'));
        }

        return PayoutRequestResource::collection($query->paginate(25));
    }

    public function approve(Request $request, PayoutRequest $payoutRequest): PayoutRequestResource
    {
        $this->assertCanManage($request, $payoutRequest);

        return new PayoutRequestResource(
            $this->payouts->approve($request->user(), $payoutRequest, $request)
        );
    }

    public function reject(Request $request, PayoutRequest $payoutRequest): PayoutRequestResource
    {
        $this->assertCanManage($request, $payoutRequest);
        $validated = $request->validate([
            'reason' => ['required', 'string', 'max:1000'],
        ]);

        return new PayoutRequestResource(
            $this->payouts->reject($request->user(), $payoutRequest, $validated['reason'], $request)
        );
    }

    public function markPaid(Request $request, PayoutRequest $payoutRequest): PayoutRequestResource
    {
        $this->assertCanManage($request, $payoutRequest);
        $validated = $request->validate([
            'external_reference' => ['required', 'string', 'max:255'],
        ]);

        return new PayoutRequestResource(
            $this->payouts->markPaid(
                $request->user(),
                $payoutRequest,
                $validated['external_reference'],
                $request,
            )
        );
    }

    private function assertCanManage(Request $request, PayoutRequest $payout): void
    {
        $actor = $request->user();
        if (! $actor->isPlatformAdmin() && ! $actor->isBusinessAdmin($payout->business_id)) {
            abort(403);
        }
    }
}
