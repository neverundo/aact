<?php

namespace App\Services\Auth;

use App\Enums\AuthChallengePurpose;
use App\Models\AuthChallenge;
use App\Models\User;
use Illuminate\Support\Str;

class ChallengeService
{
    /**
     * @return array{challenge: AuthChallenge, plain_token: string}
     */
    public function create(User $user, AuthChallengePurpose $purpose, ?string $ip = null, ?string $userAgent = null): array
    {
        AuthChallenge::query()
            ->where('user_id', $user->id)
            ->where('purpose', $purpose)
            ->whereNull('consumed_at')
            ->update(['consumed_at' => now()]);

        $plain = Str::random(64);

        $challenge = AuthChallenge::query()->create([
            'user_id' => $user->id,
            'purpose' => $purpose,
            'token_hash' => hash('sha256', $plain),
            'attempts' => 0,
            'max_attempts' => (int) config('aact.mfa.challenge_max_attempts'),
            'expires_at' => now()->addSeconds((int) config('aact.mfa.challenge_ttl_seconds')),
            'ip_address' => $ip,
            'user_agent' => $userAgent,
        ]);

        return ['challenge' => $challenge, 'plain_token' => $plain];
    }

    public function findUsable(string $plainToken, AuthChallengePurpose $purpose): ?AuthChallenge
    {
        $challenge = AuthChallenge::query()
            ->where('token_hash', hash('sha256', $plainToken))
            ->where('purpose', $purpose)
            ->first();

        if ($challenge === null || ! $challenge->isUsable()) {
            return null;
        }

        return $challenge;
    }

    public function registerFailedAttempt(AuthChallenge $challenge): void
    {
        $challenge->increment('attempts');
        $challenge->refresh();

        if (! $challenge->hasAttemptsRemaining()) {
            $challenge->markConsumed();
        }
    }
}
