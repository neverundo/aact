<?php

namespace Tests\Feature\Admin;

use App\Enums\MembershipRole;
use App\Enums\MembershipStatus;
use App\Enums\PaymentMethodStatus;
use App\Enums\PaymentMethodType;
use App\Models\Business;
use App\Models\BusinessMembership;
use App\Models\PaymentMethodVersion;
use App\Models\ReferralCode;
use App\Models\User;
use App\Models\Website;
use App\Support\AuthSession;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Http\Middleware\AuthenticateSession;
use Tests\TestCase;

class MembershipReviewCoverageTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutMiddleware(AuthenticateSession::class);
    }

    public function test_admin_membership_index_includes_user_and_supports_filters(): void
    {
        [$admin, $business, $website] = $this->makeBusinessAdmin();
        $referrer = User::factory()->create([
            'name' => 'Referrer One',
            'email' => 'referrer.one@example.test',
        ]);
        $pending = BusinessMembership::factory()->create([
            'business_id' => $business->id,
            'user_id' => $referrer->id,
            'role' => MembershipRole::Referrer,
            'status' => MembershipStatus::Pending,
        ]);
        $pending->websites()->attach($website->id);

        $this->actingAs($admin);
        AuthSession::markFullyAuthenticated();

        $this->asSpa()->getJson('/api/v1/admin/memberships?status=pending&business_id='.$business->id)
            ->assertOk()
            ->assertJsonPath('data.0.id', $pending->id)
            ->assertJsonPath('data.0.user.email', 'referrer.one@example.test')
            ->assertJsonPath('data.0.user.name', 'Referrer One')
            ->assertJsonPath('data.0.websites.0.id', $website->id);

        $this->asSpa()->getJson('/api/v1/admin/memberships/'.$pending->id)
            ->assertOk()
            ->assertJsonPath('data.user.email', 'referrer.one@example.test')
            ->assertJsonPath('data.business.id', $business->id);
    }

    public function test_admin_can_reject_and_suspend_memberships(): void
    {
        [$admin, $business, $website] = $this->makeBusinessAdmin();
        $referrer = User::factory()->create();
        $pending = BusinessMembership::factory()->create([
            'business_id' => $business->id,
            'user_id' => $referrer->id,
            'role' => MembershipRole::Referrer,
            'status' => MembershipStatus::Pending,
        ]);

        $this->actingAs($admin);
        AuthSession::markFullyAuthenticated();

        $this->asSpa()->postJson('/api/v1/admin/memberships/'.$pending->id.'/reject', [
            'reason' => 'Incomplete KYC',
        ])
            ->assertOk()
            ->assertJsonPath('data.status', MembershipStatus::Rejected->value);

        $approvedReferrer = User::factory()->create();
        $approved = BusinessMembership::factory()->create([
            'business_id' => $business->id,
            'user_id' => $approvedReferrer->id,
            'role' => MembershipRole::Referrer,
            'status' => MembershipStatus::Approved,
        ]);
        $approved->websites()->attach($website->id);

        PaymentMethodVersion::query()->create([
            'user_id' => $approvedReferrer->id,
            'business_id' => $business->id,
            'business_membership_id' => $approved->id,
            'method_type' => PaymentMethodType::Iban,
            'payload_encrypted' => ['iban' => 'PT50000201231234567890154', 'holder_name' => 'R'],
            'display_mask' => 'PT50**************0154',
            'status' => PaymentMethodStatus::Approved,
            'version' => 1,
        ]);

        ReferralCode::query()->create([
            'business_id' => $business->id,
            'business_membership_id' => $approved->id,
            'user_id' => $approvedReferrer->id,
            'website_id' => $website->id,
            'code' => 'REF-COVER1',
            'is_active' => true,
        ]);

        $this->asSpa()->postJson('/api/v1/admin/memberships/'.$approved->id.'/suspend', [
            'reason' => 'Policy breach',
        ])
            ->assertOk()
            ->assertJsonPath('data.status', MembershipStatus::Suspended->value);

        $this->assertFalse(
            ReferralCode::query()->where('code', 'REF-COVER1')->value('is_active'),
        );
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
