<?php

namespace App\Services\Ledger;

use App\Enums\LedgerAccountType;
use App\Enums\LedgerSide;
use App\Enums\PayoutRequestStatus;
use App\Models\BusinessMembership;
use App\Models\Commission;
use App\Models\LedgerAccount;
use App\Models\LedgerEntry;
use App\Models\LedgerLine;
use App\Models\PayoutRequest;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;

class LedgerService
{
    /**
     * Post a balanced commission accrual. Idempotent on business + key.
     */
    public function postCommissionAccrual(Commission $commission): LedgerEntry
    {
        return $this->postBalancedEntry(new PostBalancedEntryData(
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
        ));
    }

    /**
     * Reverse previously accrued commission: debit payable, credit expense.
     */
    public function postCommissionReversal(
        Commission $commission,
        int $amountMinor,
        int $reversalEventId,
    ): LedgerEntry {
        return $this->postBalancedEntry(new PostBalancedEntryData(
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
        ));
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

        return $this->postBalancedEntry(new PostBalancedEntryData(
            businessId: $payout->business_id,
            idempotencyKey: 'payout_settlement:'.$payout->id,
            entryType: 'payout_settlement',
            description: 'Payout settlement #'.$payout->id,
            amountMinor: $payout->amount_minor,
            debitAccount: $this->ensurePayableAccount($payout->business_membership_id, $payout->business_id, $payout->currency),
            creditAccount: $clearing,
            commercialEventId: null,
            commissionId: null,
        ));
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

    /**
     * Soft-reserved amount for open (pending/approved) payout requests.
     */
    public function reservedPayoutMinor(BusinessMembership $membership): int
    {
        return (int) PayoutRequest::query()
            ->where('business_membership_id', $membership->id)
            ->whereIn('status', [
                PayoutRequestStatus::Pending->value,
                PayoutRequestStatus::Approved->value,
            ])
            ->sum('amount_minor');
    }

    /**
     * Payable not committed to an open payout request.
     */
    public function availableBalanceMinor(BusinessMembership $membership): int
    {
        return max(0, $this->payableBalanceMinor($membership) - $this->reservedPayoutMinor($membership));
    }

    private function postBalancedEntry(PostBalancedEntryData $data): LedgerEntry
    {
        if ($data->amountMinor <= 0) {
            throw LedgerAmountException::mustBePositive();
        }

        $existing = LedgerEntry::query()
            ->where('business_id', $data->businessId)
            ->where('idempotency_key', $data->idempotencyKey)
            ->with('lines')
            ->first();

        if ($existing !== null) {
            return $existing;
        }

        try {
            return DB::transaction(function () use ($data) {
                $entry = LedgerEntry::query()->create([
                    'business_id' => $data->businessId,
                    'commercial_event_id' => $data->commercialEventId,
                    'commission_id' => $data->commissionId,
                    'entry_type' => $data->entryType,
                    'idempotency_key' => $data->idempotencyKey,
                    'description' => $data->description,
                    'posted_at' => now(),
                ]);

                LedgerLine::query()->create([
                    'ledger_entry_id' => $entry->id,
                    'ledger_account_id' => $data->debitAccount->id,
                    'business_id' => $data->businessId,
                    'side' => LedgerSide::Debit,
                    'amount_minor' => $data->amountMinor,
                ]);

                LedgerLine::query()->create([
                    'ledger_entry_id' => $entry->id,
                    'ledger_account_id' => $data->creditAccount->id,
                    'business_id' => $data->businessId,
                    'side' => LedgerSide::Credit,
                    'amount_minor' => $data->amountMinor,
                ]);

                $entry->load('lines');

                if (! $entry->isBalanced()) {
                    throw LedgerBalanceException::entryNotBalanced();
                }

                return $entry;
            });
        } catch (QueryException $e) {
            $existing = LedgerEntry::query()
                ->where('business_id', $data->businessId)
                ->where('idempotency_key', $data->idempotencyKey)
                ->with('lines')
                ->first();

            if ($existing !== null) {
                return $existing;
            }

            throw $e;
        }
    }
}
