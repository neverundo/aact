<?php

namespace Tests\Feature\Onboarding;

use App\Enums\MembershipRole;
use App\Enums\MembershipStatus;
use App\Enums\PaymentMethodStatus;
use App\Models\Business;
use App\Models\BusinessMembership;
use App\Models\Invitation;
use App\Models\PaymentMethodVersion;
use App\Models\ReferralCode;
use App\Models\User;
use App\Models\Website;
use App\Notifications\ReferrerInvitationNotification;
use App\Http\Middleware\SoftAuthenticateSession;
use App\Services\Documents\PrivateDocumentStorage;
use App\Support\AuthSession;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Http\Middleware\AuthenticateSession;
use PragmaRX\Google2FA\Google2FA;
use Tests\TestCase;

class InvitationOnboardingTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        // Multi-actor flows switch users mid-test; password_hash session checks
        // would otherwise invalidate actingAs swaps after a real login/register.
        // SoftAuthenticateSession replaces Sanctum's AuthenticateSession in bootstrap.
        $this->withoutMiddleware([
            AuthenticateSession::class,
            SoftAuthenticateSession::class,
        ]);
    }

    public function test_get_invitation_preview_does_not_consume_token(): void
    {
        [$admin, $business, $website] = $this->makeBusinessAdmin();
        $created = $this->createInvitation($admin, $business, $website, 'invitee@example.test');

        $this->asSpa()->getJson('/api/v1/invitations/'.$created['uuid'].'?token='.$created['token'])
            ->assertOk()
            ->assertJsonPath('data.email', 'invitee@example.test')
            ->assertJsonPath('data.accepted', false);

        $this->asSpa()->getJson('/api/v1/invitations/'.$created['uuid'].'?token='.$created['token'])
            ->assertOk()
            ->assertJsonPath('data.accepted', false);

        $this->assertNull(Invitation::query()->where('uuid', $created['uuid'])->value('accepted_at'));
    }

    public function test_register_from_invitation_creates_pending_membership(): void
    {
        [$admin, $business, $website] = $this->makeBusinessAdmin();
        $created = $this->createInvitation($admin, $business, $website, 'new-referrer@example.test');

        $response = $this->asSpa()->postJson('/api/v1/invitations/'.$created['uuid'].'/register', [
            'token' => $created['token'],
            'name' => 'New Referrer',
            'password' => 'secure-passphrase-1',
            'password_confirmation' => 'secure-passphrase-1',
        ]);

        $response->assertCreated()
            ->assertJsonPath('status', 'registered_and_accepted')
            ->assertJsonPath('membership.status', MembershipStatus::Pending->value);

        $this->assertAuthenticated();
        $this->assertDatabaseHas('business_memberships', [
            'business_id' => $business->id,
            'role' => MembershipRole::Referrer->value,
            'status' => MembershipStatus::Pending->value,
        ]);
        $this->assertNotNull(Invitation::query()->where('uuid', $created['uuid'])->value('accepted_at'));
        $this->assertDatabaseHas('audit_events', ['action' => 'invitation.accepted']);
    }

    public function test_payment_method_versions_and_approval_issue_referral_codes(): void
    {
        [$admin, $business, $website] = $this->makeBusinessAdmin();
        $created = $this->createInvitation($admin, $business, $website, 'flow@example.test');

        $this->asSpa()->postJson('/api/v1/invitations/'.$created['uuid'].'/register', [
            'token' => $created['token'],
            'name' => 'Flow Referrer',
            'password' => 'secure-passphrase-1',
            'password_confirmation' => 'secure-passphrase-1',
        ])->assertCreated();

        $referrer = User::query()->where('email', 'flow@example.test')->firstOrFail();
        $this->actingAs($referrer);
        AuthSession::markFullyAuthenticated();

        $membershipId = (int) BusinessMembership::query()
            ->where('business_id', $business->id)
            ->where('role', MembershipRole::Referrer)
            ->value('id');

        $this->asSpa()->postJson('/api/v1/portal/memberships/'.$membershipId.'/payment-methods', [
            'method_type' => 'iban',
            'iban' => 'DE89 3704 0044 0532 0130 00',
            'holder_name' => 'Flow Referrer',
        ])->assertCreated()
            ->assertJsonPath('data.status', PaymentMethodStatus::PendingReview->value)
            ->assertJsonPath('data.version', 1)
            ->assertJsonPath('data.display_mask', 'DE89**************3000');

        $this->asSpa()->postJson('/api/v1/portal/memberships/'.$membershipId.'/payment-methods', [
            'method_type' => 'mbway',
            'phone' => '912345678',
            'holder_name' => 'Flow Referrer',
        ])->assertCreated()
            ->assertJsonPath('data.version', 2);

        $this->assertSame(
            PaymentMethodStatus::Superseded,
            PaymentMethodVersion::query()->where('version', 1)->firstOrFail()->status
        );

        $pending = PaymentMethodVersion::query()->where('version', 2)->firstOrFail();

        Storage::fake(PrivateDocumentStorage::DISK);
        $this->asSpa()->post('/api/v1/portal/memberships/'.$membershipId.'/documents', [
            'purpose' => 'bank_proof',
            'file' => UploadedFile::fake()->createWithContent('proof.pdf', '%PDF-1.4 bank proof'),
        ], ['Accept' => 'application/json'])->assertCreated();

        $this->actingAs($admin);
        AuthSession::markFullyAuthenticated();

        $totpCode = app(Google2FA::class)->getCurrentOtp('JBSWY3DPEHPK3PXP');

        $this->asSpa()->postJson('/api/v1/admin/payment-methods/'.$pending->id.'/review', [
            'status' => 'approved',
            'password' => 'password-passphrase',
            'code' => $totpCode,
        ])->assertOk()->assertJsonPath('data.status', 'approved');

        $this->asSpa()->postJson('/api/v1/admin/memberships/'.$membershipId.'/approve')
            ->assertOk()
            ->assertJsonPath('data.status', MembershipStatus::Approved->value);

        $this->assertDatabaseHas('referral_codes', [
            'business_membership_id' => $membershipId,
            'website_id' => $website->id,
            'is_active' => true,
        ]);

        $code = ReferralCode::query()->where('business_membership_id', $membershipId)->firstOrFail();

        $this->actingAs($referrer);
        AuthSession::markFullyAuthenticated();

        $this->asSpa()->postJson('/api/v1/portal/referral-codes/'.$code->id.'/link', [
            'website_id' => $website->id,
        ])->assertOk()
            ->assertJsonPath('url', 'https://demo.example?ref='.$code->code);
    }

    public function test_document_upload_is_quarantined_until_clean_and_idor_blocked(): void
    {
        Storage::fake('private_documents');

        [$admin, $business, $website] = $this->makeBusinessAdmin();
        $created = $this->createInvitation($admin, $business, $website, 'docs@example.test');

        $this->asSpa()->postJson('/api/v1/invitations/'.$created['uuid'].'/register', [
            'token' => $created['token'],
            'name' => 'Docs Referrer',
            'password' => 'secure-passphrase-1',
            'password_confirmation' => 'secure-passphrase-1',
        ])->assertCreated();

        $owner = User::query()->where('email', 'docs@example.test')->firstOrFail();
        $this->actingAs($owner);
        AuthSession::markFullyAuthenticated();

        $membershipId = (int) BusinessMembership::query()
            ->where('role', MembershipRole::Referrer)
            ->value('id');

        $plain = '%PDF-1.4 onboarding identity document';

        $upload = $this->asSpa()->post('/api/v1/portal/memberships/'.$membershipId.'/documents', [
            'purpose' => 'bank_proof',
            'file' => UploadedFile::fake()->createWithContent('id.pdf', $plain),
        ], ['Accept' => 'application/json']);

        $upload->assertCreated()
            ->assertJsonPath('data.scan_status', 'clean')
            ->assertJsonPath('data.usable', true);

        $uuid = $upload->json('data.uuid');

        $intruder = User::factory()->create();
        $this->actingAs($intruder);
        AuthSession::markFullyAuthenticated();

        $this->asSpa()->get('/api/v1/portal/documents/'.$uuid.'/download')
            ->assertForbidden();

        $this->actingAs($owner);
        AuthSession::markFullyAuthenticated();

        $this->asSpa()->get('/api/v1/portal/documents/'.$uuid.'/download')
            ->assertOk()
            ->assertStreamedContent($plain);
    }

    public function test_membership_show_idor_is_blocked(): void
    {
        [$admin, $business, $website] = $this->makeBusinessAdmin();
        $created = $this->createInvitation($admin, $business, $website, 'owner@example.test');

        $this->asSpa()->postJson('/api/v1/invitations/'.$created['uuid'].'/register', [
            'token' => $created['token'],
            'name' => 'Owner',
            'password' => 'secure-passphrase-1',
            'password_confirmation' => 'secure-passphrase-1',
        ])->assertCreated();

        $membershipId = (int) BusinessMembership::query()->where('role', MembershipRole::Referrer)->value('id');

        $intruder = User::factory()->create();
        $this->actingAs($intruder);
        AuthSession::markFullyAuthenticated();

        $this->asSpa()->getJson('/api/v1/portal/memberships/'.$membershipId)->assertForbidden();
    }

    public function test_approval_requires_approved_payment_method(): void
    {
        [$admin, $business, $website] = $this->makeBusinessAdmin();
        $created = $this->createInvitation($admin, $business, $website, 'nopay@example.test');

        $this->asSpa()->postJson('/api/v1/invitations/'.$created['uuid'].'/register', [
            'token' => $created['token'],
            'name' => 'No Pay',
            'password' => 'secure-passphrase-1',
            'password_confirmation' => 'secure-passphrase-1',
        ])->assertCreated();

        $membershipId = (int) BusinessMembership::query()->where('role', MembershipRole::Referrer)->value('id');

        $this->actingAs($admin);
        AuthSession::markFullyAuthenticated();

        $this->asSpa()->postJson('/api/v1/admin/memberships/'.$membershipId.'/approve')
            ->assertStatus(422);
    }

    /**
     * @return array{0: User, 1: Business, 2: Website}
     */
    private function makeBusinessAdmin(): array
    {
        $business = Business::factory()->create();
        $website = Website::factory()->create([
            'business_id' => $business->id,
            'base_url' => 'https://demo.example',
            'is_active' => true,
        ]);
        $admin = User::factory()->create([
            'password' => \Illuminate\Support\Facades\Hash::make('password-passphrase'),
            'totp_secret' => 'JBSWY3DPEHPK3PXP',
            'totp_confirmed_at' => now(),
        ]);

        BusinessMembership::factory()->create([
            'business_id' => $business->id,
            'user_id' => $admin->id,
            'role' => MembershipRole::BusinessAdmin,
            'status' => MembershipStatus::Approved,
        ]);

        return [$admin, $business, $website];
    }

    /**
     * @return array{uuid: string, token: string}
     */
    private function createInvitation(User $admin, Business $business, Website $website, string $email): array
    {
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

        return [
            'uuid' => $response->json('invitation.uuid'),
            'token' => $response->json('token'),
        ];
    }
}
