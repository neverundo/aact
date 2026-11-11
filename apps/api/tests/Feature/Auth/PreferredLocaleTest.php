<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class PreferredLocaleTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_cannot_update_locale(): void
    {
        $this->asSpa()
            ->patchJson('/api/v1/auth/locale', ['locale' => 'en'])
            ->assertUnauthorized();
    }

    public function test_authenticated_user_can_set_preferred_locale(): void
    {
        $user = User::factory()->create([
            'password' => Hash::make('correct-horse-battery'),
            'preferred_locale' => null,
        ]);

        $this->asSpa()->postJson('/api/v1/auth/login', [
            'email' => $user->email,
            'password' => 'correct-horse-battery',
        ])->assertOk();

        $this->asSpa()
            ->patchJson('/api/v1/auth/locale', ['locale' => 'en'])
            ->assertOk()
            ->assertJsonPath('data.preferred_locale', 'en');

        $this->asSpa()
            ->getJson('/api/v1/auth/me')
            ->assertOk()
            ->assertJsonPath('data.preferred_locale', 'en');

        $this->assertSame('en', $user->fresh()->preferred_locale);

        $this->asSpa()
            ->patchJson('/api/v1/auth/locale', ['locale' => 'pt'])
            ->assertOk()
            ->assertJsonPath('data.preferred_locale', 'pt');
    }

    public function test_unsupported_locale_is_rejected(): void
    {
        $user = User::factory()->create([
            'password' => Hash::make('correct-horse-battery'),
        ]);

        $this->asSpa()->postJson('/api/v1/auth/login', [
            'email' => $user->email,
            'password' => 'correct-horse-battery',
        ])->assertOk();

        $this->asSpa()
            ->patchJson('/api/v1/auth/locale', ['locale' => 'fr'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['locale']);
    }

    public function test_me_includes_preferred_locale_field(): void
    {
        $user = User::factory()->create([
            'password' => Hash::make('correct-horse-battery'),
            'preferred_locale' => 'pt',
        ]);

        $this->asSpa()->postJson('/api/v1/auth/login', [
            'email' => $user->email,
            'password' => 'correct-horse-battery',
        ])->assertOk();

        $this->asSpa()
            ->getJson('/api/v1/auth/me')
            ->assertOk()
            ->assertJsonPath('data.preferred_locale', 'pt');
    }
}
