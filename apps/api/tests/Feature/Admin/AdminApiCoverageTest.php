<?php

namespace Tests\Feature\Admin;

use App\Enums\MembershipRole;
use App\Enums\MembershipStatus;
use App\Models\Business;
use App\Models\BusinessMembership;
use App\Models\User;
use App\Models\Website;
use App\Support\AuthSession;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Laravel\Sanctum\Http\Middleware\AuthenticateSession;
use Tests\TestCase;

class AdminApiCoverageTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutMiddleware(AuthenticateSession::class);
    }

    public function test_business_admin_can_manage_commission_rules_and_integrations(): void
    {
        [$admin, $business, $website] = $this->makeBusinessAdmin();

        $this->actingAs($admin);
        AuthSession::markFullyAuthenticated();

        $this->asSpa()->getJson('/api/v1/admin/commission-rules')
            ->assertOk()
            ->assertJsonStructure(['data']);

        $createdRule = $this->asSpa()->postJson('/api/v1/admin/commission-rules', [
            'business_id' => $business->id,
            'website_id' => $website->id,
            'name' => 'Sale 12%',
            'event_type' => 'sale',
            'rate_bps' => 1200,
            'flat_minor' => 0,
            'priority' => 100,
            'effective_from' => Carbon::now()->subDay()->toIso8601String(),
        ])
            ->assertCreated()
            ->assertJsonPath('data.name', 'Sale 12%')
            ->assertJsonPath('data.rate_bps', 1200)
            ->assertJsonPath('data.business.name', $business->name)
            ->assertJsonPath('data.website.name', $website->name);

        $this->asSpa()->postJson('/api/v1/admin/commission-rules/'.$createdRule->json('data.id').'/deactivate')
            ->assertOk()
            ->assertJsonPath('data.is_active', false);

        $this->asSpa()->getJson('/api/v1/admin/integrations')
            ->assertOk()
            ->assertJsonStructure(['data']);

        $created = $this->asSpa()->postJson('/api/v1/admin/integrations', [
            'business_id' => $business->id,
            'website_id' => $website->id,
            'source' => 'coverage_checkout',
            'name' => 'Coverage checkout',
        ])
            ->assertCreated()
            ->assertJsonStructure(['credential', 'token', 'hmac_secret']);

        $credentialId = $created->json('credential.id');

        $this->asSpa()->postJson('/api/v1/admin/integrations/'.$credentialId.'/rotate')
            ->assertOk()
            ->assertJsonStructure(['credential', 'token', 'hmac_secret']);

        $this->asSpa()->postJson('/api/v1/admin/integrations/'.$credentialId.'/revoke')
            ->assertOk()
            ->assertJsonPath('status', 'revoked');
    }

    public function test_platform_admin_can_create_business_and_list_events(): void
    {
        $admin = User::factory()->platformAdmin()->create([
            'totp_secret' => 'JBSWY3DPEHPK3PXP',
            'totp_confirmed_at' => now(),
        ]);

        $this->actingAs($admin);
        AuthSession::markFullyAuthenticated();

        $created = $this->asSpa()->postJson('/api/v1/admin/businesses', [
            'name' => 'Coverage Co',
            'currency' => 'EUR',
            'payout_threshold_minor' => 2500,
        ])
            ->assertCreated()
            ->assertJsonPath('data.name', 'Coverage Co');

        $businessId = $created->json('data.id');

        $this->asSpa()->getJson('/api/v1/admin/businesses/'.$businessId)
            ->assertOk()
            ->assertJsonPath('data.id', $businessId);

        $this->asSpa()->putJson('/api/v1/admin/businesses/'.$businessId, [
            'name' => 'Coverage Co Renamed',
            'is_active' => false,
        ])
            ->assertOk()
            ->assertJsonPath('data.name', 'Coverage Co Renamed');

        $this->asSpa()->getJson('/api/v1/admin/businesses')->assertOk();
        $this->asSpa()->getJson('/api/v1/admin/commercial-events')->assertOk();
        $this->asSpa()->getJson('/api/v1/admin/commissions')->assertOk();
        $this->asSpa()->getJson('/api/v1/admin/payout-requests')->assertOk();

        $this->asSpa()->deleteJson('/api/v1/admin/businesses/'.$businessId)
            ->assertOk()
            ->assertJsonPath('status', 'deleted');
    }

    public function test_foreign_business_admin_cannot_create_rules_or_integrations(): void
    {
        [$admin] = $this->makeBusinessAdmin();
        $other = Business::factory()->create();
        $otherWebsite = Website::factory()->create(['business_id' => $other->id]);

        $this->actingAs($admin);
        AuthSession::markFullyAuthenticated();

        $this->asSpa()->postJson('/api/v1/admin/commission-rules', [
            'business_id' => $other->id,
            'name' => 'Nope',
            'event_type' => 'sale',
            'rate_bps' => 100,
            'effective_from' => Carbon::now()->toIso8601String(),
        ])->assertStatus(422);

        $this->asSpa()->postJson('/api/v1/admin/integrations', [
            'business_id' => $other->id,
            'website_id' => $otherWebsite->id,
            'source' => 'nope',
            'name' => 'Nope',
        ])->assertStatus(422);
    }

    /**
     * @return array{0: User, 1: Business, 2: Website}
     */
    private function makeBusinessAdmin(): array
    {
        $business = Business::factory()->create(['currency' => 'EUR']);
        $website = Website::factory()->create([
            'business_id' => $business->id,
            'is_active' => true,
        ]);
        $user = User::factory()->create([
            'totp_secret' => 'JBSWY3DPEHPK3PXP',
            'totp_confirmed_at' => now(),
        ]);

        BusinessMembership::factory()->create([
            'business_id' => $business->id,
            'user_id' => $user->id,
            'role' => MembershipRole::BusinessAdmin,
            'status' => MembershipStatus::Approved,
        ]);

        return [$user, $business, $website];
    }
}
