<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Enums\PaymentMethodStatus;
use App\Http\Controllers\Controller;
use App\Http\Resources\PaymentMethodVersionResource;
use App\Models\PaymentMethodVersion;
use App\Services\Auth\SensitiveActionVerifier;
use App\Services\Onboarding\PaymentMethodService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

class PaymentMethodReviewController extends Controller
{
    public function __construct(
        private readonly PaymentMethodService $paymentMethods,
        private readonly SensitiveActionVerifier $sensitiveActions,
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $user = $request->user();
        $proofPurpose = (string) config('aact.documents.payment_proof_purpose', 'bank_proof');

        $query = PaymentMethodVersion::query()
            ->with([
                'user',
                'business',
                'membership.documents' => static function ($documents) use ($proofPurpose): void {
                    $documents->where('purpose', $proofPurpose)->latest('id');
                },
            ])
            ->latest('id');

        if (! $user->isPlatformAdmin()) {
            $query->whereIn('business_id', $user->accessibleBusinessIds());
        }

        $status = $request->input('status');
        if (is_string($status) && $status !== '' && $status !== 'all') {
            $query->where('status', $status);
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
            'password' => ['required', 'string'],
            'code' => ['required', 'string', 'max:64'],
            'notes' => [
                Rule::requiredIf($request->input('status') === 'rejected'),
                'nullable',
                'string',
                'max:1000',
            ],
        ]);

        $this->sensitiveActions->assertPasswordAndTotp(
            $request->user(),
            $validated['password'],
            $validated['code'],
        );

        $version = $this->paymentMethods->review(
            $request->user(),
            $paymentMethodVersion,
            PaymentMethodStatus::from($validated['status']),
            $validated['notes'] ?? null,
            $request,
        );

        $version->load([
            'user',
            'business',
            'membership.documents' => static function ($documents): void {
                $documents->where('purpose', config('aact.documents.payment_proof_purpose', 'bank_proof'))
                    ->latest('id');
            },
        ]);

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
