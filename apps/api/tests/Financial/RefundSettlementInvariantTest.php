<?php

namespace Tests\Financial;

use App\Enums\MembershipRole;
use App\Enums\MembershipStatus;
use App\Models\Business;
use App\Models\BusinessMembership;
use App\Models\Commission;
use App\Models\IntegrationCredential;
use App\Models\LedgerEntry;
use App\Models\LedgerLine;
use App\Models\ReferralCode;
use App\Models\User;
use App\Models\Website;
use App\Services\Commission\CommissionReversalService;
use App\Services\Commission\CommissionRuleService;
use App\Services\Integration\EventIngestionService;
use App\Services\Integration\IntegrationCredentialService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use PHPUnit\Framework\Attributes\Group;

#[Group('mariadb')]
class RefundSettlementInvariantTest extends FinancialTestCase
{
    use RefreshDatabase;

    public function test_repeated_refund_ingest_cannot_over_reverse_or_unbalance_ledger(): void
    {
        [$credential, $code] = $this->bootstrap();
        $ingestion = app(EventIngestionService::class);
        $reversals = app(CommissionReversalService::class);

        $ingestion->ingest($credential, [
            'external_event_id' => 'sale-inv-1',
            'event_type' => 'sale',
            'occurred_at' => now()->toIso8601String(),
            'amount_minor' => 10_000,
            'currency' => 'EUR',
            'referral_code' => $code->code,
        ]);

        $payload = [
            'external_event_id' => 'refund-inv-1',
            'event_type' => 'refund',
            'related_external_event_id' => 'sale-inv-1',
            'occurred_at' => now()->toIso8601String(),
            'amount_minor' => 10_000,
            'currency' => 'EUR',
        ];

        for ($i = 0; $i < 6; $i++) {
            $reversals->reverse($credential, $payload);
        }

        $this->assertSame(1, Commission::query()->count());
        $this->assertSame(1000, (int) Commission::query()->value('reversed_minor'));
        $this->assertSame(2, LedgerEntry::query()->count());
        $this->assertSame(4, LedgerLine::query()->count());

        $debits = (int) DB::table('ledger_lines')->where('side', 'debit')->sum('amount_minor');
        $credits = (int) DB::table('ledger_lines')->where('side', 'credit')->sum('amount_minor');
        $this->assertSame($debits, $credits);

        foreach (LedgerEntry::query()->with('lines')->get() as $entry) {
            $this->assertTrue($entry->isBalanced());
        }
    }

    /**
     * @return array{0: IntegrationCredential, 1: ReferralCode}
     */
    private function bootstrap(): array
    {
        $business = Business::factory()->create(['currency' => 'EUR', 'payout_threshold_minor' => 1000]);
        $website = Website::factory()->create(['business_id' => $business->id, 'is_active' => true]);
        $admin = User::factory()->create();
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
            'code' => 'REF-FIN4',
            'is_active' => true,
        ]);

        $created = app(IntegrationCredentialService::class)->create(
            $admin,
            $business,
            $website,
            'pos',
            'POS',
        );

        app(CommissionRuleService::class)->create(
            $admin,
            $business,
            'Sale 10%',
            'sale',
            1000,
            0,
            100,
            Carbon::now()->subDay(),
            $website,
        );

        return [$created['credential'], $code];
    }
}
