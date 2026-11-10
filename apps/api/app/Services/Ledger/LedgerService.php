<?php

namespace App\Services\Ledger;

use App\Enums\LedgerAccountType;
use App\Enums\LedgerSide;
use App\Models\BusinessMembership;
use App\Models\Commission;
use App\Models\LedgerAccount;
use App\Models\LedgerEntry;
use App\Models\LedgerLine;
use App\Models\PayoutRequest;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class LedgerService
{
    /**
     * Post a balanced commission accrual. Idempotent on business + key.
     */
    public function postCommissionAccrual(Commission $commission): LedgerEntry
    {
        return $this->postBalancedEntry(
            businessId: $commission->business_id,
            idempotencyKey: 'commission_accrual:'.$commission->commercial_event_id,
            entryType: 'commission_accrual',
            description: 'Commission accrual for event #'.$commission->commercial_event_id,
            amountMinor: $commission->commission_minor,
            debitAccount: $this->ensureAccount(
                $commission->business_id,
                'commission_expense',
                'Commission expense',
                LedgerAccountType::Expense,
                $commission->currency,
            ),
            creditAccount: $this->ensurePayableAccount($commission->business_membership_id, $commission->business_id, $commission->currency),
            commercialEventId: $commission->commercial_event_id,
            commissionId: $commission->id,
        );
    }

    /**
     * Reverse previously accrued commission: debit payable, credit expense.
     */
    public function postCommissionReversal(
        Commission $commission,
        int $amountMinor,
        int $reversalEventId,
    ): LedgerEntry {
        return $this->postBalancedEntry(
            businessId: $commission->business_id,
            idempotencyKey: 'commission_reversal:event:'.$reversalEventId,
            entryType: 'commission_reversal',
            description: 'Commission reversal for event #'.$reversalEventId,
            amountMinor: $amountMinor,
            debitAccount: $this->ensurePayableAccount($commission->business_membership_id, $commission->business_id, $commission->currency),
            creditAccount: $this->ensureAccount(
                $commission->business_id,
                'commission_expense',
                'Commission expense',
                LedgerAccountType::Expense,
                $commission->currency,
            ),
            commercialEventId: $reversalEventId,
            commissionId: $commission->id,
        );
    }

    /**
     * Record external payout settlement: debit payable, credit clearing.
     */
    public function postPayoutSettlement(PayoutRequest $payout): LedgerEntry
    {
        $clearing = $this->ensureAccount(
            $payout->business_id,
            'settlement_clearing',
            'Settlement clearing',
            LedgerAccountType::Clearing,
            $payout->currency,
        );

        return $this->postBalancedEntry(
            businessId: $payout->business_id,
            idempotencyKey: 'payout_settlement:'.$payout->id,
            entryType: 'payout_settlement',
            description: 'Payout settlement #'.$payout->id,
            amountMinor: $payout->amount_minor,
            debitAccount: $this->ensurePayableAccount($payout->business_membership_id, $payout->business_id, $payout->currency),
            creditAccount: $clearing,
            commercialEventId: null,
            commissionId: null,
        );
    }

    public function ensureAccount(
        int $businessId,
        string $code,
        string $name,
        LedgerAccountType $type,
        string $currency,
        ?int $membershipId = null,
    ): LedgerAccount {
        return LedgerAccount::query()->firstOrCreate(
            [
                'business_id' => $businessId,
                'code' => $code,
            ],
            [
                'name' => $name,
                'account_type' => $type,
                'business_membership_id' => $membershipId,
                'currency' => $currency,
            ]
        );
    }

    public function ensurePayableAccount(int $membershipId, int $businessId, string $currency): LedgerAccount
    {
        return $this->ensureAccount(
            businessId: $businessId,
            code: 'payable:membership:'.$membershipId,
            name: 'Referrer payable #'.$membershipId,
            type: LedgerAccountType::Payable,
            currency: $currency,
            membershipId: $membershipId,
        );
    }

    public function payableBalanceMinor(BusinessMembership $membership): int
    {
        $account = LedgerAccount::query()
            ->where('business_id', $membership->business_id)
            ->where('code', 'payable:membership:'.$membership->id)
            ->first();

        if ($account === null) {
            return 0;
        }

        $credits = (int) $account->lines()->where('side', LedgerSide::Credit)->sum('amount_minor');
        $debits = (int) $account->lines()->where('side', LedgerSide::Debit)->sum('amount_minor');

        return $credits - $debits;
    }

    private function postBalancedEntry(
        int $businessId,
        string $idempotencyKey,
        string $entryType,
        string $description,
        int $amountMinor,
        LedgerAccount $debitAccount,
        LedgerAccount $creditAccount,
        ?int $commercialEventId,
        ?int $commissionId,
    ): LedgerEntry {
        if ($amountMinor <= 0) {
            throw new RuntimeException('Ledger amount must be positive.');
        }

        $existing = LedgerEntry::query()
            ->where('business_id', $businessId)
            ->where('idempotency_key', $idempotencyKey)
            ->with('lines')
            ->first();

        if ($existing !== null) {
            return $existing;
        }

        try {
            return DB::transaction(function () use (
                $businessId,
                $idempotencyKey,
                $entryType,
                $description,
                $amountMinor,
                $debitAccount,
                $creditAccount,
                $commercialEventId,
                $commissionId,
            ) {
                $entry = LedgerEntry::query()->create([
                    'business_id' => $businessId,
                    'commercial_event_id' => $commercialEventId,
                    'commission_id' => $commissionId,
                    'entry_type' => $entryType,
                    'idempotency_key' => $idempotencyKey,
                    'description' => $description,
                    'posted_at' => now(),
                ]);

                LedgerLine::query()->create([
                    'ledger_entry_id' => $entry->id,
                    'ledger_account_id' => $debitAccount->id,
                    'business_id' => $businessId,
                    'side' => LedgerSide::Debit,
                    'amount_minor' => $amountMinor,
                ]);

                LedgerLine::query()->create([
                    'ledger_entry_id' => $entry->id,
                    'ledger_account_id' => $creditAccount->id,
                    'business_id' => $businessId,
                    'side' => LedgerSide::Credit,
                    'amount_minor' => $amountMinor,
                ]);

                $entry->load('lines');

                if (! $entry->isBalanced()) {
                    throw new RuntimeException('Ledger entry is not balanced.');
                }

                return $entry;
            });
        } catch (QueryException $e) {
            $existing = LedgerEntry::query()
                ->where('business_id', $businessId)
                ->where('idempotency_key', $idempotencyKey)
                ->with('lines')
                ->first();

            if ($existing !== null) {
                return $existing;
            }

            throw $e;
        }
    }
}
