<?php

namespace App\Http\Controllers\Api\V1\Auth;

use App\Http\Controllers\Controller;
use App\Services\Auth\EmailOtpService;
use App\Support\AuthSession;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class EmailOtpController extends Controller
{
    public function __construct(private readonly EmailOtpService $emailOtps) {}

    public function enable(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user->requiresTotpForAdminAccess() && ! $user->hasConfirmedTotp()) {
            throw ValidationException::withMessages([
                'email_otp' => ['Administrators must enable TOTP before email OTP.'],
            ]);
        }

        $this->emailOtps->enable($user);
        $this->emailOtps->issue($user);

        return response()->json([
            'status' => 'email_otp_enabled',
            'assurance' => 'lower_than_totp',
        ]);
    }

    public function disable(Request $request): JsonResponse
    {
        if (! AuthSession::hasValidStepUp()) {
            throw ValidationException::withMessages([
                'step_up' => ['Recent re-authentication is required.'],
            ]);
        }

        $this->emailOtps->disable($request->user());

        return response()->json(['status' => 'email_otp_disabled']);
    }

    public function resend(Request $request): JsonResponse
    {
        $this->emailOtps->issue($request->user());

        return response()->json(['status' => 'email_otp_sent']);
    }
}
