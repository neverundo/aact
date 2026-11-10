<?php

namespace Tests\Feature\Auth;

use App\Models\RecoveryCode;
use App\Models\User;
use App\Support\AuthSession;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use PragmaRX\Google2FA\Google2FA;
use Tests\TestCase;

class TotpSetupAndRecoveryTest extends TestCase
{
    use RefreshDatabase;

    public function test_totp_setup_requires_confirmation_before_activation(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user);
        AuthSession::markMfaSetupOnly();

        $begin = $this->asSpa()->postJson('/api/v1/auth/mfa/totp/begin')->assertOk();
        $secret = $begin->json('secret');

        $user->refresh();
        $this->assertNotNull($user->totp_secret);
        $this->assertNull($user->totp_confirmed_at);

        $code = app(Google2FA::class)->getCurrentOtp($secret);

        $confirm = $this->asSpa()->postJson('/api/v1/auth/mfa/totp/confirm', [
            'code' => $code,
        ])->assertOk();

        $confirm->assertJsonStructure(['recovery_codes']);
        $this->assertCount(10, $confirm->json('recovery_codes'));

        $user->refresh();
        $this->assertNotNull($user->totp_confirmed_at);
        $this->assertTrue(AuthSession::isFullyAuthenticated());
    }

    public function test_recovery_code_is_single_use(): void
    {
        $google2fa = app(Google2FA::class);
        $secret = $google2fa->generateSecretKey();

        $user = User::factory()->create([
            'password' => Hash::make('correct-horse-battery'),
            'totp_secret' => $secret,
            'totp_confirmed_at' => now(),
        ]);

        $plain = 'ABCD-EFGH-IJKL';
        RecoveryCode::query()->create([
            'user_id' => $user->id,
            'code_hash' => hash('sha256', $plain),
        ]);

        $login = $this->asSpa()->postJson('/api/v1/auth/login', [
            'email' => $user->email,
            'password' => 'correct-horse-battery',
        ])->assertOk();

        $this->asSpa()->postJson('/api/v1/auth/mfa/verify', [
            'challenge_token' => $login->json('challenge_token'),
            'method' => 'recovery_code',
            'code' => $plain,
        ])->assertOk();

        $this->asSpa()->postJson('/api/v1/auth/logout')->assertOk();

        $login2 = $this->asSpa()->postJson('/api/v1/auth/login', [
            'email' => $user->email,
            'password' => 'correct-horse-battery',
        ])->assertOk();

        $this->asSpa()->postJson('/api/v1/auth/mfa/verify', [
            'challenge_token' => $login2->json('challenge_token'),
            'method' => 'recovery_code',
            'code' => $plain,
        ])->assertStatus(422);
    }
}
