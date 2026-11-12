<?php

namespace App\Http\Controllers\Api\V1\Portal;

use App\Http\Controllers\Controller;
use App\Http\Resources\CommissionResource;
use App\Models\Commission;
use App\Services\Ledger\LedgerService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class CommissionController extends Controller
{
    public function __construct(private readonly LedgerService $ledger) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $commissions = Commission::query()
            ->with(['event', 'rule'])
            ->where('user_id', $request->user()->id)
            ->latest('id')
            ->paginate(25);

        return CommissionResource::collection($commissions);
    }

    public function balances(Request $request): JsonResponse
    {
        $memberships = $request->user()
            ->memberships()
            ->with('business')
            ->get();

        $balances = $memberships->map(function ($membership) {
            $payable = $this->ledger->payableBalanceMinor($membership);
            $reserved = $this->ledger->reservedPayoutMinor($membership);

            return [
                'membership_id' => $membership->id,
                'business_id' => $membership->business_id,
                'business_name' => $membership->business?->name,
                'currency' => $membership->business?->currency,
                'payable_minor' => $payable,
                'reserved_minor' => $reserved,
                'available_minor' => max(0, $payable - $reserved),
                'payout_threshold_minor' => (int) ($membership->business->payout_threshold_minor ?? 5000),
            ];
        })->values();

        return response()->json(['data' => $balances]);
    }
}
