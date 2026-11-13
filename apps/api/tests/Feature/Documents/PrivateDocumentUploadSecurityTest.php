<?php

namespace Tests\Feature\Documents;

use App\Enums\DocumentScanStatus;
use App\Enums\MembershipRole;
use App\Enums\MembershipStatus;
use App\Enums\PlatformRole;
use App\Http\Middleware\SoftAuthenticateSession;
use App\Models\Business;
use App\Models\BusinessMembership;
use App\Models\PrivateDocument;
use App\Models\User;
use App\Models\Website;
use App\Notifications\ReferrerInvitationNotification;
use App\Services\Documents\FakeFileScanner;
use App\Services\Documents\FileScanner;
use App\Services\Documents\PrivateDocumentStorage;
use App\Support\AuthSession;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Http\Middleware\AuthenticateSession;
use Tests\TestCase;

class PrivateDocumentUploadSecurityTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutMiddleware([
            AuthenticateSession::class,
            SoftAuthenticateSession::class,
        ]);

        Storage::fake(PrivateDocumentStorage::DISK);
    }

    public function test_upload_stores_encrypted_blob_and_owner_downloads_plaintext(): void
    {
        [$owner, $membershipId] = $this->registerReferrer('docs-enc@example.test');
        $plain = '%PDF-1.4 encrypted proof content';

        $this->actingAs($owner);
        AuthSession::markFullyAuthenticated();

        $upload = $this->asSpa()->post('/api/v1/portal/memberships/'.$membershipId.'/documents', [
            'purpose' => 'identity',
            'file' => UploadedFile::fake()->createWithContent('id.pdf', $plain),
        ], ['Accept' => 'application/json']);

        $upload->assertCreated()
            ->assertJsonPath('data.scan_status', 'clean')
            ->assertJsonPath('data.usable', true)
            ->assertJsonPath('data.mime', 'application/pdf');

        $document = PrivateDocument::query()->where('uuid', $upload->json('data.uuid'))->firstOrFail();
        $raw = Storage::disk(PrivateDocumentStorage::DISK)->get($document->path);

        $this->assertIsString($raw);
        $this->assertStringStartsWith(PrivateDocumentStorage::PAYLOAD_PREFIX, $raw);
        $this->assertStringNotContainsString($plain, $raw);
        $this->assertSame($plain, PrivateDocumentStorage::getDecrypted($document->path));

        $download = $this->asSpa()->get('/api/v1/portal/documents/'.$document->uuid.'/download');
        $download->assertOk();
        $this->assertSame($plain, $download->streamedContent());
        $this->assertStringContainsString('application/octet-stream', (string) $download->headers->get('Content-Type'));
        $this->assertSame('nosniff', $download->headers->get('X-Content-Type-Options'));
        $this->assertSame('DENY', $download->headers->get('X-Frame-Options'));
    }

    public function test_upload_rejects_html_spoofed_as_pdf(): void
    {
        [$owner, $membershipId] = $this->registerReferrer('spoof@example.test');

        $this->actingAs($owner);
        AuthSession::markFullyAuthenticated();

        $this->asSpa()->post('/api/v1/portal/memberships/'.$membershipId.'/documents', [
            'purpose' => 'identity',
            'file' => UploadedFile::fake()->createWithContent(
                'evil.pdf',
                '<!DOCTYPE html><html><body>x</body></html>'
            ),
        ], ['Accept' => 'application/json'])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['file']);
    }

    public function test_upload_rejects_oversized_file(): void
    {
        config(['aact.documents.max_bytes' => 64]);

        [$owner, $membershipId] = $this->registerReferrer('big@example.test');

        $this->actingAs($owner);
        AuthSession::markFullyAuthenticated();

        $payload = '%PDF-1.4 '.str_repeat('A', 200);

        $this->asSpa()->post('/api/v1/portal/memberships/'.$membershipId.'/documents', [
            'purpose' => 'identity',
            'file' => UploadedFile::fake()->createWithContent('big.pdf', $payload),
        ], ['Accept' => 'application/json'])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['file']);
    }

    public function test_idor_download_is_forbidden_for_other_users(): void
    {
        [$owner, $membershipId] = $this->registerReferrer('owner-idor@example.test');

        $this->actingAs($owner);
        AuthSession::markFullyAuthenticated();

        $uuid = $this->asSpa()->post('/api/v1/portal/memberships/'.$membershipId.'/documents', [
            'purpose' => 'identity',
            'file' => UploadedFile::fake()->createWithContent('id.pdf', '%PDF-1.4 idor'),
        ], ['Accept' => 'application/json'])
            ->assertCreated()
            ->json('data.uuid');

        $intruder = User::factory()->create();
        $this->actingAs($intruder);
        AuthSession::markFullyAuthenticated();

        $this->asSpa()->get('/api/v1/portal/documents/'.$uuid.'/download')
            ->assertForbidden();
    }

    public function test_business_admin_and_platform_admin_can_download(): void
    {
        [$owner, $membershipId, $business, $admin] = $this->registerReferrerWithAdmin('admin-dl@example.test');

        $this->actingAs($owner);
        AuthSession::markFullyAuthenticated();

        $uuid = $this->asSpa()->post('/api/v1/portal/memberships/'.$membershipId.'/documents', [
            'purpose' => 'identity',
            'file' => UploadedFile::fake()->createWithContent('id.pdf', '%PDF-1.4 admin'),
        ], ['Accept' => 'application/json'])
            ->assertCreated()
            ->json('data.uuid');

        $this->actingAs($admin);
        AuthSession::markFullyAuthenticated();
        $this->asSpa()->get('/api/v1/portal/documents/'.$uuid.'/download')
            ->assertOk()
            ->assertStreamedContent('%PDF-1.4 admin');

        $platform = User::factory()->create([
            'platform_role' => PlatformRole::PlatformAdmin,
            'totp_secret' => 'JBSWY3DPEHPK3PXP',
            'totp_confirmed_at' => now(),
        ]);
        $this->actingAs($platform);
        AuthSession::markFullyAuthenticated();
        $this->asSpa()->get('/api/v1/portal/documents/'.$uuid.'/download')
            ->assertOk();

        $this->assertSame($business->id, PrivateDocument::query()->where('uuid', $uuid)->value('business_id'));
    }

    public function test_infected_scan_blocks_download(): void
    {
        $this->app->bind(FileScanner::class, fn () => new FakeFileScanner(DocumentScanStatus::Infected));

        [$owner, $membershipId] = $this->registerReferrer('infected@example.test');

        $this->actingAs($owner);
        AuthSession::markFullyAuthenticated();

        $uuid = $this->asSpa()->post('/api/v1/portal/memberships/'.$membershipId.'/documents', [
            'purpose' => 'identity',
            'file' => UploadedFile::fake()->createWithContent('id.pdf', '%PDF-1.4 malware'),
        ], ['Accept' => 'application/json'])
            ->assertCreated()
            ->assertJsonPath('data.scan_status', 'infected')
            ->assertJsonPath('data.usable', false)
            ->json('data.uuid');

        $this->asSpa()->get('/api/v1/portal/documents/'.$uuid.'/download')
            ->assertStatus(422);
    }

    public function test_foreign_membership_upload_is_forbidden(): void
    {
        [, $membershipId] = $this->registerReferrer('owner-mem@example.test');
        $intruder = User::factory()->create();

        $this->actingAs($intruder);
        AuthSession::markFullyAuthenticated();

        $this->asSpa()->post('/api/v1/portal/memberships/'.$membershipId.'/documents', [
            'purpose' => 'identity',
            'file' => UploadedFile::fake()->createWithContent('id.pdf', '%PDF-1.4 x'),
        ], ['Accept' => 'application/json'])
            ->assertForbidden();
    }

    /**
     * @return array{0: User, 1: int}
     */
    private function registerReferrer(string $email): array
    {
        [$owner, $membershipId] = $this->registerReferrerWithAdmin($email);

        return [$owner, $membershipId];
    }

    /**
     * @return array{0: User, 1: int, 2: Business, 3: User}
     */
    private function registerReferrerWithAdmin(string $email): array
    {
        $business = Business::factory()->create();
        $website = Website::factory()->create([
            'business_id' => $business->id,
            'base_url' => 'https://demo.example',
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

        Notification::fake();
        $this->actingAs($admin);
        AuthSession::markFullyAuthenticated();

        $response = $this->asSpa()->postJson('/api/v1/admin/invitations', [
            'business_id' => $business->id,
            'email' => $email,
            'name' => 'Invitee',
            'website_ids' => [$website->id],
        ])->assertCreated();

        Notification::assertSentOnDemand(ReferrerInvitationNotification::class);

        $this->flushSession();
        $this->app['auth']->forgetGuards();
        AuthSession::clear();

        $this->asSpa()->postJson('/api/v1/invitations/'.$response->json('invitation.uuid').'/register', [
            'token' => $response->json('token'),
            'name' => 'Referrer',
            'password' => 'secure-passphrase-1',
            'password_confirmation' => 'secure-passphrase-1',
        ])->assertCreated();

        $owner = User::query()->where('email', $email)->firstOrFail();
        $membershipId = (int) BusinessMembership::query()
            ->where('user_id', $owner->id)
            ->where('role', MembershipRole::Referrer)
            ->value('id');

        return [$owner, $membershipId, $business, $admin];
    }
}
