<?php

namespace App\Http\Controllers\Api\V1\Auth;

use App\Http\Controllers\Controller;
use App\Services\Auth\RecoveryCodeService;
use App\Services\Auth\TotpService;
use App\Support\AuthSession;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class StepUpController extends Controller
{
    public function __construct(
        private readonly TotpService $totp,
        private readonly RecoveryCodeService $recoveryCodes,
    ) {}

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'method' => ['required', 'in:totp,recovery_code,password'],
            'code' => ['required_unless:method,password', 'nullable', 'string'],
            'password' => ['required_if:method,password', 'nullable', 'string'],
        ]);

        $user = $request->user();

        match ($validated['method']) {
            'totp' => $this->totp->verifyForUser($user, (string) $validated['code']),
            'recovery_code' => $this->recoveryCodes->consume($user, (string) $validated['code']),
            'password' => $this->verifyPassword($user->password, (string) $validated['password']),
            default => throw ValidationException::withMessages(['method' => ['Unsupported method.']]),
        };

        AuthSession::markStepUp();

        return response()->json([
            'status' => 'step_up_ok',
            'valid_for_seconds' => (int) config('aact.mfa.step_up_ttl_seconds'),
        ]);
    }

    private function verifyPassword(string $hashed, string $plain): void
    {
        if (! password_verify($plain, $hashed) && ! Hash::check($plain, $hashed)) {
            throw ValidationException::withMessages([
                'password' => ['Invalid password.'],
            ]);
        }
    }
}
