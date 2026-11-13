<?php

namespace App\Services\Auth;

use App\Models\User;
use App\Support\AuthSession;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

/**
 * Password + TOTP confirmation for sensitive admin mutations (payment method review).
 */
final class SensitiveActionVerifier
{
    public function __construct(private readonly TotpService $totp) {}

    public function assertPasswordAndTotp(User $user, string $password, string $code): void
    {
        if (! password_verify($password, $user->password) && ! Hash::check($password, $user->password)) {
            throw ValidationException::withMessages([
                'password' => ['Invalid password.'],
            ]);
        }

        $this->totp->verifyForUser($user, $code);

        AuthSession::markStepUp();
    }
}
