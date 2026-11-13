<?php

namespace Tests\Feature\Admin;

use App\Enums\MembershipRole;
use App\Enums\MembershipStatus;
use App\Models\Business;
use App\Models\BusinessMembership;
use App\Models\Invitation;
use App\Models\User;
use App\Models\Website;
use App\Support\AuthSession;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Laravel\Sanctum\Http\Middleware\AuthenticateSession;
use Tests\TestCase;

class WebsiteInvitationCoverageTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutMiddleware(AuthenticateSession::class);
    }

    public function test_website_crud_and_invitation_lifecycle(): void
    {
        Notification::fake();
        [$admin, $business, $website] = $this->makeBusinessAdmin();

        $this->actingAs($admin);
        AuthSession::markFullyAuthenticated();

        $this->asSpa()->getJson('/api/v1/admin/websites?business_id='.$business->id)
            ->assertOk()
            ->assertJsonStructure(['data']);

        $createdWebsite = $this->asSpa()->postJson('/api/v1/admin/websites', [
            'business_id' => $business->id,
            'name' => 'Coverage Site',
            'base_url' => 'https://coverage.example/',
            'is_active' => true,
        ])
            ->assertCreated()
            ->assertJsonPath('data.name', 'Coverage Site')
            ->assertJsonPath('data.base_url', 'https://coverage.example');

        $websiteId = $createdWebsite->json('data.id');

        $this->asSpa()->getJson('/api/v1/admin/websites/'.$websiteId)
            ->assertOk()
            ->assertJsonPath('data.id', $websiteId);

        $this->asSpa()->putJson('/api/v1/admin/websites/'.$websiteId, [
            'name' => 'Coverage Site Renamed',
            'is_active' => false,
        ])
            ->assertOk()
            ->assertJsonPath('data.name', 'Coverage Site Renamed')
            ->assertJsonPath('data.is_active', false);

        $this->asSpa()->getJson('/api/v1/admin/invitations?business_id='.$business->id)
            ->assertOk();

        $this->asSpa()->postJson('/api/v1/admin/invitations', [
            'business_id' => $business->id,
            'email' => 'coverage-invitee@example.test',
            'name' => 'Coverage Invitee',
            'website_ids' => [$website->id],
        ])
            ->assertCreated()
            ->assertJsonStructure(['invitation', 'token']);

        $invitation = Invitation::query()
            ->where('email', 'coverage-invitee@example.test')
            ->firstOrFail();
        $invitation->forceFill(['last_sent_at' => now()->subMinutes(10)])->save();

        $this->asSpa()->postJson('/api/v1/admin/invitations/'.$invitation->id.'/resend')
            ->assertOk()
            ->assertJsonStructure(['invitation', 'token']);

        $this->asSpa()->postJson('/api/v1/admin/invitations/'.$invitation->id.'/revoke')
            ->assertOk()
            ->assertJsonPath('status', 'revoked');

        $this->asSpa()->deleteJson('/api/v1/admin/websites/'.$websiteId)
            ->assertOk()
            ->assertJsonPath('status', 'deleted');
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
