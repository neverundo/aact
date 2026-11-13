<?php

namespace Tests\Feature\Admin;

use App\Enums\DocumentScanStatus;
use App\Enums\MembershipRole;
use App\Enums\MembershipStatus;
use App\Enums\PaymentMethodStatus;
use App\Enums\PaymentMethodType;
use App\Http\Middleware\SoftAuthenticateSession;
use App\Models\Business;
use App\Models\BusinessMembership;
use App\Models\PaymentMethodVersion;
use App\Models\PrivateDocument;
use App\Models\User;
use App\Services\Documents\PrivateDocumentStorage;
use App\Support\AuthSession;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Http\Middleware\AuthenticateSession;
use PragmaRX\Google2FA\Google2FA;
use Tests\TestCase;

class PaymentMethodDocumentReviewTest extends TestCase
{
    use RefreshDatabase;

    private const TOTP_SECRET = 'JBSWY3DPEHPK3PXP';

    private const ADMIN_PASSWORD = 'password-passphrase';

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutMiddleware([
            AuthenticateSession::class,
            SoftAuthenticateSession::class,
        ]);

        Storage::fake(PrivateDocumentStorage::DISK);
    }

    public function test_list_includes_bank_proof_metadata_and_flags(): void
    {
        [$admin, $version, $membership] = $this->makePendingPaymentMethod();
        $this->storeBankProof($membership, DocumentScanStatus::Clean);

        $this->actingAs($admin);
        AuthSession::markFullyAuthenticated();

        $this->asSpa()->getJson('/api/v1/admin/payment-methods?status=pending_review')
            ->assertOk()
            ->assertJsonPath('data.0.id', $version->id)
            ->assertJsonPath('data.0.has_bank_proof', true)
            ->assertJsonPath('data.0.bank_proof_ready', true)
            ->assertJsonPath('data.0.documents.0.purpose', 'bank_proof')
            ->assertJsonPath('data.0.documents.0.scan_status', 'clean');
    }

    public function test_approve_requires_readable_bank_proof(): void
    {
        [$admin, $version] = $this->makePendingPaymentMethod();

        $this->actingAs($admin);
        AuthSession::markFullyAuthenticated();

        $this->asSpa()->postJson('/api/v1/admin/payment-methods/'.$version->id.'/review', [
            'status' => 'approved',
            'password' => self::ADMIN_PASSWORD,
            'code' => $this->totpCode(),
        ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['documents']);
    }

    public function test_approve_rejects_infected_bank_proof(): void
    {
        [$admin, $version, $membership] = $this->makePendingPaymentMethod();
        $this->storeBankProof($membership, DocumentScanStatus::Infected);

        $this->actingAs($admin);
        AuthSession::markFullyAuthenticated();

        $this->asSpa()->postJson('/api/v1/admin/payment-methods/'.$version->id.'/review', [
            'status' => 'approved',
            'password' => self::ADMIN_PASSWORD,
            'code' => $this->totpCode(),
        ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['documents']);
    }

    public function test_approve_with_clean_proof_and_password_totp_succeeds(): void
    {
        [$admin, $version, $membership] = $this->makePendingPaymentMethod();
        $this->storeBankProof($membership, DocumentScanStatus::Clean);

        $this->actingAs($admin);
        AuthSession::markFullyAuthenticated();

        $this->asSpa()->postJson('/api/v1/admin/payment-methods/'.$version->id.'/review', [
            'status' => 'approved',
            'password' => self::ADMIN_PASSWORD,
            'code' => $this->totpCode(),
        ])
            ->assertOk()
            ->assertJsonPath('data.status', 'approved')
            ->assertJsonPath('data.bank_proof_ready', true);

        $this->assertTrue(AuthSession::hasValidStepUp());
    }

    public function test_approve_rejects_invalid_password_or_totp(): void
    {
        [$admin, $version, $membership] = $this->makePendingPaymentMethod();
        $this->storeBankProof($membership, DocumentScanStatus::Clean);

        $this->actingAs($admin);
        AuthSession::markFullyAuthenticated();

        $this->asSpa()->postJson('/api/v1/admin/payment-methods/'.$version->id.'/review', [
            'status' => 'approved',
            'password' => 'wrong-password',
            'code' => $this->totpCode(),
        ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['password']);

        $this->asSpa()->postJson('/api/v1/admin/payment-methods/'.$version->id.'/review', [
            'status' => 'approved',
            'password' => self::ADMIN_PASSWORD,
            'code' => '000000',
        ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['code']);
    }

    public function test_reject_requires_notes_and_password_totp(): void
    {
        [$admin, $version] = $this->makePendingPaymentMethod();

        $this->actingAs($admin);
        AuthSession::markFullyAuthenticated();

        $this->asSpa()->postJson('/api/v1/admin/payment-methods/'.$version->id.'/review', [
            'status' => 'rejected',
            'password' => self::ADMIN_PASSWORD,
            'code' => $this->totpCode(),
        ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['notes']);

        $admin->forceFill(['totp_last_timestep' => null])->save();

        $this->asSpa()->postJson('/api/v1/admin/payment-methods/'.$version->id.'/review', [
            'status' => 'rejected',
            'notes' => 'IBAN does not match account holder',
            'password' => self::ADMIN_PASSWORD,
            'code' => $this->totpCode(),
        ])
            ->assertOk()
            ->assertJsonPath('data.status', 'rejected')
            ->assertJsonPath('data.review_notes', 'IBAN does not match account holder');
    }

    public function test_foreign_business_admin_cannot_review(): void
    {
        [, $version, $membership] = $this->makePendingPaymentMethod();
        $this->storeBankProof($membership, DocumentScanStatus::Clean);

        $otherBusiness = Business::factory()->create();
        $intruder = User::factory()->create([
            'password' => Hash::make(self::ADMIN_PASSWORD),
            'totp_secret' => self::TOTP_SECRET,
            'totp_confirmed_at' => now(),
        ]);
        BusinessMembership::factory()->create([
            'business_id' => $otherBusiness->id,
            'user_id' => $intruder->id,
            'role' => MembershipRole::BusinessAdmin,
            'status' => MembershipStatus::Approved,
        ]);

        $this->actingAs($intruder);
        AuthSession::markFullyAuthenticated();

        $this->asSpa()->getJson('/api/v1/admin/payment-methods?status=pending_review')
            ->assertOk()
            ->assertJsonCount(0, 'data');

        $this->asSpa()->postJson('/api/v1/admin/payment-methods/'.$version->id.'/review', [
            'status' => 'approved',
            'password' => self::ADMIN_PASSWORD,
            'code' => $this->totpCodeFor($intruder),
        ])->assertForbidden();
    }

    public function test_admin_can_download_clean_bank_proof_with_opaque_headers(): void
    {
        [$admin, , $membership] = $this->makePendingPaymentMethod();
        $document = $this->storeBankProof($membership, DocumentScanStatus::Clean, '%PDF-1.4 admin download');

        $this->actingAs($admin);
        AuthSession::markFullyAuthenticated();

        $response = $this->asSpa()->get('/api/v1/portal/documents/'.$document->uuid.'/download');
        $response->assertOk();
        $this->assertSame('%PDF-1.4 admin download', $response->streamedContent());
        $this->assertStringContainsString('application/octet-stream', (string) $response->headers->get('Content-Type'));
        $this->assertSame('nosniff', $response->headers->get('X-Content-Type-Options'));
        $this->assertSame('DENY', $response->headers->get('X-Frame-Options'));
    }

    /**
     * @return array{0: User, 1: PaymentMethodVersion, 2: BusinessMembership}
     */
    private function makePendingPaymentMethod(): array
    {
        $business = Business::factory()->create();
        $admin = User::factory()->create([
            'password' => Hash::make(self::ADMIN_PASSWORD),
            'totp_secret' => self::TOTP_SECRET,
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
            'status' => MembershipStatus::Pending,
        ]);

        $version = PaymentMethodVersion::query()->create([
            'user_id' => $referrer->id,
            'business_id' => $business->id,
            'business_membership_id' => $membership->id,
            'method_type' => PaymentMethodType::Iban,
            'payload_encrypted' => ['iban' => 'DE89370400440532013000', 'holder_name' => 'Referrer'],
            'display_mask' => 'DE89**************3000',
            'status' => PaymentMethodStatus::PendingReview,
            'version' => 1,
        ]);

        return [$admin, $version, $membership];
    }

    private function storeBankProof(
        BusinessMembership $membership,
        DocumentScanStatus $scanStatus,
        string $plain = '%PDF-1.4 bank proof',
    ): PrivateDocument {
        $path = $membership->business_id.'/'.$membership->user_id.'/proof.pdf';
        PrivateDocumentStorage::putEncrypted($path, $plain);

        return PrivateDocument::query()->create([
            'user_id' => $membership->user_id,
            'business_id' => $membership->business_id,
            'business_membership_id' => $membership->id,
            'purpose' => 'bank_proof',
            'disk' => PrivateDocumentStorage::DISK,
            'path' => $path,
            'original_filename' => 'proof.pdf',
            'mime' => 'application/pdf',
            'size_bytes' => strlen($plain),
            'scan_status' => $scanStatus,
            'scanned_at' => now(),
            'scan_engine' => 'fake',
        ]);
    }

    private function totpCode(): string
    {
        return app(Google2FA::class)->getCurrentOtp(self::TOTP_SECRET);
    }

    private function totpCodeFor(User $user): string
    {
        return app(Google2FA::class)->getCurrentOtp((string) $user->totp_secret);
    }
}
