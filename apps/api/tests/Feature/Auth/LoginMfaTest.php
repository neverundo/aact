<?php

namespace Tests\Feature\Auth;

use App\Enums\MembershipRole;
use App\Models\Business;
use App\Models\BusinessMembership;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use PragmaRX\Google2FA\Google2FA;
use Tests\TestCase;

class LoginMfaTest extends TestCase
{
    use RefreshDatabase;

    public function test_password_alone_does_not_create_full_session_when_totp_enabled(): void
    {
        $google2fa = app(Google2FA::class);
        $secret = $google2fa->generateSecretKey();

        $user = User::factory()->create([
            'password' => Hash::make('correct-horse-battery'),
            'totp_secret' => $secret,
            'totp_confirmed_at' => now(),
        ]);

        $response = $this->asSpa()->postJson('/api/v1/auth/login', [
            'email' => $user->email,
            'password' => 'correct-horse-battery',
        ]);

        $response->assertOk()
            ->assertJsonPath('status', 'mfa_required')
            ->assertJsonStructure(['challenge_token', 'methods']);

        $this->assertGuest();
        $this->asSpa()->getJson('/api/v1/auth/me')->assertUnauthorized();
    }

    public function test_totp_challenge_creates_authenticated_session(): void
    {
        $google2fa = app(Google2FA::class);
        $secret = $google2fa->generateSecretKey();

        $user = User::factory()->create([
            'password' => Hash::make('correct-horse-battery'),
            'totp_secret' => $secret,
            'totp_confirmed_at' => now(),
        ]);

        $login = $this->asSpa()->postJson('/api/v1/auth/login', [
            'email' => $user->email,
            'password' => 'correct-horse-battery',
        ])->assertOk();

        $code = $google2fa->getCurrentOtp($secret);

        $this->asSpa()->postJson('/api/v1/auth/mfa/verify', [
            'challenge_token' => $login->json('challenge_token'),
            'method' => 'totp',
            'code' => $code,
        ])->assertOk()
            ->assertJsonPath('status', 'authenticated');

        $this->assertAuthenticatedAs($user);
        $this->asSpa()->getJson('/api/v1/auth/me')
            ->assertOk()
            ->assertJsonPath('data.session.fully_authenticated', true);
    }

    public function test_totp_replay_is_rejected(): void
    {
        $google2fa = app(Google2FA::class);
        $secret = $google2fa->generateSecretKey();

        $user = User::factory()->create([
            'password' => Hash::make('correct-horse-battery'),
            'totp_secret' => $secret,
            'totp_confirmed_at' => now(),
        ]);

        $login = $this->asSpa()->postJson('/api/v1/auth/login', [
            'email' => $user->email,
            'password' => 'correct-horse-battery',
        ])->assertOk();

        $code = $google2fa->getCurrentOtp($secret);

        $this->asSpa()->postJson('/api/v1/auth/mfa/verify', [
            'challenge_token' => $login->json('challenge_token'),
            'method' => 'totp',
            'code' => $code,
        ])->assertOk();

        $this->asSpa()->postJson('/api/v1/auth/logout')->assertOk();

        $login2 = $this->asSpa()->postJson('/api/v1/auth/login', [
            'email' => $user->email,
            'password' => 'correct-horse-battery',
        ])->assertOk();

        $this->asSpa()->postJson('/api/v1/auth/mfa/verify', [
            'challenge_token' => $login2->json('challenge_token'),
            'method' => 'totp',
            'code' => $code,
        ])->assertStatus(422);
    }

    public function test_admin_without_totp_gets_setup_only_session(): void
    {
        $business = Business::factory()->create();
        $user = User::factory()->create([
            'password' => Hash::make('correct-horse-battery'),
        ]);

        BusinessMembership::factory()->create([
            'business_id' => $business->id,
            'user_id' => $user->id,
            'role' => MembershipRole::BusinessAdmin,
        ]);

        $this->asSpa()->postJson('/api/v1/auth/login', [
            'email' => $user->email,
            'password' => 'correct-horse-battery',
        ])->assertOk()
            ->assertJsonPath('status', 'mfa_setup_required');

        $this->assertAuthenticatedAs($user);

        $this->asSpa()->getJson('/api/v1/admin/businesses')
            ->assertForbidden()
            ->assertJsonPath('code', 'mfa_setup_required');

        $this->asSpa()->getJson('/api/v1/auth/me')
            ->assertOk()
            ->assertJsonPath('data.session.mfa_setup_only', true);
    }

    public function test_expired_challenge_cannot_authenticate(): void
    {
        $google2fa = app(Google2FA::class);
        $secret = $google2fa->generateSecretKey();

        $user = User::factory()->create([
            'password' => Hash::make('correct-horse-battery'),
            'totp_secret' => $secret,
            'totp_confirmed_at' => now(),
        ]);

        $login = $this->asSpa()->postJson('/api/v1/auth/login', [
            'email' => $user->email,
            'password' => 'correct-horse-battery',
        ])->assertOk();

        $this->travel(10)->minutes();

        $this->asSpa()->postJson('/api/v1/auth/mfa/verify', [
            'challenge_token' => $login->json('challenge_token'),
            'method' => 'totp',
            'code' => $google2fa->getCurrentOtp($secret),
        ])->assertStatus(422);

        $this->assertGuest();
    }

    public function test_login_does_not_enumerate_users(): void
    {
        $response = $this->asSpa()->postJson('/api/v1/auth/login', [
            'email' => 'missing@example.com',
            'password' => 'whatever-password',
        ]);

        $response->assertStatus(422)
            ->assertJsonPath('errors.email.0', 'The provided credentials are incorrect.');
    }
}
