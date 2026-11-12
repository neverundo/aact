<?php

namespace Tests\Unit\Ledger;

use App\Enums\LedgerAccountType;
use App\Enums\LedgerSide;
use App\Models\Business;
use App\Models\LedgerAccount;
use App\Models\LedgerEntry;
use App\Models\LedgerLine;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LedgerImmutabilityTest extends TestCase
{
    use RefreshDatabase;

    public function test_ledger_entry_cannot_be_updated(): void
    {
        $business = Business::factory()->create();
        $entry = LedgerEntry::query()->create([
            'business_id' => $business->id,
            'entry_type' => 'commission_accrual',
            'idempotency_key' => 'immutability-update',
            'posted_at' => now(),
        ]);

        $this->expectException(\LogicException::class);
        $entry->forceFill(['description' => 'mutated'])->save();
    }

    public function test_ledger_entry_cannot_be_deleted(): void
    {
        $business = Business::factory()->create();
        $entry = LedgerEntry::query()->create([
            'business_id' => $business->id,
            'entry_type' => 'commission_accrual',
            'idempotency_key' => 'immutability-delete',
            'posted_at' => now(),
        ]);

        $this->expectException(\LogicException::class);
        $entry->delete();
    }

    public function test_ledger_line_cannot_be_updated(): void
    {
        $business = Business::factory()->create();
        $entry = LedgerEntry::query()->create([
            'business_id' => $business->id,
            'entry_type' => 'commission_accrual',
            'idempotency_key' => 'immutability-line',
            'posted_at' => now(),
        ]);
        $account = LedgerAccount::query()->create([
            'business_id' => $business->id,
            'code' => 'test_expense',
            'name' => 'Test',
            'account_type' => LedgerAccountType::Expense,
            'currency' => 'EUR',
        ]);
        $line = LedgerLine::query()->create([
            'ledger_entry_id' => $entry->id,
            'ledger_account_id' => $account->id,
            'business_id' => $business->id,
            'side' => LedgerSide::Debit,
            'amount_minor' => 100,
        ]);

        $this->expectException(\LogicException::class);
        $line->forceFill(['amount_minor' => 1])->save();
    }
}
