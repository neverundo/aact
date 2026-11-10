<?php

namespace Tests\Feature\Integration;

use App\Enums\CommercialEventStatus;
use App\Enums\MembershipRole;
use App\Enums\MembershipStatus;
use App\Models\Business;
use App\Models\BusinessMembership;
use App\Models\CommercialEvent;
use App\Models\Commission;
use App\Models\IntegrationCredential;
use App\Models\LedgerEntry;
use App\Models\LedgerLine;
use App\Models\ReferralCode;
use App\Models\User;
use App\Models\Website;
use App\Services\Commission\CommissionRuleService;
use App\Services\Commission\CreateCommissionRuleData;
use App\Services\Integration\IntegrationCredentialService;
use App\Support\AuthSession;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\Support\SignsIntegrationRequests;
use Tests\TestCase;

class EventIngestionTest extends TestCase
{
    use RefreshDatabase;
    use SignsIntegrationRequests;

    public function test_signed_sale_event_creates_commission_and_balanced_ledger(): void
    {
        [$credential, $token, $secret, $code] = $this->bootstrapAttributedStack();

        $response = $this->postSignedEvent($credential, $token, $secret, [
            'external_event_id' => 'ord-1001',
            'event_type' => 'sale',
            'occurred_at' => now()->toIso8601String(),
            'amount_minor' => 10_000,
            'currency' => 'EUR',
            'referral_code' => $code->code,
        ]);

        $response->assertCreated()
            ->assertJsonPath('replayed', false)
            ->assertJsonPath('event.status', CommercialEventStatus::Attributed->value)
            ->assertJsonPath('commission.commission_minor', 1000);

        $this->assertDatabaseCount('commissions', 1);
        $this->assertDatabaseCount('ledger_entries', 1);
        $this->assertDatabaseCount('ledger_lines', 2);

        $entry = LedgerEntry::query()->with('lines')->firstOrFail();
        $this->assertTrue($entry->isBalanced());
        $this->assertSame(1000, (int) $entry->lines()->where('side', 'debit')->sum('amount_minor'));
        $this->assertSame(1000, (int) $entry->lines()->where('side', 'credit')->sum('amount_minor'));
    }

    public function test_retry_with_same_external_event_id_does_not_duplicate(): void
    {
        [$credential, $token, $secret, $code] = $this->bootstrapAttributedStack();

        $body = [
            'external_event_id' => 'ord-dup',
            'event_type' => 'sale',
            'occurred_at' => now()->toIso8601String(),
            'amount_minor' => 5_000,
            'currency' => 'EUR',
            'referral_code' => $code->code,
        ];

        $this->postSignedEvent($credential, $token, $secret, $body)->assertCreated();
        $second = $this->postSignedEvent($credential, $token, $secret, $body)->assertOk();

        $second->assertJsonPath('replayed', true)
            ->assertJsonPath('commission.commission_minor', 500);

        $this->assertSame(1, CommercialEvent::query()->count());
        $this->assertSame(1, Commission::query()->count());
        $this->assertSame(1, LedgerEntry::query()->count());
        $this->assertSame(2, LedgerLine::query()->count());
    }

    public function test_invalid_hmac_is_rejected(): void
    {
        [$credential, $token, $secret, $code] = $this->bootstrapAttributedStack();

        $this->postSignedEvent($credential, $token, $secret.'x', [
            'external_event_id' => 'ord-bad-sig',
            'event_type' => 'sale',
            'occurred_at' => now()->toIso8601String(),
            'amount_minor' => 1000,
            'currency' => 'EUR',
            'referral_code' => $code->code,
        ])->assertStatus(422);

        $this->assertDatabaseCount('commercial_events', 0);
    }

    public function test_replayed_nonce_is_rejected(): void
    {
        [$credential, $token, $secret, $code] = $this->bootstrapAttributedStack();
        $nonce = bin2hex(random_bytes(16));

        $body = [
            'external_event_id' => 'ord-nonce-1',
            'event_type' => 'sale',
            'occurred_at' => now()->toIso8601String(),
            'amount_minor' => 2000,
            'currency' => 'EUR',
            'referral_code' => $code->code,
        ];

        $this->postSignedEvent($credential, $token, $secret, $body, $nonce)->assertCreated();

        $this->postSignedEvent($credential, $token, $secret, [
            ...$body,
            'external_event_id' => 'ord-nonce-2',
        ], $nonce)->assertStatus(422);
    }

    public function test_missing_referral_code_is_ignored_without_commission(): void
    {
        [$credential, $token, $secret] = $this->bootstrapAttributedStack();

        $this->postSignedEvent($credential, $token, $secret, [
            'external_event_id' => 'ord-noref',
            'event_type' => 'sale',
            'occurred_at' => now()->toIso8601String(),
            'amount_minor' => 3000,
            'currency' => 'EUR',
        ])->assertCreated()
            ->assertJsonPath('event.status', CommercialEventStatus::Ignored->value)
            ->assertJsonPath('commission', null);

        $this->assertDatabaseCount('commissions', 0);
        $this->assertDatabaseCount('ledger_entries', 0);
    }

    /**
     * @return array{0: IntegrationCredential, 1: string, 2: string, 3: ReferralCode}
     */
    private function bootstrapAttributedStack(): array
    {
        $business = Business::factory()->create(['currency' => 'EUR']);
        $website = Website::factory()->create([
            'business_id' => $business->id,
            'is_active' => true,
        ]);

        $admin = User::factory()->create([
            'totp_secret' => 'JBSWY3DPEHPK3PXP',
            'totp_confirmed_at' => now(),
        ]);
        BusinessMembership::factory()->create([
            'business_id' => $business->id,
            'user_id' => $admin->id,
            'role' => MembershipRole::BusinessAdmin,
            'status' => MembershipStatus::Approved,
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
            'code' => 'REF-TESTCODE1',
            'is_active' => true,
        ]);

        $this->actingAs($admin);
        AuthSession::markFullyAuthenticated();

        $created = app(IntegrationCredentialService::class)->create(
            $admin,
            $business,
            $website,
            'node_checkout',
            'Demo checkout',
        );

        app(CommissionRuleService::class)->create(new CreateCommissionRuleData(
            actor: $admin,
            business: $business,
            name: 'Default sale 10%',
            eventType: 'sale',
            rateBps: 1000,
            flatMinor: 0,
            priority: 100,
            effectiveFrom: Carbon::now()->subDay(),
            website: $website,
        ));

        return [
            $created['credential'],
            $created['plain_token'],
            $created['hmac_secret'],
            $code,
        ];
    }
}
