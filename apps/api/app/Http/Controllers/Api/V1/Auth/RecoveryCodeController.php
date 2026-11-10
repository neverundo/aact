<?php

namespace App\Http\Controllers\Api\V1\Auth;

use App\Http\Controllers\Controller;
use App\Services\Auth\RecoveryCodeService;
use App\Services\Auth\TotpService;
use App\Support\AuthSession;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class RecoveryCodeController extends Controller
{
    public function __construct(
        private readonly RecoveryCodeService $recoveryCodes,
        private readonly TotpService $totp,
    ) {}

    public function regenerate(Request $request): JsonResponse
    {
        if (! AuthSession::hasValidStepUp()) {
            throw ValidationException::withMessages([
                'step_up' => ['Recent re-authentication is required.'],
            ]);
        }

        $validated = $request->validate([
            'code' => ['required', 'string'],
        ]);

        $user = $request->user();

        if (! $user->hasConfirmedTotp()) {
            throw ValidationException::withMessages([
                'code' => ['TOTP must be enabled before regenerating recovery codes.'],
            ]);
        }

        $this->totp->verifyForUser($user, $validated['code']);
        $codes = $this->recoveryCodes->regenerate($user);

        return response()->json([
            'status' => 'recovery_codes_regenerated',
            'recovery_codes' => $codes,
        ]);
    }
}
