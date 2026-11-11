<?php

namespace Database\Seeders;

use App\Enums\DocumentScanStatus;
use App\Enums\MembershipRole;
use App\Enums\MembershipStatus;
use App\Enums\PaymentMethodStatus;
use App\Enums\PaymentMethodType;
use App\Enums\PlatformRole;
use App\Models\Business;
use App\Models\BusinessBranding;
use App\Models\BusinessMembership;
use App\Models\CommercialEvent;
use App\Models\CommissionRule;
use App\Models\IntegrationCredential;
use App\Models\PaymentMethodVersion;
use App\Models\PrivateDocument;
use App\Models\ReferralCode;
use App\Models\User;
use App\Models\Website;
use App\Services\Commission\CommissionReversalService;
use App\Services\Integration\EventIngestionService;
use App\Services\Integration\IntegrationCredentialService;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Hash;

/**
 * Synthetic local/demo identities and happy-path fixtures. Never enable in production.
 *
 * Admin TOTP secret (local only): JBSWY3DPEHPK3PXP
 */
class DemoSeeder extends Seeder
{
    public const DEMO_TOTP_SECRET = 'JBSWY3DPEHPK3PXP';

    public function run(): void
    {
        if (! app()->environment(['local', 'testing'])) {
            $this->command?->warn('DemoSeeder refused outside local/testing.');

            return;
        }

        $platformAdmin = $this->seedDemoUser(
            email: 'platform@aact.test',
            name: 'Platform Admin',
            password: 'platform-passphrase',
            attributes: [
                'platform_role' => PlatformRole::PlatformAdmin,
                'totp_secret' => self::DEMO_TOTP_SECRET,
                'totp_confirmed_at' => now(),
                'totp_last_timestep' => null,
            ],
        );

        $business = Business::query()->updateOrCreate(
            ['slug' => 'demo-business'],
            [
                'name' => 'Demo Business',
                'currency' => 'EUR',
                'payout_threshold_minor' => 1000,
                'is_active' => true,
            ]
        );

        $website = Website::query()->updateOrCreate(
            [
                'business_id' => $business->id,
                'base_url' => 'https://demo.example',
            ],
            [
                'name' => 'Demo Website',
                'is_active' => true,
            ]
        );

        $businessAdmin = $this->seedDemoUser(
            email: 'admin@aact.test',
            name: 'Business Admin',
            password: 'admin-passphrase',
            attributes: [
                'totp_secret' => self::DEMO_TOTP_SECRET,
                'totp_confirmed_at' => now(),
                'totp_last_timestep' => null,
            ],
        );

        BusinessMembership::query()->updateOrCreate(
            [
                'business_id' => $business->id,
                'user_id' => $businessAdmin->id,
                'role' => MembershipRole::BusinessAdmin,
            ],
            ['status' => MembershipStatus::Approved]
        );

        $referrer = $this->seedDemoUser(
            email: 'referrer@aact.test',
            name: 'Demo Referrer',
            password: 'referrer-passphrase',
        );

        $membership = BusinessMembership::query()->updateOrCreate(
            [
                'business_id' => $business->id,
                'user_id' => $referrer->id,
                'role' => MembershipRole::Referrer,
            ],
            ['status' => MembershipStatus::Approved]
        );
        $membership->websites()->syncWithoutDetaching([$website->id]);

        PaymentMethodVersion::query()->updateOrCreate(
            [
                'business_membership_id' => $membership->id,
                'version' => 1,
            ],
            [
                'user_id' => $referrer->id,
                'business_id' => $business->id,
                'method_type' => PaymentMethodType::Iban,
                'payload_encrypted' => [
                    'iban' => 'PT50000201231234567890154',
                    'holder_name' => 'Demo Referrer',
                ],
                'display_mask' => 'PT50**************0154',
                'status' => PaymentMethodStatus::Approved,
                'reviewed_by_user_id' => $businessAdmin->id,
                'reviewed_at' => now(),
            ]
        );

        PrivateDocument::query()->updateOrCreate(
            [
                'user_id' => $referrer->id,
                'business_membership_id' => $membership->id,
                'path' => 'demo/identity.pdf',
            ],
            [
                'business_id' => $business->id,
                'purpose' => 'identity',
                'disk' => 'private_documents',
                'original_filename' => 'identity.pdf',
                'mime' => 'application/pdf',
                'size_bytes' => 1024,
                'scan_status' => DocumentScanStatus::Clean,
                'scanned_at' => now(),
                'scan_engine' => 'fake',
            ]
        );

        ReferralCode::query()->updateOrCreate(
            [
                'business_id' => $business->id,
                'code' => 'REF-DEMOCODE01',
            ],
            [
                'business_membership_id' => $membership->id,
                'user_id' => $referrer->id,
                'website_id' => $website->id,
                'is_active' => true,
            ]
        );

        CommissionRule::query()->updateOrCreate(
            [
                'business_id' => $business->id,
                'name' => 'Demo sale 10%',
                'version' => 1,
            ],
            [
                'website_id' => $website->id,
                'event_type' => 'sale',
                'rate_bps' => 1000,
                'flat_minor' => 0,
                'currency' => 'EUR',
                'priority' => 100,
                'effective_from' => Carbon::now()->subYear(),
                'effective_to' => null,
                'is_active' => true,
            ]
        );

        $credential = IntegrationCredential::query()
            ->where('business_id', $business->id)
            ->where('source', 'demo_checkout')
            ->first();

        if ($credential === null) {
            $created = app(IntegrationCredentialService::class)->create(
                $businessAdmin,
                $business,
                $website,
                'demo_checkout',
                'Demo checkout',
            );
            $credential = $created['credential'];

            $this->command?->warn('Integration credentials (shown once; rotate via admin if lost):');
            $this->command?->line('  AACT_TOKEN='.$created['plain_token']);
            $this->command?->line('  AACT_HMAC_SECRET='.$created['hmac_secret']);
        } else {
            $this->command?->info('Integration credential demo_checkout already exists (secrets not re-printed).');
        }

        BusinessBranding::query()->updateOrCreate(
            ['business_id' => $business->id],
            [
                'display_name' => 'Demo Business',
                'primary_color' => '#1C1917',
                'secondary_color' => '#78716C',
                'accent_color' => '#0F766E',
            ]
        );

        $this->seedAttributionDemo($credential);

        $this->command?->info('Seeded demo users (local only):');
        $this->command?->info('- platform@aact.test / platform-passphrase (TOTP: '.self::DEMO_TOTP_SECRET.')');
        $this->command?->info('- admin@aact.test / admin-passphrase (TOTP: '.self::DEMO_TOTP_SECRET.')');
        $this->command?->info('- referrer@aact.test / referrer-passphrase');
        $this->command?->info('- referral code: REF-DEMOCODE01');
        $this->command?->info('- payout threshold: 1000 minor units');
        unset($platformAdmin);
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    private function seedDemoUser(string $email, string $name, string $password, array $attributes = []): User
    {
        $user = User::query()->firstOrNew(['email' => $email]);
        $user->fill([
            'name' => $name,
            'email_verified_at' => now(),
            ...$attributes,
        ]);

        // Avoid rotating the password hash on every seed — Sanctum's
        // AuthenticateSession would then reject existing browser sessions with
        // "Unauthenticated." on the next login attempt.
        if (! $user->exists || ! Hash::check($password, $user->password)) {
            $user->password = $password;
        }

        $user->save();

        return $user;
    }

    private function seedAttributionDemo(IntegrationCredential $credential): void
    {
        $ingestion = app(EventIngestionService::class);
        $reversals = app(CommissionReversalService::class);

        $saleExternalId = 'demo-sale-001';
        $ignoredExternalId = 'demo-sale-ignored-001';
        $refundExternalId = 'demo-refund-001';

        if (! CommercialEvent::query()->where('external_event_id', $saleExternalId)->exists()) {
            $sale = $ingestion->ingest($credential, [
                'external_event_id' => $saleExternalId,
                'event_type' => 'sale',
                'occurred_at' => Carbon::now()->subHours(2)->toIso8601String(),
                'amount_minor' => 10000,
                'currency' => 'EUR',
                'referral_code' => 'REF-DEMOCODE01',
                'metadata' => ['channel' => 'demo-seed'],
            ]);

            $this->command?->info(sprintf(
                'Demo attributed sale #%d (commission minor: %s)',
                $sale['event']->id,
                $sale['commission']?->commission_minor ?? 'n/a',
            ));
        }

        if (! CommercialEvent::query()->where('external_event_id', $ignoredExternalId)->exists()) {
            $ignored = $ingestion->ingest($credential, [
                'external_event_id' => $ignoredExternalId,
                'event_type' => 'sale',
                'occurred_at' => Carbon::now()->subHour()->toIso8601String(),
                'amount_minor' => 5000,
                'currency' => 'EUR',
                'referral_code' => 'REF-INVALID',
                'metadata' => ['channel' => 'demo-seed-ignored'],
            ]);

            $this->command?->info(sprintf(
                'Demo ignored sale #%d (status: %s)',
                $ignored['event']->id,
                $ignored['event']->status->value,
            ));
        }

        if (! CommercialEvent::query()->where('external_event_id', $refundExternalId)->exists()) {
            $refund = $reversals->reverse($credential, [
                'external_event_id' => $refundExternalId,
                'event_type' => 'refund',
                'related_external_event_id' => $saleExternalId,
                'occurred_at' => Carbon::now()->subMinutes(30)->toIso8601String(),
                'amount_minor' => 2000,
                'currency' => 'EUR',
                'metadata' => ['channel' => 'demo-seed-refund'],
            ]);

            $this->command?->info(sprintf(
                'Demo partial refund #%d (reversed minor: %d)',
                $refund['event']->id,
                $refund['reversed_minor'],
            ));
        }
    }
}
