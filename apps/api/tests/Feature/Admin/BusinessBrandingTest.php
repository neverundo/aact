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
use Illuminate\Http\Client\Request as HttpRequest;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Http\Middleware\AuthenticateSession;
use Tests\TestCase;

class BusinessBrandingTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutMiddleware(AuthenticateSession::class);
        Storage::fake('branding_assets');
    }

    public function test_admin_can_update_branding_and_upload_logo(): void
    {
        [$admin, $business] = $this->makeBusinessAdmin();

        $this->actingAs($admin);
        AuthSession::markFullyAuthenticated();

        $this->asSpa()->putJson('/api/v1/admin/businesses/'.$business->id.'/branding', [
            'display_name' => 'Brand Co',
            'primary_color' => '#112233',
            'secondary_color' => '#445566',
            'accent_color' => '#0F766E',
        ])
            ->assertSuccessful()
            ->assertJsonPath('data.display_name', 'Brand Co')
            ->assertJsonPath('data.primary_color', '#112233');

        $file = UploadedFile::fake()->create('logo.png', 12, 'image/png');

        $this->asSpa()->post('/api/v1/admin/businesses/'.$business->id.'/branding/logo', [
            'logo' => $file,
        ], ['Accept' => 'application/json'])
            ->assertSuccessful()
            ->assertJsonPath('data.has_logo', true);

        $this->getJson('/api/v1/branding/businesses/'.$business->id.'/logo')
            ->assertOk();
    }

    public function test_fetch_website_brand_assets_soft_fails_and_stores_favicon(): void
    {
        [$admin, $business, $website] = $this->makeBusinessAdmin();

        Http::fake(function (HttpRequest $request) {
            if ($request->url() === 'https://demo.example') {
                return Http::response(
                    '<html><head><link rel="icon" href="/icon.png"><meta property="og:image" content="/og.png"></head></html>',
                    200,
                    ['Content-Type' => 'text/html'],
                );
            }

            return Http::response('fakepng', 200, ['Content-Type' => 'image/png']);
        });

        $this->actingAs($admin);
        AuthSession::markFullyAuthenticated();

        $this->asSpa()->postJson('/api/v1/admin/websites/'.$website->id.'/fetch-brand-assets')
            ->assertOk()
            ->assertJsonPath('data.id', $website->id);

        $website->refresh();
        $this->assertNotNull($website->favicon_path);
        $this->assertNotNull($website->logo_fetched_at);
    }

    /**
     * @return array{0: User, 1: Business, 2: Website}
     */
    private function makeBusinessAdmin(): array
    {
        $business = Business::factory()->create(['currency' => 'EUR']);
        $website = Website::factory()->create([
            'business_id' => $business->id,
            'base_url' => 'https://demo.example',
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
