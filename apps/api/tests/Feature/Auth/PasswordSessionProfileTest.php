<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use App\Support\AuthSession;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Password;
use Laravel\Sanctum\Http\Middleware\AuthenticateSession;
use Tests\TestCase;

class PasswordSessionProfileTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutMiddleware(AuthenticateSession::class);
    }

    public function test_password_forgot_does_not_enumerate_accounts(): void
    {
        Notification::fake();

        $this->asSpa()->postJson('/api/v1/auth/password/forgot', [
            'email' => 'missing@example.test',
        ])
            ->assertOk()
            ->assertJsonPath('status', 'reset_link_sent');

        $user = User::factory()->create();

        $this->asSpa()->postJson('/api/v1/auth/password/forgot', [
            'email' => $user->email,
        ])
            ->assertOk()
            ->assertJsonPath('status', 'reset_link_sent');
    }

    public function test_password_reset_and_update_work(): void
    {
        $user = User::factory()->create([
            'password' => Hash::make('secure-passphrase-1'),
        ]);

        $token = Password::broker()->createToken($user);

        $this->asSpa()->postJson('/api/v1/auth/password/reset', [
            'email' => $user->email,
            'token' => $token,
            'password' => 'secure-passphrase-2',
            'password_confirmation' => 'secure-passphrase-2',
        ])
            ->assertOk()
            ->assertJsonPath('status', 'password_reset');

        $this->actingAs($user->fresh());
        AuthSession::markFullyAuthenticated();

        $this->asSpa()->putJson('/api/v1/auth/password', [
            'current_password' => 'secure-passphrase-2',
            'password' => 'secure-passphrase-3',
            'password_confirmation' => 'secure-passphrase-3',
        ])
            ->assertOk()
            ->assertJsonPath('status', 'password_updated');
    }

    public function test_session_and_profile_endpoints(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user);
        AuthSession::markFullyAuthenticated();

        $this->asSpa()->getJson('/api/v1/auth/sessions')
            ->assertOk()
            ->assertJsonStructure(['data']);

        $this->asSpa()->deleteJson('/api/v1/auth/sessions/missing-id')
            ->assertNotFound();

        $this->asSpa()->deleteJson('/api/v1/auth/sessions')
            ->assertOk()
            ->assertJsonPath('status', 'other_sessions_revoked');

        DB::table('sessions')->insert([
            'id' => 'other-session',
            'user_id' => $user->id,
            'ip_address' => '127.0.0.1',
            'user_agent' => 'phpunit',
            'payload' => '',
            'last_activity' => time(),
        ]);

        $this->asSpa()->getJson('/api/v1/auth/sessions')
            ->assertOk()
            ->assertJsonFragment(['id' => 'other-session']);

        $this->asSpa()->deleteJson('/api/v1/auth/sessions/other-session')
            ->assertOk()
            ->assertJsonPath('status', 'session_revoked');

        $this->asSpa()->getJson('/api/v1/portal/profile')
            ->assertOk()
            ->assertJsonPath('email', $user->email);

        $this->asSpa()->putJson('/api/v1/portal/profile', [
            'display_name' => 'Coverage Referrer',
            'phone' => '+351912345678',
        ])
            ->assertOk()
            ->assertJsonPath('display_name', 'Coverage Referrer');
    }
}
