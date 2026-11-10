<?php

namespace App\Services\Auth;

use App\Models\AuthChallenge;
use App\Models\EmailOtp;
use App\Models\User;
use App\Notifications\EmailOtpNotification;
use Illuminate\Validation\ValidationException;

class EmailOtpService
{
    public function enable(User $user): void
    {
        $user->forceFill(['email_otp_enabled_at' => now()])->save();
    }

    public function disable(User $user): void
    {
        $user->forceFill(['email_otp_enabled_at' => null])->save();
    }

    public function issue(User $user, ?AuthChallenge $challenge = null): void
    {
        $latest = EmailOtp::query()
            ->where('user_id', $user->id)
            ->whereNull('consumed_at')
            ->latest('id')
            ->first();

        if ($latest !== null && $latest->sent_at->gt(now()->subSeconds((int) config('aact.mfa.email_otp_resend_seconds')))) {
            throw ValidationException::withMessages([
                'email_otp' => ['Please wait before requesting another email code.'],
            ]);
        }

        EmailOtp::query()
            ->where('user_id', $user->id)
            ->whereNull('consumed_at')
            ->update(['consumed_at' => now()]);

        $plain = (string) random_int(100000, 999999);

        EmailOtp::query()->create([
            'user_id' => $user->id,
            'auth_challenge_id' => $challenge?->id,
            'code_hash' => hash('sha256', $plain),
            'attempts' => 0,
            'max_attempts' => (int) config('aact.mfa.email_otp_max_attempts'),
            'expires_at' => now()->addSeconds((int) config('aact.mfa.email_otp_ttl_seconds')),
            'sent_at' => now(),
        ]);

        $user->notify(new EmailOtpNotification($plain));
    }

    public function verify(User $user, string $code, ?AuthChallenge $challenge = null): void
    {
        $otp = EmailOtp::query()
            ->where('user_id', $user->id)
            ->whereNull('consumed_at')
            ->when($challenge, fn ($q) => $q->where('auth_challenge_id', $challenge->id))
            ->latest('id')
            ->first();

        if ($otp === null || ! $otp->isUsable()) {
            throw ValidationException::withMessages([
                'code' => ['Invalid or expired email code.'],
            ]);
        }

        if (! hash_equals($otp->code_hash, hash('sha256', $code))) {
            $otp->increment('attempts');
            $otp->refresh();

            if (! $otp->isUsable()) {
                $otp->forceFill(['consumed_at' => now()])->save();
            }

            throw ValidationException::withMessages([
                'code' => ['Invalid or expired email code.'],
            ]);
        }

        $otp->forceFill(['consumed_at' => now()])->save();
    }
}
