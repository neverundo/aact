<?php

namespace Tests\Feature\Auth;

use App\Enums\MembershipRole;
use App\Models\Business;
use App\Models\BusinessMembership;
use App\Models\User;
use App\Support\AuthSession;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Http\Middleware\AuthenticateSession;
use Tests\TestCase;

class PortalFullyAuthenticatedTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutMiddleware(AuthenticateSession::class);
    }

    public function test_mfa_setup_only_admin_cannot_access_portal_balances(): void
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

        $this->actingAs($user);
        AuthSession::markMfaSetupOnly();

        $this->asSpa()->getJson('/api/v1/portal/balances')
            ->assertForbidden()
            ->assertJsonPath('code', 'mfa_setup_only');
    }

    public function test_fully_authenticated_referrer_can_access_portal_balances(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user);
        AuthSession::markFullyAuthenticated();

        $this->asSpa()->getJson('/api/v1/portal/balances')
            ->assertOk()
            ->assertJsonStructure(['data']);
    }
}
