<?php

namespace Tests\Feature\Auth;

use App\Models\RecoveryCode;
use App\Models\User;
use App\Support\AuthSession;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Laravel\Sanctum\Http\Middleware\AuthenticateSession;
use PragmaRX\Google2FA\Google2FA;
use Tests\TestCase;

class AuthExtrasCoverageTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutMiddleware(AuthenticateSession::class);
    }

    public function test_email_otp_enable_resend_disable_and_step_up_password(): void
    {
        Notification::fake();

        $user = User::factory()->create([
            'password' => Hash::make('secure-passphrase-1'),
            'totp_secret' => 'JBSWY3DPEHPK3PXP',
            'totp_confirmed_at' => now(),
        ]);

        $this->actingAs($user);
        AuthSession::markFullyAuthenticated();

        $this->asSpa()->postJson('/api/v1/auth/mfa/email-otp/enable')
            ->assertOk()
            ->assertJsonPath('status', 'email_otp_enabled');

        // Force past resend cooldown for the second issue call.
        \App\Models\EmailOtp::query()->where('user_id', $user->id)->update([
            'sent_at' => now()->subMinutes(10),
        ]);

        $this->asSpa()->postJson('/api/v1/auth/mfa/email-otp/resend')
            ->assertOk()
            ->assertJsonPath('status', 'email_otp_sent');

        $this->asSpa()->postJson('/api/v1/auth/step-up', [
            'method' => 'password',
            'password' => 'secure-passphrase-1',
        ])
            ->assertOk()
            ->assertJsonPath('status', 'step_up_ok');

        $this->asSpa()->deleteJson('/api/v1/auth/mfa/email-otp')
            ->assertOk()
            ->assertJsonPath('status', 'email_otp_disabled');
    }

    public function test_recovery_codes_can_be_regenerated_after_step_up(): void
    {
        $google2fa = app(Google2FA::class);
        $secret = $google2fa->generateSecretKey();

        $user = User::factory()->create([
            'password' => Hash::make('secure-passphrase-1'),
            'totp_secret' => $secret,
            'totp_confirmed_at' => now(),
        ]);

        RecoveryCode::query()->create([
            'user_id' => $user->id,
            'code_hash' => hash('sha256', 'OLD1-CODE-AAAA'),
        ]);

        $this->actingAs($user);
        AuthSession::markFullyAuthenticated();
        AuthSession::markStepUp();

        $code = $google2fa->getCurrentOtp($secret);

        $this->asSpa()->postJson('/api/v1/auth/mfa/recovery-codes/regenerate', [
            'code' => $code,
        ])
            ->assertOk()
            ->assertJsonPath('status', 'recovery_codes_regenerated')
            ->assertJsonStructure(['recovery_codes']);
    }

    public function test_step_up_rejects_invalid_password(): void
    {
        $user = User::factory()->create([
            'password' => Hash::make('secure-passphrase-1'),
        ]);

        $this->actingAs($user);
        AuthSession::markFullyAuthenticated();

        $this->asSpa()->postJson('/api/v1/auth/step-up', [
            'method' => 'password',
            'password' => 'wrong-password-xx',
        ])->assertStatus(422);
    }
}
