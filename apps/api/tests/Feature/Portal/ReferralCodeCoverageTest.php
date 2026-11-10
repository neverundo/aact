<?php

namespace Tests\Feature\Portal;

use App\Enums\MembershipRole;
use App\Enums\MembershipStatus;
use App\Models\Business;
use App\Models\BusinessMembership;
use App\Models\ReferralCode;
use App\Models\User;
use App\Models\Website;
use App\Support\AuthSession;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Http\Middleware\AuthenticateSession;
use Tests\TestCase;

class ReferralCodeCoverageTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutMiddleware(AuthenticateSession::class);
    }

    public function test_referrer_can_list_codes_and_build_links(): void
    {
        $business = Business::factory()->create(['currency' => 'EUR']);
        $website = Website::factory()->create([
            'business_id' => $business->id,
            'base_url' => 'https://shop.example',
            'is_active' => true,
        ]);
        $referrer = User::factory()->create();
        $membership = BusinessMembership::factory()->create([
            'business_id' => $business->id,
            'user_id' => $referrer->id,
            'role' => MembershipRole::Referrer,
            'status' => MembershipStatus::Approved,
        ]);
        $membership->websites()->attach($website->id);

        $code = ReferralCode::query()->create([
            'business_id' => $business->id,
            'business_membership_id' => $membership->id,
            'user_id' => $referrer->id,
            'website_id' => $website->id,
            'code' => 'REF-COVER99',
            'is_active' => true,
        ]);

        $this->actingAs($referrer);
        AuthSession::markFullyAuthenticated();

        $this->asSpa()->getJson('/api/v1/portal/referral-codes')
            ->assertOk()
            ->assertJsonFragment(['code' => 'REF-COVER99']);

        $this->asSpa()->postJson('/api/v1/portal/referral-codes/'.$code->id.'/link', [
            'website_id' => $website->id,
        ])
            ->assertOk()
            ->assertJsonStructure(['url', 'code', 'note']);

        $this->asSpa()->postJson('/api/v1/portal/referral-codes/'.$code->id.'/qr', [
            'website_id' => $website->id,
        ])
            ->assertOk()
            ->assertJsonStructure(['code', 'url', 'qr_svg']);
    }
}
