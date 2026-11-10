<?php

namespace App\Support;

use Illuminate\Support\Facades\Session;

final class AuthSession
{
    public const MFA_SETUP_ONLY = 'aact.mfa_setup_only';

    public const FULLY_AUTHENTICATED = 'aact.fully_authenticated';

    public const STEP_UP_UNTIL = 'aact.step_up_until';

    public static function markFullyAuthenticated(): void
    {
        Session::put(self::FULLY_AUTHENTICATED, true);
        Session::forget(self::MFA_SETUP_ONLY);
    }

    public static function markMfaSetupOnly(): void
    {
        Session::put(self::MFA_SETUP_ONLY, true);
        Session::put(self::FULLY_AUTHENTICATED, false);
        Session::forget(self::STEP_UP_UNTIL);
    }

    public static function clear(): void
    {
        Session::forget([
            self::MFA_SETUP_ONLY,
            self::FULLY_AUTHENTICATED,
            self::STEP_UP_UNTIL,
        ]);
    }

    public static function isMfaSetupOnly(): bool
    {
        return (bool) Session::get(self::MFA_SETUP_ONLY, false);
    }

    public static function isFullyAuthenticated(): bool
    {
        return (bool) Session::get(self::FULLY_AUTHENTICATED, false)
            && ! self::isMfaSetupOnly();
    }

    public static function markStepUp(?int $ttlSeconds = null): void
    {
        $ttl = $ttlSeconds ?? (int) config('aact.mfa.step_up_ttl_seconds');
        Session::put(self::STEP_UP_UNTIL, now()->addSeconds($ttl)->timestamp);
    }

    public static function hasValidStepUp(): bool
    {
        $until = Session::get(self::STEP_UP_UNTIL);

        return is_numeric($until) && now()->timestamp <= (int) $until;
    }
}
