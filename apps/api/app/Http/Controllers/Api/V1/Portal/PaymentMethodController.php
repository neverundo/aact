<?php

namespace App\Http\Controllers\Api\V1\Portal;

use App\Enums\PaymentMethodType;
use App\Http\Controllers\Controller;
use App\Http\Resources\PaymentMethodVersionResource;
use App\Models\BusinessMembership;
use App\Services\Onboarding\PaymentMethodService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PaymentMethodController extends Controller
{
    public function __construct(private readonly PaymentMethodService $paymentMethods) {}

    public function store(Request $request, BusinessMembership $membership): JsonResponse
    {
        if ($membership->user_id !== $request->user()->id) {
            abort(403);
        }

        $validated = $request->validate([
            'method_type' => ['required', 'in:iban,mbway'],
            'iban' => ['required_if:method_type,iban', 'nullable', 'string'],
            'phone' => ['required_if:method_type,mbway', 'nullable', 'string'],
            'holder_name' => ['required', 'string', 'max:255'],
        ]);

        $version = $this->paymentMethods->submit(
            $request->user(),
            $membership,
            PaymentMethodType::from($validated['method_type']),
            [
                'iban' => $validated['iban'] ?? null,
                'phone' => $validated['phone'] ?? null,
                'holder_name' => $validated['holder_name'],
            ],
            $request,
        );

        return (new PaymentMethodVersionResource($version))
            ->response()
            ->setStatusCode(201);
    }
}
