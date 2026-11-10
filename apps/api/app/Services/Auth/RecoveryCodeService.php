<?php

namespace App\Services\Auth;

use App\Models\RecoveryCode;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class RecoveryCodeService
{
    /**
     * @return list<string>
     */
    public function regenerate(User $user): array
    {
        return DB::transaction(function () use ($user): array {
            RecoveryCode::query()->where('user_id', $user->id)->delete();

            $plainCodes = [];
            $count = (int) config('aact.mfa.recovery_code_count');

            for ($i = 0; $i < $count; $i++) {
                $plain = Str::upper(Str::random(4).'-'.Str::random(4).'-'.Str::random(4));
                $plainCodes[] = $plain;

                RecoveryCode::query()->create([
                    'user_id' => $user->id,
                    'code_hash' => hash('sha256', $plain),
                ]);
            }

            return $plainCodes;
        });
    }

    public function consume(User $user, string $code): void
    {
        $normalized = Str::upper(trim($code));

        DB::transaction(function () use ($user, $normalized): void {
            $record = RecoveryCode::query()
                ->where('user_id', $user->id)
                ->where('code_hash', hash('sha256', $normalized))
                ->whereNull('consumed_at')
                ->lockForUpdate()
                ->first();

            if ($record === null) {
                throw ValidationException::withMessages([
                    'code' => ['Invalid recovery code.'],
                ]);
            }

            $record->forceFill(['consumed_at' => now()])->save();
        });
    }

    public function remainingCount(User $user): int
    {
        return RecoveryCode::query()
            ->where('user_id', $user->id)
            ->whereNull('consumed_at')
            ->count();
    }
}
