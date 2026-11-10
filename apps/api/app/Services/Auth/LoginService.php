<?php

namespace App\Services\Auth;

use App\Enums\AuthChallengePurpose;
use App\Models\User;
use App\Support\AuthSession;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class LoginService
{
    public function __construct(
        private readonly ChallengeService $challenges,
        private readonly EmailOtpService $emailOtps,
        private readonly TotpService $totp,
        private readonly RecoveryCodeService $recoveryCodes,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function attempt(Request $request, string $email, string $password): array
    {
        $this->ensureIsNotRateLimited($request, $email);

        $user = User::query()->where('email', $email)->first();

        if ($user === null || ! Hash::check($password, $user->password)) {
            RateLimiter::hit($this->throttleKey($request, $email), 60);

            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        RateLimiter::clear($this->throttleKey($request, $email));

        if ($user->hasAnyMfaEnabled()) {
            $created = $this->challenges->create(
                $user,
                AuthChallengePurpose::Login,
                $request->ip(),
                $request->userAgent()
            );

            $methods = [];
            if ($user->hasConfirmedTotp()) {
                $methods[] = 'totp';
            }
            // Email OTP is weaker and must never silently replace required admin TOTP.
            if ($user->hasEmailOtpEnabled() && ! $user->requiresTotpForAdminAccess()) {
                $methods[] = 'email_otp';
                $this->emailOtps->issue($user, $created['challenge']);
            }
            if ($this->recoveryCodes->remainingCount($user) > 0) {
                $methods[] = 'recovery_code';
            }

            return [
                'status' => 'mfa_required',
                'challenge_id' => $created['challenge']->id,
                'challenge_token' => $created['plain_token'],
                'methods' => $methods,
                'expires_at' => $created['challenge']->expires_at->toIso8601String(),
            ];
        }

        if ($user->isAdminUser() && ! $user->hasConfirmedTotp()) {
            $this->establishSession($request, $user, mfaSetupOnly: true);

            return [
                'status' => 'mfa_setup_required',
                'user' => $user,
            ];
        }

        $this->establishSession($request, $user, mfaSetupOnly: false);

        return [
            'status' => 'authenticated',
            'user' => $user,
        ];
    }

    /**
     * @return array{status: string, user: User}
     */
    public function verifyMfa(Request $request, string $challengeToken, string $method, string $code): array
    {
        $challenge = $this->challenges->findUsable($challengeToken, AuthChallengePurpose::Login);

        if ($challenge === null) {
            throw ValidationException::withMessages([
                'challenge_token' => ['The authentication challenge is invalid or expired.'],
            ]);
        }

        $user = $challenge->user;

        try {
            match ($method) {
                'totp' => $this->totp->verifyForUser($user, $code),
                'email_otp' => $this->emailOtps->verify($user, $code, $challenge),
                'recovery_code' => $this->recoveryCodes->consume($user, $code),
                default => throw ValidationException::withMessages([
                    'method' => ['Unsupported MFA method.'],
                ]),
            };
        } catch (ValidationException $e) {
            $this->challenges->registerFailedAttempt($challenge);
            throw $e;
        }

        // Admins may not use email OTP as a silent TOTP bypass when TOTP is required.
        if (
            $method === 'email_otp'
            && $user->requiresTotpForAdminAccess()
            && $user->hasConfirmedTotp()
        ) {
            $this->challenges->registerFailedAttempt($challenge);
            throw ValidationException::withMessages([
                'method' => ['Email OTP cannot replace required authenticator MFA for administrators.'],
            ]);
        }

        if ($method === 'email_otp' && $user->requiresTotpForAdminAccess() && ! $user->hasConfirmedTotp()) {
            $this->challenges->registerFailedAttempt($challenge);
            throw ValidationException::withMessages([
                'method' => ['Administrators must complete TOTP setup.'],
            ]);
        }

        $challenge->markConsumed();
        $this->establishSession($request, $user, mfaSetupOnly: false);

        return [
            'status' => 'authenticated',
            'user' => $user->fresh(),
        ];
    }

    public function logout(Request $request): void
    {
        Auth::guard('web')->logout();
        AuthSession::clear();
        $request->session()->invalidate();
        $request->session()->regenerateToken();
    }

    public function establishSession(Request $request, User $user, bool $mfaSetupOnly): void
    {
        Auth::guard('web')->login($user);
        $request->session()->regenerate();

        if ($mfaSetupOnly) {
            AuthSession::markMfaSetupOnly();
        } else {
            AuthSession::markFullyAuthenticated();
        }
    }

    private function ensureIsNotRateLimited(Request $request, string $email): void
    {
        $key = $this->throttleKey($request, $email);

        if (! RateLimiter::tooManyAttempts($key, 5)) {
            return;
        }

        $seconds = RateLimiter::availableIn($key);

        throw ValidationException::withMessages([
            'email' => ["Too many attempts. Try again in {$seconds} seconds."],
        ]);
    }

    private function throttleKey(Request $request, string $email): string
    {
        return Str::lower($email).'|'.$request->ip();
    }
}
