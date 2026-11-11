<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class LoginAfterPasswordRotationTest extends TestCase
{
    use RefreshDatabase;

    public function test_login_succeeds_after_password_hash_rotation_with_stale_session(): void
    {
        $user = User::factory()->create([
            'email' => 'stale@aact.test',
            'password' => 'initial-passphrase',
        ]);

        $this->asSpa()->postJson('/api/v1/auth/login', [
            'email' => 'stale@aact.test',
            'password' => 'initial-passphrase',
        ])->assertOk()->assertJsonPath('status', 'authenticated');

        // Simulate DemoSeeder / admin password rotation changing the hash while
        // the browser still holds the previous session cookie.
        $user->forceFill([
            'password' => Hash::make('rotated-passphrase'),
        ])->save();

        $this->asSpa()->postJson('/api/v1/auth/login', [
            'email' => 'stale@aact.test',
            'password' => 'rotated-passphrase',
        ])
            ->assertOk()
            ->assertJsonPath('status', 'authenticated')
            ->assertJsonPath('user.email', 'stale@aact.test');
    }

    public function test_logout_succeeds_after_password_hash_rotation_with_stale_session(): void
    {
        $user = User::factory()->create([
            'email' => 'logout-stale@aact.test',
            'password' => 'initial-passphrase',
        ]);

        $this->asSpa()->postJson('/api/v1/auth/login', [
            'email' => 'logout-stale@aact.test',
            'password' => 'initial-passphrase',
        ])->assertOk();

        $user->forceFill([
            'password' => Hash::make('rotated-passphrase'),
        ])->save();

        $this->asSpa()->postJson('/api/v1/auth/logout')
            ->assertOk()
            ->assertJsonPath('status', 'logged_out');
    }
}
