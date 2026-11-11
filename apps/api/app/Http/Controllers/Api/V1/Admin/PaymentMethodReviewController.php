<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Enums\PaymentMethodStatus;
use App\Http\Controllers\Controller;
use App\Http\Resources\PaymentMethodVersionResource;
use App\Models\PaymentMethodVersion;
use App\Services\Onboarding\PaymentMethodService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class PaymentMethodReviewController extends Controller
{
    public function __construct(private readonly PaymentMethodService $paymentMethods) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $user = $request->user();
        $query = PaymentMethodVersion::query()
            ->with(['user', 'business'])
            ->latest('id');

        if (! $user->isPlatformAdmin()) {
            $query->whereIn('business_id', $user->accessibleBusinessIds());
        }

        if ($request->filled('status') && $request->string('status') !== 'all') {
            $query->where('status', $request->string('status'));
        }

        if ($request->filled('business_id')) {
            $businessId = (int) $request->integer('business_id');
            if (! $user->belongsToBusiness($businessId) && ! $user->isPlatformAdmin()) {
                abort(403);
            }
            $query->where('business_id', $businessId);
        }

        return PaymentMethodVersionResource::collection($query->paginate(25));
    }

    public function review(Request $request, PaymentMethodVersion $paymentMethodVersion): PaymentMethodVersionResource
    {
        $this->assertCanManage($request, $paymentMethodVersion);

        $validated = $request->validate([
            'status' => ['required', 'in:approved,rejected'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        $version = $this->paymentMethods->review(
            $request->user(),
            $paymentMethodVersion,
            PaymentMethodStatus::from($validated['status']),
            $validated['notes'] ?? null,
            $request,
        );

        return new PaymentMethodVersionResource($version);
    }

    public function reveal(Request $request, PaymentMethodVersion $paymentMethodVersion): JsonResponse
    {
        $this->assertCanManage($request, $paymentMethodVersion);

        return response()->json([
            'uuid' => $paymentMethodVersion->uuid,
            'payload' => $this->paymentMethods->reveal($request->user(), $paymentMethodVersion, $request),
        ]);
    }

    private function assertCanManage(Request $request, PaymentMethodVersion $version): void
    {
        $actor = $request->user();
        if (! $actor->isPlatformAdmin() && ! $actor->isBusinessAdmin($version->business_id)) {
            abort(403);
        }
    }
}
