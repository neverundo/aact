<?php

namespace Tests\Financial;

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
use App\Services\Integration\EventIngestionService;
use App\Services\Integration\IntegrationCredentialService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use PHPUnit\Framework\Attributes\Group;

/**
 * Runs against MariaDB to exercise unique constraints under repeated races.
 */
#[Group('mariadb')]
class ConcurrentEventIngestionTest extends FinancialTestCase
{
    use RefreshDatabase;

    public function test_parallel_ingest_of_same_event_yields_single_commission_and_ledger(): void
    {
        [$credential, $code] = $this->bootstrap();

        $payload = [
            'external_event_id' => 'concurrent-ord-1',
            'event_type' => 'sale',
            'occurred_at' => now()->toIso8601String(),
            'amount_minor' => 12_345,
            'currency' => 'EUR',
            'referral_code' => $code->code,
        ];

        $service = app(EventIngestionService::class);

        $results = [];
        for ($i = 0; $i < 8; $i++) {
            $results[] = $service->ingest($credential, $payload);
        }

        $this->assertSame(1, CommercialEvent::query()->count());
        $this->assertSame(1, Commission::query()->count());
        $this->assertSame(1, LedgerEntry::query()->count());
        $this->assertSame(2, LedgerLine::query()->count());

        $replayed = collect($results)->where('replayed', true)->count();
        $this->assertGreaterThanOrEqual(7, $replayed);

        $entry = LedgerEntry::query()->with('lines')->firstOrFail();
        $this->assertTrue($entry->isBalanced());

        $debits = (int) DB::table('ledger_lines')->where('side', 'debit')->sum('amount_minor');
        $credits = (int) DB::table('ledger_lines')->where('side', 'credit')->sum('amount_minor');
        $this->assertSame($debits, $credits);
    }

    /**
     * @return array{0: IntegrationCredential, 1: ReferralCode}
     */
    private function bootstrap(): array
    {
        $business = Business::factory()->create(['currency' => 'EUR']);
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
            'code' => 'REF-CONCURRENT',
            'is_active' => true,
        ]);

        $created = app(IntegrationCredentialService::class)->create(
            $admin,
            $business,
            $website,
            'pos_lane_1',
            'POS',
        );

        app(CommissionRuleService::class)->create(
            $admin,
            $business,
            'Sale 8%',
            'sale',
            800,
            0,
            50,
            Carbon::now()->subDay(),
            $website,
        );

        return [$created['credential'], $code];
    }
}
