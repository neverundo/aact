<?php

namespace Database\Seeders;

use App\Enums\DocumentScanStatus;
use App\Enums\MembershipRole;
use App\Enums\MembershipStatus;
use App\Enums\PaymentMethodStatus;
use App\Enums\PaymentMethodType;
use App\Enums\PlatformRole;
use App\Models\Business;
use App\Models\BusinessMembership;
use App\Models\CommissionRule;
use App\Models\IntegrationCredential;
use App\Models\PaymentMethodVersion;
use App\Models\PrivateDocument;
use App\Models\ReferralCode;
use App\Models\User;
use App\Models\Website;
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

        $platformAdmin = User::query()->updateOrCreate(
            ['email' => 'platform@aact.test'],
            [
                'name' => 'Platform Admin',
                'password' => Hash::make('platform-passphrase'),
                'email_verified_at' => now(),
                'platform_role' => PlatformRole::PlatformAdmin,
                'totp_secret' => self::DEMO_TOTP_SECRET,
                'totp_confirmed_at' => now(),
            ]
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

        $businessAdmin = User::query()->updateOrCreate(
            ['email' => 'admin@aact.test'],
            [
                'name' => 'Business Admin',
                'password' => Hash::make('admin-passphrase'),
                'email_verified_at' => now(),
                'totp_secret' => self::DEMO_TOTP_SECRET,
                'totp_confirmed_at' => now(),
            ]
        );

        BusinessMembership::query()->updateOrCreate(
            [
                'business_id' => $business->id,
                'user_id' => $businessAdmin->id,
                'role' => MembershipRole::BusinessAdmin,
            ],
            ['status' => MembershipStatus::Approved]
        );

        $referrer = User::query()->updateOrCreate(
            ['email' => 'referrer@aact.test'],
            [
                'name' => 'Demo Referrer',
                'password' => Hash::make('referrer-passphrase'),
                'email_verified_at' => now(),
            ]
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

        $existingIntegration = IntegrationCredential::query()
            ->where('business_id', $business->id)
            ->where('source', 'demo_checkout')
            ->exists();

        if (! $existingIntegration) {
            $created = app(IntegrationCredentialService::class)->create(
                $businessAdmin,
                $business,
                $website,
                'demo_checkout',
                'Demo checkout',
            );

            $this->command?->warn('Integration credentials (shown once; rotate via admin if lost):');
            $this->command?->line('  AACT_TOKEN='.$created['plain_token']);
            $this->command?->line('  AACT_HMAC_SECRET='.$created['hmac_secret']);
        } else {
            $this->command?->info('Integration credential demo_checkout already exists (secrets not re-printed).');
        }

        $this->command?->info('Seeded demo users (local only):');
        $this->command?->info('- platform@aact.test / platform-passphrase (TOTP: '.self::DEMO_TOTP_SECRET.')');
        $this->command?->info('- admin@aact.test / admin-passphrase (TOTP: '.self::DEMO_TOTP_SECRET.')');
        $this->command?->info('- referrer@aact.test / referrer-passphrase');
        $this->command?->info('- referral code: REF-DEMOCODE01');
        $this->command?->info('- payout threshold: 1000 minor units');
        unset($platformAdmin);
    }
}
