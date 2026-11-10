<?php

namespace Tests\Feature\Isolation;

use App\Enums\MembershipRole;
use App\Models\Business;
use App\Models\BusinessMembership;
use App\Models\User;
use App\Models\Website;
use App\Support\AuthSession;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BusinessIsolationTest extends TestCase
{
    use RefreshDatabase;

    public function test_business_admin_cannot_view_another_business(): void
    {
        [$adminA, $businessA] = $this->makeBusinessAdmin();
        $businessB = Business::factory()->create();

        $this->actingAs($adminA);
        AuthSession::markFullyAuthenticated();

        $this->asSpa()->getJson('/api/v1/admin/businesses/'.$businessA->id)->assertOk();
        $this->asSpa()->getJson('/api/v1/admin/businesses/'.$businessB->id)->assertForbidden();
    }

    public function test_business_admin_cannot_create_website_for_foreign_business(): void
    {
        [$adminA] = $this->makeBusinessAdmin();
        $businessB = Business::factory()->create();

        $this->actingAs($adminA);
        AuthSession::markFullyAuthenticated();

        $this->asSpa()->postJson('/api/v1/admin/websites', [
            'business_id' => $businessB->id,
            'name' => 'Foreign',
            'base_url' => 'https://foreign.example',
        ])->assertStatus(422);
    }

    public function test_referrer_cannot_access_admin_business_apis(): void
    {
        $business = Business::factory()->create();
        $referrer = User::factory()->create();

        BusinessMembership::factory()->create([
            'business_id' => $business->id,
            'user_id' => $referrer->id,
            'role' => MembershipRole::Referrer,
        ]);

        $this->actingAs($referrer);
        AuthSession::markFullyAuthenticated();

        $this->asSpa()->getJson('/api/v1/admin/businesses')->assertForbidden();
    }

    public function test_website_idor_is_blocked(): void
    {
        [$adminA] = $this->makeBusinessAdmin();
        $otherWebsite = Website::factory()->create();

        $this->actingAs($adminA);
        AuthSession::markFullyAuthenticated();

        $this->asSpa()->getJson('/api/v1/admin/websites/'.$otherWebsite->id)->assertForbidden();
    }

    public function test_client_supplied_business_id_does_not_grant_access(): void
    {
        [$adminA] = $this->makeBusinessAdmin();
        $businessB = Business::factory()->create();

        $this->actingAs($adminA);
        AuthSession::markFullyAuthenticated();

        $this->asSpa()->getJson('/api/v1/admin/websites?business_id='.$businessB->id)
            ->assertForbidden();
    }

    /**
     * @return array{0: User, 1: Business}
     */
    private function makeBusinessAdmin(): array
    {
        $business = Business::factory()->create();
        $user = User::factory()->create([
            'totp_secret' => 'JBSWY3DPEHPK3PXP',
            'totp_confirmed_at' => now(),
        ]);

        BusinessMembership::factory()->create([
            'business_id' => $business->id,
            'user_id' => $user->id,
            'role' => MembershipRole::BusinessAdmin,
        ]);

        return [$user, $business];
    }
}
