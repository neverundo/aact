<?php

namespace App\Http\Controllers\Api\V1\Auth;

use App\Http\Controllers\Controller;
use App\Services\Auth\RecoveryCodeService;
use App\Services\Auth\TotpService;
use App\Support\AuthSession;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class TotpController extends Controller
{
    public function __construct(
        private readonly TotpService $totp,
        private readonly RecoveryCodeService $recoveryCodes,
    ) {}

    public function begin(Request $request): JsonResponse
    {
        $setup = $this->totp->beginSetup($request->user());

        return response()->json([
            'secret' => $setup['secret'],
            'otpauth_url' => $setup['otpauth_url'],
            'qr_svg' => $setup['qr_svg'],
        ]);
    }

    public function confirm(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'code' => ['required', 'string', 'size:6'],
        ]);

        $user = $request->user();
        $this->totp->confirmSetup($user, $validated['code']);
        $codes = $this->recoveryCodes->regenerate($user);

        if (AuthSession::isMfaSetupOnly()) {
            AuthSession::markFullyAuthenticated();
        }

        return response()->json([
            'status' => 'totp_enabled',
            'recovery_codes' => $codes,
        ]);
    }

    public function destroy(Request $request): JsonResponse
    {
        if (! AuthSession::hasValidStepUp()) {
            throw ValidationException::withMessages([
                'step_up' => ['Recent re-authentication is required to disable TOTP.'],
            ]);
        }

        $validated = $request->validate([
            'code' => ['required', 'string'],
        ]);

        $user = $request->user();

        if ($user->requiresTotpForAdminAccess()) {
            throw ValidationException::withMessages([
                'code' => ['Administrators cannot disable TOTP while it is required.'],
            ]);
        }

        $this->totp->verifyForUser($user, $validated['code']);
        $this->totp->disable($user);

        return response()->json(['status' => 'totp_disabled']);
    }
}
